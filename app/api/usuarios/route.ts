import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashSenha } from '@/lib/hash'
import { getAuthSession, unauthorized, serverError } from '@/lib/api-helpers'
import { PERMISSOES_PADRAO } from '@/lib/permissoes-padrao'
import { registrarAuditoria } from '@/lib/auditoria'
import { z } from 'zod'

// ─── Zod schemas for expanded permissions ──────────────────────────

const permissoesWebSchema = z.object({
  // Cadastros
  clientes: z.boolean().optional(),
  produtos: z.boolean().optional(),
  rotas: z.boolean().optional(),
  // Operações
  locacaoRelocacaoEstoque: z.boolean().optional(),
  cobrancas: z.boolean().optional(),
  manutencoes: z.boolean().optional(),
  relogios: z.boolean().optional(),
  // Visualização
  relatorios: z.boolean().optional(),
  dashboard: z.boolean().optional(),
  agenda: z.boolean().optional(),
  mapa: z.boolean().optional(),
  // Admin
  adminCadastros: z.boolean().optional(),
  adminUsuarios: z.boolean().optional(),
  adminDispositivos: z.boolean().optional(),
  adminSincronizacao: z.boolean().optional(),
  adminAuditoria: z.boolean().optional(),
})

const permissoesMobileSchema = z.object({
  // Cadastros
  clientes: z.boolean().optional(),
  produtos: z.boolean().optional(),
  // Operações
  alteracaoRelogio: z.boolean().optional(),
  locacaoRelocacaoEstoque: z.boolean().optional(),
  cobrancasFaturas: z.boolean().optional(),
  manutencoes: z.boolean().optional(),
  // Visualização
  relatorios: z.boolean().optional(),
  sincronizacao: z.boolean().optional(),
})

// ─── Strong password regex (matches auth-core policy) ──────────────

const SENHA_FORTE_REGEX = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{}|;:',.<>?\/]).{8,}$/

const createSchema = z.object({
  nome:            z.string().min(2),
  cpf:             z.string().optional(),
  telefone:        z.string().optional(),
  email:           z.string().email(),
  senha:           z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
    .regex(/[!@#$%^&*()_+\-=\[\]{}|;:',.<>?\/]/, 'Senha deve conter pelo menos um caractere especial'),
  tipoPermissao:   z.enum(['Administrador', 'Secretario', 'AcessoControlado']),
  permissoesWeb:   permissoesWebSchema.optional(),
  permissoesMobile: permissoesMobileSchema.optional(),
  rotasPermitidas: z.array(z.string()).optional(),
  status:          z.enum(['Ativo', 'Inativo']).optional(),
})

// ─── GET — Listar usuários ─────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session || session.user.tipoPermissao !== 'Administrador') return unauthorized()
  const usuarios = await prisma.usuario.findMany({
    where: { deletedAt: null },
    omit: { senha: true },  // Hash bcrypt nunca deve ser exposto via API
    include: {
      rotasPermitidasRel: {
        include: { rota: { select: { id: true, descricao: true } } }
      }
    },
    orderBy: { nome: 'asc' },
  })
  return NextResponse.json(usuarios)
}

// ─── POST — Criar usuário ──────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getAuthSession()
  if (!session || session.user.tipoPermissao !== 'Administrador') return unauthorized()
  
  try {
    const body = await req.json()
    const data = createSchema.parse(body)
    const { rotasPermitidas, senha, permissoesWeb, permissoesMobile, ...rest } = data
    const senhaHash = await hashSenha(senha)
    
    const usuario = await prisma.usuario.create({
      data: {
        ...rest,
        senha: senhaHash,
        permissoesWeb:    permissoesWeb || PERMISSOES_PADRAO[rest.tipoPermissao].web,
        permissoesMobile: permissoesMobile || PERMISSOES_PADRAO[rest.tipoPermissao].mobile,
        deviceId: 'web', 
        version: 1,
        rotasPermitidasRel: rotasPermitidas?.length 
          ? { create: rotasPermitidas.map(rotaId => ({ rotaId })) } 
          : undefined,
      },
    })

    // Registrar auditoria
    await registrarAuditoria({
      acao: 'criar_usuario',
      entidade: 'usuario',
      entidadeId: usuario.id,
      detalhes: { nome: usuario.nome, email: usuario.email, tipoPermissao: rest.tipoPermissao },
    })
    
    return NextResponse.json({ 
      id: usuario.id, 
      nome: usuario.nome, 
      email: usuario.email 
    }, { status: 201 })
    
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: err.errors }, { status: 400 })
    }
    console.error('[POST /usuarios]', err)
    return serverError()
  }
}
