// POST /api/locacoes/[id]/relocar
// Reloca um produto para outro cliente (finaliza locação atual e cria nova)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, notFound, serverError, forbidden } from '@/lib/api-helpers'
import { z } from 'zod'

const relocarSchema = z.object({
  novoClienteId:       z.string(),
  novoClienteNome:     z.string(),
  formaPagamento:      z.enum(['Periodo', 'PercentualPagar', 'PercentualReceber']),
  numeroRelogio:       z.string(),
  precoFicha:          z.number().positive(),
  percentualEmpresa:   z.number().min(0).max(100),
  percentualCliente:   z.number().min(0).max(100),
  periodicidade:       z.enum(['Mensal', 'Semanal', 'Quinzenal', 'Diária']).optional(),
  valorFixo:           z.number().positive().optional(),
  motivoRelocacao:     z.string().min(3),
  observacao:          z.string().optional(),
  trocaPano:           z.boolean().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()

  // Verificar permissão de relocação
  if (session.user.tipoPermissao === 'AcessoControlado' &&
      !session.user.permissoesWeb?.locacaoRelocacaoEstoque) {
    return forbidden('Sem permissão para realizar relocações')
  }

  try {
    const body = await req.json()
    const data = relocarSchema.parse(body)
    
    // Buscar locação atual
    const locacaoAtual = await prisma.locacao.findFirst({
      where: { id, deletedAt: null, status: 'Ativa' },
      include: { produto: true }
    })
    
    if (!locacaoAtual) {
      return notFound('Locação ativa não encontrada')
    }
    
    // Buscar novo cliente
    const novoCliente = await prisma.cliente.findFirst({
      where: { id: data.novoClienteId, deletedAt: null }
    })
    
    if (!novoCliente) {
      return notFound('Novo cliente não encontrado')
    }
    
    const now = new Date()
    
    // Executar em transação
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Finalizar locação atual
      await tx.locacao.update({
        where: { id },
        data: {
          status: 'Finalizada',
          dataFim: now.toISOString(),
          observacao: `Relocação: ${data.motivoRelocacao}`,
          version: { increment: 1 },
          deviceId: 'web',
          needsSync: true,
        }
      })
      
      // 2. Criar nova locação
      const novaLocacao = await tx.locacao.create({
        data: {
          clienteId:            data.novoClienteId,
          clienteNome:          data.novoClienteNome,
          produtoId:            locacaoAtual.produtoId,
          produtoIdentificador: locacaoAtual.produtoIdentificador,
          produtoTipo:          locacaoAtual.produtoTipo,
          dataLocacao:          now.toISOString(),
          formaPagamento:       data.formaPagamento,
          numeroRelogio:        data.numeroRelogio,
          precoFicha:           data.precoFicha,
          percentualEmpresa:    data.percentualEmpresa,
          percentualCliente:    data.percentualCliente,
          periodicidade:        data.periodicidade,
          valorFixo:            data.valorFixo,
          observacao:           data.observacao,
          status:               'Ativa',
          trocaPano:            data.trocaPano || false,
          dataUltimaManutencao: data.trocaPano ? now.toISOString() : undefined,
          deviceId:             'web',
          version:              1,
          needsSync:            true,
        }
      })
      
      // 3. Registrar no change log
      await tx.changeLog.create({
        data: {
          entityId:   id,
          entityType: 'locacao',
          operation:  'update',
          changes:    { acao: 'relocacao', novoClienteId: data.novoClienteId, motivo: data.motivoRelocacao },
          deviceId:   'web',
          synced:     false,
        }
      })
      
      await tx.changeLog.create({
        data: {
          entityId:   novaLocacao.id,
          entityType: 'locacao',
          operation:  'create',
          changes:    { ...novaLocacao },
          deviceId:   'web',
          synced:     false,
        }
      })
      
      // 4. Registrar manutenção se troca de pano
      if (data.trocaPano) {
        await tx.manutencao.create({
          data: {
            produtoId:            locacaoAtual.produtoId,
            produtoIdentificador: locacaoAtual.produtoIdentificador,
            produtoTipo:          locacaoAtual.produtoTipo,
            clienteId:            data.novoClienteId,
            clienteNome:          data.novoClienteNome,
            locacaoId:            novaLocacao.id,
            tipo:                 'trocaPano',
            descricao:            'Troca de pano na relocação',
            data:                 now.toISOString(),
            registradoPor:        session.user.id,
          }
        })
      }
      
      return novaLocacao
    })
    
    return NextResponse.json({ 
      success: true, 
      locacaoId: resultado.id,
      message: `Produto relocado para ${data.novoClienteNome}` 
    })
    
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: err.errors }, { status: 400 })
    }
    console.error('[POST /locacoes/:id/relocar]', err)
    return serverError()
  }
}
