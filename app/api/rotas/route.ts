import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, getUserRotaIds, unauthorized, serverError } from '@/lib/api-helpers'
import { rotaCreateSchema } from '@/lib/validations'

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const where: any = { deletedAt: null }
  if (status) where.status = status

  // Filtrar rotas por permissão do usuário
  const rotaIds = await getUserRotaIds(session)
  if (rotaIds !== null) {
    // AcessoControlado: só pode ver suas rotas permitidas
    where.id = { in: rotaIds }
  }

  const rotas = await prisma.rota.findMany({
    where,
    orderBy: { descricao: 'asc' },
    include: {
      _count: {
        select: {
          clientes: { where: { deletedAt: null } },
          usuarioRotas: true,
        },
      },
    },
  })

  return NextResponse.json(rotas)
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()
  if (session.user.tipoPermissao !== 'Administrador') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  try {
    const body = await req.json()

    // Validação com Zod
    const parsed = rotaCreateSchema.safeParse(body)
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors
      const firstError = Object.values(errors).flat()[0] || 'Dados inválidos'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const { descricao, status } = parsed.data

    // Verificar unicidade da descrição
    const rotaExistente = await prisma.rota.findFirst({
      where: { descricao: { equals: descricao, mode: 'insensitive' }, deletedAt: null },
    })
    if (rotaExistente) {
      return NextResponse.json(
        { error: 'Já existe uma rota com esta descrição' },
        { status: 409 },
      )
    }

    const rota = await prisma.rota.create({
      data: {
        descricao,
        status,
        deviceId: 'web',
        version: 1,
      },
    })

    return NextResponse.json(rota, { status: 201 })
  } catch (err) {
    console.error('[POST /rotas]', err)
    return serverError()
  }
}
