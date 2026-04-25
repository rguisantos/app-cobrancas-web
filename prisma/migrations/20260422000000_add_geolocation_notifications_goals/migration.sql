-- ============================================================
-- Migração: Adicionar coordenadas geográficas, notificações e metas
-- Data: 2026-04-22
-- Descrição: Adiciona latitude/longitude em clientes, tabela de
--            notificações e tabela de metas
-- ============================================================

-- 1. Adicionar colunas de coordenadas geográficas na tabela clientes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clientes' AND column_name = 'latitude'
    ) THEN
        ALTER TABLE "clientes" ADD COLUMN "latitude" DOUBLE PRECISION;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clientes' AND column_name = 'longitude'
    ) THEN
        ALTER TABLE "clientes" ADD COLUMN "longitude" DOUBLE PRECISION;
    END IF;
END $$;

-- 2. Criar tabela de notificações
CREATE TABLE IF NOT EXISTS "notificacoes" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- Índices da tabela notificacoes
CREATE INDEX IF NOT EXISTS "notificacoes_usuarioId_lida_idx" ON "notificacoes"("usuarioId", "lida");
CREATE INDEX IF NOT EXISTS "notificacoes_createdAt_idx" ON "notificacoes"("createdAt");

-- Foreign key: notificacoes -> usuarios
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'notificacoes_usuarioId_fkey'
    ) THEN
        ALTER TABLE "notificacoes"
        ADD CONSTRAINT "notificacoes_usuarioId_fkey"
        FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 3. Criar tabela de metas
CREATE TABLE IF NOT EXISTS "metas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'receita',
    "valorMeta" DOUBLE PRECISION NOT NULL,
    "valorAtual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotaId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativa',
    "criadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metas_pkey" PRIMARY KEY ("id")
);

-- Índices da tabela metas
CREATE INDEX IF NOT EXISTS "metas_status_idx" ON "metas"("status");
CREATE INDEX IF NOT EXISTS "metas_dataInicio_dataFim_idx" ON "metas"("dataInicio", "dataFim");
CREATE INDEX IF NOT EXISTS "metas_rotaId_idx" ON "metas"("rotaId");
