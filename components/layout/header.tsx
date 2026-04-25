'use client'

interface HeaderProps { 
  title: string
  subtitle?: string
  actions?: React.ReactNode 
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight truncate dark:text-slate-100">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-1 truncate dark:text-slate-400">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 flex-wrap">
          {actions}
        </div>
      )}
    </header>
  )
}
