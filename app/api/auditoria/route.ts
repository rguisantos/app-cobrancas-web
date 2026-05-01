import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, handleApiError } from '@/lib/api-helpers'
import { ACAO_LABELS, ENTIDADE_LABELS, ACAO_CATEGORIAS, ACOES_COM_ENTIDADE_NO_LABEL, getCategoriaAcao, parseUserAgent, gerarDiff, formatarDiffParaResumo } from '@/lib/auditoria'

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
    const severidade = searchParams.get('severidade')
    const origem = searchParams.get('origem')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}
    if (entidade) where.entidade = entidade
    if (acao) where.acao = { startsWith: acao }
    if (usuarioId) where.usuarioId = usuarioId
    if (severidade) where.severidade = severidade
    if (origem) where.origem = origem
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
            select: { id: true, nome: true, email: true, tipoPermissao: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.logAuditoria.count({ where }),
    ])

    // Enriquecer com labels, diff e device info
    const enriched = logs.map(log => {
      const acaoLabel = ACAO_LABELS[log.acao] || log.acao
      const entidadeLabel = ENTIDADE_LABELS[log.entidade] || log.entidade
      const categoria = getCategoriaAcao(log.acao)
      const categoriaInfo = ACAO_CATEGORIAS[categoria] || ACAO_CATEGORIAS.especial

      // Parsear user-agent para info de dispositivo
      const deviceInfo = parseUserAgent(log.userAgent)

      // Gerar diff se tem antes/depois
      const diff = gerarDiff(
        log.antes as Record<string, any> | null,
        log.depois as Record<string, any> | null
      )
      const diffResumo = formatarDiffParaResumo(diff)

      // Gerar resumo legível (sem redundância: se o label da ação já contém a entidade, não repete)
      const detalhes = log.detalhes as Record<string, any> | null
      const entidadeNome = log.entidadeNome || (
        detalhes?.nome || detalhes?.nomeExibicao || detalhes?.identificador || detalhes?.email ||
        detalhes?.descricao || detalhes?.clienteNome || detalhes?.produtoIdentificador || ''
      )
      const acaoJaContemEntidade = ACOES_COM_ENTIDADE_NO_LABEL.has(log.acao)
      let resumo = acaoJaContemEntidade ? acaoLabel : `${acaoLabel} — ${entidadeLabel}`
      if (entidadeNome) resumo += `: ${entidadeNome}`
      if (diffResumo) resumo += ` (${diffResumo})`

      return {
        ...log,
        acaoLabel,
        entidadeLabel,
        entidadeNome,
        acaoContemEntidade: acaoJaContemEntidade,
        categoria,
        categoriaLabel: categoriaInfo.label,
        categoriaColor: categoriaInfo.color,
        categoriaBg: categoriaInfo.bg,
        resumo,
        usuarioNome: log.usuario?.nome || 'Sistema',
        usuarioEmail: log.usuario?.email || '',
        usuarioTipoPermissao: log.usuario?.tipoPermissao || '',
        deviceInfo,
        diff,
      }
    })

    // Estatísticas para o dashboard
    const trintaDiasAtras = new Date(new Date().setDate(new Date().getDate() - 30))
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const [totalMes, statsHoje, topAcoes, topUsuarios, porSeveridade, porOrigem, porEntidade] = await Promise.all([
      prisma.logAuditoria.count({
        where: { createdAt: { gte: trintaDiasAtras } },
      }),
      prisma.logAuditoria.count({
        where: { createdAt: { gte: hoje } },
      }),
      prisma.logAuditoria.groupBy({
        by: ['acao'],
        where: { createdAt: { gte: trintaDiasAtras } },
        _count: { acao: true },
        orderBy: { _count: { acao: 'desc' } },
        take: 8,
      }),
      prisma.logAuditoria.groupBy({
        by: ['usuarioId'],
        where: { createdAt: { gte: trintaDiasAtras }, usuarioId: { not: null } },
        _count: { usuarioId: true },
        orderBy: { _count: { usuarioId: 'desc' } },
        take: 5,
      }),
      prisma.logAuditoria.groupBy({
        by: ['severidade'],
        where: { createdAt: { gte: trintaDiasAtras } },
        _count: { severidade: true },
      }),
      prisma.logAuditoria.groupBy({
        by: ['origem'],
        where: { createdAt: { gte: trintaDiasAtras } },
        _count: { origem: true },
      }),
      prisma.logAuditoria.groupBy({
        by: ['entidade'],
        where: { createdAt: { gte: trintaDiasAtras } },
        _count: { entidade: true },
        orderBy: { _count: { entidade: 'desc' } },
        take: 8,
      }),
    ])

    // Buscar nomes dos top usuários
    const topUsuarioIds = topUsuarios.filter(u => u.usuarioId).map(u => u.usuarioId!)
    const topUsuariosNomes = await prisma.usuario.findMany({
      where: { id: { in: topUsuarioIds } },
      select: { id: true, nome: true, email: true },
    })

    const topUsuariosComNome = topUsuarios.map(tu => {
      const user = topUsuariosNomes.find(u => u.id === tu.usuarioId)
      return {
        usuarioId: tu.usuarioId,
        nome: user?.nome || 'Desconhecido',
        email: user?.email || '',
        count: tu._count.usuarioId,
      }
    })

    // Contagem de ações críticas e de segurança hoje
    const criticasHoje = await prisma.logAuditoria.count({
      where: {
        createdAt: { gte: hoje },
        severidade: { in: ['critico', 'seguranca'] },
      },
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
        totalMes,
        totalHoje: statsHoje,
        criticasHoje,
        topAcoes: topAcoes.map(ta => ({
          acao: ta.acao,
          label: ACAO_LABELS[ta.acao] || ta.acao,
          count: ta._count.acao,
        })),
        topUsuarios: topUsuariosComNome,
        porSeveridade: porSeveridade.map(ps => ({
          severidade: ps.severidade,
          count: ps._count.severidade,
        })),
        porOrigem: porOrigem.map(po => ({
          origem: po.origem,
          count: po._count.origem,
        })),
        porEntidade: porEntidade.map(pe => ({
          entidade: pe.entidade,
          label: ENTIDADE_LABELS[pe.entidade] || pe.entidade,
          count: pe._count.entidade,
        })),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
