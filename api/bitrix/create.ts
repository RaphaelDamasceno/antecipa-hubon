/**
 * @module bitrix/create
 * @description Criação de negócios (deals) no Bitrix24.
 * Suporta modo individual (single) e em lote (multiple).
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
import { authenticateRequest, sendUnauthorized } from '../lib/auth';

/** Tipo para o payload de criação de deal */
interface DealPayload {
  fields: Record<string, unknown>;
}

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
    const { mode, payload, payloads } = req.body || {};

    const bitrixWriteUrl = process.env.BITRIX_WEBHOOK_WRITE_URL;

    if (!bitrixWriteUrl) {
      res.status(500).json({
        error: 'Configuração ausente',
        message: 'BITRIX_WEBHOOK_WRITE_URL não configurado no servidor.',
      });
      return;
    }

    if (mode === 'single') {
      // Modo individual
      if (!payload || !payload.fields) {
        res.status(400).json({
          error: 'Dados insuficientes',
          message: 'payload com fields é obrigatório no modo single.',
        });
        return;
      }

      const bitrixResponse = await fetch(bitrixWriteUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await bitrixResponse.json();
      res.status(200).json(data);
    } else if (mode === 'multiple') {
      // Modo em lote
      if (!payloads || !Array.isArray(payloads) || payloads.length === 0) {
        res.status(400).json({
          error: 'Dados insuficientes',
          message: 'payloads deve ser um array não vazio no modo multiple.',
        });
        return;
      }

      const results = await Promise.allSettled(
        payloads.map(async (p: DealPayload) => {
          const bitrixResponse = await fetch(bitrixWriteUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(p),
          });
          return bitrixResponse.json();
        })
      );

      const formattedResults = results.map((result, index) => ({
        index,
        status: result.status,
        data: result.status === 'fulfilled' ? result.value : null,
        error:
          result.status === 'rejected'
            ? String(result.reason)
            : null,
      }));

      res.status(200).json(formattedResults);
    } else {
      res.status(400).json({
        error: 'Modo inválido',
        message: "mode deve ser 'single' ou 'multiple'.",
      });
    }
  } catch (error) {
    console.error('[bitrix/create] Erro:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao criar deal(s) no Bitrix.',
    });
  }
}
