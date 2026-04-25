// lib/export-utils.ts — Utilitários para exportação de dados

import ExcelJS from 'exceljs'

/**
 * Gera CSV com BOM UTF-8 para compatibilidade com Excel
 */
export function generateCSV(headers: string[], rows: string[][]): string {
  const BOM = '\uFEFF'
  const csvLines = [
    headers.join(';'), // Usar ponto-e-vírgula para Excel em pt-BR
    ...rows.map(r => r.map(escapeCSVField).join(';')),
  ]
  return BOM + csvLines.join('\n')
}

/**
 * Escapa campo CSV (lida com quebras de linha, aspas e ponto-e-vírgula)
 */
function escapeCSVField(value: string): string {
  if (!value) return ''
  const str = String(value)
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Exporta dados para CSV e faz o download no navegador
 */
export function exportToCSV(data: any[], filename: string): void {
  if (!data || data.length === 0) return

  const headers = Object.keys(data[0])
  const rows = data.map(item =>
    headers.map(h => String(item[h] ?? ''))
  )

  const csvContent = generateCSV(headers, rows)
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Formata dados de entidade específica para exportação
 * Retorna array de objetos planos com colunas específicas
 */
export function exportEntityList(entity: string, data: any[]): any[] {
  switch (entity) {
    case 'clientes':
      return formatClientesForExport(data)
    case 'produtos':
      return formatProdutosListForExport(data)
    case 'locacoes':
      return formatLocacoesListForExport(data)
    case 'cobrancas':
      return formatCobrancasForExport(data)
    case 'manutencoes':
      return formatManutencoesForExport(data)
    default:
      return data
  }
}

/**
 * Formata clientes para exportação
 */
function formatClientesForExport(clientes: any[]): any[] {
  return clientes.map(c => ({
    'Nome': c.nomeExibicao || '',
    'CPF/CNPJ': c.cpf || c.cnpj || '',
    'Telefone': c.telefonePrincipal || '',
    'Email': c.email || '',
    'Cidade': c.cidade || '',
    'Estado': c.estado || '',
    'Rota': c.rotaDescricao || '',
    'Status': c.status || '',
  }))
}

/**
 * Formata produtos para exportação de listagem
 */
function formatProdutosListForExport(produtos: any[]): any[] {
  return produtos.map(p => ({
    'Identificador': p.identificador || '',
    'Tipo': p.tipoNome || '',
    'Descrição': p.descricaoNome || '',
    'Tamanho': p.tamanhoNome || '',
    'Relógio': p.numeroRelogio || '',
    'Conservação': p.conservacao || '',
    'Status': p.statusProduto || '',
    'Estabelecimento': p.clienteNome || p.estabelecimento || 'Estoque',
  }))
}

/**
 * Formata locações para exportação de listagem
 */
function formatLocacoesListForExport(locacoes: any[]): any[] {
  return locacoes.map(l => ({
    'Produto': l.produtoIdentificador || '',
    'Cliente': l.clienteNome || '',
    'Data Locação': l.dataLocacao || '',
    'Forma Pagamento': l.formaPagamento || '',
    'Status': l.status || '',
  }))
}

/**
 * Formata cobranças para exportação
 */
function formatCobrancasForExport(cobrancas: any[]): any[] {
  return cobrancas.map(c => ({
    'Cliente': c.clienteNome || '',
    'Produto': c.produtoIdentificador || '',
    'Período': c.dataInicio && c.dataFim
      ? `${formatDateForExport(c.dataInicio)} - ${formatDateForExport(c.dataFim)}`
      : '',
    'Total Bruto': formatNumber(c.totalClientePaga),
    'Valor Recebido': formatNumber(c.valorRecebido),
    'Saldo Devedor': formatNumber(c.saldoDevedorGerado),
    'Status': c.status || '',
  }))
}

/**
 * Formata manutenções para exportação
 */
function formatManutencoesForExport(manutencoes: any[]): any[] {
  return manutencoes.map(m => ({
    'Data': m.data || '',
    'Produto': m.produtoIdentificador || '',
    'Tipo': m.tipo === 'trocaPano' ? 'Troca de Pano' : 'Manutenção',
    'Descrição': m.descricao || '',
    'Cliente': m.clienteNome || '',
  }))
}

/**
 * Formata número para exibição em exportação (vírgula decimal, pt-BR)
 */
function formatNumber(value: number | null | undefined): string {
  if (value == null) return '0,00'
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Formata data para exportação
 */
function formatDateForExport(date: string | Date): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('pt-BR')
  } catch {
    return String(date)
  }
}

/**
 * Formata dados de relatório financeiro para exportação
 */
export function formatFinanceiroForExport(cobrancas: any[]): { headers: string[]; rows: string[][] } {
  const headers = [
    'Cliente',
    'Identificador',
    'Período Início',
    'Período Fim',
    'Relógio Anterior',
    'Relógio Atual',
    'Fichas Rodadas',
    'Total Bruto',
    'Desconto Partidas',
    'Desconto Dinheiro',
    'Percentual Empresa',
    'Total Cliente Paga',
    'Valor Recebido',
    'Saldo Devedor',
    'Status',
    'Data Pagamento',
  ]

  const rows = cobrancas.map(c => [
    c.clienteNome || c.cliente?.nomeExibicao || '',
    c.produtoIdentificador || '',
    c.dataInicio || '',
    c.dataFim || '',
    String(c.relogioAnterior ?? 0),
    String(c.relogioAtual ?? 0),
    String(c.fichasRodadas ?? 0),
    formatNumber(c.totalBruto),
    formatNumber(c.descontoPartidasValor),
    formatNumber(c.descontoDinheiro),
    String(c.percentualEmpresa ?? 0) + '%',
    formatNumber(c.totalClientePaga),
    formatNumber(c.valorRecebido),
    formatNumber(c.saldoDevedorGerado),
    c.status || '',
    c.dataPagamento || '',
  ])

  return { headers, rows }
}

/**
 * Formata dados de relatório de locações para exportação
 */
export function formatLocacoesReportForExport(locacoes: any[]): { headers: string[]; rows: string[][] } {
  const headers = [
    'Cliente',
    'Produto',
    'Tipo',
    'Data Locação',
    'Forma Pagamento',
    'Percentual Empresa',
    'Preço Ficha',
    'Valor Fixo',
    'Status',
  ]

  const rows = locacoes.map(l => [
    l.clienteNome || '',
    l.produtoIdentificador || '',
    l.produtoTipo || '',
    l.dataLocacao || '',
    l.formaPagamento || '',
    String(l.percentualEmpresa ?? 0) + '%',
    formatNumber(l.precoFicha),
    formatNumber(l.valorFixo),
    l.status || '',
  ])

  return { headers, rows }
}

/**
 * Formata dados de relatório de produtos para exportação
 */
export function formatProdutosReportForExport(produtos: any[]): { headers: string[]; rows: string[][] } {
  const headers = [
    'Identificador',
    'Tipo',
    'Descrição',
    'Tamanho',
    'Número Relógio',
    'Conservação',
    'Status',
    'Estabelecimento',
    'Cliente (Locado)',
  ]

  const rows = produtos.map(p => {
    const locacaoAtiva = p.locacoes?.find((l: any) => l.status === 'Ativa')
    return [
      p.identificador || '',
      p.tipoNome || '',
      p.descricaoNome || '',
      p.tamanhoNome || '',
      p.numeroRelogio || '',
      p.conservacao || '',
      p.statusProduto || '',
      p.estabelecimento || '',
      locacaoAtiva?.clienteNome || '',
    ]
  })

  return { headers, rows }
}

/**
 * Formata dados de relatório baseado no tipo
 */
export function formatReportForExport(data: any, type: string): { headers: string[]; rows: string[][] } {
  switch (type) {
    case 'financeiro':
      return formatFinanceiroForExport(data.cobrancas || data || [])
    case 'locacoes':
      return formatLocacoesReportForExport(data.locacoes || data || [])
    case 'produtos':
      return formatProdutosReportForExport(data.produtos || data || [])
    default:
      // Tipo genérico — tenta extrair campos planos
      return formatGenericForExport(data)
  }
}

/**
 * Formatação genérica para tipos não reconhecidos
 */
function formatGenericForExport(data: any): { headers: string[]; rows: string[][] } {
  if (Array.isArray(data)) {
    if (data.length === 0) return { headers: ['Sem dados'], rows: [] }
    const headers = Object.keys(data[0])
    const rows = data.map(item => headers.map(h => String(item[h] ?? '')))
    return { headers, rows }
  }

  // Se for objeto com propriedades aninhadas, tenta achatamento
  const headers = Object.keys(data)
  const rows = [headers.map(h => String(data[h] ?? ''))]
  return { headers, rows }
}

// ============================================================================
// ALIASES PARA COMPATIBILIDADE COM CÓDIGO EXISTENTE
// ============================================================================

/**
 * Alias para compatibilidade — use formatLocacoesReportForExport
 */
export const formatLocacoesForExport = formatLocacoesReportForExport

/**
 * Alias para compatibilidade — use formatProdutosReportForExport
 */
export const formatProdutosForExport = formatProdutosReportForExport

// ============================================================================
// XLSX EXPORT (Excel)
// ============================================================================

/**
 * Server-side XLSX generation
 */
export async function generateXLSX(
  headers: string[],
  rows: (string | number)[][],
  sheetName: string = 'Dados'
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'App Cobranças'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet(sheetName)

  // Add headers
  const headerRow = worksheet.addRow(headers)
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    }
  })

  // Auto-width columns
  headers.forEach((header, i) => {
    worksheet.getColumn(i + 1).width = Math.max(header.length + 4, 15)
  })

  // Add data rows
  rows.forEach((row, rowIndex) => {
    const dataRow = worksheet.addRow(row)
    dataRow.eachCell((cell) => {
      cell.alignment = { vertical: 'middle' }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      }
      if (rowIndex % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
      }
    })
  })

  // Freeze header row
  worksheet.views = [{ state: 'frozen', ySplit: 1 }]

  // Auto-filter
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: rows.length + 1, column: headers.length },
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

/**
 * Client-side XLSX export helper
 */
export async function exportToXLSX(
  data: Record<string, any>[],
  columns: { key: string; label: string }[],
  filename: string
): Promise<void> {
  const ExcelJSModule = (await import('exceljs')).default
  const workbook = new ExcelJSModule.Workbook()
  workbook.creator = 'App Cobranças'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet('Dados')

  const headers = columns.map(c => c.label)
  const headerRow = worksheet.addRow(headers)
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  columns.forEach((col, i) => {
    worksheet.getColumn(i + 1).width = Math.max(col.label.length + 4, 15)
  })

  data.forEach((item, idx) => {
    const values = columns.map(c => item[c.key] ?? '')
    const row = worksheet.addRow(values)
    row.eachCell((cell) => {
      if (idx % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
      }
    })
  })

  worksheet.views = [{ state: 'frozen', ySplit: 1 }]

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
