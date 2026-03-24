import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, serverError } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const { searchParams } = new URL(req.url)
  const statusProduto = searchParams.get('status')
  const busca = searchParams.get('busca')
  const disponiveis = searchParams.get('disponiveis') // Filtrar apenas disponíveis
  const page  = Number(searchParams.get('page') || 1)
  const limit = Number(searchParams.get('limit') || 20)

  const where: any = { deletedAt: null }
  if (statusProduto) where.statusProduto = statusProduto
  if (busca) {
    where.OR = [
      { identificador: { contains: busca, mode: 'insensitive' } },
      { tipoNome:      { contains: busca, mode: 'insensitive' } },
      { numeroRelogio: { contains: busca } },
    ]
  }

  // Se filtrar por disponíveis, buscar produtos que NÃO têm locação ativa
  if (disponiveis === 'true') {
    // Buscar IDs de produtos com locação ativa
    const locacoesAtivas = await prisma.locacao.findMany({
      where: { status: 'Ativa', deletedAt: null },
      select: { produtoId: true }
    })
    const produtosLocados = locacoesAtivas.map(l => l.produtoId)
    
    // Filtrar produtos que não estão locados E estão ativos
    where.statusProduto = 'Ativo'
    where.NOT = { id: { in: produtosLocados } }
  }

  const [produtos, total] = await Promise.all([
    prisma.produto.findMany({ where, orderBy: { identificador: 'asc' }, skip: (page-1)*limit, take: limit }),
    prisma.produto.count({ where }),
  ])

  return NextResponse.json({ data: produtos, total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  try {
    const body = await req.json()
    const { id, ...rest } = body
    const produto = await prisma.produto.create({
      data: { ...(id ? { id } : {}), ...rest, syncStatus: 'synced', needsSync: false, deviceId: 'web', version: 1 },
    })
    return NextResponse.json(produto, { status: 201 })
  } catch (err) {
    console.error('[POST /produtos]', err)
    return serverError()
  }
}
