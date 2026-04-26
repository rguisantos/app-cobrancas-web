// lib/auth.ts — Configuração do NextAuth
import { NextAuthOptions, getServerSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import { verificarSenha } from './hash'
import { verificarLockout, registrarTentativaFalha, registrarTentativaSucesso, checkDbRateLimit } from './auth-core'
import { logger } from './logger'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 }, // 8 horas (revalidado a cada 5min no callback)
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
    error:  '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        senha: { label: 'Senha',  type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.senha) return null

        const email = credentials.email
        const senha = credentials.senha

        // 1. Verificar rate limiting persistente via DB
        const rateLimitResult = await checkDbRateLimit(email)
        if (!rateLimitResult.allowed) {
          logger.warn(`[auth/authorize] Rate limit atingido para: ${email}`)
          // NextAuth não suporta retornar status customizado,
          // então retornamos null e tratamos no client via /api/auth/login
          return null
        }

        // 2. Verificar lockout da conta
        const lockout = await verificarLockout(email)
        if (lockout.locked) {
          logger.warn(`[auth/authorize] Conta bloqueada: ${email} (${lockout.minutosRestantes}min restantes)`)
          return null
        }

        // 3. Buscar usuário
        const usuario = await prisma.usuario.findFirst({
          where: {
            email,
            status: 'Ativo',
            bloqueado: false,
            deletedAt: null,
          },
          include: { rotasPermitidasRel: { include: { rota: true } } },
        })

        if (!usuario) {
          await registrarTentativaFalha(email, 'web-nextauth', 'NextAuth')
          return null
        }

        // 4. Verificar senha
        const senhaOk = await verificarSenha(senha, usuario.senha)
        if (!senhaOk) {
          await registrarTentativaFalha(email, 'web-nextauth', 'NextAuth')
          logger.warn(`[auth/authorize] Senha incorreta para: ${email}`)
          return null
        }

        // 5. Login bem-sucedido — registrar e atualizar último acesso
        await registrarTentativaSucesso(usuario.id, email, 'web-nextauth', 'NextAuth')

        await prisma.usuario.update({
          where: { id: usuario.id },
          data: {
            dataUltimoAcesso: new Date().toISOString(),
            ultimoAcessoDispositivo: 'Web',
          },
        })

        // NOTA: Não criamos sessão no DB para web porque o NextAuth
        // gerencia sessões via cookies/JWT. Sessões em DB são apenas para mobile.

        return {
          id: usuario.id,
          email: usuario.email,
          name: usuario.nome,
          tipoPermissao: usuario.tipoPermissao,
          permissoesWeb: usuario.permissoesWeb,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.tipoPermissao = (user as any).tipoPermissao
        token.permissoesWeb = (user as any).permissoesWeb
        token.lastChecked = Date.now() // Rastrear quando verificamos o usuário pela última vez
      }

      // Re-validar status do usuário a cada 5 minutos
      const lastChecked = (token.lastChecked as number) || 0
      if (Date.now() - lastChecked > 5 * 60 * 1000) {
        try {
          const usuario = await prisma.usuario.findFirst({
            where: { id: token.id as string, status: 'Ativo', bloqueado: false, deletedAt: null },
            select: { tipoPermissao: true, permissoesWeb: true, status: true, bloqueado: true },
          })

          if (!usuario) {
            // Usuário foi desativado/bloqueado — forçar re-login
            logger.warn(`[auth/jwt] Usuário desativado/bloqueado, forçando re-login: ${token.id}`)
            return {} as any // Retornar objeto vazio aciona sign out
          }

          // Atualizar permissões caso tenham mudado
          token.tipoPermissao = usuario.tipoPermissao
          token.permissoesWeb = usuario.permissoesWeb
          token.lastChecked = Date.now()
        } catch (err) {
          logger.error('[auth/jwt] Erro ao re-validar usuário:', err)
          // Em caso de erro de DB, manter a sessão existente (não derrubar o usuário)
          token.lastChecked = Date.now()
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id            = token.id as string
        session.user.tipoPermissao = token.tipoPermissao as string
        session.user.permissoesWeb = token.permissoesWeb as any
      }
      return session
    },
  },
}

/** Atalho para pegar sessão em Server Components */
export const getSession = () => getServerSession(authOptions)

/** Verifica se o usuário logado é admin */
export async function requireAdmin() {
  const session = await getSession()
  if (!session?.user?.tipoPermissao || session.user.tipoPermissao !== 'Administrador') {
    throw new Error('Acesso negado')
  }
  return session
}
