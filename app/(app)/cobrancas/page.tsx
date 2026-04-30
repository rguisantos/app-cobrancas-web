import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { CobrancasClient } from './cobrancas-client'

export const metadata: Metadata = { title: 'Cobranças' }

export default async function CobrancasPage({
  searchParams,
}: { searchParams: Promise<{ status?: string; busca?: string; page?: string }> }) {
  const params = await searchParams
  const session = await getSession()
  const page = Number(params.page || 1)
  const limit = 20

  const where: any = { deletedAt: null }
  if (params.status) where.status = params.status
  if (params.busca) {
    where.OR = [
      { clienteNome: { contains: params.busca, mode: 'insensitive' } },
      { produtoIdentificador: { contains: params.busca } },
    ]
  }

  const [cobrancas, total, resumoRecebido] = await Promise.all([
    prisma.cobranca.findMany({
      where,
      include: { 
        cliente: { select: { nomeExibicao: true, id: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.cobranca.count({ where }),
    // Total recebido é correto somar todas cobranças (sem dupla contagem)
    prisma.cobranca.aggregate({
      where: { deletedAt: null },
      _sum: { valorRecebido: true },
    }),
  ])

  // Saldo devedor REAL: somar apenas a ÚLTIMA cobrança de cada locação
  // (o saldo da última já inclui saldos anteriores carregados)
  // Buscar TODAS as cobranças agrupadas por locação para calcular saldo global
  const todosSaldos = await prisma.cobranca.findMany({
    where: { deletedAt: null },
    select: { locacaoId: true, saldoDevedorGerado: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  // Para cada locação, apenas a primeira (mais recente) importa
  const saldoGlobalPorLocacao = new Map<string, number>()
  for (const s of todosSaldos) {
    if (!saldoGlobalPorLocacao.has(s.locacaoId)) {
      saldoGlobalPorLocacao.set(s.locacaoId, s.saldoDevedorGerado ?? 0)
    }
  }
  const totalSaldoDevedor = Array.from(saldoGlobalPorLocacao.values()).reduce((sum, val) => sum + val, 0)

  // Buscar dados auxiliares para as cobranças da página atual
  const locacaoIds = [...new Set(cobrancas.map(c => c.locacaoId))]

  // Saldo anterior + última cobrança por locação (mesma query)
  const saldoAnteriorMap = new Map<string, number>()
  const locacaoUltimaCobrancaId = new Map<string, string>()

  if (locacaoIds.length > 0) {
    const cobrancasPorLocacao = await prisma.cobranca.findMany({
      where: { locacaoId: { in: locacaoIds }, deletedAt: null },
      select: {
        id: true,
        locacaoId: true,
        saldoDevedorGerado: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Agrupar por locação (já ordenado desc)
    const porLocacao = new Map<string, typeof cobrancasPorLocacao>()
    for (const cb of cobrancasPorLocacao) {
      if (!porLocacao.has(cb.locacaoId)) porLocacao.set(cb.locacaoId, [])
      porLocacao.get(cb.locacaoId)!.push(cb)
    }

    // Última cobrança por locação (primeiro elemento de cada lista)
    for (const [locId, lista] of porLocacao) {
      if (lista.length > 0) {
        locacaoUltimaCobrancaId.set(locId, lista[0].id)
      }
    }

    // Saldo anterior = saldoDevedorGerado da cobrança imediatamente anterior
    for (const c of cobrancas) {
      const lista = porLocacao.get(c.locacaoId) || []
      const idx = lista.findIndex(cb => cb.id === c.id)
      // lista está em ordem desc, então idx+1 é a cobrança anterior (mais velha)
      if (idx >= 0 && idx < lista.length - 1) {
        saldoAnteriorMap.set(c.id, lista[idx + 1].saldoDevedorGerado ?? 0)
      } else {
        saldoAnteriorMap.set(c.id, 0)
      }
    }
  }

  // Verificar status das locações para permissão de edição
  const locacoesAtivas = locacaoIds.length > 0
    ? await prisma.locacao.findMany({
        where: { id: { in: locacaoIds }, status: 'Ativa', deletedAt: null },
        select: { id: true },
      })
    : []
  const locacoesAtivasSet = new Set(locacoesAtivas.map(l => l.id))

  const podeEditar = session?.user.permissoesWeb?.todosCadastros

  // Preparar dados para o cliente (garantir serialização JSON-safe)
  const cobrancasFormatadas = cobrancas.map(c => {
    const isUltima = locacaoUltimaCobrancaId.get(c.locacaoId) === c.id && locacoesAtivasSet.has(c.locacaoId)
    const saldoAnterior = saldoAnteriorMap.get(c.id) ?? 0
    return {
      id: c.id,
      clienteId: c.clienteId,
      clienteNome: c.cliente?.nomeExibicao ?? c.clienteNome,
      produtoIdentificador: c.produtoIdentificador,
      locacaoId: c.locacaoId,
      dataInicio: c.dataInicio,
      dataFim: c.dataFim,
      relogioAnterior: c.relogioAnterior,
      relogioAtual: c.relogioAtual,
      fichasRodadas: c.fichasRodadas,
      totalClientePaga: c.totalClientePaga,
      valorRecebido: c.valorRecebido,
      saldoDevedorGerado: c.saldoDevedorGerado,
      saldoAnterior,
      status: c.status,
      createdAt: c.createdAt?.toISOString?.() ?? String(c.createdAt),
      podeEditar: isUltima && podeEditar,
    }
  })

  return (
    <CobrancasClient
      cobrancas={cobrancasFormatadas}
      total={total}
      page={page}
      limit={limit}
      totalRecebido={Number(resumoRecebido._sum.valorRecebido ?? 0)}
      totalSaldoDevedor={totalSaldoDevedor}
      statusFilter={params.status}
      buscaFilter={params.busca}
    />
  )
}
