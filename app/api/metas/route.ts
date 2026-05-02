import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getAuthSession, getUserRotaIds, unauthorized, forbidden, serverError, validateBody, handleApiError, ApiError } from '@/lib/api-helpers'
import { metaCreateSchema } from '@/lib/validations'
import { registrarAuditoria, extractRequestInfo } from '@/lib/auditoria'

// GET /api/metas - List all metas with progress
export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  // Apenas admin e secretário podem ver metas
  if (session.user.tipoPermissao === 'AcessoControlado') {
    return forbidden('Sem permissão para visualizar metas')
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // ativa | atingida | expirada

    // Controle de acesso por rota
    const userRotaIds = await getUserRotaIds(session)

    const where: any = {}
    if (status) where.status = status

    // Se AcessoControlado (embora já bloqueado acima), filtrar por rota
    if (userRotaIds !== null) {
      where.OR = [
        { rotaId: { in: userRotaIds } },
        { rotaId: null }, // Metas globais visíveis para todos
      ]
    }

    const metas = await prisma.meta.findMany({
      where,
      orderBy: { dataFim: 'desc' },
    })

    // Calculate progress for each meta
    const metasComProgresso = await Promise.all(metas.map(async (meta) => {
      let valorAtual = meta.valorAtual

      // Auto-calculate current value for active metas
      if (meta.status === 'ativa') {
        const rotaFilter = meta.rotaId
          ? Prisma.sql`AND cl."rotaId" = ${meta.rotaId}`
          : Prisma.empty

        // dataVencimento is stored as text in the database, so we must cast it to timestamp
        // for comparison with the meta's DateTime fields.
        const dataInicioStr = meta.dataInicio.toISOString()
        const dataFimStr = meta.dataFim.toISOString()

        if (meta.tipo === 'receita') {
          const result = await prisma.$queryRaw<any[]>(Prisma.sql`
            SELECT COALESCE(SUM(cb."valorRecebido"), 0)::float as total
            FROM cobrancas cb
            INNER JOIN locacoes l ON l.id = cb."locacaoId"
            INNER JOIN clientes cl ON cl.id = l."clienteId"
            WHERE cb."dataVencimento"::timestamp >= ${dataInicioStr}::timestamp
              AND cb."dataVencimento"::timestamp <= ${dataFimStr}::timestamp
              AND cb."deletedAt" IS NULL
              ${rotaFilter}
          `)
          valorAtual = result[0]?.total || 0
        } else if (meta.tipo === 'cobrancas') {
          const result = await prisma.$queryRaw<any[]>(Prisma.sql`
            SELECT COUNT(*)::int as total
            FROM cobrancas cb
            INNER JOIN locacoes l ON l.id = cb."locacaoId"
            INNER JOIN clientes cl ON cl.id = l."clienteId"
            WHERE cb."dataVencimento"::timestamp >= ${dataInicioStr}::timestamp
              AND cb."dataVencimento"::timestamp <= ${dataFimStr}::timestamp
              AND cb."deletedAt" IS NULL
              ${rotaFilter}
          `)
          valorAtual = result[0]?.total || 0
        } else if (meta.tipo === 'adimplencia') {
          const result = await prisma.$queryRaw<any[]>(Prisma.sql`
            SELECT 
              COUNT(*)::int as total,
              COUNT(CASE WHEN cb.status IN ('Pago', 'Parcial') THEN 1 END)::int as pagas
            FROM cobrancas cb
            INNER JOIN locacoes l ON l.id = cb."locacaoId"
            INNER JOIN clientes cl ON cl.id = l."clienteId"
            WHERE cb."dataVencimento"::timestamp >= ${dataInicioStr}::timestamp
              AND cb."dataVencimento"::timestamp <= ${dataFimStr}::timestamp
              AND cb."deletedAt" IS NULL
              ${rotaFilter}
          `)
          const total = result[0]?.total || 0
          const pagas = result[0]?.pagas || 0
          valorAtual = total > 0 ? (pagas / total) * 100 : 0
        }

        // Auto-update if reached
        if (valorAtual >= meta.valorMeta && meta.status === 'ativa') {
          await prisma.meta.update({
            where: { id: meta.id },
            data: { status: 'atingida', valorAtual },
          })
        } else {
          await prisma.meta.update({
            where: { id: meta.id },
            data: { valorAtual },
          })
        }
      }

      const percentual = meta.valorMeta > 0 ? Math.min(100, (valorAtual / meta.valorMeta) * 100) : 0

      return {
        ...meta,
        valorAtual,
        percentual: Math.round(percentual * 10) / 10,
        diasRestantes: Math.max(0, Math.ceil((new Date(meta.dataFim).getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
      }
    }))

    return NextResponse.json(metasComProgresso)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/metas - Create a new meta
export async function POST(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  // Apenas admin pode criar metas
  if (session.user.tipoPermissao !== 'Administrador') {
    return forbidden('Apenas administradores podem criar metas')
  }

  try {
    const body = await request.json()
    const data = validateBody(metaCreateSchema, body)

    const meta = await prisma.meta.create({
      data: {
        nome: data.nome,
        tipo: data.tipo,
        valorMeta: data.valorMeta,
        dataInicio: data.dataInicio,
        dataFim: data.dataFim,
        rotaId: data.rotaId || null,
        criadoPor: data.criadoPor || session.user.id,
      },
    })

    registrarAuditoria({
      acao: 'criar_meta',
      entidade: 'meta',
      entidadeId: meta.id,
      entidadeNome: meta.nome,
      detalhes: { nome: data.nome, tipo: data.tipo, valorMeta: data.valorMeta },
      ...extractRequestInfo(request),
    })

    return NextResponse.json(meta, { status: 201 })
  } catch (err) {
    return handleApiError(err)
  }
}
