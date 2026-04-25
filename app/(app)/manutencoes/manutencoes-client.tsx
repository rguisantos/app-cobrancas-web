'use client'

import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Wrench,
  Scissors,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Package,
  User,
  Trash2,
  Eye,
  AlertCircle,
  Download,
} from 'lucide-react'
import { useState } from 'react'
import { exportToCSV, exportToXLSX, exportEntityList } from '@/lib/export-utils'

interface Manutencao {
  id: string
  produtoId: string
  produtoIdentificador: string | null
  produtoTipo: string | null
  clienteId: string | null
  clienteNome: string | null
  locacaoId: string | null
  tipo: string
  descricao: string | null
  data: string
  registradoPor: string | null
  produtoStatus?: string
  createdAt: string | Date
}

interface ManutencoesClientProps {
  manutencoes: Manutencao[]
  total: number
  page: number
  limit: number
  totalTrocaPano: number
  totalManutencao: number
  tipoFilter?: string
  buscaFilter?: string
  dataInicioFilter?: string
  dataFimFilter?: string
  podeEditar: boolean
}

const tipoConfig: Record<string, {
  bg: string
  text: string
  border: string
  icon: typeof Wrench
  iconColor: string
  gradient: string
  label: string
}> = {
  trocaPano: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: Scissors,
    iconColor: 'text-amber-500',
    gradient: 'from-amber-500 to-amber-600',
    label: 'Troca de Pano',
  },
  manutencao: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    icon: Wrench,
    iconColor: 'text-orange-500',
    gradient: 'from-orange-500 to-orange-600',
    label: 'Manutenção',
  },
}

function TipoBadge({ tipo }: { tipo: string }) {
  const config = tipoConfig[tipo] || {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: AlertCircle,
    iconColor: 'text-slate-500',
    gradient: 'from-slate-500 to-slate-600',
    label: tipo,
  }
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}>
      <Icon className={`w-3.5 h-3.5 ${config.iconColor}`} />
      {config.label}
    </span>
  )
}

function ManutencaoCard({ manutencao, podeEditar, onDelete }: { manutencao: Manutencao; podeEditar: boolean; onDelete: (id: string) => void }) {
  const config = tipoConfig[manutencao.tipo] || tipoConfig['manutencao']
  const Icon = config.icon

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className={`h-1.5 bg-gradient-to-r ${config.gradient}`} />

      <div className="p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-white shadow-sm flex-shrink-0`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Link href={`/produtos/${manutencao.produtoId}`} className="font-semibold text-slate-900 hover:text-primary-600 transition-colors">
                {manutencao.produtoTipo || 'Produto'} N° {manutencao.produtoIdentificador || '?'}
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <TipoBadge tipo={manutencao.tipo} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm bg-slate-50 -mx-4 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-600">
              {format(parseISO(manutencao.data), 'dd/MM/yyyy', { locale: ptBR })}
            </span>
          </div>
          {manutencao.clienteNome && (
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-600">{manutencao.clienteNome}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 text-xs">{manutencao.produtoStatus || '—'}</span>
          </div>
        </div>

        {manutencao.descricao && (
          <p className="text-sm text-slate-600 line-clamp-2">{manutencao.descricao}</p>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <Link
            href={`/produtos/${manutencao.produtoId}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors text-sm font-medium"
          >
            <Eye className="w-4 h-4" />
            Ver Produto
          </Link>
          {podeEditar && (
            <button
              onClick={() => onDelete(manutencao.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ManutencoesTable({ manutencoes, podeEditar, onDelete }: { manutencoes: Manutencao[]; podeEditar: boolean; onDelete: (id: string) => void }) {
  return (
    <div className="overflow-x-auto -webkit-overflow-scrolling-touch" style={{ WebkitOverflowScrolling: 'touch' }}>
      <table className="w-full text-sm min-w-[900px]">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left font-medium text-slate-500 px-4 py-3.5 whitespace-nowrap">Data</th>
            <th className="text-left font-medium text-slate-500 px-4 py-3.5 whitespace-nowrap">Produto</th>
            <th className="text-center font-medium text-slate-500 px-4 py-3.5 whitespace-nowrap">Tipo</th>
            <th className="text-left font-medium text-slate-500 px-4 py-3.5 whitespace-nowrap">Descrição</th>
            <th className="text-left font-medium text-slate-500 px-4 py-3.5 whitespace-nowrap">Cliente</th>
            <th className="text-center font-medium text-slate-500 px-4 py-3.5 whitespace-nowrap">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {manutencoes.map(m => {
            const config = tipoConfig[m.tipo] || tipoConfig['manutencao']
            const Icon = config.icon
            return (
              <tr key={m.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5 text-slate-700 whitespace-nowrap">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {format(parseISO(m.data), 'dd/MM/yyyy', { locale: ptBR })}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <Link href={`/produtos/${m.produtoId}`} className="font-semibold text-slate-900 hover:text-primary-600 transition-colors">
                    {m.produtoTipo || 'Produto'} N° {m.produtoIdentificador || '?'}
                  </Link>
                </td>
                <td className="px-4 py-3.5 text-center">
                  <TipoBadge tipo={m.tipo} />
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-slate-600 text-sm line-clamp-2 max-w-[250px] block">
                    {m.descricao || '—'}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  {m.clienteNome ? (
                    <span className="text-slate-700 text-sm">{m.clienteNome}</span>
                  ) : (
                    <span className="text-slate-400 text-sm">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center justify-center gap-1">
                    <Link
                      href={`/produtos/${m.produtoId}`}
                      className="p-2.5 rounded-lg hover:bg-primary-50 text-slate-500 hover:text-primary-600 transition-colors"
                      title="Ver produto"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    {podeEditar && (
                      <button
                        onClick={() => onDelete(m.id)}
                        className="p-2.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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

export function ManutencoesClient({
  manutencoes,
  total,
  page,
  limit,
  totalTrocaPano,
  totalManutencao,
  tipoFilter,
  buscaFilter,
  dataInicioFilter,
  dataFimFilter,
  podeEditar,
}: ManutencoesClientProps) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const totalPages = Math.ceil(total / limit)

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta manutenção?')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/manutencoes/${id}`, { method: 'DELETE' })
      if (res.ok) {
        window.location.reload()
      } else {
        alert('Erro ao excluir manutenção')
      }
    } catch {
      alert('Erro ao excluir manutenção')
    } finally {
      setDeleting(null)
    }
  }

  const handleExportCSV = () => {
    const data = exportEntityList('manutencoes', manutencoes)
    exportToCSV(data, `manutencoes_${new Date().toISOString().split('T')[0]}`)
  }

  const handleExportXLSX = async () => {
    const data = exportEntityList('manutencoes', manutencoes)
    const columns = Object.keys(data[0] || {}).map(key => ({ key, label: key }))
    await exportToXLSX(data, columns, `manutencoes_${new Date().toISOString().split('T')[0]}`)
  }

  return (
    <div>
      {/* Resumo totalizadores */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-amber-500 to-amber-600" />
          <div className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-100">
                <Scissors className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-amber-600 font-medium">Trocas de Pano</p>
                <p className="text-2xl md:text-3xl font-bold text-amber-700">{totalTrocaPano}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-orange-200 shadow-sm overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-orange-500 to-orange-600" />
          <div className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-orange-100">
                <Wrench className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-orange-600 font-medium">Manutenções</p>
                <p className="text-2xl md:text-3xl font-bold text-orange-700">{totalManutencao}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
        <form className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="label text-xs flex items-center gap-1.5 mb-1.5">
              <Search className="w-3.5 h-3.5" />
              Buscar
            </label>
            <input
              name="busca"
              className="input text-sm"
              placeholder="Produto, cliente ou descrição..."
              defaultValue={buscaFilter}
            />
          </div>
          <div className="w-40 md:w-48">
            <label className="label text-xs flex items-center gap-1.5 mb-1.5">
              <Filter className="w-3.5 h-3.5" />
              Tipo
            </label>
            <select name="tipo" className="input text-sm" defaultValue={tipoFilter}>
              <option value="">Todos</option>
              <option value="trocaPano">Troca de Pano</option>
              <option value="manutencao">Manutenção</option>
            </select>
          </div>
          <div className="w-36 md:w-44">
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
          <div className="w-36 md:w-44">
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
          <button type="submit" className="btn-primary text-sm py-2.5 px-5">Filtrar</button>
          <Link href="/manutencoes" className="btn-secondary text-sm py-2.5 px-5 hidden sm:inline-flex">Limpar</Link>
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
      {manutencoes.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
              <Inbox className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Nenhuma manutenção encontrada
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mb-6">
              {buscaFilter || tipoFilter || dataInicioFilter || dataFimFilter
                ? 'Tente ajustar os filtros para encontrar o que procura.'
                : 'As manutenções aparecerão aqui assim que forem registradas no sistema.'}
            </p>
            {podeEditar && (
              <Link href="/manutencoes/nova" className="btn-primary">
                + Nova Manutenção
              </Link>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Cards em mobile, tabela em desktop */}
          <div className="block lg:hidden space-y-4">
            {manutencoes.map(m => (
              <ManutencaoCard
                key={m.id}
                manutencao={m}
                podeEditar={podeEditar}
                onDelete={handleDelete}
              />
            ))}
          </div>

          <div className="hidden lg:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <ManutencoesTable
              manutencoes={manutencoes}
              podeEditar={podeEditar}
              onDelete={handleDelete}
            />
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-sm text-slate-500">
                Mostrando <span className="font-medium">{(page - 1) * limit + 1}</span>–<span className="font-medium">{Math.min(page * limit, total)}</span> de <span className="font-medium">{total}</span>
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`?page=${page - 1}&tipo=${tipoFilter || ''}&busca=${buscaFilter || ''}&dataInicio=${dataInicioFilter || ''}&dataFim=${dataFimFilter || ''}`}
                    className="btn-secondary py-2 px-4 text-sm flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`?page=${page + 1}&tipo=${tipoFilter || ''}&busca=${buscaFilter || ''}&dataInicio=${dataInicioFilter || ''}&dataFim=${dataFimFilter || ''}`}
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
