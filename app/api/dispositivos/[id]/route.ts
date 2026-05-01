// PATCH /api/dispositivos/[id] — Atualizar dispositivo (requer admin)
// DELETE /api/dispositivos/[id] — Excluir dispositivo (soft delete, requer admin)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { gerarSenhaNumerica } from '@/lib/dispositivo-helpers'
import { z } from 'zod'
import { registrarAuditoria, extractRequestInfo } from '@/lib/auditoria'

// Schema de validação para atualização
const patchSchema = z.object({
  nome: z.string().min(1).max(100).optional(),
  status: z.enum(['ativo', 'inativo']).optional(),
  senhaNumerica: z.string().regex(/^\d{6}$/, 'Senha deve ter 6 dígitos').optional(),
  regenerarSenha: z.boolean().optional(), // Flag para regenerar senha automaticamente
}).refine(data => Object.keys(data).length > 0, {
  message: 'Pelo menos um campo deve ser fornecido',
})

// PATCH - Atualizar dispositivo
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.user || session.user.tipoPermissao !== 'Administrador') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const data = patchSchema.parse(body)

    // Se solicitou regenerar senha, gerar nova
    if (data.regenerarSenha) {
      data.senhaNumerica = gerarSenhaNumerica()
      delete data.regenerarSenha
    }

    // Verificar se dispositivo existe
    const existente = await prisma.dispositivo.findUnique({ where: { id } })
    if (!existente) {
      return NextResponse.json({ error: 'Dispositivo não encontrado' }, { status: 404 })
    }

    // Se está alterando status para inativo, não permitir se está online
    if (data.status === 'inativo' && existente.status === 'ativo') {
      // Verificar se está online (última sync < 30 min)
      const ONLINE_THRESHOLD = 1000 * 60 * 30
      const isOnline = existente.ultimaSincronizacao &&
        (Date.now() - new Date(existente.ultimaSincronizacao).getTime()) < ONLINE_THRESHOLD

      if (isOnline) {
        logger.warn(`[dispositivos] Tentativa de desativar dispositivo online: ${id}`)
        // Permitir, mas logar aviso
      }
    }

    const dispositivo = await prisma.dispositivo.update({
      where: { id },
      data: {
        ...(data.nome !== undefined && { nome: data.nome }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.senhaNumerica !== undefined && { senhaNumerica: data.senhaNumerica }),
        updatedAt: new Date(),
      },
    })

    logger.info(`[dispositivos] Dispositivo atualizado: ${id} - campos: ${Object.keys(data).join(', ')}`)
    registrarAuditoria({
      acao: 'editar_dispositivo',
      entidade: 'dispositivo',
      entidadeId: id,
      entidadeNome: existente.nome,
      detalhes: { campos: Object.keys(data) },
      antes: { nome: existente.nome, status: existente.status },
      depois: { ...data },
      ...extractRequestInfo(request),
    })
    return NextResponse.json(dispositivo)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: err.errors }, { status: 400 })
    }
    logger.error('[dispositivos] Erro ao atualizar:', err)
    return NextResponse.json({ error: 'Erro ao atualizar dispositivo' }, { status: 500 })
  }
}

// DELETE - Excluir dispositivo (soft delete)
// Antes: hard delete (prisma.dispositivo.delete) — perdia histórico
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.user || session.user.tipoPermissao !== 'Administrador') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params

    // Verificar se dispositivo existe
    const existente = await prisma.dispositivo.findUnique({ where: { id } })
    if (!existente) {
      return NextResponse.json({ error: 'Dispositivo não encontrado' }, { status: 404 })
    }

    // Verificar se há ChangeLogs pendentes deste dispositivo
    const pendingChanges = await prisma.changeLog.count({
      where: { deviceId: id, synced: false },
    })

    if (pendingChanges > 0) {
      return NextResponse.json({
        error: `Dispositivo possui ${pendingChanges} mudança(s) pendente(s) de sincronização. Resolva antes de excluir.`,
        pendingChanges,
      }, { status: 409 })
    }

    // Soft delete: marcar como inativo + limpar dados sensíveis
    await prisma.dispositivo.update({
      where: { id },
      data: {
        status: 'inativo',
        senhaNumerica: null,
        deviceKey: null,
        deviceName: null,
        updatedAt: new Date(),
      },
    })

    logger.info(`[dispositivos] Dispositivo excluído (soft delete): ${id} - ${existente.nome}`)
    registrarAuditoria({
      acao: 'excluir_dispositivo',
      entidade: 'dispositivo',
      entidadeId: id,
      entidadeNome: existente.nome,
      detalhes: { nome: existente.nome, softDelete: true },
      ...extractRequestInfo(request),
    })
    return NextResponse.json({ success: true, message: 'Dispositivo desativado com sucesso' })
  } catch (err) {
    logger.error('[dispositivos] Erro ao excluir:', err)
    return NextResponse.json({ error: 'Erro ao excluir dispositivo' }, { status: 500 })
  }
}
