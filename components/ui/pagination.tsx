'use client'
interface PaginationProps { page: number; total: number; limit: number; onPageChange: (p: number) => void }

export default function Pagination({ page, total, limit, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(total / limit)
  if (totalPages <= 1) return null
  const from = (page - 1) * limit + 1
  const to   = Math.min(page * limit, total)

  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <p className="text-sm text-slate-500">
        Exibindo <span className="font-medium">{from}–{to}</span> de <span className="font-medium">{total}</span> registros
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
          className="px-3 py-1 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
          ← Anterior
        </button>
        <span className="px-3 py-1 text-sm font-medium text-slate-700">{page} / {totalPages}</span>
        <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages}
          className="px-3 py-1 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
          Próxima →
        </button>
      </div>
    </div>
  )
}
