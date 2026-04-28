'use client'

import { TrendingUp, TrendingDown, Clock, DollarSign, Calendar, Percent, Hash } from 'lucide-react'

// ============================================================================
// TIPOS & CONSTANTES
// ============================================================================

export type FormaPagamento = 'PercentualReceber' | 'PercentualPagar' | 'Periodo'

export const FORMA_OPTS = [
  { value: 'PercentualReceber' as const, label: '% Receber', icon: TrendingUp, color: 'emerald' },
  { value: 'PercentualPagar' as const, label: '% Pagar', icon: TrendingDown, color: 'rose' },
  { value: 'Periodo' as const, label: 'Período', icon: Clock, color: 'blue' },
]

export const PERIODICIDADES = ['Mensal', 'Semanal', 'Quinzenal', 'Diária']

export interface LocacaoPagamentoFormData {
  formaPagamento: FormaPagamento
  precoFicha: string
  percentualEmpresa: string
  periodicidade: string
  valorFixo: string
  dataPrimeiraCobranca: string
  numeroRelogio: string
}

interface LocacaoPagamentoFormProps {
  formData: LocacaoPagamentoFormData
  errors: Record<string, string>
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  disabled?: boolean
  showNumeroRelogio?: boolean
}

// ============================================================================
// COLOR HELPERS
// ============================================================================

const colorClasses: Record<string, { selected: string }> = {
  emerald: { selected: 'border-emerald-500 bg-emerald-50 text-emerald-700' },
  rose:    { selected: 'border-rose-500 bg-rose-50 text-rose-700' },
  blue:    { selected: 'border-blue-500 bg-blue-50 text-blue-700' },
}

// ============================================================================
// COMPONENTE
// ============================================================================

export function LocacaoPagamentoForm({
  formData,
  errors,
  onChange,
  disabled = false,
  showNumeroRelogio = true,
}: LocacaoPagamentoFormProps) {
  const percentualCliente = Math.max(0, 100 - (parseFloat(formData.percentualEmpresa) || 0))

  return (
    <div className="p-4 md:p-6">
      {/* Forma de pagamento selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {FORMA_OPTS.map(opt => {
          const Icon = opt.icon
          const isSelected = formData.formaPagamento === opt.value
          return (
            <label
              key={opt.value}
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                isSelected
                  ? colorClasses[opt.color].selected
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              } ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
            >
              <input
                type="radio"
                name="formaPagamento"
                value={opt.value}
                checked={isSelected}
                onChange={onChange}
                disabled={disabled}
                className="sr-only"
              />
              <Icon className="w-5 h-5" />
              <span className="font-medium text-sm">{opt.label}</span>
            </label>
          )
        })}
      </div>

      {/* Número do Relógio */}
      {showNumeroRelogio && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Número do Relógio <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              name="numeroRelogio"
              value={formData.numeroRelogio}
              onChange={onChange}
              disabled={disabled}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all font-mono disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="Leitura do relógio"
            />
          </div>
          {errors.numeroRelogio && (
            <p className="text-red-500 text-xs mt-1">{errors.numeroRelogio}</p>
          )}
        </div>
      )}

      {/* Conditional fields based on formaPagamento */}
      {formData.formaPagamento !== 'Periodo' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Preço da Ficha (R$) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
                <input
                  type="number"
                  step="0.01"
                  name="precoFicha"
                  value={formData.precoFicha}
                  onChange={onChange}
                  disabled={disabled}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder="3,00"
                />
              </div>
              {errors.precoFicha && (
                <p className="text-red-500 text-xs mt-1">{errors.precoFicha}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                % Empresa <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="percentualEmpresa"
                  value={formData.percentualEmpresa}
                  onChange={onChange}
                  disabled={disabled}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder="50"
                  min="0"
                  max="100"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
              </div>
              {errors.percentualEmpresa && (
                <p className="text-red-500 text-xs mt-1">{errors.percentualEmpresa}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">% Cliente (automático)</label>
              <div className="relative">
                <input
                  value={`${percentualCliente}%`}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600"
                  disabled
                />
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Periodicidade <span className="text-red-500">*</span>
            </label>
            <select
              name="periodicidade"
              value={formData.periodicidade}
              onChange={onChange}
              disabled={disabled}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white disabled:bg-slate-50 disabled:text-slate-500"
            >
              <option value="">Selecione</option>
              {PERIODICIDADES.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {errors.periodicidade && (
              <p className="text-red-500 text-xs mt-1">{errors.periodicidade}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Valor Fixo (R$) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
              <input
                type="number"
                step="0.01"
                name="valorFixo"
                value={formData.valorFixo}
                onChange={onChange}
                disabled={disabled}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="150,00"
              />
            </div>
            {errors.valorFixo && (
              <p className="text-red-500 text-xs mt-1">{errors.valorFixo}</p>
            )}
          </div>
        </div>
      )}

      {/* Data Primeira Cobrança - always visible */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Data Primeira Cobrança</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="date"
              name="dataPrimeiraCobranca"
              value={formData.dataPrimeiraCobranca}
              onChange={onChange}
              disabled={disabled}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
