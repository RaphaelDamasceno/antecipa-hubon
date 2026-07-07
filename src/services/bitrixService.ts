import { Receivable, UserData } from './sheetsService';
import { apiCall } from './apiClient';

export type UserAuth = UserData;

const CATEGORY_ID = 89;
export const PV_FIELD = 'UF_CRM_1758140731010';

/**
 * Busca deals existentes no Bitrix via backend proxy.
 * @param pvIds - Lista de IDs de PV para buscar.
 */
export async function fetchExistingDeals(pvIds: string[]) {
  try {
    return await apiCall<any[]>('/api/bitrix/deals', { pvIds });
  } catch (error) {
    console.error('Erro ao buscar deals existentes:', error);
    return [];
  }
}

/**
 * Mapeia o STAGE_ID do Bitrix para os status internos
 */
export function mapBitrixStageToStatus(stageId: string): 'pending' | 'approved' | 'rejected' {
  const stage = String(stageId).toUpperCase();
  
  if (stage.includes('WON')) return 'approved';
  if (stage.includes('LOSE') || stage.includes('REJECT')) return 'rejected';
  
  // Novas etapas de sucesso solicitadas
  if (stage.includes('FINAL_INVOICE')) return 'approved';
  if (stage.includes('UC_3M0B5Y')) return 'approved';
  if (stage.includes('UC_XR93F9')) return 'approved';
  if (stage.includes('EXECUTING')) return 'approved';
  
  return 'pending';
}

/**
 * Mapeia o STAGE_ID do Bitrix para uma etiqueta legível
 */
export function mapBitrixStageToLabel(stageId: string): string {
  const stage = String(stageId).toUpperCase();
  
  // Mapeamentos conhecidos para a Categoria 89
  if (stage.includes('NEW')) return 'Solicitação Encaminhada';
  if (stage.includes('PREPARATION')) return 'Análise de Risco';
  if (stage.includes('UC_O67T1I')) return 'Aguardando Assinatura'; 
  if (stage.includes('EXECUTING')) return 'Contrato Assinado / Em Pagamento';
  
  // Novas etapas
  if (stage.includes('FINAL_INVOICE')) return 'Alterando Titularidades';
  if (stage.includes('UC_3M0B5Y')) return 'Antecipação Realizada';
  if (stage.includes('UC_XR93F9')) return 'Aguardando pagamento da Comissão';

  if (stage.includes('WON')) return 'Antecipação Realizada';
  if (stage.includes('LOSE')) return 'Antecipação Negada';
  
  return 'Aguardando Solicitante';
}

export const BITRIX_FIELDS = {
  PV: PV_FIELD,
  VALOR_LIBERADO: 'UF_CRM_1712601553', 
  OBSERVACOES: 'UF_CRM_1712601748',
  FILE_ATTACHMENT: 'UF_CRM_1749578923'
};

/**
 * Verifica se um recebível já possui solicitação registrada nos deals existentes.
 * Compara por PV, valor e previsão para evitar duplicidades entre parcelas.
 */
export function isAlreadyRequested(receivable: Receivable, existingDeals: any[]) {
  const idSearch = String(receivable.id).trim();
  const valueSearch = receivable.valor.trim();
  const previsionSearch = `PREVISÃO: ${receivable.previsaoMes}/${receivable.previsaoAno}`;

  return existingDeals.some(deal => {
    const dealPV = String(deal[PV_FIELD] || '').trim();
    const comments = String(deal.COMMENTS || '');
    
    const matchesPV = dealPV === idSearch || comments.includes(`ID PV: ${idSearch}`);
    if (!matchesPV) return false;

    // Verifica se a combinação de Valor e Previsão exata existe nos comentários
    // Isso evita que parcelas de mesmo valor mas meses diferentes se misturem
    const hasValue = comments.includes(`VALOR: ${valueSearch}`) || 
                    comments.includes(`VALOR SOLICITADO: ${valueSearch}`) ||
                    comments.includes(`- Valor: ${valueSearch}`);
    
    const hasPrevision = comments.includes(previsionSearch);
    
    return hasValue && hasPrevision;
  });
}

/**
 * Cria um deal individual no Bitrix via backend proxy.
 * O payload (título, comentários, campos) é montado no cliente e enviado ao servidor.
 */
export async function createBitrixDeal(receivable: Receivable, userInfo: UserAuth, collateralItems: Receivable[] = []) {
  const title = `Solicitação de Antecipação - PV ${receivable.id}`;
  
  let comments = `SOLICITAÇÃO DE ANTECIPAÇÃO REALIZADA PELO PORTAL\n`;
  comments += `==============================================\n\n`;
  
  comments += `IDENTIFICAÇÃO DO SOLICITANTE:\n`;
  comments += `NOME: ${userInfo.nome}\n`;
  comments += `CPF: ${userInfo.cpf}\n`;
  comments += `DATA NASC.: ${userInfo.dataNascimento}\n\n`;

  comments += `DADOS DA NEGOCIAÇÃO SELECIONADA:\n`;
  comments += `ID PV: ${receivable.id}\n`;
  comments += `CLIENTE: ${receivable.cliente}\n`;
  comments += `CONSTRUTORA: ${receivable.construtora}\n`;
  comments += `VALOR SOLICITADO: ${receivable.valor}\n`;
  comments += `PREVISÃO: ${receivable.previsaoMes}/${receivable.previsaoAno}\n\n`;
  
  if (collateralItems.length > 0) {
    comments += `DADOS DOS TÍTULOS EM GARANTIA (COLLATERAL):\n`;
    comments += `----------------------------------------------\n`;
    collateralItems.forEach((c, idx) => {
      comments += `GARANTIA ${idx + 1}:\n`;
      comments += `- ID PV: ${c.id}\n`;
      comments += `- Cliente: ${c.cliente}\n`;
      comments += `- Valor: ${c.valor}\n`;
      comments += `- Previsão: ${c.previsaoMes}/${c.previsaoAno}\n`;
    });
    comments += `\n`;
  }

  comments += `DETALHAMENTO COMPLETO DA PLANILHA:\n`;
  comments += `----------------------------------------------\n`;
  Object.entries(receivable.allFields).forEach(([key, value]) => {
    if (value && value !== 'null' && value !== 'undefined') {
       comments += `${key}: ${value}\n`;
    }
  });
  comments += `\n==============================================\n`;
  comments += `Data da Solicitação: ${new Date().toLocaleString('pt-BR')}`;

  const payload = {
    fields: {
      TITLE: title,
      CATEGORY_ID: CATEGORY_ID,
      COMMENTS: comments,
      [PV_FIELD]: receivable.id,
      OPPORTUNITY: receivable.valorNumeric,
      CURRENCY_ID: 'BRL'
    }
  };

  return await apiCall<any>('/api/bitrix/create', { mode: 'single', payload });
}

/**
 * Cria múltiplos deals no Bitrix via backend proxy.
 * Agrupa recebíveis por PV, monta os payloads no cliente e envia todos ao servidor.
 */
export async function createMultipleBitrixDeals(receivables: Receivable[], userInfo: UserAuth) {
  const groupById: Record<string, Receivable[]> = {};
  receivables.forEach(r => {
    if (!groupById[r.id]) groupById[r.id] = [];
    groupById[r.id].push(r);
  });

  const payloads = Object.entries(groupById).map(([id, items]) => {
    const totalVal = items.reduce((acc, curr) => acc + curr.valorNumeric, 0);
    const title = `Solicitação de Antecipação Total - PV ${id}`;
    
    let comments = `SOLICITAÇÃO DE ANTECIPAÇÃO TOTAL (MÚLTIPLAS PARCELAS)\n`;
    comments += `==============================================\n\n`;

    comments += `IDENTIFICAÇÃO DO SOLICITANTE:\n`;
    comments += `NOME: ${userInfo.nome}\n`;
    comments += `CPF: ${userInfo.cpf}\n`;
    comments += `DATA NASC.: ${userInfo.dataNascimento}\n\n`;

    comments += `DADOS CONSOLIDADOS:\n`;
    comments += `ID PV: ${id}\n`;
    comments += `TOTAL DE PARCELAS: ${items.length}\n`;
    comments += `VALOR TOTAL: R$ ${totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`;
    
    items.forEach((item, idx) => {
      comments += `PARCELA ${idx + 1}:\n`;
      comments += `- Valor: ${item.valor}\n`;
      comments += `- Previsão: ${item.previsaoMes}/${item.previsaoAno}\n`;
      comments += `- Status Atual: ${item.status}\n`;
      comments += `----------------------------------------------\n`;
    });

    return {
      fields: {
        TITLE: title,
        CATEGORY_ID: CATEGORY_ID,
        COMMENTS: comments,
        [PV_FIELD]: id,
        OPPORTUNITY: totalVal,
        CURRENCY_ID: 'BRL'
      }
    };
  });

  return await apiCall<any>('/api/bitrix/create', { mode: 'multiple', payloads });
}

/**
 * Anexa um arquivo a um deal existente no Bitrix via backend proxy.
 */
export async function updateBitrixDealWithFile(dealId: string, base64File: string, fileName: string) {
  return await apiCall<any>('/api/bitrix/update', { dealId, action: 'attachFile', base64File, fileName });
}

/**
 * Rejeita (move para LOSE) um deal no Bitrix via backend proxy.
 */
export async function rejectBitrixDeal(dealId: string) {
  return await apiCall<any>('/api/bitrix/update', { dealId, action: 'reject' });
}
