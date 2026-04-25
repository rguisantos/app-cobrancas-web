import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rotaId = searchParams.get('rotaId')

    const rotaFilter = rotaId
      ? Prisma.sql`AND c."rotaId" = ${rotaId}`
      : Prisma.empty

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
      ${rotaId ? Prisma.sql`AND r.id = ${rotaId}` : Prisma.empty}
      GROUP BY r.id, r.descricao
      ORDER BY r.descricao
    `)

    return NextResponse.json({ clientes, rotas })
  } catch (error) {
    console.error('Erro ao buscar dados do mapa:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar dados do mapa' },
      { status: 500 }
    )
  }
}
