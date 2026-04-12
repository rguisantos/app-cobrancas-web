import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/header'
import { Smartphone, CheckCircle2, Wifi, XCircle, Activity } from 'lucide-react'
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

      {/* KPIs - Grid responsivo otimizado para mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="card p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl sm:text-3xl font-bold text-slate-900">{dispositivos.length}</p>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">Total</p>
            </div>
          </div>
        </div>
        
        <div className="card p-3 sm:p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/30">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl sm:text-3xl font-bold text-slate-900">{totalAtivos}</p>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">Ativos</p>
            </div>
          </div>
        </div>
        
        <div className="card p-3 sm:p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Wifi className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl sm:text-3xl font-bold text-slate-900">{totalOnline}</p>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">Online</p>
            </div>
          </div>
        </div>
        
        <div className="card p-3 sm:p-4 bg-gradient-to-br from-red-50 to-orange-50 border-red-100">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30">
              <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl sm:text-3xl font-bold text-slate-900">{totalInativos}</p>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">Inativos</p>
            </div>
          </div>
        </div>
      </div>

      <DispositivosClient dispositivosIniciais={dispositivosSerializados as any} />
    </div>
  )
}
