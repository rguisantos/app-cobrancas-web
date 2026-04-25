// GET /api/busca-global — Busca global em múltiplas entidades
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, badRequest } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()

  if (!q || q.length < 2) {
    return badRequest('Mínimo de 2 caracteres para busca')
  }

  const term = q

  try {
    const [clientes, produtos, locacoes, cobrancas] = await Promise.all([
      // Clientes: busca por nomeExibicao, cpf, cnpj
      prisma.cliente.findMany({
        where: {
          deletedAt: null,
          OR: [
            { nomeExibicao: { contains: term, mode: 'insensitive' } },
            { cpf: { contains: term } },
            { cnpj: { contains: term } },
          ],
        },
        select: {
          id: true,
          nomeExibicao: true,
          tipoPessoa: true,
          cpf: true,
          cnpj: true,
          status: true,
        },
        take: 5,
        orderBy: { nomeExibicao: 'asc' },
      }),

      // Produtos: busca por identificador, tipoNome
      prisma.produto.findMany({
        where: {
          deletedAt: null,
          OR: [
            { identificador: { contains: term, mode: 'insensitive' } },
            { tipoNome: { contains: term, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          identificador: true,
          tipoNome: true,
          descricaoNome: true,
          tamanhoNome: true,
          statusProduto: true,
        },
        take: 5,
        orderBy: { identificador: 'asc' },
      }),

      // Locações: busca por produtoIdentificador (status Ativa)
      prisma.locacao.findMany({
        where: {
          deletedAt: null,
          status: 'Ativa',
          produtoIdentificador: { contains: term, mode: 'insensitive' },
        },
        select: {
          id: true,
          produtoIdentificador: true,
          clienteNome: true,
          produtoTipo: true,
          status: true,
        },
        take: 5,
        orderBy: { produtoIdentificador: 'asc' },
      }),

      // Cobranças: busca por clienteNome
      prisma.cobranca.findMany({
        where: {
          deletedAt: null,
          clienteNome: { contains: term, mode: 'insensitive' },
        },
        select: {
          id: true,
          clienteNome: true,
          produtoIdentificador: true,
          status: true,
          dataInicio: true,
          dataFim: true,
          totalClientePaga: true,
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
    ])

    return NextResponse.json({
      clientes,
      produtos,
      locacoes,
      cobrancas,
    })
  } catch (error) {
    console.error('[GET /api/busca-global]', error)
    return NextResponse.json({ error: 'Erro na busca' }, { status: 500 })
  }
}
