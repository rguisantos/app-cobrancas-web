import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, forbidden, serverError, validateBody, handleApiError } from '@/lib/api-helpers'
import { estabelecimentoCreateSchema } from '@/lib/validations'
import { registrarAuditoria, extractRequestInfo } from '@/lib/auditoria'

// GET - Listar estabelecimentos
export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  try {
    const { searchParams } = new URL(req.url)
    const page = Number(searchParams.get('page') || 1)
    const limit = Number(searchParams.get('limit') || 50)

    const where = { deletedAt: null }

    const [estabelecimentos, total] = await Promise.all([
      prisma.estabelecimento.findMany({
        where,
        orderBy: { nome: 'asc' },
        select: {
          id: true,
          nome: true,
          endereco: true,
          observacao: true,
          createdAt: true,
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.estabelecimento.count({ where }),
    ])

    return NextResponse.json({ data: estabelecimentos, total, page, limit })
  } catch (err) {
    return handleApiError(err)
  }
}

// POST - Criar estabelecimento
export async function POST(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()
  if (session.user.tipoPermissao !== 'Administrador') return forbidden()

  try {
    const body = await req.json()
    const data = validateBody(estabelecimentoCreateSchema, body)

    const item = await prisma.estabelecimento.create({
      data: {
        nome: data.nome,
        endereco: data.endereco || null,
        observacao: data.observacao || null,
        deviceId: 'web',
        version: 1,
      }
    })

    registrarAuditoria({
      acao: 'criar_estabelecimento',
      entidade: 'estabelecimento',
      entidadeId: item.id,
      entidadeNome: data.nome,
      detalhes: { nome: data.nome },
      ...extractRequestInfo(req),
    }).catch(() => {})

    return NextResponse.json(item, { status: 201 })
  } catch (err) {
    return handleApiError(err)
  }
}
