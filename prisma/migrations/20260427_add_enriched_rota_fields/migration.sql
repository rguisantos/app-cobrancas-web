-- AlterTable: Adicionar campos enriquecidos na tabela rotas
ALTER TABLE "rotas" ADD COLUMN "cor" TEXT NOT NULL DEFAULT '#2563EB';
ALTER TABLE "rotas" ADD COLUMN "regiao" TEXT;
ALTER TABLE "rotas" ADD COLUMN "ordem" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "rotas" ADD COLUMN "observacao" TEXT;

-- AlterTable: Tornar rotaId do cliente nullable (cliente pode ficar sem rota)
ALTER TABLE "clientes" ALTER COLUMN "rotaId" DROP NOT NULL;
