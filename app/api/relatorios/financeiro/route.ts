// GET /api/relatorios/financeiro — Relatório financeiro por período
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extrairToken, verificarToken } from '@/lib/jwt'
import { z } from 'zod'

const querySchema = z.object({
  dataInicio: z.string(),
  dataFim: z.string(),
  rotaId: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const token = extrairToken(req.headers.get('Authorization'))
  if (!token || !verificarToken(token)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const params = querySchema.parse({
      dataInicio: searchParams.get('dataInicio') || new Date(new Date().setDate(1)).toISOString().split('T')[0],
      dataFim: searchParams.get('dataFim') || new Date().toISOString().split('T')[0],
      rotaId: searchParams.get('rotaId') || undefined,
    })

    const inicio = new Date(params.dataInicio)
    const fim = new Date(params.dataFim)
    fim.setHours(23, 59, 59, 999)

    // Buscar cobranças do período
    const cobrancas = await prisma.cobranca.findMany({
      where: {
        dataFim: {
          gte: inicio.toISOString(),
          lte: fim.toISOString(),
        },
        deletedAt: null,
        ...(params.rotaId && {
          cliente: { rotaId: params.rotaId }
        }),
      },
      include: {
        cliente: { select: { nomeExibicao: true, rotaId: true } },
      },
      orderBy: { dataFim: 'desc' },
    })

    // Calcular totais
    const totais = {
      totalBruto: 0,
      totalDescontos: 0,
      totalPercentual: 0,
      totalClientePaga: 0,
      totalRecebido: 0,
      saldoDevedorGerado: 0,
      quantidade: cobrancas.length,
    }

    cobrancas.forEach((c) => {
      totais.totalBruto += c.totalBruto || 0
      totais.totalDescontos += (c.descontoPartidasValor || 0) + (c.descontoDinheiro || 0)
      totais.totalPercentual += c.valorPercentual || 0
      totais.totalClientePaga += c.totalClientePaga || 0
      totais.totalRecebido += c.valorRecebido || 0
      totais.saldoDevedorGerado += c.saldoDevedorGerado || 0
    })

    return NextResponse.json({
      periodo: {
        inicio: params.dataInicio,
        fim: params.dataFim,
      },
      totais,
      cobrancas,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Parâmetros inválidos', details: error.errors }, { status: 400 })
    }
    console.error('[relatorios/financeiro]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
