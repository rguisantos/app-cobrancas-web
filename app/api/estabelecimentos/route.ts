import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, serverError, forbidden } from '@/lib/api-helpers'

// GET - Listar estabelecimentos
export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  try {
    const estabelecimentos = await prisma.estabelecimento.findMany({
      where: { deletedAt: null },
      orderBy: { nome: 'asc' },
      select: {
        id: true,
        nome: true,
        endereco: true,
        observacao: true,
        createdAt: true,
      }
    })

    return NextResponse.json(estabelecimentos)
  } catch (err) {
    console.error('Erro ao listar estabelecimentos:', err)
    return serverError()
  }
}

// POST - Criar estabelecimento
export async function POST(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()
  if (session.user.tipoPermissao !== 'Administrador') return forbidden()

  try {
    const body = await req.json()
    const nome = typeof body.nome === 'string' ? body.nome.trim() : ''
    if (!nome || nome.length < 2) {
      return NextResponse.json({ error: 'Nome deve ter pelo menos 2 caracteres' }, { status: 400 })
    }

    const item = await prisma.estabelecimento.create({
      data: {
        nome,
        endereco: typeof body.endereco === 'string' ? body.endereco.trim() || null : null,
        observacao: typeof body.observacao === 'string' ? body.observacao.trim() || null : null,
        deviceId: 'web',
        version: 1,
      }
    })
    return NextResponse.json(item, { status: 201 })
  } catch (err) {
    console.error('[POST /estabelecimentos]', err)
    return serverError()
  }
}
