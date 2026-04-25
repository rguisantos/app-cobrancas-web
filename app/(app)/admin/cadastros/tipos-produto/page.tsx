import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Header from '@/components/layout/header'
import TiposProdutoClient from './tipos-client'

export const metadata: Metadata = { title: 'Tipos de Produto' }

export default async function TiposProdutoPage() {
  const session = await getSession()
  if (!session?.user || session.user.tipoPermissao !== 'Administrador') redirect('/dashboard')

  const tipos = await prisma.tipoProduto.findMany({
    where: { deletedAt: null },
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true, createdAt: true },
  })

  const tiposSerializados = tipos.map(t => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
  }))

  return (
    <div>
      <Header
        title="Tipos de Produto"
        subtitle="Gerencie os tipos de produto disponíveis no sistema"
      />
      <TiposProdutoClient tiposIniciais={tiposSerializados} />
    </div>
  )
}
