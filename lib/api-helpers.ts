// lib/api-helpers.ts
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { NextResponse } from 'next/server'

export async function getAuthSession() {
  return getServerSession(authOptions)
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
