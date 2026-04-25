import { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Header from '@/components/layout/header'
import { RelogiosClient } from './relogios-client'

export const metadata: Metadata = { title: 'Histórico de Relógios' }

export default async function RelogiosPage({
  searchParams,
}: {
  searchParams: Promise<{
    busca?: string
    dataInicio?: string
    dataFim?: string
    page?: string
  }>
}) {
  const params = await searchParams
  const session = await getSession()
  const page = Number(params.page || 1)
  const limit = 20

  const where: any = {}

  if (params.dataInicio || params.dataFim) {
    where.dataAlteracao = {}
    if (params.dataInicio) where.dataAlteracao.gte = new Date(params.dataInicio)
    if (params.dataFim) where.dataAlteracao.lte = new Date(params.dataFim + 'T23:59:59')
  }

  if (params.busca) {
    where.OR = [
      { produto: { identificador: { contains: params.busca, mode: 'insensitive' } } },
      { produto: { tipoNome: { contains: params.busca, mode: 'insensitive' } } },
      { motivo: { contains: params.busca, mode: 'insensitive' } },
      { relogioAnterior: { contains: params.busca } },
      { relogioNovo: { contains: params.busca } },
    ]
  }

  const [historico, total] = await Promise.all([
    prisma.historicoRelogio.findMany({
      where,
      include: {
        produto: {
          select: {
            id: true,
            identificador: true,
            tipoNome: true,
            descricaoNome: true,
            numeroRelogio: true,
          },
        },
      },
      orderBy: { dataAlteracao: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.historicoRelogio.count({ where }),
  ])

  const podeEditar = session?.user.permissoesWeb?.todosCadastros

  const historicoFormatado = historico.map(h => ({
    id: h.id,
    dataAlteracao: h.dataAlteracao.toISOString(),
    produtoId: h.produtoId,
    produtoIdentificador: h.produto.identificador,
    produtoTipo: h.produto.tipoNome,
    relogioAnterior: h.relogioAnterior,
    relogioNovo: h.relogioNovo,
    motivo: h.motivo,
    usuarioResponsavel: h.usuarioResponsavel,
  }))

  return (
    <div>
      <Header
        title="Histórico de Relógios"
        subtitle={`${total} registro${total !== 1 ? 's' : ''} de alteração${total !== 1 ? 'ões' : ''}`}
        actions={
          podeEditar ? (
            <Link href="/relogios/nova" className="btn-primary text-sm">
              + Nova Alteração
            </Link>
          ) : undefined
        }
      />

      <RelogiosClient
        historico={historicoFormatado}
        total={total}
        page={page}
        limit={limit}
        podeEditar={podeEditar || false}
        buscaFilter={params.busca}
        dataInicioFilter={params.dataInicio}
        dataFimFilter={params.dataFim}
      />
    </div>
  )
}
