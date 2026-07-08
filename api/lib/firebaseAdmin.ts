/**
 * @module firebaseAdmin
 * @description Inicialização do Firebase Admin SDK para verificação de tokens no servidor.
 * Utiliza variáveis de ambiente do servidor (sem prefixo VITE_).
 */

import admin from 'firebase-admin';

if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

/** Instância de autenticação do Firebase Admin */
export const adminAuth = admin.auth();

/**
 * Verifica um token de ID do Firebase.
 * @param token - Token JWT do Firebase a ser verificado
 * @returns O token decodificado ou null em caso de erro
 */
export async function verifyToken(token: string): Promise<admin.auth.DecodedIdToken | null> {
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('[firebaseAdmin] Erro ao verificar token:', error);
    return null;
  }
}
