-- AddColumn
-- Esta migration adiciona a coluna saldo_devedor_gerado se ela nao existir

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cobrancas' AND column_name = 'saldo_devedor_gerado'
    ) THEN
        ALTER TABLE "cobrancas" ADD COLUMN "saldo_devedor_gerado" DOUBLE PRECISION NOT NULL DEFAULT 0;
    END IF;
END $$;
