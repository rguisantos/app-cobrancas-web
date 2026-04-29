import { DefaultSession } from 'next-auth'
import { PermissoesWeb, PermissoesMobile } from '@cobrancas/shared'

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string
      nome: string
      tipoPermissao: string
      permissoesWeb: PermissoesWeb
      permissoesMobile: PermissoesMobile
    }
  }
}
