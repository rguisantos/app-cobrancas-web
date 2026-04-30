'use client'

import { useEffect } from 'react'
import { formatarMoeda } from '@/shared/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CobrancaData {
  id: string
  clienteNome: string
  produtoIdentificador: string
  dataInicio: string | Date
  dataFim: string | Date
  dataPagamento: string | Date | null
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

interface ReciboTermicoPrintProps {
  cobranca: CobrancaData
  saldoAnterior: number
}

export function ReciboTermicoPrint({ cobranca, saldoAnterior }: ReciboTermicoPrintProps) {
  // Auto-trigger print dialog on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print()
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  const cpfCnpj =
    cobranca.cliente?.tipoPessoa === 'Juridica'
      ? cobranca.cliente?.cnpj || ''
      : cobranca.cliente?.cpf || ''

  const dataFormatada = (date: string | Date) => {
    try {
      return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR })
    } catch {
      return String(date)
    }
  }

  const statusConfig: Record<string, { label: string; color: string }> = {
    Pago: { label: 'PAGO', color: '#16a34a' },
    Parcial: { label: 'PAGAMENTO PARCIAL', color: '#f59e0b' },
    Pendente: { label: 'PENDENTE', color: '#2563eb' },
    Atrasado: { label: 'ATRASADO', color: '#dc2626' },
  }
  const statusInfo = statusConfig[cobranca.status] || { label: cobranca.status, color: '#666' }

  return (
    <>
      {/* Screen-only header with close button */}
      <div className="screen-only">
        <div className="screen-header">
          <h2>Recibo Térmico - Visualização</h2>
          <p>Feche esta aba após imprimir ou use Ctrl+P para reimprimir</p>
        </div>
      </div>

      {/* Receipt content - 80mm width */}
      <div className="receipt">
        {/* Cabeçalho */}
        <div className="receipt-header">
          <div className="center bold large">Sistema de Gestão</div>
          <div className="center bold large">de Cobranças</div>
        </div>

        <div className="separator">-</div>

        {/* Recibo # e Data */}
        <div className="center bold">RECIBO</div>
        <div className="kv">
          <span>Recibo Nº:</span>
          <span className="bold">{cobranca.id.slice(0, 8).toUpperCase()}</span>
        </div>
        <div className="kv">
          <span>Data:</span>
          <span className="bold">{new Date().toLocaleDateString('pt-BR')}</span>
        </div>
        <div className="kv">
          <span>Hora:</span>
          <span className="bold">{new Date().toLocaleTimeString('pt-BR')}</span>
        </div>

        <div className="separator">-</div>

        {/* Cliente */}
        <div className="center bold section-title">CLIENTE</div>
        <div className="kv">
          <span>Nome:</span>
          <span className="bold">{cobranca.cliente?.nomeExibicao || cobranca.clienteNome}</span>
        </div>
        {cpfCnpj && (
          <div className="kv">
            <span>CPF/CNPJ:</span>
            <span className="bold">{cpfCnpj}</span>
          </div>
        )}

        <div className="separator">-</div>

        {/* Produto */}
        <div className="center bold section-title">PRODUTO</div>
        <div className="kv">
          <span>Identificador:</span>
          <span className="bold">{cobranca.produtoIdentificador}</span>
        </div>
        <div className="kv">
          <span>Tipo:</span>
          <span className="bold">{cobranca.locacao?.produtoTipo || '-'}</span>
        </div>
        <div className="kv">
          <span>Período:</span>
          <span className="bold">{dataFormatada(cobranca.dataInicio)} a {dataFormatada(cobranca.dataFim)}</span>
        </div>
        {cobranca.dataPagamento && (
          <div className="kv">
            <span>Pgto:</span>
            <span className="bold">{dataFormatada(cobranca.dataPagamento)}</span>
          </div>
        )}

        <div className="separator">-</div>

        {/* Leitura do Relógio */}
        <div className="center bold section-title">LEITURA DO RELÓGIO</div>
        <div className="kv">
          <span>Anterior:</span>
          <span className="bold">{cobranca.relogioAnterior.toLocaleString('pt-BR')}</span>
        </div>
        <div className="kv">
          <span>Atual:</span>
          <span className="bold">{cobranca.relogioAtual.toLocaleString('pt-BR')}</span>
        </div>
        <div className="kv">
          <span>Fichas:</span>
          <span className="bold">{cobranca.fichasRodadas.toLocaleString('pt-BR')}</span>
        </div>

        <div className="separator">-</div>

        {/* Resumo Financeiro */}
        <div className="center bold section-title">RESUMO FINANCEIRO</div>
        <div className="kv">
          <span>Valor Ficha:</span>
          <span className="bold">{formatarMoeda(cobranca.valorFicha)}</span>
        </div>
        <div className="kv">
          <span>Total Bruto:</span>
          <span className="bold">{formatarMoeda(cobranca.totalBruto)}</span>
        </div>
        {cobranca.descontoPartidasValor && cobranca.descontoPartidasValor > 0 && (
          <div className="kv">
            <span>Desc. Partidas ({cobranca.descontoPartidasQtd}):</span>
            <span className="bold discount">-{formatarMoeda(cobranca.descontoPartidasValor)}</span>
          </div>
        )}
        {cobranca.descontoDinheiro && cobranca.descontoDinheiro > 0 && (
          <div className="kv">
            <span>Desc. Dinheiro:</span>
            <span className="bold discount">-{formatarMoeda(cobranca.descontoDinheiro)}</span>
          </div>
        )}
        <div className="kv">
          <span>Subtotal:</span>
          <span className="bold">{formatarMoeda(cobranca.subtotalAposDescontos)}</span>
        </div>
        <div className="kv">
          <span>% Empresa ({cobranca.percentualEmpresa}%):</span>
          <span className="bold discount">-{formatarMoeda(cobranca.valorPercentual)}</span>
        </div>

        {/* Total Cliente Paga - destaque */}
        <div className="total-box">
          <span>TOTAL CLIENTE PAGA</span>
          <span>{formatarMoeda(cobranca.totalClientePaga)}</span>
        </div>

        {/* Saldo Devedor Anterior */}
        {saldoAnterior > 0 && (
          <>
            <div className="kv saldo-anterior">
              <span>+ Saldo Anterior:</span>
              <span className="bold">{formatarMoeda(saldoAnterior)}</span>
            </div>
            <div className="total-box-receber">
              <span>TOTAL A RECEBER</span>
              <span>{formatarMoeda(cobranca.totalClientePaga + saldoAnterior)}</span>
            </div>
          </>
        )}

        <div className="kv">
          <span>Valor Recebido:</span>
          <span className="bold">{formatarMoeda(cobranca.valorRecebido)}</span>
        </div>

        {(cobranca.saldoDevedorGerado ?? 0) > 0 ? (
          <div className="kv saldo-devedor">
            <span className="bold">Saldo Devedor:</span>
            <span className="bold">{formatarMoeda(cobranca.saldoDevedorGerado)}</span>
          </div>
        ) : (
          <div className="kv">
            <span>Saldo Devedor:</span>
            <span className="bold">{formatarMoeda(0)}</span>
          </div>
        )}

        {cobranca.observacao && (
          <>
            <div className="separator">-</div>
            <div className="observacao">Obs: {cobranca.observacao}</div>
          </>
        )}

        <div className="separator">-</div>

        {/* Status */}
        <div className="status-box" style={{ backgroundColor: statusInfo.color }}>
          {statusInfo.label}
        </div>

        <div className="separator">-</div>

        {/* Rodapé */}
        <div className="center bold">Obrigado pela preferência!</div>
        <div className="center small">Gerado em {new Date().toLocaleString('pt-BR')}</div>
      </div>

      <style jsx global>{`
        @page {
          size: 80mm auto;
          margin: 0;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Courier New', Courier, monospace;
          font-size: 11px;
          line-height: 1.4;
          color: #000;
          background: #f5f5f5;
        }

        /* Screen-only elements - hidden during print */
        .screen-only {
          display: block;
        }

        @media print {
          .screen-only {
            display: none !important;
          }
          body {
            background: white;
          }
        }

        .screen-header {
          text-align: center;
          padding: 16px;
          background: #2563eb;
          color: white;
          margin-bottom: 16px;
        }

        .screen-header h2 {
          font-size: 18px;
          margin-bottom: 4px;
        }

        .screen-header p {
          font-size: 12px;
          opacity: 0.9;
        }

        /* Receipt container */
        .receipt {
          width: 80mm;
          min-height: auto;
          margin: 0 auto;
          padding: 4mm 3mm;
          background: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        @media print {
          .receipt {
            width: 100%;
            box-shadow: none;
            padding: 2mm;
          }
        }

        /* Typography */
        .center {
          text-align: center;
        }

        .bold {
          font-weight: bold;
        }

        .large {
          font-size: 14px;
        }

        .small {
          font-size: 9px;
        }

        .section-title {
          margin: 2px 0;
        }

        /* Separator */
        .separator {
          text-align: center;
          font-size: 9px;
          letter-spacing: 2px;
          color: #999;
          margin: 4px 0;
          overflow: hidden;
        }

        .separator::before,
        .separator::after {
          content: '';
          display: inline-block;
          width: 30%;
          border-top: 1px dashed #ccc;
          vertical-align: middle;
          margin: 0 4px;
        }

        /* Key-Value row */
        .kv {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding: 1px 0;
          gap: 4px;
        }

        .kv > span:first-child {
          flex-shrink: 0;
          color: #444;
        }

        .kv > span:last-child {
          text-align: right;
          white-space: nowrap;
        }

        .discount {
          color: #b45309;
        }

        /* Total boxes */
        .total-box {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #000;
          color: #fff;
          padding: 6px 4px;
          margin: 6px 0 4px;
          font-weight: bold;
          font-size: 13px;
        }

        .total-box-receber {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #b91c1c;
          color: #fff;
          padding: 6px 4px;
          margin: 4px 0;
          font-weight: bold;
          font-size: 12px;
        }

        /* Saldo anterior */
        .saldo-anterior {
          margin-top: 4px;
        }

        .saldo-anterior span {
          color: #b45309;
        }

        /* Saldo devedor */
        .saldo-devedor span {
          color: #b91c1c;
        }

        /* Observação */
        .observacao {
          font-style: italic;
          font-size: 9px;
          color: #555;
          word-break: break-word;
          padding: 2px 0;
        }

        /* Status box */
        .status-box {
          text-align: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
          padding: 6px;
          margin: 4px auto;
          border-radius: 2px;
          max-width: 80%;
        }

        /* Receipt header */
        .receipt-header {
          margin-bottom: 2px;
        }
      `}</style>
    </>
  )
}
