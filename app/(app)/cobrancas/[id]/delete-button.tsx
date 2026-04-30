'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'
import { DeleteConfirmModal } from '@/components/ui/confirm-modal'
import { useToast } from '@/components/ui/toaster'

interface DeleteCobrancaButtonProps {
  cobrancaId: string
  cobrancaLabel: string
}

export function DeleteCobrancaButton({ cobrancaId, cobrancaLabel }: DeleteCobrancaButtonProps) {
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      // Usa o batch delete que não tem restrição de "apenas última cobrança"
      const res = await fetch('/api/cobrancas/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', ids: [cobrancaId] }),
      })

      if (res.ok) {
        success('Cobrança excluída com sucesso')
        router.push('/cobrancas')
        router.refresh()
      } else {
        const data = await res.json()
        toastError(data.error || 'Erro ao excluir cobrança')
      }
    } catch {
      toastError('Erro ao excluir cobrança')
    } finally {
      setLoading(false)
      setShowConfirm(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        <span className="hidden sm:inline">Excluir</span>
      </button>

      <DeleteConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        itemName={`a cobrança ${cobrancaLabel}`}
        isLoading={loading}
      />
    </>
  )
}
