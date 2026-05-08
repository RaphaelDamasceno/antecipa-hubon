import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDocs, collection, query, where, serverTimestamp, getDocFromServer, doc as firestoreDoc, updateDoc, addDoc, onSnapshot, orderBy, limit, deleteDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Receivable } from './sheetsService';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();
const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection() {
  try {
    await getDocFromServer(firestoreDoc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Erro ao fazer login com Google:', error);
    throw error;
  }
}

export async function savePromisedCommission(receivable: Receivable, userId: string, isCollateral: boolean = false, collateralFor: string | null = null) {
  const path = 'promised_commissions';
  const commissionId = `${receivable.id}-${receivable.previsaoMes}-${receivable.previsaoAno}`.replace(/[^\w-]/g, '_');
  
  const payload: any = {
    pvId: String(receivable.id),
    receivableId: commissionId,
    amount: receivable.valorNumeric,
    previsaoMes: receivable.previsaoMes,
    previsaoAno: receivable.previsaoAno,
    userId: userId,
    status: 'pending',
    stageName: isCollateral ? 'Título em Garantia' : 'Solicitação Encaminhada',
    isCollateral,
    userRole: receivable.userRole || 'Corretor',
    requestedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  if (collateralFor) {
    payload.collateralFor = collateralFor;
  }

  try {
    await setDoc(firestoreDoc(db, path, commissionId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveAdvancementWithCollateral(primary: Receivable, collateralItems: Receivable[], userId: string) {
  const primaryId = `${primary.id}-${primary.previsaoMes}-${primary.previsaoAno}`.replace(/[^\w-]/g, '_');
  
  // Salva o principal
  await savePromisedCommission(primary, userId, false, null);
  
  // Salva os colaterais vinculados
  const promises = collateralItems.map(c => savePromisedCommission(c, userId, true, primaryId));
  await Promise.all(promises);
}

export async function fetchPromisedCommissions(userId: string) {
  const path = 'promised_commissions';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function updateCommissionStatus(commissionId: string, status: 'pending' | 'approved' | 'rejected', stageName: string) {
  const path = 'promised_commissions';
  try {
    const docRef = firestoreDoc(db, path, commissionId);
    
    // Buscar dados atuais para saber se o status mudou
    const docSnap = await getDocFromServer(docRef);
    if (docSnap.exists()) {
      const currentData = docSnap.data();
      const oldStatus = currentData.status;
      const oldStage = currentData.stageName;

      // Só atualiza e notifica se houve mudança real
      if (oldStatus !== status || oldStage !== stageName) {
        await updateDoc(docRef, { status, stageName, updatedAt: serverTimestamp() });

        // Criar notificação para mudança relevante
        let title = "Atualização de Solicitação";
        let message = `Sua solicitação para PV ${currentData.pvId} agora está: ${stageName}`;
        let type: 'info' | 'success' | 'error' | 'warning' = 'info';

        if (status === 'approved') {
          title = "Solicitação Aprovada";
          type = 'success';
        } else if (status === 'rejected') {
          title = "Solicitação Negada";
          type = 'error';
        }

        await addNotification(currentData.userId, title, message, type);
      }
    } else {
      // Caso o documento não exista (raro), apenas cria/seta
      await setDoc(docRef, { status, stageName, updatedAt: serverTimestamp() }, { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deletePromisedCommission(commissionId: string) {
  const path = 'promised_commissions';
  try {
    const docRef = firestoreDoc(db, path, commissionId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function addNotification(userId: string, title: string, message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
  const path = 'notifications';
  try {
    const colRef = collection(db, path);
    await addDoc(colRef, {
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeToNotifications(userId: string, onUpdate: (notifications: any[]) => void) {
  const path = 'notifications';
  const q = query(
    collection(db, path),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(20)
  );

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    onUpdate(notifications);
  }, (error) => {
    // Ignora erros de snapshot silentely se for permissão (comum no logout)
    console.warn('Snapshot error:', error);
  });
}

export async function markNotificationAsRead(notificationId: string) {
  const path = 'notifications';
  try {
    const docRef = firestoreDoc(db, path, notificationId);
    await updateDoc(docRef, { read: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteNotification(notificationId: string) {
  const path = 'notifications';
  try {
    const docRef = firestoreDoc(db, path, notificationId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveSignature(commissionId: string, signature: { name: string; document: string; address: string; ip: string; userAgent: string }) {
  const path = 'promised_commissions';
  try {
    const docRef = firestoreDoc(db, path, commissionId);
    await setDoc(docRef, { 
      signatureData: signature, 
      signedAt: serverTimestamp(),
      updatedAt: serverTimestamp() 
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function logAccess(userId: string, userEmail: string, userName: string, action: string) {
  const path = 'access_logs';
  try {
    const colRef = collection(db, path);
    await addDoc(colRef, {
      userId,
      userEmail,
      userName,
      action,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    // Log silently errors on access logs to avoid interrupting user flow
    console.error('Audit Log Error:', error);
  }
}

export { onAuthStateChanged };
export type { User };
