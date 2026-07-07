/**
 * @module sheets/authenticate
 * @description Autenticação de usuários via Google Sheets.
 * Busca e valida credenciais (nome, data de nascimento, CPF)
 * contra a planilha de usuários configurada.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest, sendUnauthorized } from '../lib/auth';
import { normalizeCPF, normalizeDate, normalizeName } from '../lib/utils';

/** Tipo para célula do Google Viz JSON */
interface GVizCell {
  v?: string | number | null;
  f?: string | null;
}

/** Tipo para linha do Google Viz JSON */
interface GVizRow {
  c: (GVizCell | null)[];
}

/** Tipo para coluna do Google Viz JSON */
interface GVizCol {
  label?: string;
  id?: string;
  type?: string;
}

/** Tipo para resposta do Google Viz JSON */
interface GVizResponse {
  table: {
    cols: GVizCol[];
    rows: GVizRow[];
  };
}

/**
 * Extrai valor de uma célula GViz, priorizando .f sobre .v
 */
function getCellValue(cell: GVizCell | null | undefined): string {
  if (!cell) return '';
  if (cell.f !== undefined && cell.f !== null) return String(cell.f);
  if (cell.v !== undefined && cell.v !== null) return String(cell.v);
  return '';
}

/**
 * Busca a coluna cujo label contém o texto indicado (case-insensitive).
 */
function findColIndex(cols: GVizCol[], labelPart: string): number {
  return cols.findIndex(
    (col) =>
      col.label && col.label.toLowerCase().includes(labelPart.toLowerCase())
  );
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
    const { nome, dataNascimento, cpf } = req.body || {};

    if (!nome || !dataNascimento || !cpf) {
      res.status(400).json({
        error: 'Dados insuficientes',
        message: 'nome, dataNascimento e cpf são obrigatórios.',
      });
      return;
    }

    const sheetId = process.env.SHEET_ID;
    const tab = process.env.SHEET_TAB_USUARIOS || 'usuários';

    if (!sheetId) {
      res.status(500).json({
        error: 'Configuração ausente',
        message: 'SHEET_ID não configurado no servidor.',
      });
      return;
    }

    // Buscar dados da planilha
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tab)}`;
    const response = await fetch(url);
    const text = await response.text();

    // Parsear resposta do Google Viz (remover prefixo e sufixo)
    const jsonStr = text.substring(47).slice(0, -2);
    const data: GVizResponse = JSON.parse(jsonStr);

    const { cols, rows } = data.table;

    // Índices de colunas por label para campos dinâmicos
    const empresaIdx = findColIndex(cols, 'empresa');
    const cargoIdx = findColIndex(cols, 'cargo');
    const superintendenciaIdx = findColIndex(cols, 'superintend');

    // Normalizar valores de entrada
    const inputNome = normalizeName(nome);
    const inputData = normalizeDate(dataNascimento);
    const inputCPF = normalizeCPF(cpf);

    // Buscar usuário correspondente
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row.c) continue;

      const cells = row.c;

      // Colunas fixas: nome=col3, dataNascimento=col6, cpf=col13, loja=col18
      const rowNome = getCellValue(cells[3]);
      const rowDataNascimento = getCellValue(cells[6]);
      const rowCPF = getCellValue(cells[13]);

      // Normalizar valores da planilha
      const normalizedRowNome = normalizeName(rowNome);
      const normalizedRowData = normalizeDate(rowDataNascimento);
      const normalizedRowCPF = normalizeCPF(rowCPF);

      // Comparar
      if (
        normalizedRowNome === inputNome &&
        normalizedRowData === inputData &&
        normalizedRowCPF === inputCPF
      ) {
        // Montar objeto do usuário
        const loja = getCellValue(cells[18]);
        const empresa = empresaIdx >= 0 ? getCellValue(cells[empresaIdx]) : '';
        const cargo = cargoIdx >= 0 ? getCellValue(cells[cargoIdx]) : '';
        const superintendencia =
          superintendenciaIdx >= 0
            ? getCellValue(cells[superintendenciaIdx])
            : '';

        // Coletar todos os campos disponíveis
        const allFields: Record<string, string> = {};
        for (let c = 0; c < cols.length; c++) {
          const label = cols[c].label || `col${c}`;
          allFields[label] = getCellValue(cells[c]);
        }

        res.status(200).json({
          nome: rowNome,
          dataNascimento: rowDataNascimento,
          cpf: rowCPF,
          empresa,
          cargo,
          superintendencia,
          loja,
          allFields,
        });
        return;
      }
    }

    // Usuário não encontrado
    res.status(401).json({
      error: 'Usuário não encontrado',
      message: 'Nenhum registro corresponde aos dados informados.',
    });
  } catch (error) {
    console.error('[sheets/authenticate] Erro:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao autenticar usuário na planilha.',
    });
  }
}
