import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, serverError } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()
  const { searchParams } = new URL(req.url)
  const clienteId  = searchParams.get('clienteId')
  const status     = searchParams.get('status')
  const dataInicio = searchParams.get('dataInicio')
  const dataFim    = searchParams.get('dataFim')
  const page  = Number(searchParams.get('page') || 1)
  const limit = Number(searchParams.get('limit') || 20)
  const where: any = { deletedAt: null }
  if (clienteId)  where.clienteId = clienteId
  if (status)     where.status    = status
  if (dataInicio || dataFim) {
    where.dataFim = {}
    if (dataInicio) where.dataFim.gte = dataInicio
    if (dataFim)    where.dataFim.lte = dataFim
  }
  const [cobrancas, total] = await Promise.all([
    prisma.cobranca.findMany({ where, include: { cliente: { select: { nomeExibicao: true } } }, orderBy: { createdAt: 'desc' }, skip: (page-1)*limit, take: limit }),
    prisma.cobranca.count({ where }),
  ])
  return NextResponse.json({ data: cobrancas, total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()
  try {
    const body = await req.json()
    const { id, ...rest } = body
    const cobranca = await prisma.cobranca.create({ data: { ...(id ? { id } : {}), ...rest, syncStatus: 'synced', needsSync: false, deviceId: 'web', version: 1 } })
    return NextResponse.json(cobranca, { status: 201 })
  } catch (err) { console.error(err); return serverError() }
}
