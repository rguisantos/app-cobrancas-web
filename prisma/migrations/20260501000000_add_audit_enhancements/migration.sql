-- Enhance LogAuditoria with new fields for comprehensive audit tracking

-- Add entidadeNome column
ALTER TABLE "log_auditoria" ADD COLUMN IF NOT EXISTS "entidadeNome" TEXT;

-- Add antes column (snapshot before change)
ALTER TABLE "log_auditoria" ADD COLUMN IF NOT EXISTS "antes" JSONB;

-- Add depois column (snapshot after change)
ALTER TABLE "log_auditoria" ADD COLUMN IF NOT EXISTS "depois" JSONB;

-- Add dispositivo column (parsed device info)
ALTER TABLE "log_auditoria" ADD COLUMN IF NOT EXISTS "dispositivo" TEXT;

-- Add severidade column (info/aviso/critico/seguranca)
ALTER TABLE "log_auditoria" ADD COLUMN IF NOT EXISTS "severidade" TEXT NOT NULL DEFAULT 'info';

-- Add origem column (web/mobile/sistema/cron)
ALTER TABLE "log_auditoria" ADD COLUMN IF NOT EXISTS "origem" TEXT NOT NULL DEFAULT 'web';

-- Update existing records: set severidade based on acao
UPDATE "log_auditoria" SET "severidade" = 'seguranca'
WHERE "acao" IN ('login', 'logout', 'login_falha', 'alterar_senha', 'reset_senha', 'recuperar_senha', 'desbloquear_usuario', 'alterar_permissao');

UPDATE "log_auditoria" SET "severidade" = 'critico'
WHERE "acao" IN ('criar_cobranca', 'editar_cobranca', 'excluir_cobranca', 'alterar_status_cobranca', 'login_falha');

UPDATE "log_auditoria" SET "severidade" = 'aviso'
WHERE "acao" IN ('editar_usuario', 'editar_cliente', 'editar_produto', 'editar_locacao', 'editar_rota', 'excluir_locacao', 'excluir_cliente', 'excluir_produto', 'excluir_rota', 'finalizar_locacao', 'relocar_locacao', 'enviar_estoque');

-- Update existing records: set origem based on userAgent
UPDATE "log_auditoria" SET "origem" = 'mobile'
WHERE "userAgent" ILIKE '%okhttp%' OR "userAgent" ILIKE '%react-native%' OR "userAgent" ILIKE '%expo%';

UPDATE "log_auditoria" SET "origem" = 'sistema'
WHERE "userAgent" IS NULL AND "usuarioId" IS NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS "log_auditoria_severidade_idx" ON "log_auditoria"("severidade");
CREATE INDEX IF NOT EXISTS "log_auditoria_origem_idx" ON "log_auditoria"("origem");
