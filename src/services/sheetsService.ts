import { apiCall } from './apiClient';

export interface UserData {
  nome: string;
  dataNascimento: string;
  cpf: string;
  empresa?: string;
  cargo?: string;
  superintendencia?: string;
  loja?: string; // Coluna S (usuários)
  allFields?: Record<string, any>;
}

export interface Receivable {
  receivableId: string; // ID único (ex: pv-index)
  id: string;
  nome: string; // Corretor (Coluna J)
  liderTrainee: string; // Coluna K
  lider: string; // Coluna L
  loja: string; // Coluna E
  valor: string;
  valorNumeric: number;
  valorOriginalP: string;
  construtora: string;
  cliente: string;
  empreendimento: string; // Coluna C
  blocoUnidade: string;    // Coluna D
  previsaoMes: string;
  previsaoAno: string;
  infoParcela: string;
  status: string;
  allFields: Record<string, string>;
  userRole?: 'Corretor' | 'Líder Trainee' | 'Líder' | 'Diretor' | 'Superintendente';
}

/**
 * Busca todos os usuários da planilha via backend proxy.
 * @returns Lista de usuários cadastrados.
 */
export async function fetchUsers(): Promise<UserData[]> {
  try {
    return await apiCall<UserData[]>('/api/sheets/users');
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return [];
  }
}

/**
 * Autentica um usuário com nome, data de nascimento e CPF via backend proxy.
 * A normalização e comparação dos dados ocorre no servidor.
 */
export async function authenticateUser(nome: string, dataNascimento: string, cpf: string): Promise<UserData | null> {
  try {
    const result = await apiCall<UserData>('/api/sheets/authenticate', { nome, dataNascimento, cpf });
    return result;
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return null;
  }
}

/**
 * Busca os recebíveis (comissões) para um usuário específico via backend proxy.
 * A filtragem por papel (Corretor, Líder, Diretor, etc.) ocorre no servidor.
 */
export async function fetchReceivables(user: UserData): Promise<Receivable[]> {
  try {
    return await apiCall<Receivable[]>('/api/sheets/receivables', { user });
  } catch (error) {
    console.error('Erro ao buscar recebíveis:', error);
    return [];
  }
}
