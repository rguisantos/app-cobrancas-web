import { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Header from '@/components/layout/header'
import { formatarMoeda } from '@/shared/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Eye, Edit, DollarSign, Clock, CheckCircle, AlertTriangle, XCircle, Inbox } from 'lucide-react'
import { CobrancasClient } from './cobrancas-client'

export const metadata: Metadata = { title: 'Cobranças' }

export default async function CobrancasPage({
  searchParams,
}: { searchParams: Promise<{ status?: string; busca?: string; page?: string }> }) {
  const params = await searchParams
  const session = await getSession()
  const page = Number(params.page || 1)
  const limit = 20

  const where: any = { deletedAt: null }
  if (params.status) where.status = params.status
  if (params.busca) {
    where.OR = [
      { clienteNome: { contains: params.busca, mode: 'insensitive' } },
      { produtoIdentificador: { contains: params.busca } },
    ]
  }

  const [cobrancas, total, resumoRecebido] = await Promise.all([
    prisma.cobranca.findMany({
      where,
      include: { 
        cliente: { select: { nomeExibicao: true, id: true } },
        locacao: { 
          select: { 
            id: true,
            status: true,
            cobrancas: { 
              where: { deletedAt: null },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { id: true }
            }
          } 
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.cobranca.count({ where }),
    // Total recebido é correto somar todas cobranças (sem dupla contagem)
    prisma.cobranca.aggregate({
      where: { deletedAt: null },
      _sum: { valorRecebido: true },
    }),
  ])

  // Saldo devedor REAL: somar apenas a ÚLTIMA cobrança de cada locação
  // (o saldo da última já inclui saldos anteriores carregados)
  const saldoDevedorReal = await prisma.$queryRaw<[{ total: bigint }]>`
    SELECT COALESCE(SUM(ranked."saldoDevedorGerado"), 0) as total
    FROM (
      SELECT "saldoDevedorGerado",
        ROW_NUMBER() OVER (PARTITION BY "locacaoId" ORDER BY "createdAt" DESC) as rn
      FROM "Cobranca"
      WHERE "deletedAt" IS NULL
    ) ranked
    WHERE ranked.rn = 1
  `
  const totalSaldoDevedor = Number(saldoDevedorReal[0]?.total ?? 0)

  // Buscar saldo anterior para cada cobrança da página atual
  const cobrancaIds = cobrancas.map(c => c.id)
  const saldosAnteriores = await prisma.$queryRaw<
    { cobrancaId: string; saldoAnterior: number }[]
  >`
    SELECT c1.id as "cobrancaId", COALESCE(c2."saldoDevedorGerado", 0) as "saldoAnterior"
    FROM "Cobranca" c1
    LEFT JOIN LATERAL (
      SELECT c2."saldoDevedorGerado"
      FROM "Cobranca" c2
      WHERE c2."locacaoId" = c1."locacaoId"
        AND c2."deletedAt" IS NULL
        AND c2."createdAt" < c1."createdAt"
      ORDER BY c2."createdAt" DESC
      LIMIT 1
    ) c2 ON true
    WHERE c1.id = ANY(${cobrancaIds}::uuid[])
      AND c1."deletedAt" IS NULL
  `
  const saldoAnteriorMap = new Map(
    saldosAnteriores.map(s => [s.cobrancaId, Number(s.saldoAnterior)])
  )

  const podeEditar = session?.user.permissoesWeb?.todosCadastros

  // Preparar dados para o cliente
  const cobrancasFormatadas = cobrancas.map(c => {
    const isUltima = c.locacao?.cobrancas?.[0]?.id === c.id && c.locacao?.status === 'Ativa'
    const saldoAnterior = saldoAnteriorMap.get(c.id) ?? 0
    return {
      id: c.id,
      clienteId: c.clienteId,
      clienteNome: c.cliente?.nomeExibicao ?? c.clienteNome,
      produtoIdentificador: c.produtoIdentificador,
      locacaoId: c.locacaoId,
      dataInicio: c.dataInicio,
      dataFim: c.dataFim,
      relogioAnterior: c.relogioAnterior,
      relogioAtual: c.relogioAtual,
      fichasRodadas: c.fichasRodadas,
      totalClientePaga: c.totalClientePaga,
      valorRecebido: c.valorRecebido,
      saldoDevedorGerado: c.saldoDevedorGerado,
      saldoAnterior,
      status: c.status,
      createdAt: c.createdAt,
      podeEditar: isUltima && podeEditar,
    }
  })

  return (
    <CobrancasClient
      cobrancas={cobrancasFormatadas}
      total={total}
      page={page}
      limit={limit}
      totalRecebido={resumoRecebido._sum.valorRecebido ?? 0}
      totalSaldoDevedor={totalSaldoDevedor}
      statusFilter={params.status}
      buscaFilter={params.busca}
    />
  )
}
