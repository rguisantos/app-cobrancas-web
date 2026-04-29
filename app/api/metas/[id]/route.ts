import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, forbidden, notFound, handleApiError } from '@/lib/api-helpers'
import { metaUpdateSchema } from '@/lib/validations'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()

  // Apenas admin pode editar metas
  if (session.user.tipoPermissao !== 'Administrador') {
    return forbidden('Apenas administradores podem editar metas')
  }

  try {
    const existing = await prisma.meta.findFirst({ where: { id } })
    if (!existing) return notFound('Meta não encontrada')

    const body = await request.json()
    const data = metaUpdateSchema.parse(body)

    const meta = await prisma.meta.update({
      where: { id },
      data: {
        ...(data.nome !== undefined && { nome: data.nome }),
        ...(data.tipo !== undefined && { tipo: data.tipo }),
        ...(data.valorMeta !== undefined && { valorMeta: data.valorMeta }),
        ...(data.dataInicio !== undefined && { dataInicio: data.dataInicio }),
        ...(data.dataFim !== undefined && { dataFim: data.dataFim }),
        ...(data.rotaId !== undefined && { rotaId: data.rotaId }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.criadoPor !== undefined && { criadoPor: data.criadoPor }),
      },
    })

    return NextResponse.json(meta)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()

  // Apenas admin pode excluir metas
  if (session.user.tipoPermissao !== 'Administrador') {
    return forbidden('Apenas administradores podem excluir metas')
  }

  try {
    const existing = await prisma.meta.findFirst({ where: { id } })
    if (!existing) return notFound('Meta não encontrada')

    // Excluir permanentemente (Meta não tem soft delete no schema atual)
    await prisma.meta.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (err) {
    return handleApiError(err)
  }
}
