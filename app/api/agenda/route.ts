import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getAuthSession, getUserRotaIds, unauthorized, handleApiError } from '@/lib/api-helpers'

// GET /api/agenda — Buscar eventos da agenda
export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  try {
    const { searchParams } = new URL(request.url)
    const mes = searchParams.get('mes') // formato: 2024-01
    const rotaId = searchParams.get('rotaId')
    const tipos = searchParams.get('tipos') // vencimento,recebimento,manutencao

    const tiposList = tipos ? tipos.split(',') : ['vencimento', 'recebimento', 'manutencao']

    let dataInicio: Date
    let dataFim: Date

    if (mes) {
      const [year, month] = mes.split('-').map(Number)
      dataInicio = new Date(year, month - 1, 1)
      dataFim = new Date(year, month, 0, 23, 59, 59)
    } else {
      const now = new Date()
      dataInicio = new Date(now.getFullYear(), now.getMonth(), 1)
      dataFim = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    }

    // Controle de acesso por rota
    const userRotaIds = await getUserRotaIds(session)

    // Se AcessoControlado sem rotas, retornar vazio
    if (userRotaIds !== null && userRotaIds.length === 0) {
      return NextResponse.json({ eventos: [], stats: { totalVencimentos: 0, totalRecebidos: 0, totalPendente: 0, taxaAdimplencia: 100 } })
    }

    // Filtro de rota: query param OU restrição do usuário
    let rotaFilter: Prisma.Sql
    let rotaFilterManut: Prisma.Sql

    if (userRotaIds !== null) {
      // AcessoControlado: filtrar pelas rotas do usuário
      if (rotaId && !userRotaIds.includes(rotaId)) {
        return NextResponse.json({ eventos: [], stats: { totalVencimentos: 0, totalRecebidos: 0, totalPendente: 0, taxaAdimplencia: 100 } })
      }
      const rotaIds = rotaId ? [rotaId] : userRotaIds
      rotaFilter = Prisma.sql`AND cl."rotaId" IN (${Prisma.join(rotaIds)})`
      rotaFilterManut = Prisma.sql`AND l."clienteId" IN (SELECT id FROM clientes WHERE "rotaId" IN (${Prisma.join(rotaIds)}))`
    } else {
      // Admin/Secretário: filtro opcional por rota
      rotaFilter = rotaId
        ? Prisma.sql`AND cl."rotaId" = ${rotaId}`
        : Prisma.empty
      rotaFilterManut = rotaId
        ? Prisma.sql`AND l."clienteId" IN (SELECT id FROM clientes WHERE "rotaId" = ${rotaId})`
        : Prisma.empty
    }

    interface AgendaEvent {
      id: string
      tipo: string
      titulo: string
      data: string
      status?: string
      valor?: number
      cliente_nome?: string
      produto_id?: string
      link: string
    }

    const eventos: AgendaEvent[] = []

    // Vencimentos
    // dataVencimento is text in DB — cast to timestamp for comparison
    const dataInicioStr = dataInicio.toISOString()
    const dataFimStr = dataFim.toISOString()

    if (tiposList.includes('vencimento')) {
      const vencimentos = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT 
          cb.id,
          cb.status,
          cb."dataVencimento",
          cb."totalClientePaga",
          cl."nomeExibicao" as cliente_nome,
          p.identificador as produto_id,
          l.id as locacao_id
        FROM cobrancas cb
        INNER JOIN locacoes l ON l.id = cb."locacaoId"
        INNER JOIN clientes cl ON cl.id = l."clienteId"
        LEFT JOIN produtos p ON p.id = l."produtoId"
        WHERE cb."dataVencimento"::timestamp >= ${dataInicioStr}::timestamp
          AND cb."dataVencimento"::timestamp <= ${dataFimStr}::timestamp
          AND cb."deletedAt" IS NULL
          AND cb.status IN ('Pendente', 'Atrasado', 'Parcial')
          ${rotaFilter}
        ORDER BY cb."dataVencimento"::timestamp
      `)

      for (const v of vencimentos) {
        eventos.push({
          id: `v-${v.id}`,
          tipo: 'vencimento',
          titulo: `Cobrança - ${v.cliente_nome}`,
          data: new Date(v.dataVencimento).toISOString(),
          status: v.status,
          valor: Number(v.totalClientePaga),
          cliente_nome: v.cliente_nome,
          produto_id: v.produto_id,
          link: `/cobrancas/${v.id}`,
        })
      }
    }

    // Recebimentos
    // dataPagamento is text in DB — cast to timestamp for comparison
    if (tiposList.includes('recebimento')) {
      const recebimentos = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT 
          cb.id,
          cb.status,
          cb."dataPagamento",
          cb."valorRecebido",
          cl."nomeExibicao" as cliente_nome,
          p.identificador as produto_id
        FROM cobrancas cb
        INNER JOIN locacoes l ON l.id = cb."locacaoId"
        INNER JOIN clientes cl ON cl.id = l."clienteId"
        LEFT JOIN produtos p ON p.id = l."produtoId"
        WHERE cb."dataPagamento"::timestamp >= ${dataInicioStr}::timestamp
          AND cb."dataPagamento"::timestamp <= ${dataFimStr}::timestamp
          AND cb."deletedAt" IS NULL
          AND cb.status IN ('Pago', 'Parcial')
          ${rotaFilter}
        ORDER BY cb."dataPagamento"::timestamp
      `)

      for (const r of recebimentos) {
        eventos.push({
          id: `r-${r.id}`,
          tipo: 'recebimento',
          titulo: `Recebimento - ${r.cliente_nome}`,
          data: new Date(r.dataPagamento).toISOString(),
          status: r.status,
          valor: Number(r.valorRecebido),
          cliente_nome: r.cliente_nome,
          produto_id: r.produto_id,
          link: `/cobrancas/${r.id}`,
        })
      }
    }

    // Manutenções
    // manutencao.data is text in DB — cast to timestamp for comparison
    if (tiposList.includes('manutencao')) {
      const manutencoes = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT 
          m.id,
          m.tipo,
          m.descricao,
          m.data,
          p.identificador as produto_id
        FROM manutencoes m
        LEFT JOIN produtos p ON p.id = m."produtoId"
        LEFT JOIN locacoes l ON l."produtoId" = p.id AND l.status = 'Ativa' AND l."deletedAt" IS NULL
        WHERE m.data::timestamp >= ${dataInicioStr}::timestamp
          AND m.data::timestamp <= ${dataFimStr}::timestamp
          ${rotaFilterManut}
        ORDER BY m.data::timestamp
      `)

      for (const m of manutencoes) {
        eventos.push({
          id: `m-${m.id}`,
          tipo: 'manutencao',
          titulo: `Manutenção - ${m.produto_id || 'Produto'}`,
          data: new Date(m.data).toISOString(),
          status: m.tipo,
          produto_id: m.produto_id,
          link: `/manutencoes`,
        })
      }
    }

    // Sort by date
    eventos.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())

    // Stats
    const vencimentos = eventos.filter(e => e.tipo === 'vencimento')
    const recebimentosEvt = eventos.filter(e => e.tipo === 'recebimento')
    const stats = {
      totalVencimentos: vencimentos.length,
      totalRecebidos: recebimentosEvt.reduce((s, e) => s + (e.valor || 0), 0),
      totalPendente: vencimentos.reduce((s, e) => s + (e.valor || 0), 0),
      taxaAdimplencia: vencimentos.length > 0
        ? Math.round((recebimentosEvt.length / (recebimentosEvt.length + vencimentos.filter(v => v.status === 'Atrasado').length)) * 100)
        : 100,
    }

    return NextResponse.json({ eventos, stats })
  } catch (error) {
    return handleApiError(error)
  }
}
