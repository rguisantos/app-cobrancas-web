import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, handleApiError } from '@/lib/api-helpers'

// GET /api/auditoria — Listar logs de auditoria
export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  try {
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType')
    const operation = searchParams.get('operation')
    const deviceId = searchParams.get('deviceId')
    const dataInicio = searchParams.get('dataInicio')
    const dataFim = searchParams.get('dataFim')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}
    if (entityType) where.entityType = entityType
    if (operation) where.operation = operation
    if (deviceId) where.deviceId = deviceId
    if (dataInicio || dataFim) {
      where.timestamp = {}
      if (dataInicio) where.timestamp.gte = new Date(dataInicio)
      if (dataFim) where.timestamp.lte = new Date(dataFim + 'T23:59:59')
    }

    const [logs, total] = await Promise.all([
      prisma.changeLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.changeLog.count({ where }),
    ])

    // Enrich with user info where possible
    const enriched = logs.map(log => {
      const changes = log.changes as Record<string, any> || {}
      return {
        ...log,
        entityLabel: getEntityLabel(log.entityType),
        operationLabel: getOperationLabel(log.operation),
        summary: getChangeSummary(log.operation, changes),
      }
    })

    return NextResponse.json({
      logs: enriched,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

function getEntityLabel(type: string): string {
  const labels: Record<string, string> = {
    cliente: 'Cliente',
    produto: 'Produto',
    locacao: 'Locação',
    cobranca: 'Cobrança',
    rota: 'Rota',
    usuario: 'Usuário',
    manutencao: 'Manutenção',
    dispositivo: 'Dispositivo',
    historicoRelogio: 'Histórico Relógio',
    tipoProduto: 'Tipo Produto',
    descricaoProduto: 'Descrição Produto',
    tamanhoProduto: 'Tamanho Produto',
    estabelecimento: 'Estabelecimento',
  }
  return labels[type] || type
}

function getOperationLabel(op: string): string {
  const labels: Record<string, string> = {
    create: 'Criação',
    update: 'Atualização',
    delete: 'Exclusão',
  }
  return labels[op] || op
}

function getChangeSummary(operation: string, changes: Record<string, any>): string {
  if (operation === 'create') {
    const name = changes.nomeExibicao || changes.nome || changes.descricao || changes.identificador || changes.email || ''
    return name ? `Criado: ${name}` : 'Registro criado'
  }
  if (operation === 'delete') {
    return 'Registro excluído'
  }
  if (operation === 'update' && changes) {
    const fields = Object.keys(changes).filter(k => !['updatedAt', 'version', 'syncStatus', 'lastSyncedAt', 'needsSync'].includes(k))
    if (fields.length <= 3) {
      return `Alterado: ${fields.join(', ')}`
    }
    return `${fields.length} campos alterados`
  }
  return ''
}
