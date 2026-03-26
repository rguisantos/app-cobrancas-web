import { Inbox } from 'lucide-react'

interface EmptyStateProps { 
  icon?: string
  iconName?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode 
}

export default function EmptyState({ 
  icon, 
  iconName,
  title, 
  description, 
  action 
}: EmptyStateProps) {
  return (
    <div className="empty-state py-16">
      <div className="empty-state-icon">
        {iconName ? (
          iconName
        ) : (
          <span className="text-3xl">{icon}</span>
        )}
      </div>
      <h3 className="text-base font-semibold text-slate-900 mt-4">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-slate-500 mt-2 max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  )
}

// Preset empty states for common use cases
export function EmptyCobrancas({ action }: { action?: React.ReactNode }) {
  return (
    <EmptyState
      iconName={<Inbox className="w-8 h-8 text-slate-400" />}
      title="Nenhuma cobrança encontrada"
      description="As cobranças aparecerão aqui assim que forem registradas no sistema."
      action={action}
    />
  )
}

export function EmptyClientes({ action }: { action?: React.ReactNode }) {
  return (
    <EmptyState
      icon="👥"
      title="Nenhum cliente cadastrado"
      description="Cadastre seus clientes para começar a gerenciar cobranças."
      action={action}
    />
  )
}

export function EmptyProdutos({ action }: { action?: React.ReactNode }) {
  return (
    <EmptyState
      icon="🎱"
      title="Nenhum produto cadastrado"
      description="Adicione produtos ao catálogo para iniciar as locações."
      action={action}
    />
  )
}

export function EmptySearch({ query }: { query?: string }) {
  return (
    <EmptyState
      icon="🔍"
      title="Nenhum resultado encontrado"
      description={query ? `Não encontramos resultados para "${query}"` : 'Tente buscar por outro termo'}
    />
  )
}
