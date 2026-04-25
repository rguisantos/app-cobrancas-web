import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ConflitosClient from './conflitos-client'

export const metadata: Metadata = { title: 'Conflitos de Sincronização' }

export default async function ConflitosPage() {
  const session = await getSession()
  if (!session?.user || session.user.tipoPermissao !== 'Administrador') redirect('/dashboard')

  const [conflitos, totalResolvidos] = await Promise.all([
    prisma.syncConflict.findMany({
      where: { resolvedAt: null },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.syncConflict.count({
      where: { resolvedAt: { not: null } },
    }),
  ])

  // Serialize the data for the client component
  const serializedConflitos = conflitos.map(c => ({
    id: c.id,
    entityId: c.entityId,
    entityType: c.entityType,
    localVersion: c.localVersion,
    remoteVersion: c.remoteVersion,
    conflictType: c.conflictType,
    createdAt: c.createdAt.toISOString(),
  }))

  return (
    <ConflitosClient
      initialConflitos={serializedConflitos}
      totalResolvidos={totalResolvidos}
    />
  )
}
