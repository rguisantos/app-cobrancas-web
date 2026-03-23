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
  MapPin
} from 'lucide-react'

const NAV = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/clientes',   label: 'Clientes',    icon: Users },
  { href: '/produtos',   label: 'Produtos',    icon: Package },
  { href: '/locacoes',   label: 'Locações',    icon: FileText },
  { href: '/cobrancas',  label: 'Cobranças',   icon: DollarSign },
  { href: '/relatorios', label: 'Relatórios',  icon: TrendingUp },
]

const NAV_ADMIN = [
  { href: '/admin/usuarios',    label: 'Usuários',     icon: UserCog },
  { href: '/admin/rotas',       label: 'Rotas',        icon: MapPin },
  { href: '/admin/dispositivos',label: 'Dispositivos', icon: Smartphone },
  { href: '/admin/sync',        label: 'Sincronização',icon: RefreshCw },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = session?.user?.tipoPermissao === 'Administrador'

  const isActive = (href: string) => pathname.startsWith(href)

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 flex flex-col z-30 shadow-sm">
      {/* Logo Section */}
      <div className="p-5 border-b border-slate-100">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-blue-400 flex items-center justify-center shadow-sm shadow-primary-600/30 group-hover:shadow-md transition-shadow">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Cobranças
            </h1>
            <p className="text-xs text-slate-400 -mt-0.5">
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
              className={`sidebar-link group ${active ? 'sidebar-link-active' : 'sidebar-link-inactive'}`}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="w-4 h-4 text-white/60" />}
            </Link>
          )
        })}

        {isAdmin && (
          <div className="pt-4 mt-4 border-t border-slate-100">
            <p className="section-header px-3 py-2">Administração</p>
            {NAV_ADMIN.map(item => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link 
                  key={item.href} 
                  href={item.href} 
                  className={`sidebar-link group ${active ? 'sidebar-link-active' : 'sidebar-link-inactive'}`}
                >
                  <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  <span className="flex-1">{item.label}</span>
                  {active && <ChevronRight className="w-4 h-4 text-white/60" />}
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white border border-slate-100">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-blue-400 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            {session?.user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {session?.user?.name}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {session?.user?.tipoPermissao}
            </p>
          </div>
        </div>
        
        <Link 
          href="/api/auth/signout" 
          className="flex items-center gap-2 px-3 py-2.5 mt-2 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors group"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair da conta</span>
        </Link>
      </div>
    </aside>
  )
}
