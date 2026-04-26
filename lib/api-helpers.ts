// lib/api-helpers.ts
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { prisma } from './prisma'
import { NextResponse } from 'next/server'
import { ZodTypeAny } from 'zod'

// ─── ApiError ───────────────────────────────────────────────

export class ApiError extends Error {
  statusCode: number
  details?: unknown

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message)
    this.statusCode = statusCode
    this.details = details
    this.name = 'ApiError'
  }
}

// ─── Validation helper ──────────────────────────────────────

/**
 * Validates `data` against a Zod schema.
 * On success returns the parsed (and transformed) data.
 * On failure throws an `ApiError` with status 400 and a
 * human-readable list of field errors.
 */
export function validateBody<T = any>(schema: ZodTypeAny, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('; ')
    throw new ApiError(400, `Dados inválidos: ${errors}`, result.error.errors)
  }
  return result.data
}

// ─── Auth helpers ───────────────────────────────────────────

export async function getAuthSession() {
  return getServerSession(authOptions)
}

/**
 * Obtém os IDs das rotas permitidas para o usuário autenticado.
 * - Administradores e Secretários: retorna null (acesso total)
 * - AcessoControlado: retorna array de rotaIds da tabela UsuarioRota
 */
export async function getUserRotaIds(session: any): Promise<string[] | null> {
  if (!session?.user?.id) return null

  const tipoPermissao = session.user.tipoPermissao

  // Admin e Secretário têm acesso total
  if (tipoPermissao === 'Administrador' || tipoPermissao === 'Secretario') {
    return null // null = sem restrição (acesso total)
  }

  // AcessoControlado: buscar rotas permitidas da junction table
  const usuarioRotas = await prisma.usuarioRota.findMany({
    where: { usuarioId: session.user.id },
    select: { rotaId: true },
  })

  return usuarioRotas.map(ur => ur.rotaId)
}

export function unauthorized() {
  return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
}

export function forbidden(msg = 'Acesso negado') {
  return NextResponse.json({ error: msg }, { status: 403 })
}

export function notFound(msg = 'Não encontrado') {
  return NextResponse.json({ error: msg }, { status: 404 })
}

export function badRequest(msg: string, details?: any) {
  return NextResponse.json({ error: msg, details }, { status: 400 })
}

export function serverError(msg = 'Erro interno') {
  return NextResponse.json({ error: msg }, { status: 500 })
}

// ─── Error handler for API routes ───────────────────────────

/**
 * Handles common error types in API route catch blocks.
 * Returns the appropriate NextResponse for ApiError and ZodError,
 * and a generic 500 for everything else.
 */
export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { error: err.message, details: err.details },
      { status: err.statusCode },
    )
  }
  // Fallback — keep backward compat with routes that still catch z.ZodError directly
  console.error('[API Error]', err)
  return serverError()
}
