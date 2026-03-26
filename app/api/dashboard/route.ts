import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized } from '@/lib/api-helpers'

export async function GET() {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

  const [
    totalClientes,
    totalProdutos,
    produtosLocados,
    cobrancasMes,
    saldoDevedor,
    cobrancasAtrasadas,
    conflictsPendentes,
  ] = await Promise.all([
    prisma.cliente.count({ where: { status: 'Ativo', deletedAt: null } }),
    prisma.produto.count({ where: { deletedAt: null } }),
    prisma.locacao.count({ where: { status: 'Ativa', deletedAt: null } }),
    prisma.cobranca.aggregate({
      where: { deletedAt: null, createdAt: { gte: inicioMes } },
      _sum: { valorRecebido: true },
      _count: true,
    }),
    prisma.cobranca.aggregate({
      where: { deletedAt: null, status: { in: ['Parcial', 'Pendente', 'Atrasado'] } },
      _sum: { saldoDevedorGerado: true },
    }),
    prisma.cobranca.count({ where: { status: 'Atrasado', deletedAt: null } }),
    prisma.syncConflict.count({ where: { resolution: null } }),
  ])

  return NextResponse.json({
    totalClientes,
    totalProdutos,
    produtosLocados,
    produtosEstoque: totalProdutos - produtosLocados,
    receitaMes:       cobrancasMes._sum.valorRecebido ?? 0,
    totalCobrancasMes: cobrancasMes._count,
    saldoDevedor:     saldoDevedor._sum.saldoDevedorGerado ?? 0,
    cobrancasAtrasadas,
    conflictsPendentes,
    dataReferencia:   hoje.toISOString(),
  })
}
