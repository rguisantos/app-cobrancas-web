-- Migration: 20260427000000_auth_refactor
-- Refatoração do sistema de autenticação:
-- - Adiciona campos de lockout ao modelo Usuario
-- - Cria tabela de sessões (Sessao) — refresh token armazenado como hash SHA-256
-- - Cria tabela de tentativas de login (TentativaLogin)

-- AlterTable: Adicionar campos de lockout à tabela usuarios
ALTER TABLE "usuarios" ADD COLUMN "tentativasLoginFalhas" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "usuarios" ADD COLUMN "bloqueadoAte" TIMESTAMP(3);

-- CreateTable: Sessões de autenticação
CREATE TABLE "sessoes" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,  -- SHA-256 hash do refresh token (determinístico, permite busca O(1))
    "dispositivo" TEXT NOT NULL,   -- 'Web' | 'Mobile'
    "ip" TEXT,
    "userAgent" TEXT,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Tentativas de login
CREATE TABLE "tentativas_login" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "sucesso" BOOLEAN NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tentativas_login_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique constraint no refreshToken (hash SHA-256 — permite busca direta)
CREATE UNIQUE INDEX "sessoes_refreshToken_key" ON "sessoes"("refreshToken");

-- CreateIndex: Índices para performance de queries
CREATE INDEX "sessoes_usuarioId_idx" ON "sessoes"("usuarioId");
CREATE INDEX "sessoes_expiraEm_idx" ON "sessoes"("expiraEm");

CREATE INDEX "tentativas_login_email_createdAt_idx" ON "tentativas_login"("email", "createdAt");
CREATE INDEX "tentativas_login_ip_createdAt_idx" ON "tentativas_login"("ip", "createdAt");

-- AddForeignKey: Relação Sessao -> Usuario (cascade delete)
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
