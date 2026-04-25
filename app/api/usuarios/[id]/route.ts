import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashSenha } from '@/lib/hash'
import { getAuthSession, unauthorized, notFound, serverError } from '@/lib/api-helpers'
import { z } from 'zod'

const updateSchema = z.object({
  nome:            z.string().min(2).optional(),
  cpf:             z.string().optional(),
  telefone:        z.string().optional(),
  email:           z.string().email().optional(),
  senha:           z.string().min(6).optional(),
  tipoPermissao:   z.enum(['Administrador', 'Secretario', 'AcessoControlado']).optional(),
  permissoesWeb:   z.object({
    todosCadastros:          z.boolean().optional(),
    locacaoRelocacaoEstoque: z.boolean().optional(),
    relatorios:              z.boolean().optional(),
  }).optional(),
  permissoesMobile: z.object({
    todosCadastros:          z.boolean().optional(),
    alteracaoRelogio:        z.boolean().optional(),
    locacaoRelocacaoEstoque: z.boolean().optional(),
    cobrancasFaturas:        z.boolean().optional(),
  }).optional(),
  rotasPermitidas: z.array(z.string()).optional(),
  status:          z.enum(['Ativo', 'Inativo']).optional(),
})

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
  
  // Senha já foi omitida na query
  return NextResponse.json(usuario)
}

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
    
    // Atualizar permissões se fornecidas
    if (permissoesWeb) {
      updateData.permissoesWeb = permissoesWeb
    }
    if (permissoesMobile) {
      updateData.permissoesMobile = permissoesMobile
    }
    
    // Atualizar rotas permitidas se fornecidas
    if (rotasPermitidas !== undefined) {
      updateData.rotasPermitidas = rotasPermitidas
      
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

export async function DELETE(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getAuthSession()
  if (!session || session.user.tipoPermissao !== 'Administrador') return unauthorized()
  
  try {
    // Soft delete
    await prisma.usuario.update({
      where: { id },
      data: { deletedAt: new Date() }
    })
    
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /usuarios/:id]', err)
    return serverError()
  }
}
