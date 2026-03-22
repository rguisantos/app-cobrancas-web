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

export const metadata: Metadata = { title: 'Cobranças' }

export default async function CobrancasPage({
  searchParams,
}: { searchParams: { status?: string; busca?: string; page?: string } }) {
  await getSession()
  const page = Number(searchParams.page || 1)
  const limit = 20

  const where: any = { deletedAt: null }
  if (searchParams.status) where.status = searchParams.status
  if (searchParams.busca) {
    where.OR = [
      { clienteNome: { contains: searchParams.busca, mode: 'insensitive' } },
      { produtoIdentificador: { contains: searchParams.busca } },
    ]
  }

  const [cobrancas, total, resumo] = await Promise.all([
    prisma.cobranca.findMany({
      where,
      include: { cliente: { select: { nomeExibicao: true } } },
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

  return (
    <div>
      <Header title="Cobranças" subtitle={`${total} registro${total !== 1 ? 's' : ''}`} />

      {/* Resumo totalizadores */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card p-4 bg-green-50">
          <p className="text-sm text-green-700 font-medium">Total Recebido</p>
          <p className="text-2xl font-bold text-green-800 mt-1">{formatarMoeda(resumo._sum.valorRecebido ?? 0)}</p>
        </div>
        <div className="card p-4 bg-red-50">
          <p className="text-sm text-red-700 font-medium">Saldo Devedor</p>
          <p className="text-2xl font-bold text-red-800 mt-1">{formatarMoeda(resumo._sum.saldoDevedorGerado ?? 0)}</p>
        </div>
      </div>

      {/* Filtros */}
      <form className="card p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48">
          <label className="label">Buscar</label>
          <input name="busca" className="input" placeholder="Cliente ou produto..." defaultValue={searchParams.busca} />
        </div>
        <div className="w-44">
          <label className="label">Status</label>
          <select name="status" className="input" defaultValue={searchParams.status}>
            <option value="">Todos</option>
            <option value="Pago">Pago</option>
            <option value="Parcial">Parcial</option>
            <option value="Pendente">Pendente</option>
            <option value="Atrasado">Atrasado</option>
          </select>
        </div>
        <button type="submit" className="btn-primary">Filtrar</button>
        <Link href="/cobrancas" className="btn-secondary">Limpar</Link>
      </form>

      {cobrancas.length === 0 ? (
        <div className="card"><EmptyState icon="💰" title="Nenhuma cobrança encontrada" /></div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left font-medium text-slate-500 px-4 py-3">Cliente</th>
                <th className="text-left font-medium text-slate-500 px-4 py-3">Produto</th>
                <th className="text-right font-medium text-slate-500 px-4 py-3">Fichas</th>
                <th className="text-right font-medium text-slate-500 px-4 py-3">Total Bruto</th>
                <th className="text-right font-medium text-slate-500 px-4 py-3">Recebido</th>
                <th className="text-right font-medium text-slate-500 px-4 py-3">Saldo Dev.</th>
                <th className="text-center font-medium text-slate-500 px-4 py-3">Status</th>
                <th className="text-right font-medium text-slate-500 px-4 py-3">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cobrancas.map(c => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900 max-w-[160px] truncate">{c.cliente?.nomeExibicao ?? c.clienteNome}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{c.produtoIdentificador}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{c.fichasRodadas}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatarMoeda(c.totalBruto)}</td>
                  <td className="px-4 py-3 text-right font-medium text-green-700">{formatarMoeda(c.valorRecebido)}</td>
                  <td className="px-4 py-3 text-right font-medium text-red-600">{c.saldoDevedorGerado > 0 ? formatarMoeda(c.saldoDevedorGerado) : '—'}</td>
                  <td className="px-4 py-3 text-center"><StatusPagamentoBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-right text-slate-500">{format(new Date(c.createdAt), 'dd/MM/yy', { locale: ptBR })}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {total > limit && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50 text-sm">
              <span className="text-slate-600">{(page-1)*limit+1}–{Math.min(page*limit, total)} de {total}</span>
              <div className="flex gap-2">
                {page > 1 && <Link href={`?page=${page-1}&status=${searchParams.status||''}`} className="btn-secondary py-1 px-3 text-xs">← Anterior</Link>}
                {page*limit < total && <Link href={`?page=${page+1}&status=${searchParams.status||''}`} className="btn-secondary py-1 px-3 text-xs">Próxima →</Link>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
