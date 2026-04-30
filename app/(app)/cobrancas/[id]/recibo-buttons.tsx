'use client'

import { useState } from 'react'
import { Download, Printer, Loader2 } from 'lucide-react'
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
  const [loading, setLoading] = useState<'a4' | null>(null)
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

  const imprimirReciboTermico = () => {
    // Abrir página de impressão térmica em nova aba
    // A página já dispara window.print() automaticamente
    window.open(`/cobrancas/${cobrancaId}/imprimir`, '_blank')
  }

  return (
    <>
      <button
        onClick={gerarReciboA4}
        disabled={!!loading}
        className="btn-secondary text-sm inline-flex items-center gap-1.5 disabled:opacity-50"
        title="Baixar recibo em PDF formato A4"
      >
        {loading === 'a4' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        <span className="hidden sm:inline">Recibo PDF</span>
      </button>
      <button
        onClick={imprimirReciboTermico}
        disabled={!!loading}
        className="btn-secondary text-sm inline-flex items-center gap-1.5 disabled:opacity-50"
        title="Imprimir recibo em impressora térmica 80mm"
      >
        <Printer className="w-4 h-4" />
        <span className="hidden sm:inline">Imprimir</span>
      </button>
    </>
  )
}
