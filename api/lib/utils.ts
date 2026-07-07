/**
 * @module utils
 * @description Funções de normalização utilizadas no servidor para autenticação
 * e comparação de dados de usuários.
 */

/**
 * Normaliza um CPF removendo todos os caracteres não numéricos.
 * @param cpf - CPF em qualquer formato (com ou sem pontuação)
 * @returns CPF contendo apenas dígitos
 */
export function normalizeCPF(cpf: string): string {
  return String(cpf).replace(/\D/g, '');
}

/**
 * Normaliza uma data removendo todos os caracteres não numéricos.
 * @param date - Data em qualquer formato (ex: "01/01/2000" → "01012000")
 * @returns Data contendo apenas dígitos
 */
export function normalizeDate(date: string): string {
  return String(date).replace(/\D/g, '');
}

/**
 * Normaliza um nome para comparação: lowercase, trim e espaços únicos.
 * @param name - Nome a ser normalizado
 * @returns Nome normalizado para comparação
 */
export function normalizeName(name: string): string {
  return String(name).toLowerCase().trim().replace(/\s+/g, ' ');
}
