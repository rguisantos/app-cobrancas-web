// POST /api/mobile/auth/login — Login para o app mobile
// Este endpoint está fora de /api/auth/ para evitar interceptação pelo NextAuth
// Retorna { token, user } no formato esperado pelo app mobile
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verificarSenha } from '@/lib/hash'
import { gerarToken } from '@/lib/jwt'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  console.log('[MOBILE AUTH] Requisição de login recebida')
  
  try {
    const body = await req.json()
    console.log('[MOBILE AUTH] Email:', body.email)
    
    const { email, password } = schema.parse(body)

    const usuario = await prisma.usuario.findFirst({
      where: { email, status: 'Ativo', bloqueado: false, deletedAt: null },
      include: { rotasPermitidasRel: { include: { rota: true } } },
    })

    if (!usuario) {
      console.log('[MOBILE AUTH] Usuário não encontrado:', email)
      return NextResponse.json({ error: 'Email e/ou senha incorretos' }, { status: 401 })
    }

    const senhaOk = await verificarSenha(password, usuario.senha)
    if (!senhaOk) {
      console.log('[MOBILE AUTH] Senha incorreta para:', email)
      return NextResponse.json({ error: 'Email e/ou senha incorretos' }, { status: 401 })
    }

    // Atualizar último acesso
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        dataUltimoAcesso: new Date().toISOString(),
        ultimoAcessoDispositivo: 'Mobile',
      },
    })

    const token = gerarToken({
      sub: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      tipoPermissao: usuario.tipoPermissao,
    })

    const rotasPermitidas = usuario.rotasPermitidasRel.map((ur) => ur.rotaId)

    console.log('[MOBILE AUTH] Login bem-sucedido para:', email)
    
    return NextResponse.json({
      token,
      user: {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        role: usuario.tipoPermissao,
        tipoPermissao: usuario.tipoPermissao,
        permissoes: {
          web:    usuario.permissoesWeb,
          mobile: usuario.permissoesMobile,
        },
        rotasPermitidas,
        status: usuario.status,
      },
    })
  } catch (err) {
    console.error('[MOBILE AUTH] Erro:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: err.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
