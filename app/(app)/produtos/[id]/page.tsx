import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Header from '@/components/layout/header'
import { StatusProdutoBadge, StatusLocacaoBadge, StatusPagamentoBadge } from '@/components/ui/badge'
import { formatarMoeda } from '@/shared/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Edit, ArrowLeft, Clock, History, Hash, Settings, Wrench, Calendar, DollarSign, Package, TrendingUp, MapPin } from 'lucide-react'

export const metadata: Metadata = { title: 'Detalhes do Produto' }

export default async function ProdutoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()

  const produto = await prisma.produto.findFirst({
    where: { id, deletedAt: null },
    include: {
      locacoes: {
        where: { deletedAt: null },
        include: { cliente: { select: { nomeExibicao: true, id: true } } },
        orderBy: { dataLocacao: 'desc' },
        take: 10
      },
      cobrancas: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10
      },
      historicoRelogio: {
        orderBy: { dataAlteracao: 'desc' },
        take: 5
      }
    }
  })

  if (!produto) notFound()

  const podeEditar = session?.user.permissoesWeb?.todosCadastros
  const locacaoAtiva = produto.locacoes.find(l => l.status === 'Ativa')
  const totalRecebido = produto.cobrancas.reduce((s, c) => s + c.valorRecebido, 0)

  return (
    <div className="pb-20 lg:pb-8">
      <Header
        title={`${produto.tipoNome} N° ${produto.identificador}`}
        subtitle={`Relógio: ${produto.numeroRelogio} • ${produto.statusProduto}`}
        actions={
          <div className="flex gap-2">
            <Link href="/produtos" className="btn-secondary text-sm">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar</span>
            </Link>
            {podeEditar && (
              <Link href={`/produtos/${produto.id}/editar`} className="btn-primary text-sm">
                <Edit className="w-4 h-4" />
                <span className="hidden sm:inline">Editar</span>
              </Link>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dados do produto */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Dados do Produto
              </h2>
            </div>
            <div className="p-4 md:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Identificador</span>
                  <span className="text-lg font-mono font-bold text-slate-900">{produto.identificador}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Número do Relógio</span>
                  <span className="text-lg font-mono font-medium text-slate-900">{produto.numeroRelogio}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Tipo</span>
                  <span className="text-sm font-medium text-slate-900">{produto.tipoNome}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Descrição</span>
                  <span className="text-sm font-medium text-slate-900">{produto.descricaoNome}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Tamanho</span>
                  <span className="text-sm font-medium text-slate-900">{produto.tamanhoNome}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Conservação</span>
                  <span className="text-sm font-medium text-slate-900">{produto.conservacao}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Status</span>
                  <StatusProdutoBadge status={produto.statusProduto} />
                </div>
                {produto.estabelecimento && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      Estabelecimento
                    </span>
                    <span className="text-sm font-medium text-slate-900">{produto.estabelecimento}</span>
                  </div>
                )}
              </div>

              {/* Códigos */}
              {(produto.codigoCH || produto.codigoABLF) && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Códigos Internos</p>
                  <div className="flex flex-wrap gap-3">
                    {produto.codigoCH && (
                      <span className="px-3 py-1.5 bg-slate-100 rounded-lg text-sm font-mono text-slate-700">
                        CH: {produto.codigoCH}
                      </span>
                    )}
                    {produto.codigoABLF && (
                      <span className="px-3 py-1.5 bg-slate-100 rounded-lg text-sm font-mono text-slate-700">
                        ABLF: {produto.codigoABLF}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Observação */}
              {produto.observacao && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Observação</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{produto.observacao}</p>
                </div>
              )}
            </div>
          </section>

          {/* Locação ativa */}
          {locacaoAtiva ? (
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden border-l-4 border-l-emerald-500">
              <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-emerald-50/50 flex items-center justify-between">
                <h2 className="font-semibold text-emerald-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Locação Ativa
                </h2>
                <StatusLocacaoBadge status={locacaoAtiva.status} />
              </div>
              <div className="p-4 md:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-500">Cliente</span>
                    <Link href={`/clientes/${locacaoAtiva.clienteId}`} className="block text-lg font-semibold text-blue-600 hover:underline mt-1">
                      {locacaoAtiva.clienteNome}
                    </Link>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Data da Locação</span>
                    <p className="text-lg font-medium text-slate-900 mt-1">{format(new Date(locacaoAtiva.dataLocacao), 'dd/MM/yyyy', { locale: ptBR })}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Forma de Pagamento</span>
                    <p className="text-sm font-medium text-slate-900 mt-1">{locacaoAtiva.formaPagamento}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Percentual Empresa</span>
                    <p className="text-sm font-medium text-slate-900 mt-1">{locacaoAtiva.percentualEmpresa}%</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Preço da Ficha</span>
                    <p className="text-sm font-medium text-slate-900 mt-1">{formatarMoeda(locacaoAtiva.precoFicha)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Última Leitura</span>
                    <p className="text-sm font-mono font-bold text-slate-900 mt-1">{locacaoAtiva.ultimaLeituraRelogio ?? '—'}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <Link href={`/locacoes/${locacaoAtiva.id}`} className="btn-secondary text-sm">
                    Ver detalhes da locação
                  </Link>
                </div>
              </div>
            </section>
          ) : (
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden border-l-4 border-l-slate-300">
              <div className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <Package className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Produto em Estoque</h3>
                    <p className="text-sm text-slate-500">Este produto não está locado no momento.</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Histórico de cobranças */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-600" />
                Histórico de Cobranças
              </h2>
              <span className="text-sm text-slate-500">{produto.cobrancas.length} cobrança(s)</span>
            </div>
            <div className="p-4 md:p-6">
              {produto.cobrancas.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <DollarSign className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500">Nenhuma cobrança registrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {produto.cobrancas.slice(0, 5).map(c => (
                    <Link
                      key={c.id}
                      href={`/cobrancas/${c.id}`}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 transition-all"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{c.clienteNome}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <span>{c.fichasRodadas} fichas</span>
                          <span>•</span>
                          <span>{format(new Date(c.createdAt), 'dd/MM/yy', { locale: ptBR })}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">{formatarMoeda(c.totalBruto)}</p>
                        <StatusPagamentoBadge status={c.status} />
                      </div>
                    </Link>
                  ))}
                  {produto.cobrancas.length > 5 && (
                    <p className="text-center text-sm text-slate-400 pt-2">
                      E mais {produto.cobrancas.length - 5} cobranças...
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-xs text-slate-500">Cobranças</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{produto.cobrancas.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Package className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-xs text-slate-500">Locações</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{produto.locacoes.length}</p>
            </div>
          </div>

          {/* Resumo Financeiro */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Resumo
              </h3>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Total recebido</span>
                <span className="text-lg font-bold text-green-600">{formatarMoeda(totalRecebido)}</span>
              </div>
            </div>
          </section>

          {/* Histórico do relógio */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-slate-600" />
                Histórico do Relógio
              </h3>
            </div>
            <div className="p-4">
              {produto.historicoRelogio.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Nenhuma alteração registrada</p>
              ) : (
                <div className="space-y-3">
                  {produto.historicoRelogio.map(h => (
                    <div key={h.id} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-slate-500">{h.relogioAnterior}</span>
                        <span className="text-slate-300">→</span>
                        <span className="font-mono text-xs font-bold text-slate-900">{h.relogioNovo}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{h.motivo}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {format(new Date(h.dataAlteracao), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Manutenção */}
          {(produto.dataUltimaManutencao || produto.relatorioUltimaManutencao) && (
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-amber-600" />
                  Manutenção
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {produto.dataUltimaManutencao && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Última manutenção</span>
                    <span className="font-medium">{format(new Date(produto.dataUltimaManutencao), 'dd/MM/yyyy', { locale: ptBR })}</span>
                  </div>
                )}
                {produto.relatorioUltimaManutencao && (
                  <div>
                    <span className="text-xs text-slate-500">Relatório</span>
                    <p className="text-sm text-slate-700 mt-1 bg-slate-50 rounded-lg p-2">{produto.relatorioUltimaManutencao}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Ações */}
          {podeEditar && (
            <div className="hidden lg:block">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <h3 className="text-sm font-medium text-slate-500 mb-3">Ações</h3>
                <div className="space-y-2">
                  <Link href={`/produtos/${produto.id}/editar`} className="btn-secondary w-full justify-center">
                    <Edit className="w-4 h-4" />
                    Editar Produto
                  </Link>
                  {locacaoAtiva && (
                    <Link href={`/locacoes/${locacaoAtiva.id}`} className="btn-primary w-full justify-center">
                      <Clock className="w-4 h-4" />
                      Ver Locação
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile FAB */}
      {podeEditar && (
        <div className="lg:hidden fixed bottom-4 right-4">
          <Link
            href={`/produtos/${produto.id}/editar`}
            className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors"
            title="Editar Produto"
          >
            <Edit className="w-6 h-6" />
          </Link>
        </div>
      )}
    </div>
  )
}
