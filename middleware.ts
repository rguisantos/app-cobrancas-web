// middleware.ts — Proteção de rotas (páginas + API)
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // Rota /admin — apenas Administrador
    if (pathname.startsWith('/admin') && token?.tipoPermissao !== 'Administrador') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    // Páginas protegidas
    '/dashboard/:path*',
    '/clientes/:path*',
    '/produtos/:path*',
    '/cobrancas/:path*',
    '/relatorios/:path*',
    '/admin/:path*',
    // APIs protegidas — exceto rotas públicas necessárias (auth, mobile auth, health, equipamentos)
    // Nota: equipamentos/POST é público (mobile registra sem login); GET requer sessão (tratado no handler)
    '/api/clientes/:path*',
    '/api/produtos/:path*',
    '/api/locacoes/:path*',
    '/api/cobrancas/:path*',
    '/api/rotas/:path*',
    '/api/relatorios/:path*',
    '/api/usuarios/:path*',
    '/api/dashboard/:path*',
    '/api/sync/:path*',
    // '/api/admin/:path*' - removido para permitir migrate com token próprio
    '/api/localizacao/:path*',
    '/api/estabelecimentos/:path*',
  ],
}
