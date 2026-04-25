// POST /api/auth/change-password — Altera senha do usuário
// Suporta autenticação via JWT (mobile) e sessão NextAuth (web)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extrairToken, verificarToken } from '@/lib/jwt'
import { verificarSenha, hashSenha } from '@/lib/hash'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  senhaAtual: z.string().min(1, 'Senha atual é obrigatória'),
  novaSenha: z.string().min(6, 'Nova senha deve ter pelo menos 6 caracteres'),
  confirmarSenha: z.string().min(1, 'Confirmação de senha é obrigatória'),
}).refine(data => data.novaSenha === data.confirmarSenha, {
  message: 'As senhas não coincidem',
  path: ['confirmarSenha'],
})

export async function POST(req: NextRequest) {
  // Tentar autenticação via sessão NextAuth (web) ou JWT (mobile)
  let userId: string | null = null

  // 1. Tentar sessão NextAuth
  const session = await getSession()
  if (session?.user?.id) {
    userId = session.user.id
  }

  // 2. Se não tem sessão, tentar JWT
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
    const validated = schema.parse(body)

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

    return NextResponse.json({ success: true, message: 'Senha alterada com sucesso' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors.map(e => e.message) },
        { status: 400 }
      )
    }
    console.error('[auth/change-password]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
