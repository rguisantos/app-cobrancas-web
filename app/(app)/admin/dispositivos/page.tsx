import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/header'
import { Smartphone } from 'lucide-react'
import DispositivosClient from './DispositivosClient'

export const metadata: Metadata = { title: 'Dispositivos Móveis' }

export default async function DispositivosPage() {
  const session = await getSession()
  if (!session?.user || session.user.tipoPermissao !== 'Administrador') redirect('/dashboard')

  const dispositivos = await prisma.dispositivo.findMany({ 
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      nome: true,
      chave: true,
      senhaNumerica: true,
      tipo: true,
      status: true,
      ultimaSincronizacao: true,
      createdAt: true
    }
  })

  // Converter datas para string para serialização
  const dispositivosSerializados = dispositivos.map(d => ({
    ...d,
    ultimaSincronizacao: d.ultimaSincronizacao?.toISOString() || null,
    createdAt: d.createdAt.toISOString()
  }))

  return (
    <div>
      <Header 
        title="Dispositivos Móveis" 
        subtitle="Gerencie os dispositivos autorizados a sincronizar dados"
        actions={
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Smartphone className="w-4 h-4" />
            <span>{dispositivos.length} dispositivo(s)</span>
          </div>
        }
      />

      <DispositivosClient dispositivosIniciais={dispositivosSerializados as any} />
    </div>
  )
}
