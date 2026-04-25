import { Metadata } from 'next'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/header'
import ProfileClient from './profile-client'

export const metadata: Metadata = { title: 'Meu Perfil' }

export default async function PerfilPage() {
  const session = await getSession()
  if (!session?.user?.id) redirect('/login')

  // Buscar dados completos do usuário
  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      nome: true,
      email: true,
      cpf: true,
      telefone: true,
      tipoPermissao: true,
      status: true,
      dataUltimoAcesso: true,
      ultimoAcessoDispositivo: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!usuario) redirect('/login')

  return (
    <div className="space-y-6">
      <Header
        title="Meu Perfil"
        subtitle="Gerencie suas informações e senha de acesso"
      />
      <ProfileClient usuario={usuario} />
    </div>
  )
}
