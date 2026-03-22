interface StatCardProps {
  title: string
  value: string | number
  icon: string
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'slate'
  subtitle?: string
}

const colors = {
  blue:  { bg: 'bg-blue-50',   icon: 'bg-blue-100  text-blue-600',  text: 'text-blue-600'  },
  green: { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-600', text: 'text-green-600' },
  yellow:{ bg: 'bg-yellow-50', icon: 'bg-yellow-100 text-yellow-600',text: 'text-yellow-600'},
  red:   { bg: 'bg-red-50',    icon: 'bg-red-100   text-red-600',   text: 'text-red-600'   },
  slate: { bg: 'bg-slate-50',  icon: 'bg-slate-100 text-slate-600', text: 'text-slate-600' },
}

export default function StatCard({ title, value, icon, color = 'blue', subtitle }: StatCardProps) {
  const c = colors[color]
  return (
    <div className={`card p-5 ${c.bg}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className={`text-3xl font-bold mt-1 ${c.text}`}>{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${c.icon}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
