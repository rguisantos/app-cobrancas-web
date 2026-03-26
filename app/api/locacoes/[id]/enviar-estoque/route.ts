// POST /api/locacoes/[id]/enviar-estoque
// Envia produto para estoque (finaliza locação e atualiza produto)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, notFound, serverError } from '@/lib/api-helpers'
import { z } from 'zod'

const enviarEstoqueSchema = z.object({
  estabelecimento: z.string().min(1, 'Selecione o estabelecimento'),
  motivo:          z.string().min(3, 'Informe o motivo'),
  observacao:      z.string().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()
  
  try {
    const body = await req.json()
    const data = enviarEstoqueSchema.parse(body)
    
    // Buscar locação atual
    const locacaoAtual = await prisma.locacao.findFirst({
      where: { id, deletedAt: null, status: 'Ativa' },
      include: { produto: true }
    })
    
    if (!locacaoAtual) {
      return notFound('Locação ativa não encontrada')
    }
    
    const now = new Date()
    
    // Executar em transação
    await prisma.$transaction(async (tx) => {
      // 1. Finalizar locação
      await tx.locacao.update({
        where: { id },
        data: {
          status: 'Finalizada',
          dataFim: now.toISOString(),
          observacao: `Envio para ${data.estabelecimento}: ${data.motivo}`,
          version: { increment: 1 },
          deviceId: 'web',
          needsSync: true,
        }
      })
      
      // 2. Atualizar produto (definir estabelecimento e LIMPAR observacao)
      await tx.produto.update({
        where: { id: locacaoAtual.produtoId },
        data: {
          estabelecimento: data.estabelecimento,
          observacao: null, // Limpar observacao para evitar que apareça em futuras locações
          statusProduto: 'Ativo',
          version: { increment: 1 },
          deviceId: 'web',
          needsSync: true,
        }
      })
      
      // 3. Registrar no change log
      await tx.changeLog.create({
        data: {
          entityId:   id,
          entityType: 'locacao',
          operation:  'update',
          changes:    { acao: 'enviar_estoque', estabelecimento: data.estabelecimento, motivo: data.motivo },
          deviceId:   'web',
          synced:     false,
        }
      })
      
      await tx.changeLog.create({
        data: {
          entityId:   locacaoAtual.produtoId,
          entityType: 'produto',
          operation:  'update',
          changes:    { estabelecimento: data.estabelecimento },
          deviceId:   'web',
          synced:     false,
        }
      })
    })
    
    return NextResponse.json({ 
      success: true,
      message: `Produto enviado para ${data.estabelecimento}` 
    })
    
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: err.errors }, { status: 400 })
    }
    console.error('[POST /locacoes/:id/enviar-estoque]', err)
    return serverError()
  }
}
