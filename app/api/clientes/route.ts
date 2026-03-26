// GET /api/clientes  — listar
// POST /api/clientes — criar
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, serverError } from '@/lib/api-helpers'
import { z } from 'zod'

const createSchema = z.object({
  id:               z.string().optional(),
  tipoPessoa:       z.enum(['Fisica', 'Juridica']),
  identificador:    z.string(),
  nomeExibicao:     z.string(),
  nomeCompleto:     z.string().optional(),
  razaoSocial:      z.string().optional(),
  nomeFantasia:     z.string().optional(),
  cpf:              z.string().optional(),
  cnpj:             z.string().optional(),
  email:            z.string().optional(),
  telefonePrincipal:z.string(),
  contatos:         z.array(z.any()).optional(),
  cep:              z.string(),
  logradouro:       z.string(),
  numero:           z.string(),
  complemento:      z.string().optional(),
  bairro:           z.string(),
  cidade:           z.string(),
  estado:           z.string(),
  rotaId:           z.string(),
  status:           z.string().default('Ativo'),
  observacao:       z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const { searchParams } = new URL(req.url)
  const rotaId  = searchParams.get('rotaId')
  const status  = searchParams.get('status')
  const busca   = searchParams.get('busca')
  const page    = Number(searchParams.get('page') || 1)
  const limit   = Number(searchParams.get('limit') || 20)

  const where: any = { deletedAt: null }
  if (rotaId) where.rotaId = rotaId
  if (status) where.status = status
  if (busca) {
    where.OR = [
      { nomeExibicao:     { contains: busca, mode: 'insensitive' } },
      { identificador:    { contains: busca, mode: 'insensitive' } },
      { telefonePrincipal:{ contains: busca } },
    ]
  }

  const [clientes, total] = await Promise.all([
    prisma.cliente.findMany({
      where,
      include: { rota: { select: { descricao: true } } },
      orderBy: { nomeExibicao: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.cliente.count({ where }),
  ])

  return NextResponse.json({ data: clientes, total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  try {
    const body  = await req.json()
    const data  = createSchema.parse(body)
    const { id, ...rest } = data

    const cliente = await prisma.cliente.create({
      data: {
        ...(id ? { id } : {}),
        ...rest,
        contatos:  rest.contatos ? rest.contatos : undefined,
        syncStatus:'synced',
        needsSync: false,
        deviceId:  'web',
        version:   1,
      },
    })

    return NextResponse.json(cliente, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Dados inválidos', details: err.errors }, { status: 400 })
    console.error('[POST /clientes]', err)
    return serverError()
  }
}
