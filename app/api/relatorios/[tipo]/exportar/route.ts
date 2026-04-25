// GET /api/relatorios/[tipo]/exportar — Exporta relatório em PDF ou CSV
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, serverError, badRequest } from '@/lib/api-helpers'
import { generateCSV, generateXLSX, formatFinanceiroForExport, formatLocacoesForExport, formatProdutosForExport } from '@/lib/export-utils'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const { searchParams } = new URL(req.url)
  const formato = searchParams.get('formato') || 'pdf'
  const periodo = searchParams.get('periodo') || 'mes'
  const dataInicioParam = searchParams.get('dataInicio')
  const dataFimParam = searchParams.get('dataFim')
  const rotaId = searchParams.get('rotaId') || undefined

  // Calcular período
  const hoje = new Date()
  let dataInicio: Date
  let dataFim: Date = hoje

  switch (periodo) {
    case 'trimestre':
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1)
      break
    case 'ano':
      dataInicio = new Date(hoje.getFullYear(), 0, 1)
      break
    case 'personalizado':
      dataInicio = dataInicioParam ? new Date(dataInicioParam) : new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      dataFim = dataFimParam ? new Date(dataFimParam) : hoje
      break
    default: // mes
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  }

  try {
    let reportData: any
    let exportInfo: { headers: string[]; rows: string[][] }

    switch (tipo) {
      case 'financeiro': {
        const cobrancas = await prisma.cobranca.findMany({
          where: {
            deletedAt: null,
            dataFim: { gte: dataInicio.toISOString(), lte: dataFim.toISOString() },
            ...(rotaId && { cliente: { rotaId } }),
          },
          include: { cliente: { select: { nomeExibicao: true, rotaId: true } } },
          orderBy: { dataFim: 'desc' },
        })
        reportData = { cobrancas }
        exportInfo = formatFinanceiroForExport(cobrancas)
        break
      }
      case 'locacoes': {
        const locacoes = await prisma.locacao.findMany({
          where: {
            deletedAt: null,
            status: 'Ativa',
            ...(rotaId && { cliente: { rotaId } }),
          },
          include: { cliente: { select: { nomeExibicao: true } } },
          orderBy: { dataLocacao: 'desc' },
        })
        reportData = { locacoes }
        exportInfo = formatLocacoesForExport(locacoes)
        break
      }
      case 'produtos': {
        const produtos = await prisma.produto.findMany({
          where: { deletedAt: null },
          include: {
            locacoes: {
              where: { status: 'Ativa', deletedAt: null },
              include: { cliente: { select: { nomeExibicao: true } } },
            },
          },
          orderBy: { identificador: 'asc' },
        })
        reportData = { produtos }
        exportInfo = formatProdutosForExport(produtos)
        break
      }
      default:
        return badRequest(`Tipo de relatório inválido: ${tipo}`)
    }

    // Gerar arquivo no formato solicitado
    if (formato === 'csv') {
      return generateCSVResponse(exportInfo, tipo, dataInicio, dataFim)
    }

    if (formato === 'xlsx') {
      return generateXLSXResponse(exportInfo, tipo, dataInicio, dataFim)
    }

    return generatePDFResponse(exportInfo, tipo, dataInicio, dataFim, reportData)
  } catch (err) {
    console.error('[relatorios/exportar]', err)
    return serverError()
  }
}

function generateCSVResponse(
  exportInfo: { headers: string[]; rows: string[][] },
  tipo: string,
  dataInicio: Date,
  dataFim: Date
) {
  const csvContent = generateCSV(exportInfo.headers, exportInfo.rows)
  const buffer = Buffer.from(csvContent, 'utf-8')

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="relatorio-${tipo}-${dataInicio.toISOString().split('T')[0]}-${dataFim.toISOString().split('T')[0]}.csv"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}

async function generateXLSXResponse(
  exportInfo: { headers: string[]; rows: string[][] },
  tipo: string,
  dataInicio: Date,
  dataFim: Date
) {
  const buffer = await generateXLSX(exportInfo.headers, exportInfo.rows)

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="relatorio-${tipo}-${dataInicio.toISOString().split('T')[0]}-${dataFim.toISOString().split('T')[0]}.xlsx"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}

function generatePDFResponse(
  exportInfo: { headers: string[]; rows: string[][] },
  tipo: string,
  dataInicio: Date,
  dataFim: Date,
  reportData: any
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 15

  // Cabeçalho
  doc.setFillColor(37, 99, 235)
  doc.rect(0, 0, pageWidth, 28, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')

  const titulos: Record<string, string> = {
    financeiro: 'Relatorio Financeiro',
    locacoes: 'Relatorio de Locacoes',
    produtos: 'Relatorio de Produtos',
  }

  doc.text(titulos[tipo] || 'Relatorio', margin, 13)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `Periodo: ${dataInicio.toLocaleDateString('pt-BR')} a ${dataFim.toLocaleDateString('pt-BR')}`,
    margin,
    21
  )
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth - margin, 21, { align: 'right' })

  // Resumo (para financeiro)
  let y = 36
  if (tipo === 'financeiro' && reportData.cobrancas) {
    const cobrancas = reportData.cobrancas
    const totalRecebido = cobrancas.reduce((sum: number, c: any) => sum + (c.valorRecebido || 0), 0)
    const totalBruto = cobrancas.reduce((sum: number, c: any) => sum + (c.totalBruto || 0), 0)
    const totalClientePaga = cobrancas.reduce((sum: number, c: any) => sum + (c.totalClientePaga || 0), 0)

    doc.setTextColor(60, 60, 60)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Total de cobrancas: ${cobrancas.length}`, margin, y)
    doc.text(`Total Bruto: ${formatarMoeda(totalBruto)}`, margin + 70, y)
    doc.text(`Total Cliente Paga: ${formatarMoeda(totalClientePaga)}`, margin + 150, y)
    doc.text(`Total Recebido: ${formatarMoeda(totalRecebido)}`, margin + 230, y)
    y += 6
  }

  // Tabela
  autoTable(doc, {
    startY: y,
    head: [exportInfo.headers],
    body: exportInfo.rows,
    theme: 'striped',
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: [50, 50, 50],
      overflow: 'linebreak',
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    didDrawPage: (data) => {
      // Rodapé em cada página
      const pageHeight = doc.internal.pageSize.getHeight()
      doc.setTextColor(150, 150, 150)
      doc.setFontSize(7)
      doc.text(
        `Sistema de Gestao de Cobrancas | Pagina ${doc.getNumberOfPages()}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      )
    },
  })

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="relatorio-${tipo}-${dataInicio.toISOString().split('T')[0]}.pdf"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
