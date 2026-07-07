/**
 * @module firebaseAdmin
 * @description Inicialização do Firebase Admin SDK para verificação de tokens no servidor.
 * Utiliza variáveis de ambiente do servidor (sem prefixo VITE_).
 */

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth, type DecodedIdToken } from 'firebase-admin/auth';

let app: App;

if (getApps().length === 0) {
  app = initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
} else {
  app = getApps()[0];
}

/** Instância de autenticação do Firebase Admin */
export const adminAuth: Auth = getAuth(app);

/**
 * Verifica um token de ID do Firebase.
 * @param token - Token JWT do Firebase a ser verificado
 * @returns O token decodificado ou null em caso de erro
 */
export async function verifyToken(token: string): Promise<DecodedIdToken | null> {
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('[firebaseAdmin] Erro ao verificar token:', error);
    return null;
  }
}
