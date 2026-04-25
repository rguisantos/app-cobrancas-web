import Link from 'next/link'
import { formatarMoeda } from '@/shared/types'
import { AlertCircle, AlertTriangle, RefreshCw, CheckCircle2, ArrowRight } from 'lucide-react'

interface Props { 
  atrasadas: number
  saldoDevedor: number
  conflictos: number 
}

export default function AlertasCard({ atrasadas, saldoDevedor, conflictos }: Props) {
  const alertas = [
    {
      show: atrasadas > 0,
      icon: AlertCircle,
      title: `${atrasadas} cobrança${atrasadas > 1 ? 's' : ''} atrasada${atrasadas > 1 ? 's' : ''}`,
      desc: 'Requerem atenção imediata',
      href: '/cobrancas?status=Atrasado',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      titleColor: 'text-red-800',
      descColor: 'text-red-600',
    },
    {
      show: saldoDevedor > 0,
      icon: AlertTriangle,
      title: `Saldo devedor: ${formatarMoeda(saldoDevedor)}`,
      desc: 'Pagamentos parciais em aberto',
      href: '/cobrancas?status=Parcial',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      titleColor: 'text-amber-800',
      descColor: 'text-amber-600',
    },
    {
      show: conflictos > 0,
      icon: RefreshCw,
      title: `${conflictos} conflito${conflictos > 1 ? 's' : ''} de sincronização`,
      desc: 'Requerem resolução manual',
      href: '/admin/sync',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      titleColor: 'text-blue-800',
      descColor: 'text-blue-600',
    },
  ].filter(a => a.show)

  if (!alertas.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">
          Tudo em ordem!
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Nenhum alerta pendente no momento
        </p>
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Sistema funcionando normalmente
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {alertas.map((a, i) => {
        const Icon = a.icon
        return (
          <Link 
            key={i} 
            href={a.href} 
            className={`block p-4 rounded-xl border-2 ${a.bgColor} ${a.borderColor} hover:shadow-md transition-all duration-200 group`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg ${a.iconBg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${a.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${a.titleColor}`}>
                  {a.title}
                </p>
                <p className={`text-xs mt-0.5 ${a.descColor}`}>
                  {a.desc}
                </p>
              </div>
              <ArrowRight className={`w-4 h-4 ${a.iconColor} opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0`} />
            </div>
          </Link>
        )
      })}
      
      {/* Quick tip */}
      <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-100">
        <p className="text-xs text-slate-500">
          <span className="font-medium text-slate-600">💡 Dica:</span> Clique em um alerta para ver mais detalhes e tomar ação.
        </p>
      </div>
    </div>
  )
}
