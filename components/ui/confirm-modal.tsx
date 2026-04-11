'use client'

import { useEffect, useRef } from 'react'
import { AlertTriangle, X, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// TIPOS
// ============================================================================

type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: ConfirmVariant
  isLoading?: boolean
  showCloseButton?: boolean
}

// ============================================================================
// CONFIGURAÇÃO DE VARIANTES
// ============================================================================

const variantConfig: Record<ConfirmVariant, {
  icon: typeof AlertTriangle
  iconBg: string
  iconColor: string
  confirmBtn: string
  confirmBg: string
}> = {
  danger: {
    icon: AlertTriangle,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    confirmBtn: 'btn-danger',
    confirmBg: 'bg-red-600 hover:bg-red-700',
  },
  warning: {
    icon: AlertCircle,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    confirmBtn: 'btn-primary',
    confirmBg: 'bg-amber-600 hover:bg-amber-700',
  },
  info: {
    icon: HelpCircle,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    confirmBtn: 'btn-primary',
    confirmBg: 'bg-blue-600 hover:bg-blue-700',
  },
  success: {
    icon: CheckCircle,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    confirmBtn: 'btn-primary',
    confirmBg: 'bg-emerald-600 hover:bg-emerald-700',
  },
}

// ============================================================================
// COMPONENTE
// ============================================================================

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  isLoading = false,
  showCloseButton = true,
}: ConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const config = variantConfig[variant]
  const Icon = config.icon

  // Fechar com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose, isLoading])

  // Focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-[fadeIn_0.2s_ease-out]"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-[fadeIn_0.2s_ease-out]"
      >
        {/* Header */}
        <div className="relative p-6 pb-0">
          {showCloseButton && (
            <button
              onClick={onClose}
              disabled={isLoading}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          
          <div className="flex items-start gap-4">
            {/* Ícone */}
            <div className={cn('flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center', config.iconBg)}>
              <Icon className={cn('w-6 h-6', config.iconColor)} />
            </div>
            
            {/* Título e mensagem */}
            <div className="flex-1 min-w-0">
              <h2 id="confirm-modal-title" className="text-lg font-semibold text-slate-900">
                {title}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {message}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 pt-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="btn-secondary py-2.5 px-4 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm text-white transition-colors disabled:opacity-50',
              config.confirmBg
            )}
          >
            {isLoading && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// COMPONENTE SIMPLIFICADO PARA USO RÁPIDO
// ============================================================================

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  itemName?: string
  isLoading?: boolean
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  itemName = 'este item',
  isLoading = false,
}: DeleteConfirmModalProps) {
  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Confirmar exclusão"
      message={`Tem certeza que deseja excluir ${itemName}? Esta ação não pode ser desfeita.`}
      confirmText="Excluir"
      cancelText="Cancelar"
      variant="danger"
      isLoading={isLoading}
    />
  )
}

export default ConfirmModal
