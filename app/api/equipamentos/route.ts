// POST /api/equipamentos — Mobile registra dispositivo
import { NextRequest, NextResponse } from 'next/server'
import { extrairToken, verificarToken } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  id:            z.string(),
  nome:          z.string(),
  chave:         z.string(),
  tipo:          z.enum(['Celular', 'Tablet', 'Outro']).default('Celular'),
  dataCadastro:  z.string(),
})

export async function POST(req: NextRequest) {
  const token = extrairToken(req.headers.get('Authorization'))
  if (!token || !verificarToken(token)) {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const data = schema.parse(body)

    const dispositivo = await prisma.dispositivo.upsert({
      where: { chave: data.chave },
      update: { nome: data.nome, status: 'ativo' },
      create: { id: data.id, nome: data.nome, chave: data.chave, tipo: data.tipo, status: 'ativo' },
    })

    return NextResponse.json({ success: true, id: dispositivo.id })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Dados inválidos' }, { status: 400 })
    }
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
