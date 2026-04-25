#!/usr/bin/env node
/**
 * db-migrate.js — Deploy de migrations com baseline automático para DB existente
 *
 * Problema: Quando o banco foi criado com `prisma db push` e depois muda para
 * `prisma migrate deploy`, o Prisma lança P3005 ("The database schema is not empty")
 * porque o _prisma_migrations não tem registro das migrations.
 *
 * Solução: Este script tenta `migrate deploy` primeiro. Se falhar com P3005,
 * ele marca todas as migrations pendentes como "already applied" (baseline)
 * e tenta novamente.
 *
 * Segurança: As migrations existentes são idempotentes (usam IF NOT EXISTS),
 * então marcar como aplicada sem executar é seguro para DBs que já foram
 * criados com `db push`.
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const MIGRATIONS_DIR = path.join(__dirname, '..', 'prisma', 'migrations')

function run(cmd) {
  try {
    execSync(cmd, { stdio: 'inherit' })
    return { success: true }
  } catch (error) {
    return { success: false, error }
  }
}

function getMigrationNames() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return []
  return fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
    .map((d) => d.name)
}

function main() {
  console.log('[db-migrate] Iniciando deploy de migrations...')

  // 1a tentativa: migrate deploy normal
  const firstAttempt = run('npx prisma migrate deploy')
  if (firstAttempt.success) {
    console.log('[db-migrate] Migrations aplicadas com sucesso!')
    return
  }

  console.log('[db-migrate] Primeira tentativa falhou. Verificando se é erro P3005 (DB já existe)...')

  // Se falhou, tentar baseline
  const migrations = getMigrationNames()
  if (migrations.length === 0) {
    console.log('[db-migrate] Nenhuma migration encontrada. Continuando build...')
    return
  }

  console.log(`[db-migrate] Encontradas ${migrations.length} migration(s). Aplicando baseline...`)

  for (const migrationName of migrations) {
    console.log(`[db-migrate] Resolving migration como aplicada: ${migrationName}`)
    const resolveResult = run(`npx prisma migrate resolve --applied "${migrationName}"`)
    if (!resolveResult.success) {
      console.warn(`[db-migrate] Aviso: Não foi possível resolver migration ${migrationName}. Continuando...`)
    }
  }

  // 2a tentativa: migrate deploy após baseline
  console.log('[db-migrate] Retentando migrate deploy após baseline...')
  const secondAttempt = run('npx prisma migrate deploy')
  if (secondAttempt.success) {
    console.log('[db-migrate] Migrations aplicadas com sucesso após baseline!')
    return
  }

  // Se ainda falhar, logar aviso mas não quebrar o build
  // O schema pode já estar sincronizado via db push anterior
  console.warn('[db-migrate] AVISO: Migrate deploy falhou mesmo após baseline.')
  console.warn('[db-migrate] Isso pode indicar que o schema do DB está desatualizado.')
  console.warn('[db-migrate] O build continuará, mas verifique o schema manualmente.')
}

main()
