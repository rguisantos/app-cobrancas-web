'use client'

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

// ============================================================================
// TIPOS
// ============================================================================

type ToastVariant = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  message: string
  variant: ToastVariant
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (message: string, variant?: ToastVariant, duration?: number) => void
  removeToast: (id: string) => void
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
}

// ============================================================================
// CONTEXTO
// ============================================================================

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast deve ser usado dentro de um ToastProvider')
  }
  return context
}

// ============================================================================
// CONFIGURAÇÃO DE CORES E ÍCONES
// ============================================================================

const variantConfig: Record<ToastVariant, {
  bg: string
  border: string
  text: string
  icon: typeof CheckCircle
  iconColor: string
}> = {
  success: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-800',
    icon: CheckCircle,
    iconColor: 'text-emerald-500',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: XCircle,
    iconColor: 'text-red-500',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: Info,
    iconColor: 'text-blue-500',
  },
}

// ============================================================================
// COMPONENTE TOAST INDIVIDUAL
// ============================================================================

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const config = variantConfig[toast.variant]
  const Icon = config.icon

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg border shadow-lg
        ${config.bg} ${config.border}
        animate-[fadeIn_0.3s_ease-out]
        max-w-md w-full
      `}
      role="alert"
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${config.iconColor}`} />
      <p className={`flex-1 text-sm font-medium ${config.text}`}>{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className={`flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors ${config.text}`}
        aria-label="Fechar notificação"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// ============================================================================
// PROVIDER
// ============================================================================

interface ToastProviderProps {
  children: ReactNode
  defaultDuration?: number
}

export function ToastProvider({ children, defaultDuration = 4000 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, variant: ToastVariant = 'info', duration?: number) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const toast: Toast = { id, message, variant, duration: duration ?? defaultDuration }
    
    setToasts(prev => [...prev, toast])
  }, [defaultDuration])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // Helpers para cada variante
  const success = useCallback((message: string, duration?: number) => {
    addToast(message, 'success', duration)
  }, [addToast])

  const error = useCallback((message: string, duration?: number) => {
    addToast(message, 'error', duration)
  }, [addToast])

  const warning = useCallback((message: string, duration?: number) => {
    addToast(message, 'warning', duration)
  }, [addToast])

  const info = useCallback((message: string, duration?: number) => {
    addToast(message, 'info', duration)
  }, [addToast])

  // Auto-dismiss
  useEffect(() => {
    const timers: NodeJS.Timeout[] = []

    toasts.forEach(toast => {
      if (toast.duration && toast.duration > 0) {
        const timer = setTimeout(() => {
          removeToast(toast.id)
        }, toast.duration)
        timers.push(timer)
      }
    })

    return () => {
      timers.forEach(timer => clearTimeout(timer))
    }
  }, [toasts, removeToast])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      
      {/* Container de toasts - posicionado no canto inferior direito */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// ============================================================================
// EXPORTAÇÕES AUXILIARES
// ============================================================================

export { type ToastVariant, type Toast }
