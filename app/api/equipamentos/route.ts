// POST /api/equipamentos — Mobile registra dispositivo
// Não requer autenticação pois é usado no primeiro registro do dispositivo
import { NextRequest, NextResponse } from 'next/server'
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
  const requestId = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  console.log(`\n[EQUIPAMENTOS:${requestId}] ========== REGISTRO DE DISPOSITIVO START ==========`)
  console.log(`[EQUIPAMENTOS:${requestId}] Timestamp: ${new Date().toISOString()}`)
  console.log(`[EQUIPAMENTOS:${requestId}] Nota: Este endpoint NÃO requer autenticação`)

  try {
    const body = await req.json()
    console.log(`[EQUIPAMENTOS:${requestId}] Body recebido:`, JSON.stringify(body))
    
    const data = schema.parse(body)
    console.log(`[EQUIPAMENTOS:${requestId}] Dados validados:`)
    console.log(`[EQUIPAMENTOS:${requestId}]   ID: ${data.id}`)
    console.log(`[EQUIPAMENTOS:${requestId}]   Nome: ${data.nome}`)
    console.log(`[EQUIPAMENTOS:${requestId}]   Chave: ${data.chave?.substring(0, 30)}...`)
    console.log(`[EQUIPAMENTOS:${requestId}]   Tipo: ${data.tipo}`)

    // Verificar se já existe dispositivo com esta chave
    const existente = await prisma.dispositivo.findUnique({ 
      where: { chave: data.chave } 
    })
    
    if (existente) {
      console.log(`[EQUIPAMENTOS:${requestId}] Dispositivo já existe, atualizando...`)
      console.log(`[EQUIPAMENTOS:${requestId}]   ID existente: ${existente.id}`)
      console.log(`[EQUIPAMENTOS:${requestId}]   Status anterior: ${existente.status}`)
    }

    const dispositivo = await prisma.dispositivo.upsert({
      where: { chave: data.chave },
      update: { nome: data.nome, status: 'ativo' },
      create: { id: data.id, nome: data.nome, chave: data.chave, tipo: data.tipo, status: 'ativo' },
    })

    console.log(`[EQUIPAMENTOS:${requestId}] ✅ Dispositivo salvo com sucesso!`)
    console.log(`[EQUIPAMENTOS:${requestId}]   ID: ${dispositivo.id}`)
    console.log(`[EQUIPAMENTOS:${requestId}]   Nome: ${dispositivo.nome}`)
    console.log(`[EQUIPAMENTOS:${requestId}]   Status: ${dispositivo.status}`)
    console.log(`[EQUIPAMENTOS:${requestId}] ========== REGISTRO DE DISPOSITIVO END (200) ==========\n`)
    
    return NextResponse.json({ success: true, id: dispositivo.id })
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.error(`[EQUIPAMENTOS:${requestId}] ❌ Erro de validação:`, err.errors)
      console.log(`[EQUIPAMENTOS:${requestId}] ========== REGISTRO DE DISPOSITIVO END (400) ==========\n`)
      return NextResponse.json({ success: false, error: 'Dados inválidos', details: err.errors }, { status: 400 })
    }
    console.error(`[EQUIPAMENTOS:${requestId}] ❌ Erro interno:`, err)
    console.log(`[EQUIPAMENTOS:${requestId}] ========== REGISTRO DE DISPOSITIVO END (500) ==========\n`)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}

// GET /api/equipamentos — Listar dispositivos (para debug)
export async function GET(req: NextRequest) {
  const requestId = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  console.log(`\n[EQUIPAMENTOS:${requestId}] ========== LISTAR DISPOSITIVOS ==========`)
  
  try {
    const dispositivos = await prisma.dispositivo.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    
    console.log(`[EQUIPAMENTOS:${requestId}] Encontrados ${dispositivos.length} dispositivos`)
    
    return NextResponse.json({ 
      success: true, 
      count: dispositivos.length,
      dispositivos: dispositivos.map(d => ({
        id: d.id,
        nome: d.nome,
        tipo: d.tipo,
        status: d.status,
        chave: d.chave?.substring(0, 20) + '...',
        ultimaSincronizacao: d.ultimaSincronizacao,
        createdAt: d.createdAt,
      }))
    })
  } catch (err) {
    console.error(`[EQUIPAMENTOS:${requestId}] Erro:`, err)
    return NextResponse.json({ success: false, error: 'Erro ao listar dispositivos' }, { status: 500 })
  }
}
