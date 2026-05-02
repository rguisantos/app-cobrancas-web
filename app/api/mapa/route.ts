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
      return NextResponse.json({ clientes: [], rotas: [], stats: { totalClientes: 0, totalNoMapa: 0, valorPendente: 0, valorAtrasado: 0, valorRecebido: 0, semCoordenadas: 0 } })
    }

    // Filtro de rota: query param OU restrição do usuário
    let rotaFilter: Prisma.Sql
    if (userRotaIds !== null) {
      // AcessoControlado: filtrar pelas rotas do usuário
      if (rotaId && !userRotaIds.includes(rotaId)) {
        return NextResponse.json({ clientes: [], rotas: [], stats: { totalClientes: 0, totalNoMapa: 0, valorPendente: 0, valorAtrasado: 0, valorRecebido: 0, semCoordenadas: 0 } })
      }
      const rotaIds = rotaId ? [rotaId] : userRotaIds
      rotaFilter = Prisma.sql`AND c."rotaId" IN (${Prisma.join(rotaIds)})`
    } else {
      // Admin/Secretário: filtro opcional por rota
      rotaFilter = rotaId
        ? Prisma.sql`AND c."rotaId" = ${rotaId}`
        : Prisma.empty
    }

    // Clientes com coordenadas + dados financeiros
    const clientes = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        c.id,
        c."nomeExibicao",
        c.identificador,
        CONCAT(c.logradouro, ', ', c.numero) as endereco,
        c.bairro,
        c.cidade,
        c.estado,
        c.latitude,
        c.longitude,
        c."rotaId",
        r.descricao as rota_nome,
        r.cor as rota_cor,
        COALESCE(loc_ativas.count, 0)::int as locacoes_ativas,
        COALESCE(cob_pend.count, 0)::int as cobrancas_pendentes,
        COALESCE(cob_atras.count, 0)::int as cobrancas_atrasadas,
        COALESCE(val_pend.total, 0)::float as valor_pendente,
        COALESCE(val_atras.total, 0)::float as valor_atrasado,
        COALESCE(val_rec.total, 0)::float as valor_recebido
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
      LEFT JOIN LATERAL (
        SELECT SUM(cb."totalClientePaga")::float as total FROM cobrancas cb
        INNER JOIN locacoes l ON l.id = cb."locacaoId"
        WHERE l."clienteId" = c.id AND cb.status IN ('Pendente', 'Parcial') AND cb."deletedAt" IS NULL
      ) val_pend ON true
      LEFT JOIN LATERAL (
        SELECT SUM(cb."totalClientePaga")::float as total FROM cobrancas cb
        INNER JOIN locacoes l ON l.id = cb."locacaoId"
        WHERE l."clienteId" = c.id AND cb.status = 'Atrasado' AND cb."deletedAt" IS NULL
      ) val_atras ON true
      LEFT JOIN LATERAL (
        SELECT SUM(cb."valorRecebido")::float as total FROM cobrancas cb
        INNER JOIN locacoes l ON l.id = cb."locacaoId"
        WHERE l."clienteId" = c.id AND cb.status IN ('Pago', 'Parcial') AND cb."deletedAt" IS NULL
      ) val_rec ON true
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

    // Rotas com cor do banco + dados financeiros agregados
    const rotas = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT 
        r.id, 
        r.descricao as nome,
        r.cor,
        r.status,
        COUNT(c.id)::int as total_clientes,
        AVG(c.latitude)::float as centro_lat,
        AVG(c.longitude)::float as centro_lng,
        COALESCE(SUM(
          CASE WHEN cb.status = 'Atrasado' THEN cb."totalClientePaga" ELSE 0 END
        ), 0)::float as valor_atrasado,
        COALESCE(SUM(
          CASE WHEN cb.status IN ('Pendente', 'Parcial') THEN cb."totalClientePaga" ELSE 0 END
        ), 0)::float as valor_pendente
      FROM rotas r
      LEFT JOIN clientes c ON c."rotaId" = r.id AND c."deletedAt" IS NULL AND c.latitude IS NOT NULL
      LEFT JOIN locacoes l ON l."clienteId" = c.id AND l.status = 'Ativa' AND l."deletedAt" IS NULL
      LEFT JOIN cobrancas cb ON cb."locacaoId" = l.id AND cb."deletedAt" IS NULL AND cb.status IN ('Pendente', 'Parcial', 'Atrasado')
      WHERE r."deletedAt" IS NULL
        ${rotaFilterRotas}
      GROUP BY r.id, r.descricao, r.cor, r.status
      ORDER BY r.descricao
    `)

    // Contagem de clientes sem coordenadas (para exibir no mapa)
    let semCoordenadasFilter: Prisma.Sql
    if (userRotaIds !== null) {
      const rotaIds = rotaId ? [rotaId] : userRotaIds
      semCoordenadasFilter = Prisma.sql`AND "rotaId" IN (${Prisma.join(rotaIds)})`
    } else {
      semCoordenadasFilter = rotaId
        ? Prisma.sql`AND "rotaId" = ${rotaId}`
        : Prisma.empty
    }

    const semCoordResult = await prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      SELECT COUNT(*)::int as count FROM clientes
      WHERE "deletedAt" IS NULL
        AND (latitude IS NULL OR longitude IS NULL)
        ${semCoordenadasFilter}
    `)

    // Stats gerais
    const totalClientes = clientes.length
    const valorPendente = clientes.reduce((s: number, c: any) => s + (c.valor_pendente || 0), 0)
    const valorAtrasado = clientes.reduce((s: number, c: any) => s + (c.valor_atrasado || 0), 0)
    const valorRecebido = clientes.reduce((s: number, c: any) => s + (c.valor_recebido || 0), 0)

    return NextResponse.json({
      clientes,
      rotas,
      stats: {
        totalClientes,
        totalNoMapa: totalClientes,
        valorPendente,
        valorAtrasado,
        valorRecebido,
        semCoordenadas: Number(semCoordResult[0]?.count || 0),
      }
    })
  } catch (error) {
    return handleApiError(error)
  }
}
