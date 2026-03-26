// GET /api/relatorios/produtos — Relatório de produtos
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extrairToken, verificarToken } from '@/lib/jwt'

export async function GET(req: NextRequest) {
  const token = extrairToken(req.headers.get('Authorization'))
  if (!token || !verificarToken(token)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    // Buscar produtos com suas locações ativas
    const produtos = await prisma.produto.findMany({
      where: {
        deletedAt: null,
        ...(status && { statusProduto: status }),
      },
      include: {
        locacoes: {
          where: { status: 'Ativa', deletedAt: null },
          include: {
            cliente: { select: { nomeExibicao: true, rotaId: true } },
          },
        },
      },
      orderBy: { identificador: 'asc' },
    })

    // Agrupar por status
    const porStatus = {
      Ativo: 0,
      Manutenção: 0,
      Inativo: 0,
    }

    produtos.forEach((p) => {
      if (p.statusProduto in porStatus) {
        porStatus[p.statusProduto as keyof typeof porStatus]++
      }
    })

    // Produtos locados vs estoque
    const locados = produtos.filter((p) => p.locacoes.length > 0).length
    const emEstoque = produtos.length - locados

    return NextResponse.json({
      total: produtos.length,
      porStatus,
      locados,
      emEstoque,
      produtos,
    })
  } catch (error) {
    console.error('[relatorios/produtos]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
