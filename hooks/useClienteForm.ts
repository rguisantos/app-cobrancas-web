'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCepLookup } from './useCepLookup'
import { formatCPF, formatCNPJ, formatPhone, formatRG, formatCEP, unmask } from '@/lib/utils/masks'
import type { TipoPessoa } from '@cobrancas/shared'

// Types for the supporting data
export interface RotaOption {
  id: string
  descricao: string
}

export interface EstadoOption {
  id: number
  sigla: string
  nome: string
}

export interface CidadeOption {
  id: number
  nome: string
}

export interface ContatoForm {
  id: string
  nome: string
  telefone: string
  whatsapp: boolean
  principal: boolean
}

export interface ClienteFormData {
  tipoPessoa: TipoPessoa
  nomeExibicao: string
  nomeCompleto: string
  razaoSocial: string
  nomeFantasia: string
  cpf: string
  cnpj: string
  rg: string
  inscricaoEstadual: string
  email: string
  telefonePrincipal: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
  rotaId: string
  observacao: string
  status: string
  latitude: number | null
  longitude: number | null
}

interface UseClienteFormOptions {
  clienteId?: string  // If provided, loads existing cliente data for editing
}

interface UseClienteFormReturn {
  formData: ClienteFormData
  setFormData: React.Dispatch<React.SetStateAction<ClienteFormData>>
  contatos: ContatoForm[]
  errors: Record<string, string>
  rotas: RotaOption[]
  estados: EstadoOption[]
  cidades: CidadeOption[]
  loading: boolean
  loadingData: boolean  // true while loading existing cliente for edit
  loadingCidades: boolean
  loadingGps: boolean
  gpsCaptured: boolean
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
  handleCepChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  adicionarContato: () => void
  removerContato: (id: string) => void
  atualizarContato: (id: string, field: keyof ContatoForm, value: string | boolean) => void
  handleCapturarLocalizacao: () => void
  getIdentificador: () => string
  setFieldError: (field: string, message: string) => void
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
  clearErrors: () => void
}

const initialFormData: ClienteFormData = {
  tipoPessoa: 'Fisica',
  nomeExibicao: '',
  nomeCompleto: '',
  razaoSocial: '',
  nomeFantasia: '',
  cpf: '',
  cnpj: '',
  rg: '',
  inscricaoEstadual: '',
  email: '',
  telefonePrincipal: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  rotaId: '',
  observacao: '',
  status: 'Ativo',
  latitude: null,
  longitude: null,
}

export function useClienteForm(options: UseClienteFormOptions = {}): UseClienteFormReturn {
  const { clienteId } = options
  const { lookupCep } = useCepLookup()

  const [formData, setFormData] = useState<ClienteFormData>(initialFormData)
  const [contatos, setContatos] = useState<ContatoForm[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(!!clienteId)
  const [loadingCidades, setLoadingCidades] = useState(false)
  const [loadingGps, setLoadingGps] = useState(false)
  const [gpsCaptured, setGpsCaptured] = useState(false)

  const [rotas, setRotas] = useState<RotaOption[]>([])
  const [estados, setEstados] = useState<EstadoOption[]>([])
  const [cidades, setCidades] = useState<CidadeOption[]>([])

  // Fetch cities for a given UF
  const fetchCidades = useCallback(async (uf: string) => {
    setLoadingCidades(true)
    try {
      const data = await fetch(`/api/localizacao/cidades?uf=${uf}`).then(res => res.json())
      setCidades(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingCidades(false)
    }
  }, [])

  // Clear cities when UF is empty
  const clearCidades = useCallback(() => {
    setCidades([])
  }, [])

  // Load supporting data (rotas, estados) and optionally existing cliente
  useEffect(() => {
    const promises: Promise<any>[] = [
      fetch('/api/rotas?status=Ativo').then(res => res.json()),
      fetch('/api/localizacao/estados').then(res => res.json()),
    ]

    if (clienteId) {
      promises.push(fetch(`/api/clientes/${clienteId}`).then(res => res.json()))
    }

    Promise.all(promises)
      .then(async (results) => {
        setRotas(results[0])
        setEstados(results[1])

        // If editing, populate form with existing data
        if (clienteId && results[2]) {
          const c = results[2]
          const estadoSigla = c.estado || ''

          setFormData({
            tipoPessoa: c.tipoPessoa || 'Fisica',
            nomeExibicao: c.nomeExibicao || '',
            nomeCompleto: c.nomeCompleto || '',
            razaoSocial: c.razaoSocial || '',
            nomeFantasia: c.nomeFantasia || '',
            cpf: c.cpf || '',
            cnpj: c.cnpj || '',
            rg: c.rg || '',
            inscricaoEstadual: c.inscricaoEstadual || '',
            email: c.email || '',
            telefonePrincipal: c.telefonePrincipal || '',
            cep: c.cep || '',
            logradouro: c.logradouro || '',
            numero: c.numero || '',
            complemento: c.complemento || '',
            bairro: c.bairro || '',
            cidade: c.cidade || '',
            estado: estadoSigla,
            rotaId: c.rotaId || '',
            observacao: c.observacao || '',
            status: c.status || 'Ativo',
            latitude: c.latitude || null,
            longitude: c.longitude || null,
          })

          if (c.latitude && c.longitude) {
            setGpsCaptured(true)
          }

          if (c.contatos && Array.isArray(c.contatos)) {
            setContatos(c.contatos.map((ct: any, idx: number) => ({
              id: ct.id || `contato_${idx}`,
              nome: ct.nome || '',
              telefone: ct.telefone || '',
              whatsapp: ct.whatsapp || false,
              principal: ct.principal || false,
            })))
          }

          // Load cities for the existing cliente's estado
          if (estadoSigla) {
            const cidadesData = await fetch(`/api/localizacao/cidades?uf=${estadoSigla}`).then(res => res.json())
            setCidades(cidadesData)
          }
        }

        setLoadingData(false)
      })
      .catch((err) => {
        console.error('Erro ao carregar dados:', err)
        setLoadingData(false)
      })
  }, [clienteId])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    let formattedValue = value

    // Apply masks
    if (name === 'cpf') formattedValue = formatCPF(value)
    else if (name === 'cnpj') formattedValue = formatCNPJ(value)
    else if (name === 'telefonePrincipal') formattedValue = formatPhone(value)
    else if (name === 'rg') formattedValue = formatRG(value)

    setFormData(prev => ({ ...prev, [name]: formattedValue }))
    setErrors(prev => ({ ...prev, [name]: '' }))

    // When estado changes, load cities for that estado
    if (name === 'estado') {
      if (value) {
        fetchCidades(value)
      } else {
        clearCidades()
      }
      // Also clear cidade when estado changes
      setFormData(prev => ({ ...prev, cidade: '' }))
    }
  }, [fetchCidades, clearCidades])

  const handleCepChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const formatted = formatCEP(value)

    setFormData(prev => ({ ...prev, cep: formatted }))
    setErrors(prev => ({ ...prev, cep: '' }))

    const digits = unmask(formatted)
    if (digits.length === 8) {
      lookupCep(formatted).then(({ data, error }) => {
        if (data) {
          setFormData(prev => ({
            ...prev,
            logradouro: data.logradouro || prev.logradouro,
            bairro: data.bairro || prev.bairro,
            cidade: data.cidade || prev.cidade,
            estado: data.estado || prev.estado,
          }))

          // Also load cities for the estado returned by CEP lookup
          if (data.estado) {
            fetchCidades(data.estado)
          }
        }
        if (error) {
          setErrors(prev => ({ ...prev, cep: error }))
        }
      })
    }
  }, [lookupCep, fetchCidades])

  const adicionarContato = useCallback(() => {
    setContatos(prev => [
      ...prev,
      {
        id: `contato_${Date.now()}`,
        nome: '',
        telefone: '',
        whatsapp: false,
        principal: false,
      }
    ])
  }, [])

  const removerContato = useCallback((id: string) => {
    setContatos(prev => prev.filter(c => c.id !== id))
  }, [])

  const atualizarContato = useCallback((id: string, field: keyof ContatoForm, value: string | boolean) => {
    let formattedValue = value
    if (field === 'telefone') {
      formattedValue = formatPhone(value as string)
    }
    setContatos(prev =>
      prev.map(c =>
        c.id === id ? { ...c, [field]: formattedValue } : c
      )
    )
  }, [])

  const handleCapturarLocalizacao = useCallback(() => {
    if (!navigator.geolocation) {
      setErrors(prev => ({ ...prev, gps: 'Geolocalização não suportada pelo navegador' }))
      return
    }
    setLoadingGps(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }))
        setGpsCaptured(true)
        setLoadingGps(false)
        setErrors(prev => {
          const { gps, ...rest } = prev
          return rest
        })
      },
      (error) => {
        let msg = 'Não foi possível obter sua localização.'
        if (error.code === 1) msg = 'Permissão de localização negada. Habilite nas configurações do navegador.'
        else if (error.code === 2) msg = 'Localização indisponível. Verifique se o GPS está ativo.'
        else if (error.code === 3) msg = 'Tempo esgotado ao buscar localização. Tente novamente.'
        setErrors(prev => ({ ...prev, gps: msg }))
        setLoadingGps(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }, [])

  const getIdentificador = useCallback(() => {
    const documento = formData.tipoPessoa === 'Fisica' ? formData.cpf : formData.cnpj
    return unmask(documento)
  }, [formData.tipoPessoa, formData.cpf, formData.cnpj])

  const setFieldError = useCallback((field: string, message: string) => {
    setErrors(prev => ({ ...prev, [field]: message }))
  }, [])

  const clearErrors = useCallback(() => setErrors({}), [])

  return {
    formData,
    setFormData,
    contatos,
    errors,
    rotas,
    estados,
    cidades,
    loading,
    loadingData,
    loadingCidades,
    loadingGps,
    gpsCaptured,
    handleChange,
    handleCepChange,
    adicionarContato,
    removerContato,
    atualizarContato,
    handleCapturarLocalizacao,
    getIdentificador,
    setFieldError,
    setErrors,
    clearErrors,
  }
}
