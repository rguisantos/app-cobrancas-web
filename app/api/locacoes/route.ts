import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, serverError } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()
  const { searchParams } = new URL(req.url)
  const clienteId = searchParams.get('clienteId')
  const status    = searchParams.get('status')
  const page  = Number(searchParams.get('page') || 1)
  const limit = Number(searchParams.get('limit') || 20)
  const where: any = { deletedAt: null }
  if (clienteId) where.clienteId = clienteId
  if (status)    where.status    = status
  const [locacoes, total] = await Promise.all([
    prisma.locacao.findMany({ where, include: { cliente: { select: { nomeExibicao: true } }, produto: { select: { tipoNome: true, identificador: true } } }, orderBy: { dataLocacao: 'desc' }, skip: (page-1)*limit, take: limit }),
    prisma.locacao.count({ where }),
  ])
  return NextResponse.json({ data: locacoes, total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()
  try {
    const body = await req.json()
    const { id, ...rest } = body
    const locacao = await prisma.locacao.create({ data: { ...(id ? { id } : {}), ...rest, syncStatus: 'synced', needsSync: false, deviceId: 'web', version: 1 } })
    return NextResponse.json(locacao, { status: 201 })
  } catch (err) { console.error(err); return serverError() }
}
