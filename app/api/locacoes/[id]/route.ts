import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, notFound, serverError, forbidden } from '@/lib/api-helpers'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()
  const locacao = await prisma.locacao.findFirst({ where: { id, deletedAt: null }, include: { cliente: true, produto: true, cobrancas: { orderBy: { createdAt: 'desc' }, take: 10 } } })
  if (!locacao) return notFound('Locação não encontrada')
  return NextResponse.json(locacao)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()

  if (session.user.tipoPermissao === 'AcessoControlado' &&
      !session.user.permissoesWeb?.locacaoRelocacaoEstoque) {
    return forbidden('Sem permissão para editar locações')
  }

  try {
    const body = await req.json()
    const allowed = ['status','dataFim','observacao','formaPagamento','precoFicha',
                     'percentualEmpresa','percentualCliente','periodicidade','valorFixo',
                     'dataPrimeiraCobranca','ultimaLeituraRelogio','dataUltimaCobranca',
                     'trocaPano','dataUltimaManutencao','numeroRelogio']
    const data: Record<string, any> = {}
    for (const key of allowed) {
      if (key in body) data[key] = body[key]
    }
    return NextResponse.json(await prisma.locacao.update({
      where: { id },
      data: { ...data, version: { increment: 1 }, deviceId: 'web', needsSync: true },
    }))
  } catch (err) { console.error(err); return serverError() }
}
