// POST /api/dispositivos/ativar — Mobile ativa dispositivo com senha de 6 dígitos
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  dispositivoId: z.string().min(1, 'ID do dispositivo é obrigatório'),
  deviceKey: z.string().min(1, 'Chave do dispositivo é obrigatória'),
  deviceName: z.string().min(1, 'Nome do dispositivo é obrigatório'),
  senhaNumerica: z.string().length(6, 'Senha deve ter 6 dígitos'),
})

export async function POST(req: NextRequest) {
  const requestId = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  console.log(`\n[DISPOSITIVOS/ATIVAR:${requestId}] ========== ATIVAÇÃO START ==========`)
  console.log(`[DISPOSITIVOS/ATIVAR:${requestId}] Timestamp: ${new Date().toISOString()}`)

  try {
    const body = await req.json()
    console.log(`[DISPOSITIVOS/ATIVAR:${requestId}] Body recebido:`, JSON.stringify(body))

    const data = schema.parse(body)
    console.log(`[DISPOSITIVOS/ATIVAR:${requestId}] Dados validados:`)
    console.log(`[DISPOSITIVOS/ATIVAR:${requestId}]   DispositivoId: ${data.dispositivoId}`)
    console.log(`[DISPOSITIVOS/ATIVAR:${requestId}]   DeviceKey: ${data.deviceKey.substring(0, 20)}...`)
    console.log(`[DISPOSITIVOS/ATIVAR:${requestId}]   DeviceName: ${data.deviceName}`)

    // Buscar dispositivo pelo ID
    const dispositivo = await prisma.dispositivo.findUnique({
      where: { id: data.dispositivoId },
    })

    if (!dispositivo) {
      console.error(`[DISPOSITIVOS/ATIVAR:${requestId}] ❌ Dispositivo não encontrado: ${data.dispositivoId}`)
      console.log(`[DISPOSITIVOS/ATIVAR:${requestId}] ========== ATIVAÇÃO END (404) ==========\n`)
      return NextResponse.json(
        { success: false, error: 'Dispositivo não encontrado' },
        { status: 404 }
      )
    }

    console.log(`[DISPOSITIVOS/ATIVAR:${requestId}] Dispositivo encontrado: ${dispositivo.nome} (status: ${dispositivo.status})`)

    // Verificar senha numérica
    if (dispositivo.senhaNumerica !== data.senhaNumerica) {
      console.error(`[DISPOSITIVOS/ATIVAR:${requestId}] ❌ Senha numérica inválida`)
      console.log(`[DISPOSITIVOS/ATIVAR:${requestId}] ========== ATIVAÇÃO END (401) ==========\n`)
      return NextResponse.json(
        { success: false, error: 'Senha numérica inválida' },
        { status: 401 }
      )
    }

    // Verificar se já está ativo (dispositivo só precisa ser ativado uma vez)
    if (dispositivo.status === 'ativo') {
      console.log(`[DISPOSITIVOS/ATIVAR:${requestId}] Dispositivo já está ativo, atualizando chave...`)
    }

    // Ativar dispositivo: salvar deviceKey e atualizar status
    const dispositivoAtualizado = await prisma.dispositivo.update({
      where: { id: data.dispositivoId },
      data: {
        chave: data.deviceKey,
        nome: data.deviceName,
        status: 'ativo',
        updatedAt: new Date(),
      },
    })

    console.log(`[DISPOSITIVOS/ATIVAR:${requestId}] ✅ Dispositivo ativado com sucesso!`)
    console.log(`[DISPOSITIVOS/ATIVAR:${requestId}]   ID: ${dispositivoAtualizado.id}`)
    console.log(`[DISPOSITIVOS/ATIVAR:${requestId}]   Nome: ${dispositivoAtualizado.nome}`)
    console.log(`[DISPOSITIVOS/ATIVAR:${requestId}]   Status: ${dispositivoAtualizado.status}`)
    console.log(`[DISPOSITIVOS/ATIVAR:${requestId}] ========== ATIVAÇÃO END (200) ==========\n`)

    return NextResponse.json({
      success: true,
      dispositivo: {
        id: dispositivoAtualizado.id,
        nome: dispositivoAtualizado.nome,
        status: dispositivoAtualizado.status,
      },
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.error(`[DISPOSITIVOS/ATIVAR:${requestId}] ❌ Erro de validação:`, err.errors)
      console.log(`[DISPOSITIVOS/ATIVAR:${requestId}] ========== ATIVAÇÃO END (400) ==========\n`)
      return NextResponse.json(
        { success: false, error: 'Dados inválidos', details: err.errors },
        { status: 400 }
      )
    }
    console.error(`[DISPOSITIVOS/ATIVAR:${requestId}] ❌ Erro interno:`, err)
    console.log(`[DISPOSITIVOS/ATIVAR:${requestId}] ========== ATIVAÇÃO END (500) ==========\n`)
    return NextResponse.json(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    )
  }
}
