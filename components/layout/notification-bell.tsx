'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  AlertTriangle,
  DollarSign,
  RefreshCw,
  CheckCircle,
  Info,
  Check,
  X,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ── Types ──────────────────────────────────────────────────────────────
interface Notificacao {
  id: string
  usuarioId: string
  tipo: string
  titulo: string
  mensagem: string
  lida: boolean
  link: string | null
  createdAt: string
}

// ── Icon map by tipo ──────────────────────────────────────────────────
function getNotificacaoIcon(tipo: string) {
  switch (tipo) {
    case 'cobranca_vencida':
      return AlertTriangle
    case 'saldo_devedor':
      return DollarSign
    case 'conflito_sync':
      return RefreshCw
    case 'cobranca_gerada':
      return CheckCircle
    case 'info':
    default:
      return Info
  }
}

function getNotificacaoColor(tipo: string) {
  switch (tipo) {
    case 'cobranca_vencida':
      return 'bg-red-100 text-red-600'
    case 'saldo_devedor':
      return 'bg-amber-100 text-amber-600'
    case 'conflito_sync':
      return 'bg-purple-100 text-purple-600'
    case 'cobranca_gerada':
      return 'bg-emerald-100 text-emerald-600'
    case 'info':
    default:
      return 'bg-blue-100 text-blue-600'
  }
}

function formatTimeAgo(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), {
      addSuffix: true,
      locale: ptBR,
    })
  } catch {
    return ''
  }
}

// ── Component ──────────────────────────────────────────────────────────
export default function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notificacao[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notificacoes?limit=15')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.data || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch {
      // Silently fail
    }
  }, [])

  // Initial fetch and polling
  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const res = await fetch('/api/notificacoes?limit=15')
        if (res.ok && mounted) {
          const data = await res.json()
          setNotifications(data.data || [])
          setUnreadCount(data.unreadCount || 0)
        }
      } catch {
        // Silently fail
      }
    }

    load()
    const interval = setInterval(fetchNotifications, 30000) // Refresh every 30s
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [fetchNotifications])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Mark single as read
  const markAsRead = useCallback(
    async (notif: Notificacao) => {
      try {
        await fetch(`/api/notificacoes/${notif.id}`, { method: 'PUT' })
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, lida: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))

        if (notif.link) {
          setOpen(false)
          router.push(notif.link)
        }
      } catch {
        // Silently fail
      }
    },
    [router]
  )

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await fetch('/api/notificacoes', { method: 'PUT' })
      setNotifications((prev) => prev.map((n) => ({ ...n, lida: true })))
      setUnreadCount(0)
    } catch {
      // Silently fail
    }
  }, [])

  // Delete notification
  const deleteNotification = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await fetch(`/api/notificacoes/${id}`, { method: 'DELETE' })
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      // Recalculate unread count
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch {
      // Silently fail
    }
  }, [])

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none px-1 shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-semibold text-slate-900">Notificações</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
              >
                <Check className="w-3 h-3" />
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <Bell className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-sm text-slate-500 font-medium">Nenhuma notificação</p>
                <p className="text-xs text-slate-400 mt-1">
                  Você será notificado sobre cobranças vencidas e outros alertas
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const Icon = getNotificacaoIcon(notif.tipo)
                const colorClass = getNotificacaoColor(notif.tipo)
                return (
                  <div
                    key={notif.id}
                    onClick={() => markAsRead(notif)}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-slate-50 last:border-b-0 group ${
                      notif.lida
                        ? 'bg-white hover:bg-slate-50'
                        : 'bg-primary-50/50 hover:bg-primary-50'
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm leading-tight ${
                            notif.lida ? 'text-slate-600' : 'text-slate-900 font-medium'
                          }`}
                        >
                          {notif.titulo}
                        </p>
                        <button
                          onClick={(e) => deleteNotification(notif.id, e)}
                          className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all flex-shrink-0"
                          aria-label="Remover notificação"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.mensagem}</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {formatTimeAgo(notif.createdAt)}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {!notif.lida && (
                      <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-2" />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
