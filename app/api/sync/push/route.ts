// POST /api/sync/push — Mobile envia alterações locais para o servidor
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extrairToken, verificarToken } from '@/lib/jwt'
import { processPush } from '@/lib/sync-engine'
import type { ChangeLog, EntityType } from '@/shared/types'
import { z } from 'zod'

// Schema flexível para aceitar tipos do SQLite (string JSON, number, null)
const changeLogSchema = z.object({
  id:         z.string(),
  entityId:   z.string(),
  entityType: z.enum(['cliente', 'produto', 'locacao', 'cobranca', 'rota', 'usuario']),
  operation:  z.enum(['create', 'update', 'delete']),
  changes:    z.union([z.record(z.any()), z.string()]), // Pode ser objeto ou string JSON
  timestamp:  z.string(),
  deviceId:   z.string(),
  synced:     z.union([z.boolean(), z.number()]), // Pode ser boolean ou 0/1
  syncedAt:   z.string().nullable().optional(), // Pode ser null
})

// Função para normalizar dados do SQLite
function normalizeChangeLog(change: z.infer<typeof changeLogSchema>) {
  return {
    ...change,
    changes: typeof change.changes === 'string' 
      ? JSON.parse(change.changes) 
      : change.changes,
    synced: Boolean(change.synced),
    syncedAt: change.syncedAt || undefined,
  }
}

const pushSchema = z.object({
  deviceId:   z.string(),
  deviceKey:  z.string(),
  lastSyncAt: z.string(),
  changes:    z.array(changeLogSchema),
})

export async function POST(req: NextRequest) {
  const requestId = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  console.log(`\n[SYNC/PUSH:${requestId}] ========== PUSH REQUEST START ==========`)
  console.log(`[SYNC/PUSH:${requestId}] Timestamp: ${new Date().toISOString()}`)

  // Autenticação via JWT do mobile
  const authHeader = req.headers.get('Authorization')
  console.log(`[SYNC/PUSH:${requestId}] Auth header: ${authHeader ? 'presente' : 'ausente'}`)
  
  const token = extrairToken(authHeader)
  if (!token) {
    console.error(`[SYNC/PUSH:${requestId}] ❌ Token não encontrado no header`)
    console.log(`[SYNC/PUSH:${requestId}] ========== PUSH REQUEST END (401) ==========\n`)
    return NextResponse.json({ success: false, error: 'Token não fornecido' }, { status: 401 })
  }
  
  const tokenValido = verificarToken(token)
  if (!tokenValido) {
    console.error(`[SYNC/PUSH:${requestId}] ❌ Token inválido ou expirado`)
    console.log(`[SYNC/PUSH:${requestId}] ========== PUSH REQUEST END (401) ==========\n`)
    return NextResponse.json({ success: false, error: 'Token inválido ou expirado' }, { status: 401 })
  }
  
  console.log(`[SYNC/PUSH:${requestId}] ✅ Token válido`)

  try {
    const body = await req.json()
    const { deviceId, deviceKey, changes } = pushSchema.parse(body)
    console.log(`[SYNC/PUSH:${requestId}] DeviceId: ${deviceId}`)
    console.log(`[SYNC/PUSH:${requestId}] DeviceKey: ${deviceKey?.substring(0, 20)}...`)
    console.log(`[SYNC/PUSH:${requestId}] Changes count: ${changes.length}`)

    // Validar dispositivo registrado
    const dispositivo = await prisma.dispositivo.findUnique({ where: { chave: deviceKey } })
    if (!dispositivo) {
      console.error(`[SYNC/PUSH:${requestId}] ❌ Dispositivo não encontrado: ${deviceKey?.substring(0, 20)}...`)
      console.log(`[SYNC/PUSH:${requestId}] ========== PUSH REQUEST END (403) ==========\n`)
      return NextResponse.json({ success: false, error: 'Dispositivo não encontrado' }, { status: 403 })
    }
    
    console.log(`[SYNC/PUSH:${requestId}] Dispositivo encontrado: ${dispositivo.nome} (${dispositivo.status})`)
    
    if (dispositivo.status !== 'ativo') {
      console.error(`[SYNC/PUSH:${requestId}] ❌ Dispositivo inativo: ${dispositivo.status}`)
      console.log(`[SYNC/PUSH:${requestId}] ========== PUSH REQUEST END (403) ==========\n`)
      return NextResponse.json({ success: false, error: 'Dispositivo inativo' }, { status: 403 })
    }

    console.log(`[SYNC/PUSH:${requestId}] ✅ Dispositivo autorizado, processando mudanças...`)
    
    // Normalizar dados do SQLite (converter tipos)
    const normalizedChanges = changes.map(normalizeChangeLog)
    console.log(`[SYNC/PUSH:${requestId}] Mudanças normalizadas: ${normalizedChanges.length}`)
    
    const { conflicts, errors } = await processPush(deviceId, normalizedChanges)

    console.log(`[SYNC/PUSH:${requestId}] ✅ PUSH concluído`)
    console.log(`[SYNC/PUSH:${requestId}] Conflitos: ${conflicts.length}, Erros: ${errors.length}`)
    console.log(`[SYNC/PUSH:${requestId}] ========== PUSH REQUEST END (200) ==========\n`)

    return NextResponse.json({
      success: true,
      lastSyncAt: new Date().toISOString(),
      conflicts,
      errors: errors.length ? errors : undefined,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.error(`[SYNC/PUSH:${requestId}] ❌ Erro de validação:`, err.errors)
      console.log(`[SYNC/PUSH:${requestId}] ========== PUSH REQUEST END (400) ==========\n`)
      return NextResponse.json({ success: false, error: 'Payload inválido', details: err.errors }, { status: 400 })
    }
    console.error(`[SYNC/PUSH:${requestId}] ❌ Erro interno:`, err)
    console.log(`[SYNC/PUSH:${requestId}] ========== PUSH REQUEST END (500) ==========\n`)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
