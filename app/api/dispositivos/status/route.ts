// POST /api/dispositivos/status — Mobile verifica se dispositivo precisa de ativação
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  deviceKey: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const requestId = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  console.log(`\n[DISPOSITIVOS/STATUS:${requestId}] ========== STATUS CHECK START ==========`)
  console.log(`[DISPOSITIVOS/STATUS:${requestId}] Timestamp: ${new Date().toISOString()}`)

  try {
    const body = await req.json()
    const data = schema.parse(body)
    console.log(`[DISPOSITIVOS/STATUS:${requestId}] DeviceKey: ${data.deviceKey?.substring(0, 20) || 'não fornecida'}...`)

    // Se não tem deviceKey, precisa de ativação
    if (!data.deviceKey) {
      console.log(`[DISPOSITIVOS/STATUS:${requestId}] Sem deviceKey - precisa ativação`)
      console.log(`[DISPOSITIVOS/STATUS:${requestId}] ========== STATUS CHECK END (200) ==========\n`)
      return NextResponse.json({
        needsActivation: true,
      })
    }

    // Buscar dispositivo pela deviceKey (chave técnica gerada pelo app após ativação)
    // NOTA: O campo 'chave' é o ID legível (DEV-XXXXXX), 'deviceKey' é a chave técnica
    const dispositivo = await prisma.dispositivo.findUnique({
      where: { deviceKey: data.deviceKey },
    })

    // Se não encontrou por deviceKey, tentar buscar por chave (para compatibilidade com versões antigas)
    let dispositivoFinal = dispositivo;
    if (!dispositivoFinal) {
      dispositivoFinal = await prisma.dispositivo.findUnique({
        where: { chave: data.deviceKey },
      })
      if (dispositivoFinal) {
        console.log(`[DISPOSITIVOS/STATUS:${requestId}] Encontrado pela chave (legado) em vez de deviceKey`)
      }
    }

    console.log(`[DISPOSITIVOS/STATUS:${requestId}] Buscando por deviceKey: ${data.deviceKey?.substring(0, 50)}...`)
    console.log(`[DISPOSITIVOS/STATUS:${requestId}] Dispositivo encontrado:`, dispositivoFinal ? { id: dispositivoFinal.id, nome: dispositivoFinal.nome, status: dispositivoFinal.status, deviceKey: dispositivoFinal.deviceKey?.substring(0, 50) } : null)

    if (!dispositivoFinal) {
      console.log(`[DISPOSITIVOS/STATUS:${requestId}] Dispositivo não encontrado - precisa ativação`)
      console.log(`[DISPOSITIVOS/STATUS:${requestId}] ========== STATUS CHECK END (200) ==========\n`)
      return NextResponse.json({
        needsActivation: true,
      })
    }

    console.log(`[DISPOSITIVOS/STATUS:${requestId}] Dispositivo encontrado: ${dispositivoFinal.nome} (status: ${dispositivoFinal.status})`)

    const needsActivation = dispositivoFinal.status !== 'ativo'

    console.log(`[DISPOSITIVOS/STATUS:${requestId}] needsActivation: ${needsActivation}`)
    console.log(`[DISPOSITIVOS/STATUS:${requestId}] ========== STATUS CHECK END (200) ==========\n`)

    return NextResponse.json({
      needsActivation,
      dispositivoId: dispositivoFinal.id,
      status: dispositivoFinal.status,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.error(`[DISPOSITIVOS/STATUS:${requestId}] ❌ Erro de validação:`, err.errors)
      console.log(`[DISPOSITIVOS/STATUS:${requestId}] ========== STATUS CHECK END (400) ==========\n`)
      return NextResponse.json(
        { success: false, error: 'Dados inválidos', details: err.errors },
        { status: 400 }
      )
    }
    console.error(`[DISPOSITIVOS/STATUS:${requestId}] ❌ Erro interno:`, err)
    console.log(`[DISPOSITIVOS/STATUS:${requestId}] ========== STATUS CHECK END (500) ==========\n`)
    return NextResponse.json(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    )
  }
}
