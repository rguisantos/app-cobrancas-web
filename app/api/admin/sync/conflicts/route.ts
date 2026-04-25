// GET /api/admin/sync/conflicts — Lista conflitos pendentes (web admin, usa NextAuth)
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.user || session.user.tipoPermissao !== 'Administrador') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const conflicts = await prisma.syncConflict.findMany({
      where: { resolvedAt: null },
      orderBy: { createdAt: 'desc' },
    })

    // Get count of resolved conflicts for stats
    const resolvedCount = await prisma.syncConflict.count({
      where: { resolvedAt: { not: null } },
    })

    return NextResponse.json({ 
      conflicts,
      stats: {
        unresolved: conflicts.length,
        resolved: resolvedCount,
      }
    })
  } catch (error) {
    console.error('[admin/sync/conflicts]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
