'use client'

import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
} from 'recharts'

// ============================================================================
// TIPOS
// ============================================================================

interface MiniChartProps {
  data: number[]
  color: string
  height?: number
}

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  iconName?: LucideIcon
  iconColor?: string
  trend?: {
    value: number
    label: string
  }
  miniChart?: {
    data: number[]
    color: string
  }
  accentColor?: string
}

// ============================================================================
// MINI CHART
// ============================================================================

function MiniChart({ data, color, height = 40 }: MiniChartProps) {
  if (!data || data.length === 0) return null
  
  const chartData = data.map((value, index) => ({ value, index }))
  
  return (
    <div style={{ height, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#gradient-${color})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ============================================================================
// KPI CARD
// ============================================================================

export function KpiCard({
  title,
  value,
  subtitle,
  iconName: Icon,
  iconColor = 'text-blue-600',
  trend,
  miniChart,
  accentColor = 'bg-blue-500',
}: KpiCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null
    if (trend.value > 0) return <TrendingUp className="w-3.5 h-3.5" />
    if (trend.value < 0) return <TrendingDown className="w-3.5 h-3.5" />
    return <Minus className="w-3.5 h-3.5" />
  }

  const getTrendColor = () => {
    if (!trend) return ''
    if (trend.value > 0) return 'text-emerald-600 bg-emerald-50'
    if (trend.value < 0) return 'text-red-600 bg-red-50'
    return 'text-slate-600 bg-slate-50'
  }

  return (
    <div className="relative bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all duration-200">
      {/* Accent bar */}
      <div className={cn('absolute top-0 left-0 right-0 h-1', accentColor)} />
      
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          {/* Título */}
          <p className="text-sm font-medium text-slate-500">{title}</p>
          
          {/* Ícone */}
          {Icon && (
            <div className={cn('p-2 rounded-lg bg-slate-100', iconColor)}>
              <Icon className="w-5 h-5" />
            </div>
          )}
        </div>
        
        {/* Valor principal */}
        <div className="flex items-end gap-3">
          <p className="text-3xl font-bold text-slate-900 tracking-tight">
            {value}
          </p>
          
          {/* Trend badge */}
          {trend && (
            <div className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mb-1', getTrendColor())}>
              {getTrendIcon()}
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        
        {/* Subtítulo / trend label */}
        {subtitle && (
          <p className="text-xs text-slate-400 mt-2">{subtitle}</p>
        )}
        
        {/* Mini chart */}
        {miniChart && miniChart.data.length > 0 && (
          <div className="mt-4 -mx-5 -mb-5 px-5 pb-3">
            <MiniChart data={miniChart.data} color={miniChart.color} />
          </div>
        )}
      </div>
    </div>
  )
}

export default KpiCard
