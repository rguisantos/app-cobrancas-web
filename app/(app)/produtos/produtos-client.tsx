'use client'

import Link from 'next/link'
import { 
  Package,
  Box,
  Hash,
  Settings,
  ChevronRight,
  ChevronLeft,
  Search,
  Filter,
  User,
  Wrench,
} from 'lucide-react'
import { StatusProdutoBadge } from '@/components/ui/badge'

// ============================================================================
// TIPOS
// ============================================================================

interface Produto {
  id: string
  identificador: string
  tipoNome: string
  descricaoNome: string
  tamanhoNome: string
  numeroRelogio: string
  conservacao: string
  statusProduto: string
  clienteNome?: string
  locacaoId?: string
}

interface ProdutosClientProps {
  produtos: Produto[]
  total: number
  page: number
  limit: number
  podeEditar: boolean
  buscaFilter?: string
  statusFilter?: string
}

// ============================================================================
// COMPONENTE DE CARD PARA MOBILE
// ============================================================================

function ProdutoCard({ produto, podeEditar }: { produto: Produto; podeEditar: boolean }) {
  const estaLocado = !!produto.clienteNome
  
  return (
    <div className="card p-4 space-y-3">
      {/* Header com identificador e status */}
      <div className="flex items-start gap-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm flex-shrink-0 ${
          estaLocado 
            ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white' 
            : 'bg-gradient-to-br from-slate-400 to-slate-500 text-white'
        }`}>
          {produto.identificador}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-slate-900">{produto.tipoNome}</span>
            <StatusProdutoBadge status={produto.statusProduto} />
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="bg-slate-100 px-2 py-0.5 rounded">{produto.descricaoNome}</span>
            <span className="bg-slate-100 px-2 py-0.5 rounded">{produto.tamanhoNome}</span>
          </div>
        </div>
      </div>

      {/* Informações */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <div className="flex items-center gap-1.5 text-slate-600">
          <Hash className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono">Relógio: {produto.numeroRelogio}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-600">
          <Wrench className="w-3.5 h-3.5 text-slate-400" />
          <span>{produto.conservacao}</span>
        </div>
      </div>

      {/* Locação */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2">
          {estaLocado ? (
            <>
              <User className="w-4 h-4 text-purple-500" />
              <Link 
                href={`/locacoes/${produto.locacaoId}`}
                className="text-sm font-medium text-purple-600 hover:text-purple-800"
              >
                {produto.clienteNome}
              </Link>
            </>
          ) : (
            <>
              <Box className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-500">Em estoque</span>
            </>
          )}
        </div>
        <Link
          href={`/produtos/${produto.id}`}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors text-sm font-medium"
        >
          Ver
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}

// ============================================================================
// COMPONENTE DE TABELA PARA DESKTOP
// ============================================================================

function ProdutosTable({ produtos, podeEditar }: { produtos: Produto[]; podeEditar: boolean }) {
  return (
    <div className="overflow-x-auto -webkit-overflow-scrolling-touch" style={{ WebkitOverflowScrolling: 'touch' }}>
      <table className="w-full text-sm min-w-[800px]">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Nº</th>
            <th className="text-left font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Tipo</th>
            <th className="text-left font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Descrição</th>
            <th className="text-left font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Tamanho</th>
            <th className="text-left font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Relógio</th>
            <th className="text-left font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Conservação</th>
            <th className="text-center font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Status</th>
            <th className="text-left font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Locado em</th>
            <th className="px-4 py-3 whitespace-nowrap" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {produtos.map(p => (
            <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
              <td className="px-4 py-3 font-mono font-bold text-slate-900">{p.identificador}</td>
              <td className="px-4 py-3 font-medium text-slate-900">{p.tipoNome}</td>
              <td className="px-4 py-3 text-slate-600">{p.descricaoNome}</td>
              <td className="px-4 py-3 text-slate-600">{p.tamanhoNome}</td>
              <td className="px-4 py-3 font-mono text-slate-600">{p.numeroRelogio}</td>
              <td className="px-4 py-3 text-slate-600">{p.conservacao}</td>
              <td className="px-4 py-3 text-center"><StatusProdutoBadge status={p.statusProduto} /></td>
              <td className="px-4 py-3 text-slate-600 text-xs">
                {p.clienteNome ? (
                  <Link href={`/locacoes/${p.locacaoId}`} className="text-purple-600 hover:text-purple-800 font-medium">
                    {p.clienteNome}
                  </Link>
                ) : (
                  <span className="text-slate-400">Estoque</span>
                )}
              </td>
              <td className="px-4 py-3">
                <Link href={`/produtos/${p.id}`} className="text-primary-600 hover:text-primary-800 text-xs font-medium">
                  Ver →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function ProdutosClient({
  produtos,
  total,
  page,
  limit,
  podeEditar,
  buscaFilter,
  statusFilter,
}: ProdutosClientProps) {
  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      {/* Filtros */}
      <form className="card p-3 md:p-4 mb-6 flex flex-wrap gap-2 md:gap-3 items-end">
        <div className="flex-1 min-w-[140px]">
          <label className="label text-xs flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5" />
            Buscar
          </label>
          <input 
            name="busca" 
            className="input text-sm" 
            placeholder="Número, tipo ou relógio..." 
            defaultValue={buscaFilter} 
          />
        </div>
        <div className="w-32 md:w-44">
          <label className="label text-xs flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            Status
          </label>
          <select name="status" className="input text-sm" defaultValue={statusFilter}>
            <option value="">Todos</option>
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Inativo</option>
            <option value="Manutenção">Manutenção</option>
          </select>
        </div>
        <button type="submit" className="btn-primary text-sm py-2">Filtrar</button>
        <Link href="/produtos" className="btn-secondary text-sm py-2 hidden sm:inline-flex">Limpar</Link>
      </form>

      {/* Conteúdo */}
      {produtos.length === 0 ? (
        <div className="card">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
              <Package className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Nenhum produto encontrado
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mb-6">
              {buscaFilter || statusFilter
                ? 'Tente ajustar os filtros para encontrar o que procura.'
                : 'Os produtos aparecerão aqui assim que forem cadastrados.'}
            </p>
            {podeEditar && (
              <Link href="/produtos/novo" className="btn-primary">
                + Novo Produto
              </Link>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Cards em mobile, tabela em desktop */}
          <div className="block lg:hidden space-y-3">
            {produtos.map(p => (
              <ProdutoCard key={p.id} produto={p} podeEditar={podeEditar} />
            ))}
          </div>
          
          <div className="hidden lg:block card overflow-hidden">
            <ProdutosTable produtos={produtos} podeEditar={podeEditar} />
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-slate-500">
                Mostrando {(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`?page=${page - 1}&busca=${buscaFilter || ''}&status=${statusFilter || ''}`}
                    className="btn-secondary py-2 px-3 text-sm flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`?page=${page + 1}&busca=${buscaFilter || ''}&status=${statusFilter || ''}`}
                    className="btn-secondary py-2 px-3 text-sm flex items-center gap-1"
                  >
                    Próxima
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Indicador de scroll para mobile */}
          <p className="text-xs text-slate-400 mt-3 lg:hidden text-center">
            Role para ver mais produtos
          </p>
        </>
      )}
    </div>
  )
}
