// GET /api/cobrancas/[id]/recibo — Gera PDF de recibo da cobrança
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, notFound, serverError } from '@/lib/api-helpers'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { gerarPixEMV, gerarQRCodePix } from '@/lib/pix'
import { PIX_CONFIG } from '@/lib/pix-config'

function formatarMoeda(valor: number): string {
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

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()

  try {
    const cobranca = await prisma.cobranca.findFirst({
      where: { id, deletedAt: null },
      include: {
        cliente: {
          select: {
            nomeExibicao: true,
            cpf: true,
            cnpj: true,
            tipoPessoa: true,
            telefonePrincipal: true,
          },
        },
        locacao: {
          select: {
            produtoTipo: true,
            produtoIdentificador: true,
          },
        },
      },
    })

    if (!cobranca) return notFound('Cobranca nao encontrada')

    // Buscar saldo anterior da cobrança anterior
    const cobrancaAnterior = await prisma.cobranca.findFirst({
      where: {
        locacaoId: cobranca.locacaoId,
        deletedAt: null,
        id: { not: id },
        createdAt: { lt: cobranca.createdAt }
      },
      orderBy: { createdAt: 'desc' },
      select: { saldoDevedorGerado: true }
    })
    const saldoAnterior = cobrancaAnterior?.saldoDevedorGerado ?? 0

    // Gerar PDF
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 15
    let y = margin

    // ===== CABECALHO =====
    doc.setFillColor(37, 99, 235) // primary-600
    doc.rect(0, 0, pageWidth, 35, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('Sistema de Gestao de Cobrancas', margin, 15)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Recibo de Pagamento', margin, 23)

    // Numero do recibo e data
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

    const clienteLines = [
      [`Nome: ${cobranca.cliente?.nomeExibicao || cobranca.clienteNome}`, cpfCnpj ? `CPF/CNPJ: ${cpfCnpj}` : ''],
    ]

    autoTable(doc, {
      startY: y,
      body: clienteLines,
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

    const produtoLines = [
      [`Identificador: ${cobranca.produtoIdentificador}`, `Tipo: ${cobranca.locacao?.produtoTipo || '-'}`],
      [
        `Periodo: ${formatarData(cobranca.dataInicio)} a ${formatarData(cobranca.dataFim)}`,
        cobranca.dataPagamento ? `Pgto: ${formatarData(cobranca.dataPagamento)}` : '',
      ],
    ]

    autoTable(doc, {
      startY: y,
      body: produtoLines,
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

    const relogioLines = [
      ['Anterior', 'Atual', 'Fichas Rodadas'],
      [
        cobranca.relogioAnterior.toLocaleString('pt-BR'),
        cobranca.relogioAtual.toLocaleString('pt-BR'),
        cobranca.fichasRodadas.toLocaleString('pt-BR'),
      ],
    ]

    autoTable(doc, {
      startY: y,
      head: [relogioLines[0]],
      body: [relogioLines[1]],
      theme: 'grid',
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center',
      },
      styles: { fontSize: 12, cellPadding: 4, textColor: [60, 60, 60], halign: 'center', fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 53 },
        1: { cellWidth: 53 },
        2: { cellWidth: 53 },
      },
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
      ['Valor da Ficha', formatarMoeda(cobranca.valorFicha)],
      ['Total Bruto', formatarMoeda(cobranca.totalBruto)],
    ]

    if (cobranca.descontoPartidasValor && cobranca.descontoPartidasValor > 0) {
      financeiroRows.push([
        `Desconto Partidas (${cobranca.descontoPartidasQtd} un.)`,
        `- ${formatarMoeda(cobranca.descontoPartidasValor)}`,
      ])
    }
    if (cobranca.descontoDinheiro && cobranca.descontoDinheiro > 0) {
      financeiroRows.push(['Desconto Dinheiro', `- ${formatarMoeda(cobranca.descontoDinheiro)}`])
    }

    financeiroRows.push(
      ['Subtotal (apos descontos)', formatarMoeda(cobranca.subtotalAposDescontos)],
      [`Percentual Empresa (${cobranca.percentualEmpresa}%)`, `- ${formatarMoeda(cobranca.valorPercentual)}`],
    )

    // Total com destaque
    const totalRows: string[][] = [
      ['TOTAL CLIENTE PAGA', formatarMoeda(cobranca.totalClientePaga)],
    ]

    if (saldoAnterior > 0) {
      totalRows.push(['+ Saldo Devedor Anterior', formatarMoeda(saldoAnterior)])
      totalRows.push(['TOTAL A RECEBER (com saldo)', formatarMoeda(cobranca.totalClientePaga + saldoAnterior)])
    }

    totalRows.push(
      ['Valor Recebido', formatarMoeda(cobranca.valorRecebido)],
      ['Saldo Devedor', formatarMoeda(cobranca.saldoDevedorGerado ?? 0)],
    )

    autoTable(doc, {
      startY: y,
      body: financeiroRows,
      theme: 'plain',
      margin: { left: margin, right: margin },
      styles: { fontSize: 10, cellPadding: 3, textColor: [60, 60, 60] },
      columnStyles: {
        0: { cellWidth: 110, fontStyle: 'normal' },
        1: { cellWidth: 60, halign: 'right', fontStyle: 'bold' },
      },
    })

    y = (doc as any).lastAutoTable.finalY + 2

    // Linha separadora
    doc.setDrawColor(37, 99, 235)
    doc.setLineWidth(1)
    doc.line(margin, y, pageWidth - margin, y)
    y += 4

    // Totais em destaque
    autoTable(doc, {
      startY: y,
      body: totalRows,
      theme: 'plain',
      margin: { left: margin, right: margin },
      styles: { fontSize: 12, cellPadding: 3, textColor: [30, 30, 30], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 110 },
        1: { cellWidth: 60, halign: 'right' },
      },
      didParseCell: (data) => {
        // Destacar "TOTAL CLIENTE PAGA" (sempre primeira linha)
        if (data.row.index === 0) {
          data.cell.styles.fillColor = [37, 99, 235]
          data.cell.styles.textColor = [255, 255, 255]
          data.cell.styles.fontSize = 13
        }
        // Destacar "TOTAL A RECEBER (com saldo)" - linha vermelha
        if (saldoAnterior > 0 && data.row.index === 2) {
          data.cell.styles.fillColor = [220, 38, 38]
          data.cell.styles.textColor = [255, 255, 255]
          data.cell.styles.fontSize = 13
        }
        // Destacar "Saldo Devedor" - última linha
        if (data.row.index === totalRows.length - 1 && (cobranca.saldoDevedorGerado ?? 0) > 0) {
          data.cell.styles.textColor = [220, 38, 38]
        }
      },
    })

    y = (doc as any).lastAutoTable.finalY + 8

    // ===== STATUS DO PAGAMENTO =====
    const statusConfig: Record<string, { label: string; color: [number, number, number] }> = {
      Pago: { label: 'PAGO', color: [22, 163, 74] },
      Parcial: { label: 'PAGAMENTO PARCIAL', color: [245, 158, 11] },
      Pendente: { label: 'PENDENTE', color: [37, 99, 235] },
      Atrasado: { label: 'ATRASADO', color: [220, 38, 38] },
    }
    const statusInfo = statusConfig[cobranca.status] || { label: cobranca.status, color: [100, 100, 100] }

    // Caixa de status
    const statusBoxWidth = 80
    const statusBoxHeight = 12
    const statusBoxX = pageWidth / 2 - statusBoxWidth / 2
    doc.setFillColor(...statusInfo.color)
    doc.roundedRect(statusBoxX, y, statusBoxWidth, statusBoxHeight, 3, 3, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(statusInfo.label, pageWidth / 2, y + 8.5, { align: 'center' })

    y += statusBoxHeight + 10

    // Observacao
    if (cobranca.observacao) {
      doc.setTextColor(60, 60, 60)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'italic')
      doc.text(`Observacao: ${cobranca.observacao}`, margin, y)
      y += 8
    }

    // ===== PIX QR CODE =====
    if (PIX_CONFIG.ativo) {
      // Check if we need a new page
      const pageHeight = doc.internal.pageSize.getHeight()
      if (y + 80 > pageHeight - 20) {
        doc.addPage()
        y = margin
      }

      doc.setTextColor(37, 99, 235)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Pague com PIX', margin, y)
      y += 2

      doc.setDrawColor(37, 99, 235)
      doc.setLineWidth(0.5)
      doc.line(margin, y, pageWidth - margin, y)
      y += 6

      // Generate PIX EMV code
      const pixCode = gerarPixEMV({
        chave: PIX_CONFIG.chave,
        nome: PIX_CONFIG.nome,
        cidade: PIX_CONFIG.cidade,
        valor: cobranca.totalClientePaga,
      })

      // Generate QR code as data URL
      const qrDataUrl = await gerarQRCodePix(pixCode)

      // Add QR code image centered
      const qrSize = 40 // mm
      const qrX = (pageWidth - qrSize) / 2
      doc.addImage(qrDataUrl, 'PNG', qrX, y, qrSize, qrSize)
      y += qrSize + 4

      // Instruction text
      doc.setTextColor(60, 60, 60)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('Escaneie o QR Code para pagar via PIX', pageWidth / 2, y, { align: 'center' })
      y += 8
    }

    // ===== RODAPE =====
    const pageHeight = doc.internal.pageSize.getHeight()
    const footerY = pageHeight - 15

    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.3)
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)

    doc.setTextColor(150, 150, 150)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Documento gerado em ${new Date().toLocaleString('pt-BR')} | Sistema de Gestao de Cobrancas`,
      pageWidth / 2,
      footerY,
      { align: 'center' }
    )

    // Retornar PDF
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="recibo-${cobranca.id.slice(0, 8)}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (err) {
    console.error('[cobrancas/recibo] Erro ao gerar PDF:', err)
    const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json(
      { error: 'Erro ao gerar recibo PDF', details: errorMessage },
      { status: 500 }
    )
  }
}
