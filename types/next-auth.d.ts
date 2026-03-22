import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string
      tipoPermissao: string
      permissoesWeb: {
        todosCadastros: boolean
        locacaoRelocacaoEstoque: boolean
        relatorios: boolean
      }
    }
  }
}
