'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Filter, Users, AlertTriangle, Loader2, MapPinned, RefreshCw, DollarSign, Clock, Eye, EyeOff } from 'lucide-react'

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
  cor: string
  status: string
  total_clientes: number
  centro_lat: number | null
  centro_lng: number | null
  valor_atrasado: number
  valor_pendente: number
}

interface Cliente {
  id: string
  nomeExibicao: string
  identificador: string
  endereco: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  latitude: number
  longitude: number
  rotaId: string
  rota_nome: string
  rota_cor: string
  locacoes_ativas: number
  cobrancas_pendentes: number
  cobrancas_atrasadas: number
  valor_pendente: number
  valor_atrasado: number
  valor_recebido: number
}

interface MapaStats {
  totalClientes: number
  totalNoMapa: number
  valorPendente: number
  valorAtrasado: number
  valorRecebido: number
  semCoordenadas: number
}

const DEFAULT_COLOR = '#2563EB'

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function MapaClient() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [rotas, setRotas] = useState<Rota[]>([])
  const [selectedRota, setSelectedRota] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoResult, setGeoResult] = useState<{ geocodificados: number; erros: number; total: number } | null>(null)
  const [stats, setStats] = useState<MapaStats>({
    totalClientes: 0,
    totalNoMapa: 0,
    valorPendente: 0,
    valorAtrasado: 0,
    valorRecebido: 0,
    semCoordenadas: 0,
  })
  const [hiddenRotas, setHiddenRotas] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedRota !== 'all') params.set('rotaId', selectedRota)
      const res = await fetch(`/api/mapa?${params}`)
      if (res.ok) {
        const data = await res.json()
        setClientes(data.clientes || [])
        setRotas(data.rotas || [])
        setStats(data.stats || { totalClientes: 0, totalNoMapa: 0, valorPendente: 0, valorAtrasado: 0, valorRecebido: 0, semCoordenadas: 0 })
      }
    } catch (err) {
      console.error('Erro ao buscar dados:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedRota])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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
          await fetchData()
        }
      }
    } catch (err) {
      console.error('Erro na geocodificação:', err)
    } finally {
      setGeoLoading(false)
    }
  }

  const getRotaColor = (rotaId: string) => {
    const rota = rotas.find(r => r.id === rotaId)
    return rota?.cor || DEFAULT_COLOR
  }

  const toggleRotaVisibility = (rotaId: string) => {
    setHiddenRotas(prev => {
      const next = new Set(prev)
      if (next.has(rotaId)) next.delete(rotaId)
      else next.add(rotaId)
      return next
    })
  }

  // Clientes filtrados por visibilidade da rota
  const visibleClientes = clientes.filter(c => !hiddenRotas.has(c.rotaId))

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-slate-500 dark:text-slate-400">No Mapa</span>
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{stats.totalNoMapa}</p>
          {stats.semCoordenadas > 0 && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
              +{stats.semCoordenadas} sem coordenadas
            </p>
          )}
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-500" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Recebido</span>
          </div>
          <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(stats.valorRecebido)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Pendente</span>
          </div>
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{formatCurrency(stats.valorPendente)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Atrasado</span>
          </div>
          <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(stats.valorAtrasado)}</p>
        </div>
        <div className="col-span-2 md:col-span-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-4 h-4 text-primary-500" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Rotas</span>
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{rotas.length}</p>
        </div>
      </div>

      {/* Top Bar with filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Rota filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedRota}
            onChange={e => {
              setSelectedRota(e.target.value)
              setHiddenRotas(new Set())
            }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">Todas as Rotas</option>
            {rotas.map(r => (
              <option key={r.id} value={r.id}>
                {r.nome} ({r.total_clientes} clientes)
              </option>
            ))}
          </select>
        </div>

        {/* Geocodificar + Refresh buttons */}
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
            {geoLoading ? 'Buscando...' : 'Buscar Coordenadas'}
          </button>
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors dark:hover:text-slate-300 dark:hover:bg-slate-700"
            title="Atualizar mapa"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
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
            {geoResult.erros > 0 && ` - ${geoResult.erros} nao encontrados`}
          </span>
          <button onClick={() => setGeoResult(null)} className="ml-auto text-current opacity-50 hover:opacity-100">x</button>
        </div>
      )}

      {/* Legend with toggleable routes */}
      {rotas.length > 0 && selectedRota === 'all' && (
        <div className="flex flex-wrap gap-2">
          {rotas.map(r => {
            const isHidden = hiddenRotas.has(r.id)
            const hasDebt = r.valor_atrasado > 0 || r.valor_pendente > 0
            return (
              <button
                key={r.id}
                onClick={() => toggleRotaVisibility(r.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  isHidden
                    ? 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500 line-through'
                    : 'bg-white border-slate-200 text-slate-700 hover:shadow-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200'
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full border border-white shadow-sm ${isHidden ? 'opacity-40' : ''}`}
                  style={{ backgroundColor: r.cor || DEFAULT_COLOR }}
                />
                <span>{r.nome}</span>
                <span className="text-slate-400">({r.total_clientes})</span>
                {hasDebt && !isHidden && (
                  <span className="text-red-500 font-semibold">
                    {formatCurrency(r.valor_atrasado + r.valor_pendente)}
                  </span>
                )}
                {isHidden ? (
                  <EyeOff className="w-3 h-3" />
                ) : (
                  <Eye className="w-3 h-3" />
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Map */}
      <div className="flex-1 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm relative" style={{ zIndex: 0 }}>
        {loading ? (
          <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : visibleClientes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
            <MapPin className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">Nenhum cliente com coordenadas</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1 mb-4">
              Clique em &quot;Buscar Coordenadas&quot; para localizar os clientes automaticamente
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
          <MapView clientes={visibleClientes} rotas={rotas} getRotaColor={getRotaColor} />
        )}
      </div>
    </div>
  )
}
