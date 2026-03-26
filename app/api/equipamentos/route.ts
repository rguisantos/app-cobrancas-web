// POST /api/equipamentos — Mobile registra dispositivo ou admin cria
// Gera senha numérica de 6 dígitos para primeiro acesso
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

// Gerar senha numérica de 6 dígitos
function gerarSenhaNumerica(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

const schema = z.object({
  id:            z.string().optional(),
  nome:          z.string().min(1, 'Nome é obrigatório'),
  chave:         z.string().min(1, 'Chave é obrigatória'),
  tipo:          z.enum(['Celular', 'Tablet', 'Outro']).default('Celular'),
  dataCadastro:  z.string().optional(),
})

// GET - Listar dispositivos (requer autenticação de admin)
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.user.tipoPermissao !== 'Administrador') {
    // Permitir acesso sem auth para debug em desenvolvimento
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
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
      dispositivos: dispositivos.map(d => ({
        id: d.id,
        nome: d.nome,
        tipo: d.tipo,
        status: d.status,
        senhaNumerica: d.senhaNumerica,
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

// POST - Registrar/criar dispositivo
export async function POST(req: NextRequest) {
  const requestId = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  console.log(`\n[EQUIPAMENTOS:${requestId}] ========== REGISTRO DE DISPOSITIVO START ==========`)
  console.log(`[EQUIPAMENTOS:${requestId}] Timestamp: ${new Date().toISOString()}`)

  try {
    const body = await req.json()
    console.log(`[EQUIPAMENTOS:${requestId}] Body recebido:`, JSON.stringify(body))
    
    const data = schema.parse(body)
    console.log(`[EQUIPAMENTOS:${requestId}] Dados validados:`)
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
        senhaNumerica: dispositivo.senhaNumerica,
      })
    }

    // Criar novo dispositivo com senha numérica
    const senhaNumerica = gerarSenhaNumerica()
    console.log(`[EQUIPAMENTOS:${requestId}] Gerando senha numérica: ${senhaNumerica}`)
    
    const dispositivo = await prisma.dispositivo.create({
      data: {
        id: data.id || `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        nome: data.nome,
        chave: data.chave,
        tipo: data.tipo,
        status: 'ativo',
        senhaNumerica,
      },
    })

    console.log(`[EQUIPAMENTOS:${requestId}] ✅ Dispositivo criado com sucesso!`)
    console.log(`[EQUIPAMENTOS:${requestId}]   ID: ${dispositivo.id}`)
    console.log(`[EQUIPAMENTOS:${requestId}]   Nome: ${dispositivo.nome}`)
    console.log(`[EQUIPAMENTOS:${requestId}]   Senha Numérica: ${dispositivo.senhaNumerica}`)
    console.log(`[EQUIPAMENTOS:${requestId}]   Status: ${dispositivo.status}`)
    console.log(`[EQUIPAMENTOS:${requestId}] ========== REGISTRO DE DISPOSITIVO END (201) ==========\n`)
    
    return NextResponse.json({ 
      success: true, 
      id: dispositivo.id,
      senhaNumerica: dispositivo.senhaNumerica,
    }, { status: 201 })
    
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
