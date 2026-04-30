'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Header from '@/components/layout/header'
import { useToast } from '@/components/ui/toaster'
import UsuarioForm, { UsuarioFormData } from '@/components/usuarios/UsuarioForm'
import { extractArray } from '@/lib/utils'

interface Rota {
  id: string
  descricao: string
}

export default function NovoUsuarioPage() {
  const router = useRouter()
  const toast = useToast()
  const [rotas, setRotas] = useState<Rota[]>([])

  useEffect(() => {
    fetch('/api/rotas?status=Ativo')
      .then(res => res.json())
      .then(data => setRotas(extractArray(data)))
      .catch(console.error)
  }, [])

  const handleSubmit = async (formData: UsuarioFormData) => {
    const { confirmarSenha, ...dataToSend } = formData
    const res = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataToSend),
    })

    if (res.ok) {
      toast.success('Usuário criado com sucesso!')
      router.push('/admin/usuarios')
    } else {
      const error = await res.json()
      if (error.details) {
        const messages = error.details.map((e: any) => e.message).join(', ')
        throw new Error(messages)
      }
      throw new Error(error.error || 'Erro ao criar usuário')
    }
  }

  return (
    <div className="pb-24 lg:pb-8">
      <Header
        title="Novo Usuário"
        subtitle="Cadastrar um novo usuário no sistema"
        actions={
          <Link href="/admin/usuarios" className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Voltar</span>
          </Link>
        }
      />

      <UsuarioForm
        mode="create"
        rotas={rotas}
        onSubmit={handleSubmit}
        onCancel={() => router.push('/admin/usuarios')}
      />
    </div>
  )
}
