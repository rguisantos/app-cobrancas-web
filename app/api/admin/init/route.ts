// POST /api/admin/init — Inicializa o banco com usuário admin
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashSenha } from '@/lib/hash'
import { z } from 'zod'

const schema = z.object({
  secret: z.string(), // Chave secreta para autorizar
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { secret } = schema.parse(body)

    // Verificar chave secreta (usar mesma chave do JWT)
    if (secret !== (process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    console.log('[init] Iniciando inicialização do banco...')

    // Admin
    const adminEmail = 'admin@locacao.com'
    const adminSenha = 'admin123'
    const senhaHash = await hashSenha(adminSenha)

    const permissoesAdmin = {
      todosCadastros: true,
      locacaoRelocacaoEstoque: true,
      relatorios: true,
    }
    const permissoesMobileAdmin = {
      todosCadastros: true,
      alteracaoRelogio: true,
      locacaoRelocacaoEstoque: true,
      cobrancasFaturas: true,
    }

    const usuario = await prisma.usuario.upsert({
      where: { email: adminEmail },
      update: { senha: senhaHash, status: 'Ativo', bloqueado: false },
      create: {
        id: 'usr_admin',
        nome: 'Administrador',
        email: adminEmail,
        senha: senhaHash,
        tipoPermissao: 'Administrador',
        permissoesWeb: permissoesAdmin,
        permissoesMobile: permissoesMobileAdmin,
        rotasPermitidas: [],
        status: 'Ativo',
        deviceId: 'server',
        version: 1,
      },
    })
    console.log(`[init] Admin criado/atualizado: ${adminEmail}`)

    // Rotas de exemplo
    const rotas = [
      { id: 'rota_1', descricao: 'Linha Centro' },
      { id: 'rota_2', descricao: 'Linha Norte' },
      { id: 'rota_3', descricao: 'Linha Sul' },
    ]
    for (const rota of rotas) {
      await prisma.rota.upsert({
        where: { id: rota.id },
        update: {},
        create: { ...rota, deviceId: 'server' },
      })
    }
    console.log(`[init] ${rotas.length} rotas criadas`)

    // Tipos de Produto
    const tiposProduto = [
      { id: 'tipo_1', nome: 'Bilhar' },
      { id: 'tipo_2', nome: 'Jukebox Padrão Grande' },
      { id: 'tipo_3', nome: 'Jukebox Padrão Médio' },
      { id: 'tipo_4', nome: 'Mesa' },
      { id: 'tipo_5', nome: 'Pebolim' },
    ]
    for (const tipo of tiposProduto) {
      await prisma.tipoProduto.upsert({
        where: { id: tipo.id },
        update: { nome: tipo.nome },
        create: { id: tipo.id, nome: tipo.nome },
      })
    }
    console.log(`[init] ${tiposProduto.length} tipos de produto criados`)

    // Descrições de Produto (cores)
    const descricoesProduto = [
      { id: 'desc_1', nome: 'Azul' },
      { id: 'desc_2', nome: 'Branco/Carijo' },
      { id: 'desc_3', nome: 'Preto' },
      { id: 'desc_4', nome: 'Vermelho' },
      { id: 'desc_5', nome: 'Verde' },
      { id: 'desc_6', nome: 'Madeira Natural' },
      { id: 'desc_7', nome: 'Cinza' },
    ]
    for (const desc of descricoesProduto) {
      await prisma.descricaoProduto.upsert({
        where: { id: desc.id },
        update: { nome: desc.nome },
        create: { id: desc.id, nome: desc.nome },
      })
    }
    console.log(`[init] ${descricoesProduto.length} descrições de produto criadas`)

    // Tamanhos de Produto
    const tamanhosProduto = [
      { id: 'tam_1', nome: '2,00' },
      { id: 'tam_2', nome: '2,20' },
      { id: 'tam_3', nome: '2,40' },
      { id: 'tam_4', nome: '2,60' },
      { id: 'tam_5', nome: '2,80' },
      { id: 'tam_6', nome: 'Pequeno' },
      { id: 'tam_7', nome: 'Médio' },
      { id: 'tam_8', nome: 'Grande' },
    ]
    for (const tam of tamanhosProduto) {
      await prisma.tamanhoProduto.upsert({
        where: { id: tam.id },
        update: { nome: tam.nome },
        create: { id: tam.id, nome: tam.nome },
      })
    }
    console.log(`[init] ${tamanhosProduto.length} tamanhos de produto criados`)

    console.log('[init] Inicialização concluída!')

    return NextResponse.json({
      success: true,
      message: 'Banco inicializado com sucesso',
      admin: {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
      },
      counts: {
        rotas: rotas.length,
        tiposProduto: tiposProduto.length,
        descricoesProduto: descricoesProduto.length,
        tamanhosProduto: tamanhosProduto.length,
      },
    })
  } catch (err) {
    console.error('[init] Erro:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: err.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro interno', details: String(err) }, { status: 500 })
  }
}
