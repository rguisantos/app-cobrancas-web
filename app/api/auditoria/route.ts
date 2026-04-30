import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, handleApiError } from '@/lib/api-helpers'
import { ACAO_LABELS, ENTIDADE_LABELS, ACAO_CATEGORIAS, getCategoriaAcao } from '@/lib/auditoria'

// GET /api/auditoria — Listar logs de auditoria (LogAuditoria)
export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  try {
    const { searchParams } = new URL(request.url)
    const entidade = searchParams.get('entidade')
    const acao = searchParams.get('acao')
    const usuarioId = searchParams.get('usuarioId')
    const dataInicio = searchParams.get('dataInicio')
    const dataFim = searchParams.get('dataFim')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}
    if (entidade) where.entidade = entidade
    if (acao) where.acao = acao
    if (usuarioId) where.usuarioId = usuarioId
    if (dataInicio || dataFim) {
      where.createdAt = {}
      if (dataInicio) where.createdAt.gte = new Date(dataInicio)
      if (dataFim) where.createdAt.lte = new Date(dataFim + 'T23:59:59')
    }

    const [logs, total] = await Promise.all([
      prisma.logAuditoria.findMany({
        where,
        include: {
          usuario: {
            select: { id: true, nome: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.logAuditoria.count({ where }),
    ])

    // Enriquecer com labels
    const enriched = logs.map(log => {
      const acaoLabel = ACAO_LABELS[log.acao] || log.acao
      const entidadeLabel = ENTIDADE_LABELS[log.entidade] || log.entidade
      const categoria = getCategoriaAcao(log.acao)
      const categoriaInfo = ACAO_CATEGORIAS[categoria] || ACAO_CATEGORIAS.especial

      // Gerar resumo legível
      const detalhes = log.detalhes as Record<string, any> | null
      let resumo = `${acaoLabel} — ${entidadeLabel}`
      if (detalhes?.nome || detalhes?.nomeExibicao || detalhes?.identificador || detalhes?.email) {
        resumo += `: ${detalhes.nome || detalhes.nomeExibicao || detalhes.identificador || detalhes.email}`
      }
      if (detalhes?.campos && Array.isArray(detalhes.campos)) {
        resumo += ` (${detalhes.campos.join(', ')})`
      }

      return {
        ...log,
        acaoLabel,
        entidadeLabel,
        categoria,
        categoriaLabel: categoriaInfo.label,
        categoriaColor: categoriaInfo.color,
        categoriaBg: categoriaInfo.bg,
        resumo,
        usuarioNome: log.usuario?.nome || 'Sistema',
        usuarioEmail: log.usuario?.email || '',
      }
    })

    // Estatísticas rápidas para o dashboard
    const stats = await prisma.logAuditoria.aggregate({
      where: { createdAt: { gte: new Date(new Date().setDate(new Date().getDate() - 30)) } },
      _count: true,
    })

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const statsHoje = await prisma.logAuditoria.count({
      where: { createdAt: { gte: hoje } },
    })

    // Top ações
    const topAcoes = await prisma.logAuditoria.groupBy({
      by: ['acao'],
      where: { createdAt: { gte: new Date(new Date().setDate(new Date().getDate() - 30)) } },
      _count: { acao: true },
      orderBy: { _count: { acao: 'desc' } },
      take: 5,
    })

    return NextResponse.json({
      logs: enriched,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: {
        totalMes: stats._count,
        totalHoje: statsHoje,
        topAcoes: topAcoes.map(ta => ({
          acao: ta.acao,
          label: ACAO_LABELS[ta.acao] || ta.acao,
          count: ta._count.acao,
        })),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
