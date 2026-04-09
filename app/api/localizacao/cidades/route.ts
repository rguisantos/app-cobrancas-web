// GET /api/localizacao/cidades?uf=XX
// Lista cidades por estado (IBGE)
import { NextRequest, NextResponse } from 'next/server'

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const uf = searchParams.get('uf')

  if (!uf) {
    return NextResponse.json({ error: 'UF não informada' }, { status: 400 })
  }

  try {
    const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`)
    const data = await response.json()

    const cidades = data
      .map((cidade: any) => ({
        id: cidade.id,
        nome: cidade.nome,
      }))
      .sort((a: any, b: any) => a.nome.localeCompare(b.nome))

    return NextResponse.json(cidades)
  } catch (error) {
    console.error('[CIDADES] Erro ao buscar:', error)
    return NextResponse.json({ error: 'Erro ao buscar cidades' }, { status: 500 })
  }
}
