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
import { ArrowLeft, Calculator, Edit, Hash, DollarSign, Calendar, User, Package, FileText, TrendingUp } from 'lucide-react'

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

  const isUltimaCobranca = 
    cobranca.locacao?.cobrancas?.[0]?.id === cobranca.id && 
    cobranca.locacao?.status === 'Ativa'

  const podeEditar = session?.user.permissoesWeb?.todosCadastros && isUltimaCobranca

  return (
    <div className="pb-20 lg:pb-8">
      <Header
        title={`Cobrança #${cobranca.id.slice(0, 8)}`}
        subtitle={`${cobranca.clienteNome} - ${cobranca.produtoIdentificador}`}
        actions={
          <div className="flex gap-2">
            {podeEditar && (
              <Link href={`/cobrancas/${id}/editar`} className="btn-primary text-sm">
                <Edit className="w-4 h-4" />
                <span className="hidden sm:inline">Editar</span>
              </Link>
            )}
            <Link href="/cobrancas" className="btn-secondary text-sm">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar</span>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status do Pagamento */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Status do Pagamento
              </h2>
              <StatusPagamentoBadge status={cobranca.status} />
            </div>
            <div className="p-4 md:p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <span className="text-sm text-slate-500">Valor a Pagar</span>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{formatarMoeda(cobranca.totalClientePaga)}</p>
                </div>
                <div>
                  <span className="text-sm text-slate-500">Valor Recebido</span>
                  <p className="text-3xl font-bold text-emerald-600 mt-1">{formatarMoeda(cobranca.valorRecebido)}</p>
                </div>
                <div>
                  <span className="text-sm text-slate-500">Saldo Devedor</span>
                  <p className={`text-2xl font-bold mt-1 ${cobranca.saldoDevedorGerado > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatarMoeda(cobranca.saldoDevedorGerado)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-slate-500">Data do Pagamento</span>
                  <p className="text-lg font-medium text-slate-900 mt-1">
                    {cobranca.dataPagamento 
                      ? format(new Date(cobranca.dataPagamento), 'dd/MM/yyyy', { locale: ptBR })
                      : <span className="text-slate-400">Não pago</span>
                    }
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Leitura do Relógio */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Hash className="w-5 h-5 text-purple-600" />
                Leitura do Relógio
              </h2>
            </div>
            <div className="p-4 md:p-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Anterior</p>
                  <p className="text-3xl font-mono font-bold text-slate-900">{cobranca.relogioAnterior}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Atual</p>
                  <p className="text-3xl font-mono font-bold text-slate-900">{cobranca.relogioAtual}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-200">
                  <p className="text-xs text-blue-600 uppercase tracking-wider mb-2">Fichas</p>
                  <p className="text-3xl font-bold text-blue-700">{cobranca.fichasRodadas}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Detalhamento dos Cálculos */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-amber-600" />
                Detalhamento dos Cálculos
              </h2>
            </div>
            <div className="p-4 md:p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <span className="text-sm text-slate-600">Valor da Ficha</span>
                  <span className="font-medium text-slate-900">{formatarMoeda(cobranca.valorFicha)}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <span className="text-sm text-slate-600">Total Bruto ({cobranca.fichasRodadas} × {formatarMoeda(cobranca.valorFicha)})</span>
                  <span className="font-medium text-slate-900">{formatarMoeda(cobranca.totalBruto)}</span>
                </div>
                {cobranca.descontoPartidasValor && cobranca.descontoPartidasValor > 0 && (
                  <div className="flex items-center justify-between py-3 border-b border-slate-100 text-amber-700">
                    <span className="text-sm">Desconto Partidas ({cobranca.descontoPartidasQtd} un.)</span>
                    <span className="font-medium">-{formatarMoeda(cobranca.descontoPartidasValor)}</span>
                  </div>
                )}
                {cobranca.descontoDinheiro && cobranca.descontoDinheiro > 0 && (
                  <div className="flex items-center justify-between py-3 border-b border-slate-100 text-amber-700">
                    <span className="text-sm">Desconto em Dinheiro</span>
                    <span className="font-medium">-{formatarMoeda(cobranca.descontoDinheiro)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <span className="text-sm text-slate-600">Subtotal (após descontos)</span>
                  <span className="font-medium text-slate-900">{formatarMoeda(cobranca.subtotalAposDescontos)}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <span className="text-sm text-slate-600">Percentual Empresa ({cobranca.percentualEmpresa}%)</span>
                  <span className="font-medium text-blue-700">-{formatarMoeda(cobranca.valorPercentual)}</span>
                </div>
                <div className="flex items-center justify-between py-4 bg-emerald-50 -mx-4 md:-mx-6 px-4 md:px-6 rounded-lg">
                  <span className="text-lg font-medium text-emerald-800">Total Cliente Paga</span>
                  <span className="text-2xl font-bold text-emerald-700">{formatarMoeda(cobranca.totalClientePaga)}</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Informações da Locação */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-600" />
                Locação
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <span className="text-xs text-slate-500">Produto</span>
                <p className="font-medium text-slate-900">{cobranca.produtoIdentificador}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Tipo</span>
                <p className="font-medium text-slate-900">{cobranca.locacao?.produtoTipo}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">% Empresa</span>
                <p className="font-medium text-slate-900">{cobranca.percentualEmpresa}%</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Período</span>
                <p className="font-medium text-slate-900">
                  {format(new Date(cobranca.dataInicio), 'dd/MM/yy', { locale: ptBR })} — {format(new Date(cobranca.dataFim), 'dd/MM/yy', { locale: ptBR })}
                </p>
              </div>
              {cobranca.locacao && (
                <Link 
                  href={`/locacoes/${cobranca.locacaoId}`}
                  className="inline-block text-sm text-blue-600 hover:underline mt-2"
                >
                  Ver locação →
                </Link>
              )}
            </div>
          </section>

          {/* Cliente */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-600" />
                Cliente
              </h3>
            </div>
            <div className="p-4">
              <p className="font-semibold text-slate-900">{cobranca.cliente?.nomeExibicao ?? cobranca.clienteNome}</p>
              {cobranca.cliente?.telefonePrincipal && (
                <p className="text-sm text-slate-500 mt-1">{cobranca.cliente.telefonePrincipal}</p>
              )}
              <Link 
                href={`/clientes/${cobranca.clienteId}`}
                className="inline-block text-sm text-blue-600 hover:underline mt-3"
              >
                Ver cliente →
              </Link>
            </div>
          </section>

          {/* Datas */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-4 border-b border-slate-100 bg-slate-50/50">
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

          {/* Observação */}
          {cobranca.observacao && (
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-600" />
                  Observação
                </h3>
              </div>
              <div className="p-4">
                <p className="text-sm text-slate-700">{cobranca.observacao}</p>
              </div>
            </section>
          )}

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

      {/* Mobile FAB */}
      {podeEditar && (
        <div className="lg:hidden fixed bottom-4 right-4">
          <Link
            href={`/cobrancas/${id}/editar`}
            className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors"
            title="Editar Cobrança"
          >
            <Edit className="w-6 h-6" />
          </Link>
        </div>
      )}
    </div>
  )
}
