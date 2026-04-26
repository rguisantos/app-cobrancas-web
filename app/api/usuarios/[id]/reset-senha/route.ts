import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashSenha } from '@/lib/hash'
import { getAuthSession, unauthorized, notFound, serverError } from '@/lib/api-helpers'
import { registrarAuditoria } from '@/lib/auditoria'
import { z } from 'zod'

const resetSchema = z.object({
  novaSenha: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
    .regex(/[!@#$%^&*()_+\-=\[\]{}|;:',.<>?\/]/, 'Senha deve conter pelo menos um caractere especial'),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session || session.user.tipoPermissao !== 'Administrador') return unauthorized()

  try {
    const body = await req.json()
    const data = resetSchema.parse(body)

    const usuario = await prisma.usuario.findFirst({ where: { id, deletedAt: null } })
    if (!usuario) return notFound('Usuário não encontrado')

    const senhaHash = await hashSenha(data.novaSenha)
    await prisma.usuario.update({
      where: { id },
      data: {
        senha: senhaHash,
        bloqueado: false,
        tentativasLoginFalhas: 0,
        bloqueadoAte: null,
      },
    })

    // Revogar todas as sessões para forçar re-login
    await prisma.sessao.deleteMany({ where: { usuarioId: id } })

    await registrarAuditoria({
      acao: 'reset_senha',
      entidade: 'usuario',
      entidadeId: id,
      detalhes: { nome: usuario.nome, email: usuario.email },
    })

    return NextResponse.json({ success: true, message: 'Senha redefinida com sucesso' })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: err.errors }, { status: 400 })
    }
    console.error('[POST /usuarios/:id/reset-senha]', err)
    return serverError()
  }
}
