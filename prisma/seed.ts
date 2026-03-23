// prisma/seed.ts
// Popula o banco com dados iniciais compatíveis com o mobile
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // Admin
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@locacao.com'
  const adminSenha = process.env.ADMIN_SENHA || 'admin123'
  const senhaHash  = await bcrypt.hash(adminSenha, 12)

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

  await prisma.usuario.upsert({
    where: { email: adminEmail },
    update: { senha: senhaHash },
    create: {
      id: 'usr_admin',
      nome: process.env.ADMIN_NOME || 'Administrador',
      email: adminEmail,
      senha: senhaHash,
      tipoPermissao: 'Administrador',
      permissoesWeb: permissoesAdmin,
      permissoesMobile: permissoesMobileAdmin,
      status: 'Ativo',
      deviceId: 'server',
    },
  })
  console.log(`✅ Admin criado: ${adminEmail}`)

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
  console.log(`✅ ${rotas.length} rotas criadas`)

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
  console.log(`✅ ${tiposProduto.length} tipos de produto criados`)

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
  console.log(`✅ ${descricoesProduto.length} descrições de produto criadas`)

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
  console.log(`✅ ${tamanhosProduto.length} tamanhos de produto criados`)

  // Dispositivo de teste
  await prisma.dispositivo.upsert({
    where: { chave: 'test-device-key' },
    update: {},
    create: {
      id: 'device_test',
      nome: 'Dispositivo de Teste',
      chave: 'test-device-key',
      tipo: 'Celular',
      status: 'ativo',
    },
  })
  console.log(`✅ Dispositivo de teste criado`)

  console.log('🎉 Seed concluído!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
