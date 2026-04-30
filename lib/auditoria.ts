import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { getAuthSession } from './api-helpers'

// ============================================================================
// TIPOS DE AÇÕES — organizados por entidade
// ============================================================================

export type AcaoAuditoria =
  // Usuários
  | 'criar_usuario' | 'editar_usuario' | 'excluir_usuario'
  | 'desbloquear_usuario' | 'reset_senha' | 'alterar_permissao'
  | 'login' | 'logout' | 'login_falha'
  // Clientes
  | 'criar_cliente' | 'editar_cliente' | 'excluir_cliente'
  // Produtos
  | 'criar_produto' | 'editar_produto' | 'excluir_produto'
  // Locações
  | 'criar_locacao' | 'editar_locacao' | 'excluir_locacao'
  | 'relocar_locacao' | 'enviar_estoque'
  // Cobranças
  | 'criar_cobranca' | 'editar_cobranca' | 'excluir_cobranca'
  | 'alterar_status_cobranca' | 'imprimir_recibo'
  // Rotas
  | 'criar_rota' | 'editar_rota' | 'excluir_rota'
  // Manutenções
  | 'criar_manutencao' | 'editar_manutencao' | 'excluir_manutencao'
  // Tipos/Descrições/Tamanhos de Produto
  | 'criar_tipo_produto' | 'editar_tipo_produto' | 'excluir_tipo_produto'
  | 'criar_descricao_produto' | 'editar_descricao_produto' | 'excluir_descricao_produto'
  | 'criar_tamanho_produto' | 'editar_tamanho_produto' | 'excluir_tamanho_produto'
  // Estabelecimentos
  | 'criar_estabelecimento' | 'editar_estabelecimento' | 'excluir_estabelecimento'
  // Relógio
  | 'atualizar_relogio'
  // Sync
  | 'sync_push' | 'sync_pull' | 'sync_conflict_resolve'
  // Sistema
  | 'migracao_banco' | 'init_admin'

// ============================================================================
// LABELS — para exibição na interface
// ============================================================================

export const ACAO_LABELS: Record<string, string> = {
  // Usuários
  criar_usuario: 'Criar Usuário',
  editar_usuario: 'Editar Usuário',
  excluir_usuario: 'Excluir Usuário',
  desbloquear_usuario: 'Desbloquear Usuário',
  reset_senha: 'Resetar Senha',
  alterar_permissao: 'Alterar Permissão',
  login: 'Login',
  logout: 'Logout',
  login_falha: 'Tentativa de Login Falha',
  // Clientes
  criar_cliente: 'Criar Cliente',
  editar_cliente: 'Editar Cliente',
  excluir_cliente: 'Excluir Cliente',
  // Produtos
  criar_produto: 'Criar Produto',
  editar_produto: 'Editar Produto',
  excluir_produto: 'Excluir Produto',
  // Locações
  criar_locacao: 'Criar Locação',
  editar_locacao: 'Editar Locação',
  excluir_locacao: 'Excluir Locação',
  relocar_locacao: 'Relocar Locação',
  enviar_estoque: 'Enviar para Estoque',
  // Cobranças
  criar_cobranca: 'Criar Cobrança',
  editar_cobranca: 'Editar Cobrança',
  excluir_cobranca: 'Excluir Cobrança',
  alterar_status_cobranca: 'Alterar Status Cobrança',
  imprimir_recibo: 'Imprimir Recibo',
  // Rotas
  criar_rota: 'Criar Rota',
  editar_rota: 'Editar Rota',
  excluir_rota: 'Excluir Rota',
  // Manutenções
  criar_manutencao: 'Criar Manutenção',
  editar_manutencao: 'Editar Manutenção',
  excluir_manutencao: 'Excluir Manutenção',
  // Tipos/Descrições/Tamanhos
  criar_tipo_produto: 'Criar Tipo Produto',
  editar_tipo_produto: 'Editar Tipo Produto',
  excluir_tipo_produto: 'Excluir Tipo Produto',
  criar_descricao_produto: 'Criar Descrição Produto',
  editar_descricao_produto: 'Editar Descrição Produto',
  excluir_descricao_produto: 'Excluir Descrição Produto',
  criar_tamanho_produto: 'Criar Tamanho Produto',
  editar_tamanho_produto: 'Editar Tamanho Produto',
  excluir_tamanho_produto: 'Excluir Tamanho Produto',
  // Estabelecimentos
  criar_estabelecimento: 'Criar Estabelecimento',
  editar_estabelecimento: 'Editar Estabelecimento',
  excluir_estabelecimento: 'Excluir Estabelecimento',
  // Relógio
  atualizar_relogio: 'Atualizar Relógio',
  // Sync
  sync_push: 'Sync Push',
  sync_pull: 'Sync Pull',
  sync_conflict_resolve: 'Resolver Conflito Sync',
  // Sistema
  migracao_banco: 'Migração do Banco',
  init_admin: 'Inicializar Admin',
}

export const ENTIDADE_LABELS: Record<string, string> = {
  usuario: 'Usuário',
  cliente: 'Cliente',
  produto: 'Produto',
  locacao: 'Locação',
  cobranca: 'Cobrança',
  rota: 'Rota',
  manutencao: 'Manutenção',
  tipoProduto: 'Tipo Produto',
  descricaoProduto: 'Descrição Produto',
  tamanhoProduto: 'Tamanho Produto',
  estabelecimento: 'Estabelecimento',
  historicoRelogio: 'Histórico Relógio',
  sessao: 'Sessão',
  sistema: 'Sistema',
  sync: 'Sync',
}

// ============================================================================
// CATEGORIAS — para agrupar na interface
// ============================================================================

export const ACAO_CATEGORIAS: Record<string, { label: string; color: string; bg: string }> = {
  criar: { label: 'Criação', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  editar: { label: 'Edição', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  excluir: { label: 'Exclusão', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  login: { label: 'Autenticação', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  sistema: { label: 'Sistema', color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
  sync: { label: 'Sincronização', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  especial: { label: 'Ação Especial', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
}

export function getCategoriaAcao(acao: string): string {
  if (acao.startsWith('criar_')) return 'criar'
  if (acao.startsWith('editar_')) return 'editar'
  if (acao.startsWith('excluir_')) return 'excluir'
  if (acao.startsWith('login') || acao === 'logout') return 'login'
  if (acao.startsWith('sync_')) return 'sync'
  if (['migracao_banco', 'init_admin'].includes(acao)) return 'sistema'
  return 'especial'
}

// ============================================================================
// FUNÇÃO PRINCIPAL — registrar auditoria
// ============================================================================

/**
 * Registra uma ação no log de auditoria.
 * Pode ser chamado com um usuarioId explícito ou sem (para obter da sessão atual).
 */
export async function registrarAuditoria(params: {
  acao: AcaoAuditoria | string
  entidade: string
  entidadeId?: string
  detalhes?: Record<string, any>
  usuarioId?: string
  ip?: string
  userAgent?: string
}): Promise<void> {
  try {
    let userId = params.usuarioId

    if (!userId) {
      try {
        const session = await getAuthSession()
        userId = session?.user?.id || undefined
      } catch {
        // Sem sessão (ex: cron job, sistema) — userId fica undefined
      }
    }

    await prisma.logAuditoria.create({
      data: {
        usuarioId: userId,
        acao: params.acao,
        entidade: params.entidade,
        entidadeId: params.entidadeId,
        detalhes: params.detalhes ?? Prisma.JsonNull,
        ip: params.ip || undefined,
        userAgent: params.userAgent || undefined,
      },
    })
  } catch (error) {
    // Auditoria não deve quebrar o fluxo principal
    console.error('[auditoria] Erro ao registrar:', error)
  }
}

// ============================================================================
// HELPER — extrair IP e User-Agent do request
// ============================================================================

export function extractRequestInfo(req: { headers: Headers }) {
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || undefined
  const userAgent = req.headers.get('user-agent') || undefined
  return { ip, userAgent }
}
