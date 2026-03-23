import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, serverError } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  try {
    const descricoes = await prisma.descricaoProduto.findMany({
      where: { deletedAt: null },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true }
    })
    return NextResponse.json(descricoes)
  } catch (err) {
    console.error('[GET /descricoes-produto]', err)
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
    const descricao = await prisma.descricaoProduto.create({
      data: { 
        nome: body.nome,
        deviceId: 'web',
        version: 1
      }
    })
    return NextResponse.json(descricao, { status: 201 })
  } catch (err) {
    console.error('[POST /descricoes-produto]', err)
    return serverError()
  }
}
