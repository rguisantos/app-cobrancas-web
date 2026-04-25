// middleware.ts — Proteção de rotas (páginas + API) com permissões granulares
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { PermissoesWeb } from '@/shared/types'

// Mapeamento de rotas para permissões necessárias
const ROUTE_PERMISSIONS: Record<string, keyof PermissoesWeb | 'admin'> = {
  '/admin': 'admin',
  '/clientes': 'todosCadastros',
  '/produtos': 'todosCadastros',
  '/locacoes': 'locacaoRelocacaoEstoque',
  '/cobrancas': 'locacaoRelocacaoEstoque',
  '/relatorios': 'relatorios',
}

// Mapeamento de APIs para permissões necessárias
const API_PERMISSIONS: Record<string, keyof PermissoesWeb | 'admin'> = {
  '/api/clientes': 'todosCadastros',
  '/api/produtos': 'todosCadastros',
  '/api/rotas': 'todosCadastros',
  '/api/usuarios': 'admin',
  '/api/locacoes': 'locacaoRelocacaoEstoque',
  '/api/cobrancas': 'locacaoRelocacaoEstoque',
  '/api/relatorios': 'relatorios',
  '/api/dispositivos': 'admin',
  '/api/estabelecimentos': 'todosCadastros',
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
  
  // Secretário tem acesso a cadastros e locação
  if (tipoPermissao === 'Secretario') {
    if (required === 'todosCadastros' || required === 'locacaoRelocacaoEstoque') return true
    if (required === 'relatorios') return permissoesWeb?.relatorios ?? true
  }
  
  // AcessoControlado verifica permissão específica
  if (tipoPermissao === 'AcessoControlado') {
    return permissoesWeb?.[required] ?? false
  }
  
  return false
}

function getRequiredPermission(pathname: string): keyof PermissoesWeb | 'admin' | null {
  // Verificar páginas
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
    '/relatorios/:path*',
    '/admin/:path*',
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
    '/api/cron/:path*',         // Rotas de automação — auth própria via CRON_SECRET (middleware permite sem sessão)
    // '/api/sync/:path*' - removido: mobile usa JWT próprio
    // '/api/admin/:path*' - removido para permitir migrate com token próprio
    // '/api/mobile/auth/:path*' - removido: mobile auth é público
  ],
}
