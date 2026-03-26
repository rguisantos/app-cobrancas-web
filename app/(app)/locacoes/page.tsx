import { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Header from '@/components/layout/header'
import { StatusLocacaoBadge } from '@/components/ui/badge'
import EmptyState from '@/components/ui/empty-state'
import { formatarMoeda } from '@/shared/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const metadata: Metadata = { title: 'Locações' }

export default async function LocacoesPage({
  searchParams,
}: { searchParams: Promise<{ status?: string; clienteId?: string; page?: string }> }) {
  const params = await searchParams
  const session = await getSession()
  const page = Number(params.page || 1)
  const limit = 20

  const where: any = { deletedAt: null }
  if (params.status) where.status = params.status
  if (params.clienteId) where.clienteId = params.clienteId

  const [locacoes, total, clientes] = await Promise.all([
    prisma.locacao.findMany({
      where,
      include: {
        cliente: { select: { nomeExibicao: true } },
        produto: { select: { identificador: true, tipoNome: true, numeroRelogio: true } }
      },
      orderBy: { dataLocacao: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.locacao.count({ where }),
    prisma.cliente.findMany({
      where: { status: 'Ativo', deletedAt: null },
      select: { id: true, nomeExibicao: true },
      orderBy: { nomeExibicao: 'asc' }
    }),
  ])

  const podeEditar = session?.user.permissoesWeb?.todosCadastros

  return (
    <div>
      <Header
        title="Locações"
        subtitle={`${total} locação${total !== 1 ? 'ões' : ''} registrada${total !== 1 ? 's' : ''}`}
        actions={podeEditar && <Link href="/locacoes/nova" className="btn-primary text-sm">+ Nova Locação</Link>}
      />

      <form className="card p-3 md:p-4 mb-6 flex flex-wrap gap-2 md:gap-3 items-end">
        <div className="w-48 md:w-64">
          <label className="label text-xs">Cliente</label>
          <select name="clienteId" className="input text-sm" defaultValue={params.clienteId}>
            <option value="">Todos os clientes</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>{c.nomeExibicao}</option>
            ))}
          </select>
        </div>
        <div className="w-32 md:w-44">
          <label className="label text-xs">Status</label>
          <select name="status" className="input text-sm" defaultValue={params.status}>
            <option value="">Todos</option>
            <option value="Ativa">Ativa</option>
            <option value="Finalizada">Finalizada</option>
            <option value="Cancelada">Cancelada</option>
          </select>
        </div>
        <button type="submit" className="btn-primary text-sm py-2">Filtrar</button>
        <Link href="/locacoes" className="btn-secondary text-sm py-2 hidden sm:inline-flex">Limpar</Link>
      </form>

      {locacoes.length === 0 ? (
        <div className="card">
          <EmptyState icon="📋" title="Nenhuma locação encontrada" description="As locações aparecerão aqui assim que forem criadas." />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto -webkit-overflow-scrolling-touch" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Produto</th>
                  <th className="text-left font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Cliente</th>
                  <th className="text-left font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Forma Pgto</th>
                  <th className="text-right font-medium text-slate-500 px-4 py-3 whitespace-nowrap">% Empresa</th>
                  <th className="text-right font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Preço Ficha</th>
                  <th className="text-right font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Relógio</th>
                  <th className="text-center font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="text-right font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Data</th>
                  <th className="px-4 py-3 whitespace-nowrap" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {locacoes.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-900">{l.produtoTipo}</span>
                      <span className="text-slate-500 ml-1">N° {l.produtoIdentificador}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{l.cliente?.nomeExibicao ?? l.clienteNome}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{l.formaPagamento}</td>
                    <td className="px-4 py-3 text-right">{l.percentualEmpresa}%</td>
                    <td className="px-4 py-3 text-right">{formatarMoeda(l.precoFicha)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">{l.produto?.numeroRelogio || l.numeroRelogio}</td>
                    <td className="px-4 py-3 text-center"><StatusLocacaoBadge status={l.status} /></td>
                    <td className="px-4 py-3 text-right text-slate-500">{format(new Date(l.dataLocacao), 'dd/MM/yy', { locale: ptBR })}</td>
                    <td className="px-4 py-3">
                      <Link href={`/locacoes/${l.id}`} className="text-primary-600 hover:text-primary-800 text-xs font-medium">
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > limit && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50 text-sm text-slate-600">
              <span className="text-xs md:text-sm">Exibindo {(page-1)*limit+1}–{Math.min(page*limit, total)} de {total}</span>
              <div className="flex gap-2">
                {page > 1 && <Link href={`?page=${page-1}&status=${params.status||''}&clienteId=${params.clienteId||''}`} className="btn-secondary py-1 px-3 text-xs">← Anterior</Link>}
                {page * limit < total && <Link href={`?page=${page+1}&status=${params.status||''}&clienteId=${params.clienteId||''}`} className="btn-secondary py-1 px-3 text-xs">Próxima →</Link>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Indicador de scroll para mobile */}
      {locacoes.length > 0 && (
        <p className="text-xs text-slate-400 mt-2 md:hidden text-center">
          ← Arraste para ver mais colunas →
        </p>
      )}
    </div>
  )
}
