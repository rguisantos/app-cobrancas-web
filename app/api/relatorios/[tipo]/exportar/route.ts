// GET /api/relatorios/[tipo]/exportar — Exporta relatório em PDF, CSV ou XLSX
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateReport, extractReportParams, calcularPeriodo, formatarMoeda } from '@/lib/relatorios-helpers'
import { generateCSV, generateXLSX } from '@/lib/export-utils'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ─── Export formatters for each report type ───────────────────

interface ExportData {
  headers: string[]
  rows: (string | number)[][]
}

function formatFinanceiroExport(cobrancas: any[]): ExportData {
  const headers = ['Cliente', 'Identificador', 'Período Início', 'Período Fim', 'Relógio Anterior', 'Relógio Atual', 'Fichas Rodadas', 'Total Bruto', 'Desconto Partidas', 'Desconto Dinheiro', '% Empresa', 'Total Cliente Paga', 'Valor Recebido', 'Saldo Devedor', 'Status', 'Data Pagamento']
  const rows = cobrancas.map(c => [
    c.clienteNome || c.cliente?.nomeExibicao || '',
    c.produtoIdentificador || '',
    c.dataInicio || '',
    c.dataFim || '',
    String(c.relogioAnterior ?? 0),
    String(c.relogioAtual ?? 0),
    String(c.fichasRodadas ?? 0),
    formatarMoeda(c.totalBruto),
    formatarMoeda(c.descontoPartidasValor),
    formatarMoeda(c.descontoDinheiro),
    String(c.percentualEmpresa ?? 0) + '%',
    formatarMoeda(c.totalClientePaga),
    formatarMoeda(c.valorRecebido),
    formatarMoeda(c.saldoDevedorGerado),
    c.status || '',
    c.dataPagamento || '',
  ])
  return { headers, rows }
}

function formatInadimplenciaExport(cobrancas: any[]): ExportData {
  const headers = ['Cliente', 'Produto', 'Tipo', 'Saldo Devedor', 'Dias Atraso', 'Rota', 'Status', 'Data Vencimento', 'Valor Recebido']
  const hoje = new Date()
  const rows = cobrancas.map(c => {
    const dataRef = c.dataVencimento ? new Date(c.dataVencimento) : new Date(c.createdAt)
    const diasAtraso = Math.max(0, Math.floor((hoje.getTime() - dataRef.getTime()) / (1000 * 60 * 60 * 24)))
    return [
      c.cliente?.nomeExibicao || c.clienteNome || '',
      c.produtoIdentificador || '',
      c.locacao?.produto?.tipoNome || '',
      formatarMoeda(c.saldoDevedorGerado),
      diasAtraso,
      c.cliente?.rotaNome || '',
      c.status || '',
      c.dataVencimento || '',
      formatarMoeda(c.valorRecebido),
    ]
  })
  return { headers, rows }
}

function formatRecebimentosExport(cobrancas: any[]): ExportData {
  const headers = ['Cliente', 'Produto', 'Data Pagamento', 'Valor Recebido', 'Forma Pagamento', 'Rota']
  const rows = cobrancas.map(c => [
    c.cliente?.nomeExibicao || c.clienteNome || '',
    c.produtoIdentificador || '',
    c.dataPagamento || '',
    formatarMoeda(c.valorRecebido),
    c.locacao?.formaPagamento || '',
    c.cliente?.rotaNome || '',
  ])
  return { headers, rows }
}

function formatLocacoesExport(locacoes: any[]): ExportData {
  const headers = ['Cliente', 'Produto', 'Tipo', 'Data Locação', 'Data Fim', 'Forma Pagamento', '% Empresa', 'Preço Ficha', 'Valor Fixo', 'Status', 'Rota']
  const rows = locacoes.map(l => [
    l.clienteNome || l.cliente?.nomeExibicao || '',
    l.produtoIdentificador || l.produto?.identificador || '',
    l.produtoTipo || l.produto?.tipoNome || '',
    l.dataLocacao || '',
    l.dataFim || '',
    l.formaPagamento || '',
    String(l.percentualEmpresa ?? 0) + '%',
    formatarMoeda(l.precoFicha),
    formatarMoeda(l.valorFixo),
    l.status || '',
    l.cliente?.rotaNome || '',
  ])
  return { headers, rows }
}

function formatLocacoesRotaExport(rotas: any[]): ExportData {
  const headers = ['Rota', 'Total Locações', 'Locações Ativas', 'Receita Total', 'Saldo Devedor', '% Inadimplência']
  const rows = rotas.map(r => [
    r.rotaNome || '',
    r.totalLocacoes,
    r.locacoesAtivas,
    formatarMoeda(r.receitaTotal),
    formatarMoeda(r.saldoDevedor),
    (r.percentualInadimplencia ?? 0).toFixed(1) + '%',
  ])
  return { headers, rows }
}

function formatProdutosExport(produtos: any[]): ExportData {
  const headers = ['Identificador', 'Tipo', 'Descrição', 'Tamanho', 'Relógio', 'Conservação', 'Status', 'Cliente (Locado)']
  const rows = produtos.map(p => [
    p.identificador || '',
    p.tipoNome || '',
    p.descricaoNome || '',
    p.tamanhoNome || '',
    p.numeroRelogio || '',
    p.conservacao || '',
    p.statusProduto || '',
    p.locacoes?.[0]?.cliente?.nomeExibicao || '',
  ])
  return { headers, rows }
}

function formatEstoqueExport(produtos: any[]): ExportData {
  const headers = ['Identificador', 'Tipo', 'Descrição', 'Tamanho', 'Conservação', 'Estabelecimento', 'Status']
  const rows = produtos.map(p => [
    p.identificador || '',
    p.tipoNome || '',
    p.descricaoNome || '',
    p.tamanhoNome || '',
    p.conservacao || '',
    p.estabelecimento || '',
    p.statusProduto || '',
  ])
  return { headers, rows }
}

function formatManutencoesExport(manutencoes: any[]): ExportData {
  const headers = ['Data', 'Produto', 'Tipo', 'Descrição', 'Cliente']
  const rows = manutencoes.map(m => [
    m.data || '',
    m.produtoIdentificador || '',
    m.tipo === 'trocaPano' ? 'Troca de Pano' : 'Manutenção',
    m.descricao || '',
    m.clienteNome || '',
  ])
  return { headers, rows }
}

function formatRelogiosExport(historico: any[]): ExportData {
  const headers = ['Produto', 'Relógio Anterior', 'Relógio Novo', 'Motivo', 'Data Alteração', 'Responsável']
  const rows = historico.map(h => [
    h.produto?.identificador || '',
    h.relogioAnterior || '',
    h.relogioNovo || '',
    h.motivo || '',
    h.dataAlteracao ? new Date(h.dataAlteracao).toLocaleDateString('pt-BR') : '',
    h.usuarioResponsavel || '',
  ])
  return { headers, rows }
}

function formatClientesExport(clientes: any[]): ExportData {
  const headers = ['Nome', 'Tipo Pessoa', 'CPF/CNPJ', 'Cidade', 'Estado', 'Rota', 'Status', 'Locações Ativas', 'Receita Período', 'Saldo Devedor']
  const rows = clientes.map(c => [
    c.nomeExibicao || '',
    c.tipoPessoa || '',
    c.cpfCnpj || c.cpf || c.cnpj || '',
    c.cidade || '',
    c.estado || '',
    c.rotaNome || 'Sem Rota',
    c.status || '',
    c.locacoesAtivas || 0,
    formatarMoeda(c.receitaPeriodo || 0),
    formatarMoeda(c.saldoDevedor || 0),
  ])
  return { headers, rows }
}

function formatRotasExport(rotas: any[]): ExportData {
  const headers = ['Rota', 'Total Clientes', 'Total Locações', 'Receita Total', 'Saldo Devedor', '% Inadimplência']
  const rows = rotas.map(r => [
    r.rotaNome || '',
    r.totalClientes,
    r.totalLocacoes,
    formatarMoeda(r.receitaTotal),
    formatarMoeda(r.saldoDevedor),
    (r.percentualInadimplencia ?? 0).toFixed(1) + '%',
  ])
  return { headers, rows }
}

function formatOperacionalExport(resumo: any[]): ExportData {
  const headers = ['Data', 'Cobranças Criadas', 'Valor Total', 'Valor Recebido', 'Saldo Devedor']
  const rows = resumo.map(r => [
    r.data || '',
    r.cobrancasCriadas,
    formatarMoeda(r.valorTotal),
    formatarMoeda(r.valorRecebido),
    formatarMoeda(r.saldoDevedor),
  ])
  return { headers, rows }
}

// ─── Map of report types to their data fetcher and formatter ──

const REPORT_TYPES: Record<string, {
  label: string
  fetchData: (inicio: Date, fim: Date, rotaId?: string) => Promise<{ data: any[], exportData: ExportData }>
}> = {
  financeiro: {
    label: 'Relatório Financeiro',
    fetchData: async (inicio, fim, rotaId) => {
      const cobrancas = await prisma.cobranca.findMany({
        where: { deletedAt: null, dataFim: { gte: inicio.toISOString(), lte: fim.toISOString() }, ...(rotaId && { cliente: { rotaId } }) },
        include: { cliente: { select: { nomeExibicao: true, rotaId: true } }, locacao: { select: { formaPagamento: true, produto: { select: { tipoNome: true } } } } },
        orderBy: { dataFim: 'desc' },
      })
      return { data: cobrancas, exportData: formatFinanceiroExport(cobrancas) }
    },
  },
  inadimplencia: {
    label: 'Relatório de Inadimplência',
    fetchData: async (inicio, fim, rotaId) => {
      const cobrancas = await prisma.cobranca.findMany({
        where: { deletedAt: null, status: { in: ['Atrasado', 'Pendente', 'Parcial'] }, saldoDevedorGerado: { gt: 0 }, ...(rotaId && { cliente: { rotaId } }) },
        include: { cliente: { select: { nomeExibicao: true, rotaNome: true } }, locacao: { select: { produto: { select: { tipoNome: true } } } } },
        orderBy: { saldoDevedorGerado: 'desc' },
        take: 500,
      })
      return { data: cobrancas, exportData: formatInadimplenciaExport(cobrancas) }
    },
  },
  recebimentos: {
    label: 'Relatório de Recebimentos',
    fetchData: async (inicio, fim, rotaId) => {
      const cobrancas = await prisma.cobranca.findMany({
        where: { deletedAt: null, status: 'Pago', createdAt: { gte: inicio, lte: fim }, ...(rotaId && { cliente: { rotaId } }) },
        include: { cliente: { select: { nomeExibicao: true, rotaNome: true } }, locacao: { select: { formaPagamento: true } } },
        orderBy: { dataPagamento: 'desc' },
        take: 500,
      })
      return { data: cobrancas, exportData: formatRecebimentosExport(cobrancas) }
    },
  },
  locacoes: {
    label: 'Relatório de Locações',
    fetchData: async (inicio, fim, rotaId) => {
      const locacoes = await prisma.locacao.findMany({
        where: { deletedAt: null, ...(rotaId && { cliente: { rotaId } }) },
        include: { cliente: { select: { nomeExibicao: true, rotaNome: true } }, produto: { select: { tipoNome: true, identificador: true } } },
        orderBy: { dataLocacao: 'desc' },
        take: 500,
      })
      return { data: locacoes, exportData: formatLocacoesExport(locacoes) }
    },
  },
  'locacoes-rota': {
    label: 'Relatório de Locações por Rota',
    fetchData: async (inicio, fim, rotaId) => {
      // Fetch the report data from the API route directly
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const res = await fetch(`${baseUrl}/api/relatorios/locacoes-rota?periodo=mes${rotaId ? `&rotaId=${rotaId}` : ''}`, { cache: 'no-store' })
      const result = await res.json()
      return { data: result.tabela || [], exportData: formatLocacoesRotaExport(result.tabela || []) }
    },
  },
  produtos: {
    label: 'Relatório de Produtos',
    fetchData: async (inicio, fim, rotaId) => {
      const produtos = await prisma.produto.findMany({
        where: { deletedAt: null },
        include: { locacoes: { where: { status: 'Ativa', deletedAt: null }, include: { cliente: { select: { nomeExibicao: true } } }, take: 1 } },
        orderBy: { identificador: 'asc' },
      })
      return { data: produtos, exportData: formatProdutosExport(produtos) }
    },
  },
  estoque: {
    label: 'Relatório de Estoque',
    fetchData: async (inicio, fim, rotaId) => {
      const produtos = await prisma.produto.findMany({
        where: { deletedAt: null, statusProduto: 'Ativo' },
        include: { locacoes: { where: { status: 'Ativa', deletedAt: null }, select: { id: true }, take: 1 } },
        orderBy: { identificador: 'asc' },
      })
      const filtered = produtos.filter(p => !p.locacoes?.length)
      return { data: filtered, exportData: formatEstoqueExport(filtered) }
    },
  },
  manutencoes: {
    label: 'Relatório de Manutenções',
    fetchData: async (inicio, fim, rotaId) => {
      const inicioStr = inicio.toISOString().split('T')[0]
      const fimStr = fim.toISOString().split('T')[0]
      const manutencoes = await prisma.manutencao.findMany({
        where: { deletedAt: null, data: { gte: inicioStr, lte: fimStr } },
        orderBy: { data: 'desc' },
        take: 500,
      })
      return { data: manutencoes, exportData: formatManutencoesExport(manutencoes) }
    },
  },
  relogios: {
    label: 'Relatório de Relógios',
    fetchData: async (inicio, fim, rotaId) => {
      const historico = await prisma.historicoRelogio.findMany({
        where: { dataAlteracao: { gte: inicio, lte: fim } },
        include: { produto: { select: { identificador: true, tipoNome: true } } },
        orderBy: { dataAlteracao: 'desc' },
        take: 500,
      })
      return { data: historico, exportData: formatRelogiosExport(historico) }
    },
  },
  clientes: {
    label: 'Relatório de Clientes',
    fetchData: async (inicio, fim, rotaId) => {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const res = await fetch(`${baseUrl}/api/relatorios/clientes?periodo=mes${rotaId ? `&rotaId=${rotaId}` : ''}`, { cache: 'no-store' })
      const result = await res.json()
      return { data: result.tabela || [], exportData: formatClientesExport(result.tabela || []) }
    },
  },
  rotas: {
    label: 'Relatório de Rotas',
    fetchData: async (inicio, fim, rotaId) => {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const res = await fetch(`${baseUrl}/api/relatorios/rotas?periodo=mes`, { cache: 'no-store' })
      const result = await res.json()
      return { data: result.tabela || [], exportData: formatRotasExport(result.tabela || []) }
    },
  },
  operacional: {
    label: 'Relatório Operacional',
    fetchData: async (inicio, fim, rotaId) => {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const res = await fetch(`${baseUrl}/api/relatorios/operacional?periodo=mes${rotaId ? `&rotaId=${rotaId}` : ''}`, { cache: 'no-store' })
      const result = await res.json()
      return { data: result.tabela || [], exportData: formatOperacionalExport(result.tabela || []) }
    },
  },
}

// ─── Main handler ─────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params
  const authResult = await authenticateReport(req, extractReportParams(req).rotaId)
  if (authResult instanceof NextResponse) return authResult

  const reportConfig = REPORT_TYPES[tipo]
  if (!reportConfig) {
    return NextResponse.json({ error: `Tipo de relatório inválido: ${tipo}` }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const formato = searchParams.get('formato') || 'xlsx'
  const { periodo, dataInicio, dataFim, rotaId } = extractReportParams(req)
  const { inicio, fim } = calcularPeriodo(periodo, dataInicio, dataFim)

  try {
    const { data, exportData } = await reportConfig.fetchData(inicio, fim, rotaId)

    if (formato === 'csv') {
      const csvContent = generateCSV(exportData.headers, exportData.rows as string[][])
      return new NextResponse(Buffer.from(csvContent, 'utf-8'), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="relatorio-${tipo}-${inicio.toISOString().split('T')[0]}-${fim.toISOString().split('T')[0]}.csv"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      })
    }

    if (formato === 'xlsx') {
      const buffer = await generateXLSX(exportData.headers, exportData.rows, reportConfig.label)
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="relatorio-${tipo}-${inicio.toISOString().split('T')[0]}-${fim.toISOString().split('T')[0]}.xlsx"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      })
    }

    // PDF format
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 15

    // Header
    doc.setFillColor(37, 99, 235)
    doc.rect(0, 0, pageWidth, 28, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(reportConfig.label, margin, 13)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Período: ${inicio.toLocaleDateString('pt-BR')} a ${fim.toLocaleDateString('pt-BR')}`, margin, 21)
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth - margin, 21, { align: 'right' })

    autoTable(doc, {
      startY: 36,
      head: [exportData.headers],
      body: exportData.rows as string[][],
      theme: 'striped',
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 2, textColor: [50, 50, 50], overflow: 'linebreak' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      didDrawPage: () => {
        const pageHeight = doc.internal.pageSize.getHeight()
        doc.setTextColor(150, 150, 150)
        doc.setFontSize(7)
        doc.text(`Sistema de Gestão de Cobranças | Página ${doc.getNumberOfPages()}`, pageWidth / 2, pageHeight - 8, { align: 'center' })
      },
    })

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="relatorio-${tipo}-${inicio.toISOString().split('T')[0]}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (err) {
    console.error('[relatorios/exportar]', err)
    return NextResponse.json({ error: 'Erro ao exportar relatório' }, { status: 500 })
  }
}
