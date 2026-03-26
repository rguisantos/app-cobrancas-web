import { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Header from '@/components/layout/header'
import { StatusPagamentoBadge } from '@/components/ui/badge'
import EmptyState from '@/components/ui/empty-state'
import { formatarMoeda } from '@/shared/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Eye, Edit } from 'lucide-react'

export const metadata: Metadata = { title: 'Cobranças' }

export default async function CobrancasPage({
  searchParams,
}: { searchParams: Promise<{ status?: string; busca?: string; page?: string }> }) {
  const params = await searchParams
  const session = await getSession()
  const page = Number(params.page || 1)
  const limit = 20

  const where: any = { deletedAt: null }
  if (params.status) where.status = params.status
  if (params.busca) {
    where.OR = [
      { clienteNome: { contains: params.busca, mode: 'insensitive' } },
      { produtoIdentificador: { contains: params.busca } },
    ]
  }

  const [cobrancas, total, resumo] = await Promise.all([
    prisma.cobranca.findMany({
      where,
      include: { 
        cliente: { select: { nomeExibicao: true } },
        locacao: { 
          select: { 
            id: true,
            status: true,
            cobrancas: { 
              where: { deletedAt: null },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { id: true }
            }
          } 
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.cobranca.count({ where }),
    prisma.cobranca.aggregate({
      where: { deletedAt: null },
      _sum: { valorRecebido: true, saldoDevedorGerado: true },
    }),
  ])

  const podeEditar = session?.user.permissoesWeb?.todosCadastros

  // Função para verificar se é a última cobrança da locação
  const isUltimaCobranca = (cobranca: any) => {
    return cobranca.locacao?.cobrancas?.[0]?.id === cobranca.id && cobranca.locacao?.status === 'Ativa'
  }

  return (
    <div>
      <Header 
        title="Cobranças" 
        subtitle={`${total} registro${total !== 1 ? 's' : ''}`}
        actions={<Link href="/cobrancas/nova" className="btn-primary text-sm">+ Nova Cobrança</Link>}
      />

      {/* Resumo totalizadores */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6">
        <div className="card p-3 md:p-4 bg-green-50">
          <p className="text-xs md:text-sm text-green-700 font-medium">Total Recebido</p>
          <p className="text-lg md:text-2xl font-bold text-green-800 mt-1">{formatarMoeda(resumo._sum.valorRecebido ?? 0)}</p>
        </div>
        <div className="card p-3 md:p-4 bg-red-50">
          <p className="text-xs md:text-sm text-red-700 font-medium">Saldo Devedor</p>
          <p className="text-lg md:text-2xl font-bold text-red-800 mt-1">{formatarMoeda(resumo._sum.saldoDevedorGerado ?? 0)}</p>
        </div>
      </div>

      {/* Filtros */}
      <form className="card p-3 md:p-4 mb-6 flex flex-wrap gap-2 md:gap-3 items-end">
        <div className="flex-1 min-w-[140px]">
          <label className="label text-xs">Buscar</label>
          <input name="busca" className="input text-sm" placeholder="Cliente ou produto..." defaultValue={params.busca} />
        </div>
        <div className="w-32 md:w-44">
          <label className="label text-xs">Status</label>
          <select name="status" className="input text-sm" defaultValue={params.status}>
            <option value="">Todos</option>
            <option value="Pago">Pago</option>
            <option value="Parcial">Parcial</option>
            <option value="Pendente">Pendente</option>
            <option value="Atrasado">Atrasado</option>
          </select>
        </div>
        <button type="submit" className="btn-primary text-sm py-2">Filtrar</button>
        <Link href="/cobrancas" className="btn-secondary text-sm py-2 hidden sm:inline-flex">Limpar</Link>
      </form>

      {cobrancas.length === 0 ? (
        <div className="card"><EmptyState icon="💰" title="Nenhuma cobrança encontrada" /></div>
      ) : (
        <>
          {/* Tabela com scroll horizontal - funciona em mobile */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto -webkit-overflow-scrolling-touch" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table className="w-full text-sm min-w-[800px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Cliente</th>
                    <th className="text-left font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Produto</th>
                    <th className="text-left font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Período</th>
                    <th className="text-right font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Relógio</th>
                    <th className="text-right font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Fichas</th>
                    <th className="text-right font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Total</th>
                    <th className="text-right font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Recebido</th>
                    <th className="text-center font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Status</th>
                    <th className="text-center font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cobrancas.map(c => {
                    const ultima = isUltimaCobranca(c)
                    return (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900 max-w-[160px] truncate">
                          <Link href={`/clientes/${c.clienteId}`} className="hover:text-primary-600">
                            {c.cliente?.nomeExibicao ?? c.clienteNome}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                          <Link href={`/locacoes/${c.locacaoId}`} className="hover:text-primary-600">
                            {c.produtoIdentificador}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                          {format(new Date(c.dataInicio), 'dd/MM/yy', { locale: ptBR })} — {format(new Date(c.dataFim), 'dd/MM/yy', { locale: ptBR })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600 text-xs whitespace-nowrap">
                          {c.relogioAnterior} → {c.relogioAtual}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">{c.fichasRodadas}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{formatarMoeda(c.totalClientePaga)}</td>
                        <td className="px-4 py-3 text-right font-medium text-green-700">{formatarMoeda(c.valorRecebido)}</td>
                        <td className="px-4 py-3 text-center"><StatusPagamentoBadge status={c.status} /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Link 
                              href={`/cobrancas/${c.id}`}
                              className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-primary-600"
                              title="Ver detalhes"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            {ultima && podeEditar && (
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
            {total > limit && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50 text-sm">
                <span className="text-slate-600">{(page-1)*limit+1}–{Math.min(page*limit, total)} de {total}</span>
                <div className="flex gap-2">
                  {page > 1 && <Link href={`?page=${page-1}&status=${params.status||''}`} className="btn-secondary py-1 px-3 text-xs">← Anterior</Link>}
                  {page*limit < total && <Link href={`?page=${page+1}&status=${params.status||''}`} className="btn-secondary py-1 px-3 text-xs">Próxima →</Link>}
                </div>
              </div>
            )}
          </div>

          {/* Indicador de scroll para mobile */}
          <p className="text-xs text-slate-400 mt-2 md:hidden text-center">
            ← Arraste para ver mais colunas →
          </p>
        </>
      )}
    </div>
  )
}
