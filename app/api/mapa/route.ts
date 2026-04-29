import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getAuthSession, getUserRotaIds, unauthorized, handleApiError } from '@/lib/api-helpers'

// GET /api/mapa — Buscar dados do mapa (clientes com coordenadas)
export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  try {
    const { searchParams } = new URL(request.url)
    const rotaId = searchParams.get('rotaId')

    // Controle de acesso por rota
    const userRotaIds = await getUserRotaIds(session)

    // Se AcessoControlado sem rotas atribuídas, retornar vazio
    if (userRotaIds !== null && userRotaIds.length === 0) {
      return NextResponse.json({ clientes: [], rotas: [] })
    }

    // Filtro de rota: query param OU restrição do usuário
    let rotaFilter: Prisma.Sql
    if (userRotaIds !== null) {
      // AcessoControlado: filtrar pelas rotas do usuário
      if (rotaId && !userRotaIds.includes(rotaId)) {
        return NextResponse.json({ clientes: [], rotas: [] })
      }
      const rotaIds = rotaId ? [rotaId] : userRotaIds
      rotaFilter = Prisma.sql`AND c."rotaId" IN (${Prisma.join(rotaIds)})`
    } else {
      // Admin/Secretário: filtro opcional por rota
      rotaFilter = rotaId
        ? Prisma.sql`AND c."rotaId" = ${rotaId}`
        : Prisma.empty
    }

    const clientes = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        c.id,
        c."nomeExibicao",
        CONCAT(c.logradouro, ', ', c.numero) as endereco,
        c.bairro,
        c.cidade,
        c.estado,
        c.latitude,
        c.longitude,
        c."rotaId",
        r.descricao as rota_nome,
        COALESCE(loc_ativas.count, 0)::int as locacoes_ativas,
        COALESCE(cob_pend.count, 0)::int as cobrancas_pendentes,
        COALESCE(cob_atras.count, 0)::int as cobrancas_atrasadas
      FROM clientes c
      INNER JOIN rotas r ON r.id = c."rotaId"
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int as count FROM locacoes l 
        WHERE l."clienteId" = c.id AND l.status = 'Ativa' AND l."deletedAt" IS NULL
      ) loc_ativas ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int as count FROM cobrancas cb
        INNER JOIN locacoes l ON l.id = cb."locacaoId"
        WHERE l."clienteId" = c.id AND cb.status IN ('Pendente', 'Parcial') AND cb."deletedAt" IS NULL
      ) cob_pend ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int as count FROM cobrancas cb
        INNER JOIN locacoes l ON l.id = cb."locacaoId"
        WHERE l."clienteId" = c.id AND cb.status = 'Atrasado' AND cb."deletedAt" IS NULL
      ) cob_atras ON true
      WHERE c.latitude IS NOT NULL 
        AND c.longitude IS NOT NULL
        AND c."deletedAt" IS NULL
        ${rotaFilter}
      ORDER BY r.descricao, c."nomeExibicao"
    `)

    // Filtro de rotas para a query de resumo
    let rotaFilterRotas: Prisma.Sql
    if (userRotaIds !== null) {
      const rotaIds = rotaId ? [rotaId] : userRotaIds
      rotaFilterRotas = Prisma.sql`AND r.id IN (${Prisma.join(rotaIds)})`
    } else {
      rotaFilterRotas = rotaId
        ? Prisma.sql`AND r.id = ${rotaId}`
        : Prisma.empty
    }

    const rotas = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT 
        r.id, 
        r.descricao as nome,
        COUNT(c.id)::int as total_clientes,
        AVG(c.latitude)::float as centro_lat,
        AVG(c.longitude)::float as centro_lng
      FROM rotas r
      LEFT JOIN clientes c ON c."rotaId" = r.id AND c."deletedAt" IS NULL AND c.latitude IS NOT NULL
      WHERE r."deletedAt" IS NULL
        ${rotaFilterRotas}
      GROUP BY r.id, r.descricao
      ORDER BY r.descricao
    `)

    return NextResponse.json({ clientes, rotas })
  } catch (error) {
    return handleApiError(error)
  }
}
