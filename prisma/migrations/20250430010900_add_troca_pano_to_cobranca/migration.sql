-- AlterTable: Add trocaPano column to cobrancas table
ALTER TABLE "cobrancas" ADD COLUMN "trocaPano" BOOLEAN NOT NULL DEFAULT false;
