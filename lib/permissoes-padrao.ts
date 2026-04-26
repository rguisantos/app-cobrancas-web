import { PermissoesWeb, PermissoesMobile, PermissoesUsuario, TipoPermissaoUsuario } from '@cobrancas/shared'

export const PERMISSOES_PADRAO: Record<TipoPermissaoUsuario, PermissoesUsuario> = {
  Administrador: {
    web: {
      clientes: true,
      produtos: true,
      rotas: true,
      locacaoRelocacaoEstoque: true,
      cobrancas: true,
      manutencoes: true,
      relogios: true,
      relatorios: true,
      dashboard: true,
      agenda: true,
      mapa: true,
      adminCadastros: true,
      adminUsuarios: true,
      adminDispositivos: true,
      adminSincronizacao: true,
      adminAuditoria: true,
    },
    mobile: {
      clientes: true,
      produtos: true,
      alteracaoRelogio: true,
      locacaoRelocacaoEstoque: true,
      cobrancasFaturas: true,
      manutencoes: true,
      relatorios: true,
      sincronizacao: true,
    },
  },
  Secretario: {
    web: {
      clientes: true,
      produtos: true,
      rotas: true,
      locacaoRelocacaoEstoque: true,
      cobrancas: true,
      manutencoes: true,
      relogios: true,
      relatorios: true,
      dashboard: true,
      agenda: true,
      mapa: true,
      adminCadastros: false,
      adminUsuarios: false,
      adminDispositivos: false,
      adminSincronizacao: false,
      adminAuditoria: false,
    },
    mobile: {
      clientes: true,
      produtos: true,
      alteracaoRelogio: false,
      locacaoRelocacaoEstoque: true,
      cobrancasFaturas: true,
      manutencoes: true,
      relatorios: true,
      sincronizacao: true,
    },
  },
  AcessoControlado: {
    web: {
      clientes: false,
      produtos: false,
      rotas: false,
      locacaoRelocacaoEstoque: false,
      cobrancas: false,
      manutencoes: false,
      relogios: false,
      relatorios: false,
      dashboard: true,
      agenda: false,
      mapa: false,
      adminCadastros: false,
      adminUsuarios: false,
      adminDispositivos: false,
      adminSincronizacao: false,
      adminAuditoria: false,
    },
    mobile: {
      clientes: false,
      produtos: false,
      alteracaoRelogio: false,
      locacaoRelocacaoEstoque: false,
      cobrancasFaturas: true,
      manutencoes: false,
      relatorios: false,
      sincronizacao: true,
    },
  },
}

/** Returns default web permissions for a given role */
export function getPermissoesWebPadrao(tipo: TipoPermissaoUsuario): PermissoesWeb {
  return PERMISSOES_PADRAO[tipo].web
}

/** Returns default mobile permissions for a given role */
export function getPermissoesMobilePadrao(tipo: TipoPermissaoUsuario): PermissoesMobile {
  return PERMISSOES_PADRAO[tipo].mobile
}
