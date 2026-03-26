import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, serverError } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  try {
    const tipos = await prisma.tipoProduto.findMany({
      where: { deletedAt: null },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true }
    })
    return NextResponse.json(tipos)
  } catch (err) {
    console.error('[GET /tipos-produto]', err)
    return serverError()
  }
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()
  if (session.user.tipoPermissao !== 'Administrador') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const tipo = await prisma.tipoProduto.create({
      data: { 
        nome: body.nome,
        deviceId: 'web',
        version: 1
      }
    })
    return NextResponse.json(tipo, { status: 201 })
  } catch (err) {
    console.error('[POST /tipos-produto]', err)
    return serverError()
  }
}
