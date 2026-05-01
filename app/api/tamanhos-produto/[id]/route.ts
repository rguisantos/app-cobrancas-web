import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, notFound, forbidden, handleApiError } from '@/lib/api-helpers'
import { atributoProdutoUpdateSchema } from '@/lib/validations'
import { registrarAuditoria, extractRequestInfo } from '@/lib/auditoria'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()

  try {
    const item = await prisma.tamanhoProduto.findFirst({
      where: { id, deletedAt: null },
    })
    if (!item) return notFound('Tamanho de produto não encontrado')
    return NextResponse.json(item)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()
  if (session.user.tipoPermissao !== 'Administrador') return forbidden()

  try {
    const existing = await prisma.tamanhoProduto.findFirst({ where: { id, deletedAt: null } })
    if (!existing) return notFound('Tamanho de produto não encontrado')

    const body = await req.json()
    const data = atributoProdutoUpdateSchema.parse(body)

    const item = await prisma.tamanhoProduto.update({
      where: { id },
      data: {
        nome: data.nome,
        version: { increment: 1 },
        deviceId: 'web',
        needsSync: true,
      },
    })

    const campos: Record<string, any> = {}
    if (data.nome !== existing.nome) campos.nome = { de: existing.nome, para: data.nome }

    registrarAuditoria({
      acao: 'editar_tamanho_produto',
      entidade: 'tamanhoProduto',
      entidadeId: id,
      entidadeNome: existing.nome,
      detalhes: { nome: existing.nome, campos },
      ...extractRequestInfo(req),
    }).catch(() => {})

    return NextResponse.json(item)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()
  if (session.user.tipoPermissao !== 'Administrador') return forbidden()

  try {
    const existing = await prisma.tamanhoProduto.findFirst({ where: { id, deletedAt: null } })
    if (!existing) return notFound('Tamanho de produto não encontrado')

    await prisma.tamanhoProduto.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        needsSync: true,
        version: { increment: 1 },
      },
    })

    registrarAuditoria({
      acao: 'excluir_tamanho_produto',
      entidade: 'tamanhoProduto',
      entidadeId: id,
      entidadeNome: existing.nome,
      detalhes: { nome: existing.nome, softDelete: true },
      ...extractRequestInfo(_),
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (err) {
    return handleApiError(err)
  }
}
