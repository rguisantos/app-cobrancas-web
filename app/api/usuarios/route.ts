import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashSenha } from '@/lib/hash'
import { getAuthSession, unauthorized, serverError } from '@/lib/api-helpers'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session || session.user.tipoPermissao !== 'Administrador') return unauthorized()
  const usuarios = await prisma.usuario.findMany({
    where: { deletedAt: null },
    include: { 
      rotasPermitidasRel: { 
        include: { rota: { select: { id: true, descricao: true } } } 
      } 
    },
    orderBy: { nome: 'asc' },
  })
  return NextResponse.json(usuarios)
}

const createSchema = z.object({
  nome:            z.string().min(2),
  cpf:             z.string().optional(),
  telefone:        z.string().optional(),
  email:           z.string().email(),
  senha:           z.string().min(6),
  tipoPermissao:   z.enum(['Administrador', 'Secretario', 'AcessoControlado']),
  permissoesWeb:   z.object({
    todosCadastros:         z.boolean().optional(),
    locacaoRelocacaoEstoque: z.boolean().optional(),
    relatorios:             z.boolean().optional(),
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

export async function POST(req: NextRequest) {
  const session = await getAuthSession()
  if (!session || session.user.tipoPermissao !== 'Administrador') return unauthorized()
  
  try {
    const body = await req.json()
    const data = createSchema.parse(body)
    const { rotasPermitidas, senha, permissoesWeb, permissoesMobile, ...rest } = data
    const senhaHash = await hashSenha(senha)
    
    // Permissões padrão baseadas no tipo
    const permissoesPadrao = {
      Administrador: { 
        web: { todosCadastros: true, locacaoRelocacaoEstoque: true, relatorios: true }, 
        mobile: { todosCadastros: true, alteracaoRelogio: true, locacaoRelocacaoEstoque: true, cobrancasFaturas: true } 
      },
      Secretario: { 
        web: { todosCadastros: true, locacaoRelocacaoEstoque: true, relatorios: true }, 
        mobile: { todosCadastros: true, alteracaoRelogio: false, locacaoRelocacaoEstoque: true, cobrancasFaturas: true } 
      },
      AcessoControlado: { 
        web: { todosCadastros: false, locacaoRelocacaoEstoque: false, relatorios: false }, 
        mobile: { todosCadastros: false, alteracaoRelogio: false, locacaoRelocacaoEstoque: false, cobrancasFaturas: true } 
      },
    }
    
    const usuario = await prisma.usuario.create({
      data: {
        ...rest,
        senha: senhaHash,
        permissoesWeb:    permissoesWeb || permissoesPadrao[rest.tipoPermissao].web,
        permissoesMobile: permissoesMobile || permissoesPadrao[rest.tipoPermissao].mobile,
        deviceId: 'web', 
        version: 1,
        rotasPermitidas: rotasPermitidas || [],
        rotasPermitidasRel: rotasPermitidas?.length 
          ? { create: rotasPermitidas.map(rotaId => ({ rotaId })) } 
          : undefined,
      },
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
