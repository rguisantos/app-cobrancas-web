import { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Header from '@/components/layout/header'
import { LocacoesClient } from './locacoes-client'

export const metadata: Metadata = { title: 'Locações' }

export default async function LocacoesPage({
  searchParams,
}: { searchParams: Promise<{ status?: string; clienteId?: string; formaPagamento?: string; produtoSearch?: string; page?: string }> }) {
  const params = await searchParams
  const session = await getSession()
  const page = Number(params.page || 1)
  const limit = 20

  const where: any = { deletedAt: null }
  if (params.status) where.status = params.status
  if (params.clienteId) where.clienteId = params.clienteId
  if (params.formaPagamento) where.formaPagamento = params.formaPagamento
  if (params.produtoSearch) {
    where.produtoIdentificador = { contains: params.produtoSearch }
  }

  const [locacoes, total, clientes] = await Promise.all([
    prisma.locacao.findMany({
      where,
      include: {
        cliente: { select: { nomeExibicao: true } },
        produto: { select: { identificador: true, tipoNome: true, numeroRelogio: true } }
      },
      orderBy: { dataLocacao: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.locacao.count({ where }),
    prisma.cliente.findMany({
      where: { status: 'Ativo', deletedAt: null },
      select: { id: true, nomeExibicao: true },
      orderBy: { nomeExibicao: 'asc' }
    }),
  ])

  const podeEditar = session?.user.permissoesWeb?.todosCadastros

  // Preparar dados para o cliente
  const locacoesFormatadas = locacoes.map(l => ({
    id: l.id,
    produtoIdentificador: l.produtoIdentificador,
    produtoTipo: l.produtoTipo,
    clienteNome: l.cliente?.nomeExibicao ?? l.clienteNome,
    clienteId: l.clienteId,
    formaPagamento: l.formaPagamento,
    percentualEmpresa: l.percentualEmpresa,
    precoFicha: l.precoFicha,
    numeroRelogio: l.numeroRelogio,
    status: l.status,
    dataLocacao: l.dataLocacao,
    valorFixo: l.valorFixo,
    periodicidade: l.periodicidade,
  }))

  const clientesFormatados = clientes.map(c => ({
    id: c.id,
    nomeExibicao: c.nomeExibicao,
  }))

  return (
    <div>
      <Header
        title="Locações"
        subtitle={`${total} locação${total !== 1 ? 'ões' : ''} registrada${total !== 1 ? 's' : ''}`}
        actions={podeEditar && <Link href="/locacoes/novo" className="btn-primary text-sm">+ Nova Locação</Link>}
      />

      <LocacoesClient
        locacoes={locacoesFormatadas}
        total={total}
        page={page}
        limit={limit}
        clientes={clientesFormatados}
        podeEditar={podeEditar || false}
        clienteIdFilter={params.clienteId}
        statusFilter={params.status}
        formaPagamentoFilter={params.formaPagamento}
        produtoSearch={params.produtoSearch}
      />
    </div>
  )
}
