import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Header from '@/components/layout/header'
import { StatusPagamentoBadge } from '@/components/ui/badge'
import { formatarMoeda } from '@/shared/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  ArrowLeft, Calculator, Edit, Hash, DollarSign, Calendar, User, Package, 
  FileText, TrendingUp, Receipt, Clock, AlertCircle, CheckCircle2, XCircle,
  Download, Printer
} from 'lucide-react'
import { DeleteCobrancaButton } from './delete-button'

export const metadata: Metadata = { title: 'Detalhes da Cobrança' }

export default async function CobrancaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()

  const cobranca = await prisma.cobranca.findFirst({
    where: { id, deletedAt: null },
    include: {
      cliente: { select: { nomeExibicao: true, telefonePrincipal: true } },
      locacao: { 
        select: { 
          id: true,
          produtoTipo: true, 
          produtoIdentificador: true, 
          percentualEmpresa: true, 
          precoFicha: true,
          status: true,
          cobrancas: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true }
          }
        } 
      }
    }
  })

  if (!cobranca) notFound()

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

  const isUltimaCobranca = 
    cobranca.locacao?.cobrancas?.[0]?.id === cobranca.id && 
    cobranca.locacao?.status === 'Ativa'

  const podeEditar = session?.user.permissoesWeb?.todosCadastros && isUltimaCobranca
  const isAdmin = session?.user.permissoesWeb?.todosCadastros

  // Calcular diferença de fichas
  const fichasRodadas = cobranca.relogioAtual - cobranca.relogioAnterior

  // Status visual
  const statusConfig: Record<string, { bg: string; text: string; icon: typeof CheckCircle2 }> = {
    Pago: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle2 },
    Parcial: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
    Pendente: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
    Atrasado: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle },
  }
  const statusInfo = statusConfig[cobranca.status] || { bg: 'bg-slate-100', text: 'text-slate-700', icon: XCircle }
  const StatusIcon = statusInfo.icon

  return (
    <div className="pb-20 lg:pb-8">
      <Header
        title={`Cobrança #${cobranca.id.slice(0, 8)}`}
        subtitle={`${cobranca.clienteNome} - ${cobranca.produtoIdentificador}`}
        actions={
          <div className="flex gap-2">
            <a href={`/api/cobrancas/${id}/recibo`} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Recibo PDF</span>
            </a>
            <a href={`/api/cobrancas/${id}/recibo-termico`} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm">
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Recibo Térmico</span>
            </a>
            {podeEditar && (
              <Link href={`/cobrancas/${id}/editar`} className="btn-primary text-sm">
                <Edit className="w-4 h-4" />
                <span className="hidden sm:inline">Editar</span>
              </Link>
            )}
            {isAdmin && (
              <DeleteCobrancaButton cobrancaId={id} cobrancaLabel={`#${cobranca.id.slice(0, 8)}`} />
            )}
            <Link href="/cobrancas" className="btn-secondary text-sm">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar</span>
            </Link>
          </div>
        }
      />

      {/* Status Banner */}
      <div className={`${statusInfo.bg} border-b px-4 py-3 mb-6`}>
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <StatusIcon className={`w-5 h-5 ${statusInfo.text}`} />
          <span className={`font-medium ${statusInfo.text}`}>
            Status: {cobranca.status}
          </span>
          {saldoAnterior > 0 && (
            <span className="ml-auto text-sm text-slate-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4 text-red-500" />
              Inclui saldo anterior de <strong className="text-red-600">{formatarMoeda(saldoAnterior)}</strong>
            </span>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Resumo Financeiro */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-primary-600" />
                  Resumo Financeiro
                </h2>
              </div>
              <div className="p-4 md:p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4 text-center">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Valor a Pagar</p>
                    <p className="text-2xl font-bold text-slate-900">{formatarMoeda(cobranca.totalClientePaga)}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-200">
                    <p className="text-xs text-emerald-600 uppercase tracking-wider mb-1">Valor Recebido</p>
                    <p className="text-2xl font-bold text-emerald-700">{formatarMoeda(cobranca.valorRecebido)}</p>
                  </div>
                  <div className={`${(cobranca.saldoDevedorGerado ?? 0) > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'} rounded-xl p-4 text-center border`}>
                    <p className={`text-xs uppercase tracking-wider mb-1 ${(cobranca.saldoDevedorGerado ?? 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>Saldo Devedor</p>
                    <p className={`text-2xl font-bold ${(cobranca.saldoDevedorGerado ?? 0) > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                      {formatarMoeda(cobranca.saldoDevedorGerado ?? 0)}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 text-center">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Data Pagamento</p>
                    <p className="text-lg font-medium text-slate-900">
                      {cobranca.dataPagamento 
                        ? format(new Date(cobranca.dataPagamento), 'dd/MM/yyyy', { locale: ptBR })
                        : <span className="text-slate-400 text-sm">Não pago</span>
                      }
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Leitura do Relógio */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-purple-100/50">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Hash className="w-5 h-5 text-purple-600" />
                  Leitura do Relógio
                </h2>
              </div>
              <div className="p-4 md:p-6">
                <div className="grid grid-cols-3 gap-3 md:gap-4">
                  <div className="bg-slate-100 rounded-xl p-4 text-center">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Anterior</p>
                    <p className="text-2xl md:text-3xl font-mono font-bold text-slate-900">{cobranca.relogioAnterior.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="bg-slate-100 rounded-xl p-4 text-center">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Atual</p>
                    <p className="text-2xl md:text-3xl font-mono font-bold text-slate-900">{cobranca.relogioAtual.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-center shadow-lg">
                    <p className="text-xs text-purple-200 uppercase tracking-wider mb-2">Fichas</p>
                    <p className="text-2xl md:text-3xl font-bold text-white">{cobranca.fichasRodadas.toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Detalhamento dos Cálculos */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-amber-100/50">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-amber-600" />
                  Detalhamento dos Cálculos
                </h2>
              </div>
              <div className="p-4 md:p-6">
                <div className="space-y-1">
                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <span className="text-sm text-slate-600">Valor da Ficha</span>
                    <span className="font-medium text-slate-900">{formatarMoeda(cobranca.valorFicha)}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <span className="text-sm text-slate-600">
                      Total Bruto <span className="text-slate-400">({cobranca.fichasRodadas.toLocaleString('pt-BR')} × {formatarMoeda(cobranca.valorFicha)})</span>
                    </span>
                    <span className="font-medium text-slate-900">{formatarMoeda(cobranca.totalBruto)}</span>
                  </div>
                  {cobranca.descontoPartidasValor && cobranca.descontoPartidasValor > 0 && (
                    <div className="flex items-center justify-between py-3 border-b border-slate-100">
                      <span className="text-sm text-amber-600">Desconto Partidas <span className="text-amber-400">({cobranca.descontoPartidasQtd} un.)</span></span>
                      <span className="font-medium text-amber-600">-{formatarMoeda(cobranca.descontoPartidasValor)}</span>
                    </div>
                  )}
                  {cobranca.descontoDinheiro && cobranca.descontoDinheiro > 0 && (
                    <div className="flex items-center justify-between py-3 border-b border-slate-100">
                      <span className="text-sm text-amber-600">Desconto em Dinheiro</span>
                      <span className="font-medium text-amber-600">-{formatarMoeda(cobranca.descontoDinheiro)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <span className="text-sm text-slate-600">Subtotal <span className="text-slate-400">(após descontos)</span></span>
                    <span className="font-medium text-slate-900">{formatarMoeda(cobranca.subtotalAposDescontos)}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <span className="text-sm text-slate-600">Percentual Empresa <span className="text-slate-400">({cobranca.percentualEmpresa}%)</span></span>
                    <span className="font-medium text-blue-600">-{formatarMoeda(cobranca.valorPercentual)}</span>
                  </div>
                  
                  {/* Total Cliente Paga */}
                  <div className="flex items-center justify-between py-4 bg-emerald-50 -mx-4 md:-mx-6 px-4 md:px-6 my-2 rounded-lg">
                    <span className="text-base font-semibold text-emerald-800">Total Cliente Paga</span>
                    <span className="text-xl font-bold text-emerald-700">{formatarMoeda(cobranca.totalClientePaga)}</span>
                  </div>

                  {/* Saldo Anterior - quando há */}
                  {saldoAnterior > 0 && (
                    <>
                      <div className="flex items-center justify-between py-3 border-b border-red-100 bg-red-50 -mx-4 md:-mx-6 px-4 md:px-6">
                        <span className="text-sm text-red-600 font-medium">+ Saldo Devedor Anterior</span>
                        <span className="font-bold text-red-600">{formatarMoeda(saldoAnterior)}</span>
                      </div>
                      <div className="flex items-center justify-between py-4 bg-red-50 -mx-4 md:-mx-6 px-4 md:px-6 rounded-lg border-2 border-red-200">
                        <span className="text-base font-semibold text-red-800">Total a Receber <span className="text-red-400 font-normal">(com saldo)</span></span>
                        <span className="text-xl font-bold text-red-700">{formatarMoeda(cobranca.totalClientePaga + saldoAnterior)}</span>
                      </div>
                    </>
                  )}

                  {/* Separador */}
                  <div className="border-t-2 border-slate-200 my-2"></div>

                  {/* Valor Recebido */}
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm text-slate-600">Valor Recebido</span>
                    <span className="font-bold text-emerald-600 text-lg">{formatarMoeda(cobranca.valorRecebido)}</span>
                  </div>

                  {/* Saldo Devedor Final */}
                  <div className={`flex items-center justify-between py-4 -mx-4 md:-mx-6 px-4 md:px-6 rounded-lg ${(cobranca.saldoDevedorGerado ?? 0) > 0 ? 'bg-red-100' : 'bg-emerald-100'}`}>
                    <span className={`text-base font-semibold ${(cobranca.saldoDevedorGerado ?? 0) > 0 ? 'text-red-800' : 'text-emerald-800'}`}>
                      Saldo Devedor Final
                    </span>
                    <span className={`text-xl font-bold ${(cobranca.saldoDevedorGerado ?? 0) > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                      {formatarMoeda(cobranca.saldoDevedorGerado ?? 0)}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Observação - quando há */}
            {cobranca.observacao && (
              <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-4 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-slate-600" />
                    Observação
                  </h3>
                </div>
                <div className="p-4">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{cobranca.observacao}</p>
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Informações da Locação */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-4 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-purple-100/50">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-600" />
                  Locação
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Produto</span>
                  <span className="font-semibold text-slate-900 text-lg">{cobranca.produtoIdentificador}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Tipo</span>
                  <span className="font-medium text-slate-700">{cobranca.locacao?.produtoTipo}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">% Empresa</span>
                  <span className="font-medium text-slate-700">{cobranca.percentualEmpresa}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Período</span>
                  <span className="font-medium text-slate-700 text-sm">
                    {format(new Date(cobranca.dataInicio), 'dd/MM/yy', { locale: ptBR })} — {format(new Date(cobranca.dataFim), 'dd/MM/yy', { locale: ptBR })}
                  </span>
                </div>
                {cobranca.locacao && (
                  <Link 
                    href={`/locacoes/${cobranca.locacaoId}`}
                    className="block text-center text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 py-2 rounded-lg transition-colors mt-2 border border-primary-200"
                  >
                    Ver locação →
                  </Link>
                )}
              </div>
            </section>

            {/* Cliente */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-emerald-100/50">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-600" />
                  Cliente
                </h3>
              </div>
              <div className="p-4">
                <p className="font-semibold text-slate-900 text-lg">{cobranca.cliente?.nomeExibicao ?? cobranca.clienteNome}</p>
                {cobranca.cliente?.telefonePrincipal && (
                  <p className="text-sm text-slate-500 mt-1">{cobranca.cliente.telefonePrincipal}</p>
                )}
                <Link 
                  href={`/clientes/${cobranca.clienteId}`}
                  className="block text-center text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 py-2 rounded-lg transition-colors mt-3 border border-primary-200"
                >
                  Ver cliente →
                </Link>
              </div>
            </section>

            {/* Datas */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-blue-100/50">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Datas
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Criada em</span>
                  <span className="font-medium">{format(new Date(cobranca.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Atualizada em</span>
                  <span className="font-medium">{format(new Date(cobranca.updatedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
                </div>
              </div>
            </section>

            {/* Info sobre edição */}
            {!isUltimaCobranca && (
              <section className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Edição não disponível
                </h3>
                <p className="text-sm text-amber-700">
                  Apenas a última cobrança de uma locação ativa pode ser editada.
                </p>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Mobile FAB */}
      {podeEditar && (
        <div className="lg:hidden fixed bottom-4 right-4">
          <Link
            href={`/cobrancas/${id}/editar`}
            className="w-14 h-14 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-lg hover:bg-primary-700 transition-colors"
            title="Editar Cobrança"
          >
            <Edit className="w-6 h-6" />
          </Link>
        </div>
      )}
    </div>
  )
}
