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

  const [cobrancas, total, resumo] = await Promise.all([
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
    prisma.cobranca.aggregate({
      where: { deletedAt: null },
      _sum: { valorRecebido: true, saldoDevedorGerado: true },
    }),
  ])

  const podeEditar = session?.user.permissoesWeb?.todosCadastros

  // Preparar dados para o cliente
  const cobrancasFormatadas = cobrancas.map(c => {
    const isUltima = c.locacao?.cobrancas?.[0]?.id === c.id && c.locacao?.status === 'Ativa'
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
      totalRecebido={resumo._sum.valorRecebido ?? 0}
      totalSaldoDevedor={resumo._sum.saldoDevedorGerado ?? 0}
      statusFilter={params.status}
      buscaFilter={params.busca}
    />
  )
}
