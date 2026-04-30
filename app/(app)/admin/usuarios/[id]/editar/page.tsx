'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Header from '@/components/layout/header'
import { useToast } from '@/components/ui/toaster'
import UsuarioForm, { UsuarioFormData } from '@/components/usuarios/UsuarioForm'
import { extractArray } from '@/lib/utils'

interface Rota {
  id: string
  descricao: string
}

export default function EditarUsuarioPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const toast = useToast()
  const [loadingData, setLoadingData] = useState(true)
  const [rotas, setRotas] = useState<Rota[]>([])
  const [initialData, setInitialData] = useState<Partial<UsuarioFormData & { bloqueado?: boolean; id?: string }>>()

  useEffect(() => {
    Promise.all([
      fetch('/api/rotas?status=Ativo').then(res => res.json()),
      fetch(`/api/usuarios/${id}`).then(res => res.json()),
    ])
      .then(([rotasData, usuarioData]) => {
        setRotas(extractArray(rotasData))
        // Map rotasPermitidasRel to rotasPermitidas (array of IDs)
        const rotasPermitidas = usuarioData.rotasPermitidasRel
          ? usuarioData.rotasPermitidasRel.map((r: any) => r.rotaId)
          : []
        setInitialData({
          id: usuarioData.id,
          nome: usuarioData.nome || '',
          cpf: usuarioData.cpf || '',
          telefone: usuarioData.telefone || '',
          email: usuarioData.email || '',
          tipoPermissao: usuarioData.tipoPermissao || 'Secretario',
          permissoesWeb: usuarioData.permissoesWeb || undefined,
          permissoesMobile: usuarioData.permissoesMobile || undefined,
          rotasPermitidas,
          status: usuarioData.status || 'Ativo',
          bloqueado: usuarioData.bloqueado || false,
        })
        setLoadingData(false)
      })
      .catch(err => {
        console.error(err)
        toast.error('Erro ao carregar dados do usuário')
        setLoadingData(false)
      })
  }, [id, toast])

  const handleSubmit = async (formData: UsuarioFormData) => {
    const { confirmarSenha: _confirm, senha, ...rest } = formData
    const dataToSend: Record<string, any> = { ...rest }
    // Only send password if provided on edit
    if (senha) {
      dataToSend.senha = senha
    }

    const res = await fetch(`/api/usuarios/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataToSend),
    })

    if (res.ok) {
      toast.success('Usuário atualizado com sucesso!')
      router.push(`/admin/usuarios/${id}`)
    } else {
      const error = await res.json()
      if (error.details) {
        const messages = error.details.map((e: any) => e.message).join(', ')
        throw new Error(messages)
      }
      throw new Error(error.error || 'Erro ao atualizar usuário')
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="pb-24 lg:pb-8">
      <Header
        title="Editar Usuário"
        subtitle={initialData?.nome || ''}
        actions={
          <Link href={`/admin/usuarios/${id}`} className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Voltar</span>
          </Link>
        }
      />

      <UsuarioForm
        mode="edit"
        initialData={initialData}
        rotas={rotas}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/admin/usuarios/${id}`)}
      />
    </div>
  )
}
