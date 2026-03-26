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
import { Edit, ArrowLeft, Clock, History } from 'lucide-react'

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

  return (
    <div>
      <Header
        title={`${produto.tipoNome} N° ${produto.identificador}`}
        subtitle={`Relógio: ${produto.numeroRelogio} • ${produto.statusProduto}`}
        actions={
          <div className="flex gap-2">
            <Link href="/produtos" className="btn-secondary">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Link>
            {podeEditar && (
              <Link href={`/produtos/${produto.id}/editar`} className="btn-primary">
                <Edit className="w-4 h-4" />
                Editar
              </Link>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dados do produto */}
          <div className="card p-6">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">🎱 Dados do Produto</h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-500">Identificador</dt>
                <dd className="mt-1 font-mono font-bold text-lg">{produto.identificador}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Número do Relógio</dt>
                <dd className="mt-1 font-mono font-medium">{produto.numeroRelogio}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Tipo</dt>
                <dd className="mt-1 font-medium">{produto.tipoNome}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Descrição</dt>
                <dd className="mt-1">{produto.descricaoNome}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Tamanho</dt>
                <dd className="mt-1">{produto.tamanhoNome}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Conservação</dt>
                <dd className="mt-1">{produto.conservacao}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd className="mt-1"><StatusProdutoBadge status={produto.statusProduto} /></dd>
              </div>
              {produto.observacao && (
                <div className="col-span-2">
                  <dt className="text-slate-500">Observação</dt>
                  <dd className="mt-1 text-slate-700">{produto.observacao}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Locação ativa */}
          {locacaoAtiva ? (
            <div className="card p-6 border-l-4 border-l-green-500">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Locação Ativa
                </h2>
                <StatusLocacaoBadge status={locacaoAtiva.status} />
              </div>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-slate-500">Cliente</dt>
                  <dd className="mt-1">
                    <Link href={`/clientes/${locacaoAtiva.clienteId}`} className="text-primary-600 hover:underline font-medium">
                      {locacaoAtiva.clienteNome}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Data da Locação</dt>
                  <dd className="mt-1">{format(new Date(locacaoAtiva.dataLocacao), 'dd/MM/yyyy', { locale: ptBR })}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Forma de Pagamento</dt>
                  <dd className="mt-1">{locacaoAtiva.formaPagamento}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Percentual Empresa</dt>
                  <dd className="mt-1">{locacaoAtiva.percentualEmpresa}%</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Preço da Ficha</dt>
                  <dd className="mt-1">{formatarMoeda(locacaoAtiva.precoFicha)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Última Leitura</dt>
                  <dd className="mt-1 font-mono">{locacaoAtiva.ultimaLeituraRelogio ?? '—'}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="card p-6 border-l-4 border-l-slate-300">
              <h2 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-300" />
                Produto em Estoque
              </h2>
              <p className="text-sm text-slate-500">Este produto não está locado no momento.</p>
            </div>
          )}

          {/* Histórico de cobranças */}
          <div className="card p-6">
            <h2 className="font-semibold text-slate-900 mb-4">💰 Histórico de Cobranças</h2>
            {produto.cobrancas.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhuma cobrança registrada.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left font-medium text-slate-500 pb-2">Cliente</th>
                    <th className="text-right font-medium text-slate-500 pb-2">Fichas</th>
                    <th className="text-right font-medium text-slate-500 pb-2">Total</th>
                    <th className="text-center font-medium text-slate-500 pb-2">Status</th>
                    <th className="text-right font-medium text-slate-500 pb-2">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {produto.cobrancas.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="py-2 font-medium">{c.clienteNome}</td>
                      <td className="py-2 text-right text-slate-600">{c.fichasRodadas}</td>
                      <td className="py-2 text-right text-slate-600">{formatarMoeda(c.totalBruto)}</td>
                      <td className="py-2 text-center"><StatusPagamentoBadge status={c.status} /></td>
                      <td className="py-2 text-right text-slate-500">{format(new Date(c.createdAt), 'dd/MM/yy', { locale: ptBR })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Histórico do relógio */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <History className="w-4 h-4" />
              Histórico do Relógio
            </h3>
            {produto.historicoRelogio.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhuma alteração registrada.</p>
            ) : (
              <div className="space-y-3">
                {produto.historicoRelogio.map(h => (
                  <div key={h.id} className="text-sm p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs">{h.relogioAnterior}</span>
                      <span className="text-slate-400">→</span>
                      <span className="font-mono text-xs font-medium">{h.relogioNovo}</span>
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

          {/* Resumo */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-4">📊 Resumo</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total cobranças</span>
                <span className="font-semibold">{produto.cobrancas.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total locações</span>
                <span className="font-semibold">{produto.locacoes.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total recebido</span>
                <span className="font-semibold text-green-600">
                  {formatarMoeda(produto.cobrancas.reduce((s, c) => s + c.valorRecebido, 0))}
                </span>
              </div>
            </div>
          </div>

          {/* Ações */}
          {podeEditar && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 mb-4">⚙️ Ações</h3>
              <div className="space-y-2">
                <Link href={`/produtos/${produto.id}/editar`} className="btn-secondary w-full justify-center">
                  <Edit className="w-4 h-4" />
                  Editar Produto
                </Link>
                {locacaoAtiva && (
                  <Link href={`/locacoes/${locacaoAtiva.id}`} className="btn-secondary w-full justify-center">
                    <Clock className="w-4 h-4" />
                    Ver Locação
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
