'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  History,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  User,
  Download,
} from 'lucide-react'
import { exportToCSV, exportToXLSX } from '@/lib/export-utils'

// ============================================================================
// TIPOS
// ============================================================================

interface HistoricoItem {
  id: string
  dataAlteracao: string
  produtoId: string
  produtoIdentificador: string
  produtoTipo: string
  relogioAnterior: string
  relogioNovo: string
  motivo: string
  usuarioResponsavel: string
}

interface RelogiosClientProps {
  historico: HistoricoItem[]
  total: number
  page: number
  limit: number
  podeEditar: boolean
  buscaFilter?: string
  dataInicioFilter?: string
  dataFimFilter?: string
}

// ============================================================================
// HELPERS
// ============================================================================

function getVariationInfo(anterior: string, novo: string) {
  const ant = parseFloat(anterior)
  const nov = parseFloat(novo)

  if (isNaN(ant) || isNaN(nov)) {
    return { diff: 0, type: 'neutral' as const, color: 'text-slate-600', bg: 'bg-slate-50', icon: Minus }
  }

  const diff = nov - ant
  if (diff < 0) {
    return { diff: Math.abs(diff), type: 'decreased' as const, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: TrendingDown }
  } else if (diff > 0 && diff > 1000) {
    // Consider "significantly increased" if diff > 1000
    return { diff, type: 'increased' as const, color: 'text-red-600', bg: 'bg-red-50', icon: TrendingUp }
  } else if (diff > 0) {
    return { diff, type: 'neutral' as const, color: 'text-slate-600', bg: 'bg-slate-50', icon: TrendingUp }
  }
  return { diff: 0, type: 'neutral' as const, color: 'text-slate-600', bg: 'bg-slate-50', icon: Minus }
}

// ============================================================================
// CARD MOBILE
// ============================================================================

function HistoricoCard({ item }: { item: HistoricoItem }) {
  const variation = getVariationInfo(item.relogioAnterior, item.relogioNovo)
  const VariationIcon = variation.icon

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link
              href={`/produtos/${item.produtoId}`}
              className="font-semibold text-slate-900 hover:text-primary-600 transition-colors"
            >
              {item.produtoTipo} N° {item.produtoIdentificador}
            </Link>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
              <Clock className="w-3 h-3" />
              {format(new Date(item.dataAlteracao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
          </div>
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${variation.bg} ${variation.color}`}>
            <VariationIcon className="w-3 h-3" />
            {variation.type === 'decreased' ? `-${variation.diff.toLocaleString('pt-BR')}` :
             variation.type === 'increased' ? `+${variation.diff.toLocaleString('pt-BR')}` : '0'}
          </span>
        </div>

        {/* Relógio */}
        <div className="flex items-center gap-3 py-2 px-3 bg-slate-50 rounded-lg">
          <span className="font-mono text-sm text-slate-500">{item.relogioAnterior}</span>
          <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span className={`font-mono text-sm font-bold ${variation.color}`}>{item.relogioNovo}</span>
        </div>

        {/* Motivo e responsável */}
        <div className="flex items-start justify-between gap-2 text-sm">
          <div className="flex-1 min-w-0">
            <p className="text-slate-700 truncate">{item.motivo}</p>
          </div>
          <div className="flex items-center gap-1 text-slate-400 text-xs flex-shrink-0">
            <User className="w-3 h-3" />
            <span className="truncate max-w-[100px]">{item.usuarioResponsavel}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// TABELA DESKTOP
// ============================================================================

function HistoricoTable({ items }: { items: HistoricoItem[] }) {
  return (
    <div className="overflow-x-auto -webkit-overflow-scrolling-touch" style={{ WebkitOverflowScrolling: 'touch' }}>
      <table className="w-full text-sm min-w-[900px]">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left font-medium text-slate-500 px-4 py-3.5 whitespace-nowrap">Data</th>
            <th className="text-left font-medium text-slate-500 px-4 py-3.5 whitespace-nowrap">Produto</th>
            <th className="text-center font-medium text-slate-500 px-4 py-3.5 whitespace-nowrap">Relógio Anterior</th>
            <th className="text-center font-medium text-slate-500 px-4 py-3.5 whitespace-nowrap" />
            <th className="text-center font-medium text-slate-500 px-4 py-3.5 whitespace-nowrap">Relógio Novo</th>
            <th className="text-center font-medium text-slate-500 px-4 py-3.5 whitespace-nowrap">Variação</th>
            <th className="text-left font-medium text-slate-500 px-4 py-3.5 whitespace-nowrap">Motivo</th>
            <th className="text-left font-medium text-slate-500 px-4 py-3.5 whitespace-nowrap">Responsável</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map(item => {
            const variation = getVariationInfo(item.relogioAnterior, item.relogioNovo)
            const VariationIcon = variation.icon
            return (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-4 py-3.5 text-slate-600 text-xs whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {format(new Date(item.dataAlteracao), 'dd/MM/yy HH:mm', { locale: ptBR })}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <Link
                    href={`/produtos/${item.produtoId}`}
                    className="font-semibold text-slate-900 hover:text-primary-600 transition-colors whitespace-nowrap"
                  >
                    {item.produtoTipo} N° {item.produtoIdentificador}
                  </Link>
                </td>
                <td className="px-4 py-3.5 text-center font-mono text-slate-500">{item.relogioAnterior}</td>
                <td className="px-4 py-3.5 text-center">
                  <ArrowRight className="w-4 h-4 text-slate-300 mx-auto" />
                </td>
                <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-900">{item.relogioNovo}</td>
                <td className="px-4 py-3.5 text-center">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${variation.bg} ${variation.color}`}>
                    <VariationIcon className="w-3 h-3" />
                    {variation.type === 'decreased' ? `-${variation.diff.toLocaleString('pt-BR')}` :
                     variation.type === 'increased' ? `+${variation.diff.toLocaleString('pt-BR')}` : '—'}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-slate-600 max-w-[200px] truncate">{item.motivo}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                    <User className="w-3 h-3 text-slate-400" />
                    {item.usuarioResponsavel}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function RelogiosClient({
  historico,
  total,
  page,
  limit,
  podeEditar,
  buscaFilter,
  dataInicioFilter,
  dataFimFilter,
}: RelogiosClientProps) {
  const totalPages = Math.ceil(total / limit)

  const handleExportCSV = () => {
    const data = historico.map(h => ({
      'Data': format(new Date(h.dataAlteracao), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
      'Produto': `${h.produtoTipo} N° ${h.produtoIdentificador}`,
      'Relógio Anterior': h.relogioAnterior,
      'Relógio Novo': h.relogioNovo,
      'Motivo': h.motivo,
      'Responsável': h.usuarioResponsavel,
    }))
    exportToCSV(data, `relogios_${new Date().toISOString().split('T')[0]}`)
  }

  const handleExportXLSX = async () => {
    const data = historico.map(h => ({
      'Data': format(new Date(h.dataAlteracao), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
      'Produto': `${h.produtoTipo} N° ${h.produtoIdentificador}`,
      'Relógio Anterior': h.relogioAnterior,
      'Relógio Novo': h.relogioNovo,
      'Motivo': h.motivo,
      'Responsável': h.usuarioResponsavel,
    }))
    const columns = Object.keys(data[0] || {}).map(key => ({ key, label: key }))
    await exportToXLSX(data, columns, `relogios_${new Date().toISOString().split('T')[0]}`)
  }

  return (
    <div>
      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
        <form className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="label text-xs flex items-center gap-1.5 mb-1.5">
              <Search className="w-3.5 h-3.5" />
              Buscar
            </label>
            <input
              name="busca"
              className="input text-sm"
              placeholder="Produto, motivo ou relógio..."
              defaultValue={buscaFilter}
            />
          </div>
          <div className="w-36 md:w-40">
            <label className="label text-xs flex items-center gap-1.5 mb-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Data Início
            </label>
            <input
              type="date"
              name="dataInicio"
              className="input text-sm"
              defaultValue={dataInicioFilter}
            />
          </div>
          <div className="w-36 md:w-40">
            <label className="label text-xs flex items-center gap-1.5 mb-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Data Fim
            </label>
            <input
              type="date"
              name="dataFim"
              className="input text-sm"
              defaultValue={dataFimFilter}
            />
          </div>
          <button type="submit" className="btn-primary text-sm py-2.5 px-5">
            Filtrar
          </button>
          <Link href="/relogios" className="btn-secondary text-sm py-2.5 px-5 hidden sm:inline-flex">
            Limpar
          </Link>
          <button
            type="button"
            onClick={handleExportCSV}
            className="btn-secondary text-sm py-2.5 px-5 flex items-center gap-1.5"
            title="Exportar para CSV"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportXLSX}
            className="btn-secondary text-sm py-2.5 px-5 flex items-center gap-1.5"
            title="Exportar para Excel"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">XLSX</span>
          </button>
        </form>
      </div>

      {/* Conteúdo */}
      {historico.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
              <History className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Nenhum registro encontrado
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mb-6">
              {buscaFilter || dataInicioFilter || dataFimFilter
                ? 'Tente ajustar os filtros para encontrar o que procura.'
                : 'O histórico de alterações de relógio aparecerá aqui.'}
            </p>
            {podeEditar && (
              <Link href="/relogios/nova" className="btn-primary">
                + Nova Alteração
              </Link>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Cards em mobile, tabela em desktop */}
          <div className="block lg:hidden space-y-4">
            {historico.map(item => (
              <HistoricoCard key={item.id} item={item} />
            ))}
          </div>

          <div className="hidden lg:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <HistoricoTable items={historico} />
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-sm text-slate-500">
                Mostrando{' '}
                <span className="font-medium">{(page - 1) * limit + 1}</span>–
                <span className="font-medium">{Math.min(page * limit, total)}</span> de{' '}
                <span className="font-medium">{total}</span>
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`?page=${page - 1}&busca=${buscaFilter || ''}&dataInicio=${dataInicioFilter || ''}&dataFim=${dataFimFilter || ''}`}
                    className="btn-secondary py-2 px-4 text-sm flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`?page=${page + 1}&busca=${buscaFilter || ''}&dataInicio=${dataInicioFilter || ''}&dataFim=${dataFimFilter || ''}`}
                    className="btn-primary py-2 px-4 text-sm flex items-center gap-1"
                  >
                    Próxima
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
