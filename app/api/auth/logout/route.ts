// POST /api/auth/logout — Logout para o app mobile
import { NextResponse } from 'next/server'

export async function POST() {
  // Para mobile, o logout é feito no lado do cliente (remover token do AsyncStorage)
  // Apenas retornamos sucesso para confirmar
  return NextResponse.json({ success: true, message: 'Logout realizado' })
}
