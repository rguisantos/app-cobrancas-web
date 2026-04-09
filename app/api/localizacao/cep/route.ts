// GET /api/localizacao/cep?cep=XXXXX-XXX
// Busca endereço pelo CEP usando a API ViaCEP
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
  const cep = searchParams.get('cep')?.replace(/\D/g, '')

  if (!cep || cep.length !== 8) {
    return NextResponse.json({ error: 'CEP inválido' }, { status: 400 })
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
    const data = await response.json()

    if (data.erro) {
      return NextResponse.json({ error: 'CEP não encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      cep: data.cep,
      logradouro: data.logradouro,
      complemento: data.complemento,
      bairro: data.bairro,
      cidade: data.localidade,
      estado: data.uf,
      ibge: data.ibge,
    })
  } catch (error) {
    console.error('[CEP] Erro ao buscar:', error)
    return NextResponse.json({ error: 'Erro ao buscar CEP' }, { status: 500 })
  }
}
