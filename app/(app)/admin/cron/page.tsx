'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/header'
import Badge from '@/components/ui/badge'
import {
  Clock,
  AlertTriangle,
  Play,
  CheckCircle2,
  Loader2,
  CalendarCheck,
  DollarSign,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Zap,
  FileText,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ===================== Tipos =====================

interface CobrancaVencida {
  id: string
  clienteNome: string
  produtoIdentificador: string
  dataVencimento: string | null
  totalClientePaga: number
}

interface LocacaoPreview {
  locacaoId: string
  clienteNome: string
  produtoIdentificador: string
  periodicidade: string
  dataInicio: string
  dataFim: string
  dataVencimento: string
  valorFixo: number
  jaExiste: boolean
}

interface VencimentoResult {
  success: boolean
  updated: number
  message: string
  cobrancas: CobrancaVencida[]
}

interface GerarCobrancasResult {
  success: boolean
  generated: number
  totalLocacoes: number
  message: string
  cobrancas: Array<{
    locacaoId: string
    clienteNome: string
    produtoIdentificador: string
    periodicidade: string
    dataInicio: string
    dataFim: string
    valorFixo: number
  }>
}

// ===================== Componente Principal =====================

export default function CronPage() {
  const { data: session, status } = useSession()
  const isAdmin = session?.user?.tipoPermissao === 'Administrador'

  // Estado de vencimento
  const [vencimentoPreview, setVencimentoPreview] = useState<CobrancaVencida[]>([])
  const [vencimentoLoading, setVencimentoLoading] = useState(false)
  const [vencimentoResult, setVencimentoResult] = useState<VencimentoResult | null>(null)
  const [vencimentoPreviewLoading, setVencimentoPreviewLoading] = useState(false)

  // Estado de gerar cobranças
  const [gerarPreview, setGerarPreview] = useState<LocacaoPreview[]>([])
  const [gerarLoading, setGerarLoading] = useState(false)
  const [gerarResult, setGerarResult] = useState<GerarCobrancasResult | null>(null)
  const [gerarPreviewLoading, setGerarPreviewLoading] = useState(false)

  // Expandir/colapsar listas
  const [showVencimentoList, setShowVencimentoList] = useState(false)
  const [showGerarList, setShowGerarList] = useState(false)

  // Estatísticas rápidas
  const [stats, setStats] = useState({
    pendentes: 0,
    atrasadas: 0,
    locacoesAtivas: 0,
  })
  const [statsLoading, setStatsLoading] = useState(true)

  // Última execução
  const [lastRun, setLastRun] = useState<{
    vencimento: string | null
    gerarCobrancas: string | null
  }>({ vencimento: null, gerarCobrancas: null })

  // Carregar stats
  const loadStats = useCallback(async () => {
    try {
      const [cobRes, locRes] = await Promise.all([
        fetch('/api/cobrancas?limit=1&status=Pendente'),
        fetch('/api/locacoes?limit=1&status=Ativa'),
      ])
      const cobData = await cobRes.json()
      const locData = await locRes.json()

      // Buscar atrasadas
      const atrRes = await fetch('/api/cobrancas?limit=1&status=Atrasado')
      const atrData = await atrRes.json()

      setStats({
        pendentes: cobData.total || 0,
        atrasadas: atrData.total || 0,
        locacoesAtivas: locData.total || 0,
      })
    } catch {
      // Silencioso
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  // Redirect se não for admin
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    )
  }

  if (!isAdmin) {
    redirect('/dashboard')
    return null
  }

  // ===== Ações =====

  async function carregarPreviewVencimento() {
    setVencimentoPreviewLoading(true)
    setVencimentoResult(null)
    try {
      const res = await fetch('/api/cron/vencimento')
      const data = await res.json()
      if (res.ok) {
        setVencimentoPreview(data.cobrancas || [])
      }
    } catch {
      // Silencioso
    } finally {
      setVencimentoPreviewLoading(false)
    }
  }

  async function executarVencimento() {
    setVencimentoLoading(true)
    setVencimentoResult(null)
    try {
      const res = await fetch('/api/cron/vencimento', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setVencimentoResult(data)
        setLastRun(prev => ({ ...prev, vencimento: new Date().toISOString() }))
        loadStats()
        // Atualizar preview
        carregarPreviewVencimento()
      } else {
        setVencimentoResult({ success: false, updated: 0, message: data.error || 'Erro ao executar', cobrancas: [] })
      }
    } catch {
      setVencimentoResult({ success: false, updated: 0, message: 'Erro de conexão', cobrancas: [] })
    } finally {
      setVencimentoLoading(false)
    }
  }

  async function carregarPreviewGerar() {
    setGerarPreviewLoading(true)
    setGerarResult(null)
    try {
      const res = await fetch('/api/cron/gerar-cobrancas')
      const data = await res.json()
      if (res.ok) {
        setGerarPreview(data.locacoes || [])
      }
    } catch {
      // Silencioso
    } finally {
      setGerarPreviewLoading(false)
    }
  }

  async function executarGerarCobrancas() {
    setGerarLoading(true)
    setGerarResult(null)
    try {
      const res = await fetch('/api/cron/gerar-cobrancas', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setGerarResult(data)
        setLastRun(prev => ({ ...prev, gerarCobrancas: new Date().toISOString() }))
        loadStats()
        carregarPreviewGerar()
      } else {
        setGerarResult({ success: false, generated: 0, totalLocacoes: 0, message: data.error || 'Erro ao executar', cobrancas: [] })
      }
    } catch {
      setGerarResult({ success: false, generated: 0, totalLocacoes: 0, message: 'Erro de conexão', cobrancas: [] })
    } finally {
      setGerarLoading(false)
    }
  }

  function formatarMoeda(valor: number) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  function formatarDataBR(dataStr: string | null) {
    if (!dataStr) return '—'
    try {
      return format(parseISO(dataStr), 'dd/MM/yyyy', { locale: ptBR })
    } catch {
      return dataStr
    }
  }

  function formatarTimestamp(isoStr: string | null) {
    if (!isoStr) return '—'
    try {
      return format(parseISO(isoStr), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })
    } catch {
      return isoStr
    }
  }

  // ===================== Render =====================

  return (
    <div>
      <Header
        title="Automação"
        subtitle="Gerencie tarefas automáticas de vencimento e geração de cobranças"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {statsLoading ? '—' : stats.pendentes}
              </p>
              <p className="text-xs text-slate-500">Pendentes</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {statsLoading ? '—' : stats.atrasadas}
              </p>
              <p className="text-xs text-slate-500">Atrasadas</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {statsLoading ? '—' : stats.locacoesAtivas}
              </p>
              <p className="text-xs text-slate-500">Locações Ativas</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">2</p>
              <p className="text-xs text-slate-500">Tarefas Auto</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Ação */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ====== Verificar Vencimentos ====== */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <CalendarCheck className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Verificar Vencimentos</h2>
                <p className="text-xs text-slate-500">Marca cobranças pendentes como &quot;Atrasado&quot;</p>
              </div>
            </div>
          </div>

          {/* Última execução */}
          {lastRun.vencimento && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-500 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Última execução: {formatarTimestamp(lastRun.vencimento)}
            </div>
          )}

          {/* Resultado */}
          {vencimentoResult && (
            <div className={`mb-4 p-4 rounded-xl border ${
              vencimentoResult.success
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                {vencimentoResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p className={`font-medium text-sm ${
                    vencimentoResult.success ? 'text-emerald-800' : 'text-red-800'
                  }`}>
                    {vencimentoResult.message}
                  </p>
                  {vencimentoResult.success && vencimentoResult.updated > 0 && (
                    <p className="text-xs text-emerald-600 mt-1">
                      {vencimentoResult.updated} cobrança(s) atualizada(s) para &quot;Atrasado&quot;
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={executarVencimento}
              disabled={vencimentoLoading}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {vencimentoLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Executar Verificação
            </button>
            <button
              onClick={carregarPreviewVencimento}
              disabled={vencimentoPreviewLoading}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {vencimentoPreviewLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Preview
            </button>
          </div>

          {/* Preview de cobranças vencidas */}
          {vencimentoPreview.length > 0 && (
            <div>
              <button
                onClick={() => setShowVencimentoList(!showVencimentoList)}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors mb-2"
              >
                <DollarSign className="w-4 h-4" />
                <span>{vencimentoPreview.length} cobrança(s) vencida(s)</span>
                {showVencimentoList ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              {showVencimentoList && (
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="table-header py-2 px-3">Cliente</th>
                        <th className="table-header py-2 px-3">Produto</th>
                        <th className="table-header py-2 px-3">Vencimento</th>
                        <th className="table-header py-2 px-3 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vencimentoPreview.map((c, idx) => (
                        <tr key={c.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                          <td className="py-2 px-3 text-slate-700">{c.clienteNome}</td>
                          <td className="py-2 px-3 text-slate-600">{c.produtoIdentificador}</td>
                          <td className="py-2 px-3">
                            <Badge label={formatarDataBR(c.dataVencimento)} variant="red" size="sm" />
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-slate-900">
                            {formatarMoeda(c.totalClientePaga)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {vencimentoPreview.length === 0 && !vencimentoPreviewLoading && vencimentoResult === null && (
            <div className="text-center py-6 text-slate-400 text-sm">
              Clique em &quot;Preview&quot; para ver as cobranças que serão afetadas
            </div>
          )}
        </div>

        {/* ====== Gerar Cobranças ====== */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Gerar Cobranças Pendentes</h2>
                <p className="text-xs text-slate-500">Cria cobranças para locações ativas por período</p>
              </div>
            </div>
          </div>

          {/* Última execução */}
          {lastRun.gerarCobrancas && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-500 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Última execução: {formatarTimestamp(lastRun.gerarCobrancas)}
            </div>
          )}

          {/* Resultado */}
          {gerarResult && (
            <div className={`mb-4 p-4 rounded-xl border ${
              gerarResult.success
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                {gerarResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p className={`font-medium text-sm ${
                    gerarResult.success ? 'text-emerald-800' : 'text-red-800'
                  }`}>
                    {gerarResult.message}
                  </p>
                  {gerarResult.success && gerarResult.generated > 0 && (
                    <p className="text-xs text-emerald-600 mt-1">
                      {gerarResult.generated} cobrança(s) criada(s) de {gerarResult.totalLocacoes} locação(ões)
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={executarGerarCobrancas}
              disabled={gerarLoading}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {gerarLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Gerar Cobranças
            </button>
            <button
              onClick={carregarPreviewGerar}
              disabled={gerarPreviewLoading}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {gerarPreviewLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Preview
            </button>
          </div>

          {/* Preview de locações */}
          {gerarPreview.length > 0 && (
            <div>
              <button
                onClick={() => setShowGerarList(!showGerarList)}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors mb-2"
              >
                <FileText className="w-4 h-4" />
                <span>
                  {gerarPreview.filter(p => !p.jaExiste).length} a gerar,{' '}
                  {gerarPreview.filter(p => p.jaExiste).length} já existem
                </span>
                {showGerarList ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              {showGerarList && (
                <div className="border border-slate-100 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 z-10">
                      <tr className="border-b border-slate-100">
                        <th className="table-header py-2 px-3">Cliente</th>
                        <th className="table-header py-2 px-3">Produto</th>
                        <th className="table-header py-2 px-3">Período</th>
                        <th className="table-header py-2 px-3">Valor</th>
                        <th className="table-header py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gerarPreview.map((p, idx) => (
                        <tr key={p.locacaoId} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                          <td className="py-2 px-3 text-slate-700">{p.clienteNome}</td>
                          <td className="py-2 px-3 text-slate-600">{p.produtoIdentificador}</td>
                          <td className="py-2 px-3">
                            <span className="text-xs text-slate-600">
                              {formatarDataBR(p.dataInicio)} — {formatarDataBR(p.dataFim)}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-900">
                            {formatarMoeda(p.valorFixo)}
                          </td>
                          <td className="py-2 px-3">
                            {p.jaExiste ? (
                              <Badge label="Já existe" variant="gray" size="sm" />
                            ) : (
                              <Badge label={p.periodicidade} variant="blue" size="sm" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {gerarPreview.length === 0 && !gerarPreviewLoading && gerarResult === null && (
            <div className="text-center py-6 text-slate-400 text-sm">
              Clique em &quot;Preview&quot; para ver as locações que receberão cobranças
            </div>
          )}
        </div>
      </div>

      {/* Informações sobre automação */}
      <div className="card p-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Zap className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Como Funciona a Automação</h2>
            <p className="text-xs text-slate-500">Informações sobre as tarefas automatizadas</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-red-500" />
              Verificação de Vencimentos
            </h3>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
              <li>Busca cobranças com status &quot;Pendente&quot; cuja data de vencimento já passou</li>
              <li>Atualiza automaticamente para status &quot;Atrasado&quot;</li>
              <li>Pode ser chamada via CRON usando header <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">x-cron-secret</code></li>
              <li>Segurança: requer CRON_SECRET ou sessão de administrador</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              Geração de Cobranças
            </h3>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
              <li>Busca locações ativas com pagamento por período (Mensal, Semanal, Quinzenal)</li>
              <li>Verifica se já existe cobrança para o período atual</li>
              <li>Cria cobranças pendentes automaticamente com valor fixo</li>
              <li>Cálculo de períodos: Mensal (1º ao último dia), Quinzenal (1º-15 / 16-fim), Semanal (Seg-Dom)</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            <strong>Configuração de CRON:</strong> Para agendar execução automática, configure um cron job externo 
            chamando <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">POST /api/cron/vencimento</code> e 
            <code className="bg-slate-100 px-1 py-0.5 rounded text-xs ml-1">POST /api/cron/gerar-cobrancas</code> com 
            o header <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">x-cron-secret: SEU_CRON_SECRET</code>.
          </p>
        </div>
      </div>
    </div>
  )
}
