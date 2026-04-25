// POST /api/mapa/seed-coordinates — Seeds latitude/longitude for clientes that don't have them
// Uses hardcoded coordinates for common cities in Mato Grosso do Sul
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, forbidden, serverError } from '@/lib/api-helpers'

// Approximate coordinates for common cities in MS, Brazil
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Campo Grande': { lat: -20.4435, lng: -54.6478 },
  'Dourados': { lat: -22.2219, lng: -54.8054 },
  'Três Lagoas': { lat: -20.7519, lng: -51.7242 },
  'Corumbá': { lat: -19.0097, lng: -57.6528 },
  'Ponta Porã': { lat: -22.5361, lng: -55.7261 },
  'Naviraí': { lat: -23.0633, lng: -54.1933 },
  'Nova Andradina': { lat: -21.7156, lng: -53.3306 },
  'Aquidauana': { lat: -20.4694, lng: -55.7911 },
  'Paranaíba': { lat: -19.6769, lng: -51.1861 },
  'Maracaju': { lat: -21.6147, lng: -55.1664 },
  'Sidrolândia': { lat: -20.9311, lng: -54.9681 },
  'Coxim': { lat: -19.5328, lng: -54.7608 },
  'Rio Verde de Mato Grosso': { lat: -19.3667, lng: -54.2167 },
  'São Gabriel do Oeste': { lat: -19.2019, lng: -54.5864 },
  'Ribas do Rio Pardo': { lat: -20.4403, lng: -53.7619 },
  'Água Clara': { lat: -20.0833, lng: -52.8833 },
  'Anastácio': { lat: -20.4869, lng: -55.8019 },
  'Bonito': { lat: -21.1264, lng: -56.4922 },
  'Caarapó': { lat: -22.6333, lng: -54.8167 },
  'Cassilândia': { lat: -19.1167, lng: -51.7333 },
  'Chapadão do Sul': { lat: -18.7500, lng: -52.6167 },
  'Glória de Dourados': { lat: -22.4000, lng: -54.2333 },
  'Iguatemi': { lat: -23.2500, lng: -54.5500 },
  'Itaporã': { lat: -22.0667, lng: -54.9500 },
  'Ivinhema': { lat: -22.3000, lng: -53.8167 },
  'Jardim': { lat: -21.4833, lng: -56.1500 },
  'Ladário': { lat: -19.0064, lng: -57.5947 },
  'Miranda': { lat: -20.2333, lng: -56.3833 },
  'Mundo Novo': { lat: -23.8667, lng: -54.0000 },
  'Nioaque': { lat: -20.8167, lng: -55.8167 },
  'Nova Alvorada do Sul': { lat: -21.4500, lng: -54.4500 },
  'Porto Murtinho': { lat: -21.7000, lng: -57.8833 },
  'Rochedo': { lat: -19.7500, lng: -54.8833 },
  'Selvíria': { lat: -20.3500, lng: -51.4167 },
  'Sonora': { lat: -17.7500, lng: -54.5833 },
  'Tacuru': { lat: -22.7833, lng: -54.6833 },
  'Terenos': { lat: -20.4333, lng: -54.8667 },
  'Bela Vista': { lat: -22.1167, lng: -56.5167 },
  'Caracol': { lat: -19.8167, lng: -57.0167 },
  'Deodápolis': { lat: -22.2500, lng: -54.2167 },
  'Eldorado': { lat: -23.8000, lng: -54.2667 },
  'Fátima do Sul': { lat: -22.3333, lng: -54.5167 },
  'Japorã': { lat: -23.1500, lng: -54.4167 },
  'Laguna Carapã': { lat: -22.5000, lng: -55.0500 },
  'Novo Horizonte do Sul': { lat: -22.7000, lng: -53.8500 },
  'Paranhos': { lat: -23.3833, lng: -55.2167 },
  'Pedro Gomes': { lat: -18.8667, lng: -53.8000 },
  'Sete Quedas': { lat: -24.0000, lng: -55.0000 },
  'Taquarussu': { lat: -20.2833, lng: -55.4333 },
  'Dois Irmãos do Buriti': { lat: -20.3333, lng: -55.3833 },
  'Guia Lopes da Laguna': { lat: -21.0333, lng: -56.0833 },
  'Itaquiraí': { lat: -23.6167, lng: -54.3667 },
  'Jateí': { lat: -22.5167, lng: -53.7333 },
  'Angélica': { lat: -22.0667, lng: -53.7500 },
  'Antônio João': { lat: -22.2333, lng: -55.7833 },
  'Aral Moreira': { lat: -23.0500, lng: -54.9833 },
  'Bataiporã': { lat: -22.0167, lng: -53.3833 },
  'Anaurilândia': { lat: -22.1833, lng: -53.2000 },
}

// Add slight randomization to avoid all markers stacking on the same point
function addJitter(coord: number, maxOffset: number = 0.008): number {
  const jitter = (Math.random() - 0.5) * 2 * maxOffset
  return coord + jitter
}

export async function POST() {
  const session = await getAuthSession()
  if (!session) return unauthorized()
  if (session.user.tipoPermissao !== 'Administrador') {
    return forbidden('Apenas administradores podem executar esta ação')
  }

  try {
    // Find all clientes without coordinates
    const clientesSemCoords = await prisma.cliente.findMany({
      where: {
        deletedAt: null,
        latitude: null,
        longitude: null,
      },
      select: {
        id: true,
        cidade: true,
      },
    })

    if (clientesSemCoords.length === 0) {
      return NextResponse.json({
        message: 'Todos os clientes já possuem coordenadas',
        updated: 0,
      })
    }

    let updated = 0
    let unmatched = 0

    for (const cliente of clientesSemCoords) {
      const coords = CITY_COORDINATES[cliente.cidade]
      if (coords) {
        await prisma.cliente.update({
          where: { id: cliente.id },
          data: {
            latitude: addJitter(coords.lat),
            longitude: addJitter(coords.lng),
          },
        })
        updated++
      } else {
        unmatched++
      }
    }

    return NextResponse.json({
      message: `Coordenadas atualizadas para ${updated} cliente(s)`,
      updated,
      unmatched,
      unmatchedCities: unmatched > 0
        ? [...new Set(clientesSemCoords.filter(c => !CITY_COORDINATES[c.cidade]).map(c => c.cidade))]
        : [],
    })
  } catch (error) {
    console.error('[POST /api/mapa/seed-coordinates]', error)
    return serverError()
  }
}
