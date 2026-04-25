// GET /api/localizacao/estados
// Lista todos os estados brasileiros (IBGE)
import { NextResponse } from 'next/server'

// Auth helper: aceita NextAuth session (web) OU JWT Bearer (mobile)
async function isAuthenticated(req: import('next/server').NextRequest): Promise<boolean> {
  // 1. Tentar NextAuth session (usado pelo web client via cookie)
  const { getServerSession } = await import('next-auth')
  const { authOptions }      = await import('@/lib/auth')
  const session = await getServerSession(authOptions)
  if (session) return true

  // 2. Tentar JWT Bearer (usado pelo app mobile)
  const { extrairToken, verificarToken } = await import('@/lib/jwt')
  const token = extrairToken(req.headers.get('Authorization'))
  if (token && verificarToken(token)) return true

  return false
}

export async function GET(req: import('next/server').NextRequest) {
  // Verificar autenticação
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados')
    const data = await response.json()

    const estados = data
      .map((estado: any) => ({
        id: estado.id,
        sigla: estado.sigla,
        nome: estado.nome,
      }))
      .sort((a: any, b: any) => a.sigla.localeCompare(b.sigla))

    return NextResponse.json(estados)
  } catch (error) {
    console.error('[ESTADOS] Erro ao buscar:', error)
    return NextResponse.json({ error: 'Erro ao buscar estados' }, { status: 500 })
  }
}
