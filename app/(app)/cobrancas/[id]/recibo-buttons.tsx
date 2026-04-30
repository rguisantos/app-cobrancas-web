'use client'

import { useState } from 'react'
import { Download, Printer, Loader2 } from 'lucide-react'
import { formatarMoeda } from '@/shared/types'
import { useToast } from '@/components/ui/toaster'

interface CobrancaReciboData {
  id: string
  clienteNome: string
  produtoIdentificador: string
  dataInicio: string
  dataFim: string
  dataPagamento: string | null
  relogioAnterior: number
  relogioAtual: number
  fichasRodadas: number
  valorFicha: number
  totalBruto: number
  descontoPartidasQtd: number | null
  descontoPartidasValor: number | null
  descontoDinheiro: number | null
  percentualEmpresa: number
  subtotalAposDescontos: number
  valorPercentual: number
  totalClientePaga: number
  valorRecebido: number
  saldoDevedorGerado: number
  status: string
  observacao: string | null
  trocaPano: boolean
  saldoAnterior: number
  cliente?: {
    nomeExibicao: string | null
    cpf: string | null
    cnpj: string | null
    tipoPessoa: string | null
    telefonePrincipal: string | null
  }
  locacao?: {
    produtoTipo: string | null
    produtoIdentificador: string | null
  }
}

interface ReciboButtonsProps {
  cobrancaId: string
}

function formatarMoedaLocal(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}

function formatarData(dataStr: string): string {
  try {
    const d = new Date(dataStr)
    return d.toLocaleDateString('pt-BR')
  } catch {
    return dataStr
  }
}

export function ReciboButtons({ cobrancaId }: ReciboButtonsProps) {
  const [loading, setLoading] = useState<'a4' | 'termico' | null>(null)
  const { error: toastError } = useToast()

  const gerarReciboA4 = async () => {
    setLoading('a4')
    try {
      // Buscar dados da cobrança
      const res = await fetch(`/api/cobrancas/${cobrancaId}`)
      if (!res.ok) {
        toastError('Erro ao buscar dados da cobrança')
        return
      }
      const cobranca: CobrancaReciboData = await res.json()

      // Importar jsPDF dinamicamente (client-side)
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 15
      let y = margin

      // ===== CABECALHO =====
      doc.setFillColor(37, 99, 235)
      doc.rect(0, 0, pageWidth, 35, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('Sistema de Gestao de Cobrancas', margin, 15)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('Recibo de Pagamento', margin, 23)

      doc.setFontSize(9)
      doc.text(`Recibo N: ${cobranca.id.slice(0, 8).toUpperCase()}`, pageWidth - margin, 15, { align: 'right' })
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin, 21, { align: 'right' })
      doc.text(`Hora: ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth - margin, 27, { align: 'right' })

      y = 45

      // ===== DADOS DO CLIENTE =====
      doc.setTextColor(37, 99, 235)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Dados do Cliente', margin, y)
      y += 2

      doc.setDrawColor(37, 99, 235)
      doc.setLineWidth(0.5)
      doc.line(margin, y, pageWidth - margin, y)
      y += 6

      doc.setTextColor(60, 60, 60)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')

      const cpfCnpj = cobranca.cliente?.tipoPessoa === 'Juridica'
        ? cobranca.cliente?.cnpj || ''
        : cobranca.cliente?.cpf || ''

      autoTable(doc, {
        startY: y,
        body: [[`Nome: ${cobranca.cliente?.nomeExibicao || cobranca.clienteNome}`, cpfCnpj ? `CPF/CNPJ: ${cpfCnpj}` : '']],
        theme: 'plain',
        margin: { left: margin, right: margin },
        styles: { fontSize: 10, cellPadding: 2, textColor: [60, 60, 60] },
        columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 70 } },
      })

      y = (doc as any).lastAutoTable.finalY + 8

      // ===== DADOS DO PRODUTO =====
      doc.setTextColor(37, 99, 235)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Dados do Produto', margin, y)
      y += 2
      doc.line(margin, y, pageWidth - margin, y)
      y += 6

      autoTable(doc, {
        startY: y,
        body: [
          [`Identificador: ${cobranca.produtoIdentificador}`, `Tipo: ${cobranca.locacao?.produtoTipo || '-'}`],
          [`Periodo: ${formatarData(cobranca.dataInicio)} a ${formatarData(cobranca.dataFim)}`, cobranca.dataPagamento ? `Pgto: ${formatarData(cobranca.dataPagamento)}` : ''],
        ],
        theme: 'plain',
        margin: { left: margin, right: margin },
        styles: { fontSize: 10, cellPadding: 2, textColor: [60, 60, 60] },
        columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 70 } },
      })

      y = (doc as any).lastAutoTable.finalY + 8

      // ===== LEITURA DO RELOGIO =====
      doc.setTextColor(37, 99, 235)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Leitura do Relogio', margin, y)
      y += 2
      doc.line(margin, y, pageWidth - margin, y)
      y += 4

      autoTable(doc, {
        startY: y,
        head: [['Anterior', 'Atual', 'Fichas Rodadas']],
        body: [[
          cobranca.relogioAnterior.toLocaleString('pt-BR'),
          cobranca.relogioAtual.toLocaleString('pt-BR'),
          cobranca.fichasRodadas.toLocaleString('pt-BR'),
        ]],
        theme: 'grid',
        margin: { left: margin, right: margin },
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontSize: 10, fontStyle: 'bold', halign: 'center' },
        styles: { fontSize: 12, cellPadding: 4, textColor: [60, 60, 60], halign: 'center', fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 53 }, 1: { cellWidth: 53 }, 2: { cellWidth: 53 } },
      })

      y = (doc as any).lastAutoTable.finalY + 8

      // ===== RESUMO FINANCEIRO =====
      doc.setTextColor(37, 99, 235)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Resumo Financeiro', margin, y)
      y += 2
      doc.line(margin, y, pageWidth - margin, y)
      y += 4

      const financeiroRows: string[][] = [
        ['Valor da Ficha', formatarMoedaLocal(cobranca.valorFicha)],
        ['Total Bruto', formatarMoedaLocal(cobranca.totalBruto)],
      ]

      if (cobranca.descontoPartidasValor && cobranca.descontoPartidasValor > 0) {
        financeiroRows.push([`Desconto Partidas (${cobranca.descontoPartidasQtd} un.)`, `- ${formatarMoedaLocal(cobranca.descontoPartidasValor)}`])
      }
      if (cobranca.descontoDinheiro && cobranca.descontoDinheiro > 0) {
        financeiroRows.push(['Desconto em Dinheiro (no liquido)', `- ${formatarMoedaLocal(cobranca.descontoDinheiro)}`])
      }

      financeiroRows.push(
        ['Subtotal (apos partidas)', formatarMoedaLocal(cobranca.subtotalAposDescontos)],
        [`Percentual Empresa (${cobranca.percentualEmpresa}%)`, `- ${formatarMoedaLocal(cobranca.valorPercentual)}`],
      )

      autoTable(doc, {
        startY: y,
        body: financeiroRows,
        theme: 'plain',
        margin: { left: margin, right: margin },
        styles: { fontSize: 10, cellPadding: 3, textColor: [60, 60, 60] },
        columnStyles: { 0: { cellWidth: 110, fontStyle: 'normal' }, 1: { cellWidth: 60, halign: 'right', fontStyle: 'bold' } },
      })

      y = (doc as any).lastAutoTable.finalY + 2

      // Linha separadora
      doc.setDrawColor(37, 99, 235)
      doc.setLineWidth(1)
      doc.line(margin, y, pageWidth - margin, y)
      y += 4

      // Totais em destaque
      const saldoAnterior = cobranca.saldoAnterior || 0
      const totalRows: string[][] = [['TOTAL CLIENTE PAGA', formatarMoedaLocal(cobranca.totalClientePaga)]]
      if (saldoAnterior > 0) {
        totalRows.push(['+ Saldo Devedor Anterior', formatarMoedaLocal(saldoAnterior)])
        totalRows.push(['TOTAL A RECEBER (com saldo)', formatarMoedaLocal(cobranca.totalClientePaga + saldoAnterior)])
      }
      totalRows.push(
        ['Valor Recebido', formatarMoedaLocal(cobranca.valorRecebido)],
        ['Saldo Devedor', formatarMoedaLocal(cobranca.saldoDevedorGerado ?? 0)],
      )

      autoTable(doc, {
        startY: y,
        body: totalRows,
        theme: 'plain',
        margin: { left: margin, right: margin },
        styles: { fontSize: 12, cellPadding: 3, textColor: [30, 30, 30], fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 110 }, 1: { cellWidth: 60, halign: 'right' } },
        didParseCell: (data: any) => {
          if (data.row.index === 0) {
            data.cell.styles.fillColor = [37, 99, 235]
            data.cell.styles.textColor = [255, 255, 255]
            data.cell.styles.fontSize = 13
          }
          if (saldoAnterior > 0 && data.row.index === 2) {
            data.cell.styles.fillColor = [220, 38, 38]
            data.cell.styles.textColor = [255, 255, 255]
            data.cell.styles.fontSize = 13
          }
          if (data.row.index === totalRows.length - 1 && (cobranca.saldoDevedorGerado ?? 0) > 0) {
            data.cell.styles.textColor = [220, 38, 38]
          }
        },
      })

      y = (doc as any).lastAutoTable.finalY + 8

      // ===== STATUS =====
      const statusColors: Record<string, [number, number, number]> = {
        Pago: [22, 163, 74], Parcial: [245, 158, 11], Pendente: [37, 99, 235], Atrasado: [220, 38, 38],
      }
      const statusLabels: Record<string, string> = {
        Pago: 'PAGO', Parcial: 'PAGAMENTO PARCIAL', Pendente: 'PENDENTE', Atrasado: 'ATRASADO',
      }
      const color = statusColors[cobranca.status] || [100, 100, 100]
      const label = statusLabels[cobranca.status] || cobranca.status

      const boxW = 80, boxH = 12
      doc.setFillColor(...color)
      doc.roundedRect(pageWidth / 2 - boxW / 2, y, boxW, boxH, 3, 3, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text(label, pageWidth / 2, y + 8.5, { align: 'center' })
      y += boxH + 10

      if (cobranca.observacao) {
        doc.setTextColor(60, 60, 60)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'italic')
        doc.text(`Observacao: ${cobranca.observacao}`, margin, y)
      }

      // Rodapé
      const pageHeight = doc.internal.pageSize.getHeight()
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.3)
      doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20)
      doc.setTextColor(150, 150, 150)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(`Documento gerado em ${new Date().toLocaleString('pt-BR')} | Sistema de Gestao de Cobrancas`, pageWidth / 2, pageHeight - 15, { align: 'center' })

      // Salvar
      doc.save(`recibo-${cobranca.id.slice(0, 8)}.pdf`)
    } catch (err) {
      console.error('Erro ao gerar recibo A4:', err)
      toastError('Erro ao gerar recibo PDF. Tente novamente.')
    } finally {
      setLoading(null)
    }
  }

  const gerarReciboTermico = async () => {
    setLoading('termico')
    try {
      // Buscar dados da cobrança
      const res = await fetch(`/api/cobrancas/${cobrancaId}`)
      if (!res.ok) {
        toastError('Erro ao buscar dados da cobrança')
        return
      }
      const cobranca: CobrancaReciboData = await res.json()

      // Importar jsPDF dinamicamente (client-side)
      const { jsPDF } = await import('jspdf')

      const pageWidth = 72
      const marginX = 3
      const contentWidth = pageWidth - marginX * 2
      const initialHeight = 600
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: [pageWidth, initialHeight] })

      let y = marginX + 4

      function centerText(text: string, fontSize: number, style: 'normal' | 'bold' = 'normal') {
        doc.setFontSize(fontSize)
        doc.setFont('helvetica', style)
        const textWidth = doc.getTextWidth(text)
        doc.text(text, (pageWidth - textWidth) / 2, y)
        y += fontSize * 0.45 + 2
      }

      function leftText(text: string, fontSize: number, style: 'normal' | 'bold' = 'normal') {
        doc.setFontSize(fontSize)
        doc.setFont('helvetica', style)
        doc.text(text, marginX, y)
        y += fontSize * 0.45 + 1
      }

      function keyValue(key: string, value: string, fontSize: number = 7) {
        doc.setFontSize(fontSize)
        doc.setFont('helvetica', 'normal')
        doc.text(key, marginX, y)
        doc.setFont('helvetica', 'bold')
        doc.text(value, pageWidth - marginX, y, { align: 'right' })
        y += fontSize * 0.45 + 1.5
      }

      function separator() {
        doc.setFontSize(7)
        doc.setFont('courier', 'normal')
        const sep = '--------------------------------'
        doc.text(sep, (pageWidth - doc.getTextWidth(sep)) / 2, y)
        y += 8
      }

      // ===== CABECALHO =====
      doc.setTextColor(0, 0, 0)
      centerText('Sistema de Gestao', 10, 'bold')
      centerText('de Cobrancas', 10, 'bold')
      y += 2
      leftText('Endereco: Av. Principal, 1000', 6)
      leftText('Telefone: (67) 99999-0000', 6)
      y += 4

      separator()

      // ===== RECIBO # e DATA =====
      centerText('RECIBO', 9, 'bold')
      keyValue('Recibo N:', cobranca.id.slice(0, 8).toUpperCase())
      keyValue('Data:', new Date().toLocaleDateString('pt-BR'))
      keyValue('Hora:', new Date().toLocaleTimeString('pt-BR'))
      y += 2

      separator()

      // ===== CLIENTE =====
      centerText('CLIENTE', 8, 'bold')
      y += 1
      const cpfCnpj = cobranca.cliente?.tipoPessoa === 'Juridica'
        ? cobranca.cliente?.cnpj || ''
        : cobranca.cliente?.cpf || ''

      keyValue('Nome:', cobranca.cliente?.nomeExibicao || cobranca.clienteNome)
      if (cpfCnpj) keyValue('CPF/CNPJ:', cpfCnpj)
      y += 2

      separator()

      // ===== PRODUTO =====
      centerText('PRODUTO', 8, 'bold')
      y += 1
      keyValue('Identificador:', cobranca.produtoIdentificador)
      keyValue('Tipo:', cobranca.locacao?.produtoTipo || '-')
      keyValue('Periodo:', `${formatarData(cobranca.dataInicio)} a ${formatarData(cobranca.dataFim)}`)
      if (cobranca.dataPagamento) keyValue('Pgto:', formatarData(cobranca.dataPagamento))
      y += 2

      separator()

      // ===== LEITURA DO RELOGIO =====
      centerText('LEITURA DO RELOGIO', 8, 'bold')
      y += 1
      keyValue('Anterior:', cobranca.relogioAnterior.toLocaleString('pt-BR'))
      keyValue('Atual:', cobranca.relogioAtual.toLocaleString('pt-BR'))
      keyValue('Fichas:', cobranca.fichasRodadas.toLocaleString('pt-BR'))
      y += 2

      separator()

      // ===== RESUMO FINANCEIRO =====
      centerText('RESUMO FINANCEIRO', 8, 'bold')
      y += 1

      keyValue('Valor Ficha:', formatarMoedaLocal(cobranca.valorFicha))
      keyValue('Total Bruto:', formatarMoedaLocal(cobranca.totalBruto))

      if (cobranca.descontoPartidasValor && cobranca.descontoPartidasValor > 0) {
        keyValue(`Desc. Partidas (${cobranca.descontoPartidasQtd}):`, `- ${formatarMoedaLocal(cobranca.descontoPartidasValor)}`)
      }
      if (cobranca.descontoDinheiro && cobranca.descontoDinheiro > 0) {
        keyValue('Desc. Dinheiro (liq.):', `- ${formatarMoedaLocal(cobranca.descontoDinheiro)}`)
      }

      keyValue('Subtotal:', formatarMoedaLocal(cobranca.subtotalAposDescontos))
      keyValue(`% Empresa (${cobranca.percentualEmpresa}%):`, `- ${formatarMoedaLocal(cobranca.valorPercentual)}`)

      y += 2

      // Total com destaque
      doc.setFillColor(0, 0, 0)
      doc.rect(marginX, y - 1, contentWidth, 12, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('TOTAL CLIENTE PAGA', marginX + 2, y + 7)
      doc.text(formatarMoedaLocal(cobranca.totalClientePaga), pageWidth - marginX - 2, y + 7, { align: 'right' })
      doc.setTextColor(0, 0, 0)
      y += 16

      // Saldo Devedor Anterior
      const saldoAnterior = cobranca.saldoAnterior || 0
      if (saldoAnterior > 0) {
        doc.setTextColor(180, 120, 0)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.text('+ Saldo Anterior:', marginX, y)
        doc.text(formatarMoedaLocal(saldoAnterior), pageWidth - marginX, y, { align: 'right' })
        doc.setTextColor(0, 0, 0)
        y += 10

        doc.setFillColor(180, 0, 0)
        doc.rect(marginX, y - 1, contentWidth, 12, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text('TOTAL A RECEBER', marginX + 2, y + 7)
        doc.text(formatarMoedaLocal(cobranca.totalClientePaga + saldoAnterior), pageWidth - marginX - 2, y + 7, { align: 'right' })
        doc.setTextColor(0, 0, 0)
        y += 16
      }

      keyValue('Valor Recebido:', formatarMoedaLocal(cobranca.valorRecebido))

      const saldoDevedor = cobranca.saldoDevedorGerado ?? 0
      if (saldoDevedor > 0) {
        doc.setTextColor(180, 0, 0)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text('Saldo Devedor:', marginX, y)
        doc.text(formatarMoedaLocal(saldoDevedor), pageWidth - marginX, y, { align: 'right' })
        doc.setTextColor(0, 0, 0)
        y += 12
      } else {
        keyValue('Saldo Devedor:', formatarMoedaLocal(0))
      }

      if (cobranca.observacao) {
        y += 2
        separator()
        doc.setFontSize(6)
        doc.setFont('helvetica', 'italic')
        doc.text(`Obs: ${cobranca.observacao}`, marginX, y, { maxWidth: contentWidth })
        y += 10
      }

      y += 2
      separator()

      // ===== STATUS =====
      const statusColors: Record<string, { r: number; g: number; b: number; label: string }> = {
        Pago: { label: 'PAGO', r: 22, g: 163, b: 74 },
        Parcial: { label: 'PAGAMENTO PARCIAL', r: 245, g: 158, b: 11 },
        Pendente: { label: 'PENDENTE', r: 37, g: 99, b: 235 },
        Atrasado: { label: 'ATRASADO', r: 220, g: 38, b: 38 },
      }
      const sInfo = statusColors[cobranca.status] || { label: cobranca.status, r: 100, g: 100, b: 100 }

      doc.setFillColor(sInfo.r, sInfo.g, sInfo.b)
      const sBoxW = Math.min(contentWidth, 65)
      doc.roundedRect((pageWidth - sBoxW) / 2, y, sBoxW, 12, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text(sInfo.label, pageWidth / 2, y + 8.5, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      y += 18

      separator()

      // RODAPE
      centerText('Obrigado pela preferencia!', 7, 'bold')
      y += 2
      centerText(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 5)

      // Trim page
      const finalHeight = y + marginX + 4
      ;(doc.internal.pageSize as any).height = finalHeight

      // Salvar
      doc.save(`recibo-termico-${cobranca.id.slice(0, 8)}.pdf`)
    } catch (err) {
      console.error('Erro ao gerar recibo térmico:', err)
      toastError('Erro ao gerar recibo térmico. Tente novamente.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      <button
        onClick={gerarReciboA4}
        disabled={!!loading}
        className="btn-secondary text-sm inline-flex items-center gap-1.5 disabled:opacity-50"
      >
        {loading === 'a4' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        <span className="hidden sm:inline">Recibo PDF</span>
      </button>
      <button
        onClick={gerarReciboTermico}
        disabled={!!loading}
        className="btn-secondary text-sm inline-flex items-center gap-1.5 disabled:opacity-50"
      >
        {loading === 'termico' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
        <span className="hidden sm:inline">Recibo Térmico</span>
      </button>
    </>
  )
}
