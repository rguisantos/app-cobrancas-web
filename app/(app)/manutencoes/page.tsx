import { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Header from '@/components/layout/header'
import { ManutencoesClient } from './manutencoes-client'

export const metadata: Metadata = { title: 'Manutenções' }

export default async function ManutencoesPage({
  searchParams,
}: { searchParams: Promise<{ tipo?: string; busca?: string; dataInicio?: string; dataFim?: string; page?: string }> }) {
  const params = await searchParams
  const session = await getSession()
  const page = Number(params.page || 1)
  const limit = 20

  const where: any = { deletedAt: null }
  if (params.tipo) where.tipo = params.tipo
  if (params.busca) {
    where.OR = [
      { produtoIdentificador: { contains: params.busca, mode: 'insensitive' } },
      { clienteNome:          { contains: params.busca, mode: 'insensitive' } },
      { descricao:            { contains: params.busca, mode: 'insensitive' } },
    ]
  }
  if (params.dataInicio || params.dataFim) {
    where.data = {}
    if (params.dataInicio) where.data.gte = params.dataInicio
    if (params.dataFim)    where.data.lte = params.dataFim
  }

  const [manutencoes, total] = await Promise.all([
    prisma.manutencao.findMany({
      where,
      include: {
        produto: {
          select: {
            id: true,
            identificador: true,
            tipoNome: true,
            statusProduto: true,
          },
        },
      },
      orderBy: { data: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.manutencao.count({ where }),
  ])

  const podeEditar = session?.user.permissoesWeb?.todosCadastros

  const manutencoesFormatadas = manutencoes.map(m => ({
    id: m.id,
    produtoId: m.produtoId,
    produtoIdentificador: m.produtoIdentificador || m.produto?.identificador,
    produtoTipo: m.produtoTipo || m.produto?.tipoNome,
    clienteId: m.clienteId,
    clienteNome: m.clienteNome,
    locacaoId: m.locacaoId,
    tipo: m.tipo,
    descricao: m.descricao,
    data: m.data,
    registradoPor: m.registradoPor,
    produtoStatus: m.produto?.statusProduto,
    createdAt: m.createdAt,
  }))

  // Contadores por tipo
  const [totalTrocaPano, totalManutencao] = await Promise.all([
    prisma.manutencao.count({ where: { deletedAt: null, tipo: 'trocaPano' } }),
    prisma.manutencao.count({ where: { deletedAt: null, tipo: 'manutencao' } }),
  ])

  return (
    <div>
      <Header
        title="Manutenções"
        subtitle={`${total} registro${total !== 1 ? 's' : ''}`}
        actions={podeEditar && <Link href="/manutencoes/nova" className="btn-primary text-sm">+ Nova Manutenção</Link>}
      />

      <ManutencoesClient
        manutencoes={manutencoesFormatadas}
        total={total}
        page={page}
        limit={limit}
        totalTrocaPano={totalTrocaPano}
        totalManutencao={totalManutencao}
        tipoFilter={params.tipo}
        buscaFilter={params.busca}
        dataInicioFilter={params.dataInicio}
        dataFimFilter={params.dataFim}
        podeEditar={podeEditar || false}
      />
    </div>
  )
}
