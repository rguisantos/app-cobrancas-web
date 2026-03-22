import { StatusPagamentoBadge } from '@/components/ui/badge'
import { formatarMoeda } from '@/shared/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function CobrancasRecentesTable({ cobrancas }: { cobrancas: any[] }) {
  if (!cobrancas.length) {
    return <p className="text-sm text-slate-400 text-center py-8">Nenhuma cobrança registrada</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left font-medium text-slate-500 pb-2">Cliente</th>
            <th className="text-left font-medium text-slate-500 pb-2">Produto</th>
            <th className="text-right font-medium text-slate-500 pb-2">Valor</th>
            <th className="text-center font-medium text-slate-500 pb-2">Status</th>
            <th className="text-right font-medium text-slate-500 pb-2">Data</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {cobrancas.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50">
              <td className="py-2.5 font-medium text-slate-900 truncate max-w-[140px]">{c.cliente?.nomeExibicao ?? c.clienteNome}</td>
              <td className="py-2.5 text-slate-600">{c.produtoIdentificador}</td>
              <td className="py-2.5 text-right font-medium text-slate-900">{formatarMoeda(c.valorRecebido)}</td>
              <td className="py-2.5 text-center"><StatusPagamentoBadge status={c.status} /></td>
              <td className="py-2.5 text-right text-slate-500">
                {format(new Date(c.createdAt), 'dd/MM', { locale: ptBR })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
