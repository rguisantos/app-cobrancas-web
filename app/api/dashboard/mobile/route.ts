// GET /api/dashboard/mobile — Dados do dashboard para o app mobile
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extrairToken, verificarToken } from '@/lib/jwt'

export async function GET(req: NextRequest) {
  const token = extrairToken(req.headers.get('Authorization'))
  if (!token || !verificarToken(token)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const payload = verificarToken(token)
    
    // Buscar usuário
    const usuario = await prisma.usuario.findUnique({
      where: { id: payload?.sub },
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Data atual
    const hoje = new Date()
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

    // Métricas em paralelo
    const [
      totalClientes,
      totalProdutos,
      produtosLocados,
      cobrancasHoje,
      receitaHoje,
      receitaMes,
      cobrancasPendentes,
      saldoDevedorTotal,
    ] = await Promise.all([
      // Total de clientes ativos
      prisma.cliente.count({
        where: { status: 'Ativo', deletedAt: null },
      }),
      // Total de produtos ativos
      prisma.produto.count({
        where: { statusProduto: 'Ativo', deletedAt: null },
      }),
      // Produtos locados (com locação ativa)
      prisma.locacao.count({
        where: { status: 'Ativa', deletedAt: null },
      }),
      // Cobranças do dia
      prisma.cobranca.count({
        where: {
          createdAt: { gte: inicioHoje },
          deletedAt: null,
        },
      }),
      // Receita do dia
      prisma.cobranca.aggregate({
        where: {
          createdAt: { gte: inicioHoje },
          deletedAt: null,
        },
        _sum: { valorRecebido: true },
      }),
      // Receita do mês
      prisma.cobranca.aggregate({
        where: {
          createdAt: { gte: inicioMes },
          deletedAt: null,
        },
        _sum: { valorRecebido: true },
      }),
      // Cobranças pendentes
      prisma.cobranca.count({
        where: {
          status: { in: ['Pendente', 'Parcial', 'Atrasado'] },
          deletedAt: null,
        },
      }),
      // Saldo devedor total
      prisma.cobranca.aggregate({
        where: {
          saldoDevedorGerado: { gt: 0 },
          deletedAt: null,
        },
        _sum: { saldoDevedorGerado: true },
      }),
    ])

    // Saudação baseada na hora
    const hora = hoje.getHours()
    let saudacao = 'Boa noite'
    if (hora < 12) saudacao = 'Bom dia'
    else if (hora < 18) saudacao = 'Boa tarde'

    return NextResponse.json({
      usuarioNome: usuario.nome,
      usuarioTipo: usuario.tipoPermissao,
      saudacao,
      metricas: {
        totalClientes,
        totalProdutos,
        produtosLocados,
        produtosEstoque: totalProdutos - produtosLocados,
        cobrancasPendentes,
        totalRecebidoHoje: receitaHoje._sum.valorRecebido || 0,
        totalRecebidoMes: receitaMes._sum.valorRecebido || 0,
        saldoDevedor: saldoDevedorTotal._sum.saldoDevedorGerado || 0,
        cobrancasHoje,
      },
      dataAtualizacao: hoje.toISOString(),
    })
  } catch (error) {
    console.error('[dashboard/mobile]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
