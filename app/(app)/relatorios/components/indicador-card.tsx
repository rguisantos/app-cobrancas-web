'use client'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface IndicadorCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  iconColor: string
  accentColor: string
  trend?: { value: number; label: string }
}

export function IndicadorCard({ title, value, subtitle, icon: Icon, iconColor, accentColor, trend }: IndicadorCardProps) {
  return (
    <div className="relative bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all duration-200">
      <div className={`absolute top-0 left-0 right-0 h-1 ${accentColor}`} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <div className={`p-2 rounded-lg bg-slate-100 ${iconColor}`}><Icon className="w-5 h-5" /></div>
        </div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend.value >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {trend.value >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {Math.abs(trend.value).toFixed(1)}% {trend.label}
          </div>
        )}
      </div>
    </div>
  )
}
