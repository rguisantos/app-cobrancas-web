import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Header from '@/components/layout/header'
import DescricoesProdutoClient from './descricoes-client'

export const metadata: Metadata = { title: 'Descrições de Produto' }

export default async function DescricoesProdutoPage() {
  const session = await getSession()
  if (!session?.user || session.user.tipoPermissao !== 'Administrador') redirect('/dashboard')

  const descricoes = await prisma.descricaoProduto.findMany({
    where: { deletedAt: null },
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true, createdAt: true },
  })

  const descricoesSerializadas = descricoes.map(d => ({
    ...d,
    createdAt: d.createdAt.toISOString(),
  }))

  return (
    <div>
      <Header
        title="Descrições de Produto"
        subtitle="Gerencie as descrições de produto disponíveis no sistema"
      />
      <DescricoesProdutoClient descricoesIniciais={descricoesSerializadas} />
    </div>
  )
}
