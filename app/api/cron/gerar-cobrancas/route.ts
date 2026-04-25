// app/api/cron/gerar-cobrancas/route.ts
// Gera cobranças pendentes para locações ativas com pagamento por período
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession } from '@/lib/api-helpers'

/** Verifica se a requisição está autorizada (CRON_SECRET ou sessão admin) */
async function isAuthorized(req: NextRequest): Promise<boolean> {
  const cronSecret = req.headers.get('x-cron-secret')
    || req.nextUrl.searchParams.get('secret')
  if (cronSecret && cronSecret === process.env.CRON_SECRET) {
    return true
  }

  const session = await getAuthSession()
  if (session?.user?.tipoPermissao === 'Administrador') {
    return true
  }

  return false
}

interface PeriodInfo {
  dataInicio: string  // YYYY-MM-DD
  dataFim: string     // YYYY-MM-DD
  dataVencimento: string  // YYYY-MM-DD (mesmo que dataFim)
}

/** Calcula o período atual com base na periodicidade */
function calcularPeriodoAtual(periodicidade: string): PeriodInfo {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth()
  const dia = hoje.getDate()

  if (periodicidade === 'Mensal') {
    // 1º ao último dia do mês
    const dataInicio = new Date(ano, mes, 1)
    const dataFim = new Date(ano, mes + 1, 0) // último dia do mês
    return {
      dataInicio: formatarData(dataInicio),
      dataFim: formatarData(dataFim),
      dataVencimento: formatarData(dataFim),
    }
  }

  if (periodicidade === 'Quinzenal') {
    // 1º-15 ou 16-último dia do mês
    if (dia <= 15) {
      const dataInicio = new Date(ano, mes, 1)
      const dataFim = new Date(ano, mes, 15)
      return {
        dataInicio: formatarData(dataInicio),
        dataFim: formatarData(dataFim),
        dataVencimento: formatarData(dataFim),
      }
    } else {
      const dataInicio = new Date(ano, mes, 16)
      const dataFim = new Date(ano, mes + 1, 0) // último dia do mês
      return {
        dataInicio: formatarData(dataInicio),
        dataFim: formatarData(dataFim),
        dataVencimento: formatarData(dataFim),
      }
    }
  }

  if (periodicidade === 'Semanal') {
    // Segunda a Domingo da semana atual
    const diaSemana = hoje.getDay() // 0=Dom, 1=Seg, ...
    const diffSegunda = diaSemana === 0 ? -6 : 1 - diaSemana
    const segunda = new Date(ano, mes, dia + diffSegunda)
    const domingo = new Date(segunda)
    domingo.setDate(segunda.getDate() + 6)
    return {
      dataInicio: formatarData(segunda),
      dataFim: formatarData(domingo),
      dataVencimento: formatarData(domingo),
    }
  }

  if (periodicidade === 'Diária') {
    // Dia atual
    return {
      dataInicio: formatarData(hoje),
      dataFim: formatarData(hoje),
      dataVencimento: formatarData(hoje),
    }
  }

  // Fallback: mensal
  const dataInicio = new Date(ano, mes, 1)
  const dataFim = new Date(ano, mes + 1, 0)
  return {
    dataInicio: formatarData(dataInicio),
    dataFim: formatarData(dataFim),
    dataVencimento: formatarData(dataFim),
  }
}

function formatarData(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    // Buscar locações ativas com pagamento por período
    const locacoes = await prisma.locacao.findMany({
      where: {
        status: 'Ativa',
        formaPagamento: 'Periodo',
        periodicidade: { not: null },
        deletedAt: null,
      },
    })

    if (locacoes.length === 0) {
      return NextResponse.json({
        success: true,
        generated: 0,
        message: 'Nenhuma locação ativa com pagamento por período encontrada',
        cobrancas: [],
      })
    }

    const cobrancasGeradas: Array<{
      locacaoId: string
      clienteNome: string
      produtoIdentificador: string
      periodicidade: string
      dataInicio: string
      dataFim: string
      valorFixo: number
    }> = []

    for (const locacao of locacoes) {
      const periodicidade = locacao.periodicidade!
      const periodo = calcularPeriodoAtual(periodicidade)

      // Verificar se já existe cobrança para este período desta locação
      const cobrancaExistente = await prisma.cobranca.findFirst({
        where: {
          locacaoId: locacao.id,
          dataInicio: periodo.dataInicio,
          dataFim: periodo.dataFim,
          deletedAt: null,
        },
      })

      if (cobrancaExistente) {
        // Já existe cobrança para este período, pular
        continue
      }

      const valorFixo = locacao.valorFixo || 0
      const relogioAnterior = locacao.ultimaLeituraRelogio || 0

      // Criar cobrança pendente
      await prisma.cobranca.create({
        data: {
          locacaoId: locacao.id,
          clienteId: locacao.clienteId,
          clienteNome: locacao.clienteNome,
          produtoId: locacao.produtoId,
          produtoIdentificador: locacao.produtoIdentificador,
          dataInicio: periodo.dataInicio,
          dataFim: periodo.dataFim,
          relogioAnterior,
          relogioAtual: 0,
          fichasRodadas: 0,
          valorFicha: locacao.precoFicha,
          totalBruto: valorFixo,
          descontoPartidasQtd: null,
          descontoPartidasValor: null,
          descontoDinheiro: null,
          percentualEmpresa: locacao.percentualEmpresa,
          subtotalAposDescontos: valorFixo,
          valorPercentual: 0,
          totalClientePaga: valorFixo,
          valorRecebido: 0,
          saldoDevedorGerado: valorFixo,
          status: 'Pendente',
          dataVencimento: periodo.dataVencimento,
          observacao: `Cobrança automática - ${periodicidade}`,
          syncStatus: 'synced',
          needsSync: false,
          deviceId: 'web-cron',
          version: 1,
        },
      })

      // Atualizar dataUltimaCobranca na locação
      await prisma.locacao.update({
        where: { id: locacao.id },
        data: {
          dataUltimaCobranca: periodo.dataInicio,
          needsSync: true,
          syncStatus: 'pending',
          updatedAt: new Date(),
        },
      })

      cobrancasGeradas.push({
        locacaoId: locacao.id,
        clienteNome: locacao.clienteNome,
        produtoIdentificador: locacao.produtoIdentificador,
        periodicidade,
        dataInicio: periodo.dataInicio,
        dataFim: periodo.dataFim,
        valorFixo,
      })
    }

    return NextResponse.json({
      success: true,
      generated: cobrancasGeradas.length,
      totalLocacoes: locacoes.length,
      message: `${cobrancasGeradas.length} cobrança(s) gerada(s) para ${locacoes.length} locação(ões) ativa(s)`,
      cobrancas: cobrancasGeradas,
    })
  } catch (error) {
    console.error('[CRON gerar-cobrancas]', error)
    return NextResponse.json(
      { error: 'Erro interno ao gerar cobranças' },
      { status: 500 }
    )
  }
}

// GET para preview (não cria, apenas lista o que seria gerado)
export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const locacoes = await prisma.locacao.findMany({
      where: {
        status: 'Ativa',
        formaPagamento: 'Periodo',
        periodicidade: { not: null },
        deletedAt: null,
      },
    })

    const preview: Array<{
      locacaoId: string
      clienteNome: string
      produtoIdentificador: string
      periodicidade: string
      dataInicio: string
      dataFim: string
      dataVencimento: string
      valorFixo: number
      jaExiste: boolean
    }> = []

    for (const locacao of locacoes) {
      const periodicidade = locacao.periodicidade!
      const periodo = calcularPeriodoAtual(periodicidade)

      const cobrancaExistente = await prisma.cobranca.findFirst({
        where: {
          locacaoId: locacao.id,
          dataInicio: periodo.dataInicio,
          dataFim: periodo.dataFim,
          deletedAt: null,
        },
      })

      preview.push({
        locacaoId: locacao.id,
        clienteNome: locacao.clienteNome,
        produtoIdentificador: locacao.produtoIdentificador,
        periodicidade,
        dataInicio: periodo.dataInicio,
        dataFim: periodo.dataFim,
        dataVencimento: periodo.dataVencimento,
        valorFixo: locacao.valorFixo || 0,
        jaExiste: !!cobrancaExistente,
      })
    }

    const aGerar = preview.filter(p => !p.jaExiste)

    return NextResponse.json({
      totalLocacoes: locacoes.length,
      aGerar: aGerar.length,
      jaExistem: preview.length - aGerar.length,
      locacoes: preview,
    })
  } catch (error) {
    console.error('[CRON gerar-cobrancas preview]', error)
    return NextResponse.json(
      { error: 'Erro interno ao buscar preview' },
      { status: 500 }
    )
  }
}
