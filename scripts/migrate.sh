#!/bin/bash
# ============================================================
# Script de Migração - App Cobranças Web
# Executa migrações pendentes e sincroniza o schema com o banco
# Uso: ./scripts/migrate.sh
# ============================================================

set -e

echo "🔄 Verificando variáveis de ambiente..."

if [ -z "$DATABASE_URL" ]; then
    if [ -f .env ]; then
        echo "📋 Carregando .env..."
        export $(grep -v '^#' .env | grep DATABASE_URL | xargs)
    else
        echo "❌ DATABASE_URL não definida e .env não encontrado!"
        echo "   Crie o arquivo .env a partir do .env.example"
        exit 1
    fi
fi

echo "✅ DATABASE_URL configurada"
echo ""
echo "📦 Executando prisma migrate deploy..."
npx prisma migrate deploy

echo ""
echo "🔄 Gerando Prisma Client..."
npx prisma generate

echo ""
echo "✅ Migração concluída com sucesso!"
