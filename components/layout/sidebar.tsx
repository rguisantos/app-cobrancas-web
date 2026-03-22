'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

const NAV = [
  { href: '/dashboard',  label: 'Dashboard',  icon: '📊' },
  { href: '/clientes',   label: 'Clientes',    icon: '👥' },
  { href: '/produtos',   label: 'Produtos',    icon: '🎱' },
  { href: '/cobrancas',  label: 'Cobranças',   icon: '💰' },
  { href: '/relatorios', label: 'Relatórios',  icon: '📈' },
]

const NAV_ADMIN = [
  { href: '/admin/usuarios',    label: 'Usuários',     icon: '👤' },
  { href: '/admin/dispositivos',label: 'Dispositivos', icon: '📱' },
  { href: '/admin/sync',        label: 'Sincronização',icon: '🔄' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = session?.user?.tipoPermissao === 'Administrador'

  const linkClass = (href: string) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      pathname.startsWith(href)
        ? 'bg-primary-600 text-white'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 flex flex-col z-30">
      {/* Logo */}
      <div className="p-5 border-b border-slate-200">
        <h1 className="text-lg font-bold text-primary-600">🎱 App Cobranças</h1>
        <p className="text-xs text-slate-400 mt-0.5">Sistema de Gestão</p>
      </div>

      {/* Nav principal */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">Menu</p>
        {NAV.map(item => (
          <Link key={item.href} href={item.href} className={linkClass(item.href)}>
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}

        {isAdmin && (
          <>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-2 mt-4">Admin</p>
            {NAV_ADMIN.map(item => (
              <Link key={item.href} href={item.href} className={linkClass(item.href)}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* Usuário */}
      <div className="p-3 border-t border-slate-200">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-sm">
            {session?.user?.name?.[0] ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{session?.user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{session?.user?.tipoPermissao}</p>
          </div>
        </div>
        <Link href="/api/auth/signout" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg mt-1 transition-colors">
          <span>🚪</span> Sair
        </Link>
      </div>
    </aside>
  )
}
