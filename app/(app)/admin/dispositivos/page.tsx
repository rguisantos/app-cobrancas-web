import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/header'
import { Smartphone, Wifi, WifiOff, CheckCircle2, XCircle, Activity } from 'lucide-react'
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

  // Calcular estatísticas
  const totalAtivos = dispositivos.filter(d => d.status === 'ativo').length
  const totalInativos = dispositivos.filter(d => d.status !== 'ativo').length
  
  // Online = última sincronização nos últimos 30 minutos
  // Server Component: executado apenas uma vez no servidor
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()
  const ONLINE_THRESHOLD = 1000 * 60 * 30
  const totalOnline = dispositivos.filter(d => 
    d.ultimaSincronizacao && 
    (now - new Date(d.ultimaSincronizacao).getTime()) < ONLINE_THRESHOLD
  ).length

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
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{dispositivos.length}</p>
              <p className="text-xs text-slate-500">Total</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalAtivos}</p>
              <p className="text-xs text-slate-500">Ativos</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Wifi className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalOnline}</p>
              <p className="text-xs text-slate-500">Online</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalInativos}</p>
              <p className="text-xs text-slate-500">Inativos</p>
            </div>
          </div>
        </div>
      </div>

      <DispositivosClient dispositivosIniciais={dispositivosSerializados as any} />
    </div>
  )
}
