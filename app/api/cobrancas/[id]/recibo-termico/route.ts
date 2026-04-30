// GET /api/cobrancas/[id]/recibo-termico — Gera PDF de recibo térmico 80mm para impressoras POS
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, unauthorized, notFound, serverError } from '@/lib/api-helpers'
import jsPDF from 'jspdf'
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

    // 80mm thermal receipt: 72 points width (≈80mm at 72 DPI)
    const pageWidth = 72
    const marginX = 3
    const contentWidth = pageWidth - marginX * 2
    // Start with a tall page, we'll trim at the end
    const initialHeight = 600
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: [pageWidth, initialHeight],
    })

    let y = marginX + 4

    // Helper: centered text
    function centerText(text: string, fontSize: number, style: 'normal' | 'bold' = 'normal') {
      doc.setFontSize(fontSize)
      doc.setFont('helvetica', style)
      const textWidth = doc.getTextWidth(text)
      const x = (pageWidth - textWidth) / 2
      doc.text(text, x, y)
      y += fontSize * 0.45 + 2
    }

    // Helper: left-aligned text
    function leftText(text: string, fontSize: number, style: 'normal' | 'bold' = 'normal') {
      doc.setFontSize(fontSize)
      doc.setFont('helvetica', style)
      doc.text(text, marginX, y)
      y += fontSize * 0.45 + 1
    }

    // Helper: key-value line
    function keyValue(key: string, value: string, fontSize: number = 7) {
      doc.setFontSize(fontSize)
      doc.setFont('helvetica', 'normal')
      doc.text(key, marginX, y)
      doc.setFont('helvetica', 'bold')
      doc.text(value, pageWidth - marginX, y, { align: 'right' })
      y += fontSize * 0.45 + 1.5
    }

    // Helper: separator line
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

    const cpfCnpj =
      cobranca.cliente?.tipoPessoa === 'Juridica'
        ? cobranca.cliente?.cnpj || ''
        : cobranca.cliente?.cpf || ''

    keyValue('Nome:', cobranca.cliente?.nomeExibicao || cobranca.clienteNome)
    if (cpfCnpj) {
      keyValue('CPF/CNPJ:', cpfCnpj)
    }
    y += 2

    separator()

    // ===== PRODUTO =====
    centerText('PRODUTO', 8, 'bold')
    y += 1
    keyValue('Identificador:', cobranca.produtoIdentificador)
    keyValue('Tipo:', cobranca.locacao?.produtoTipo || '-')
    keyValue(
      'Periodo:',
      `${formatarData(cobranca.dataInicio)} a ${formatarData(cobranca.dataFim)}`
    )
    if (cobranca.dataPagamento) {
      keyValue('Pgto:', formatarData(cobranca.dataPagamento))
    }
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

    keyValue('Valor Ficha:', formatarMoeda(cobranca.valorFicha))
    keyValue('Total Bruto:', formatarMoeda(cobranca.totalBruto))

    if (cobranca.descontoPartidasValor && cobranca.descontoPartidasValor > 0) {
      keyValue(
        `Desc. Partidas (${cobranca.descontoPartidasQtd}):`,
        `- ${formatarMoeda(cobranca.descontoPartidasValor)}`
      )
    }
    if (cobranca.descontoDinheiro && cobranca.descontoDinheiro > 0) {
      keyValue('Desc. Dinheiro:', `- ${formatarMoeda(cobranca.descontoDinheiro)}`)
    }

    keyValue('Subtotal:', formatarMoeda(cobranca.subtotalAposDescontos))
    keyValue(
      `% Empresa (${cobranca.percentualEmpresa}%):`,
      `- ${formatarMoeda(cobranca.valorPercentual)}`
    )

    y += 2

    // Total com destaque — inverse colors
    doc.setFillColor(0, 0, 0)
    doc.rect(marginX, y - 1, contentWidth, 12, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL CLIENTE PAGA', marginX + 2, y + 7)
    doc.text(formatarMoeda(cobranca.totalClientePaga), pageWidth - marginX - 2, y + 7, {
      align: 'right',
    })
    doc.setTextColor(0, 0, 0)
    y += 16

    // Saldo Devedor Anterior
    if (saldoAnterior > 0) {
      doc.setTextColor(180, 120, 0)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.text('+ Saldo Anterior:', marginX, y)
      doc.text(formatarMoeda(saldoAnterior), pageWidth - marginX, y, { align: 'right' })
      doc.setTextColor(0, 0, 0)
      y += 10

      // Total a receber com saldo
      doc.setFillColor(180, 0, 0)
      doc.rect(marginX, y - 1, contentWidth, 12, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('TOTAL A RECEBER', marginX + 2, y + 7)
      doc.text(formatarMoeda(cobranca.totalClientePaga + saldoAnterior), pageWidth - marginX - 2, y + 7, {
        align: 'right',
      })
      doc.setTextColor(0, 0, 0)
      y += 16
    }

    keyValue('Valor Recebido:', formatarMoeda(cobranca.valorRecebido))

    // Saldo devedor com destaque
    const saldoDevedor = cobranca.saldoDevedorGerado ?? 0
    if (saldoDevedor > 0) {
      doc.setTextColor(180, 0, 0)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('Saldo Devedor:', marginX, y)
      doc.text(formatarMoeda(saldoDevedor), pageWidth - marginX, y, { align: 'right' })
      doc.setTextColor(0, 0, 0)
      y += 12
    } else {
      keyValue('Saldo Devedor:', formatarMoeda(0))
    }

    // Observacao
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

    // ===== STATUS DO PAGAMENTO =====
    const statusConfig: Record<string, { label: string; r: number; g: number; b: number }> = {
      Pago: { label: 'PAGO', r: 22, g: 163, b: 74 },
      Parcial: { label: 'PAGAMENTO PARCIAL', r: 245, g: 158, b: 11 },
      Pendente: { label: 'PENDENTE', r: 37, g: 99, b: 235 },
      Atrasado: { label: 'ATRASADO', r: 220, g: 38, b: 38 },
    }
    const statusInfo = statusConfig[cobranca.status] || {
      label: cobranca.status,
      r: 100,
      g: 100,
      b: 100,
    }

    doc.setFillColor(statusInfo.r, statusInfo.g, statusInfo.b)
    const statusBoxWidth = Math.min(contentWidth, 65)
    const statusBoxX = (pageWidth - statusBoxWidth) / 2
    doc.roundedRect(statusBoxX, y, statusBoxWidth, 12, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(statusInfo.label, pageWidth / 2, y + 8.5, { align: 'center' })
    doc.setTextColor(0, 0, 0)
    y += 18

    // ===== PIX QR CODE =====
    if (PIX_CONFIG.ativo) {
      separator()

      centerText('PAGUE COM PIX', 8, 'bold')
      y += 2

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
      const qrSize = 50 // points
      const qrX = (pageWidth - qrSize) / 2
      doc.addImage(qrDataUrl, 'PNG', qrX, y, qrSize, qrSize)
      y += qrSize + 4

      // Instruction text
      centerText('Escaneie o QR Code', 6)
      centerText('para pagar via PIX', 6)
      y += 4
    }

    separator()

    // ===== RODAPE =====
    centerText('Obrigado pela preferencia!', 7, 'bold')
    y += 2
    centerText(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 5)

    // Trim the page to actual content height
    const finalHeight = y + marginX + 4
    ;(doc.internal.pageSize as any).height = finalHeight

    // Retornar PDF
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="recibo-termico-${cobranca.id.slice(0, 8)}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (err) {
    console.error('[cobrancas/recibo-termico]', err)
    return serverError()
  }
}
