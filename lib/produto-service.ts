// ============================================================================
// SERVIÇO DE API — Produtos
// Centraliza todas as chamadas HTTP para endpoints de produtos
// ============================================================================

import type { Conservacao, StatusProduto } from '@cobrancas/shared'

// ============================================================================
// TIPOS DE RESPOSTA
// ============================================================================

export interface ProdutoListado {
  id: string
  identificador: string
  tipoNome: string
  descricaoNome: string
  tamanhoNome: string
  numeroRelogio: string
  conservacao: string
  statusProduto: string
  clienteNome?: string
  locacaoId?: string
  estabelecimento?: string | null
}

export interface ProdutoListResponse {
  data: ProdutoListado[]
  total: number
  page: number
  limit: number
}

export interface ProdutoDetalhe {
  id: string
  identificador: string
  numeroRelogio: string
  tipoId: string
  tipoNome: string
  descricaoId: string
  descricaoNome: string
  tamanhoId: string
  tamanhoNome: string
  codigoCH?: string | null
  codigoABLF?: string | null
  conservacao: Conservacao
  statusProduto: StatusProduto
  dataFabricacao?: string | null
  dataUltimaManutencao?: string | null
  relatorioUltimaManutencao?: string | null
  dataAvaliacao?: string | null
  aprovacao?: string | null
  estabelecimento?: string | null
  observacao?: string | null
  dataCadastro?: string | null
  dataUltimaAlteracao?: string | null
  locacoes: Array<{
    id: string
    clienteId: string
    clienteNome: string
    status: string
    dataLocacao: string
    formaPagamento: string
    percentualEmpresa: number
    precoFicha: number
    ultimaLeituraRelogio: number | null
    cliente?: { nomeExibicao: string; id: string }
  }>
  historicoRelogio: Array<{
    id: string
    relogioAnterior: string
    relogioNovo: string
    motivo: string
    dataAlteracao: string
    usuarioResponsavel: string
  }>
}

export interface AtributoItem {
  id: string
  nome: string
  createdAt: string
}

export interface ProdutoFormData {
  identificador: string
  numeroRelogio: string
  tipoId: string
  tipoNome: string
  descricaoId: string
  descricaoNome: string
  tamanhoId: string
  tamanhoNome: string
  codigoCH?: string
  codigoABLF?: string
  conservacao?: Conservacao
  statusProduto?: StatusProduto
  dataFabricacao?: string
  dataUltimaManutencao?: string
  relatorioUltimaManutencao?: string
  dataAvaliacao?: string
  aprovacao?: string
  estabelecimento?: string
  observacao?: string
}

export interface BatchActionRequest {
  action: 'delete' | 'updateStatus' | 'updateEstabelecimento'
  ids: string[]
  data?: Record<string, unknown>
}

export interface BatchActionResponse {
  success: boolean
  action: string
  affected: number
  message: string
}

// ============================================================================
// HELPERS
// ============================================================================

async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
    throw new Error(errorData.error || `Erro na requisição: ${res.status}`)
  }

  return res.json()
}

// ============================================================================
// PRODUTOS
// ============================================================================

export const produtoService = {
  /** Listar produtos com filtros e paginação */
  async listar(params?: {
    busca?: string
    status?: string
    tipoId?: string
    conservacao?: string
    disponiveis?: boolean
    page?: number
    limit?: number
  }): Promise<ProdutoListResponse> {
    const searchParams = new URLSearchParams()
    if (params?.busca) searchParams.set('busca', params.busca)
    if (params?.status) searchParams.set('status', params.status)
    if (params?.tipoId) searchParams.set('tipoId', params.tipoId)
    if (params?.conservacao) searchParams.set('conservacao', params.conservacao)
    if (params?.disponiveis) searchParams.set('disponiveis', 'true')
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))

    return apiRequest<ProdutoListResponse>(`/api/produtos?${searchParams.toString()}`)
  },

  /** Buscar produto por ID */
  async buscarPorId(id: string): Promise<ProdutoDetalhe> {
    return apiRequest<ProdutoDetalhe>(`/api/produtos/${id}`)
  },

  /** Criar novo produto */
  async criar(data: ProdutoFormData): Promise<ProdutoDetalhe> {
    return apiRequest<ProdutoDetalhe>('/api/produtos', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /** Atualizar produto existente */
  async atualizar(id: string, data: Partial<ProdutoFormData>): Promise<ProdutoDetalhe> {
    return apiRequest<ProdutoDetalhe>(`/api/produtos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  /** Excluir produto (soft delete) */
  async excluir(id: string): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(`/api/produtos/${id}`, {
      method: 'DELETE',
    })
  },

  /** Operações em lote */
  async batch(request: BatchActionRequest): Promise<BatchActionResponse> {
    return apiRequest<BatchActionResponse>('/api/produtos/batch', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  },
}

// ============================================================================
// ATRIBUTOS DE PRODUTO (Tipos, Descrições, Tamanhos)
// ============================================================================

export const atributoService = {
  /** Listar atributos */
  async listar(tipo: 'tipos-produto' | 'descricoes-produto' | 'tamanhos-produto'): Promise<AtributoItem[]> {
    return apiRequest<AtributoItem[]>(`/api/${tipo}`)
  },

  /** Criar atributo */
  async criar(tipo: 'tipos-produto' | 'descricoes-produto' | 'tamanhos-produto', nome: string): Promise<AtributoItem> {
    return apiRequest<AtributoItem>(`/api/${tipo}`, {
      method: 'POST',
      body: JSON.stringify({ nome }),
    })
  },

  /** Atualizar atributo */
  async atualizar(tipo: 'tipos-produto' | 'descricoes-produto' | 'tamanhos-produto', id: string, nome: string): Promise<AtributoItem> {
    return apiRequest<AtributoItem>(`/api/${tipo}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ nome }),
    })
  },

  /** Excluir atributo */
  async excluir(tipo: 'tipos-produto' | 'descricoes-produto' | 'tamanhos-produto', id: string): Promise<void> {
    await fetch(`/api/${tipo}/${id}`, { method: 'DELETE' })
  },
}
