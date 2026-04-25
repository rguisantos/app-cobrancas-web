'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Filter, Users, AlertTriangle, Loader2, MapPinned, RefreshCw } from 'lucide-react'

const MapView = dynamic(() => import('./map-view'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-2" />
        <p className="text-slate-500 dark:text-slate-400">Carregando mapa...</p>
      </div>
    </div>
  ),
})

interface Rota {
  id: string
  nome: string
  total_clientes: number
  centro_lat: number | null
  centro_lng: number | null
}

interface Cliente {
  id: string
  nomeExibicao: string
  endereco: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  latitude: number
  longitude: number
  rotaId: string
  rota_nome: string
  locacoes_ativas: number
  cobrancas_pendentes: number
  cobrancas_atrasadas: number
}

const ROTA_COLORS = [
  '#2563EB', '#16A34A', '#D97706', '#DC2626', '#7C3AED',
  '#0891B2', '#DB2777', '#059669', '#CA8A04', '#4F46E5',
  '#E11D48', '#0D9488', '#A855F7', '#F97316', '#6366F1',
]

export default function MapaClient() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [rotas, setRotas] = useState<Rota[]>([])
  const [selectedRota, setSelectedRota] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoResult, setGeoResult] = useState<{ geocodificados: number; erros: number; total: number } | null>(null)
  const [stats, setStats] = useState({
    totalClientes: 0,
    totalPendentes: 0,
    totalAtrasadas: 0,
  })

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        if (selectedRota !== 'all') params.set('rotaId', selectedRota)
        const res = await fetch(`/api/mapa?${params}`)
        if (res.ok) {
          const data = await res.json()
          setClientes(data.clientes || [])
          setRotas(data.rotas || [])
          const cls = data.clientes || []
          setStats({
            totalClientes: cls.length,
            totalPendentes: cls.reduce((s: number, c: Cliente) => s + c.cobrancas_pendentes, 0),
            totalAtrasadas: cls.reduce((s: number, c: Cliente) => s + c.cobrancas_atrasadas, 0),
          })
        }
      } catch (err) {
        console.error('Erro ao buscar dados:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [selectedRota])

  async function handleGeocodificar() {
    if (!confirm('Deseja buscar as coordenadas dos clientes automaticamente? Isso pode levar alguns minutos dependendo da quantidade de clientes.')) return
    setGeoLoading(true)
    setGeoResult(null)
    try {
      const res = await fetch('/api/mapa/geocodificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forcar: false }),
      })
      if (res.ok) {
        const data = await res.json()
        setGeoResult({
          geocodificados: data.geocodificados,
          erros: data.erros,
          total: data.total,
        })
        // Recarregar dados do mapa
        if (data.geocodificados > 0) {
          const params = new URLSearchParams()
          if (selectedRota !== 'all') params.set('rotaId', selectedRota)
          const mapRes = await fetch(`/api/mapa?${params}`)
          if (mapRes.ok) {
            const mapData = await mapRes.json()
            setClientes(mapData.clientes || [])
            setRotas(mapData.rotas || [])
            const cls = mapData.clientes || []
            setStats({
              totalClientes: cls.length,
              totalPendentes: cls.reduce((s: number, c: Cliente) => s + c.cobrancas_pendentes, 0),
              totalAtrasadas: cls.reduce((s: number, c: Cliente) => s + c.cobrancas_atrasadas, 0),
            })
          }
        }
      }
    } catch (err) {
      console.error('Erro na geocodificação:', err)
    } finally {
      setGeoLoading(false)
    }
  }

  const getRotaColor = (rotaId: string) => {
    const idx = rotas.findIndex(r => r.id === rotaId)
    return ROTA_COLORS[idx % ROTA_COLORS.length]
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
      {/* Top Bar with filters and stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Rota filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedRota}
            onChange={e => setSelectedRota(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">Todas as Rotas</option>
            {rotas.map(r => (
              <option key={r.id} value={r.id}>{r.nome} ({r.total_clientes})</option>
            ))}
          </select>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <Users className="w-4 h-4" />
            <span>{stats.totalClientes} clientes no mapa</span>
          </div>
          {stats.totalAtrasadas > 0 && (
            <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <span>{stats.totalAtrasadas} atrasadas</span>
            </div>
          )}
        </div>

        {/* Geocodificar button */}
        <div className="sm:ml-auto flex items-center gap-2">
          <button
            onClick={handleGeocodificar}
            disabled={geoLoading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {geoLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MapPinned className="w-4 h-4" />
            )}
            {geoLoading ? 'Buscando coordenadas...' : 'Buscar Coordenadas'}
          </button>
          <button
            onClick={() => {
              setSelectedRota('all')
              setLoading(true)
              fetch('/api/mapa').then(r => r.ok ? r.json() : null).then(data => {
                if (data) {
                  setClientes(data.clientes || [])
                  setRotas(data.rotas || [])
                  const cls = data.clientes || []
                  setStats({
                    totalClientes: cls.length,
                    totalPendentes: cls.reduce((s: number, c: Cliente) => s + c.cobrancas_pendentes, 0),
                    totalAtrasadas: cls.reduce((s: number, c: Cliente) => s + c.cobrancas_atrasadas, 0),
                  })
                }
                setLoading(false)
              })
            }}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors dark:hover:text-slate-300 dark:hover:bg-slate-700"
            title="Atualizar mapa"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Geocoding result */}
      {geoResult && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm ${
          geoResult.erros > 0
            ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
            : 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
        }`}>
          <MapPinned className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>{geoResult.geocodificados}</strong> de {geoResult.total} clientes geocodificados com sucesso
            {geoResult.erros > 0 && ` • ${geoResult.erros} não encontrados`}
          </span>
          <button onClick={() => setGeoResult(null)} className="ml-auto text-current opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Legend */}
      {rotas.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {rotas.map(r => (
            <div key={r.id} className="flex items-center gap-1.5 text-xs">
              <div
                className="w-3 h-3 rounded-full border border-white shadow-sm"
                style={{ backgroundColor: getRotaColor(r.id) }}
              />
              <span className="text-slate-600 dark:text-slate-400">{r.nome}</span>
            </div>
          ))}
        </div>
      )}

      {/* Map */}
      <div className="flex-1 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
        {loading ? (
          <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : clientes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
            <MapPin className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">Nenhum cliente com coordenadas</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1 mb-4">
              Clique no botão &quot;Buscar Coordenadas&quot; para localizar os clientes automaticamente
            </p>
            <button
              onClick={handleGeocodificar}
              disabled={geoLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPinned className="w-4 h-4" />}
              Buscar Coordenadas dos Clientes
            </button>
          </div>
        ) : (
          <MapView clientes={clientes} rotas={rotas} getRotaColor={getRotaColor} />
        )}
      </div>
    </div>
  )
}
