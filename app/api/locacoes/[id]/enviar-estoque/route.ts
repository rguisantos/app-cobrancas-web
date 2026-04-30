// POST /api/locacoes/[id]/enviar-estoque
// Envia produto para estoque (finaliza locação e atualiza produto)
import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession, unauthorized, forbidden, validateBody, handleApiError } from '@/lib/api-helpers'
import { registrarAuditoria, extractRequestInfo } from '@/lib/auditoria'
import { enviarEstoqueSchema } from '@/lib/validations'
import { enviarParaEstoque } from '@/lib/locacao-service'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()

  // Verificar permissão de locação/estoque
  if (session.user.tipoPermissao === 'AcessoControlado' &&
      !session.user.permissoesWeb?.locacaoRelocacaoEstoque) {
    return forbidden('Sem permissão para enviar produtos ao estoque')
  }

  try {
    const body = await req.json()
    const data = validateBody(enviarEstoqueSchema, body)

    const resultado = await enviarParaEstoque(id, data, session.user.id)

    registrarAuditoria({
      acao: 'enviar_estoque',
      entidade: 'locacao',
      entidadeId: id,
      detalhes: { produtoIdentificador: resultado.produtoIdentificador, estabelecimento: resultado.estabelecimento },
      ...extractRequestInfo(req),
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      locacaoId: resultado.locacaoId,
      produtoId: resultado.produtoId,
      produtoIdentificador: resultado.produtoIdentificador,
      estabelecimento: resultado.estabelecimento,
      message: `Produto "${resultado.produtoIdentificador}" enviado para "${resultado.estabelecimento}"`,
    })
  } catch (err) {
    return handleApiError(err)
  }
}
