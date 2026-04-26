// middleware.ts — Proteção de rotas (páginas + API) com permissões granulares
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { PermissoesWeb } from '@/shared/types'

// Mapeamento de rotas para permissões necessárias (usa novas permissões expandidas)
const ROUTE_PERMISSIONS: Record<string, keyof PermissoesWeb | 'admin'> = {
  '/admin/usuarios': 'adminUsuarios',
  '/admin/cadastros': 'adminCadastros',
  '/admin/dispositivos': 'adminDispositivos',
  '/admin/sync': 'adminSincronizacao',
  '/admin/auditoria': 'adminAuditoria',
  '/admin/cron': 'adminSincronizacao',
  '/admin/metas': 'relatorios',
  '/admin/email': 'adminCadastros',
  '/admin/rotas': 'rotas',
  '/clientes': 'clientes',
  '/produtos': 'produtos',
  '/locacoes': 'locacaoRelocacaoEstoque',
  '/cobrancas': 'cobrancas',
  '/manutencoes': 'manutencoes',
  '/relogios': 'relogios',
  '/relatorios': 'relatorios',
  '/dashboard': 'dashboard',
  '/agenda': 'agenda',
  '/mapa': 'mapa',
  '/perfil': 'dashboard', // Perfil requer apenas acesso básico
}

// Mapeamento de APIs para permissões necessárias
const API_PERMISSIONS: Record<string, keyof PermissoesWeb | 'admin'> = {
  '/api/clientes': 'clientes',
  '/api/produtos': 'produtos',
  '/api/rotas': 'rotas',
  '/api/usuarios': 'adminUsuarios',
  '/api/locacoes': 'locacaoRelocacaoEstoque',
  '/api/cobrancas': 'cobrancas',
  '/api/manutencoes': 'manutencoes',
  '/api/historico-relogio': 'relogios',
  '/api/relatorios': 'relatorios',
  '/api/dashboard': 'dashboard',
  '/api/agenda': 'agenda',
  '/api/mapa': 'mapa',
  '/api/dispositivos': 'adminDispositivos',
  '/api/estabelecimentos': 'adminCadastros',
  '/api/tipos-produto': 'produtos',
  '/api/descricoes-produto': 'produtos',
  '/api/tamanhos-produto': 'produtos',
  '/api/auditoria': 'adminAuditoria',
  '/api/sync': 'adminSincronizacao',
  '/api/metas': 'relatorios',
  '/api/busca-global': 'dashboard',
  '/api/notificacoes': 'dashboard',
}

function hasPermission(
  tipoPermissao: string,
  permissoesWeb: PermissoesWeb | undefined | null,
  required: keyof PermissoesWeb | 'admin'
): boolean {
  // Administrador sempre tem acesso
  if (tipoPermissao === 'Administrador') return true
  
  // Permissão de admin apenas para Administrador
  if (required === 'admin') return false
  
  // Secretário: acesso a cadastros e operações, relatórios via flag
  if (tipoPermissao === 'Secretario') {
    // Verificar permissão específica no mapa
    return permissoesWeb?.[required] ?? true
  }
  
  // AcessoControlado verifica permissão específica
  if (tipoPermissao === 'AcessoControlado') {
    return permissoesWeb?.[required] ?? false
  }
  
  return false
}

function getRequiredPermission(pathname: string): keyof PermissoesWeb | 'admin' | null {
  // Verificar páginas (ordem importa — rotas mais específicas primeiro)
  for (const [route, permission] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname.startsWith(route)) return permission
  }
  
  // Verificar APIs
  for (const [route, permission] of Object.entries(API_PERMISSIONS)) {
    if (pathname.startsWith(route)) return permission
  }
  
  return null
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // Rotas /api/cron/ usam autenticação própria (CRON_SECRET),
    // não exigem sessão NextAuth — apenas passam direto
    if (pathname.startsWith('/api/cron/')) {
      return NextResponse.next()
    }

    // Verificar permissão granular
    const requiredPermission = getRequiredPermission(pathname)
    
    if (requiredPermission) {
      const tipoPermissao = token?.tipoPermissao as string
      const permissoesWeb = token?.permissoesWeb as PermissoesWeb | undefined

      if (!hasPermission(tipoPermissao, permissoesWeb, requiredPermission)) {
        // Redirecionar para dashboard se for página, ou 403 se for API
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
        }
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      // Cron routes usam CRON_SECRET próprio — não exigem token NextAuth
      authorized: ({ token, req }) => {
        if (req.nextUrl.pathname.startsWith('/api/cron/')) return true
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    // Páginas protegidas
    '/dashboard/:path*',
    '/clientes/:path*',
    '/produtos/:path*',
    '/locacoes/:path*',
    '/cobrancas/:path*',
    '/manutencoes/:path*',
    '/relogios/:path*',
    '/relatorios/:path*',
    '/agenda/:path*',
    '/mapa/:path*',
    '/admin/:path*',
    '/perfil/:path*',
    // APIs protegidas
    '/api/clientes/:path*',
    '/api/produtos/:path*',
    '/api/locacoes/:path*',
    '/api/cobrancas/:path*',
    '/api/rotas/:path*',
    '/api/relatorios/:path*',
    '/api/usuarios/:path*',
    '/api/dashboard/:path*',
    '/api/localizacao/:path*',
    '/api/estabelecimentos/:path*',
    '/api/dispositivos/:path*',
    '/api/tipos-produto/:path*',
    '/api/descricoes-produto/:path*',
    '/api/tamanhos-produto/:path*',
    '/api/manutencoes/:path*',
    '/api/historico-relogio/:path*',
    '/api/auditoria/:path*',
    '/api/sync/:path*',
    '/api/metas/:path*',
    '/api/agenda/:path*',
    '/api/mapa/:path*',
    '/api/busca-global/:path*',
    '/api/notificacoes/:path*',
    '/api/cron/:path*',         // Rotas de automação — auth própria via CRON_SECRET
    // '/api/admin/:path*' - removido para permitir migrate com token próprio
    // '/api/mobile/auth/:path*' - removido: mobile auth é público
  ],
}
