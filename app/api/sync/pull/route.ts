// POST /api/sync/pull — Servidor envia alterações para o mobile
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extrairToken, verificarToken } from '@/lib/jwt'
import { processPull } from '@/lib/sync-engine'
import { z } from 'zod'

const pullSchema = z.object({
  deviceId:   z.string(),
  deviceKey:  z.string(),
  lastSyncAt: z.string(),
})

export async function POST(req: NextRequest) {
  const requestId = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  console.log(`\n[SYNC/PULL:${requestId}] ========== PULL REQUEST START ==========`)
  console.log(`[SYNC/PULL:${requestId}] Timestamp: ${new Date().toISOString()}`)

  // Autenticação via JWT do mobile
  const authHeader = req.headers.get('Authorization')
  console.log(`[SYNC/PULL:${requestId}] Auth header: ${authHeader ? 'presente' : 'ausente'}`)
  
  const token = extrairToken(authHeader)
  if (!token) {
    console.error(`[SYNC/PULL:${requestId}] ❌ Token não encontrado no header`)
    console.log(`[SYNC/PULL:${requestId}] ========== PULL REQUEST END (401) ==========\n`)
    return NextResponse.json({ success: false, error: 'Token não fornecido' }, { status: 401 })
  }
  
  console.log(`[SYNC/PULL:${requestId}] Token preview: ${token.substring(0, 30)}...`)
  
  const tokenValido = verificarToken(token)
  if (!tokenValido) {
    console.error(`[SYNC/PULL:${requestId}] ❌ Token inválido ou expirado`)
    console.log(`[SYNC/PULL:${requestId}] ========== PULL REQUEST END (401) ==========\n`)
    return NextResponse.json({ success: false, error: 'Token inválido ou expirado' }, { status: 401 })
  }
  
  console.log(`[SYNC/PULL:${requestId}] ✅ Token válido`)

  try {
    const body = await req.json()
    console.log(`[SYNC/PULL:${requestId}] Body recebido:`, JSON.stringify(body).substring(0, 200))
    
    const { deviceId, deviceKey, lastSyncAt } = pullSchema.parse(body)
    console.log(`[SYNC/PULL:${requestId}] DeviceId: ${deviceId}`)
    console.log(`[SYNC/PULL:${requestId}] DeviceKey: ${deviceKey?.substring(0, 20)}...`)
    console.log(`[SYNC/PULL:${requestId}] LastSyncAt: ${lastSyncAt}`)

    // Validar dispositivo registrado
    const dispositivo = await prisma.dispositivo.findUnique({ where: { chave: deviceKey } })
    if (!dispositivo) {
      console.error(`[SYNC/PULL:${requestId}] ❌ Dispositivo não encontrado: ${deviceKey?.substring(0, 20)}...`)
      console.log(`[SYNC/PULL:${requestId}] ========== PULL REQUEST END (403) ==========\n`)
      return NextResponse.json({ success: false, error: 'Dispositivo não encontrado' }, { status: 403 })
    }
    
    console.log(`[SYNC/PULL:${requestId}] Dispositivo encontrado: ${dispositivo.nome} (${dispositivo.status})`)
    
    if (dispositivo.status !== 'ativo') {
      console.error(`[SYNC/PULL:${requestId}] ❌ Dispositivo inativo: ${dispositivo.status}`)
      console.log(`[SYNC/PULL:${requestId}] ========== PULL REQUEST END (403) ==========\n`)
      return NextResponse.json({ success: false, error: 'Dispositivo inativo' }, { status: 403 })
    }

    console.log(`[SYNC/PULL:${requestId}] ✅ Dispositivo autorizado, processando pull...`)
    const response = await processPull(deviceId, lastSyncAt)
    
    const totalChanges = 
      (response.changes?.clientes?.length || 0) +
      (response.changes?.produtos?.length || 0) +
      (response.changes?.locacoes?.length || 0) +
      (response.changes?.cobrancas?.length || 0) +
      (response.changes?.rotas?.length || 0)
    
    console.log(`[SYNC/PULL:${requestId}] ✅ PULL concluído. Total de mudanças: ${totalChanges}`)
    console.log(`[SYNC/PULL:${requestId}] ========== PULL REQUEST END (200) ==========\n`)
    
    return NextResponse.json(response)
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.error(`[SYNC/PULL:${requestId}] ❌ Erro de validação:`, err.errors)
      console.log(`[SYNC/PULL:${requestId}] ========== PULL REQUEST END (400) ==========\n`)
      return NextResponse.json({ success: false, error: 'Payload inválido', details: err.errors }, { status: 400 })
    }
    console.error(`[SYNC/PULL:${requestId}] ❌ Erro interno:`, err)
    console.log(`[SYNC/PULL:${requestId}] ========== PULL REQUEST END (500) ==========\n`)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
