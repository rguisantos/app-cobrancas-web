import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import Header from '@/components/layout/header'
import { formatarMoeda } from '@/shared/types'

export const metadata: Metadata = { title: 'Relatórios' }
// revalidate removido — página com dados financeiros sensíveis não deve ser cacheada

export default async function RelatoriosPage() {
  const hoje = new Date()
  const inicioMes  = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const inicioAno  = new Date(hoje.getFullYear(), 0, 1)

  const [receitaMes, receitaAno, saldoDevedor, porStatus, porRota] = await Promise.all([
    prisma.cobranca.aggregate({ where: { deletedAt: null, createdAt: { gte: inicioMes } }, _sum: { valorRecebido: true }, _count: true }),
    prisma.cobranca.aggregate({ where: { deletedAt: null, createdAt: { gte: inicioAno  } }, _sum: { valorRecebido: true }, _count: true }),
    // Saldo devedor correto: somente a última cobrança por locação
    // (cada cobrança carrega o saldo acumulado — somar todas duplicaria o valor)
    prisma.$queryRaw<{ total: number; count: number }[]>`
      SELECT
        COALESCE(SUM(saldo_devedor_gerado), 0)::float AS total,
        COUNT(*)::int AS count
      FROM (
        SELECT DISTINCT ON (locacao_id) saldo_devedor_gerado
        FROM cobrancas
        WHERE deleted_at IS NULL
          AND status IN ('Parcial', 'Pendente', 'Atrasado')
          AND saldo_devedor_gerado > 0
        ORDER BY locacao_id, updated_at DESC, created_at DESC
      ) latest
    `,
    prisma.cobranca.groupBy({ by: ['status'], where: { deletedAt: null }, _count: true, _sum: { valorRecebido: true } }),
    prisma.cliente.groupBy({
      by: ['rotaId'],
      where: { deletedAt: null, status: 'Ativo' },
      _count: true,
    }),
  ])

  const statusColors: Record<string, string> = {
    Pago: 'text-green-600', Parcial: 'text-yellow-600', Pendente: 'text-blue-600', Atrasado: 'text-red-600',
  }

  return (
    <div>
      <Header title="Relatórios" subtitle="Visão financeira e operacional do sistema" />

      {/* Receita */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card p-5 bg-green-50">
          <p className="text-sm font-medium text-green-700">Receita do Mês</p>
          <p className="text-3xl font-bold text-green-800 mt-1">{formatarMoeda(receitaMes._sum.valorRecebido ?? 0)}</p>
          <p className="text-xs text-green-600 mt-1">{receitaMes._count} cobranças</p>
        </div>
        <div className="card p-5 bg-blue-50">
          <p className="text-sm font-medium text-blue-700">Receita do Ano</p>
          <p className="text-3xl font-bold text-blue-800 mt-1">{formatarMoeda(receitaAno._sum.valorRecebido ?? 0)}</p>
          <p className="text-xs text-blue-600 mt-1">{receitaAno._count} cobranças</p>
        </div>
        <div className="card p-5 bg-red-50">
          <p className="text-sm font-medium text-red-700">Saldo Devedor Total</p>
          <p className="text-3xl font-bold text-red-800 mt-1">{formatarMoeda(saldoDevedor[0]?.total ?? 0)}</p>
          <p className="text-xs text-red-600 mt-1">{saldoDevedor[0]?.count ?? 0} locações em aberto</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cobranças por status */}
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-4">💰 Cobranças por Status</h2>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100">
              <th className="text-left font-medium text-slate-500 pb-2">Status</th>
              <th className="text-right font-medium text-slate-500 pb-2">Qtd</th>
              <th className="text-right font-medium text-slate-500 pb-2">Valor</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {porStatus.map(s => (
                <tr key={s.status}>
                  <td className={`py-2.5 font-medium ${statusColors[s.status] ?? 'text-slate-900'}`}>{s.status}</td>
                  <td className="py-2.5 text-right text-slate-600">{s._count}</td>
                  <td className="py-2.5 text-right font-medium">{formatarMoeda(s._sum.valorRecebido ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Clientes por rota */}
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-4">🗺️ Clientes por Rota</h2>
          {porRota.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhuma rota configurada</p>
          ) : (
            <div className="space-y-3">
              {porRota.map(r => (
                <div key={r.rotaId} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 truncate">{r.rotaId}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-slate-100 rounded-full h-2">
                      <div className="bg-primary-600 h-2 rounded-full" style={{ width: `${Math.min(100, (r._count / Math.max(...porRota.map(x => x._count))) * 100)}%` }} />
                    </div>
                    <span className="text-sm font-semibold w-8 text-right text-slate-900">{r._count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
