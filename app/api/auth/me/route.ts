// GET /api/auth/me — Retorna dados do usuário autenticado
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extrairToken, verificarToken } from '@/lib/jwt'

export async function GET(req: NextRequest) {
  const token = extrairToken(req.headers.get('Authorization'))
  
  if (!token) {
    return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 })
  }

  const payload = verificarToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 })
  }

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.sub },
      include: { rotasPermitidas: { include: { rota: true } } },
    })

    if (!usuario || usuario.status !== 'Ativo' || usuario.bloqueado) {
      return NextResponse.json({ error: 'Usuário não encontrado ou inativo' }, { status: 404 })
    }

    const rotasPermitidas = usuario.rotasPermitidas.map((ur) => ur.rotaId)

    return NextResponse.json({
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      role: usuario.tipoPermissao,
      tipoPermissao: usuario.tipoPermissao,
      permissoes: {
        web: usuario.permissoesWeb,
        mobile: usuario.permissoesMobile,
      },
      rotasPermitidas,
      status: usuario.status,
    })
  } catch (error) {
    console.error('[auth/me]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
