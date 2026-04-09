// GET/PUT/DELETE /api/clientes/[id]
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, notFound, serverError, forbidden } from '@/lib/api-helpers'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const cliente = await prisma.cliente.findFirst({
    where: { id, deletedAt: null },
    include: {
      rota: true,
      locacoes: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
      cobrancas: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 10 },
    },
  })

  if (!cliente) return notFound('Cliente não encontrado')
  return NextResponse.json(cliente)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()

  try {
    const body = await req.json()
    const allowed = ['tipoPessoa', 'identificador', 'nomeExibicao', 'nomeCompleto', 'razaoSocial', 'nomeFantasia', 'cpf', 'cnpj', 'rg', 'inscricaoEstadual', 'email', 'telefonePrincipal', 'contatos', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estado', 'rotaId', 'rotaNome', 'status', 'observacao', 'dataCadastro', 'dataUltimaAlteracao']
    const data: Record<string, any> = {}
    for (const key of allowed) {
      if (key in body) data[key] = body[key]
    }

    const cliente = await prisma.cliente.update({
      where: { id },
      data: { ...data, version: { increment: 1 }, deviceId: 'web', needsSync: true },
    })

    return NextResponse.json(cliente)
  } catch (err) {
    console.error('[PUT /clientes/id]', err)
    return serverError()
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()

  try {
    await prisma.cliente.update({
      where: { id },
      data: { deletedAt: new Date(), needsSync: true, version: { increment: 1 } },
    })
    return NextResponse.json({ success: true })
  } catch {
    return serverError()
  }
}
