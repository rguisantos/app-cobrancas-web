import { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Header from '@/components/layout/header'
import { StatusProdutoBadge } from '@/components/ui/badge'
import EmptyState from '@/components/ui/empty-state'

export const metadata: Metadata = { title: 'Produtos' }

export default async function ProdutosPage({
  searchParams,
}: { searchParams: Promise<{ busca?: string; status?: string; page?: string }> }) {
  const params = await searchParams
  const session = await getSession()
  const page = Number(params.page || 1)
  const limit = 20

  const where: any = { deletedAt: null }
  if (params.status) where.statusProduto = params.status
  if (params.busca) {
    where.OR = [
      { identificador: { contains: params.busca, mode: 'insensitive' } },
      { tipoNome:      { contains: params.busca, mode: 'insensitive' } },
      { numeroRelogio: { contains: params.busca } },
    ]
  }

  const [produtos, total] = await Promise.all([
    prisma.produto.findMany({
      where,
      include: {
        locacoes: {
          where: { status: 'Ativa', deletedAt: null },
          select: { clienteNome: true },
          take: 1,
        },
      },
      orderBy: { identificador: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.produto.count({ where }),
  ])

  const podeEditar = session?.user.permissoesWeb?.todosCadastros

  return (
    <div>
      <Header
        title="Produtos"
        subtitle={`${total} produto${total !== 1 ? 's' : ''} cadastrado${total !== 1 ? 's' : ''}`}
        actions={podeEditar && <Link href="/produtos/novo" className="btn-primary">+ Novo Produto</Link>}
      />

      <form className="card p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48">
          <label className="label">Buscar</label>
          <input name="busca" className="input" placeholder="Número, tipo ou relógio..." defaultValue={params.busca} />
        </div>
        <div className="w-44">
          <label className="label">Status</label>
          <select name="status" className="input" defaultValue={params.status}>
            <option value="">Todos</option>
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Inativo</option>
            <option value="Manutenção">Manutenção</option>
          </select>
        </div>
        <button type="submit" className="btn-primary">Filtrar</button>
        <Link href="/produtos" className="btn-secondary">Limpar</Link>
      </form>

      {produtos.length === 0 ? (
        <div className="card"><EmptyState icon="🎱" title="Nenhum produto encontrado" /></div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left font-medium text-slate-500 px-4 py-3">Nº</th>
                <th className="text-left font-medium text-slate-500 px-4 py-3">Tipo</th>
                <th className="text-left font-medium text-slate-500 px-4 py-3">Descrição</th>
                <th className="text-left font-medium text-slate-500 px-4 py-3">Tamanho</th>
                <th className="text-left font-medium text-slate-500 px-4 py-3">Relógio</th>
                <th className="text-left font-medium text-slate-500 px-4 py-3">Conservação</th>
                <th className="text-center font-medium text-slate-500 px-4 py-3">Status</th>
                <th className="text-left font-medium text-slate-500 px-4 py-3">Locado em</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {produtos.map(p => {
                const locacaoAtiva = p.locacoes[0]
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{p.identificador}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{p.tipoNome}</td>
                    <td className="px-4 py-3 text-slate-600">{p.descricaoNome}</td>
                    <td className="px-4 py-3 text-slate-600">{p.tamanhoNome}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{p.numeroRelogio}</td>
                    <td className="px-4 py-3 text-slate-600">{p.conservacao}</td>
                    <td className="px-4 py-3 text-center"><StatusProdutoBadge status={p.statusProduto} /></td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{locacaoAtiva?.clienteNome ?? <span className="text-slate-400">Estoque</span>}</td>
                    <td className="px-4 py-3">
                      <Link href={`/produtos/${p.id}`} className="text-primary-600 hover:text-primary-800 text-xs font-medium">Ver →</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {total > limit && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50 text-sm text-slate-600">
              <span>Exibindo {(page-1)*limit+1}–{Math.min(page*limit, total)} de {total}</span>
              <div className="flex gap-2">
                {page > 1 && <Link href={`?page=${page-1}&busca=${params.busca||''}&status=${params.status||''}`} className="btn-secondary py-1 px-3 text-xs">← Anterior</Link>}
                {page * limit < total && <Link href={`?page=${page+1}&busca=${params.busca||''}&status=${params.status||''}`} className="btn-secondary py-1 px-3 text-xs">Próxima →</Link>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
