import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, notFound, serverError } from '@/lib/api-helpers'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()
  const cobranca = await prisma.cobranca.findFirst({ where: { id, deletedAt: null }, include: { cliente: true, locacao: true } })
  if (!cobranca) return notFound()
  return NextResponse.json(cobranca)
}
