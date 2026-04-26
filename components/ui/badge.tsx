type BadgeVariant = 'green' | 'red' | 'yellow' | 'blue' | 'gray'

const variants: Record<BadgeVariant, string> = {
  green:  'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  red:    'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  yellow: 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  blue:   'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  gray:   'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
}

interface BadgeProps { 
  label: string
  variant?: BadgeVariant
  size?: 'sm' | 'md' 
}

export default function Badge({ label, variant = 'gray', size = 'md' }: BadgeProps) {
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
  return (
    <span className={`inline-flex items-center rounded-full font-semibold tracking-wide uppercase ${sizeClass} ${variants[variant]}`}>
      {label}
    </span>
  )
}

// Helpers para entidades do domínio
export function StatusClienteBadge({ status }: { status: string }) {
  return <Badge label={status} variant={status === 'Ativo' ? 'green' : 'gray'} />
}

export function StatusProdutoBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = { 
    Ativo: 'green', 
    Inativo: 'gray', 
    'Manutenção': 'yellow' 
  }
  return <Badge label={status} variant={map[status] ?? 'gray'} />
}

export function StatusPagamentoBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = { 
    Pago: 'green', 
    Parcial: 'yellow', 
    Pendente: 'blue', 
    Atrasado: 'red' 
  }
  return <Badge label={status} variant={map[status] ?? 'gray'} />
}

export function StatusLocacaoBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = { 
    Ativa: 'green', 
    Finalizada: 'gray', 
    Cancelada: 'red' 
  }
  return <Badge label={status} variant={map[status] ?? 'gray'} />
}

export function StatusRotaBadge({ status }: { status: string }) {
  return <Badge label={status} variant={status === 'Ativo' ? 'green' : 'gray'} />
}
