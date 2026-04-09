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
    cobrancasAtrasadas,
    conflictsPendentes,
    // Buscar última cobrança por locação para calcular saldo devedor correto
    // (cada cobrança já carrega o saldo acumulado — somar todas duplicaria)
    ultimasCobrancasPorLocacao,
  ] = await Promise.all([
    prisma.cliente.count({ where: { status: 'Ativo', deletedAt: null } }),
    prisma.produto.count({ where: { deletedAt: null } }),
    prisma.locacao.count({ where: { status: 'Ativa', deletedAt: null } }),
    prisma.cobranca.aggregate({
      where: { deletedAt: null, createdAt: { gte: inicioMes } },
      _sum: { valorRecebido: true },
      _count: true,
    }),
    prisma.cobranca.count({ where: { status: 'Atrasado', deletedAt: null } }),
    prisma.syncConflict.count({ where: { resolution: null } }),
    // Buscar a cobrança mais recente de cada locação com saldo em aberto
    prisma.$queryRaw<{ saldo: number }[]>`
      SELECT COALESCE(SUM(saldo_devedor_gerado), 0) AS saldo
      FROM (
        SELECT DISTINCT ON ("locacao_id") "saldo_devedor_gerado"
        FROM cobrancas
        WHERE "deleted_at" IS NULL
          AND status IN ('Parcial', 'Pendente', 'Atrasado')
          AND "saldo_devedor_gerado" > 0
        ORDER BY "locacao_id", "updated_at" DESC, "created_at" DESC
      ) latest
    `,
  ])

  const saldoDevedor = Number(ultimasCobrancasPorLocacao[0]?.saldo ?? 0)

  return NextResponse.json({
    totalClientes,
    totalProdutos,
    produtosLocados,
    produtosEstoque:      totalProdutos - produtosLocados,
    receitaMes:           cobrancasMes._sum.valorRecebido ?? 0,
    totalCobrancasMes:    cobrancasMes._count,
    saldoDevedor,
    cobrancasAtrasadas,
    conflictsPendentes,
    dataReferencia:       hoje.toISOString(),
  })
}
