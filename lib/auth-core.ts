// lib/auth-core.ts — Lógica central de autenticação (compartilhada entre web e mobile)
// Este módulo centraliza: validação de senha, lockout de conta, sessões e login unificado

import crypto from 'crypto'
import { prisma } from './prisma'
import { gerarToken } from './jwt'
import { verificarSenha } from './hash'
import { loginSchema } from './validations'
import { logger } from './logger'

// ─── Constantes ───────────────────────────────────────────────────────────────

export const ACCESS_TOKEN_EXPIRY = '15m'
export const REFRESH_TOKEN_EXPIRY_DAYS = 7
export const MAX_LOGIN_ATTEMPTS = 5
export const LOCKOUT_DURATION_MINUTES = 15
export const PASSWORD_MIN_LENGTH = 8

// ─── Helpers internos ─────────────────────────────────────────────────────────

/**
 * Gera hash SHA-256 do refresh token para armazenamento e busca no DB.
 * Usamos SHA-256 (em vez de bcrypt) porque:
 * - Refresh tokens são valores aleatórios de alta entropia (512 bits), não senhas
 * - SHA-256 é determinístico, permitindo busca O(1) pelo hash
 * - bcrypt geraria hashes diferentes a cada chamada, impossibilitando busca direta
 * - A segurança do token vem da entropia + HTTPS, não da lentidão do hash
 */
function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// ─── Validação de senha (política forte) ──────────────────────────────────────

/**
 * Valida a força da senha conforme política de segurança:
 * - Mínimo de 8 caracteres
 * - Pelo menos 1 letra maiúscula
 * - Pelo menos 1 letra minúscula
 * - Pelo menos 1 número
 * - Pelo menos 1 caractere especial
 */
export function validarForcaSenha(senha: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (senha.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres`)
  }
  if (!/[A-Z]/.test(senha)) {
    errors.push('Senha deve conter pelo menos uma letra maiúscula')
  }
  if (!/[a-z]/.test(senha)) {
    errors.push('Senha deve conter pelo menos uma letra minúscula')
  }
  if (!/[0-9]/.test(senha)) {
    errors.push('Senha deve conter pelo menos um número')
  }
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:',.<>?\/]/.test(senha)) {
    errors.push('Senha deve conter pelo menos um caractere especial')
  }

  return { valid: errors.length === 0, errors }
}

// ─── Bloqueio de conta (lockout) ──────────────────────────────────────────────

/**
 * Verifica se a conta do usuário está bloqueada por tentativas falhas de login.
 * Se o bloqueio expirou, reseta o contador automaticamente.
 */
export async function verificarLockout(email: string): Promise<{ locked: boolean; minutosRestantes?: number }> {
  const usuario = await prisma.usuario.findFirst({
    where: { email, deletedAt: null },
    select: { id: true, tentativasLoginFalhas: true, bloqueadoAte: true },
  })

  if (!usuario) {
    return { locked: false }
  }

  // Se não atingiu o limite, não está bloqueado
  if (usuario.tentativasLoginFalhas < MAX_LOGIN_ATTEMPTS) {
    return { locked: false }
  }

  // Se não tem data de bloqueio, não está bloqueado
  if (!usuario.bloqueadoAte) {
    return { locked: false }
  }

  const agora = new Date()

  // Se o bloqueio já expirou, resetar
  if (usuario.bloqueadoAte <= agora) {
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        tentativasLoginFalhas: 0,
        bloqueadoAte: null,
      },
    })
    return { locked: false }
  }

  // Ainda está bloqueado — calcular minutos restantes
  const msRestantes = usuario.bloqueadoAte.getTime() - agora.getTime()
  const minutosRestantes = Math.ceil(msRestantes / (60 * 1000))

  return { locked: true, minutosRestantes }
}

/**
 * Registra uma tentativa falha de login.
 * Incrementa o contador e, se atingir o limite, bloqueia a conta.
 * Funciona mesmo se o email não existir no banco (apenas registra no log).
 */
export async function registrarTentativaFalha(email: string, ip: string, userAgent?: string): Promise<void> {
  // Registrar tentativa no log de tentativas (sempre, mesmo para emails inexistentes)
  await prisma.tentativaLogin.create({
    data: {
      email,
      ip,
      sucesso: false,
      userAgent: userAgent || null,
    },
  })

  // Tentar incrementar contador de tentativas falhas no usuário
  // Usa findFirst + update para evitar erro se o email não existir
  const usuario = await prisma.usuario.findFirst({
    where: { email, deletedAt: null },
    select: { id: true, tentativasLoginFalhas: true },
  })

  if (!usuario) {
    // Email não existe no banco — não há conta para bloquear
    return
  }

  const novasTentativas = usuario.tentativasLoginFalhas + 1

  // Se atingiu o limite, bloquear a conta
  if (novasTentativas >= MAX_LOGIN_ATTEMPTS) {
    const bloqueadoAte = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        tentativasLoginFalhas: novasTentativas,
        bloqueadoAte,
      },
    })
    logger.warn(`[auth-core] Conta bloqueada por ${LOCKOUT_DURATION_MINUTES} minutos: ${email}`)
  } else {
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { tentativasLoginFalhas: novasTentativas },
    })
  }
}

/**
 * Registra uma tentativa bem-sucedida de login.
 * Reseta o contador de tentativas falhas e remove o bloqueio.
 */
export async function registrarTentativaSucesso(usuarioId: string, email: string, ip: string, userAgent?: string): Promise<void> {
  // Resetar tentativas falhas e bloqueio
  await prisma.usuario.update({
    where: { id: usuarioId },
    data: {
      tentativasLoginFalhas: 0,
      bloqueadoAte: null,
    },
  })

  // Registrar tentativa no log
  await prisma.tentativaLogin.create({
    data: {
      email,
      ip,
      sucesso: true,
      userAgent: userAgent || null,
    },
  })
}

// ─── Gerenciamento de sessões ─────────────────────────────────────────────────

/**
 * Cria uma nova sessão para o usuário.
 * Gera access token (JWT curto) e refresh token (hash SHA-256 armazenado no DB).
 */
export async function criarSessao(
  usuarioId: string,
  dispositivo: string,
  ip?: string,
  userAgent?: string
): Promise<{ accessToken: string; refreshToken: string }> {
  // Buscar dados do usuário para o access token
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { id: true, email: true, nome: true, tipoPermissao: true },
  })

  if (!usuario) {
    throw new Error(`Usuário não encontrado: ${usuarioId}`)
  }

  // Gerar access token (JWT de 15min)
  const accessToken = gerarToken({
    sub: usuario.id,
    email: usuario.email,
    nome: usuario.nome,
    tipoPermissao: usuario.tipoPermissao,
  })

  // Gerar refresh token (criptograficamente seguro — 64 bytes = 512 bits de entropia)
  const refreshToken = crypto.randomBytes(64).toString('hex')

  // Hash SHA-256 do refresh token para armazenar no DB
  // SHA-256 é determinístico, permitindo busca O(1) pelo hash
  const refreshTokenHash = hashRefreshToken(refreshToken)

  // Calcular data de expiração
  const expiraEm = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  // Armazenar sessão no DB
  await prisma.sessao.create({
    data: {
      usuarioId,
      refreshToken: refreshTokenHash,
      dispositivo,
      ip: ip || null,
      userAgent: userAgent || null,
      expiraEm,
    },
  })

  return { accessToken, refreshToken }
}

/**
 * Valida um refresh token contra o banco de dados.
 * Busca pelo hash SHA-256 (O(1)) e verifica se a sessão não expirou e o usuário está ativo.
 */
export async function validarRefreshToken(
  refreshToken: string
): Promise<{ valid: boolean; usuarioId?: string; sessaoId?: string }> {
  const tokenHash = hashRefreshToken(refreshToken)
  const agora = new Date()

  // Busca direta pelo hash — O(1) graças ao índice único
  const sessao = await prisma.sessao.findUnique({
    where: { refreshToken: tokenHash },
    include: {
      usuario: {
        select: { id: true, status: true, bloqueado: true, deletedAt: true },
      },
    },
  })

  if (!sessao) {
    return { valid: false }
  }

  // Verificar se a sessão expirou
  if (sessao.expiraEm <= agora) {
    // Sessão expirada — remover do DB
    await prisma.sessao.delete({ where: { id: sessao.id } }).catch(() => {})
    return { valid: false }
  }

  // Verificar se o usuário ainda está ativo
  if (
    sessao.usuario.status !== 'Ativo' ||
    sessao.usuario.bloqueado ||
    sessao.usuario.deletedAt
  ) {
    // Usuário inativo — remover sessão
    await prisma.sessao.delete({ where: { id: sessao.id } }).catch(() => {})
    return { valid: false }
  }

  return {
    valid: true,
    usuarioId: sessao.usuarioId,
    sessaoId: sessao.id,
  }
}

/**
 * Revoga uma sessão específica (logout de um dispositivo).
 * Busca pelo hash SHA-256 do refresh token e remove a sessão do DB.
 * Retorna true se a sessão foi encontrada e removida.
 */
export async function revogarSessao(refreshToken: string): Promise<boolean> {
  const tokenHash = hashRefreshToken(refreshToken)

  try {
    const sessao = await prisma.sessao.findUnique({
      where: { refreshToken: tokenHash },
      select: { id: true },
    })

    if (!sessao) {
      return false
    }

    await prisma.sessao.delete({ where: { id: sessao.id } })
    return true
  } catch {
    return false
  }
}

/**
 * Revoga todas as sessões de um usuário (forçar logout em todos os dispositivos).
 * Retorna o número de sessões removidas.
 */
export async function revogarTodasSessoes(usuarioId: string): Promise<number> {
  const result = await prisma.sessao.deleteMany({
    where: { usuarioId },
  })
  return result.count
}

/**
 * Remove sessões expiradas do banco de dados.
 * Pode ser chamado periodicamente para limpeza.
 */
export async function limparSessoesExpiradas(): Promise<number> {
  const result = await prisma.sessao.deleteMany({
    where: { expiraEm: { lt: new Date() } },
  })
  return result.count
}

// ─── Rate limiting persistente via DB ─────────────────────────────────────────

const RATE_LIMIT_WINDOW_MINUTES = 15
const RATE_LIMIT_MAX_ATTEMPTS = 10

/**
 * Verifica rate limiting persistente consultando a tabela TentativaLogin.
 * Ao contrário do rate limiter in-memory, este sobrevive a cold starts no Vercel
 * e funciona em múltiplas instâncias simultâneas.
 *
 * Conta tentativas falhas nos últimos 15 minutos para o email informado.
 * Se exceder o limite (10 tentativas), bloqueia novas tentativas.
 */
export async function checkDbRateLimit(
  email: string
): Promise<{ allowed: boolean; tentativasRestantes: number; resetEmMinutos: number }> {
  const janela = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000)

  const tentativasRecentes = await prisma.tentativaLogin.count({
    where: {
      email,
      sucesso: false,
      createdAt: { gte: janela },
    },
  })

  const allowed = tentativasRecentes < RATE_LIMIT_MAX_ATTEMPTS
  const tentativasRestantes = Math.max(0, RATE_LIMIT_MAX_ATTEMPTS - tentativasRecentes - 1)

  return {
    allowed,
    tentativasRestantes,
    resetEmMinutos: RATE_LIMIT_WINDOW_MINUTES,
  }
}

// ─── Login unificado ──────────────────────────────────────────────────────────

/**
 * Função unificada de login — substitui o código duplicado em /api/auth/login e /api/mobile/auth/login.
 * 
 * Fluxo:
 * 1. Validar entrada com Zod
 * 2. Verificar lockout da conta
 * 3. Buscar usuário (ativo, não bloqueado, não excluído)
 * 4. Verificar senha
 * 5. Em caso de falha: registrar tentativa falha e retornar erro
 * 6. Em caso de sucesso: registrar tentativa sucesso, criar sessão, atualizar último acesso
 * 7. Retornar tokens + dados do usuário
 */
export async function executarLogin(params: {
  email: string
  senha: string
  dispositivo: 'Web' | 'Mobile'
  ip?: string
  userAgent?: string
}): Promise<
  | { success: true; accessToken: string; refreshToken: string; user: object }
  | { success: false; error: string; status: number; lockoutInfo?: { minutosRestantes: number } }
> {
  const { email, senha, dispositivo, ip, userAgent } = params

  try {
    // 1. Validar entrada com Zod
    const parsed = loginSchema.safeParse({ email, senha, dispositivo })
    if (!parsed.success) {
      return { success: false, error: 'Dados inválidos', status: 400 }
    }

    // 1.5. Verificar rate limiting persistente via DB
    const rateLimit = await checkDbRateLimit(email)
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: `Muitas tentativas de login. Tente novamente em ${rateLimit.resetEmMinutos} minutos.`,
        status: 429,
      }
    }

    // 2. Verificar lockout da conta
    const lockout = await verificarLockout(email)
    if (lockout.locked) {
      return {
        success: false,
        error: `Conta bloqueada. Tente novamente em ${lockout.minutosRestantes} minutos.`,
        status: 423,
        lockoutInfo: { minutosRestantes: lockout.minutosRestantes! },
      }
    }

    // 3. Buscar usuário (ativo, não bloqueado, não excluído)
    const usuario = await prisma.usuario.findFirst({
      where: { email, status: 'Ativo', bloqueado: false, deletedAt: null },
      include: { rotasPermitidasRel: { include: { rota: true } } },
    })

    if (!usuario) {
      // Registrar tentativa falha mesmo sem encontrar o usuário (para auditoria e lockout por email)
      await registrarTentativaFalha(email, ip || 'unknown', userAgent)
      return { success: false, error: 'Email e/ou senha incorretos', status: 401 }
    }

    // 4. Verificar senha
    const senhaOk = await verificarSenha(senha, usuario.senha)
    if (!senhaOk) {
      // 5. Em caso de falha: registrar tentativa falha
      await registrarTentativaFalha(email, ip || 'unknown', userAgent)
      return { success: false, error: 'Email e/ou senha incorretos', status: 401 }
    }

    // 6. Em caso de sucesso: registrar tentativa sucesso, criar sessão, atualizar último acesso
    await registrarTentativaSucesso(usuario.id, email, ip || 'unknown', userAgent)

    const { accessToken, refreshToken } = await criarSessao(
      usuario.id,
      dispositivo,
      ip,
      userAgent
    )

    // Atualizar último acesso
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        dataUltimoAcesso: new Date().toISOString(),
        ultimoAcessoDispositivo: dispositivo,
      },
    })

    // Montar rotas permitidas
    const rotasPermitidas = usuario.rotasPermitidasRel.map((ur) => ur.rotaId)

    // 7. Retornar tokens + dados do usuário
    return {
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        role: usuario.tipoPermissao,
        tipoPermissao: usuario.tipoPermissao,
        permissoes: {
          web: usuario.permissoesWeb,
          mobile: usuario.permissoesMobile,
        },
        rotasPermitidas,
        status: usuario.status,
      },
    }
  } catch (err) {
    logger.error('[auth-core] Erro no login:', err)
    return { success: false, error: 'Erro interno', status: 500 }
  }
}
