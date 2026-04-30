'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  DollarSign,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  Clock,
  Filter,
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { extractArray } from '@/lib/utils'

interface AgendaEvent {
  id: string
  tipo: 'vencimento' | 'recebimento' | 'manutencao'
  titulo: string
  data: string
  status?: string
  valor?: number
  cliente_nome?: string
  produto_id?: string
  link: string
}

interface AgendaStats {
  totalVencimentos: number
  totalRecebidos: number
  totalPendente: number
  taxaAdimplencia: number
}

const TYPE_CONFIG = {
  vencimento: { color: '#DC2626', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: AlertTriangle, label: 'Vencimento' },
  recebimento: { color: '#16A34A', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', icon: CheckCircle2, label: 'Recebimento' },
  manutencao: { color: '#2563EB', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', icon: Wrench, label: 'Manutenção' },
}

export default function AgendaClient() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [eventos, setEventos] = useState<AgendaEvent[]>([])
  const [stats, setStats] = useState<AgendaStats>({ totalVencimentos: 0, totalRecebidos: 0, totalPendente: 0, taxaAdimplencia: 100 })
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtroTipos, setFiltroTipos] = useState<Set<string>>(new Set(['vencimento', 'recebimento', 'manutencao']))
  const [filtroRota, setFiltroRota] = useState<string>('all')
  const [rotas, setRotas] = useState<{ id: string; descricao: string }[]>([])

  const monthKey = format(currentMonth, 'yyyy-MM')

  const fetchEventos = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ mes: monthKey })
      if (filtroRota !== 'all') params.set('rotaId', filtroRota)
      params.set('tipos', Array.from(filtroTipos).join(','))

      const res = await fetch(`/api/agenda?${params}`)
      if (res.ok) {
        const data = await res.json()
        setEventos(data.eventos || [])
        setStats(data.stats || { totalVencimentos: 0, totalRecebidos: 0, totalPendente: 0, taxaAdimplencia: 100 })
      }
    } catch (err) {
      console.error('Erro ao buscar agenda:', err)
    } finally {
      setLoading(false)
    }
  }, [monthKey, filtroRota, filtroTipos])

  useEffect(() => {
    fetchEventos()
  }, [fetchEventos])

  useEffect(() => {
    fetch('/api/rotas')
      .then(r => r.ok ? r.json() : [])
      .then(data => setRotas(extractArray(data)))
      .catch(() => {})
  }, [])

  // Group events by date
  const eventosByDate = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>()
    for (const evt of eventos) {
      const dateKey = format(parseISO(evt.data), 'yyyy-MM-dd')
      if (!map.has(dateKey)) map.set(dateKey, [])
      map.get(dateKey)!.push(evt)
    }
    return map
  }, [eventos])

  // Selected day events
  const selectedDateKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null
  const selectedEvents = selectedDateKey ? (eventosByDate.get(selectedDateKey) || []) : []

  // Upcoming events (next 7 days)
  const upcomingEvents = useMemo(() => {
    const now = new Date()
    const weekLater = addDays(now, 7)
    return eventos
      .filter(e => {
        const d = parseISO(e.data)
        return d >= now && d <= weekLater
      })
      .slice(0, 10)
  }, [eventos])

  // Calendar grid
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const calendarDays: Date[] = []
  let day = calStart
  while (day <= calEnd) {
    calendarDays.push(day)
    day = addDays(day, 1)
  }

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const today = new Date()

  const toggleTipo = (tipo: string) => {
    setFiltroTipos(prev => {
      const next = new Set(prev)
      if (next.has(tipo)) next.delete(tipo)
      else next.add(tipo)
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Vencimentos</span>
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{stats.totalVencimentos}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-500" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Recebido</span>
          </div>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(stats.totalRecebidos)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Pendente</span>
          </div>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(stats.totalPendente)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="w-4 h-4 text-primary-500" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Adimplência</span>
          </div>
          <p className="text-xl font-bold text-primary-600 dark:text-primary-400">{stats.taxaAdimplencia}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Month navigation */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </h3>
              <button
                onClick={() => { setCurrentMonth(new Date()); setSelectedDate(null) }}
                className="px-3 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
              >
                Hoje
              </button>
            </div>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-slate-100 dark:border-slate-700">
            <Filter className="w-4 h-4 text-slate-400" />
            {(['vencimento', 'recebimento', 'manutencao'] as const).map(tipo => {
              const cfg = TYPE_CONFIG[tipo]
              const active = filtroTipos.has(tipo)
              return (
                <button
                  key={tipo}
                  onClick={() => toggleTipo(tipo)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    active
                      ? `${cfg.bg} ${cfg.text}`
                      : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: active ? cfg.color : '#94a3b8' }} />
                  {cfg.label}
                </button>
              )
            })}
            {rotas.length > 0 && (
              <select
                value={filtroRota}
                onChange={e => setFiltroRota(e.target.value)}
                className="ml-auto text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300"
              >
                <option value="all">Todas rotas</option>
                {rotas.map(r => (
                  <option key={r.id} value={r.id}>{r.descricao}</option>
                ))}
              </select>
            )}
          </div>

          {/* Week day headers */}
          <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-700">
            {weekDays.map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((d, i) => {
              const dateKey = format(d, 'yyyy-MM-dd')
              const dayEvents = eventosByDate.get(dateKey) || []
              const isCurrentMonth = isSameMonth(d, currentMonth)
              const isToday = isSameDay(d, today)
              const isSelected = selectedDate ? isSameDay(d, selectedDate) : false

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(isSelected ? null : d)}
                  className={`relative min-h-[80px] p-1.5 border-b border-r border-slate-100 dark:border-slate-700/50 text-left transition-colors ${
                    !isCurrentMonth ? 'bg-slate-50/50 dark:bg-slate-900/30' : ''
                  } ${isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'} ${
                    isToday ? 'ring-2 ring-primary-500 ring-inset' : ''
                  }`}
                >
                  <span className={`text-sm font-medium ${
                    isToday
                      ? 'text-primary-600 dark:text-primary-400'
                      : isCurrentMonth
                      ? 'text-slate-900 dark:text-slate-200'
                      : 'text-slate-400 dark:text-slate-600'
                  }`}>
                    {format(d, 'd')}
                  </span>

                  {/* Event indicators */}
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 3).map((evt, ei) => {
                      const cfg = TYPE_CONFIG[evt.tipo as keyof typeof TYPE_CONFIG]
                      return (
                        <div
                          key={ei}
                          className="flex items-center gap-1"
                          title={evt.titulo}
                        >
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                          <span className="text-[10px] text-slate-600 dark:text-slate-400 truncate hidden sm:block">
                            {evt.titulo.length > 15 ? evt.titulo.slice(0, 15) + '…' : evt.titulo}
                          </span>
                        </div>
                      )
                    })}
                    {dayEvents.length > 3 && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">+{dayEvents.length - 3} mais</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              {selectedDate
                ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR })
                : 'Próximos Eventos'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {selectedDate
                ? `${selectedEvents.length} evento(s)`
                : 'Próximos 7 dias'}
            </p>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[500px] overflow-y-auto">
            {(selectedDate ? selectedEvents : upcomingEvents).length === 0 ? (
              <div className="p-6 text-center">
                <CalendarDays className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum evento encontrado</p>
              </div>
            ) : (
              (selectedDate ? selectedEvents : upcomingEvents).map(evt => {
                const cfg = TYPE_CONFIG[evt.tipo as keyof typeof TYPE_CONFIG]
                const Icon = cfg.icon
                return (
                  <Link
                    key={evt.id}
                    href={evt.link}
                    className="flex items-start gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <div className={`p-2 rounded-lg ${cfg.bg}`}>
                      <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {evt.titulo}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {format(parseISO(evt.data), 'dd/MM HH:mm')}
                        </span>
                        {evt.valor !== undefined && evt.valor > 0 && (
                          <span className="text-xs font-medium" style={{ color: cfg.color }}>
                            {formatCurrency(evt.valor)}
                          </span>
                        )}
                        {evt.status && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                            {evt.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
