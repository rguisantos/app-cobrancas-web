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
  | 'login' | 'logout' | 'login_falha' | 'alterar_senha' | 'recuperar_senha'
  // Clientes
  | 'criar_cliente' | 'editar_cliente' | 'excluir_cliente'
  // Produtos
  | 'criar_produto' | 'editar_produto' | 'excluir_produto'
  // Locações
  | 'criar_locacao' | 'editar_locacao' | 'excluir_locacao'
  | 'relocar_locacao' | 'enviar_estoque' | 'finalizar_locacao'
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
  // Dispositivos
  | 'criar_dispositivo' | 'editar_dispositivo' | 'excluir_dispositivo' | 'ativar_dispositivo'
  // Metas
  | 'criar_meta' | 'editar_meta' | 'excluir_meta'
  // Notificações
  | 'marcar_notificacao_lida' | 'excluir_notificacao'
  // Sync
  | 'sync_push' | 'sync_pull' | 'sync_conflict_resolve'
  // Sistema
  | 'migracao_banco' | 'init_admin' | 'cron_vencimento' | 'cron_gerar_cobrancas'
  // Sessão
  | 'revogar_sessao' | 'revogar_todas_sessoes'

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
  alterar_senha: 'Alterar Senha',
  recuperar_senha: 'Recuperar Senha',
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
  finalizar_locacao: 'Finalizar Locação',
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
  // Dispositivos
  criar_dispositivo: 'Criar Dispositivo',
  editar_dispositivo: 'Editar Dispositivo',
  excluir_dispositivo: 'Excluir Dispositivo',
  ativar_dispositivo: 'Ativar Dispositivo',
  // Metas
  criar_meta: 'Criar Meta',
  editar_meta: 'Editar Meta',
  excluir_meta: 'Excluir Meta',
  // Notificações
  marcar_notificacao_lida: 'Marcar Notificação Lida',
  excluir_notificacao: 'Excluir Notificação',
  // Sync
  sync_push: 'Sync Push',
  sync_pull: 'Sync Pull',
  sync_conflict_resolve: 'Resolver Conflito Sync',
  // Sistema
  migracao_banco: 'Migração do Banco',
  init_admin: 'Inicializar Admin',
  cron_vencimento: 'Cron Vencimento',
  cron_gerar_cobrancas: 'Cron Gerar Cobranças',
  // Sessão
  revogar_sessao: 'Revogar Sessão',
  revogar_todas_sessoes: 'Revogar Todas as Sessões',
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
  dispositivo: 'Dispositivo',
  meta: 'Meta',
  notificacao: 'Notificação',
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
  seguranca: { label: 'Segurança', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
}

export function getCategoriaAcao(acao: string): string {
  if (acao.startsWith('criar_')) return 'criar'
  if (acao.startsWith('editar_') || acao.startsWith('alterar_')) return 'editar'
  if (acao.startsWith('excluir_')) return 'excluir'
  if (acao.startsWith('login') || acao === 'logout' || acao === 'alterar_senha' || acao === 'recuperar_senha' || acao === 'reset_senha') return 'login'
  if (acao.startsWith('sync_')) return 'sync'
  if (['migracao_banco', 'init_admin', 'cron_vencimento', 'cron_gerar_cobrancas'].includes(acao)) return 'sistema'
  if (['revogar_sessao', 'revogar_todas_sessoes', 'ativar_dispositivo', 'desbloquear_usuario'].includes(acao)) return 'seguranca'
  return 'especial'
}

// ============================================================================
// SEVERIDADE — mapeamento automático por ação
// ============================================================================

export type SeveridadeAuditoria = 'info' | 'aviso' | 'critico' | 'seguranca'

const SEVERIDADE_MAP: Record<string, SeveridadeAuditoria> = {
  // Segurança — ações sensíveis
  login: 'seguranca',
  login_falha: 'critico',
  logout: 'seguranca',
  alterar_senha: 'seguranca',
  reset_senha: 'seguranca',
  recuperar_senha: 'seguranca',
  desbloquear_usuario: 'seguranca',
  alterar_permissao: 'seguranca',
  revogar_sessao: 'seguranca',
  revogar_todas_sessoes: 'seguranca',
  ativar_dispositivo: 'seguranca',
  // Crítico — dados financeiros
  criar_cobranca: 'critico',
  editar_cobranca: 'critico',
  excluir_cobranca: 'critico',
  alterar_status_cobranca: 'critico',
  // Aviso — alterações em dados operacionais
  editar_usuario: 'aviso',
  editar_cliente: 'aviso',
  editar_produto: 'aviso',
  editar_locacao: 'aviso',
  editar_rota: 'aviso',
  editar_dispositivo: 'aviso',
  editar_meta: 'aviso',
  excluir_locacao: 'aviso',
  excluir_cliente: 'aviso',
  excluir_produto: 'aviso',
  excluir_rota: 'aviso',
  finalizar_locacao: 'aviso',
  relocar_locacao: 'aviso',
  enviar_estoque: 'aviso',
  // Info — criações e leituras
  criar_usuario: 'info',
  criar_cliente: 'info',
  criar_produto: 'info',
  criar_locacao: 'info',
  criar_rota: 'info',
  criar_dispositivo: 'info',
  criar_meta: 'info',
  imprimir_recibo: 'info',
  sync_push: 'info',
  sync_pull: 'info',
  init_admin: 'info',
  migracao_banco: 'aviso',
}

export function getSeveridade(acao: string): SeveridadeAuditoria {
  return SEVERIDADE_MAP[acao] || 'info'
}

// ============================================================================
// ORIGEM — detectar origem da ação
// ============================================================================

export type OrigemAuditoria = 'web' | 'mobile' | 'sistema' | 'cron'

function detectarOrigem(userAgent?: string, isCron?: boolean): OrigemAuditoria {
  if (isCron) return 'cron'
  if (!userAgent) return 'sistema'
  const ua = userAgent.toLowerCase()
  if (ua.includes('okhttp') || ua.includes('react-native') || ua.includes('expo') || ua.includes('mobile')) return 'mobile'
  if (ua.includes('mozilla') || ua.includes('chrome') || ua.includes('safari') || ua.includes('edge') || ua.includes('firefox')) return 'web'
  return 'sistema'
}

// ============================================================================
// PARSER DE USER-AGENT — extrair info legível
// ============================================================================

export interface DeviceInfo {
  browser: string
  os: string
  deviceType: 'Desktop' | 'Mobile' | 'Tablet' | 'API' | 'Desconhecido'
  display: string // String formatada para exibição
}

export function parseUserAgent(userAgent?: string | null): DeviceInfo {
  if (!userAgent) {
    return { browser: '—', os: '—', deviceType: 'Desconhecido', display: '—' }
  }

  const ua = userAgent

  // Detectar browser
  let browser = 'Desconhecido'
  if (ua.includes('Edg/')) {
    const match = ua.match(/Edg\/(\d+)/)
    browser = `Edge ${match?.[1] || ''}`
  } else if (ua.includes('OPR/') || ua.includes('Opera')) {
    const match = ua.match(/OPR\/(\d+)/)
    browser = `Opera ${match?.[1] || ''}`
  } else if (ua.includes('Firefox/')) {
    const match = ua.match(/Firefox\/(\d+)/)
    browser = `Firefox ${match?.[1] || ''}`
  } else if (ua.includes('Chrome/') && !ua.includes('Edg/')) {
    const match = ua.match(/Chrome\/(\d+)/)
    browser = `Chrome ${match?.[1] || ''}`
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    const match = ua.match(/Version\/(\d+)/)
    browser = `Safari ${match?.[1] || ''}`
  }

  // Detectar mobile app (React Native / Expo)
  if (ua.includes('okhttp') || ua.includes('react-native') || ua.includes('Expo')) {
    return { browser: 'App Mobile', os: 'Android/iOS', deviceType: 'Mobile', display: 'App Mobile' }
  }

  // Postman / API tools
  if (ua.includes('PostmanRuntime') || ua.includes('insomnia') || ua.includes('curl')) {
    return { browser: 'API', os: '—', deviceType: 'API', display: 'API / Ferramenta' }
  }

  // Detectar OS
  let os = 'Desconhecido'
  if (ua.includes('Windows NT 10.0')) os = 'Windows 10/11'
  else if (ua.includes('Windows NT 6.3')) os = 'Windows 8.1'
  else if (ua.includes('Windows NT 6.1')) os = 'Windows 7'
  else if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Mac OS X')) {
    const match = ua.match(/Mac OS X (\d+[._]\d+[._]?\d*)/)
    os = match ? `macOS ${match[1].replace(/_/g, '.')}` : 'macOS'
  }
  else if (ua.includes('Android')) {
    const match = ua.match(/Android (\d+(\.\d+)?)/)
    os = match ? `Android ${match[1]}` : 'Android'
  }
  else if (ua.includes('iPhone') || ua.includes('iPad')) {
    const match = ua.match(/OS (\d+[._]\d+)/)
    os = match ? `iOS ${match[1].replace(/_/g, '.')}` : 'iOS'
  }
  else if (ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('CrOS')) os = 'Chrome OS'

  // Detectar tipo de dispositivo
  let deviceType: DeviceInfo['deviceType'] = 'Desktop'
  if (/iPhone|iPod|Android.*Mobile/.test(ua)) deviceType = 'Mobile'
  else if (/iPad|Android(?!.*Mobile)/.test(ua)) deviceType = 'Tablet'

  const display = `${browser} / ${os}`

  return { browser, os, deviceType, display }
}

// ============================================================================
// FUNÇÃO PRINCIPAL — registrar auditoria (melhorada)
// ============================================================================

/**
 * Registra uma ação no log de auditoria.
 * Suporta captura automática de IP, User-Agent, dispositivo parseado,
 * snapshots antes/depois, severidade e origem.
 */
export async function registrarAuditoria(params: {
  acao: AcaoAuditoria | string
  entidade: string
  entidadeId?: string
  entidadeNome?: string
  detalhes?: Record<string, any>
  antes?: Record<string, any> | null
  depois?: Record<string, any> | null
  usuarioId?: string
  ip?: string
  userAgent?: string
  origem?: OrigemAuditoria
  severidade?: SeveridadeAuditoria
  isCron?: boolean
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

    const userAgent = params.userAgent
    const origem = params.origem || detectarOrigem(userAgent, params.isCron)
    const dispositivo = parseUserAgent(userAgent).display
    const severidade = params.severidade || getSeveridade(params.acao)

    await prisma.logAuditoria.create({
      data: {
        usuarioId: userId,
        acao: params.acao,
        entidade: params.entidade,
        entidadeId: params.entidadeId,
        entidadeNome: params.entidadeNome,
        detalhes: params.detalhes ?? Prisma.JsonNull,
        antes: params.antes ?? undefined,
        depois: params.depois ?? undefined,
        ip: params.ip || undefined,
        userAgent: userAgent || undefined,
        dispositivo: dispositivo !== '—' ? dispositivo : undefined,
        severidade,
        origem,
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

// ============================================================================
// HELPER — gerar diff legível entre antes e depois
// ============================================================================

export function gerarDiff(
  antes: Record<string, any> | null | undefined,
  depois: Record<string, any> | null | undefined
): { campo: string; valorAntes: any; valorDepois: any }[] {
  if (!antes || !depois) return []

  const diff: { campo: string; valorAntes: any; valorDepois: any }[] = []
  const todasChaves = new Set([...Object.keys(antes), ...Object.keys(depois)])

  // Chaves a ignorar (metadados internos)
  const ignorar = new Set(['id', 'version', 'needsSync', 'syncStatus', 'lastSyncedAt', 'deviceId', 'updatedAt', 'createdAt', 'deletedAt'])

  for (const chave of todasChaves) {
    if (ignorar.has(chave)) continue
    const valAntes = antes[chave]
    const valDepois = depois[chave]
    if (JSON.stringify(valAntes) !== JSON.stringify(valDepois)) {
      diff.push({ campo: chave, valorAntes: valAntes, valorDepois: valDepois })
    }
  }

  return diff
}

// ============================================================================
// HELPER — formatar diff para exibição em texto
// ============================================================================

export function formatarDiffParaResumo(diff: ReturnType<typeof gerarDiff>): string {
  if (diff.length === 0) return ''
  return diff.map(d => {
    const antes = d.valorAntes === null || d.valorAntes === undefined ? '—' : String(d.valorAntes)
    const depois = d.valorDepois === null || d.valorDepois === undefined ? '—' : String(d.valorDepois)
    return `${d.campo}: ${antes} → ${depois}`
  }).join(', ')
}

// ============================================================================
// HELPER — gerar nome legível da entidade a partir dos detalhes
// ============================================================================

export function getEntidadeNome(detalhes: Record<string, any> | null | undefined, entidade: string): string | undefined {
  if (!detalhes) return undefined
  return detalhes.nome || detalhes.nomeExibicao || detalhes.identificador || detalhes.email ||
    detalhes.descricao || detalhes.clienteNome || detalhes.produtoIdentificador || undefined
}
