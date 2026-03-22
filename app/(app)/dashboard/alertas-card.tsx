import Link from 'next/link'
import { formatarMoeda } from '@/shared/types'

interface Props { atrasadas: number; saldoDevedor: number; conflictos: number }

export default function AlertasCard({ atrasadas, saldoDevedor, conflictos }: Props) {
  const alertas = [
    {
      show: atrasadas > 0,
      icon: '🔴',
      title: `${atrasadas} cobranças atrasadas`,
      desc: 'Requerem atenção imediata',
      href: '/cobrancas?status=Atrasado',
      color: 'bg-red-50 border-red-200 text-red-800',
    },
    {
      show: saldoDevedor > 0,
      icon: '⚠️',
      title: `Saldo devedor: ${formatarMoeda(saldoDevedor)}`,
      desc: 'Pagamentos parciais em aberto',
      href: '/cobrancas?status=Parcial',
      color: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    },
    {
      show: conflictos > 0,
      icon: '🔄',
      title: `${conflictos} conflito(s) de sincronização`,
      desc: 'Requerem resolução manual',
      href: '/admin/sync',
      color: 'bg-blue-50 border-blue-200 text-blue-800',
    },
  ].filter(a => a.show)

  if (!alertas.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="text-4xl mb-2">✅</div>
        <p className="text-sm font-medium text-green-700">Tudo em ordem!</p>
        <p className="text-xs text-slate-400 mt-1">Nenhum alerta pendente</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {alertas.map((a, i) => (
        <Link key={i} href={a.href} className={`block p-3 rounded-lg border ${a.color} hover:opacity-90 transition-opacity`}>
          <div className="flex items-start gap-2">
            <span className="text-lg">{a.icon}</span>
            <div>
              <p className="text-sm font-semibold">{a.title}</p>
              <p className="text-xs opacity-75">{a.desc}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
