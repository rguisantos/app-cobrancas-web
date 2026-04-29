// /api/equipamentos — LEGADO: redireciona para /api/dispositivos
// Este endpoint era usado pelo mobile para registrar dispositivos automaticamente.
// O fluxo correto agora é: admin cria dispositivo no web → mobile ativa com PIN.
// Mantido temporariamente para compatibilidade, mas marca como deprecated.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, forbidden, handleApiError } from '@/lib/api-helpers'
import { logger } from '@/lib/logger'
import { gerarSenhaNumerica } from '@/lib/dispositivo-helpers'
import { validateBody } from '@/lib/api-helpers'
import { z } from 'zod'

const schema = z.object({
  id:           z.string().optional(),
  nome:         z.string().min(1, 'Nome é obrigatório'),
  chave:        z.string().min(1, 'Chave é obrigatória'),
  tipo:         z.enum(['Celular', 'Tablet', 'Outro']).default('Celular'),
  dataCadastro: z.string().optional(),
})

// GET - Listar dispositivos (requer autenticação admin)
export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()
  if (session.user.tipoPermissao !== 'Administrador') {
    return forbidden('Acesso negado — apenas Administradores')
  }

  logger.warn('[equipamentos] GET /api/equipamentos é legado — use GET /api/dispositivos')

  try {
    const dispositivos = await prisma.dispositivo.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      count: dispositivos.length,
      // SEGURANÇA: senhaNumerica NUNCA é exposta
      dispositivos: dispositivos.map(d => ({
        id: d.id,
        nome: d.nome,
        tipo: d.tipo,
        status: d.status,
        chave: d.chave?.substring(0, 20) + '...',
        ultimaSincronizacao: d.ultimaSincronizacao,
        createdAt: d.createdAt,
      })),
    })
  } catch (err) {
    return handleApiError(err)
  }
}

// POST - Registrar/criar dispositivo (DEPRECATED — requer auth de admin)
// O mobile deve usar o fluxo de ativação com PIN (POST /api/dispositivos/ativar)
export async function POST(req: NextRequest) {
  // SEGURANÇA: Agora requer autenticação de admin
  const session = await getAuthSession()
  if (!session) return unauthorized()
  if (session.user.tipoPermissao !== 'Administrador') {
    return forbidden('Use POST /api/dispositivos/ativar para ativar dispositivos')
  }

  logger.warn('[equipamentos] POST /api/equipamentos é DEPRECATED — use POST /api/dispositivos/ativar')

  try {
    const body = await req.json()
    const data = schema.parse(body)

    // Verificar se já existe dispositivo com esta chave
    const existente = await prisma.dispositivo.findUnique({
      where: { chave: data.chave },
    })

    if (existente) {
      // Atualizar existente
      const dispositivo = await prisma.dispositivo.update({
        where: { chave: data.chave },
        data: {
          nome: data.nome,
          status: 'ativo',
          updatedAt: new Date(),
        },
      })

      return NextResponse.json({
        success: true,
        id: dispositivo.id,
        _deprecated: 'Use POST /api/dispositivos/ativar para ativar dispositivos',
      })
    }

    // Criar novo dispositivo com PIN seguro
    const senhaNumerica = gerarSenhaNumerica()

    const dispositivo = await prisma.dispositivo.create({
      data: {
        id: data.id || `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        nome: data.nome,
        chave: data.chave,
        tipo: data.tipo,
        status: 'pendente',
        senhaNumerica,
      },
    })

    logger.info(`[equipamentos] Dispositivo criado (legado): ${dispositivo.id}`)

    return NextResponse.json({
      success: true,
      id: dispositivo.id,
      senhaNumerica: dispositivo.senhaNumerica,
      _deprecated: 'Use POST /api/dispositivos/ativar para ativar dispositivos',
    }, { status: 201 })

  } catch (err) {
    return handleApiError(err)
  }
}
