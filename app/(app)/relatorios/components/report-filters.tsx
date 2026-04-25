'use client'
import { useState } from 'react'
import { Calendar, Download, Filter } from 'lucide-react'

export interface FilterOption {
  value: string
  label: string
}

export interface FilterConfig {
  key: string
  label: string
  type: 'select' | 'date'
  options?: FilterOption[]
}

interface ReportFiltersProps {
  filters: FilterConfig[]
  values: Record<string, string>
  onFilterChange: (key: string, value: string) => void
  onExportCSV?: () => void
  onApply?: () => void
}

const PERIOD_OPTIONS = [
  { value: 'mes', label: 'Este mês' },
  { value: 'trimestre', label: 'Último trimestre' },
  { value: 'semestre', label: 'Último semestre' },
  { value: 'ano', label: 'Este ano' },
  { value: 'personalizado', label: 'Personalizado' },
]

export function ReportFilters({ filters, values, onFilterChange, onExportCSV, onApply }: ReportFiltersProps) {
  const [showCustom, setShowCustom] = useState(values.periodo === 'personalizado')

  const handlePeriodChange = (periodo: string) => {
    setShowCustom(periodo === 'personalizado')
    onFilterChange('periodo', periodo)
    if (periodo !== 'personalizado' && onApply) onApply()
  }

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <Calendar className="w-4 h-4" /> Período:
          </div>
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => handlePeriodChange(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  values.periodo === opt.value ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {onExportCSV && (
          <button onClick={onExportCSV}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        )}
      </div>

      {showCustom && (
        <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-slate-200">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Data Início</label>
            <input type="date" value={values.dataInicio || ''} onChange={e => onFilterChange('dataInicio', e.target.value)} className="input text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Data Fim</label>
            <input type="date" value={values.dataFim || ''} onChange={e => onFilterChange('dataFim', e.target.value)} className="input text-sm" />
          </div>
          {onApply && <button onClick={onApply} className="btn-primary text-sm mt-5">Aplicar</button>}
        </div>
      )}

      {filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <Filter className="w-4 h-4" /> Filtros:
          </div>
          {filters.map(f => (
            <div key={f.key} className="flex items-center gap-2">
              <label className="text-xs text-slate-500">{f.label}:</label>
              {f.type === 'select' ? (
                <select value={values[f.key] || ''} onChange={e => onFilterChange(f.key, e.target.value)} className="input text-sm w-auto">
                  {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input type="date" value={values[f.key] || ''} onChange={e => onFilterChange(f.key, e.target.value)} className="input text-sm" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
