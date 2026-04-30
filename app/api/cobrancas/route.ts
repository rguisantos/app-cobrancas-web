import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, getUserRotaIds, unauthorized, forbidden, serverError } from '@/lib/api-helpers'
import { z } from 'zod'

// Schema explícito — sem mass assignment
const createSchema = z.object({
  id:                   z.string().optional(),
  locacaoId:            z.string(),
  clienteId:            z.string(),
  clienteNome:          z.string(),
  produtoId:            z.string().optional(),
  produtoIdentificador: z.string(),
  dataInicio:           z.string(),
  dataFim:              z.string(),
  dataPagamento:        z.string().optional().nullable(),
  relogioAnterior:      z.number(),
  relogioAtual:         z.number(),
  fichasRodadas:        z.number(),
  valorFicha:           z.number(),
  totalBruto:           z.number(),
  descontoPartidasQtd:  z.number().optional().nullable(),
  descontoPartidasValor:z.number().optional().nullable(),
  descontoDinheiro:     z.number().optional().nullable(),
  percentualEmpresa:    z.number(),
  subtotalAposDescontos:z.number(),
  valorPercentual:      z.number(),
  totalClientePaga:     z.number(),
  valorRecebido:        z.number(),
  saldoAnterior:        z.coerce.number().optional().default(0),
  saldoDevedorGerado:   z.number(),
  status:               z.enum(['Pago', 'Parcial', 'Pendente', 'Atrasado']).default('Pendente'),
  dataVencimento:       z.string().optional().nullable(),
  observacao:           z.string().optional().nullable(),
  trocaPano:            z.boolean().optional().default(false),
})

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()
  const { searchParams } = new URL(req.url)
  const clienteId  = searchParams.get('clienteId')
  const locacaoId  = searchParams.get('locacaoId')
  const status     = searchParams.get('status')
  const dataInicio = searchParams.get('dataInicio')
  const dataFim    = searchParams.get('dataFim')
  const page  = Number(searchParams.get('page') || 1)
  const limit = Number(searchParams.get('limit') || 20)
  const where: any = { deletedAt: null }
  if (clienteId)  where.clienteId = clienteId
  if (locacaoId)  where.locacaoId = locacaoId
  if (status)     where.status    = status
  if (dataInicio || dataFim) {
    where.dataFim = {}
    if (dataInicio) where.dataFim.gte = dataInicio
    if (dataFim)    where.dataFim.lte = dataFim
  }

  // Filtrar cobranças por rotas permitidas do usuário (via cliente.rotaId)
  const userRotaIds = await getUserRotaIds(session)
  if (userRotaIds !== null) {
    where.cliente = { rotaId: { in: userRotaIds } }
  }

  const [cobrancas, total] = await Promise.all([
    prisma.cobranca.findMany({ where, include: { cliente: { select: { nomeExibicao: true, rotaId: true } } }, orderBy: { createdAt: 'desc' }, skip: (page-1)*limit, take: limit }),
    prisma.cobranca.count({ where }),
  ])
  return NextResponse.json({ data: cobrancas, total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  // Verificar permissão: somente quem pode realizar cobranças
  if (session.user.tipoPermissao === 'AcessoControlado' &&
      !session.user.permissoesWeb?.todosCadastros) {
    return forbidden('Sem permissão para registrar cobranças')
  }

  try {
    const body = await req.json()
    const data = createSchema.parse(body)

    // Validar que a locação existe e está ativa
    const locacaoExistente = await prisma.locacao.findFirst({
      where: { id: data.locacaoId, status: 'Ativa', deletedAt: null },
    })
    if (!locacaoExistente) {
      return NextResponse.json(
        { error: 'Locação não encontrada ou não está ativa' },
        { status: 400 }
      )
    }

    // O relógio anterior vem do numeroRelogio da locação/produto (são o mesmo valor)
    // O frontend já envia o valor correto, mas garantimos usando o valor do banco
    const relogioAnteriorCorreto = parseFloat(locacaoExistente.numeroRelogio) || data.relogioAnterior

    // Validar que leitura atual >= leitura anterior (relógio do produto/locação)
    if (data.relogioAtual < relogioAnteriorCorreto) {
      return NextResponse.json(
        { error: `A leitura atual (${data.relogioAtual}) não pode ser menor que o relógio atual (${relogioAnteriorCorreto})` },
        { status: 400 }
      )
    }

    const fichasRodadasCorreto = data.relogioAtual - relogioAnteriorCorreto

    const { id, saldoAnterior, ...rest } = data

    // saldoAnterior é runtime-only — não armazenar no DB
    // saldoDevedorGerado já inclui o saldoAnterior no cálculo do frontend

    const cobranca = await prisma.cobranca.create({
      data: {
        ...(id ? { id } : {}),
        ...rest,
        relogioAnterior: relogioAnteriorCorreto,
        fichasRodadas: fichasRodadasCorreto,
        syncStatus: 'synced',
        needsSync:  false,
        deviceId:   'web',
        version:    1,
      },
    })

    // Propagate relógio changes to product and locação
    // When a cobrança is created with relogioAtual, update:
    // 1. produto.numeroRelogio
    // 2. locação.ultimaLeituraRelogio + numeroRelogio + trocaPano + dataUltimaManutencao
    // 3. historicoRelogio entry
    // 4. If trocaPano: create Manutencao record + update produto.dataUltimaManutencao
    try {
      const locacao = await prisma.locacao.findFirst({
        where: { id: data.locacaoId },
        select: {
          id: true,
          produtoId: true,
          numeroRelogio: true,
          clienteId: true,
          clienteNome: true,
          produtoIdentificador: true,
          produtoTipo: true,
          trocaPano: true,
        },
      })

      if (locacao?.produtoId) {
        const produto = await prisma.produto.findFirst({
          where: { id: locacao.produtoId },
          select: { id: true, numeroRelogio: true, identificador: true, tipoNome: true },
        })

        if (produto) {
          const novoRelogio = String(data.relogioAtual)
          const relogioMudou = novoRelogio !== produto.numeroRelogio
          const now = new Date().toISOString()

          // Update locação with latest reading + trocaPano if applicable
          const locacaoUpdateData: Record<string, unknown> = {
            ultimaLeituraRelogio: data.relogioAtual,
            dataUltimaCobranca: now,
            numeroRelogio: novoRelogio,
            needsSync: true,
            version: { increment: 1 },
            deviceId: 'web',
          }

          if (data.trocaPano) {
            locacaoUpdateData.trocaPano = true
            locacaoUpdateData.dataUltimaManutencao = now
          }

          await prisma.locacao.update({
            where: { id: data.locacaoId },
            data: locacaoUpdateData,
          })

          // If relógio changed, update product + register history
          if (relogioMudou) {
            await prisma.$transaction([
              prisma.produto.update({
                where: { id: produto.id },
                data: {
                  numeroRelogio: novoRelogio,
                  ...(data.trocaPano ? { dataUltimaManutencao: now } : {}),
                  needsSync: true,
                  version: { increment: 1 },
                  deviceId: 'web',
                },
              }),
              prisma.historicoRelogio.create({
                data: {
                  produtoId: produto.id,
                  relogioAnterior: produto.numeroRelogio,
                  relogioNovo: novoRelogio,
                  motivo: `Leitura na cobrança (${data.relogioAnterior} → ${data.relogioAtual})`,
                  usuarioResponsavel: session.user.name || session.user.email || 'web',
                },
              }),
            ])
          } else if (data.trocaPano) {
            // Even if relogio didn't change, update produto.dataUltimaManutencao if trocaPano
            await prisma.produto.update({
              where: { id: produto.id },
              data: {
                dataUltimaManutencao: now,
                needsSync: true,
                version: { increment: 1 },
                deviceId: 'web',
              },
            })
          }

          // If trocaPano, create Manutencao record
          if (data.trocaPano) {
            await prisma.manutencao.create({
              data: {
                produtoId: locacao.produtoId,
                produtoIdentificador: locacao.produtoIdentificador,
                produtoTipo: locacao.produtoTipo || produto.tipoNome,
                clienteId: locacao.clienteId,
                clienteNome: locacao.clienteNome,
                locacaoId: locacao.id,
                cobrancaId: cobranca.id,
                tipo: 'trocaPano',
                descricao: 'Troca de pano registrada na cobrança',
                data: now,
                registradoPor: session.user.id,
              },
            })
          }
        }
      }
    } catch (propagationErr) {
      // Non-critical: cobrança was already created, propagation failure should not fail the request
      console.error('[POST /cobrancas] Erro ao propagar relógio/trocaPano:', propagationErr)
    }

    return NextResponse.json(cobranca, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: err.errors }, { status: 400 })
    }
    console.error('[POST /cobrancas]', err)
    return serverError()
  }
}
