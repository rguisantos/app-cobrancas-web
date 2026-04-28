// GET /api/dispositivos — Listar dispositivos (requer admin)
// POST /api/dispositivos — Criar dispositivo (requer admin)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { gerarChaveAtivacao, gerarSenhaNumerica } from '@/lib/dispositivo-helpers'
import { z } from 'zod'

// Schema de validação para criação
const createSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  tipo: z.enum(['Celular', 'Tablet', 'Desktop']).default('Celular'),
  senhaNumerica: z.string().regex(/^\d{6}$/, 'Senha deve ter 6 dígitos').optional(),
})

// GET - Listar dispositivos (REQUER autenticação admin)
// Antes: sem autenticação — qualquer pessoa podia listar
export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user || session.user.tipoPermissao !== 'Administrador') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || undefined
    const tipo = searchParams.get('tipo') || undefined
    const busca = searchParams.get('busca') || undefined
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50))
    const skip = (page - 1) * limit

    // Construir filtros
    const where: any = {}
    if (status) where.status = status
    if (tipo) where.tipo = tipo
    if (busca) {
      where.OR = [
        { nome: { contains: busca, mode: 'insensitive' } },
        { chave: { contains: busca, mode: 'insensitive' } },
        { deviceName: { contains: busca, mode: 'insensitive' } },
      ]
    }

    const [dispositivos, total] = await Promise.all([
      prisma.dispositivo.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          nome: true,
          chave: true,
          senhaNumerica: true,
          deviceKey: true,
          deviceName: true,
          tipo: true,
          status: true,
          ativado: true,
          ultimaSincronizacao: true,
          createdAt: true,
          updatedAt: true,
        },
        skip,
        take: limit,
      }),
      prisma.dispositivo.count({ where }),
    ])

    return NextResponse.json({
      dispositivos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logger.error('[dispositivos] Erro ao listar:', error)
    return NextResponse.json({ error: 'Erro ao listar dispositivos' }, { status: 500 })
  }
}

// POST - Criar dispositivo (requer admin)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user || session.user.tipoPermissao !== 'Administrador') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const data = createSchema.parse(body)

    // Gerar chave e senha seguras (crypto.randomInt)
    const chave = gerarChaveAtivacao()
    const senhaNumerica = data.senhaNumerica || gerarSenhaNumerica()

    // Verificar se a chave já existe (colisão extremamente rara, mas possível)
    const existente = await prisma.dispositivo.findUnique({ where: { chave } })
    if (existente) {
      // Tentar novamente com nova chave
      const novaChave = gerarChaveAtivacao()
      const dispositivo = await prisma.dispositivo.create({
        data: {
          nome: data.nome,
          tipo: data.tipo,
          chave: novaChave,
          senhaNumerica,
          status: 'ativo',
        },
      })
      logger.info(`[dispositivos] Dispositivo criado (retry): ${dispositivo.id} - ${dispositivo.nome}`)
      return NextResponse.json(dispositivo, { status: 201 })
    }

    const dispositivo = await prisma.dispositivo.create({
      data: {
        nome: data.nome,
        tipo: data.tipo,
        chave,
        senhaNumerica,
        status: 'ativo',
      },
    })

    logger.info(`[dispositivos] Dispositivo criado: ${dispositivo.id} - ${dispositivo.nome}`)
    return NextResponse.json(dispositivo, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: err.errors }, { status: 400 })
    }
    logger.error('[dispositivos] Erro ao criar:', err)
    return NextResponse.json({ error: 'Erro ao criar dispositivo' }, { status: 500 })
  }
}
