// hooks/useRelatorio.ts — Hook genérico para relatórios
'use client'

import { useState, useCallback, useEffect } from 'react'

export interface RelatorioFilters {
  periodo: string
  dataInicio: string
  dataFim: string
  [key: string]: string
}

export interface UseRelatorioOptions<T = unknown> {
  /** API endpoint path, e.g. '/api/relatorios/financeiro' */
  endpoint: string
  /** Default filter values */
  defaultFilters?: Partial<RelatorioFilters>
  /** Called after data is fetched successfully */
  onDataLoaded?: (data: T) => void
}

export interface UseRelatorioReturn<T = unknown> {
  data: T | null
  loading: boolean
  error: string | null
  filters: RelatorioFilters
  setFilter: (key: string, value: string) => void
  applyFilters: () => void
  refetch: () => void
}

const DEFAULT_FILTERS: RelatorioFilters = {
  periodo: 'mes',
  dataInicio: '',
  dataFim: '',
}

/**
 * Hook genérico para carregar dados de relatórios.
 * Centraliza a lógica de fetch, filtros, loading e error handling
 * que antes era duplicada em cada página de relatório.
 */
export function useRelatorio<T = unknown>(
  options: UseRelatorioOptions<T>
): UseRelatorioReturn<T> {
  const { endpoint, defaultFilters, onDataLoaded } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<RelatorioFilters>(() => {
    const defaults = DEFAULT_FILTERS
    const merged: RelatorioFilters = { ...defaults }
    if (defaultFilters) {
      for (const [key, value] of Object.entries(defaultFilters)) {
        if (value !== undefined) {
          merged[key] = value
        }
      }
    }
    return merged
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()

      // Add period params
      if (filters.periodo && filters.periodo !== 'personalizado') {
        params.set('periodo', filters.periodo)
      }
      if (filters.dataInicio) {
        params.set('dataInicio', filters.dataInicio)
      }
      if (filters.dataFim) {
        params.set('dataFim', filters.dataFim)
      }

      // Add custom filter params (anything not periodo/dataInicio/dataFim)
      for (const [key, value] of Object.entries(filters)) {
        if (value && key !== 'periodo' && key !== 'dataInicio' && key !== 'dataFim') {
          params.set(key, value)
        }
      }

      const res = await fetch(`${endpoint}?${params.toString()}`)
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Erro ao carregar relatório' }))
        throw new Error(errData.error || `Erro ${res.status}`)
      }

      const result = await res.json()
      setData(result)
      onDataLoaded?.(result)
    } catch (err) {
      console.error(`[useRelatorio] ${endpoint}:`, err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [endpoint, filters, onDataLoaded])

  // Fetch on mount and when filters are applied
  useEffect(() => {
    fetchData()
  }, [fetchData])

  const setFilter = useCallback((key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const applyFilters = useCallback(() => {
    fetchData()
  }, [fetchData])

  const refetch = useCallback(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    filters,
    setFilter,
    applyFilters,
    refetch,
  }
}
