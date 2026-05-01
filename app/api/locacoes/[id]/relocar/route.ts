// POST /api/locacoes/[id]/relocar
// Reloca um produto para outro cliente (finaliza locação atual e cria nova)
import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession, unauthorized, forbidden, validateBody, handleApiError } from '@/lib/api-helpers'
import { extractRequestInfo } from '@/lib/auditoria'
import { relocarSchema } from '@/lib/validations'
import { relocarProduto } from '@/lib/locacao-service'

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
    const data = validateBody(relocarSchema, body)

    const resultado = await relocarProduto(id, data, session.user.id, extractRequestInfo(req))

    return NextResponse.json({
      success: true,
      locacaoAntigaId: resultado.locacaoAntigaId,
      locacaoNovaId: resultado.locacaoNovaId,
      message: `Produto relocado com sucesso`,
    })
  } catch (err) {
    return handleApiError(err)
  }
}
