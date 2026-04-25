import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, serverError } from '@/lib/api-helpers'

// Aceita NextAuth session (web client) OU JWT Bearer (mobile)
async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const { getServerSession } = await import('next-auth')
  const { authOptions }      = await import('@/lib/auth')
  const session = await getServerSession(authOptions)
  if (session) return true
  const { extrairToken, verificarToken } = await import('@/lib/jwt')
  const token = extrairToken(req.headers.get('Authorization'))
  return !!(token && verificarToken(token))
}

async function isAdmin(req: NextRequest): Promise<boolean> {
  const { getServerSession } = await import('next-auth')
  const { authOptions }      = await import('@/lib/auth')
  const session = await getServerSession(authOptions)
  if (session) return session.user.tipoPermissao === 'Administrador'
  // Mobile: JWT não carrega tipoPermissao; atributos só criáveis por admin no web
  return false
}

export async function GET(req: NextRequest) {
  if (!await isAuthenticated(req)) return unauthorized()
  try {
    const itens = await prisma.tamanhoProduto.findMany({
      where: { deletedAt: null },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, createdAt: true }
    })
    return NextResponse.json(itens)
  } catch (err) {
    console.error('[GET /tamanhos-produto]', err)
    return serverError()
  }
}

export async function POST(req: NextRequest) {
  if (!await isAuthenticated(req)) return unauthorized()
  if (!await isAdmin(req)) {
    return NextResponse.json({ error: 'Apenas administradores podem criar atributos' }, { status: 403 })
  }
  try {
    const body = await req.json()
    const nome = typeof body.nome === 'string' ? body.nome.trim() : ''
    if (!nome || nome.length < 2) {
      return NextResponse.json({ error: 'Nome deve ter pelo menos 2 caracteres' }, { status: 400 })
    }
    const item = await prisma.tamanhoProduto.create({
      data: { nome, deviceId: 'web', version: 1 }
    })
    return NextResponse.json(item, { status: 201 })
  } catch (err) {
    console.error('[POST /tamanhos-produto]', err)
    return serverError()
  }
}
