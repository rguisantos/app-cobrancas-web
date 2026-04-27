// lib/relatorios-helpers.ts — Funções utilitárias compartilhadas para relatórios

import { Prisma } from '@prisma/client'
import { getAuthSession, getUserRotaIds, unauthorized, forbidden } from './api-helpers'
import { NextRequest, NextResponse } from 'next/server'

// ─── Tipos ────────────────────────────────────────────────────

export interface DateRange {
  inicio: Date
  fim: Date
}

export interface PreviousPeriod {
  inicioAnterior: Date
  fimAnterior: Date
}

export interface RotaSqlFragments {
  /** Para cláusulas WHERE em queries de cobranças: AND "clienteId" IN (...) */
  rotaSubquery: Prisma.Sql
  /** Para JOINs em queries que precisam acessar campos do cliente */
  rotaJoin: Prisma.Sql
  /** Para cláusulas WHERE em queries de rotas: AND r.id = ? */
  rotaFilter: Prisma.Sql
  /** Para cláusulas WHERE em queries de clientes: AND c."rotaId" = ? */
  rotaClienteFilter: Prisma.Sql
}

export interface AuthResult {
  session: NonNullable<Awaited<ReturnType<typeof getAuthSession>>>
  rotaIds: string[] | null  // null = sem restrição (acesso total)
  effectiveRotaId: string | undefined  // rotaId do filtro, se permitido
}

export type MonthlyData<T extends Record<string, unknown> = Record<string, unknown>> = T & {
  mes: string
}

// ─── Constantes ───────────────────────────────────────────────

export const MESES_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'] as const

export const DIAS_SEMANA_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const

export const ORDEM_SEGUNDA = [1, 2, 3, 4, 5, 6, 0] as const // Seg→Dom

export const FAIXAS_INADIMPLENCIA = ['0-30', '31-60', '61-90', '90+'] as const

export const FAIXAS_VARIACAO_RELOGIO = ['0-50', '51-100', '101-200', '200+'] as const

// ─── Cálculo de Período ───────────────────────────────────────

/**
 * Calcula o intervalo de datas com base no parâmetro de período ou datas explícitas.
 * NÃO muta o objeto Date de entrada — sempre cria novas instâncias.
 */
export function calcularPeriodo(
  periodo?: string | null,
  dataInicioStr?: string | null,
  dataFimStr?: string | null
): DateRange {
  const hoje = new Date()
  let inicio: Date
  let fim: Date

  // Se datas explícitas foram fornecidas, usar elas
  if (dataInicioStr && dataFimStr) {
    inicio = new Date(dataInicioStr)
    fim = new Date(dataFimStr)
  } else {
    switch (periodo) {
      case 'trimestre':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1)
        break
      case 'semestre':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1)
        break
      case 'ano':
        inicio = new Date(hoje.getFullYear(), 0, 1)
        break
      default: // 'mes' ou não especificado
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    }
    fim = new Date(hoje)
  }

  // Ajustar fim para fim do dia (sem mutar o original)
  fim = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate(), 23, 59, 59, 999)

  return { inicio, fim }
}

/**
 * Calcula o período anterior correspondente (mesma duração antes do início).
 */
export function calcularPeriodoAnterior(inicio: Date, fim: Date): PreviousPeriod {
  const duracao = fim.getTime() - inicio.getTime()
  const inicioAnterior = new Date(inicio.getTime() - duracao)
  const fimAnterior = new Date(inicio.getTime() - 1)
  return { inicioAnterior, fimAnterior }
}

/**
 * Calcula a data de início para os últimos N meses (para gráficos de evolução).
 */
export function inicioUltimosMeses(meses: number): Date {
  const hoje = new Date()
  return new Date(hoje.getFullYear(), hoje.getMonth() - (meses - 1), 1)
}

// ─── SQL Fragments ────────────────────────────────────────────

/**
 * Constrói fragments SQL reutilizáveis para filtrar por rota.
 * Centraliza a lógica que antes era duplicada em cada arquivo de relatório.
 */
export function buildRotaFragments(rotaId?: string | null): RotaSqlFragments {
  return {
    rotaSubquery: rotaId
      ? Prisma.sql`AND "clienteId" IN (SELECT id FROM clientes WHERE "rotaId" = ${rotaId} AND "deletedAt" IS NULL)`
      : Prisma.empty,

    rotaJoin: rotaId
      ? Prisma.sql`JOIN clientes c ON cb."clienteId" = c.id AND c."rotaId" = ${rotaId} AND c."deletedAt" IS NULL`
      : Prisma.empty,

    rotaFilter: rotaId
      ? Prisma.sql`AND r.id = ${rotaId}`
      : Prisma.empty,

    rotaClienteFilter: rotaId
      ? Prisma.sql`AND c."rotaId" = ${rotaId}`
      : Prisma.empty,
  }
}

/**
 * Constrói fragment SQL para filtro de status de cobrança.
 */
export function buildStatusFragment(status?: string | null): Prisma.Sql {
  return status
    ? Prisma.sql`AND status = ${status}`
    : Prisma.empty
}

/**
 * Constrói fragment SQL para filtro de tipo de produto.
 */
export function buildTipoFragment(tipoId?: string | null, alias = 'p'): Prisma.Sql {
  return tipoId
    ? Prisma.sql`AND ${Prisma.raw(`"${alias}"."tipoId"`)} = ${tipoId}`
    : Prisma.empty
}

/**
 * Constrói fragment SQL para filtro de conservação.
 */
export function buildConservacaoFragment(conservacao?: string | null): Prisma.Sql {
  return conservacao
    ? Prisma.sql`AND conservacao = ${conservacao}`
    : Prisma.empty
}

/**
 * Constrói fragment SQL para filtro de estabelecimento.
 */
export function buildEstabelecimentoFragment(estabelecimento?: string | null): Prisma.Sql {
  return estabelecimento
    ? Prisma.sql`AND estabelecimento = ${estabelecimento}`
    : Prisma.empty
}

/**
 * Constrói fragment SQL para filtro de tipo de manutenção.
 */
export function buildTipoManutencaoFragment(tipo?: string | null): Prisma.Sql {
  return tipo
    ? Prisma.sql`AND m.tipo = ${tipo}`
    : Prisma.empty
}

/**
 * Constrói fragment SQL para filtro de produtoId.
 */
export function buildProdutoIdFragment(produtoId?: string | null): Prisma.Sql {
  return produtoId
    ? Prisma.sql`AND "produtoId" = ${produtoId}`
    : Prisma.empty
}

// ─── Preenchimento de Dados Mensais ───────────────────────────

/**
 * Preenche dados mensais para os últimos N meses, garantindo que todos os meses
 * estejam presentes mesmo sem dados. Centraliza a lógica duplicada em 10+ arquivos.
 */
export function fillMonthlyData<T extends { mes: Date }>(
  rawData: T[],
  months: number = 12,
  mapFn: (mes: string, existente: T | undefined) => MonthlyData
): MonthlyData[] {
  const hoje = new Date()
  return Array.from({ length: months }, (_, i) => {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - (months - 1 - i), 1)
    const mesIndex = data.getMonth()
    const mesLabel = `${MESES_LABELS[mesIndex]}/${data.getFullYear().toString().slice(-2)}`

    const existente = rawData.find(e => {
      const eDate = new Date(e.mes)
      return eDate.getMonth() === mesIndex && eDate.getFullYear() === data.getFullYear()
    })

    return mapFn(mesLabel, existente)
  })
}

/**
 * Variação simplificada para dados com apenas 'valor' e 'count'.
 */
export function fillMonthlyValorCount(
  rawData: { mes: Date; total: number; count: number }[],
  months: number = 12
): { mes: string; valor: number; count: number }[] {
  return fillMonthlyData(rawData, months, (mes, existente) => ({
    mes,
    valor: (existente as { total: number } | undefined)?.total ?? 0,
    count: (existente as { count: number } | undefined)?.count ?? 0,
  })) as { mes: string; valor: number; count: number }[]
}

// ─── Cálculos Auxiliares ──────────────────────────────────────

/**
 * Calcula variação percentual entre dois valores.
 */
export function calcVariacao(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

/**
 * Formata valor como moeda pt-BR.
 */
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

// ─── Autenticação para Relatórios ─────────────────────────────

/**
 * Verifica autenticação e permissões para endpoints de relatórios.
 * Retorna dados da sessão, rotas permitidas e rotaId efetivo (se o filtro for permitido).
 * 
 * Regras:
 * - Sem sessão → 401
 * - AcessoControlado sem permissão de relatórios → 403
 * - AcessoControlado com filtro de rota não permitida → 403
 * - Admin/Secretário → acesso total
 */
export async function authenticateReport(
  req: NextRequest,
  requestedRotaId?: string | null
): Promise<AuthResult | NextResponse> {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const tipoPermissao = session.user.tipoPermissao

  // AcessoControlado precisa de permissão específica
  if (tipoPermissao === 'AcessoControlado') {
    const permissoes = session.user.permissoesWeb as unknown as Record<string, boolean> | null
    if (!permissoes?.relatorios && !permissoes?.todosCadastros) {
      return forbidden('Sem permissão para acessar relatórios')
    }
  }

  // Verificar acesso à rota solicitada
  const rotaIds = await getUserRotaIds(session)
  
  let effectiveRotaId: string | undefined
  
  if (requestedRotaId) {
    // Se o usuário tem acesso total, permite qualquer rota
    if (rotaIds === null) {
      effectiveRotaId = requestedRotaId
    } else if (rotaIds.includes(requestedRotaId)) {
      effectiveRotaId = requestedRotaId
    } else {
      return forbidden('Sem acesso à rota solicitada')
    }
  }

  return {
    session: session as NonNullable<typeof session>,
    rotaIds,
    effectiveRotaId,
  }
}

/**
 * Extrai parâmetros comuns de relatórios da URL.
 */
export function extractReportParams(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  return {
    periodo: searchParams.get('periodo') || undefined,
    dataInicio: searchParams.get('dataInicio') || undefined,
    dataFim: searchParams.get('dataFim') || undefined,
    rotaId: searchParams.get('rotaId') || undefined,
    status: searchParams.get('status') || undefined,
  }
}

// ─── Mapeamento de Dia da Semana ──────────────────────────────

/**
 * Mapeia dados por dia da semana (DOW 0-6) reordenando para começar na segunda.
 */
export function mapDiaSemana<T extends { diaSemana: number }>(
  rawData: T[],
  valueExtractor: (dow: number, existente: T | undefined) => Record<string, unknown>
): Record<string, unknown>[] {
  return ORDEM_SEGUNDA.map(dow => {
    const existente = rawData.find(d => d.diaSemana === dow)
    return {
      dia: DIAS_SEMANA_LABELS[dow],
      ...valueExtractor(dow, existente),
    }
  })
}
