import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Header from '@/components/layout/header'
import { StatusPagamentoBadge } from '@/components/ui/badge'
import { formatarMoeda } from '@/shared/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, Calculator } from 'lucide-react'

export const metadata: Metadata = { title: 'Detalhes da Cobrança' }

export default async function CobrancaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const cobranca = await prisma.cobranca.findFirst({
    where: { id, deletedAt: null },
    include: {
      cliente: { select: { nomeExibicao: true, telefonePrincipal: true } },
      locacao: { select: { produtoTipo: true, produtoIdentificador: true, percentualEmpresa: true, precoFicha: true } }
    }
  })

  if (!cobranca) notFound()

  return (
    <div>
      <Header
        title={`Cobrança #${cobranca.id.slice(0, 8)}`}
        subtitle={`${cobranca.clienteNome} - ${cobranca.produtoIdentificador}`}
        actions={
          <Link href="/cobrancas" className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">💰 Status do Pagamento</h2>
              <StatusPagamentoBadge status={cobranca.status} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-slate-500">Valor a Pagar</dt>
                <dd className="mt-1 text-2xl font-bold text-slate-900">{formatarMoeda(cobranca.totalClientePaga)}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">Valor Recebido</dt>
                <dd className="mt-1 text-2xl font-bold text-green-700">{formatarMoeda(cobranca.valorRecebido)}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">Saldo Devedor</dt>
                <dd className={`mt-1 text-xl font-bold ${cobranca.saldoDevedorGerado > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatarMoeda(cobranca.saldoDevedorGerado)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">Data do Pagamento</dt>
                <dd className="mt-1">
                  {cobranca.dataPagamento 
                    ? format(new Date(cobranca.dataPagamento), 'dd/MM/yyyy', { locale: ptBR })
                    : <span className="text-slate-400">Não pago</span>
                  }
                </dd>
              </div>
            </div>
          </div>

          {/* Leitura do Relógio */}
          <div className="card p-6">
            <h2 className="font-semibold text-slate-900 mb-4">📊 Leitura do Relógio</h2>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="p-4 bg-slate-50 rounded-lg text-center">
                <p className="text-slate-500 text-xs uppercase">Anterior</p>
                <p className="text-2xl font-mono font-bold mt-1">{cobranca.relogioAnterior}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg text-center">
                <p className="text-slate-500 text-xs uppercase">Atual</p>
                <p className="text-2xl font-mono font-bold mt-1">{cobranca.relogioAtual}</p>
              </div>
              <div className="p-4 bg-primary-50 rounded-lg text-center border border-primary-200">
                <p className="text-primary-600 text-xs uppercase">Fichas</p>
                <p className="text-2xl font-bold text-primary-700 mt-1">{cobranca.fichasRodadas}</p>
              </div>
            </div>
          </div>

          {/* Cálculos */}
          <div className="card p-6">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Detalhamento dos Cálculos
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Valor da Ficha</span>
                <span className="font-medium">{formatarMoeda(cobranca.valorFicha)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Total Bruto ({cobranca.fichasRodadas} × {formatarMoeda(cobranca.valorFicha)})</span>
                <span className="font-medium">{formatarMoeda(cobranca.totalBruto)}</span>
              </div>
              {cobranca.descontoPartidasValor && cobranca.descontoPartidasValor > 0 && (
                <div className="flex justify-between py-2 border-b border-slate-100 text-amber-700">
                  <span>Desconto Partidas ({cobranca.descontoPartidasQtd} un.)</span>
                  <span className="font-medium">-{formatarMoeda(cobranca.descontoPartidasValor)}</span>
                </div>
              )}
              {cobranca.descontoDinheiro && cobranca.descontoDinheiro > 0 && (
                <div className="flex justify-between py-2 border-b border-slate-100 text-amber-700">
                  <span>Desconto em Dinheiro</span>
                  <span className="font-medium">-{formatarMoeda(cobranca.descontoDinheiro)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Subtotal (após descontos)</span>
                <span className="font-medium">{formatarMoeda(cobranca.subtotalAposDescontos)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Percentual Empresa ({cobranca.percentualEmpresa}%)</span>
                <span className="font-medium text-blue-700">-{formatarMoeda(cobranca.valorPercentual)}</span>
              </div>
              <div className="flex justify-between py-3 bg-green-50 -mx-6 px-6 rounded-b-lg">
                <span className="font-medium text-green-800">Total Cliente Paga</span>
                <span className="font-bold text-xl text-green-700">{formatarMoeda(cobranca.totalClientePaga)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Informações da Locação */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-4">📋 Locação</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-slate-500">Produto</span>
                <p className="font-medium">{cobranca.produtoIdentificador}</p>
              </div>
              <div>
                <span className="text-slate-500">Tipo</span>
                <p className="font-medium">{cobranca.locacao?.produtoTipo}</p>
              </div>
              <div>
                <span className="text-slate-500">% Empresa</span>
                <p className="font-medium">{cobranca.percentualEmpresa}%</p>
              </div>
              <div>
                <span className="text-slate-500">Período</span>
                <p className="font-medium">
                  {format(new Date(cobranca.dataInicio), 'dd/MM/yy', { locale: ptBR })} — {format(new Date(cobranca.dataFim), 'dd/MM/yy', { locale: ptBR })}
                </p>
              </div>
              {cobranca.locacao && (
                <Link 
                  href={`/locacoes/${cobranca.locacaoId}`}
                  className="inline-block text-primary-600 hover:underline text-xs mt-2"
                >
                  Ver locação →
                </Link>
              )}
            </div>
          </div>

          {/* Cliente */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-4">👤 Cliente</h3>
            <div className="space-y-2 text-sm">
              <p className="font-medium">{cobranca.cliente?.nomeExibicao ?? cobranca.clienteNome}</p>
              {cobranca.cliente?.telefonePrincipal && (
                <p className="text-slate-500">{cobranca.cliente.telefonePrincipal}</p>
              )}
              <Link 
                href={`/clientes/${cobranca.clienteId}`}
                className="inline-block text-primary-600 hover:underline text-xs mt-2"
              >
                Ver cliente →
              </Link>
            </div>
          </div>

          {/* Datas */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-4">📅 Datas</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Criada em</span>
                <span>{format(new Date(cobranca.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Atualizada em</span>
                <span>{format(new Date(cobranca.updatedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
              </div>
            </div>
          </div>

          {/* Observação */}
          {cobranca.observacao && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 mb-2">📝 Observação</h3>
              <p className="text-sm text-slate-600">{cobranca.observacao}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
