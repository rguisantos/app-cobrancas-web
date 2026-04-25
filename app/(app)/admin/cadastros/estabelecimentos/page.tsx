import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Header from '@/components/layout/header'
import EstabelecimentosClient from './estabelecimentos-client'

export const metadata: Metadata = { title: 'Estabelecimentos' }

export default async function EstabelecimentosPage() {
  const session = await getSession()
  if (!session?.user || session.user.tipoPermissao !== 'Administrador') redirect('/dashboard')

  const estabelecimentos = await prisma.estabelecimento.findMany({
    where: { deletedAt: null },
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true, endereco: true, observacao: true, createdAt: true },
  })

  const estabelecimentosSerializados = estabelecimentos.map(e => ({
    ...e,
    createdAt: e.createdAt.toISOString(),
  }))

  return (
    <div>
      <Header
        title="Estabelecimentos"
        subtitle="Gerencie os locais de armazenamento e estabelecimentos"
      />
      <EstabelecimentosClient estabelecimentosIniciais={estabelecimentosSerializados} />
    </div>
  )
}
