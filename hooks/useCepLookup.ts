'use client'

import { useState, useCallback } from 'react'

interface CepData {
  logradouro: string
  bairro: string
  cidade: string
  estado: string
}

interface CepLookupResult {
  data: CepData | null
  error: string | null
}

interface UseCepLookupReturn {
  lookupCep: (cep: string) => Promise<CepLookupResult>
  loading: boolean
  error: string | null
  clearError: () => void
}

const cepCache = new Map<string, CepData>()

export function useCepLookup(): UseCepLookupReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lookupCep = useCallback(async (cep: string): Promise<CepLookupResult> => {
    const cepLimpo = cep.replace(/\D/g, '')
    if (cepLimpo.length !== 8) return { data: null, error: null }

    // Check cache first
    if (cepCache.has(cepLimpo)) {
      setError(null)
      return { data: cepCache.get(cepLimpo)!, error: null }
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/localizacao/cep?cep=${cepLimpo}`)
      const data = await response.json()

      if (data.error) {
        const errMsg = data.error
        setError(errMsg)
        return { data: null, error: errMsg }
      }

      const result: CepData = {
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.cidade || '',
        estado: data.estado || '',
      }

      // Cache the result
      cepCache.set(cepLimpo, result)

      return { data: result, error: null }
    } catch {
      const errMsg = 'Erro ao buscar CEP. Verifique sua conexão.'
      setError(errMsg)
      return { data: null, error: errMsg }
    } finally {
      setLoading(false)
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return { lookupCep, loading, error, clearError }
}
