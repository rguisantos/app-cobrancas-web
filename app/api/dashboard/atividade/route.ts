// GET /api/dashboard/atividade — Últimas atividades do ChangeLog
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized } from '@/lib/api-helpers'

// Mapeamento de entityType para rótulo legível
const ENTITY_LABELS: Record<string, string> = {
  cliente: 'Cliente',
  produto: 'Produto',
  locacao: 'Locação',
  cobranca: 'Cobrança',
  rota: 'Rota',
  usuario: 'Usuário',
}

// Mapeamento de entityType para rota de link
const ENTITY_ROUTES: Record<string, string> = {
  cliente: '/clientes',
  produto: '/produtos',
  locacao: '/locacoes',
  cobranca: '/cobrancas',
  rota: '/admin/rotas',
  usuario: '/admin/usuarios',
}

// Mapeamento de operação para particípio passado
const OPERATION_PAST: Record<string, string> = {
  create: 'criado',
  update: 'atualizado',
  delete: 'removido',
}

function buildDescription(
  operation: string,
  entityType: string,
  changes: Record<string, any> | null
): string {
  const label = ENTITY_LABELS[entityType] || entityType
  const past = OPERATION_PAST[operation] || operation

  if (operation === 'delete') {
    return `${label} foi ${past}`
  }

  // Para create/update, tenta extrair um nome identificável do changes
  if (changes) {
    const nameFields = ['nomeExibicao', 'clienteNome', 'nome', 'descricao', 'identificador', 'razaoSocial', 'nomeFantasia']
    for (const field of nameFields) {
      if (changes[field] !== undefined && changes[field] !== null && changes[field] !== '') {
        const value = typeof changes[field] === 'object' ? null : String(changes[field])
        if (value) {
          return `${label} '${value}' foi ${past}`
        }
      }
    }

    // Tenta campos após (after) no formato de update
    const after = changes.after || changes.new
    if (after && typeof after === 'object') {
      for (const field of nameFields) {
        if (after[field] !== undefined && after[field] !== null && after[field] !== '') {
          return `${label} '${after[field]}' foi ${past}`
        }
      }
    }
  }

  return `${label} foi ${past}`
}

export async function GET() {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  try {
    // Buscar as últimas 15 entradas do ChangeLog
    const changeLogs = await prisma.changeLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 15,
    })

    // Formatar resposta
    const atividades = changeLogs.map((log) => {
      const changes = log.changes as Record<string, any> | null

      return {
        id: log.id,
        operacao: log.operation,
        entidade: log.entityType,
        entidadeId: log.entityId,
        descricao: buildDescription(log.operation, log.entityType, changes),
        timestamp: log.timestamp.toISOString(),
        link: `${ENTITY_ROUTES[log.entityType] || ''}/${log.entityId}`,
      }
    })

    return NextResponse.json(atividades)
  } catch (error) {
    console.error('[dashboard/atividade]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
