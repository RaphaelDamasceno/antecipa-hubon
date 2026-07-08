/**
 * @module sheets/receivables
 * @description Busca de contas a receber (CRs) na planilha Google Sheets.
 * Filtra registros com base no papel do usuário (Corretor, Líder, etc.)
 * e retorna apenas itens com valor numérico > 0.
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
import { normalizeName } from '../lib/utils';

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

/** Tipo para o usuário recebido na requisição */
interface UserInfo {
  nome: string;
  cargo?: string;
  superintendencia?: string;
  loja?: string;
}

/** Tipo para um item de conta a receber */
interface Receivable {
  id: string;
  receivableId: string;
  loja: string;
  empreendimento: string;
  blocoUnidade: string;
  construtora: string;
  cliente: string;
  nome: string;
  liderTrainee: string;
  lider: string;
  valorOriginalP: string;
  status: string;
  valorRaw: number | string | null;
  valorStr: string;
  previsaoMes: string;
  previsaoAno: string;
  userRole: string;
  allFields: Record<string, string>;
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
 * Extrai valor numérico bruto (.v) de uma célula GViz
 */
function getCellRawValue(cell: GVizCell | null | undefined): number | string | null {
  if (!cell) return null;
  return cell.v !== undefined && cell.v !== null ? cell.v : null;
}

/**
 * Determina o papel do usuário em relação a uma linha de CR.
 */
function determineUserRole(
  row: (GVizCell | null)[],
  user: UserInfo
): string | null {
  const rowNomeCorretor = normalizeName(getCellValue(row[9]));
  const rowLiderTrainee = normalizeName(getCellValue(row[10]));
  const rowLider = normalizeName(getCellValue(row[11]));
  const rowLoja = getCellValue(row[4]);
  const normalizedUserNome = normalizeName(user.nome);
  const normalizedCargo = user.cargo ? user.cargo.toLowerCase() : '';

  // Verificar correspondência por papel
  if (rowNomeCorretor && rowNomeCorretor === normalizedUserNome) {
    return 'Corretor';
  }

  if (rowLiderTrainee && rowLiderTrainee === normalizedUserNome) {
    return 'Líder Trainee';
  }

  if (rowLider && rowLider === normalizedUserNome) {
    return 'Líder';
  }

  if (
    normalizedCargo.includes('diretor') &&
    user.loja &&
    rowLoja &&
    rowLoja === user.loja
  ) {
    return 'Diretor';
  }

  if (
    normalizedCargo.includes('superintendente') ||
    (user.superintendencia && user.superintendencia.trim() !== '')
  ) {
    return 'Superintendente';
  }

  return null;
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
    const { user } = req.body || {};

    if (!user || !user.nome) {
      res.status(400).json({
        error: 'Dados insuficientes',
        message: 'Objeto user com nome é obrigatório.',
      });
      return;
    }

    const sheetId = process.env.SHEET_ID;
    const tab = process.env.SHEET_TAB_CR || 'CR 2025';

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

    // Parsear resposta do Google Viz
    const jsonStr = text.substring(47).slice(0, -2);
    const data: GVizResponse = JSON.parse(jsonStr);

    const { cols, rows } = data.table;
    const receivables: Receivable[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row.c) continue;

      const cells = row.c;

      // Determinar papel do usuário para esta linha
      const userRole = determineUserRole(cells, user as UserInfo);
      if (!userRole) continue;

      // Extrair valor numérico bruto (col 19)
      const valorRaw = getCellRawValue(cells[19]);
      const valorNumeric =
        typeof valorRaw === 'number'
          ? valorRaw
          : typeof valorRaw === 'string'
            ? parseFloat(valorRaw)
            : 0;

      // Filtrar: apenas itens com valor > 0
      if (valorNumeric <= 0) continue;

      // Coletar todos os campos
      const allFields: Record<string, string> = {};
      for (let c = 0; c < cols.length; c++) {
        const label = cols[c].label || `col${c}`;
        allFields[label] = getCellValue(cells[c]);
      }

      const receivable: Receivable = {
        id: getCellValue(cells[0]),
        receivableId: `${getCellValue(cells[0])}-${i}`,
        loja: getCellValue(cells[4]),
        empreendimento: getCellValue(cells[2]),
        blocoUnidade: getCellValue(cells[3]),
        construtora: getCellValue(cells[6]),
        cliente: getCellValue(cells[7]),
        nome: getCellValue(cells[9]),
        liderTrainee: getCellValue(cells[10]),
        lider: getCellValue(cells[11]),
        valorOriginalP: getCellValue(cells[15]),
        status: getCellValue(cells[16]),
        valorRaw,
        valorStr: getCellValue(cells[19]),
        previsaoMes: getCellValue(cells[21]),
        previsaoAno: getCellValue(cells[22]),
        userRole,
        allFields,
      };

      receivables.push(receivable);
    }

    res.status(200).json(receivables);
  } catch (error) {
    console.error('[sheets/receivables] Erro:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao buscar contas a receber.',
    });
  }
}
