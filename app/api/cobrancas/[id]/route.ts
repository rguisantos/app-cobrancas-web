import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, notFound, serverError, forbidden } from '@/lib/api-helpers'
import { registrarAuditoria, extractRequestInfo } from '@/lib/auditoria'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()
  const cobranca = await prisma.cobranca.findFirst({ 
    where: { id, deletedAt: null }, 
    include: { 
      cliente: true, 
      locacao: {
        include: {
          cobrancas: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true }
          }
        }
      }
    } 
  })
  if (!cobranca) return notFound()
  
  // Buscar saldo anterior da cobrança anterior (para recibos client-side)
  const cobrancaAnterior = await prisma.cobranca.findFirst({
    where: {
      locacaoId: cobranca.locacaoId,
      deletedAt: null,
      id: { not: id },
      createdAt: { lt: cobranca.createdAt }
    },
    orderBy: { createdAt: 'desc' },
    select: { saldoDevedorGerado: true }
  })

  return NextResponse.json({
    ...cobranca,
    saldoAnterior: cobrancaAnterior?.saldoDevedorGerado ?? 0,
  })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()
  
  // Verificar permissão
  if (!session.user.permissoesWeb?.todosCadastros) {
    return forbidden('Sem permissão para editar cobranças')
  }

  try {
    const cobrancaExistente = await prisma.cobranca.findFirst({
      where: { id, deletedAt: null },
      include: {
        locacao: {
          select: {
            id: true,
            status: true,
            cobrancas: {
              where: { deletedAt: null },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { id: true }
            }
          }
        }
      }
    })

    if (!cobrancaExistente) return notFound('Cobrança não encontrada')

    // Verificar se é a última cobrança da locação ativa
    const isUltimaCobranca = 
      cobrancaExistente.locacao?.cobrancas?.[0]?.id === id && 
      cobrancaExistente.locacao?.status === 'Ativa'

    if (!isUltimaCobranca) {
      return forbidden('Apenas a última cobrança de uma locação ativa pode ser editada')
    }

    const body = await req.json()
    
    // Campos que podem ser editados
    const dadosAtualizacao: any = {
      updatedAt: new Date(),
      needsSync: true,
      syncStatus: 'pending',
    }

    // Relógio e fichas (admin pode editar)
    if (body.relogioAnterior !== undefined) {
      dadosAtualizacao.relogioAnterior = Number(body.relogioAnterior)
    }
    if (body.relogioAtual !== undefined) {
      dadosAtualizacao.relogioAtual = Number(body.relogioAtual)
    }
    if (body.fichasRodadas !== undefined) {
      dadosAtualizacao.fichasRodadas = Number(body.fichasRodadas)
    }
    if (body.totalBruto !== undefined) {
      dadosAtualizacao.totalBruto = Number(body.totalBruto)
    }

    // Descontos
    if (body.descontoPartidasQtd !== undefined) {
      dadosAtualizacao.descontoPartidasQtd = body.descontoPartidasQtd
    }
    if (body.descontoPartidasValor !== undefined) {
      dadosAtualizacao.descontoPartidasValor = body.descontoPartidasValor
    }
    if (body.descontoDinheiro !== undefined) {
      dadosAtualizacao.descontoDinheiro = body.descontoDinheiro
    }

    // Cálculos
    if (body.subtotalAposDescontos !== undefined) {
      dadosAtualizacao.subtotalAposDescontos = body.subtotalAposDescontos
    }
    if (body.valorPercentual !== undefined) {
      dadosAtualizacao.valorPercentual = body.valorPercentual
    }
    if (body.totalClientePaga !== undefined) {
      dadosAtualizacao.totalClientePaga = body.totalClientePaga
    }

    // Pagamento
    if (body.valorRecebido !== undefined) {
      dadosAtualizacao.valorRecebido = body.valorRecebido
    }
    if (body.saldoDevedorGerado !== undefined) {
      // Garantir que saldo nunca seja negativo no banco
      dadosAtualizacao.saldoDevedorGerado = Math.max(0, Number(body.saldoDevedorGerado) || 0)
    }
    if (body.status !== undefined) {
      dadosAtualizacao.status = body.status
    }
    if (body.dataPagamento !== undefined) {
      dadosAtualizacao.dataPagamento = body.dataPagamento
    }

    // Observação
    if (body.observacao !== undefined) {
      dadosAtualizacao.observacao = body.observacao
    }

    const cobrancaAtualizada = await prisma.cobranca.update({
      where: { id },
      data: dadosAtualizacao,
    })

    // Auditoria: edição de cobrança
    registrarAuditoria({
      acao: 'editar_cobranca',
      entidade: 'cobranca',
      entidadeId: id,
      detalhes: { campos: Object.keys(body).filter((k: string) => !['id', 'version', 'needsSync', 'syncStatus', 'lastSyncedAt', 'deviceId'].includes(k)) },
      ...extractRequestInfo(req),
    }).catch(() => {})

    return NextResponse.json(cobrancaAtualizada)
  } catch (err) {
    console.error(err)
    return serverError()
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()
  
  // Verificar permissão
  if (!session.user.permissoesWeb?.todosCadastros) {
    return forbidden('Sem permissão para excluir cobranças')
  }

  try {
    const cobrancaExistente = await prisma.cobranca.findFirst({
      where: { id, deletedAt: null },
      include: {
        locacao: {
          select: {
            id: true,
            status: true,
            cobrancas: {
              where: { deletedAt: null },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { id: true }
            }
          }
        }
      }
    })

    if (!cobrancaExistente) return notFound('Cobrança não encontrada')

    // Verificar se é a última cobrança da locação ativa
    const isUltimaCobranca = 
      cobrancaExistente.locacao?.cobrancas?.[0]?.id === id && 
      cobrancaExistente.locacao?.status === 'Ativa'

    if (!isUltimaCobranca) {
      return forbidden('Apenas a última cobrança de uma locação ativa pode ser excluída')
    }

    // Soft delete
    const cobrancaExcluida = await prisma.cobranca.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date(),
        needsSync: true,
        syncStatus: 'pending',
      },
    })

    // Auditoria: exclusão de cobrança
    registrarAuditoria({
      acao: 'excluir_cobranca',
      entidade: 'cobranca',
      entidadeId: id,
      detalhes: { clienteNome: cobrancaExistente.clienteNome, softDelete: true },
      ...extractRequestInfo(_),
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return serverError()
  }
}
