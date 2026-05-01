import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, notFound, serverError } from '@/lib/api-helpers'
import { registrarAuditoria, extractRequestInfo } from '@/lib/auditoria'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session || session.user.tipoPermissao !== 'Administrador') return unauthorized()

  try {
    const usuario = await prisma.usuario.findFirst({ where: { id, deletedAt: null } })
    if (!usuario) return notFound('Usuário não encontrado')

    await prisma.usuario.update({
      where: { id },
      data: {
        bloqueado: false,
        tentativasLoginFalhas: 0,
        bloqueadoAte: null,
      },
    })

    registrarAuditoria({
      acao: 'desbloquear_usuario',
      entidade: 'usuario',
      entidadeId: id,
      entidadeNome: usuario.nome,
      detalhes: { nome: usuario.nome, email: usuario.email },
      ...extractRequestInfo(req),
      severidade: 'seguranca',
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[POST /usuarios/:id/desbloquear]', err)
    return serverError()
  }
}
