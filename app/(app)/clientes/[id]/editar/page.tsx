'use client'

import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Header from '@/components/layout/header'
import { ClienteForm } from '../../cliente-form'
import { useToast } from '@/components/ui/toaster'

export default function EditarClientePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const toast = useToast()

  return (
    <>
      <Header
        title="Editar Cliente"
        subtitle=""
        actions={
          <Link href="/clientes" className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Voltar</span>
          </Link>
        }
      />
      <ClienteForm
        clienteId={id}
        title="Editar Cliente"
        subtitle=""
        submitLabel="Salvar Alterações"
        submitLoadingLabel="Salvando..."
        onSubmit={async ({ formData, contatos, identificador }) => {
          try {
            const res = await fetch(`/api/clientes/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...formData,
                identificador,
                contatos,
              }),
            })

            if (res.ok) {
              toast.success('Cliente atualizado com sucesso!')
              return { success: true }
            }

            const error = await res.json()
            if (error.errors) {
              return { success: false, errors: error.errors }
            }
            return { success: false, message: error.error || 'Erro ao atualizar cliente' }
          } catch {
            return { success: false, message: 'Erro ao atualizar cliente' }
          }
        }}
        onSuccess={() => router.push('/clientes')}
      />
    </>
  )
}
