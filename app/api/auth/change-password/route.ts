// POST /api/auth/change-password — Altera senha com política forte
// Suporta autenticação via JWT (mobile) e sessão NextAuth (web)
// Após alterar a senha, todas as sessões são revogadas para segurança
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extrairToken, verificarToken } from '@/lib/jwt'
import { verificarSenha, hashSenha } from '@/lib/hash'
import { getSession } from '@/lib/auth'
import { revogarTodasSessoes } from '@/lib/auth-core'
import { trocarSenhaSchema } from '@/lib/validations'

export async function POST(req: NextRequest) {
  let userId: string | null = null

  // 1. Tentar sessão NextAuth (web)
  const session = await getSession()
  if (session?.user?.id) {
    userId = session.user.id
  }

  // 2. Se não tem sessão, tentar JWT (mobile)
  if (!userId) {
    const token = extrairToken(req.headers.get('Authorization'))
    if (token) {
      const payload = verificarToken(token)
      if (payload?.sub) {
        userId = payload.sub
      }
    }
  }

  if (!userId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const validated = trocarSenhaSchema.parse(body)

    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Verificar senha atual
    const senhaOk = await verificarSenha(validated.senhaAtual, usuario.senha)
    if (!senhaOk) {
      return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 })
    }

    // Hash da nova senha
    const novaSenhaHash = await hashSenha(validated.novaSenha)

    // Atualizar senha
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { senha: novaSenhaHash },
    })

    // Revogar todas as sessões (garante que qualquer atacante com a senha antiga seja desconectado)
    await revogarTodasSessoes(usuario.id)

    return NextResponse.json({
      success: true,
      message: 'Senha alterada com sucesso. Faça login novamente nos outros dispositivos.',
    })
  } catch (error) {
    if (error instanceof (await import('zod')).ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors.map((e) => e.message) },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
