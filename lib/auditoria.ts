import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { getAuthSession } from './api-helpers'

type AcaoAuditoria =
  | 'criar_usuario'
  | 'editar_usuario'
  | 'excluir_usuario'
  | 'desbloquear_usuario'
  | 'reset_senha'
  | 'alterar_permissao'
  | 'login'
  | 'logout'

/**
 * Registra uma ação no log de auditoria.
 * Pode ser chamado com um usuarioId explícito ou sem (para obter da sessão atual).
 */
export async function registrarAuditoria(params: {
  acao: AcaoAuditoria
  entidade: string
  entidadeId?: string
  detalhes?: Record<string, any>
  usuarioId?: string
  ip?: string
  userAgent?: string
}): Promise<void> {
  try {
    let userId = params.usuarioId

    if (!userId) {
      const session = await getAuthSession()
      userId = session?.user?.id || undefined
    }

    await prisma.logAuditoria.create({
      data: {
        usuarioId: userId,
        acao: params.acao,
        entidade: params.entidade,
        entidadeId: params.entidadeId,
        detalhes: params.detalhes ?? Prisma.JsonNull,
        ip: params.ip || undefined,
        userAgent: params.userAgent || undefined,
      },
    })
  } catch (error) {
    // Auditoria não deve quebrar o fluxo principal
    console.error('[auditoria] Erro ao registrar:', error)
  }
}
