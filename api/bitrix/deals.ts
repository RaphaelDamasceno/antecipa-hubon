/**
 * @module bitrix/deals
 * @description Busca negócios (deals) existentes no Bitrix24.
 * Filtra por IDs de PV específicos na categoria 89.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest, sendUnauthorized } from '../lib/auth';

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

  // Verificar autenticação Firebase
  const decodedToken = await authenticateRequest(req);
  if (!decodedToken) {
    sendUnauthorized(res);
    return;
  }

  try {
    const { pvIds } = req.body || {};

    if (!pvIds || !Array.isArray(pvIds) || pvIds.length === 0) {
      res.status(400).json({
        error: 'Dados insuficientes',
        message: 'pvIds deve ser um array não vazio.',
      });
      return;
    }

    const bitrixListUrl = process.env.BITRIX_LIST_URL;

    if (!bitrixListUrl) {
      res.status(500).json({
        error: 'Configuração ausente',
        message: 'BITRIX_LIST_URL não configurado no servidor.',
      });
      return;
    }

    const bitrixResponse = await fetch(bitrixListUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filter: {
          '=CATEGORY_ID': 89,
          UF_CRM_1758140731010: pvIds,
        },
        select: [
          'ID',
          'TITLE',
          'COMMENTS',
          'STAGE_ID',
          'UF_CRM_1758140731010',
          'UF_CRM_1712601553',
          'UF_CRM_1712601748',
        ],
      }),
    });

    const data = await bitrixResponse.json();

    res.status(200).json(data.result || []);
  } catch (error) {
    console.error('[bitrix/deals] Erro:', error);
    res.status(200).json([]);
  }
}
