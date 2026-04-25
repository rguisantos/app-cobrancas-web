// lib/notificacoes.ts — Funções utilitárias para criar notificações
import { prisma } from './prisma'

// ── Types ──────────────────────────────────────────────────────────────
interface CobrancaRef {
  id: string
  clienteId: string
  clienteNome: string
  produtoIdentificador: string
  status: string
  dataVencimento?: string | null
}

interface ClienteRef {
  id: string
  nomeExibicao: string
}

interface ConflitoRef {
  id: string
  entityType: string
  entityId: string
  conflictType: string
}

// ── Helper ─────────────────────────────────────────────────────────────
async function criarNotificacao(params: {
  usuarioId: string
  tipo: string
  titulo: string
  mensagem: string
  link?: string
}) {
  return prisma.notificacao.create({
    data: {
      usuarioId: params.usuarioId,
      tipo: params.tipo,
      titulo: params.titulo,
      mensagem: params.mensagem,
      link: params.link || null,
    },
  })
}

// ── Notificar cobrança vencida ────────────────────────────────────────
export async function notificarCobrancaVencida(
  usuarioId: string,
  cobranca: CobrancaRef
) {
  return criarNotificacao({
    usuarioId,
    tipo: 'cobranca_vencida',
    titulo: 'Cobrança vencida',
    mensagem: `A cobrança de ${cobranca.clienteNome} (${cobranca.produtoIdentificador}) está vencida.`,
    link: `/cobrancas/${cobranca.id}`,
  })
}

// ── Notificar saldo devedor ────────────────────────────────────────────
export async function notificarSaldoDevedor(
  usuarioId: string,
  cliente: ClienteRef,
  valor: number
) {
  return criarNotificacao({
    usuarioId,
    tipo: 'saldo_devedor',
    titulo: 'Saldo devedor detectado',
    mensagem: `${cliente.nomeExibicao} possui saldo devedor de R$ ${valor.toFixed(2)}.`,
    link: `/clientes/${cliente.id}`,
  })
}

// ── Notificar conflito de sincronização ────────────────────────────────
export async function notificarConflitoSync(
  usuarioId: string,
  conflito: ConflitoRef
) {
  const entityLabel = {
    cliente: 'cliente',
    produto: 'produto',
    locacao: 'locação',
    cobranca: 'cobrança',
  }[conflito.entityType] || conflito.entityType

  return criarNotificacao({
    usuarioId,
    tipo: 'conflito_sync',
    titulo: 'Conflito de sincronização',
    mensagem: `Conflito detectado no ${entityLabel} — resolução manual necessária.`,
    link: `/admin/sync`,
  })
}

// ── Notificar cobrança gerada ──────────────────────────────────────────
export async function notificarCobrancaGerada(
  usuarioId: string,
  cobranca: CobrancaRef
) {
  return criarNotificacao({
    usuarioId,
    tipo: 'cobranca_gerada',
    titulo: 'Nova cobrança gerada',
    mensagem: `Cobrança criada para ${cobranca.clienteNome} (${cobranca.produtoIdentificador}).`,
    link: `/cobrancas/${cobranca.id}`,
  })
}

// ── Notificação genérica (info) ────────────────────────────────────────
export async function notificarInfo(
  usuarioId: string,
  titulo: string,
  mensagem: string,
  link?: string
) {
  return criarNotificacao({
    usuarioId,
    tipo: 'info',
    titulo,
    mensagem,
    link,
  })
}
