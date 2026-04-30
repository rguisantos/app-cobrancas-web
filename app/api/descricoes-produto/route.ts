import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, forbidden, handleApiError } from '@/lib/api-helpers'
import { atributoProdutoCreateSchema } from '@/lib/validations'
import { registrarAuditoria, extractRequestInfo } from '@/lib/auditoria'

// Helper: aceita NextAuth session (web) OU JWT Bearer (mobile)
async function getAuthenticatedSessionOrJWT(req: NextRequest) {
  const session = await getAuthSession()
  if (session) return { session, isAdmin: session.user.tipoPermissao === 'Administrador' }

  try {
    const { extrairToken, verificarToken } = await import('@/lib/jwt')
    const token = extrairToken(req.headers.get('Authorization'))
    if (token && verificarToken(token)) {
      return { session: null, isAdmin: false }
    }
  } catch {
    // JWT import falhou, ignorar
  }

  return null
}

export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedSessionOrJWT(req)
  if (!auth) return unauthorized()

  try {
    const itens = await prisma.descricaoProduto.findMany({
      where: { deletedAt: null },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, createdAt: true }
    })
    return NextResponse.json(itens)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedSessionOrJWT(req)
  if (!auth) return unauthorized()
  if (!auth.isAdmin) {
    return forbidden('Apenas administradores podem criar atributos')
  }

  try {
    const body = await req.json()
    const data = atributoProdutoCreateSchema.parse(body)

    const item = await prisma.descricaoProduto.create({
      data: { nome: data.nome, deviceId: 'web', version: 1 }
    })

    registrarAuditoria({
      acao: 'criar_descricao_produto',
      entidade: 'descricaoProduto',
      entidadeId: item.id,
      detalhes: { nome: data.nome },
      ...extractRequestInfo(req),
    }).catch(() => {})

    return NextResponse.json(item, { status: 201 })
  } catch (err) {
    return handleApiError(err)
  }
}
