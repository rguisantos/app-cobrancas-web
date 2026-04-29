import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, forbidden, handleApiError } from '@/lib/api-helpers'

// POST /api/mapa/geocodificar — Geocodificar endereços usando Nominatim (OpenStreetMap)
export async function POST(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()
  if (session.user.tipoPermissao !== 'Administrador') {
    return forbidden('Apenas administradores podem geocodificar endereços')
  }

  try {
    const body = await request.json()
    const { clienteId, forcar } = body

    // Se clienteId especificado, geocodificar apenas esse cliente
    // Se não, geocodificar todos que não têm coordenadas (ou forcar=true todos)
    const where: any = {
      deletedAt: null,
    }
    if (clienteId) {
      where.id = clienteId
    } else if (!forcar) {
      where.latitude = null
      where.longitude = null
    }

    const clientes = await prisma.cliente.findMany({
      where,
      select: {
        id: true,
        nomeExibicao: true,
        logradouro: true,
        numero: true,
        bairro: true,
        cidade: true,
        estado: true,
        cep: true,
        latitude: true,
        longitude: true,
      },
      take: forcar ? 200 : 100, // Limitar para não sobrecarregar
    })

    const resultados: { id: string; nome: string; lat: number | null; lng: number | null; status: string }[] = []
    let geocodificados = 0
    let erros = 0
    let jaPossuiam = 0

    for (const cliente of clientes) {
      // Pular se já tem coordenadas e não está forçando
      if (cliente.latitude && cliente.longitude && !forcar && !clienteId) {
        jaPossuiam++
        resultados.push({
          id: cliente.id,
          nome: cliente.nomeExibicao,
          lat: cliente.latitude,
          lng: cliente.longitude,
          status: 'ja_possui',
        })
        continue
      }

      // Montar endereço para busca
      const partes = [
        cliente.logradouro,
        cliente.numero,
        cliente.bairro,
        cliente.cidade,
        cliente.estado,
        'Brasil',
      ].filter(Boolean)

      const endereco = partes.join(', ')

      if (!endereco || endereco.length < 5) {
        resultados.push({
          id: cliente.id,
          nome: cliente.nomeExibicao,
          lat: null,
          lng: null,
          status: 'sem_endereco',
        })
        erros++
        continue
      }

      try {
        // Nominatim API (OpenStreetMap) - gratuito, limitado a 1 req/seg
        const query = encodeURIComponent(endereco)
        const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=br`

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'AppCobrancas/1.0 (sistema de gestão)',
          },
        })

        if (!response.ok) {
          resultados.push({
            id: cliente.id,
            nome: cliente.nomeExibicao,
            lat: null,
            lng: null,
            status: 'erro_api',
          })
          erros++
          continue
        }

        const data = await response.json()

        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat)
          const lng = parseFloat(data[0].lon)

          // Atualizar cliente com coordenadas
          await prisma.cliente.update({
            where: { id: cliente.id },
            data: { latitude: lat, longitude: lng, needsSync: true, version: { increment: 1 }, deviceId: 'web' },
          })

          resultados.push({
            id: cliente.id,
            nome: cliente.nomeExibicao,
            lat,
            lng,
            status: 'geocodificado',
          })
          geocodificados++
        } else {
          // Tentar busca apenas com cidade/estado
          const enderecoSimples = `${cliente.cidade}, ${cliente.estado}, Brasil`
          const querySimples = encodeURIComponent(enderecoSimples)
          const urlSimples = `https://nominatim.openstreetmap.org/search?q=${querySimples}&format=json&limit=1&countrycodes=br`

          const responseSimples = await fetch(urlSimples, {
            headers: {
              'User-Agent': 'AppCobrancas/1.0 (sistema de gestão)',
            },
          })

          if (responseSimples.ok) {
            const dataSimples = await responseSimples.json()
            if (dataSimples && dataSimples.length > 0) {
              const lat = parseFloat(dataSimples[0].lat)
              const lng = parseFloat(dataSimples[0].lon)

              await prisma.cliente.update({
                where: { id: cliente.id },
                data: { latitude: lat, longitude: lng, needsSync: true, version: { increment: 1 }, deviceId: 'web' },
              })

              resultados.push({
                id: cliente.id,
                nome: cliente.nomeExibicao,
                lat,
                lng,
                status: 'geocodificado_parcial',
              })
              geocodificados++
              continue
            }
          }

          resultados.push({
            id: cliente.id,
            nome: cliente.nomeExibicao,
            lat: null,
            lng: null,
            status: 'nao_encontrado',
          })
          erros++
        }

        // Respeitar limite de 1 req/seg do Nominatim
        await new Promise(resolve => setTimeout(resolve, 1100))

      } catch (err) {
        console.error(`Erro ao geocodificar ${cliente.nomeExibicao}:`, err)
        resultados.push({
          id: cliente.id,
          nome: cliente.nomeExibicao,
          lat: null,
          lng: null,
          status: 'erro',
        })
        erros++
      }
    }

    return NextResponse.json({
      total: clientes.length,
      geocodificados,
      jaPossuiam,
      erros,
      resultados,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
