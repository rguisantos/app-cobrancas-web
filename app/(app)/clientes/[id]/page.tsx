import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Header from '@/components/layout/header'
import { StatusClienteBadge, StatusLocacaoBadge, StatusPagamentoBadge } from '@/components/ui/badge'
import { formatarMoeda } from '@/shared/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, Edit, MapPin, Phone, Mail, FileText, Calendar, TrendingUp, DollarSign, Package, Clock } from 'lucide-react'

export const metadata: Metadata = { title: 'Detalhes do Cliente' }

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()

  const cliente = await prisma.cliente.findFirst({
    where: { id, deletedAt: null },
    include: {
      rota: true,
      locacoes: { where: { deletedAt: null }, orderBy: { dataLocacao: 'desc' } },
      cobrancas: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 10 },
    },
  })

  if (!cliente) notFound()

  const podeEditar = session?.user.permissoesWeb?.todosCadastros
  const locacoesAtivas = cliente.locacoes.filter(l => l.status === 'Ativa')
  const totalRecebido = cliente.cobrancas.reduce((s, c) => s + c.valorRecebido, 0)
  const saldoDevedor = cliente.cobrancas.reduce((s, c) => s + c.saldoDevedorGerado, 0)

  return (
    <div className="pb-20 lg:pb-8">
      <Header
        title={cliente.nomeExibicao}
        subtitle={`Código: ${cliente.identificador} • ${cliente.tipoPessoa === 'Juridica' ? 'Pessoa Jurídica' : 'Pessoa Física'}`}
        actions={
          <div className="flex gap-2">
            <Link href="/clientes" className="btn-secondary text-sm">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar</span>
            </Link>
            {podeEditar && (
              <Link href={`/clientes/${cliente.id}/editar`} className="btn-primary text-sm">
                <Edit className="w-4 h-4" />
                <span className="hidden sm:inline">Editar</span>
              </Link>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dados Cadastrais */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Dados Cadastrais
              </h2>
            </div>
            <div className="p-4 md:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Status</span>
                  <StatusClienteBadge status={cliente.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Rota</span>
                  <span className="text-sm font-medium text-slate-900">{cliente.rota?.descricao ?? '—'}</span>
                </div>
                
                {cliente.cpf && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">CPF</span>
                    <span className="text-sm font-medium text-slate-900">{cliente.cpf}</span>
                  </div>
                )}
                {cliente.cnpj && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">CNPJ</span>
                    <span className="text-sm font-medium text-slate-900">{cliente.cnpj}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    Telefone
                  </span>
                  <a href={`tel:${cliente.telefonePrincipal}`} className="text-sm font-medium text-blue-600 hover:underline">
                    {cliente.telefonePrincipal}
                  </a>
                </div>
                
                {cliente.email && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />
                      Email
                    </span>
                    <a href={`mailto:${cliente.email}`} className="text-sm font-medium text-blue-600 hover:underline truncate max-w-[200px]">
                      {cliente.email}
                    </a>
                  </div>
                )}
              </div>

              {/* Endereço */}
              <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {cliente.logradouro}, {cliente.numero}
                      {cliente.complemento && ` - ${cliente.complemento}`}
                    </p>
                    <p className="text-sm text-slate-500">
                      {cliente.bairro} — {cliente.cidade}/{cliente.estado} — CEP {cliente.cep}
                    </p>
                  </div>
                </div>
              </div>

              {/* Observação */}
              {cliente.observacao && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Observação</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{cliente.observacao}</p>
                </div>
              )}
            </div>
          </section>

          {/* Locações */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-600" />
                Locações ({cliente.locacoes.length})
              </h2>
              {podeEditar && (
                <Link href={`/locacoes/nova?clienteId=${cliente.id}`} className="btn-primary text-xs py-1.5">
                  + Nova
                </Link>
              )}
            </div>
            <div className="p-4 md:p-6">
              {cliente.locacoes.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <Package className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500">Nenhuma locação registrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cliente.locacoes.slice(0, 5).map(l => (
                    <Link
                      key={l.id}
                      href={`/locacoes/${l.id}`}
                      className="block p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-slate-900">{l.produtoTipo} N° {l.produtoIdentificador}</span>
                        <StatusLocacaoBadge status={l.status} />
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(l.dataLocacao), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                        <span>{l.formaPagamento}</span>
                        <span>{l.percentualEmpresa}% empresa</span>
                      </div>
                    </Link>
                  ))}
                  {cliente.locacoes.length > 5 && (
                    <p className="text-center text-sm text-slate-400 pt-2">
                      E mais {cliente.locacoes.length - 5} locações...
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
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-xs text-slate-500">Locações Ativas</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{locacoesAtivas.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-xs text-slate-500">Cobranças</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{cliente.cobrancas.length}</p>
            </div>
          </div>

          {/* Resumo Financeiro */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Resumo Financeiro
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Total recebido</span>
                <span className="text-lg font-bold text-green-600">{formatarMoeda(totalRecebido)}</span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-sm text-slate-500">Saldo devedor</span>
                <span className="text-lg font-bold text-red-600">{formatarMoeda(saldoDevedor)}</span>
              </div>
            </div>
          </section>

          {/* Últimas Cobranças */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-600" />
                Últimas Cobranças
              </h3>
            </div>
            <div className="p-4">
              {cliente.cobrancas.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Nenhuma cobrança</p>
              ) : (
                <div className="space-y-3">
                  {cliente.cobrancas.slice(0, 5).map(c => (
                    <Link
                      key={c.id}
                      href={`/cobrancas/${c.id}`}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{formatarMoeda(c.valorRecebido)}</p>
                        <p className="text-xs text-slate-400">{format(new Date(c.createdAt), 'dd/MM/yy', { locale: ptBR })}</p>
                      </div>
                      <StatusPagamentoBadge status={c.status} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Ações Rápidas - Mobile FAB */}
          {podeEditar && (
            <div className="hidden lg:block">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <h3 className="text-sm font-medium text-slate-500 mb-3">Ações</h3>
                <div className="space-y-2">
                  <Link href={`/clientes/${cliente.id}/editar`} className="btn-secondary w-full justify-center">
                    <Edit className="w-4 h-4" />
                    Editar Cliente
                  </Link>
                  <Link href={`/locacoes/nova?clienteId=${cliente.id}`} className="btn-primary w-full justify-center">
                    <Package className="w-4 h-4" />
                    Nova Locação
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile FAB */}
      {podeEditar && (
        <div className="lg:hidden fixed bottom-4 right-4 flex flex-col gap-3">
          <Link
            href={`/locacoes/nova?clienteId=${cliente.id}`}
            className="w-14 h-14 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg hover:bg-purple-700 transition-colors"
            title="Nova Locação"
          >
            <Package className="w-6 h-6" />
          </Link>
          <Link
            href={`/clientes/${cliente.id}/editar`}
            className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors"
            title="Editar Cliente"
          >
            <Edit className="w-6 h-6" />
          </Link>
        </div>
      )}
    </div>
  )
}
