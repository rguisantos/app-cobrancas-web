'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  FileText,
  User,
  Package,
  Calendar,
  Percent,
  Hash,
  ChevronRight,
  ChevronLeft,
  Search,
  Filter,
  DollarSign,
  Clock,
} from 'lucide-react'
import { StatusLocacaoBadge } from '@/components/ui/badge'
import { formatarMoeda } from '@/shared/types'

// ============================================================================
// TIPOS
// ============================================================================

interface Locacao {
  id: string
  produtoIdentificador: string
  produtoTipo: string
  clienteNome: string
  clienteId: string
  formaPagamento: string
  percentualEmpresa: number
  precoFicha: number
  numeroRelogio: string
  status: string
  dataLocacao: string | Date
}

interface LocacoesClientProps {
  locacoes: Locacao[]
  total: number
  page: number
  limit: number
  clientes: { id: string; nomeExibicao: string }[]
  podeEditar: boolean
  clienteIdFilter?: string
  statusFilter?: string
}

// ============================================================================
// COMPONENTE DE CARD PARA MOBILE
// ============================================================================

function LocacaoCard({ locacao, podeEditar }: { locacao: Locacao; podeEditar: boolean }) {
  const isActive = locacao.status === 'Ativa'
  
  return (
    <div className="card p-4 space-y-3">
      {/* Header com produto e status */}
      <div className="flex items-start gap-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 ${
          isActive 
            ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white' 
            : 'bg-gradient-to-br from-slate-400 to-slate-500 text-white'
        }`}>
          <Package className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-slate-900">{locacao.produtoTipo}</span>
            <span className="font-mono text-sm text-slate-500">N° {locacao.produtoIdentificador}</span>
          </div>
          <StatusLocacaoBadge status={locacao.status} />
        </div>
      </div>

      {/* Cliente */}
      <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-slate-400" />
        <Link 
          href={`/clientes/${locacao.clienteId}`}
          className="text-sm font-medium text-slate-700 hover:text-primary-600 transition-colors"
        >
          {locacao.clienteNome}
        </Link>
      </div>

      {/* Informações financeiras */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <div className="flex items-center gap-1.5 text-slate-600">
          <DollarSign className="w-3.5 h-3.5 text-slate-400" />
          <span>{locacao.formaPagamento}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-600">
          <Percent className="w-3.5 h-3.5 text-slate-400" />
          <span>{locacao.percentualEmpresa}%</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-600">
          <Hash className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono">{locacao.numeroRelogio}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-600">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{format(new Date(locacao.dataLocacao), 'dd/MM/yy', { locale: ptBR })}</span>
        </div>
      </div>

      {/* Preço e ações */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <div>
          <p className="text-xs text-slate-400">Preço ficha</p>
          <p className="text-lg font-bold text-slate-900">{formatarMoeda(locacao.precoFicha)}</p>
        </div>
        <Link
          href={`/locacoes/${locacao.id}`}
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

function LocacoesTable({ locacoes, podeEditar }: { locacoes: Locacao[]; podeEditar: boolean }) {
  return (
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
            <tr key={l.id} className="hover:bg-slate-50 transition-colors group">
              <td className="px-4 py-3">
                <span className="font-medium text-slate-900">{l.produtoTipo}</span>
                <span className="text-slate-500 ml-1">N° {l.produtoIdentificador}</span>
              </td>
              <td className="px-4 py-3">
                <Link href={`/clientes/${l.clienteId}`} className="font-medium text-slate-700 hover:text-primary-600">
                  {l.clienteNome}
                </Link>
              </td>
              <td className="px-4 py-3 text-slate-600 text-xs">{l.formaPagamento}</td>
              <td className="px-4 py-3 text-right">{l.percentualEmpresa}%</td>
              <td className="px-4 py-3 text-right">{formatarMoeda(l.precoFicha)}</td>
              <td className="px-4 py-3 text-right font-mono text-slate-600">{l.numeroRelogio}</td>
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
  )
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function LocacoesClient({
  locacoes,
  total,
  page,
  limit,
  clientes,
  podeEditar,
  clienteIdFilter,
  statusFilter,
}: LocacoesClientProps) {
  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      {/* Filtros */}
      <form className="card p-3 md:p-4 mb-6 flex flex-wrap gap-2 md:gap-3 items-end">
        <div className="w-48 md:w-64">
          <label className="label text-xs flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            Cliente
          </label>
          <select name="clienteId" className="input text-sm" defaultValue={clienteIdFilter}>
            <option value="">Todos os clientes</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>{c.nomeExibicao}</option>
            ))}
          </select>
        </div>
        <div className="w-32 md:w-44">
          <label className="label text-xs flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            Status
          </label>
          <select name="status" className="input text-sm" defaultValue={statusFilter}>
            <option value="">Todos</option>
            <option value="Ativa">Ativa</option>
            <option value="Finalizada">Finalizada</option>
            <option value="Cancelada">Cancelada</option>
          </select>
        </div>
        <button type="submit" className="btn-primary text-sm py-2">Filtrar</button>
        <Link href="/locacoes" className="btn-secondary text-sm py-2 hidden sm:inline-flex">Limpar</Link>
      </form>

      {/* Conteúdo */}
      {locacoes.length === 0 ? (
        <div className="card">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
              <FileText className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Nenhuma locação encontrada
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mb-6">
              {clienteIdFilter || statusFilter
                ? 'Tente ajustar os filtros para encontrar o que procura.'
                : 'As locações aparecerão aqui assim que forem criadas.'}
            </p>
            {podeEditar && (
              <Link href="/locacoes/nova" className="btn-primary">
                + Nova Locação
              </Link>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Cards em mobile, tabela em desktop */}
          <div className="block lg:hidden space-y-3">
            {locacoes.map(l => (
              <LocacaoCard key={l.id} locacao={l} podeEditar={podeEditar} />
            ))}
          </div>
          
          <div className="hidden lg:block card overflow-hidden">
            <LocacoesTable locacoes={locacoes} podeEditar={podeEditar} />
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
                    href={`?page=${page - 1}&clienteId=${clienteIdFilter || ''}&status=${statusFilter || ''}`}
                    className="btn-secondary py-2 px-3 text-sm flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`?page=${page + 1}&clienteId=${clienteIdFilter || ''}&status=${statusFilter || ''}`}
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
            Role para ver mais locações
          </p>
        </>
      )}
    </div>
  )
}
