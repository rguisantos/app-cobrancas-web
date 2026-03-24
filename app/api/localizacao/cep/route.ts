// GET /api/localizacao/cep?cep=XXXXX-XXX
// Busca endereço pelo CEP usando a API ViaCEP
import { NextRequest, NextResponse } from 'next/server'

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
