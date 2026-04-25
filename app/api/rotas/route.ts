import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, serverError } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const where: any = { deletedAt: null }
  if (status) where.status = status
  const rotas = await prisma.rota.findMany({ where, orderBy: { descricao: 'asc' } })
  return NextResponse.json(rotas)
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()
  if (session.user.tipoPermissao !== 'Administrador') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  try {
    const body = await req.json()
    const rota = await prisma.rota.create({ data: { ...body, deviceId: 'web', version: 1 } })
    return NextResponse.json(rota, { status: 201 })
  } catch (err) { console.error(err); return serverError() }
}
