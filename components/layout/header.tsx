'use client'

interface HeaderProps { 
  title: string
  subtitle?: string
  actions?: React.ReactNode 
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3 flex-shrink-0">
          {actions}
        </div>
      )}
    </header>
  )
}
