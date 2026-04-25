import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
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

    const rotaFilter = rotaId
      ? Prisma.sql`AND cl."rotaId" = ${rotaId}`
      : Prisma.empty

    const rotaFilterManut = rotaId
      ? Prisma.sql`AND l."clienteId" IN (SELECT id FROM clientes WHERE "rotaId" = ${rotaId})`
      : Prisma.empty

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
        WHERE cb."dataVencimento" >= ${dataInicio}
          AND cb."dataVencimento" <= ${dataFim}
          AND cb."deletedAt" IS NULL
          AND cb.status IN ('Pendente', 'Atrasado', 'Parcial')
          ${rotaFilter}
        ORDER BY cb."dataVencimento"
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
        WHERE cb."dataPagamento" >= ${dataInicio}
          AND cb."dataPagamento" <= ${dataFim}
          AND cb."deletedAt" IS NULL
          AND cb.status IN ('Pago', 'Parcial')
          ${rotaFilter}
        ORDER BY cb."dataPagamento"
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
        WHERE m.data >= ${dataInicio}
          AND m.data <= ${dataFim}
          ${rotaFilterManut}
        ORDER BY m.data
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
    console.error('Erro ao buscar agenda:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar agenda' },
      { status: 500 }
    )
  }
}
