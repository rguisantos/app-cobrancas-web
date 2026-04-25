import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Header from '@/components/layout/header'
import TamanhosProdutoClient from './tamanhos-client'

export const metadata: Metadata = { title: 'Tamanhos de Produto' }

export default async function TamanhosProdutoPage() {
  const session = await getSession()
  if (!session?.user || session.user.tipoPermissao !== 'Administrador') redirect('/dashboard')

  const tamanhos = await prisma.tamanhoProduto.findMany({
    where: { deletedAt: null },
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true, createdAt: true },
  })

  const tamanhosSerializados = tamanhos.map(t => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
  }))

  return (
    <div>
      <Header
        title="Tamanhos de Produto"
        subtitle="Gerencie os tamanhos de produto disponíveis no sistema"
      />
      <TamanhosProdutoClient tamanhosIniciais={tamanhosSerializados} />
    </div>
  )
}
