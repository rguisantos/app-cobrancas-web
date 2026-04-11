'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  Eye, 
  Edit, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Inbox,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { formatarMoeda } from '@/shared/types'
import { useState } from 'react'
import Header from '@/components/layout/header'

// ============================================================================
// TIPOS
// ============================================================================

interface Cobranca {
  id: string
  clienteId: string
  clienteNome: string
  produtoIdentificador: string
  locacaoId: string
  dataInicio: string | Date
  dataFim: string | Date
  relogioAnterior: number
  relogioAtual: number
  fichasRodadas: number
  totalClientePaga: number
  valorRecebido: number
  saldoDevedorGerado: number
  status: string
  createdAt: string | Date
  podeEditar?: boolean
}

interface CobrancasClientProps {
  cobrancas: Cobranca[]
  total: number
  page: number
  limit: number
  totalRecebido: number
  totalSaldoDevedor: number
  statusFilter?: string
  buscaFilter?: string
}

// ============================================================================
// CONFIGURAÇÃO DE STATUS
// ============================================================================

const statusConfig: Record<string, {
  bg: string
  text: string
  border: string
  icon: typeof CheckCircle
  iconColor: string
}> = {
  Pago: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: CheckCircle,
    iconColor: 'text-emerald-500',
  },
  Parcial: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: Clock,
    iconColor: 'text-amber-500',
  },
  Pendente: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: Clock,
    iconColor: 'text-blue-500',
  },
  Atrasado: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: AlertTriangle,
    iconColor: 'text-red-500',
  },
}

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: XCircle,
    iconColor: 'text-slate-500',
  }
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}>
      <Icon className={`w-3.5 h-3.5 ${config.iconColor}`} />
      {status}
    </span>
  )
}

// ============================================================================
// COMPONENTE DE CARD PARA MOBILE
// ============================================================================

function CobrancaCard({ cobranca }: { cobranca: Cobranca }) {
  const iniciais = cobranca.clienteNome?.charAt(0)?.toUpperCase() ?? '?'
  
  // Cor baseada no status
  const getGradientColor = () => {
    switch (cobranca.status) {
      case 'Pago': return 'from-emerald-500 to-emerald-600'
      case 'Parcial': return 'from-amber-500 to-amber-600'
      case 'Pendente': return 'from-blue-500 to-blue-600'
      case 'Atrasado': return 'from-red-500 to-red-600'
      default: return 'from-slate-500 to-slate-600'
    }
  }

  return (
    <div className="card p-4 space-y-4">
      {/* Header com avatar e nome */}
      <div className="flex items-start gap-3">
        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getGradientColor()} flex items-center justify-center text-white font-semibold shadow-sm flex-shrink-0`}>
          {iniciais}
        </div>
        <div className="flex-1 min-w-0">
          <Link href={`/clientes/${cobranca.clienteId}`} className="font-semibold text-slate-900 hover:text-primary-600 transition-colors truncate block">
            {cobranca.clienteNome}
          </Link>
          <Link href={`/locacoes/${cobranca.locacaoId}`} className="text-sm text-slate-500 font-mono hover:text-primary-600">
            {cobranca.produtoIdentificador}
          </Link>
        </div>
        <StatusBadge status={cobranca.status} />
      </div>

      {/* Informações de período e relógio */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <div>
          <span className="text-slate-400">Período: </span>
          <span className="text-slate-600">
            {format(new Date(cobranca.dataInicio), 'dd/MM/yy', { locale: ptBR })} — {format(new Date(cobranca.dataFim), 'dd/MM/yy', { locale: ptBR })}
          </span>
        </div>
        <div>
          <span className="text-slate-400">Relógio: </span>
          <span className="font-mono text-slate-600">{cobranca.relogioAnterior} → {cobranca.relogioAtual}</span>
        </div>
      </div>

      {/* Valores */}
      <div className="flex items-end justify-between pt-2 border-t border-slate-100">
        <div>
          <p className="text-xs text-slate-400">Valor recebido</p>
          <p className="text-xl font-bold text-emerald-600">{formatarMoeda(cobranca.valorRecebido)}</p>
          {cobranca.saldoDevedorGerado > 0 && (
            <p className="text-xs text-red-500">
              Saldo: {formatarMoeda(cobranca.saldoDevedorGerado)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/cobrancas/${cobranca.id}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors text-sm font-medium"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Ver</span>
          </Link>
          {cobranca.podeEditar && (
            <Link
              href={`/cobrancas/${cobranca.id}/editar`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary-100 text-primary-600 hover:bg-primary-200 transition-colors text-sm font-medium"
            >
              <Edit className="w-4 h-4" />
              <span className="hidden sm:inline">Editar</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// COMPONENTE DE TABELA PARA DESKTOP
// ============================================================================

function CobrancasTable({ cobrancas }: { cobrancas: Cobranca[] }) {
  return (
    <div className="overflow-x-auto -webkit-overflow-scrolling-touch" style={{ WebkitOverflowScrolling: 'touch' }}>
      <table className="w-full text-sm min-w-[800px]">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Cliente</th>
            <th className="text-left font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Produto</th>
            <th className="text-left font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Período</th>
            <th className="text-right font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Relógio</th>
            <th className="text-right font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Total</th>
            <th className="text-right font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Recebido</th>
            <th className="text-center font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Status</th>
            <th className="text-center font-medium text-slate-500 px-4 py-3 whitespace-nowrap">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {cobrancas.map(c => (
            <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${
                    c.status === 'Pago' ? 'from-emerald-500 to-emerald-600' :
                    c.status === 'Parcial' ? 'from-amber-500 to-amber-600' :
                    c.status === 'Atrasado' ? 'from-red-500 to-red-600' :
                    'from-blue-500 to-blue-600'
                  } flex items-center justify-center text-sm font-semibold text-white shadow-sm flex-shrink-0`}>
                    {c.clienteNome?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                  <Link href={`/clientes/${c.clienteId}`} className="font-medium text-slate-900 hover:text-primary-600 truncate max-w-[160px]">
                    {c.clienteNome}
                  </Link>
                </div>
              </td>
              <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                <Link href={`/locacoes/${c.locacaoId}`} className="hover:text-primary-600">
                  {c.produtoIdentificador}
                </Link>
              </td>
              <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                {format(new Date(c.dataInicio), 'dd/MM/yy', { locale: ptBR })} — {format(new Date(c.dataFim), 'dd/MM/yy', { locale: ptBR })}
              </td>
              <td className="px-4 py-3 text-right font-mono text-slate-600 text-xs whitespace-nowrap">
                {c.relogioAnterior} → {c.relogioAtual}
              </td>
              <td className="px-4 py-3 text-right text-slate-600">{formatarMoeda(c.totalClientePaga)}</td>
              <td className="px-4 py-3 text-right">
                <span className="font-bold text-emerald-600">{formatarMoeda(c.valorRecebido)}</span>
                {c.saldoDevedorGerado > 0 && (
                  <p className="text-xs text-red-500">Saldo: {formatarMoeda(c.saldoDevedorGerado)}</p>
                )}
              </td>
              <td className="px-4 py-3 text-center"><StatusBadge status={c.status} /></td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-center gap-1">
                  <Link 
                    href={`/cobrancas/${c.id}`}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-primary-600 transition-colors"
                    title="Ver detalhes"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                  {c.podeEditar && (
                    <Link 
                      href={`/cobrancas/${c.id}/editar`}
                      className="p-2 rounded-lg hover:bg-primary-50 text-slate-500 hover:text-primary-600 transition-colors"
                      title="Editar (última cobrança)"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function CobrancasClient({
  cobrancas,
  total,
  page,
  limit,
  totalRecebido,
  totalSaldoDevedor,
  statusFilter,
  buscaFilter,
}: CobrancasClientProps) {
  const [busca, setBusca] = useState(buscaFilter || '')
  const [status, setStatus] = useState(statusFilter || '')

  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      <Header
        title="Cobranças"
        subtitle={`${total} registro${total !== 1 ? 's' : ''}`}
        actions={<Link href="/cobrancas/nova" className="btn-primary text-sm">+ Nova Cobrança</Link>}
      />

      {/* Resumo totalizadores */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6">
        <div className="card p-4 md:p-5 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-200">
              <DollarSign className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-emerald-700 font-medium">Total Recebido</p>
              <p className="text-lg md:text-2xl font-bold text-emerald-800">{formatarMoeda(totalRecebido)}</p>
            </div>
          </div>
        </div>
        <div className="card p-4 md:p-5 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-200">
              <AlertTriangle className="w-5 h-5 text-red-700" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-red-700 font-medium">Saldo Devedor</p>
              <p className="text-lg md:text-2xl font-bold text-red-800">{formatarMoeda(totalSaldoDevedor)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <form className="card p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="label text-xs flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5" />
            Buscar
          </label>
          <input
            name="busca"
            className="input text-sm"
            placeholder="Cliente ou produto..."
            defaultValue={buscaFilter}
          />
        </div>
        <div className="w-36 md:w-44">
          <label className="label text-xs flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            Status
          </label>
          <select name="status" className="input text-sm" defaultValue={statusFilter}>
            <option value="">Todos</option>
            <option value="Pago">Pago</option>
            <option value="Parcial">Parcial</option>
            <option value="Pendente">Pendente</option>
            <option value="Atrasado">Atrasado</option>
          </select>
        </div>
        <button type="submit" className="btn-primary text-sm py-2.5 px-4">Filtrar</button>
        <Link href="/cobrancas" className="btn-secondary text-sm py-2.5 px-4 hidden sm:inline-flex">Limpar</Link>
      </form>

      {/* Conteúdo */}
      {cobrancas.length === 0 ? (
        <div className="card">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
              <Inbox className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Nenhuma cobrança encontrada
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mb-6">
              {buscaFilter || statusFilter
                ? 'Tente ajustar os filtros para encontrar o que procura.'
                : 'As cobranças aparecerão aqui assim que forem registradas no sistema.'}
            </p>
            <Link href="/cobrancas/nova" className="btn-primary">
              + Nova Cobrança
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Cards em mobile, tabela em desktop */}
          <div className="block lg:hidden space-y-3">
            {cobrancas.map(c => (
              <CobrancaCard key={c.id} cobranca={c} />
            ))}
          </div>
          
          <div className="hidden lg:block card overflow-hidden">
            <CobrancasTable cobrancas={cobrancas} />
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-slate-500">
                Mostrando {(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`?page=${page - 1}&status=${statusFilter || ''}&busca=${buscaFilter || ''}`}
                    className="btn-secondary py-2 px-3 text-sm flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`?page=${page + 1}&status=${statusFilter || ''}&busca=${buscaFilter || ''}`}
                    className="btn-secondary py-2 px-3 text-sm flex items-center gap-1"
                  >
                    Próxima
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Indicador de scroll para mobile */}
          <p className="text-xs text-slate-400 mt-3 lg:hidden text-center">
            Role para ver mais cobranças
          </p>
        </>
      )}
    </div>
  )
}
