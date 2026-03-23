// POST /api/auth/change-password — Altera senha do usuário
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extrairToken, verificarToken } from '@/lib/jwt'
import { verificarSenha, hashSenha } from '@/lib/hash'
import { z } from 'zod'

const schema = z.object({
  senhaAtual: z.string().min(1),
  novaSenha: z.string().min(6),
})

export async function POST(req: NextRequest) {
  const token = extrairToken(req.headers.get('Authorization'))
  
  if (!token) {
    return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 })
  }

  const payload = verificarToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { senhaAtual, novaSenha } = schema.parse(body)

    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.sub },
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Verificar senha atual
    const senhaOk = await verificarSenha(senhaAtual, usuario.senha)
    if (!senhaOk) {
      return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 })
    }

    // Hash da nova senha
    const novaSenhaHash = await hashSenha(novaSenha)

    // Atualizar senha
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { senha: novaSenhaHash },
    })

    return NextResponse.json({ success: true, message: 'Senha alterada com sucesso' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
    }
    console.error('[auth/change-password]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
