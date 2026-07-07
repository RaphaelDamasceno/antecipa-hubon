/**
 * @module bitrix/update
 * @description Atualização de negócios (deals) no Bitrix24.
 * Suporta anexar arquivo (attachFile) e rejeitar deal (reject).
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
    const { dealId, action, base64File, fileName } = req.body || {};

    if (!dealId) {
      res.status(400).json({
        error: 'Dados insuficientes',
        message: 'dealId é obrigatório.',
      });
      return;
    }

    if (!action || !['attachFile', 'reject'].includes(action)) {
      res.status(400).json({
        error: 'Ação inválida',
        message: "action deve ser 'attachFile' ou 'reject'.",
      });
      return;
    }

    const bitrixWriteUrl = process.env.BITRIX_WEBHOOK_WRITE_URL;

    if (!bitrixWriteUrl) {
      res.status(500).json({
        error: 'Configuração ausente',
        message: 'BITRIX_WEBHOOK_WRITE_URL não configurado no servidor.',
      });
      return;
    }

    // Construir URL de update substituindo crm.deal.add.json por crm.deal.update.json
    const updateUrl = bitrixWriteUrl.replace(
      'crm.deal.add.json',
      'crm.deal.update.json'
    );

    let requestBody: Record<string, unknown>;

    if (action === 'attachFile') {
      if (!base64File || !fileName) {
        res.status(400).json({
          error: 'Dados insuficientes',
          message: 'base64File e fileName são obrigatórios para attachFile.',
        });
        return;
      }

      requestBody = {
        id: dealId,
        fields: {
          UF_CRM_1749578923: {
            fileData: [fileName, base64File],
          },
          STAGE_ID: 'C89:EXECUTING',
        },
      };
    } else {
      // action === 'reject'
      requestBody = {
        id: dealId,
        fields: {
          STAGE_ID: 'C89:LOSE',
        },
      };
    }

    const bitrixResponse = await fetch(updateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const data = await bitrixResponse.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('[bitrix/update] Erro:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao atualizar deal no Bitrix.',
    });
  }
}
