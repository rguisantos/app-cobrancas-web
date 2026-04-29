import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, notFound, handleApiError } from '@/lib/api-helpers'

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()

  try {
    const historico = await prisma.historicoRelogio.findFirst({
      where: { id },
      include: {
        produto: {
          select: {
            id: true,
            identificador: true,
            tipoNome: true,
            descricaoNome: true,
            tamanhoNome: true,
            numeroRelogio: true,
            statusProduto: true,
          },
        },
      },
    })

    if (!historico) return notFound('Registro não encontrado')

    return NextResponse.json(historico)
  } catch (err) {
    return handleApiError(err)
  }
}
