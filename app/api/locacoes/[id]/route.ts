import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, notFound, forbidden, validateBody, handleApiError, ApiError } from '@/lib/api-helpers'
import { registrarAuditoria, extractRequestInfo } from '@/lib/auditoria'
import { locacaoUpdateSchema } from '@/lib/validations'
import { validarTransicaoStatus } from '@/lib/locacao-service'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const locacao = await prisma.locacao.findFirst({
    where: { id, deletedAt: null },
    include: {
      cliente: {
        select: {
          id: true,
          nomeExibicao: true,
          identificador: true,
          telefonePrincipal: true,
          rotaId: true,
          status: true,
        },
      },
      produto: true,
      cobrancas: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })

  if (!locacao) return notFound('Locação não encontrada')

  return NextResponse.json(locacao)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()

  if (session.user.tipoPermissao === 'AcessoControlado' &&
      !session.user.permissoesWeb?.locacaoRelocacaoEstoque) {
    return forbidden('Sem permissão para editar locações')
  }

  try {
    const body = await req.json()

    // Use Zod schema validation instead of whitelist approach
    const data = validateBody(locacaoUpdateSchema, body)

    // Fetch existing locação to validate status transitions
    const locacaoAtual = await prisma.locacao.findFirst({
      where: { id, deletedAt: null },
    })

    if (!locacaoAtual) {
      throw new ApiError(404, 'Locação não encontrada')
    }

    // Validate status transition if status is being changed
    if (data.status && data.status !== locacaoAtual.status) {
      validarTransicaoStatus(locacaoAtual.status, data.status)
    }

    // Only allow updating these specific fields (whitelist of updatable fields)
    const allowedFields = [
      'status', 'dataFim', 'observacao', 'formaPagamento', 'precoFicha',
      'percentualEmpresa', 'percentualCliente', 'periodicidade', 'valorFixo',
      'dataPrimeiraCobranca', 'ultimaLeituraRelogio', 'dataUltimaCobranca',
      'trocaPano', 'dataUltimaManutencao', 'numeroRelogio',
    ]

    const updateData: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (key in data) {
        updateData[key] = (data as Record<string, unknown>)[key]
      }
    }

    const locacaoAtualizada = await prisma.locacao.update({
      where: { id },
      data: {
        ...updateData,
        version: { increment: 1 },
        deviceId: 'web',
        needsSync: true,
      },
    })

    // If numeroRelogio changed, update product + register history
    if (updateData.numeroRelogio && updateData.numeroRelogio !== locacaoAtual.numeroRelogio) {
      const produto = await prisma.produto.findFirst({
        where: { id: locacaoAtual.produtoId },
        select: { id: true, numeroRelogio: true, identificador: true },
      })

      if (produto && String(updateData.numeroRelogio) !== produto.numeroRelogio) {
        await prisma.$transaction([
          prisma.produto.update({
            where: { id: produto.id },
            data: {
              numeroRelogio: String(updateData.numeroRelogio),
              needsSync: true,
              version: { increment: 1 },
              deviceId: 'web',
            },
          }),
          prisma.historicoRelogio.create({
            data: {
              produtoId: produto.id,
              relogioAnterior: produto.numeroRelogio,
              relogioNovo: String(updateData.numeroRelogio),
              motivo: `Alteração na edição da locação`,
              usuarioResponsavel: session.user.name || session.user.email || 'web',
            },
          }),
        ])
      }
    }

    // If trocaPano changed from false to true, create Manutencao record + update produto
    if (updateData.trocaPano === true && !locacaoAtual.trocaPano) {
      try {
        const produto = await prisma.produto.findFirst({
          where: { id: locacaoAtual.produtoId },
          select: { id: true, identificador: true, tipoNome: true },
        })

        const now = new Date().toISOString()

        await prisma.$transaction([
          // Create Manutencao record for troca de pano
          prisma.manutencao.create({
            data: {
              produtoId: locacaoAtual.produtoId,
              produtoIdentificador: produto?.identificador || locacaoAtual.produtoIdentificador,
              produtoTipo: produto?.tipoNome || locacaoAtual.produtoTipo,
              clienteId: locacaoAtual.clienteId,
              clienteNome: locacaoAtual.clienteNome,
              locacaoId: id,
              tipo: 'trocaPano',
              descricao: 'Troca de pano registrada na edição da locação',
              data: now,
              registradoPor: session.user.id,
            },
          }),
          // Update produto dataUltimaManutencao
          prisma.produto.update({
            where: { id: locacaoAtual.produtoId },
            data: {
              dataUltimaManutencao: now,
              needsSync: true,
              version: { increment: 1 },
              deviceId: 'web',
            },
          }),
        ])
      } catch (manutencaoErr) {
        // Non-critical: locação was already updated, manutenção registration should not fail the request
        console.error('[PUT /locacoes/[id]] Erro ao registrar manutenção de troca de pano:', manutencaoErr)
      }
    }

    // Register change log for sync
    await prisma.changeLog.create({
      data: {
        entityId: id,
        entityType: 'locacao',
        operation: 'update',
        changes: { ...updateData, realizadoPor: session.user.id },
        deviceId: 'web',
        synced: false,
      },
    })

    registrarAuditoria({
      acao: 'editar_locacao',
      entidade: 'locacao',
      entidadeId: id,
      detalhes: { campos: updateData },
      ...extractRequestInfo(req),
    }).catch(() => {})

    return NextResponse.json(locacaoAtualizada)
  } catch (err) {
    return handleApiError(err)
  }
}
