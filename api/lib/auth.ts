/**
 * @module auth
 * @description Middleware de autenticação para rotas protegidas.
 * Extrai e verifica o Bearer token do header Authorization.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { verifyToken } from './firebaseAdmin';

/**
 * Autentica uma requisição extraindo o Bearer token do header Authorization.
 * @param req - Requisição do Vercel
 * @returns Token decodificado ou null se inválido/ausente
 */
export async function authenticateRequest(
  req: VercelRequest
): Promise<admin.auth.DecodedIdToken | null> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('[auth] Header Authorization ausente ou mal formatado');
    return null;
  }

  const token = authHeader.split('Bearer ')[1];

  if (!token) {
    console.warn('[auth] Token vazio após extração do Bearer');
    return null;
  }

  return verifyToken(token);
}

/**
 * Envia resposta 401 Unauthorized padronizada.
 * @param res - Resposta do Vercel
 */
export function sendUnauthorized(res: VercelResponse): void {
  res.status(401).json({
    error: 'Não autorizado',
    message: 'Token de autenticação inválido ou ausente.',
  });
}
