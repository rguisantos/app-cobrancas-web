import { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Header from '@/components/layout/header'
import { StatusClienteBadge } from '@/components/ui/badge'
import EmptyState from '@/components/ui/empty-state'

export const metadata: Metadata = { title: 'Clientes' }

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; rotaId?: string; status?: string; page?: string }>
}) {
  const params = await searchParams
  const session = await getSession()
  const page    = Number(params.page || 1)
  const limit   = 20

  const where: any = { deletedAt: null }
  if (params.busca) {
    where.OR = [
      { nomeExibicao:     { contains: params.busca, mode: 'insensitive' } },
      { identificador:    { contains: params.busca, mode: 'insensitive' } },
      { telefonePrincipal:{ contains: params.busca } },
    ]
  }
  if (params.rotaId) where.rotaId = params.rotaId
  if (params.status) where.status  = params.status

  const [clientes, total, rotas] = await Promise.all([
    prisma.cliente.findMany({
      where,
      include: { rota: { select: { descricao: true } } },
      orderBy: { nomeExibicao: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.cliente.count({ where }),
    prisma.rota.findMany({ where: { status: 'Ativo', deletedAt: null }, orderBy: { descricao: 'asc' } }),
  ])

  const podeEditar = session?.user.permissoesWeb?.todosCadastros

  return (
    <div>
      <Header
        title="Clientes"
        subtitle={`${total} cliente${total !== 1 ? 's' : ''} cadastrado${total !== 1 ? 's' : ''}`}
        actions={
          podeEditar && (
            <Link href="/clientes/novo" className="btn-primary text-sm">
              + Novo Cliente
            </Link>
          )
        }
      />

      {/* Filtros */}
      <form className="card p-3 md:p-4 mb-6 flex flex-wrap gap-2 md:gap-3 items-end">
        <div className="flex-1 min-w-[140px]">
          <label className="label text-xs">Buscar</label>
          <input name="busca" className="input text-sm" placeholder="Nome, código ou telefone..." defaultValue={params.busca} />
        </div>
        <div className="w-36 md:w-48">
          <label className="label text-xs">Rota</label>
          <select name="rotaId" className="input text-sm" defaultValue={params.rotaId}>
            <option value="">Todas as rotas</option>
            {rotas.map(r => <option key={r.id} value={r.id}>{r.descricao}</option>)}
          </select>
        </div>
        <div className="w-28 md:w-36">
          <label className="label text-xs">Status</label>
          <select name="status" className="input text-sm" defaultValue={params.status}>
            <option value="">Todos</option>
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Inativo</option>
          </select>
        </div>
        <button type="submit" className="btn-primary text-sm py-2">Filtrar</button>
        <Link href="/clientes" className="btn-secondary text-sm py-2 hidden sm:inline-flex">Limpar</Link>
      </form>

      {/* Tabela */}
      {clientes.length === 0 ? (
        <div className="card">
          <EmptyState icon="👥" title="Nenhum cliente encontrado" description="Tente ajustar os filtros ou cadastre um novo cliente." />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto -webkit-overflow-scrolling-touch" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Código</th>
                  <th className="text-left font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Nome</th>
                  <th className="text-left font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Telefone</th>
                  <th className="text-left font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Rota</th>
                  <th className="text-left font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Cidade</th>
                  <th className="text-center font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 whitespace-nowrap" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientes.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{c.identificador}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{c.nomeExibicao}</td>
                    <td className="px-4 py-3 text-slate-600">{c.telefonePrincipal}</td>
                    <td className="px-4 py-3 text-slate-600">{c.rota?.descricao ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{c.cidade}/{c.estado}</td>
                    <td className="px-4 py-3 text-center"><StatusClienteBadge status={c.status} /></td>
                    <td className="px-4 py-3">
                      <Link href={`/clientes/${c.id}`} className="text-primary-600 hover:text-primary-800 text-xs font-medium">
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação simples */}
          {total > limit && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50 text-sm text-slate-600">
              <span className="text-xs md:text-sm">Exibindo {(page-1)*limit+1}–{Math.min(page*limit, total)} de {total}</span>
              <div className="flex gap-2">
                {page > 1 && <Link href={`?page=${page-1}&busca=${params.busca||''}&rotaId=${params.rotaId||''}`} className="btn-secondary py-1 px-3 text-xs">← Anterior</Link>}
                {page * limit < total && <Link href={`?page=${page+1}&busca=${params.busca||''}&rotaId=${params.rotaId||''}`} className="btn-secondary py-1 px-3 text-xs">Próxima →</Link>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Indicador de scroll para mobile */}
      {clientes.length > 0 && (
        <p className="text-xs text-slate-400 mt-2 md:hidden text-center">
          ← Arraste para ver mais colunas →
        </p>
      )}
    </div>
  )
}
