'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Trash2, Activity, ArrowRight } from 'lucide-react'

// ============================================================================
// TIPOS
// ============================================================================

interface Atividade {
  id: string
  operacao: string
  entidade: string
  entidadeId: string
  descricao: string
  timestamp: string
  link: string
}

// ============================================================================
// HELPERS
// ============================================================================

const ENTITY_LABELS: Record<string, string> = {
  cliente: 'Cliente',
  produto: 'Produto',
  locacao: 'Locação',
  cobranca: 'Cobrança',
  rota: 'Rota',
  usuario: 'Usuário',
}

function getOperationIcon(operacao: string) {
  switch (operacao) {
    case 'create':
      return { icon: Plus, bg: 'bg-emerald-100', color: 'text-emerald-600' }
    case 'update':
      return { icon: Pencil, bg: 'bg-amber-100', color: 'text-amber-600' }
    case 'delete':
      return { icon: Trash2, bg: 'bg-red-100', color: 'text-red-600' }
    default:
      return { icon: Activity, bg: 'bg-slate-100', color: 'text-slate-600' }
  }
}

function tempoRelativo(dateStr: string): string {
  const agora = new Date()
  const data = new Date(dateStr)
  const diffMs = agora.getTime() - data.getTime()
  const diffSeg = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSeg / 60)
  const diffHora = Math.floor(diffMin / 60)
  const diffDia = Math.floor(diffHora / 24)

  if (diffSeg < 60) return 'agora mesmo'
  if (diffMin < 60) return `há ${diffMin} minuto${diffMin > 1 ? 's' : ''}`
  if (diffHora < 24) return `há ${diffHora} hora${diffHora > 1 ? 's' : ''}`
  if (diffDia < 7) return `há ${diffDia} dia${diffDia > 1 ? 's' : ''}`

  // Para mais de 7 dias, mostrar data formatada
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// ============================================================================
// COMPONENTE
// ============================================================================

export default function AtividadeRecente() {
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAtividades = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/atividade')
      if (res.ok) {
        const data = await res.json()
        setAtividades(data.slice(0, 10))
      }
    } catch {
      // Silently fail — dashboard should still work without activity feed
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAtividades()

    // Auto-refresh a cada 60 segundos
    const interval = setInterval(fetchAtividades, 60_000)
    return () => clearInterval(interval)
  }, [fetchAtividades])

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Atividade Recente</h2>
          <p className="text-sm text-slate-500 mt-0.5">Últimas alterações no sistema</p>
        </div>
        <Link
          href="/admin/sync"
          className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
        >
          Ver tudo →
        </Link>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-9 h-9 rounded-lg bg-slate-200" />
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-1" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && atividades.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Activity className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            Nenhuma atividade recente
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            As atividades aparecerão aqui assim que alterações forem registradas
          </p>
        </div>
      )}

      {/* Activity List */}
      {!loading && atividades.length > 0 && (
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {atividades.map((atividade) => {
            const { icon: OpIcon, bg, color } = getOperationIcon(atividade.operacao)
            const entityLabel = ENTITY_LABELS[atividade.entidade] || atividade.entidade

            return (
              <Link
                key={atividade.id}
                href={atividade.link}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
              >
                <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                  <OpIcon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 truncate group-hover:text-primary-600 transition-colors">
                    {atividade.descricao}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-400">{entityLabel}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="text-xs text-slate-400">
                      {tempoRelativo(atividade.timestamp)}
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
