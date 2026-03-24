// GET /api/localizacao/estados
// Lista todos os estados brasileiros (IBGE)
import { NextResponse } from 'next/server'

export async function GET() {
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
