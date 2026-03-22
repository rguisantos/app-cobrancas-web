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

  console.log('🎉 Seed concluído!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
