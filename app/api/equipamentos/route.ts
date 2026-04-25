// POST /api/equipamentos — Mobile registra dispositivo ou admin cria
// Gera senha numérica de 6 dígitos para primeiro acesso
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession } from '@/lib/api-helpers'
import { z } from 'zod'
import crypto from 'crypto'

// Gerar PIN de 6 dígitos com crypto seguro
function gerarSenhaNumerica(): string {
  return crypto.randomInt(100000, 1000000).toString()
}

const schema = z.object({
  id:           z.string().optional(),
  nome:         z.string().min(1, 'Nome é obrigatório'),
  chave:        z.string().min(1, 'Chave é obrigatória'),
  tipo:         z.enum(['Celular', 'Tablet', 'Outro']).default('Celular'),
  dataCadastro: z.string().optional(),
})

// GET - Listar dispositivos (requer autenticação de admin via NextAuth)
export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
  if (session.user.tipoPermissao !== 'Administrador') {
    return NextResponse.json({ error: 'Acesso negado — apenas Administradores' }, { status: 403 })
  }

  const requestId = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  console.log(`\n[EQUIPAMENTOS:${requestId}] ========== LISTAR DISPOSITIVOS ==========`)

  try {
    const dispositivos = await prisma.dispositivo.findMany({
      orderBy: { createdAt: 'desc' },
    })

    console.log(`[EQUIPAMENTOS:${requestId}] Encontrados ${dispositivos.length} dispositivos`)

    return NextResponse.json({
      success: true,
      count: dispositivos.length,
      // SEGURANÇA: senhaNumerica NUNCA é exposta após a criação
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
    console.error(`[EQUIPAMENTOS:${requestId}] Erro:`, err)
    return NextResponse.json({ success: false, error: 'Erro ao listar dispositivos' }, { status: 500 })
  }
}

// POST - Registrar/criar dispositivo (chamado pelo mobile — não requer sessão web)
export async function POST(req: NextRequest) {
  const requestId = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  console.log(`\n[EQUIPAMENTOS:${requestId}] ========== REGISTRO DE DISPOSITIVO START ==========`)
  console.log(`[EQUIPAMENTOS:${requestId}] Timestamp: ${new Date().toISOString()}`)

  try {
    const body = await req.json()
    console.log(`[EQUIPAMENTOS:${requestId}] Body recebido:`, JSON.stringify(body))

    const data = schema.parse(body)
    console.log(`[EQUIPAMENTOS:${requestId}] Dados validados: Nome=${data.nome}, Tipo=${data.tipo}`)

    // Verificar se já existe dispositivo com esta chave
    const existente = await prisma.dispositivo.findUnique({
      where: { chave: data.chave },
    })

    if (existente) {
      console.log(`[EQUIPAMENTOS:${requestId}] Dispositivo já existe, atualizando...`)

      const dispositivo = await prisma.dispositivo.update({
        where: { chave: data.chave },
        data: {
          nome: data.nome,
          status: 'ativo',
          updatedAt: new Date(),
        },
      })

      console.log(`[EQUIPAMENTOS:${requestId}] ✅ Dispositivo atualizado!`)
      console.log(`[EQUIPAMENTOS:${requestId}] ========== REGISTRO DE DISPOSITIVO END (200) ==========\n`)

      return NextResponse.json({
        success: true,
        id: dispositivo.id,
        // Não retornar senhaNumerica aqui — dispositivo já foi ativado anteriormente
      })
    }

    // Criar novo dispositivo com PIN seguro
    const senhaNumerica = gerarSenhaNumerica()
    console.log(`[EQUIPAMENTOS:${requestId}] PIN gerado (crypto.randomInt)`)

    const dispositivo = await prisma.dispositivo.create({
      data: {
        id: data.id || `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        nome: data.nome,
        chave: data.chave,
        tipo: data.tipo,
        status: 'pendente', // Inicia como pendente — só ativa após confirmação com PIN
        senhaNumerica,
      },
    })

    console.log(`[EQUIPAMENTOS:${requestId}] ✅ Dispositivo criado! ID: ${dispositivo.id}`)
    console.log(`[EQUIPAMENTOS:${requestId}] ========== REGISTRO DE DISPOSITIVO END (201) ==========\n`)

    // senhaNumerica retornada APENAS na criação, para o admin comunicar ao usuário
    return NextResponse.json({
      success: true,
      id: dispositivo.id,
      senhaNumerica: dispositivo.senhaNumerica,
    }, { status: 201 })

  } catch (err) {
    if (err instanceof z.ZodError) {
      console.error(`[EQUIPAMENTOS:${requestId}] ❌ Erro de validação:`, err.errors)
      return NextResponse.json({ success: false, error: 'Dados inválidos', details: err.errors }, { status: 400 })
    }
    console.error(`[EQUIPAMENTOS:${requestId}] ❌ Erro interno:`, err)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
