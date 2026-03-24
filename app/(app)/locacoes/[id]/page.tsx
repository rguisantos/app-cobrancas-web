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
import { ArrowLeft, Edit, DollarSign, ArrowRightCircle, Package } from 'lucide-react'

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
          <div className="flex gap-2">
            <Link href="/locacoes" className="btn-secondary">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Link>
            {locacao.status === 'Ativa' && podeEditar && (
              <>
                <Link href={`/locacoes/${id}/relocar`} className="btn-secondary">
                  <ArrowRightCircle className="w-4 h-4" />
                  Relocar
                </Link>
                <Link href={`/locacoes/${id}/enviar-estoque`} className="btn-secondary bg-red-100 text-red-700 hover:bg-red-200 border-red-200">
                  <Package className="w-4 h-4" />
                  Enviar ao Estoque
                </Link>
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dados da locação */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">📋 Dados da Locação</h2>
              <StatusLocacaoBadge status={locacao.status} />
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-500">Cliente</dt>
                <dd className="mt-1">
                  <Link href={`/clientes/${locacao.clienteId}`} className="text-primary-600 hover:underline font-medium">
                    {locacao.clienteNome}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Produto</dt>
                <dd className="mt-1">
                  <Link href={`/produtos/${locacao.produtoId}`} className="text-primary-600 hover:underline font-medium">
                    {locacao.produtoTipo} N° {locacao.produtoIdentificador}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Data da Locação</dt>
                <dd className="mt-1">{format(new Date(locacao.dataLocacao), 'dd/MM/yyyy', { locale: ptBR })}</dd>
              </div>
              {locacao.dataFim && (
                <div>
                  <dt className="text-slate-500">Data de Término</dt>
                  <dd className="mt-1">{format(new Date(locacao.dataFim), 'dd/MM/yyyy', { locale: ptBR })}</dd>
                </div>
              )}
              <div>
                <dt className="text-slate-500">Forma de Pagamento</dt>
                <dd className="mt-1">{locacao.formaPagamento}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Número do Relógio</dt>
                <dd className="mt-1 font-mono">{locacao.numeroRelogio}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Preço da Ficha</dt>
                <dd className="mt-1">{formatarMoeda(locacao.precoFicha)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Percentual Empresa</dt>
                <dd className="mt-1">{locacao.percentualEmpresa}%</dd>
              </div>
              {locacao.valorFixo && (
                <div>
                  <dt className="text-slate-500">Valor Fixo</dt>
                  <dd className="mt-1">{formatarMoeda(locacao.valorFixo)}</dd>
                </div>
              )}
              {locacao.periodicidade && (
                <div>
                  <dt className="text-slate-500">Periodicidade</dt>
                  <dd className="mt-1">{locacao.periodicidade}</dd>
                </div>
              )}
              {locacao.observacao && (
                <div className="col-span-2">
                  <dt className="text-slate-500">Observação</dt>
                  <dd className="mt-1 text-slate-700">{locacao.observacao}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Histórico de cobranças */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">💰 Histórico de Cobranças</h2>
              <span className="text-sm text-slate-500">{locacao.cobrancas.length} cobrança(s)</span>
            </div>
            {locacao.cobrancas.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhuma cobrança registrada para esta locação.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left font-medium text-slate-500 pb-2">Período</th>
                    <th className="text-right font-medium text-slate-500 pb-2">Fichas</th>
                    <th className="text-right font-medium text-slate-500 pb-2">Total Bruto</th>
                    <th className="text-right font-medium text-slate-500 pb-2">Recebido</th>
                    <th className="text-center font-medium text-slate-500 pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {locacao.cobrancas.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="py-2">
                        {format(new Date(c.dataInicio), 'dd/MM/yy', { locale: ptBR })} — {format(new Date(c.dataFim), 'dd/MM/yy', { locale: ptBR })}
                      </td>
                      <td className="py-2 text-right text-slate-600">{c.fichasRodadas}</td>
                      <td className="py-2 text-right text-slate-600">{formatarMoeda(c.totalBruto)}</td>
                      <td className="py-2 text-right font-medium text-green-700">{formatarMoeda(c.valorRecebido)}</td>
                      <td className="py-2 text-center"><StatusPagamentoBadge status={c.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Cliente info */}
          <div className="card p-5">
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
          <div className="card p-5">
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
              {locacao.ultimaLeituraRelogio !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Última leitura</span>
                  <span className="font-mono">{locacao.ultimaLeituraRelogio}</span>
                </div>
              )}
            </div>
          </div>

          {/* Produto info */}
          <div className="card p-5">
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
