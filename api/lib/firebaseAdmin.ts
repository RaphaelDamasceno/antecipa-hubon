/**
 * @module firebaseAdmin
 * @description Inicialização do Firebase Admin SDK para verificação de tokens no servidor.
 * Utiliza variáveis de ambiente do servidor (sem prefixo VITE_).
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

if (getApps().length === 0) {
  initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

/** Instância de autenticação do Firebase Admin */
export const adminAuth = getAuth();

/**
 * Verifica um token de ID do Firebase.
 * @param token - Token JWT do Firebase a ser verificado
 * @returns O token decodificado ou null em caso de erro
 */
export async function verifyToken(token: string) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('[firebaseAdmin] Erro ao verificar token:', error);
    return null;
  }
}
