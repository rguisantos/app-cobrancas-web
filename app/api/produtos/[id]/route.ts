import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, notFound, serverError, forbidden } from '@/lib/api-helpers'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()
  const produto = await prisma.produto.findFirst({
    where: { id, deletedAt: null },
    include: { locacoes: { where: { status: 'Ativa' }, take: 1 }, historicoRelogio: { orderBy: { dataAlteracao: 'desc' }, take: 5 } },
  })
  if (!produto) return notFound('Produto não encontrado')
  return NextResponse.json(produto)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()

  if (session.user.tipoPermissao === 'AcessoControlado' && !session.user.permissoesWeb?.todosCadastros) {
    return forbidden('Sem permissão para esta operação')
  }

  try {
    const body = await req.json()
    const allowed = ['identificador', 'numeroRelogio', 'tipoId', 'tipoNome', 'descricaoId', 'descricaoNome', 'tamanhoId', 'tamanhoNome', 'codigoCH', 'codigoABLF', 'conservacao', 'statusProduto', 'dataFabricacao', 'dataUltimaManutencao', 'relatorioUltimaManutencao', 'dataAvaliacao', 'aprovacao', 'estabelecimento', 'observacao', 'dataCadastro', 'dataUltimaAlteracao']
    const data: Record<string, any> = {}
    for (const key of allowed) {
      if (key in body) data[key] = body[key]
    }
    const produto = await prisma.produto.update({ where: { id }, data: { ...data, version: { increment: 1 }, deviceId: 'web', needsSync: true } })
    return NextResponse.json(produto)
  } catch (err) { console.error(err); return serverError() }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()
  try {
    await prisma.produto.update({ where: { id }, data: { deletedAt: new Date(), needsSync: true, version: { increment: 1 } } })
    return NextResponse.json({ success: true })
  } catch { return serverError() }
}
