// middleware.ts — Proteção de rotas
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
    '/dashboard/:path*',
    '/clientes/:path*',
    '/produtos/:path*',
    '/cobrancas/:path*',
    '/relatorios/:path*',
    '/admin/:path*',
  ],
}
