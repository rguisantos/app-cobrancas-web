// lib/auth.ts — Configuração do NextAuth
import { NextAuthOptions, getServerSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import { verificarSenha } from './hash'
import { gerarToken } from './jwt'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 }, // 30 dias
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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.senha) return null

        const usuario = await prisma.usuario.findFirst({
          where: {
            email: credentials.email,
            status: 'Ativo',
            bloqueado: false,
            deletedAt: null,
          },
          include: { rotasPermitidasRel: { include: { rota: true } } },
        })

        if (!usuario) return null

        const senhaOk = await verificarSenha(credentials.senha, usuario.senha)
        if (!senhaOk) return null

        // Atualizar último acesso
        await prisma.usuario.update({
          where: { id: usuario.id },
          data: {
            dataUltimoAcesso: new Date().toISOString(),
            ultimoAcessoDispositivo: 'Web',
          },
        })

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
        token.id            = user.id
        token.tipoPermissao = (user as any).tipoPermissao
        token.permissoesWeb = (user as any).permissoesWeb
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
