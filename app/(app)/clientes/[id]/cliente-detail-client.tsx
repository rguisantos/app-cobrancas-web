'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { useToast } from '@/components/ui/toaster'

interface ClienteDetailClientProps {
  clienteId: string
  clienteNome: string
}

export function ClienteDetailClient({ clienteId, clienteNome }: ClienteDetailClientProps) {
  const router = useRouter()
  const toast = useToast()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/clientes/${clienteId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success(`Cliente "${clienteNome}" excluído com sucesso`)
        router.push('/clientes')
        router.refresh()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao excluir cliente')
      }
    } catch {
      toast.error('Erro ao excluir cliente')
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowDeleteModal(true)}
        className="btn-secondary text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        <Trash2 className="w-4 h-4" />
        <span className="hidden sm:inline">Excluir</span>
      </button>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Excluir cliente"
        message={`Tem certeza que deseja excluir o cliente "${clienteNome}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        isLoading={deleting}
      />
    </>
  )
}
