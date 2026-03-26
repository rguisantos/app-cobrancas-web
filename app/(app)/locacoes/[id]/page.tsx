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
import { ArrowLeft, Edit, ArrowRightCircle, Package, Eye } from 'lucide-react'

export const metadata: Metadata = { title: 'Detalhes da Locação' }

export default async function LocacaoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()

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

  return (
    <div>
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
                <Link href={`/locacoes/${id}/enviar-estoque`} className="btn-secondary bg-red-100 text-red-700 hover:bg-red-200 border-red-200 text-sm">
                  <Package className="w-4 h-4" />
                  <span className="hidden sm:inline">Estoque</span>
                </Link>
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* Dados da locação */}
          <div className="card p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">📋 Dados da Locação</h2>
              <StatusLocacaoBadge status={locacao.status} />
            </div>
            <dl className="grid grid-cols-2 gap-3 md:gap-4 text-sm">
              <div>
                <dt className="text-slate-500 text-xs">Cliente</dt>
                <dd className="mt-1">
                  <Link href={`/clientes/${locacao.clienteId}`} className="text-primary-600 hover:underline font-medium">
                    {locacao.clienteNome}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs">Produto</dt>
                <dd className="mt-1">
                  <Link href={`/produtos/${locacao.produtoId}`} className="text-primary-600 hover:underline font-medium">
                    {locacao.produtoTipo} N° {locacao.produtoIdentificador}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs">Data da Locação</dt>
                <dd className="mt-1">{format(new Date(locacao.dataLocacao), 'dd/MM/yyyy', { locale: ptBR })}</dd>
              </div>
              {locacao.dataFim && (
                <div>
                  <dt className="text-slate-500 text-xs">Data de Término</dt>
                  <dd className="mt-1">{format(new Date(locacao.dataFim), 'dd/MM/yyyy', { locale: ptBR })}</dd>
                </div>
              )}
              <div>
                <dt className="text-slate-500 text-xs">Forma de Pagamento</dt>
                <dd className="mt-1">{locacao.formaPagamento}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs">Número do Relógio</dt>
                <dd className="mt-1 font-mono font-bold">{locacao.produto?.numeroRelogio || locacao.numeroRelogio}</dd>
              </div>
              {locacao.formaPagamento !== 'Periodo' && (
                <>
                  <div>
                    <dt className="text-slate-500 text-xs">Preço da Ficha</dt>
                    <dd className="mt-1">{formatarMoeda(locacao.precoFicha)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 text-xs">Percentual Empresa</dt>
                    <dd className="mt-1">{locacao.percentualEmpresa}%</dd>
                  </div>
                </>
              )}
              {locacao.formaPagamento === 'Periodo' && locacao.valorFixo && (
                <>
                  <div>
                    <dt className="text-slate-500 text-xs">Valor Fixo</dt>
                    <dd className="mt-1 font-bold text-green-700">{formatarMoeda(locacao.valorFixo)}</dd>
                  </div>
                  {locacao.periodicidade && (
                    <div>
                      <dt className="text-slate-500 text-xs">Periodicidade</dt>
                      <dd className="mt-1">{locacao.periodicidade}</dd>
                    </div>
                  )}
                </>
              )}
              {locacao.observacao && (
                <div className="col-span-2">
                  <dt className="text-slate-500 text-xs">Observação</dt>
                  <dd className="mt-1 text-slate-700">{locacao.observacao}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Histórico de cobranças */}
          <div className="card p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">💰 Histórico de Cobranças</h2>
              <span className="text-sm text-slate-500">{locacao.cobrancas.length} cobrança(s)</span>
            </div>
            {locacao.cobrancas.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhuma cobrança registrada para esta locação.</p>
            ) : (
              <>
                {/* Tabela com scroll horizontal */}
                <div className="overflow-x-auto -webkit-overflow-scrolling-touch" style={{ WebkitOverflowScrolling: 'touch' }}>
                  <table className="w-full text-sm min-w-[600px]">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left font-medium text-slate-500 pb-2 text-xs whitespace-nowrap">Período</th>
                        <th className="text-right font-medium text-slate-500 pb-2 text-xs whitespace-nowrap">Relógio</th>
                        <th className="text-right font-medium text-slate-500 pb-2 text-xs whitespace-nowrap">Fichas</th>
                        <th className="text-right font-medium text-slate-500 pb-2 text-xs whitespace-nowrap">Total</th>
                        <th className="text-right font-medium text-slate-500 pb-2 text-xs whitespace-nowrap">Recebido</th>
                        <th className="text-center font-medium text-slate-500 pb-2 text-xs whitespace-nowrap">Status</th>
                        <th className="text-center font-medium text-slate-500 pb-2 text-xs whitespace-nowrap">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {locacao.cobrancas.map((c, idx) => {
                        const isUltima = idx === 0 && locacao.status === 'Ativa'
                        return (
                          <tr key={c.id} className={`hover:bg-slate-50 ${isUltima ? 'bg-green-50/50' : ''}`}>
                            <td className="py-3 text-xs whitespace-nowrap">
                              {format(new Date(c.dataInicio), 'dd/MM/yy', { locale: ptBR })} — {format(new Date(c.dataFim), 'dd/MM/yy', { locale: ptBR })}
                              {isUltima && (
                                <span className="ml-2 text-xs text-green-600 font-medium">(atual)</span>
                              )}
                            </td>
                            <td className="py-3 text-right font-mono text-xs text-slate-600 whitespace-nowrap">
                              {c.relogioAnterior} → {c.relogioAtual}
                            </td>
                            <td className="py-3 text-right text-slate-600">{c.fichasRodadas}</td>
                            <td className="py-3 text-right text-slate-600">{formatarMoeda(c.totalClientePaga)}</td>
                            <td className="py-3 text-right font-medium text-green-700">{formatarMoeda(c.valorRecebido)}</td>
                            <td className="py-3 text-center"><StatusPagamentoBadge status={c.status} /></td>
                            <td className="py-3">
                              <div className="flex items-center justify-center gap-1">
                                <Link 
                                  href={`/cobrancas/${c.id}`}
                                  className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-primary-600"
                                  title="Ver detalhes"
                                >
                                  <Eye className="w-4 h-4" />
                                </Link>
                                {isUltima && podeEditar && (
                                  <Link 
                                    href={`/cobrancas/${c.id}/editar`}
                                    className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-primary-600"
                                    title="Editar (última cobrança)"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Link>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Indicador de scroll para mobile */}
                <p className="text-xs text-slate-400 mt-2 md:hidden text-center">
                  ← Arraste para ver mais colunas →
                </p>
              </>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 md:space-y-6">
          {/* Cliente info */}
          <div className="card p-4 md:p-5">
            <h3 className="font-semibold text-slate-900 mb-4">👤 Cliente</h3>
            <div className="space-y-2 text-sm">
              <p className="font-medium">{locacao.cliente?.nomeExibicao ?? locacao.clienteNome}</p>
              {locacao.cliente?.telefonePrincipal && (
                <p className="text-slate-500">{locacao.cliente.telefonePrincipal}</p>
              )}
              {locacao.cliente?.rota && (
                <p className="text-slate-500">Rota: {locacao.cliente.rota.descricao}</p>
              )}
              <Link 
                href={`/clientes/${locacao.clienteId}`}
                className="inline-block text-primary-600 hover:underline text-xs mt-2"
              >
                Ver cliente →
              </Link>
            </div>
          </div>

          {/* Resumo */}
          <div className="card p-4 md:p-5">
            <h3 className="font-semibold text-slate-900 mb-4">📊 Resumo</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total cobranças</span>
                <span className="font-semibold">{locacao.cobrancas.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total recebido</span>
                <span className="font-semibold text-green-600">
                  {formatarMoeda(locacao.cobrancas.reduce((s, c) => s + c.valorRecebido, 0))}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Saldo devedor</span>
                <span className="font-semibold text-red-600">
                  {formatarMoeda(locacao.cobrancas.reduce((s, c) => s + c.saldoDevedorGerado, 0))}
                </span>
              </div>
              {locacao.ultimaLeituraRelogio !== null && locacao.ultimaLeituraRelogio !== undefined && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Última leitura</span>
                  <span className="font-mono">{locacao.ultimaLeituraRelogio}</span>
                </div>
              )}
            </div>
          </div>

          {/* Produto info */}
          <div className="card p-4 md:p-5">
            <h3 className="font-semibold text-slate-900 mb-4">🎱 Produto</h3>
            <div className="space-y-2 text-sm">
              <p className="font-medium">{locacao.produto?.tipoNome} N° {locacao.produto?.identificador}</p>
              <p className="text-slate-500">{locacao.produto?.descricaoNome} - {locacao.produto?.tamanhoNome}</p>
              <p className="text-slate-500">Conservação: {locacao.produto?.conservacao}</p>
              <Link 
                href={`/produtos/${locacao.produtoId}`}
                className="inline-block text-primary-600 hover:underline text-xs mt-2"
              >
                Ver produto →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
