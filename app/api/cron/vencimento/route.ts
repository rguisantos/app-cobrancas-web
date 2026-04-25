// app/api/cron/vencimento/route.ts
// Verifica cobranças pendentes cujo dataVencimento já passou e atualiza para "Atrasado"
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession } from '@/lib/api-helpers'

/** Verifica se a requisição está autorizada (CRON_SECRET ou sessão admin) */
async function isAuthorized(req: NextRequest): Promise<boolean> {
  // 1. Verificar CRON_SECRET no header ou query
  const cronSecret = req.headers.get('x-cron-secret') 
    || req.nextUrl.searchParams.get('secret')
  if (cronSecret && cronSecret === process.env.CRON_SECRET) {
    return true
  }

  // 2. Verificar sessão admin
  const session = await getAuthSession()
  if (session?.user?.tipoPermissao === 'Administrador') {
    return true
  }

  return false
}

export async function POST(req: NextRequest) {
  // Autorização
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const hoje = new Date()
    // Formatar data de hoje como string YYYY-MM-DD para comparação com campo String
    const hojeStr = hoje.toISOString().split('T')[0]

    // Buscar cobranças pendentes com vencimento passado
    const cobrancasVencidas = await prisma.cobranca.findMany({
      where: {
        status: 'Pendente',
        dataVencimento: { not: null },
        deletedAt: null,
      },
      select: {
        id: true,
        dataVencimento: true,
        clienteNome: true,
        produtoIdentificador: true,
        totalClientePaga: true,
      },
    })

    // Filtrar apenas as que realmente venceram (comparação de strings YYYY-MM-DD)
    const vencidas = cobrancasVencidas.filter(c => {
      if (!c.dataVencimento) return false
      return c.dataVencimento < hojeStr
    })

    const ids = vencidas.map(c => c.id)

    if (ids.length === 0) {
      return NextResponse.json({
        success: true,
        updated: 0,
        message: 'Nenhuma cobrança vencida encontrada',
        cobrancas: [],
      })
    }

    // Atualizar todas para "Atrasado"
    await prisma.cobranca.updateMany({
      where: { id: { in: ids } },
      data: {
        status: 'Atrasado',
        needsSync: true,
        syncStatus: 'pending',
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      updated: ids.length,
      message: `${ids.length} cobrança(s) atualizada(s) para "Atrasado"`,
      cobrancas: vencidas.map(c => ({
        id: c.id,
        clienteNome: c.clienteNome,
        produtoIdentificador: c.produtoIdentificador,
        dataVencimento: c.dataVencimento,
        totalClientePaga: c.totalClientePaga,
      })),
    })
  } catch (error) {
    console.error('[CRON vencimento]', error)
    return NextResponse.json(
      { error: 'Erro interno ao verificar vencimentos' },
      { status: 500 }
    )
  }
}

// GET para preview (não atualiza, apenas lista o que seria afetado)
export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const hoje = new Date()
    const hojeStr = hoje.toISOString().split('T')[0]

    const cobrancasVencidas = await prisma.cobranca.findMany({
      where: {
        status: 'Pendente',
        dataVencimento: { not: null },
        deletedAt: null,
      },
      select: {
        id: true,
        dataVencimento: true,
        clienteNome: true,
        produtoIdentificador: true,
        totalClientePaga: true,
        locacaoId: true,
      },
    })

    const vencidas = cobrancasVencidas.filter(c => {
      if (!c.dataVencimento) return false
      return c.dataVencimento < hojeStr
    })

    return NextResponse.json({
      total: vencidas.length,
      cobrancas: vencidas.map(c => ({
        id: c.id,
        clienteNome: c.clienteNome,
        produtoIdentificador: c.produtoIdentificador,
        dataVencimento: c.dataVencimento,
        totalClientePaga: c.totalClientePaga,
      })),
    })
  } catch (error) {
    console.error('[CRON vencimento preview]', error)
    return NextResponse.json(
      { error: 'Erro interno ao buscar cobranças vencidas' },
      { status: 500 }
    )
  }
}
