import { FileText, Plus } from 'lucide-react'
import { StatusPagamentoBadge } from '@/components/ui/badge'
import { formatarMoeda } from '@/shared/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

export default function CobrancasRecentesTable({ cobrancas }: { cobrancas: any[] }) {
  if (!cobrancas.length) {
    return (
      <div className="empty-state py-12">
        <div className="empty-state-icon">
          <FileText className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-700">
          Nenhuma cobrança registrada
        </h3>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          As cobranças aparecerão aqui assim que forem criadas
        </p>
        <Link 
          href="/cobrancas"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Criar primeira cobrança
        </Link>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto -mx-6">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="table-header px-6 pb-3">Cliente</th>
            <th className="table-header px-6 pb-3">Produto</th>
            <th className="table-header text-right px-6 pb-3">Valor</th>
            <th className="table-header text-center px-6 pb-3">Status</th>
            <th className="table-header text-right px-6 pb-3">Data</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {cobrancas.map((c) => (
            <tr key={c.id} className="table-row group cursor-pointer">
              <td className="table-cell px-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600 flex-shrink-0">
                    {(c.cliente?.nomeExibicao ?? c.clienteNome)?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                  <span className="font-medium text-slate-900 truncate max-w-[140px] group-hover:text-primary-600 transition-colors">
                    {c.cliente?.nomeExibicao ?? c.clienteNome}
                  </span>
                </div>
              </td>
              <td className="table-cell px-6 text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                  {c.produtoIdentificador}
                </span>
              </td>
              <td className="table-cell text-right px-6">
                <span className="font-semibold text-slate-900">
                  {formatarMoeda(c.valorRecebido)}
                </span>
              </td>
              <td className="table-cell text-center px-6">
                <StatusPagamentoBadge status={c.status} />
              </td>
              <td className="table-cell text-right px-6 text-slate-500">
                <div className="flex flex-col items-end">
                  <span className="text-slate-600">
                    {format(new Date(c.createdAt), 'dd MMM', { locale: ptBR })}
                  </span>
                  <span className="text-xs text-slate-400">
                    {format(new Date(c.createdAt), 'HH:mm')}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
