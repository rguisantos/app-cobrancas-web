'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  Users,
  Package,
  DollarSign,
  TrendingUp,
  UserCog,
  Smartphone,
  RefreshCw,
  LogOut,
  ChevronRight,
  FileText,
  MapPin,
  Map,
  Menu,
  X,
  Wrench,
  Database,
  History,
  UserCircle,
  Clock,
  Calendar,
  Target,
  Shield,
  Mail,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import ThemeToggle from '@/components/layout/theme-toggle'

const NAV = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/clientes',   label: 'Clientes',    icon: Users },
  { href: '/produtos',   label: 'Produtos',    icon: Package },
  { href: '/locacoes',   label: 'Locações',    icon: FileText },
  { href: '/cobrancas',  label: 'Cobranças',   icon: DollarSign },
  { href: '/relogios',   label: 'Relógios',    icon: History },
  { href: '/manutencoes', label: 'Manutenções', icon: Wrench },
  { href: '/agenda',       label: 'Agenda',       icon: Calendar },
  { href: '/relatorios', label: 'Relatórios',  icon: TrendingUp },
  { href: '/mapa',       label: 'Mapa de Rotas', icon: Map },
]

const NAV_ADMIN = [
  { href: '/admin/usuarios',    label: 'Usuários',     icon: UserCog },
  { href: '/admin/rotas',       label: 'Rotas',        icon: MapPin },
  { href: '/admin/cadastros',   label: 'Cadastros',    icon: Database },
  { href: '/admin/metas',       label: 'Metas',        icon: Target },
  { href: '/admin/dispositivos',label: 'Dispositivos', icon: Smartphone },
  { href: '/admin/sync',        label: 'Sincronização',icon: RefreshCw },
  { href: '/admin/auditoria',   label: 'Auditoria',    icon: Shield },
  { href: '/admin/cron',        label: 'Automação',    icon: Clock },
  { href: '/admin/email',       label: 'Email',        icon: Mail },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = session?.user?.tipoPermissao === 'Administrador'
  const [isOpen, setIsOpen] = useState(false)

  const isActive = (href: string) => pathname.startsWith(href)

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2.5 rounded-lg bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        ) : (
          <Menu className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        )}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/30 z-20 dark:bg-black/50"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 flex flex-col z-30 shadow-sm
        transition-transform duration-300 ease-in-out
        dark:bg-slate-800 dark:border-slate-700
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Logo Section */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-700">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-blue-400 flex items-center justify-center shadow-sm shadow-primary-600/30 group-hover:shadow-md transition-shadow dark:from-primary-500 dark:to-blue-400">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight dark:text-slate-100">
                Cobranças
              </h1>
              <p className="text-xs text-slate-400 -mt-0.5 dark:text-slate-500">
                Sistema de Gestão
              </p>
            </div>
          </Link>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="mb-2">
            <p className="section-header px-3 py-2">Menu Principal</p>
          </div>
          {NAV.map(item => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                onClick={() => setIsOpen(false)}
                className={`sidebar-link group ${active ? 'sidebar-link-active' : 'sidebar-link-inactive'}`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="w-4 h-4 text-white/60" />}
              </Link>
            )
          })}

          {isAdmin && (
            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-700">
              <p className="section-header px-3 py-2">Administração</p>
              {NAV_ADMIN.map(item => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link 
                    key={item.href} 
                    href={item.href} 
                    onClick={() => setIsOpen(false)}
                    className={`sidebar-link group ${active ? 'sidebar-link-active' : 'sidebar-link-inactive'}`}
                  >
                    <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                    <span className="flex-1">{item.label}</span>
                    {active && <ChevronRight className="w-4 h-4 text-white/60" />}
                  </Link>
                )
              })}
            </div>
          )}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/50">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-blue-400 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {session?.user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate dark:text-slate-100">
                {session?.user?.name}
              </p>
              <p className="text-xs text-slate-500 truncate dark:text-slate-400">
                {session?.user?.tipoPermissao}
              </p>
            </div>
          </div>
          
          {/* Theme Toggle */}
          <div className="mt-2">
            <ThemeToggle />
          </div>

          <Link 
            href="/perfil" 
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 mt-1 text-sm text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors group dark:text-slate-400 dark:hover:text-primary-400 dark:hover:bg-slate-700/50"
          >
            <UserCircle className="w-4 h-4" />
            <span>Meu Perfil</span>
          </Link>
          <Link 
            href="/api/auth/signout" 
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 mt-1 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors group dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-900/20"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair da conta</span>
          </Link>
        </div>
      </aside>
    </>
  )
}
