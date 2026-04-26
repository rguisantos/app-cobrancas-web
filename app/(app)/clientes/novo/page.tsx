'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Header from '@/components/layout/header'
import { ClienteForm } from '../cliente-form'
import { useToast } from '@/components/ui/toaster'

export default function NovoClientePage() {
  const router = useRouter()
  const toast = useToast()

  return (
    <>
      <Header
        title="Novo Cliente"
        subtitle="Cadastrar um novo cliente no sistema"
        actions={
          <Link href="/clientes" className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Voltar</span>
          </Link>
        }
      />
      <ClienteForm
        title="Novo Cliente"
        subtitle="Cadastrar um novo cliente no sistema"
        submitLabel="Salvar Cliente"
        submitLoadingLabel="Salvando..."
        onSubmit={async ({ formData, contatos, identificador }) => {
          try {
            const res = await fetch('/api/clientes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...formData,
                identificador,
                contatos,
              }),
            })

            if (res.ok) {
              toast.success('Cliente cadastrado com sucesso!')
              return { success: true }
            }

            const error = await res.json()
            if (error.errors) {
              return { success: false, errors: error.errors }
            }
            return { success: false, message: error.error || 'Erro ao salvar cliente' }
          } catch {
            return { success: false, message: 'Erro ao salvar cliente' }
          }
        }}
        onSuccess={() => router.push('/clientes')}
      />
    </>
  )
}
