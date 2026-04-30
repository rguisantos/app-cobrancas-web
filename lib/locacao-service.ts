// lib/locacao-service.ts
// Service layer for locação (rental) business logic.
// Extracts validation, transactions, and audit logging from API routes.

import { PrismaClient } from '@prisma/client'
import { prisma } from './prisma'
import { logger } from './logger'
import { ApiError } from './api-helpers'
import { registrarAuditoria } from './auditoria'
import {
  isStatusTransitionAllowed,
  type LocacaoStatus,
} from './validations'
import type { LocacaoCreateInput, RelocarInput, EnviarEstoqueInput, FinalizarLocacaoInput } from './validations'

// ─── Types ───────────────────────────────────────────────────

interface LocacaoResult {
  id: string
  [key: string]: unknown
}

interface RelocarResult {
  locacaoAntigaId: string
  locacaoNovaId: string
  locacaoNova: LocacaoResult
}

interface EnviarEstoqueResult {
  locacaoId: string
  produtoId: string
  produtoIdentificador: string
  estabelecimento: string
}

interface FinalizarResult {
  locacaoId: string
  status: string
}

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Appends a new observation line to an existing observation string.
 * Does NOT overwrite — preserves existing content.
 */
function appendObservacao(existing: string | null | undefined, addition: string): string {
  if (!existing) return addition
  return `${existing}\n${addition}`
}

// ─── Validar Transição de Status ─────────────────────────────

/**
 * Validates whether a status transition is allowed for a locação.
 * Throws ApiError(400) if the transition is invalid.
 */
export function validarTransicaoStatus(statusAtual: string, novoStatus: string): void {
  if (!isStatusTransitionAllowed(statusAtual, novoStatus)) {
    throw new ApiError(
      400,
      `Transição de status inválida: não é possível alterar de "${statusAtual}" para "${novoStatus}". Apenas locações "Ativa" podem ser alteradas para "Finalizada" ou "Cancelada".`,
    )
  }
}

// ─── Criar Locação ──────────────────────────────────────────

/**
 * Creates a new locação with full validation.
 *
 * Validations performed:
 * 1. clienteId exists and is active
 * 2. produtoId exists and is available (not currently locado)
 *
 * Audit logging is performed for the create operation.
 */
export async function criarLocacao(data: LocacaoCreateInput, userId: string): Promise<LocacaoResult> {
  const { id, ...rest } = data

  // 1. Validate cliente exists and is active
  const cliente = await prisma.cliente.findFirst({
    where: { id: data.clienteId, deletedAt: null },
    select: { id: true, status: true, nomeExibicao: true },
  })

  if (!cliente) {
    throw new ApiError(400, `Cliente com ID "${data.clienteId}" não encontrado`)
  }

  if (cliente.status !== 'Ativo') {
    throw new ApiError(400, `Cliente "${cliente.nomeExibicao}" está com status "${cliente.status}". Apenas clientes ativos podem receber locações.`)
  }

  // 2. Validate produto exists and is available
  const produto = await prisma.produto.findFirst({
    where: { id: data.produtoId, deletedAt: null },
    select: { id: true, statusProduto: true, identificador: true, numeroRelogio: true },
  })

  if (!produto) {
    throw new ApiError(400, `Produto com ID "${data.produtoId}" não encontrado`)
  }

  if (produto.statusProduto === 'Inativo') {
    throw new ApiError(400, `Produto "${produto.identificador}" está inativo e não pode ser locado.`)
  }

  if (produto.statusProduto === 'Manutenção') {
    throw new ApiError(400, `Produto "${produto.identificador}" está em manutenção e não pode ser locado.`)
  }

  // 3. Check if produto already has an active locação
  const locacaoExistente = await prisma.locacao.findFirst({
    where: { produtoId: data.produtoId, status: 'Ativa', deletedAt: null },
  })

  if (locacaoExistente) {
    throw new ApiError(409, `Produto "${produto.identificador}" já está locado para outro cliente`)
  }

  // 4. Create locação
  const locacao = await prisma.locacao.create({
    data: {
      ...(id ? { id } : {}),
      ...rest,
      syncStatus: 'synced',
      needsSync: false,
      deviceId: 'web',
      version: 1,
    },
  })

  // 4b. If numeroRelogio differs from product, update product + register history
  if (data.numeroRelogio && data.numeroRelogio !== produto.numeroRelogio) {
    const relogioAnterior = produto.numeroRelogio
    await prisma.$transaction([
      prisma.produto.update({
        where: { id: data.produtoId },
        data: {
          numeroRelogio: data.numeroRelogio,
          needsSync: true,
          version: { increment: 1 },
          deviceId: 'web',
        },
      }),
      prisma.historicoRelogio.create({
        data: {
          produtoId: data.produtoId,
          relogioAnterior,
          relogioNovo: data.numeroRelogio,
          motivo: `Alteração na criação da locação para ${data.clienteNome}`,
          usuarioResponsavel: userId || 'web',
        },
      }),
    ])
    logger.info(`[locacao-service] Relógio atualizado: ${relogioAnterior} → ${data.numeroRelogio} (produto ${produto.identificador})`)
  }

  // 4c. If trocaPano is true, create Manutencao record + update produto
  if (data.trocaPano) {
    const now = new Date().toISOString()
    await prisma.$transaction([
      prisma.manutencao.create({
        data: {
          produtoId: data.produtoId,
          produtoIdentificador: data.produtoIdentificador,
          produtoTipo: data.produtoTipo,
          clienteId: data.clienteId,
          clienteNome: data.clienteNome,
          locacaoId: locacao.id,
          tipo: 'trocaPano',
          descricao: 'Troca de pano registrada na criação da locação',
          data: now,
          registradoPor: userId,
        },
      }),
      prisma.produto.update({
        where: { id: data.produtoId },
        data: {
          dataUltimaManutencao: now,
          needsSync: true,
          version: { increment: 1 },
          deviceId: 'web',
        },
      }),
    ])
    logger.info(`[locacao-service] Manutenção de troca de pano registrada para produto ${produto.identificador}`)
  }

  // 5. Register change log for sync
  await prisma.changeLog.create({
    data: {
      entityId: locacao.id,
      entityType: 'locacao',
      operation: 'create',
      changes: { ...locacao },
      deviceId: 'web',
      synced: false,
    },
  })

  // 6. Audit log
  await registrarAuditoria({
    acao: 'criar_usuario' as any, // Reusing existing action type — maps to "criar" context
    entidade: 'locacao',
    entidadeId: locacao.id,
    detalhes: {
      acao: 'criar_locacao',
      clienteId: data.clienteId,
      clienteNome: data.clienteNome,
      produtoId: data.produtoId,
      produtoIdentificador: data.produtoIdentificador,
      formaPagamento: data.formaPagamento,
    },
    usuarioId: userId,
  })

  logger.info(`[locacao-service] Locação criada: ${locacao.id} — Produto ${data.produtoIdentificador} para cliente ${data.clienteNome}`)

  return locacao as unknown as LocacaoResult
}

// ─── Relocar Produto ────────────────────────────────────────

/**
 * Relocates a product from one client to another.
 *
 * This is a transactional operation that:
 * 1. Validates the current locação is active
 * 2. Validates the new client is not the same as the current one
 * 3. Validates the new client exists and is active
 * 4. Finalizes the current locação
 * 5. Creates a new locação for the new client
 * 6. Registers change logs and maintenance records (if trocaPano)
 * 7. Logs audit entry with user who performed the action
 *
 * Returns both the old and new locação IDs.
 */
export async function relocarProduto(
  locacaoId: string,
  data: RelocarInput,
  userId: string,
): Promise<RelocarResult> {
  // 1. Find current locação
  const locacaoAtual = await prisma.locacao.findFirst({
    where: { id: locacaoId, deletedAt: null, status: 'Ativa' },
    include: { produto: true },
  })

  if (!locacaoAtual) {
    throw new ApiError(404, 'Locação ativa não encontrada')
  }

  // 2. Validate novoCliente is not the same as current client
  if (data.novoClienteId === locacaoAtual.clienteId) {
    throw new ApiError(400, 'O novo cliente não pode ser o mesmo cliente da locação atual')
  }

  // 3. Validate novoCliente exists and is active
  const novoCliente = await prisma.cliente.findFirst({
    where: { id: data.novoClienteId, deletedAt: null },
    select: { id: true, status: true, nomeExibicao: true },
  })

  if (!novoCliente) {
    throw new ApiError(404, 'Novo cliente não encontrado')
  }

  if (novoCliente.status !== 'Ativo') {
    throw new ApiError(400, `Novo cliente "${novoCliente.nomeExibicao}" está com status "${novoCliente.status}". Apenas clientes ativos podem receber locações.`)
  }

  const now = new Date()

  // 4. Execute in transaction
  const resultado = await prisma.$transaction(async (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => {
    // 4a. Finalize current locação (append observacao, don't overwrite)
    const observacaoFinalizada = appendObservacao(
      locacaoAtual.observacao,
      `Relocação: ${data.motivoRelocacao}`,
    )

    await tx.locacao.update({
      where: { id: locacaoId },
      data: {
        status: 'Finalizada',
        dataFim: now.toISOString(),
        observacao: observacaoFinalizada,
        version: { increment: 1 },
        deviceId: 'web',
        needsSync: true,
      },
    })

    // 4b. Create new locação
    const novaLocacao = await tx.locacao.create({
      data: {
        clienteId: data.novoClienteId,
        clienteNome: data.novoClienteNome,
        produtoId: locacaoAtual.produtoId,
        produtoIdentificador: locacaoAtual.produtoIdentificador,
        produtoTipo: locacaoAtual.produtoTipo,
        dataLocacao: now.toISOString(),
        formaPagamento: data.formaPagamento,
        numeroRelogio: data.numeroRelogio,
        precoFicha: data.precoFicha,
        percentualEmpresa: data.percentualEmpresa,
        percentualCliente: data.percentualCliente,
        periodicidade: data.periodicidade,
        valorFixo: data.valorFixo,
        observacao: data.observacao,
        status: 'Ativa',
        trocaPano: data.trocaPano || false,
        dataUltimaManutencao: data.trocaPano ? now.toISOString() : undefined,
        deviceId: 'web',
        version: 1,
        needsSync: true,
      },
    })

    // 4c. Register change logs for sync
    await tx.changeLog.create({
      data: {
        entityId: locacaoId,
        entityType: 'locacao',
        operation: 'update',
        changes: {
          acao: 'relocacao',
          novoClienteId: data.novoClienteId,
          motivo: data.motivoRelocacao,
          realizadoPor: userId,
        },
        deviceId: 'web',
        synced: false,
      },
    })

    await tx.changeLog.create({
      data: {
        entityId: novaLocacao.id,
        entityType: 'locacao',
        operation: 'create',
        changes: { ...novaLocacao },
        deviceId: 'web',
        synced: false,
      },
    })

    // 4d. Register maintenance if trocaPano
    if (data.trocaPano) {
      await tx.manutencao.create({
        data: {
          produtoId: locacaoAtual.produtoId,
          produtoIdentificador: locacaoAtual.produtoIdentificador,
          produtoTipo: locacaoAtual.produtoTipo,
          clienteId: data.novoClienteId,
          clienteNome: data.novoClienteNome,
          locacaoId: novaLocacao.id,
          tipo: 'trocaPano',
          descricao: 'Troca de pano na relocação',
          data: now.toISOString(),
          registradoPor: userId,
        },
      })
    }

    return novaLocacao
  })

  // 5. Audit log (outside transaction — non-critical)
  await registrarAuditoria({
    acao: 'editar_usuario' as any,
    entidade: 'locacao',
    entidadeId: locacaoId,
    detalhes: {
      acao: 'relocacao',
      locacaoAntigaId: locacaoId,
      locacaoNovaId: resultado.id,
      clienteAntigoId: locacaoAtual.clienteId,
      clienteNovoId: data.novoClienteId,
      motivo: data.motivoRelocacao,
      trocaPano: data.trocaPano || false,
    },
    usuarioId: userId,
  })

  logger.info(
    `[locacao-service] Relocação: ${locacaoId} → ${resultado.id} — Produto ${locacaoAtual.produtoIdentificador} de ${locacaoAtual.clienteNome} para ${data.novoClienteNome}`,
  )

  return {
    locacaoAntigaId: locacaoId,
    locacaoNovaId: resultado.id,
    locacaoNova: resultado as unknown as LocacaoResult,
  }
}

// ─── Enviar para Estoque ────────────────────────────────────

/**
 * Sends a product to stock (estabelecimento).
 *
 * This is a transactional operation that:
 * 1. Validates the current locação is active
 * 2. Validates the estabelecimento exists
 * 3. Finalizes the locação (appending observacao, not overwriting)
 * 4. Updates the produto with the estabelecimento
 * 5. Registers change logs for sync
 *
 * Returns details about the operation.
 */
export async function enviarParaEstoque(
  locacaoId: string,
  data: EnviarEstoqueInput,
  userId: string,
): Promise<EnviarEstoqueResult> {
  // 1. Find current locação
  const locacaoAtual = await prisma.locacao.findFirst({
    where: { id: locacaoId, deletedAt: null, status: 'Ativa' },
    include: { produto: true },
  })

  if (!locacaoAtual) {
    throw new ApiError(404, 'Locação ativa não encontrada')
  }

  // 2. Validate estabelecimento exists
  const estabelecimento = await prisma.estabelecimento.findFirst({
    where: { nome: data.estabelecimento, deletedAt: null },
  })

  if (!estabelecimento) {
    throw new ApiError(400, `Estabelecimento "${data.estabelecimento}" não encontrado. Verifique o nome e tente novamente.`)
  }

  const now = new Date()

  // 3. Execute in transaction
  await prisma.$transaction(async (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => {
    // 3a. Finalize locação (APPEND observacao, don't overwrite)
    const observacaoFinalizada = appendObservacao(
      locacaoAtual.observacao,
      `Envio para ${data.estabelecimento}: ${data.motivo}${data.observacao ? ` — ${data.observacao}` : ''}`,
    )

    await tx.locacao.update({
      where: { id: locacaoId },
      data: {
        status: 'Finalizada',
        dataFim: now.toISOString(),
        observacao: observacaoFinalizada,
        version: { increment: 1 },
        deviceId: 'web',
        needsSync: true,
      },
    })

    // 3b. Update produto (set estabelecimento, keep existing observacao)
    await tx.produto.update({
      where: { id: locacaoAtual.produtoId },
      data: {
        estabelecimento: data.estabelecimento,
        // Preserve existing observacao — do NOT overwrite
        statusProduto: 'Ativo',
        version: { increment: 1 },
        deviceId: 'web',
        needsSync: true,
      },
    })

    // 3c. Register change logs for sync
    await tx.changeLog.create({
      data: {
        entityId: locacaoId,
        entityType: 'locacao',
        operation: 'update',
        changes: {
          acao: 'enviar_estoque',
          estabelecimento: data.estabelecimento,
          motivo: data.motivo,
          realizadoPor: userId,
        },
        deviceId: 'web',
        synced: false,
      },
    })

    await tx.changeLog.create({
      data: {
        entityId: locacaoAtual.produtoId,
        entityType: 'produto',
        operation: 'update',
        changes: { estabelecimento: data.estabelecimento },
        deviceId: 'web',
        synced: false,
      },
    })
  })

  // 4. Audit log (outside transaction — non-critical)
  await registrarAuditoria({
    acao: 'editar_usuario' as any,
    entidade: 'locacao',
    entidadeId: locacaoId,
    detalhes: {
      acao: 'enviar_estoque',
      estabelecimento: data.estabelecimento,
      motivo: data.motivo,
      produtoId: locacaoAtual.produtoId,
      produtoIdentificador: locacaoAtual.produtoIdentificador,
    },
    usuarioId: userId,
  })

  logger.info(
    `[locacao-service] Produto enviado para estoque: ${locacaoAtual.produtoIdentificador} → ${data.estabelecimento} (locação ${locacaoId})`,
  )

  return {
    locacaoId,
    produtoId: locacaoAtual.produtoId,
    produtoIdentificador: locacaoAtual.produtoIdentificador,
    estabelecimento: data.estabelecimento,
  }
}

// ─── Finalizar Locação ──────────────────────────────────────

/**
 * Finalizes a locação with a reason.
 *
 * Validates:
 * 1. The locação exists and is active
 * 2. The status transition is valid (Ativa → Finalizada)
 *
 * Transactional: updates the locação and registers change log.
 */
export async function finalizarLocacao(
  locacaoId: string,
  data: FinalizarLocacaoInput,
  userId: string,
): Promise<FinalizarResult> {
  // 1. Find current locação
  const locacao = await prisma.locacao.findFirst({
    where: { id: locacaoId, deletedAt: null },
  })

  if (!locacao) {
    throw new ApiError(404, 'Locação não encontrada')
  }

  // 2. Validate status transition
  validarTransicaoStatus(locacao.status, 'Finalizada')

  const now = new Date()

  // 3. Execute in transaction
  await prisma.$transaction(async (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => {
    // 3a. Append observacao (don't overwrite)
    const observacaoFinalizada = appendObservacao(
      locacao.observacao,
      `Finalizada: ${data.motivo}${data.observacao ? ` — ${data.observacao}` : ''}`,
    )

    await tx.locacao.update({
      where: { id: locacaoId },
      data: {
        status: 'Finalizada',
        dataFim: now.toISOString(),
        observacao: observacaoFinalizada,
        version: { increment: 1 },
        deviceId: 'web',
        needsSync: true,
      },
    })

    // 3b. Register change log for sync
    await tx.changeLog.create({
      data: {
        entityId: locacaoId,
        entityType: 'locacao',
        operation: 'update',
        changes: {
          acao: 'finalizar',
          motivo: data.motivo,
          realizadoPor: userId,
        },
        deviceId: 'web',
        synced: false,
      },
    })
  })

  // 4. Audit log (outside transaction — non-critical)
  await registrarAuditoria({
    acao: 'editar_usuario' as any,
    entidade: 'locacao',
    entidadeId: locacaoId,
    detalhes: {
      acao: 'finalizar',
      motivo: data.motivo,
      clienteId: locacao.clienteId,
      produtoId: locacao.produtoId,
    },
    usuarioId: userId,
  })

  logger.info(`[locacao-service] Locação finalizada: ${locacaoId} — Motivo: ${data.motivo}`)

  return {
    locacaoId,
    status: 'Finalizada',
  }
}
