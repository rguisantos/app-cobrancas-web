import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashSenha } from '@/lib/hash'
import { getAuthSession, unauthorized, notFound, serverError } from '@/lib/api-helpers'
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

const updateSchema = z.object({
  nome:            z.string().min(2).optional(),
  cpf:             z.string().optional(),
  telefone:        z.string().optional(),
  email:           z.string().email().optional(),
  senha:           z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
    .regex(/[!@#$%^&*()_+\-=\[\]{}|;:',.<>?\/]/, 'Senha deve conter pelo menos um caractere especial')
    .optional(),
  tipoPermissao:   z.enum(['Administrador', 'Secretario', 'AcessoControlado']).optional(),
  permissoesWeb:   permissoesWebSchema.optional(),
  permissoesMobile: permissoesMobileSchema.optional(),
  rotasPermitidas: z.array(z.string()).optional(),
  status:          z.enum(['Ativo', 'Inativo']).optional(),
})

const patchSchema = z.object({
  acao: z.enum(['toggleBlock']),
})

// ─── GET — Buscar usuário por ID ───────────────────────────────────

export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session) return unauthorized()
  
  const usuario = await prisma.usuario.findFirst({
    where: { id, deletedAt: null },
    omit: { senha: true },  // Hash bcrypt nunca deve ser exposto via API
    include: {
      rotasPermitidasRel: {
        include: { rota: { select: { id: true, descricao: true } } }
      }
    }
  })
  
  if (!usuario) return notFound('Usuário não encontrado')
  
  return NextResponse.json(usuario)
}

// ─── PUT — Atualizar usuário ───────────────────────────────────────

export async function PUT(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session || session.user.tipoPermissao !== 'Administrador') return unauthorized()
  
  try {
    const body = await req.json()
    const data = updateSchema.parse(body)
    const { rotasPermitidas, senha, permissoesWeb, permissoesMobile, ...rest } = data
    
    // Verificar se usuário existe
    const usuarioExistente = await prisma.usuario.findFirst({ 
      where: { id, deletedAt: null } 
    })
    if (!usuarioExistente) return notFound('Usuário não encontrado')
    
    // Preparar dados para atualização
    const updateData: any = {
      ...rest,
      version: { increment: 1 },
      updatedAt: new Date(),
    }
    
    // Só atualizar senha se fornecida
    if (senha) {
      updateData.senha = await hashSenha(senha)
    }
    
    // Se o tipoPermissao mudou e permissões não foram fornecidas, aplicar padrão do novo tipo
    if (rest.tipoPermissao && rest.tipoPermissao !== usuarioExistente.tipoPermissao) {
      if (!permissoesWeb) {
        updateData.permissoesWeb = PERMISSOES_PADRAO[rest.tipoPermissao as keyof typeof PERMISSOES_PADRAO].web
      }
      if (!permissoesMobile) {
        updateData.permissoesMobile = PERMISSOES_PADRAO[rest.tipoPermissao as keyof typeof PERMISSOES_PADRAO].mobile
      }
    }
    
    // Atualizar permissões se fornecidas
    if (permissoesWeb) {
      updateData.permissoesWeb = permissoesWeb
    }
    if (permissoesMobile) {
      updateData.permissoesMobile = permissoesMobile
    }
    
    // Atualizar rotas permitidas (relação) se fornecidas
    if (rotasPermitidas !== undefined) {
      // Remover relações antigas e criar novas
      await prisma.usuarioRota.deleteMany({ where: { usuarioId: id } })
      if (rotasPermitidas.length > 0) {
        await prisma.usuarioRota.createMany({
          data: rotasPermitidas.map(rotaId => ({ usuarioId: id, rotaId }))
        })
      }
    }
    
    const usuario = await prisma.usuario.update({
      where: { id },
      data: updateData,
    })

    // Registrar auditoria
    const detalhesAlteracao: Record<string, any> = {}
    if (rest.nome && rest.nome !== usuarioExistente.nome) detalhesAlteracao.nome = rest.nome
    if (rest.email && rest.email !== usuarioExistente.email) detalhesAlteracao.email = rest.email
    if (rest.tipoPermissao && rest.tipoPermissao !== usuarioExistente.tipoPermissao) {
      detalhesAlteracao.tipoPermissao = { de: usuarioExistente.tipoPermissao, para: rest.tipoPermissao }
    }
    if (permissoesWeb) detalhesAlteracao.permissoesWebAlteradas = true
    if (permissoesMobile) detalhesAlteracao.permissoesMobileAlteradas = true
    if (rotasPermitidas !== undefined) detalhesAlteracao.rotasAlteradas = true
    if (senha) detalhesAlteracao.senhaAlterada = true

    await registrarAuditoria({
      acao: permissoesWeb || permissoesMobile ? 'alterar_permissao' : 'editar_usuario',
      entidade: 'usuario',
      entidadeId: id,
      detalhes: detalhesAlteracao,
    })
    
    const { senha: _, ...usuarioSemSenha } = usuario
    return NextResponse.json(usuarioSemSenha)
    
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: err.errors }, { status: 400 })
    }
    console.error('[PUT /usuarios/:id]', err)
    return serverError()
  }
}

// ─── PATCH — Ações especiais (toggle block) ────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session || session.user.tipoPermissao !== 'Administrador') return unauthorized()

  try {
    const body = await req.json()
    const { acao } = patchSchema.parse(body)

    const usuario = await prisma.usuario.findFirst({ where: { id, deletedAt: null } })
    if (!usuario) return notFound('Usuário não encontrado')

    if (acao === 'toggleBlock') {
      const novoBloqueio = !usuario.bloqueado
      await prisma.usuario.update({
        where: { id },
        data: {
          bloqueado: novoBloqueio,
          ...(novoBloqueio ? { tentativasLoginFalhas: 0, bloqueadoAte: null } : {}),
        },
      })

      await registrarAuditoria({
        acao: novoBloqueio ? 'editar_usuario' : 'desbloquear_usuario',
        entidade: 'usuario',
        entidadeId: id,
        detalhes: { nome: usuario.nome, email: usuario.email, bloqueado: novoBloqueio },
      })

      return NextResponse.json({ success: true, bloqueado: novoBloqueio })
    }

    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: err.errors }, { status: 400 })
    }
    console.error('[PATCH /usuarios/:id]', err)
    return serverError()
  }
}

// ─── DELETE — Soft delete ──────────────────────────────────────────

export async function DELETE(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session || session.user.tipoPermissao !== 'Administrador') return unauthorized()
  
  try {
    const usuario = await prisma.usuario.findFirst({ where: { id, deletedAt: null } })
    if (!usuario) return notFound('Usuário não encontrado')

    // Soft delete
    await prisma.usuario.update({
      where: { id },
      data: { deletedAt: new Date() }
    })

    // Revogar todas as sessões do usuário
    await prisma.sessao.deleteMany({ where: { usuarioId: id } })

    // Registrar auditoria
    await registrarAuditoria({
      acao: 'excluir_usuario',
      entidade: 'usuario',
      entidadeId: id,
      detalhes: { nome: usuario.nome, email: usuario.email },
    })
    
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /usuarios/:id]', err)
    return serverError()
  }
}
