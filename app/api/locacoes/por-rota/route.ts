import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, getUserRotaIds, unauthorized, serverError } from '@/lib/api-helpers'

// ─── GET /api/locacoes/por-rota ─────────────────────────────────
// Retorna locações agrupadas por rota e cliente para a tela de Nova Cobrança.
// Inclui locações Ativas + Finalizadas com saldo devedor.
// Query params: rotaId (obrigatório)

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const { searchParams } = new URL(req.url)
  const rotaId = searchParams.get('rotaId')

  if (!rotaId) {
    return NextResponse.json({ error: 'rotaId é obrigatório' }, { status: 400 })
  }

  // Verificar permissão: AcessoControlado só pode ver suas rotas
  const userRotaIds = await getUserRotaIds(session)
  if (userRotaIds !== null && !userRotaIds.includes(rotaId)) {
    return NextResponse.json({ error: 'Sem permissão para esta rota' }, { status: 403 })
  }

  try {
    // Buscar todas as locações da rota (Ativas + Finalizadas)
    const locacoes = await prisma.locacao.findMany({
      where: {
        deletedAt: null,
        status: { in: ['Ativa', 'Finalizada'] },
        cliente: { rotaId, deletedAt: null },
      },
      select: {
        id: true,
        clienteId: true,
        clienteNome: true,
        produtoId: true,
        produtoIdentificador: true,
        produtoTipo: true,
        numeroRelogio: true,
        precoFicha: true,
        percentualEmpresa: true,
        status: true,
        dataLocacao: true,
        cliente: { select: { nomeExibicao: true, rotaId: true } },
      },
      orderBy: [{ clienteNome: 'asc' }, { produtoIdentificador: 'asc' }],
    })

    // Buscar a última cobrança de cada locação para saber o saldo devedor
    const locacaoIds = locacoes.map(l => l.id)

    const ultimasCobrancas = locacaoIds.length > 0
      ? await prisma.cobranca.findMany({
          where: {
            locacaoId: { in: locacaoIds },
            deletedAt: null,
          },
          select: {
            locacaoId: true,
            saldoDevedorGerado: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        })
      : []

    // Mapear locaçãoId → saldo devedor da última cobrança (primeiro encontrado = mais recente)
    const saldoPorLocacao = new Map<string, number>()
    for (const cb of ultimasCobrancas) {
      if (!saldoPorLocacao.has(cb.locacaoId)) {
        saldoPorLocacao.set(cb.locacaoId, cb.saldoDevedorGerado ?? 0)
      }
    }

    // Enriquecer locações com saldo devedor e filtrar:
    // - Ativas: sempre incluir
    // - Finalizadas: incluir apenas se saldoDevedor > 0
    const locacoesComSaldo = locacoes
      .map(l => ({
        ...l,
        saldoDevedor: saldoPorLocacao.get(l.id) ?? 0,
      }))
      .filter(l => l.status === 'Ativa' || l.saldoDevedor > 0)

    // Agrupar por cliente
    const clientesMap = new Map<string, {
      clienteId: string
      clienteNome: string
      locacoes: typeof locacoesComSaldo
    }>()

    for (const loc of locacoesComSaldo) {
      if (!clientesMap.has(loc.clienteId)) {
        clientesMap.set(loc.clienteId, {
          clienteId: loc.clienteId,
          clienteNome: loc.cliente?.nomeExibicao ?? loc.clienteNome,
          locacoes: [],
        })
      }
      clientesMap.get(loc.clienteId)!.locacoes.push(loc)
    }

    // Converter para array ordenado por nome do cliente
    const clientes = Array.from(clientesMap.values()).sort(
      (a, b) => a.clienteNome.localeCompare(b.clienteNome, 'pt-BR')
    )

    return NextResponse.json({ data: clientes })
  } catch (err) {
    console.error('[GET /locacoes/por-rota]', err)
    return serverError()
  }
}
