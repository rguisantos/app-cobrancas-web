import { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Header from '@/components/layout/header'
import { ProdutosClient } from './produtos-client'

export const metadata: Metadata = { title: 'Produtos' }

export default async function ProdutosPage({
  searchParams,
}: { searchParams: Promise<{ busca?: string; status?: string; page?: string }> }) {
  const params = await searchParams
  const session = await getSession()
  const page = Number(params.page || 1)
  const limit = 20

  const where: any = { deletedAt: null }
  if (params.status) where.statusProduto = params.status
  if (params.busca) {
    where.OR = [
      { identificador: { contains: params.busca, mode: 'insensitive' } },
      { tipoNome:      { contains: params.busca, mode: 'insensitive' } },
      { numeroRelogio: { contains: params.busca } },
    ]
  }

  const [produtos, total] = await Promise.all([
    prisma.produto.findMany({
      where,
      include: {
        locacoes: {
          where: { status: 'Ativa', deletedAt: null },
          select: { 
            clienteNome: true, 
            id: true 
          },
          take: 1,
        },
      },
      orderBy: { identificador: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.produto.count({ where }),
  ])

  const podeEditar = session?.user.permissoesWeb?.todosCadastros

  // Preparar dados para o cliente
  const produtosFormatados = produtos.map(p => {
    const locacaoAtiva = p.locacoes[0]
    return {
      id: p.id,
      identificador: p.identificador,
      tipoNome: p.tipoNome,
      descricaoNome: p.descricaoNome,
      tamanhoNome: p.tamanhoNome,
      numeroRelogio: p.numeroRelogio,
      conservacao: p.conservacao,
      statusProduto: p.statusProduto,
      clienteNome: locacaoAtiva?.clienteNome,
      locacaoId: locacaoAtiva?.id,
    }
  })

  return (
    <div>
      <Header
        title="Produtos"
        subtitle={`${total} produto${total !== 1 ? 's' : ''} cadastrado${total !== 1 ? 's' : ''}`}
        actions={podeEditar && <Link href="/produtos/novo" className="btn-primary text-sm">+ Novo Produto</Link>}
      />

      <ProdutosClient
        produtos={produtosFormatados}
        total={total}
        page={page}
        limit={limit}
        podeEditar={podeEditar || false}
        buscaFilter={params.busca}
        statusFilter={params.status}
      />
    </div>
  )
}
