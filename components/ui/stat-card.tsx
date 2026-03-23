import { 
  Users, 
  Package, 
  DollarSign, 
  AlertTriangle, 
  TrendingUp,
  PackageCheck,
  Clock,
  RefreshCw,
  LucideIcon
} from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon?: string
  iconName?: 'users' | 'package' | 'dollar' | 'alert' | 'trending' | 'packageCheck' | 'clock' | 'refresh'
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'slate'
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
}

const iconMap: Record<string, LucideIcon> = {
  users: Users,
  package: Package,
  dollar: DollarSign,
  alert: AlertTriangle,
  trending: TrendingUp,
  packageCheck: PackageCheck,
  clock: Clock,
  refresh: RefreshCw,
}

const colorConfig = {
  blue: {
    bg: 'bg-blue-50',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    valueColor: 'text-blue-700',
    borderColor: 'border-l-blue-500',
    accent: 'bg-blue-500',
  },
  green: {
    bg: 'bg-emerald-50',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    valueColor: 'text-emerald-700',
    borderColor: 'border-l-emerald-500',
    accent: 'bg-emerald-500',
  },
  yellow: {
    bg: 'bg-amber-50',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    valueColor: 'text-amber-700',
    borderColor: 'border-l-amber-500',
    accent: 'bg-amber-500',
  },
  red: {
    bg: 'bg-red-50',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    valueColor: 'text-red-700',
    borderColor: 'border-l-red-500',
    accent: 'bg-red-500',
  },
  slate: {
    bg: 'bg-slate-50',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
    valueColor: 'text-slate-700',
    borderColor: 'border-l-slate-400',
    accent: 'bg-slate-400',
  },
}

export default function StatCard({ 
  title, 
  value, 
  icon, 
  iconName,
  color = 'blue', 
  subtitle,
  trend 
}: StatCardProps) {
  const config = colorConfig[color]
  const IconComponent = iconName ? iconMap[iconName] : null

  return (
    <div className={`relative bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200 border-l-4 ${config.borderColor}`}>
      {/* Subtle top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${config.accent} opacity-20`} />
      
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Title - small and subtle */}
            <p className="text-sm font-medium text-slate-500 truncate">{title}</p>
            
            {/* Value - large and prominent */}
            <p className={`text-3xl font-bold mt-2 tracking-tight ${config.valueColor}`}>
              {value}
            </p>
            
            {/* Subtitle */}
            {subtitle && (
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                {trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-500" />}
                {trend === 'down' && <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />}
                {subtitle}
              </p>
            )}
          </div>
          
          {/* Icon container */}
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.iconBg} flex-shrink-0 ml-3`}>
            {IconComponent ? (
              <IconComponent className={`w-6 h-6 ${config.iconColor}`} />
            ) : (
              <span className="text-xl">{icon}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
