'use client'
import { useState } from 'react'
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'

export interface TableColumn {
  key: string
  label: string
  format?: (value: any, row: any) => React.ReactNode
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
}

interface ReportTableProps {
  columns: TableColumn[]
  data: any[]
  pageSize?: number
  emptyMessage?: string
}

export function ReportTable({ columns, data, pageSize = 20, emptyMessage = 'Nenhum registro encontrado' }: ReportTableProps) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: columns[0]?.key || '', dir: 'desc' })
  const [page, setPage] = useState(0)

  const sorted = [...data].sort((a, b) => {
    const va = a[sort.key], vb = b[sort.key]
    if (va === null || va === undefined) return 1
    if (vb === null || vb === undefined) return -1
    const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))
    return sort.dir === 'asc' ? cmp : -cmp
  })

  const totalPages = Math.ceil(data.length / pageSize)
  const paginated = sorted.slice(page * pageSize, (page + 1) * pageSize)

  const handleSort = (key: string) => {
    setSort(s => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))
    setPage(0)
  }

  const alignClass = (align?: string) => align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              {columns.map(col => (
                <th key={col.key} className={`px-4 py-3 text-xs font-semibold text-slate-500 ${col.sortable !== false ? 'cursor-pointer hover:text-slate-700 select-none' : ''} ${alignClass(col.align)}`}
                  onClick={() => col.sortable !== false && handleSort(col.key)}>
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable !== false && <ArrowUpDown className={`w-3 h-3 ${sort.key === col.key ? 'text-primary-600' : 'text-slate-300'}`} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paginated.length > 0 ? paginated.map((row, i) => (
              <tr key={row.id || i} className="hover:bg-slate-50/50 transition-colors">
                {columns.map(col => (
                  <td key={col.key} className={`px-4 py-3 text-slate-700 whitespace-nowrap ${alignClass(col.align)}`}>
                    {col.format ? col.format(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            )) : (
              <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400">{emptyMessage}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Mostrando {page * pageSize + 1}-{Math.min((page + 1) * pageSize, data.length)} de {data.length}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-600">{page + 1} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
