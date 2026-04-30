// GET/PUT/DELETE /api/clientes/[id]
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, notFound, serverError, forbidden, validateBody, handleApiError } from '@/lib/api-helpers'
import { registrarAuditoria, extractRequestInfo } from '@/lib/auditoria'
import { clienteUpdateSchema } from '@/lib/validations'

/** Check if user has permission to modify clientes */
function canModify(session: any): boolean {
  if (!session?.user) return false
  if (session.user.tipoPermissao === 'Administrador') return true
  if (session.user.tipoPermissao === 'Secretario') return true
  if (session.user.permissoesWeb?.todosCadastros) return true
  return false
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const cliente = await prisma.cliente.findFirst({
    where: { id, deletedAt: null },
    include: {
      rota: true,
      locacoes: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,  // Only load 5 most recent locações (detail page shows max 5)
      },
      cobrancas: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })

  if (!cliente) return notFound('Cliente não encontrado')
  return NextResponse.json(cliente)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()
  if (!canModify(session)) return forbidden('Sem permissão para editar clientes')

  try {
    const body = await req.json()
    const data = validateBody(clienteUpdateSchema, body)

    const cliente = await prisma.cliente.update({
      where: { id },
      data: {
        ...data,
        version: { increment: 1 },
        deviceId: 'web',
        needsSync: true,
      },
    })

    registrarAuditoria({
      acao: 'editar_cliente',
      entidade: 'cliente',
      entidadeId: id,
      detalhes: { nomeExibicao: cliente.nomeExibicao, campos: Object.keys(body).filter(k => !['id', 'version', 'needsSync', 'syncStatus', 'lastSyncedAt', 'deviceId'].includes(k)) },
      ...extractRequestInfo(req),
    }).catch(() => {})

    return NextResponse.json(cliente)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()
  if (!canModify(session)) return forbidden('Sem permissão para excluir clientes')

  try {
    const cliente = await prisma.cliente.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'Inativo',
        needsSync: true,
        version: { increment: 1 },
      },
    })

    registrarAuditoria({
      acao: 'excluir_cliente',
      entidade: 'cliente',
      entidadeId: id,
      detalhes: { nomeExibicao: cliente.nomeExibicao, softDelete: true },
      ...extractRequestInfo(_),
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch {
    return serverError()
  }
}
