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

export const metadata: Metadata = { title: 'Detalhes do Cliente' }

export default async function ClienteDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession()

  const cliente = await prisma.cliente.findFirst({
    where: { id: params.id, deletedAt: null },
    include: {
      rota: true,
      locacoes: { where: { deletedAt: null }, orderBy: { dataLocacao: 'desc' } },
      cobrancas: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 10 },
    },
  })

  if (!cliente) notFound()

  const podeEditar = session?.user.permissoesWeb?.todosCadastros
  const locacoesAtivas = cliente.locacoes.filter(l => l.status === 'Ativa')

  return (
    <div>
      <Header
        title={cliente.nomeExibicao}
        subtitle={`Código: ${cliente.identificador} • ${cliente.tipoPessoa === 'Juridica' ? 'Pessoa Jurídica' : 'Pessoa Física'}`}
        actions={
          <div className="flex gap-2">
            <Link href="/clientes" className="btn-secondary">← Voltar</Link>
            {podeEditar && <Link href={`/clientes/${cliente.id}/editar`} className="btn-primary">Editar</Link>}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dados do cliente */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">👤 Dados Cadastrais</h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-slate-500">Status</dt><dd className="mt-1"><StatusClienteBadge status={cliente.status} /></dd></div>
              <div><dt className="text-slate-500">Rota</dt><dd className="mt-1 font-medium">{cliente.rota?.descricao ?? '—'}</dd></div>
              {cliente.cpf && <div><dt className="text-slate-500">CPF</dt><dd className="mt-1">{cliente.cpf}</dd></div>}
              {cliente.cnpj && <div><dt className="text-slate-500">CNPJ</dt><dd className="mt-1">{cliente.cnpj}</dd></div>}
              <div><dt className="text-slate-500">Telefone</dt><dd className="mt-1">{cliente.telefonePrincipal}</dd></div>
              {cliente.email && <div><dt className="text-slate-500">Email</dt><dd className="mt-1">{cliente.email}</dd></div>}
              <div className="col-span-2"><dt className="text-slate-500">Endereço</dt>
                <dd className="mt-1">{cliente.logradouro}, {cliente.numero}{cliente.complemento ? ` - ${cliente.complemento}` : ''}<br />
                  {cliente.bairro} — {cliente.cidade}/{cliente.estado} — CEP {cliente.cep}</dd>
              </div>
              {cliente.observacao && <div className="col-span-2"><dt className="text-slate-500">Observação</dt><dd className="mt-1 text-slate-700">{cliente.observacao}</dd></div>}
            </dl>
          </div>

          {/* Locações */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">🎱 Locações ({cliente.locacoes.length})</h2>
              {podeEditar && <Link href={`/locacoes/nova?clienteId=${cliente.id}`} className="btn-primary text-xs py-1.5">+ Nova Locação</Link>}
            </div>
            {cliente.locacoes.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhuma locação registrada.</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-100">
                  <th className="text-left font-medium text-slate-500 pb-2">Produto</th>
                  <th className="text-left font-medium text-slate-500 pb-2">Forma</th>
                  <th className="text-right font-medium text-slate-500 pb-2">% Empresa</th>
                  <th className="text-center font-medium text-slate-500 pb-2">Status</th>
                  <th className="text-right font-medium text-slate-500 pb-2">Data</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {cliente.locacoes.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="py-2 font-medium">{l.produtoTipo} N° {l.produtoIdentificador}</td>
                      <td className="py-2 text-slate-600 text-xs">{l.formaPagamento}</td>
                      <td className="py-2 text-right">{l.percentualEmpresa}%</td>
                      <td className="py-2 text-center"><StatusLocacaoBadge status={l.status} /></td>
                      <td className="py-2 text-right text-slate-500">{format(new Date(l.dataLocacao), 'dd/MM/yy', { locale: ptBR })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Sidebar direita */}
        <div className="space-y-6">
          {/* Resumo */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-4">📊 Resumo</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Locações ativas</span>
                <span className="font-semibold text-green-600">{locacoesAtivas.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total cobranças</span>
                <span className="font-semibold">{cliente.cobrancas.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total recebido</span>
                <span className="font-semibold text-green-600">
                  {formatarMoeda(cliente.cobrancas.reduce((s, c) => s + c.valorRecebido, 0))}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Saldo devedor</span>
                <span className="font-semibold text-red-600">
                  {formatarMoeda(cliente.cobrancas.reduce((s, c) => s + c.saldoDevedorGerado, 0))}
                </span>
              </div>
            </div>
          </div>

          {/* Últimas cobranças */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-3">💰 Últimas Cobranças</h3>
            {cliente.cobrancas.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhuma cobrança</p>
            ) : (
              <div className="space-y-2">
                {cliente.cobrancas.slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-slate-900">{formatarMoeda(c.valorRecebido)}</p>
                      <p className="text-xs text-slate-400">{format(new Date(c.createdAt), 'dd/MM/yy', { locale: ptBR })}</p>
                    </div>
                    <StatusPagamentoBadge status={c.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
