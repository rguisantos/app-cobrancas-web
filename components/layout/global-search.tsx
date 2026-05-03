'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Users,
  Package,
  FileText,
  DollarSign,
  X,
  Clock,
  ArrowRight,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────
interface ClienteResult {
  id: string
  nomeExibicao: string
  tipoPessoa: string
  cpf?: string | null
  cnpj?: string | null
  status: string
}

interface ProdutoResult {
  id: string
  identificador: string
  tipoNome: string
  descricaoNome: string
  tamanhoNome: string
  statusProduto: string
}

interface LocacaoResult {
  id: string
  produtoIdentificador: string
  clienteNome: string
  produtoTipo: string
  status: string
}

interface CobrancaResult {
  id: string
  clienteNome: string
  produtoIdentificador: string
  status: string
  dataInicio: string
  dataFim: string
  totalClientePaga: number
}

interface SearchResults {
  clientes: ClienteResult[]
  produtos: ProdutoResult[]
  locacoes: LocacaoResult[]
  cobrancas: CobrancaResult[]
}

interface FlatResult {
  type: 'cliente' | 'produto' | 'locacao' | 'cobranca'
  id: string
  label: string
  sublabel: string
  href: string
  icon: React.ElementType
}

const STORAGE_KEY = 'cobrancas-recent-searches'
const MAX_RECENT = 5

// ── Helpers ────────────────────────────────────────────────────────────
function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveRecentSearch(term: string) {
  if (typeof window === 'undefined') return
  try {
    const current = getRecentSearches().filter((s) => s !== term)
    const updated = [term, ...current].slice(0, MAX_RECENT)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // Ignore storage errors
  }
}

function removeRecentSearch(term: string) {
  if (typeof window === 'undefined') return
  try {
    const current = getRecentSearches().filter((s) => s !== term)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {
    // Ignore storage errors
  }
}

function flattenResults(results: SearchResults): FlatResult[] {
  const flat: FlatResult[] = []

  results.clientes.forEach((c) => {
    flat.push({
      type: 'cliente',
      id: c.id,
      label: c.nomeExibicao,
      sublabel: c.tipoPessoa === 'Juridica' ? `CNPJ: ${c.cnpj || '—'}` : `CPF: ${c.cpf || '—'}`,
      href: `/clientes/${c.id}`,
      icon: Users,
    })
  })

  results.produtos.forEach((p) => {
    flat.push({
      type: 'produto',
      id: p.id,
      label: p.identificador,
      sublabel: `${p.tipoNome} • ${p.descricaoNome} • ${p.tamanhoNome}`,
      href: `/produtos/${p.id}`,
      icon: Package,
    })
  })

  results.locacoes.forEach((l) => {
    flat.push({
      type: 'locacao',
      id: l.id,
      label: l.produtoIdentificador,
      sublabel: `${l.clienteNome} • ${l.produtoTipo}`,
      href: `/locacoes/${l.id}`,
      icon: FileText,
    })
  })

  results.cobrancas.forEach((c) => {
    flat.push({
      type: 'cobranca',
      id: c.id,
      label: c.clienteNome,
      sublabel: `${c.produtoIdentificador} • ${c.status} • R$ ${c.totalClientePaga.toFixed(2)}`,
      href: `/cobrancas/${c.id}`,
      icon: DollarSign,
    })
  })

  return flat
}

const TYPE_LABELS: Record<string, string> = {
  cliente: 'Clientes',
  produto: 'Produtos',
  locacao: 'Locações',
  cobranca: 'Cobranças',
}

// ── Component ──────────────────────────────────────────────────────────
export default function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches())
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
      setResults(null)
      setSelectedIndex(-1)
      setLoading(false)
    }
  }, [open])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query || query.trim().length < 2) {
      setResults(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setSelectedIndex(-1)

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/busca-global?q=${encodeURIComponent(query.trim())}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data)
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  // Build flat list for navigation
  const flatResults = useMemo(() => (results ? flattenResults(results) : []), [results])
  const totalResults = flatResults.length

  // Navigate to result
  const navigateTo = useCallback(
    (item: FlatResult) => {
      saveRecentSearch(query.trim())
      setOpen(false)
      router.push(item.href)
    },
    [router, query]
  )

  // Navigate to recent search
  const searchRecent = useCallback((term: string) => {
    setQuery(term)
  }, [])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, totalResults - 1))
        return
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
        return
      }

      if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < totalResults) {
        e.preventDefault()
        navigateTo(flatResults[selectedIndex])
        return
      }
    },
    [totalResults, selectedIndex, flatResults, navigateTo]
  )

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`)
      selectedEl?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  // Click outside to close
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) setOpen(false)
    },
    []
  )

  // Group results by type
  const groupedResults = results
    ? (['cliente', 'produto', 'locacao', 'cobranca'] as const)
        .map((type) => ({
          type,
          label: TYPE_LABELS[type],
          items: flatResults.filter((r) => r.type === type),
        }))
        .filter((g) => g.items.length > 0)
    : []

  let runningIndex = -1

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors text-sm shadow-sm"
        aria-label="Buscar (Ctrl+K)"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline text-slate-500">Buscar...</span>
        <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-medium text-slate-400 border border-slate-200">
          ⌘K
        </kbd>
      </button>

      {/* Modal Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-0 sm:pt-[10vh] bg-black/40 backdrop-blur-sm"
          onClick={handleBackdropClick}
        >
          <div
            className="relative w-full max-w-lg mx-0 sm:mx-4 bg-white rounded-b-xl sm:rounded-xl shadow-2xl border border-slate-200 sm:border overflow-hidden"
            onKeyDown={handleKeyDown}
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 border-b border-slate-200">
              <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar clientes, produtos, locações..."
                className="flex-1 py-4 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent border-none outline-none"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery('')
                    inputRef.current?.focus()
                  }}
                  className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {/* Close button — always visible on mobile, ESC hint on desktop */}
              <button
                onClick={() => setOpen(false)}
                className="sm:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Fechar busca"
              >
                <X className="w-5 h-5" />
              </button>
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-medium text-slate-400 border border-slate-200">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-80 overflow-y-auto">
              {/* Loading State */}
              {loading && (
                <div className="px-4 py-8 text-center">
                  <div className="w-6 h-6 border-2 border-slate-300 border-t-primary-600 rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Buscando...</p>
                </div>
              )}

              {/* No results */}
              {!loading && query.length >= 2 && results && totalResults === 0 && (
                <div className="px-4 py-8 text-center">
                  <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">
                    Nenhum resultado para &ldquo;{query}&rdquo;
                  </p>
                </div>
              )}

              {/* Search Results (grouped) */}
              {!loading && groupedResults.length > 0 && (
                <div className="py-2">
                  {groupedResults.map((group) => (
                    <div key={group.type}>
                      <div className="px-4 py-1.5">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          {group.label}
                        </p>
                      </div>
                      {group.items.map((item) => {
                        runningIndex++
                        const idx = runningIndex
                        const isSelected = idx === selectedIndex
                        return (
                          <button
                            key={`${item.type}-${item.id}`}
                            data-index={idx}
                            onClick={() => navigateTo(item)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                              isSelected
                                ? 'bg-primary-50 text-primary-900'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                isSelected
                                  ? 'bg-primary-100 text-primary-600'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              <item.icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.label}</p>
                              <p className="text-xs text-slate-500 truncate">{item.sublabel}</p>
                            </div>
                            {isSelected && (
                              <ArrowRight className="w-4 h-4 text-primary-400 flex-shrink-0" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}

              {/* Recent Searches (when no query) */}
              {!loading && query.length < 2 && recentSearches.length > 0 && (
                <div className="py-2">
                  <div className="px-4 py-1.5">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Buscas recentes
                    </p>
                  </div>
                  {recentSearches.map((term) => (
                    <div
                      key={term}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 cursor-pointer group"
                    >
                      <Clock className="w-4 h-4 text-slate-300 flex-shrink-0" />
                      <button
                        onClick={() => searchRecent(term)}
                        className="flex-1 text-sm text-slate-600 text-left truncate"
                      >
                        {term}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeRecentSearch(term)
                          setRecentSearches(getRecentSearches())
                        }}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty initial state */}
              {!loading && query.length < 2 && recentSearches.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">
                    Digite ao menos 2 caracteres para buscar
                  </p>
                </div>
              )}
            </div>

            {/* Footer — keyboard hints only visible on desktop */}
            <div className="hidden sm:flex border-t border-slate-100 px-4 py-2 items-center gap-4 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px]">
                  ↑
                </kbd>
                <kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px]">
                  ↓
                </kbd>
                Navegar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px]">
                  ↵
                </kbd>
                Selecionar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px]">
                  esc
                </kbd>
                Fechar
              </span>
            </div>
            {/* Mobile close button at bottom */}
            <div className="sm:hidden border-t border-slate-100 px-4 py-2.5">
              <button
                onClick={() => setOpen(false)}
                className="w-full py-2.5 rounded-lg bg-slate-100 text-sm font-medium text-slate-600 hover:bg-slate-200 active:bg-slate-300 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
