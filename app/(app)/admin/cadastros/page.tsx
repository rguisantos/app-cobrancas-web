import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import Header from '@/components/layout/header'
import CadastrosClient from './cadastros-client'

export const metadata: Metadata = { title: 'Cadastros Auxiliares' }

export default async function CadastrosPage() {
  const session = await getSession()
  if (!session?.user || session.user.tipoPermissao !== 'Administrador') redirect('/dashboard')

  return (
    <div>
      <Header
        title="Cadastros Auxiliares"
        subtitle="Gerencie tipos, descrições, tamanhos de produtos e estabelecimentos"
      />
      <CadastrosClient />
    </div>
  )
}
