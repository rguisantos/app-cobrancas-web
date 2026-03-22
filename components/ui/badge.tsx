type BadgeVariant = 'green' | 'red' | 'yellow' | 'blue' | 'gray'

const variants: Record<BadgeVariant, string> = {
  green:  'bg-green-100  text-green-700',
  red:    'bg-red-100    text-red-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  blue:   'bg-blue-100   text-blue-700',
  gray:   'bg-slate-100  text-slate-600',
}

interface BadgeProps { label: string; variant?: BadgeVariant }

export default function Badge({ label, variant = 'gray' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {label}
    </span>
  )
}

// Helpers para entidades do domínio
export function StatusClienteBadge({ status }: { status: string }) {
  return <Badge label={status} variant={status === 'Ativo' ? 'green' : 'gray'} />
}

export function StatusProdutoBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = { Ativo: 'green', Inativo: 'gray', 'Manutenção': 'yellow' }
  return <Badge label={status} variant={map[status] ?? 'gray'} />
}

export function StatusPagamentoBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = { Pago: 'green', Parcial: 'yellow', Pendente: 'blue', Atrasado: 'red' }
  return <Badge label={status} variant={map[status] ?? 'gray'} />
}

export function StatusLocacaoBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = { Ativa: 'green', Finalizada: 'gray', Cancelada: 'red' }
  return <Badge label={status} variant={map[status] ?? 'gray'} />
}
