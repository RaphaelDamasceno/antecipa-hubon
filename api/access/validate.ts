/**
 * @module access/validate
 * @description Validação do gate de acesso ao portal.
 * Verifica se o token ou referrer são válidos para permitir acesso.
 * NÃO requer autenticação Firebase (chamado antes do login).
 */

import type { IncomingMessage, ServerResponse } from 'node:http';

interface VercelRequest extends IncomingMessage {
  body: any;
  query: Record<string, string | string[]>;
}

interface VercelResponse extends ServerResponse {
  status(code: number): VercelResponse;
  json(body: any): void;
  setHeader(name: string, value: string): VercelResponse;
  end(): void;
}

/** Referrers permitidos para acesso direto */
const ALLOWED_REFERRERS = ['bitrix', 'crm', 'antecipabroker', 'meuapp', 'app-empresa'];

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Preflight
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido. Use POST.' });
    return;
  }

  try {
    const { token, referrer } = req.body || {};
    const serverToken = process.env.ACCESS_TOKEN;

    // Se ACCESS_TOKEN não está configurado, gate aberto
    if (!serverToken) {
      console.warn('[access/validate] ACCESS_TOKEN não configurado — gate aberto');
      res.status(200).json({ allowed: true });
      return;
    }

    // Verifica token de acesso
    if (token && token === serverToken) {
      res.status(200).json({ allowed: true });
      return;
    }

    // Verifica referrer
    if (referrer && typeof referrer === 'string') {
      const lowerReferrer = referrer.toLowerCase();
      const referrerAllowed = ALLOWED_REFERRERS.some((r) =>
        lowerReferrer.includes(r)
      );
      if (referrerAllowed) {
        res.status(200).json({ allowed: true });
        return;
      }
    }

    // Acesso negado
    res.status(200).json({ allowed: false });
  } catch (error) {
    console.error('[access/validate] Erro inesperado:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao validar acesso.',
    });
  }
}
