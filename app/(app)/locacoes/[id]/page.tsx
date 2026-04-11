import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Header from '@/components/layout/header'
import { StatusLocacaoBadge, StatusPagamentoBadge } from '@/components/ui/badge'
import { formatarMoeda } from '@/shared/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, Edit, ArrowRightCircle, Package, Eye, User, DollarSign, Calendar, TrendingUp, Clock, FileText, MapPin } from 'lucide-react'

export const metadata: Metadata = { title: 'Detalhes da Locação' }

export default async function LocacaoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) notFound()

  const locacao = await prisma.locacao.findFirst({
    where: { id, deletedAt: null },
    include: {
      cliente: { include: { rota: { select: { descricao: true } } } },
      produto: true,
      cobrancas: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 20
      }
    }
  })

  if (!locacao) notFound()

  const podeEditar = session?.user.permissoesWeb?.todosCadastros
  const totalRecebido = locacao.cobrancas.reduce((s, c) => s + c.valorRecebido, 0)
  const saldoDevedor = locacao.cobrancas.reduce((s, c) => s + c.saldoDevedorGerado, 0)

  return (
    <div className="pb-20 lg:pb-8">
      <Header
        title={`${locacao.produtoTipo} N° ${locacao.produtoIdentificador}`}
        subtitle={`Locação para ${locacao.clienteNome}`}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Link href="/locacoes" className="btn-secondary text-sm">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar</span>
            </Link>
            {locacao.status === 'Ativa' && podeEditar && (
              <>
                <Link href={`/locacoes/${id}/relocar`} className="btn-secondary text-sm">
                  <ArrowRightCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Relocar</span>
                </Link>
                <Link href={`/locacoes/${id}/enviar-estoque`} className="btn-secondary text-sm bg-rose-100 text-rose-700 hover:bg-rose-200 border-rose-200">
                  <Package className="w-4 h-4" />
                  <span className="hidden sm:inline">Estoque</span>
                </Link>
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status da Locação */}
          <section className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
            locacao.status === 'Ativa' ? 'border-l-4 border-l-emerald-500' : 
            locacao.status === 'Finalizada' ? 'border-l-4 border-l-slate-400' :
            'border-l-4 border-l-red-500'
          }`}>
            <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Dados da Locação
              </h2>
              <StatusLocacaoBadge status={locacao.status} />
            </div>
            <div className="p-4 md:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <span className="text-xs text-slate-500">Cliente</span>
                  <Link href={`/clientes/${locacao.clienteId}`} className="block text-lg font-semibold text-blue-600 hover:underline mt-1">
                    {locacao.clienteNome}
                  </Link>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Produto</span>
                  <Link href={`/produtos/${locacao.produtoId}`} className="block text-lg font-semibold text-blue-600 hover:underline mt-1">
                    {locacao.produtoTipo} N° {locacao.produtoIdentificador}
                  </Link>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Data da Locação</span>
                  <span className="text-sm font-medium text-slate-900">{format(new Date(locacao.dataLocacao), 'dd/MM/yyyy', { locale: ptBR })}</span>
                </div>
                {locacao.dataFim && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Data de Término</span>
                    <span className="text-sm font-medium text-slate-900">{format(new Date(locacao.dataFim), 'dd/MM/yyyy', { locale: ptBR })}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Forma de Pagamento</span>
                  <span className="text-sm font-medium text-slate-900">{locacao.formaPagamento}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Número do Relógio</span>
                  <span className="text-lg font-mono font-bold text-slate-900">{locacao.produto?.numeroRelogio || locacao.numeroRelogio}</span>
                </div>
                
                {locacao.formaPagamento !== 'Periodo' && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">Preço da Ficha</span>
                      <span className="text-sm font-medium text-slate-900">{formatarMoeda(locacao.precoFicha)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">Percentual Empresa</span>
                      <span className="text-sm font-medium text-slate-900">{locacao.percentualEmpresa}%</span>
                    </div>
                  </>
                )}
                
                {locacao.formaPagamento === 'Periodo' && locacao.valorFixo && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">Valor Fixo</span>
                      <span className="text-lg font-bold text-emerald-700">{formatarMoeda(locacao.valorFixo)}</span>
                    </div>
                    {locacao.periodicidade && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">Periodicidade</span>
                        <span className="text-sm font-medium text-slate-900">{locacao.periodicidade}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {locacao.observacao && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Observação</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{locacao.observacao}</p>
                </div>
              )}
            </div>
          </section>

          {/* Histórico de cobranças */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-600" />
                Histórico de Cobranças
              </h2>
              <span className="text-sm text-slate-500">{locacao.cobrancas.length} cobrança(s)</span>
            </div>
            <div className="p-4 md:p-6">
              {locacao.cobrancas.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <DollarSign className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500">Nenhuma cobrança registrada para esta locação</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {locacao.cobrancas.map((c, idx) => {
                    const isUltima = idx === 0 && locacao.status === 'Ativa'
                    return (
                      <div 
                        key={c.id} 
                        className={`p-4 rounded-xl border transition-all ${
                          isUltima 
                            ? 'bg-emerald-50 border-emerald-200' 
                            : 'bg-slate-50 border-slate-200 hover:border-amber-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900">
                              {format(new Date(c.dataInicio), 'dd/MM/yy', { locale: ptBR })} — {format(new Date(c.dataFim), 'dd/MM/yy', { locale: ptBR })}
                            </span>
                            {isUltima && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                                atual
                              </span>
                            )}
                          </div>
                          <StatusPagamentoBadge status={c.status} />
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                          <span className="font-mono">{c.relogioAnterior} → {c.relogioAtual}</span>
                          <span>{c.fichasRodadas} fichas</span>
                          <span className="font-semibold text-slate-700">{formatarMoeda(c.totalClientePaga)}</span>
                          <span className="text-emerald-600 font-medium">Recebido: {formatarMoeda(c.valorRecebido)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <Link 
                            href={`/cobrancas/${c.id}`}
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ver detalhes
                          </Link>
                          {isUltima && podeEditar && (
                            <Link 
                              href={`/cobrancas/${c.id}/editar`}
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              Editar
                            </Link>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Cliente info */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-600" />
                Cliente
              </h3>
            </div>
            <div className="p-4">
              <p className="font-semibold text-slate-900 mb-2">{locacao.cliente?.nomeExibicao ?? locacao.clienteNome}</p>
              {locacao.cliente?.telefonePrincipal && (
                <p className="text-sm text-slate-500 mb-1">{locacao.cliente.telefonePrincipal}</p>
              )}
              {locacao.cliente?.rota && (
                <p className="text-sm text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  Rota: {locacao.cliente.rota.descricao}
                </p>
              )}
              <Link 
                href={`/clientes/${locacao.clienteId}`}
                className="inline-block text-sm text-blue-600 hover:underline mt-3"
              >
                Ver cliente →
              </Link>
            </div>
          </section>

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-xs text-slate-500">Recebido</span>
              </div>
              <p className="text-lg font-bold text-emerald-600">{formatarMoeda(totalRecebido)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-red-600" />
                </div>
                <span className="text-xs text-slate-500">Devedor</span>
              </div>
              <p className="text-lg font-bold text-red-600">{formatarMoeda(saldoDevedor)}</p>
            </div>
          </div>

          {/* Resumo */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Resumo
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Total cobranças</span>
                <span className="font-semibold">{locacao.cobrancas.length}</span>
              </div>
              {locacao.ultimaLeituraRelogio !== null && locacao.ultimaLeituraRelogio !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Última leitura</span>
                  <span className="font-mono font-bold">{locacao.ultimaLeituraRelogio}</span>
                </div>
              )}
            </div>
          </section>

          {/* Produto info */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-600" />
                Produto
              </h3>
            </div>
            <div className="p-4">
              <p className="font-semibold text-slate-900">{locacao.produto?.tipoNome} N° {locacao.produto?.identificador}</p>
              <p className="text-sm text-slate-500 mt-1">{locacao.produto?.descricaoNome} - {locacao.produto?.tamanhoNome}</p>
              <p className="text-sm text-slate-500 mt-1">Conservação: {locacao.produto?.conservacao}</p>
              <Link 
                href={`/produtos/${locacao.produtoId}`}
                className="inline-block text-sm text-blue-600 hover:underline mt-3"
              >
                Ver produto →
              </Link>
            </div>
          </section>
        </div>
      </div>

      {/* Mobile FAB */}
      {locacao.status === 'Ativa' && podeEditar && (
        <div className="lg:hidden fixed bottom-4 right-4 flex flex-col gap-3">
          <Link
            href={`/locacoes/${id}/relocar`}
            className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg hover:bg-emerald-700 transition-colors"
            title="Relocar"
          >
            <ArrowRightCircle className="w-6 h-6" />
          </Link>
          <Link
            href={`/locacoes/${id}/enviar-estoque`}
            className="w-14 h-14 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg hover:bg-rose-700 transition-colors"
            title="Enviar para Estoque"
          >
            <Package className="w-6 h-6" />
          </Link>
        </div>
      )}
    </div>
  )
}
