import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extrai o array de dados de uma resposta de API paginada.
 * Suporta os formatos:
 * - Array direto: [{...}, {...}]
 * - Objeto paginado: { data: [...], pagination: {...} }
 * - Objeto com prop personalizada: { rotas: [...] }, { clientes: [...] }
 */
export function extractArray<T = any>(response: any): T[] {
  if (Array.isArray(response)) return response
  if (response?.data && Array.isArray(response.data)) return response.data
  // Fallback: procurar qualquer propriedade que seja array
  for (const key of Object.keys(response ?? {})) {
    if (Array.isArray(response[key])) return response[key]
  }
  return []
}
