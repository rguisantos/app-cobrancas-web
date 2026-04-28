'use client'

import { useState, useCallback } from 'react'
import type { FormaPagamento } from '@/app/(app)/locacoes/components/LocacaoPagamentoForm'

// ============================================================================
// TIPOS
// ============================================================================

export interface LocacaoFormState {
  clienteId: string
  produtoId: string
  produtoIdentificador: string
  produtoTipo: string
  numeroRelogio: string
  dataLocacao: string
  formaPagamento: FormaPagamento
  precoFicha: string
  percentualEmpresa: string
  periodicidade: string
  valorFixo: string
  dataPrimeiraCobranca: string
  trocaPano: boolean
  observacao: string
}

export interface LocacaoFormErrors {
  [key: string]: string
}

interface UseLocacaoFormOptions {
  initialData?: Partial<LocacaoFormState>
  /** If true, cliente and produto fields are not editable (e.g. relocar page) */
  lockClienteProduto?: boolean
}

interface UseLocacaoFormReturn {
  formData: LocacaoFormState
  setFormData: React.Dispatch<React.SetStateAction<LocacaoFormState>>
  errors: LocacaoFormErrors
  setErrors: React.Dispatch<React.SetStateAction<LocacaoFormErrors>>
  loading: boolean
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
  setFieldValue: (field: keyof LocacaoFormState, value: any) => void
  validate: () => boolean
  getPercentualCliente: () => number
  getSubmitPayload: (extraFields?: Record<string, any>) => Record<string, any>
  clearErrors: () => void
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const defaultFormState: LocacaoFormState = {
  clienteId: '',
  produtoId: '',
  produtoIdentificador: '',
  produtoTipo: '',
  numeroRelogio: '',
  dataLocacao: new Date().toISOString().split('T')[0],
  formaPagamento: 'PercentualReceber',
  precoFicha: '',
  percentualEmpresa: '50',
  periodicidade: '',
  valorFixo: '',
  dataPrimeiraCobranca: '',
  trocaPano: false,
  observacao: '',
}

// ============================================================================
// HOOK
// ============================================================================

export function useLocacaoForm(options: UseLocacaoFormOptions = {}): UseLocacaoFormReturn {
  const { initialData } = options

  const [formData, setFormData] = useState<LocacaoFormState>({
    ...defaultFormState,
    ...initialData,
  })
  const [errors, setErrors] = useState<LocacaoFormErrors>({})
  const [loading, setLoading] = useState(false)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target
      const checked = (e.target as HTMLInputElement).checked

      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }))
      // Clear error for this field
      setErrors(prev => {
        if (prev[name]) {
          const { [name]: _, ...rest } = prev
          return rest
        }
        return prev
      })
    },
    []
  )

  const setFieldValue = useCallback((field: keyof LocacaoFormState, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setErrors(prev => {
      if (prev[field]) {
        const { [field]: _, ...rest } = prev
        return rest
      }
      return prev
    })
  }, [])

  const getPercentualCliente = useCallback(() => {
    return Math.max(0, 100 - (parseFloat(formData.percentualEmpresa) || 0))
  }, [formData.percentualEmpresa])

  const validate = useCallback((): boolean => {
    const newErrors: LocacaoFormErrors = {}

    // Numero relogio is always required when visible
    if (!formData.numeroRelogio.trim()) {
      newErrors.numeroRelogio = 'Informe o número do relógio'
    }

    if (formData.formaPagamento !== 'Periodo') {
      // Percentual-based validation
      if (!formData.precoFicha || parseFloat(formData.precoFicha) <= 0) {
        newErrors.precoFicha = 'Informe o preço da ficha'
      }
      const pct = parseFloat(formData.percentualEmpresa)
      if (isNaN(pct) || pct < 0 || pct > 100) {
        newErrors.percentualEmpresa = 'Percentual deve ser entre 0 e 100'
      }
    } else {
      // Periodo-based validation
      if (!formData.valorFixo || parseFloat(formData.valorFixo) <= 0) {
        newErrors.valorFixo = 'Informe o valor fixo'
      }
      if (!formData.periodicidade) {
        newErrors.periodicidade = 'Selecione a periodicidade'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const getSubmitPayload = useCallback(
    (extraFields?: Record<string, any>): Record<string, any> => {
      const percentualCliente = getPercentualCliente()

      return {
        formaPagamento: formData.formaPagamento,
        numeroRelogio: formData.numeroRelogio,
        precoFicha: parseFloat(formData.precoFicha) || 0,
        percentualEmpresa: parseFloat(formData.percentualEmpresa) || 50,
        percentualCliente,
        periodicidade: formData.periodicidade || null,
        valorFixo: formData.valorFixo ? parseFloat(formData.valorFixo) : null,
        dataPrimeiraCobranca: formData.dataPrimeiraCobranca || null,
        trocaPano: formData.trocaPano,
        observacao: formData.observacao || null,
        ...extraFields,
      }
    },
    [formData, getPercentualCliente]
  )

  const clearErrors = useCallback(() => setErrors({}), [])

  return {
    formData,
    setFormData,
    errors,
    setErrors,
    loading,
    setLoading,
    handleChange,
    setFieldValue,
    validate,
    getPercentualCliente,
    getSubmitPayload,
    clearErrors,
  }
}
