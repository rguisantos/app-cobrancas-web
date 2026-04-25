'use client'
import { ReactNode } from 'react'

interface ChartCardProps {
  title: string
  subtitle?: string
  children: ReactNode
  icon?: React.ElementType
  className?: string
}

export function ChartCard({ title, subtitle, children, icon: Icon, className = '' }: ChartCardProps) {
  return (
    <div className={`card p-6 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
        {Icon && <Icon className="w-5 h-5 text-slate-400" />}
      </div>
      {children}
    </div>
  )
}
