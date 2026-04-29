-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "rotas" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Ativo',
    "cor" TEXT NOT NULL DEFAULT '#2563EB',
    "regiao" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "observacao" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'synced',
    "lastSyncedAt" TEXT,
    "needsSync" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deviceId" TEXT NOT NULL DEFAULT '',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'cliente',
    "tipoPessoa" TEXT NOT NULL,
    "identificador" TEXT NOT NULL,
    "cpf" TEXT,
    "rg" TEXT,
    "nomeCompleto" TEXT,
    "cnpj" TEXT,
    "razaoSocial" TEXT,
    "nomeFantasia" TEXT,
    "inscricaoEstadual" TEXT,
    "nomeExibicao" TEXT NOT NULL,
    "email" TEXT,
    "telefonePrincipal" TEXT NOT NULL,
    "contatos" JSONB,
    "cep" TEXT NOT NULL,
    "logradouro" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "complemento" TEXT,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "rotaId" TEXT,
    "rotaNome" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'Ativo',
    "dataCadastro" TEXT,
    "dataUltimaAlteracao" TEXT,
    "observacao" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'synced',
    "lastSyncedAt" TEXT,
    "needsSync" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deviceId" TEXT NOT NULL DEFAULT '',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'produto',
    "identificador" TEXT NOT NULL,
    "numeroRelogio" TEXT NOT NULL,
    "tipoId" TEXT NOT NULL,
    "tipoNome" TEXT NOT NULL,
    "descricaoId" TEXT NOT NULL,
    "descricaoNome" TEXT NOT NULL,
    "tamanhoId" TEXT NOT NULL,
    "tamanhoNome" TEXT NOT NULL,
    "codigoCH" TEXT,
    "codigoABLF" TEXT,
    "conservacao" TEXT NOT NULL,
    "statusProduto" TEXT NOT NULL DEFAULT 'Ativo',
    "dataFabricacao" TEXT,
    "dataUltimaManutencao" TEXT,
    "relatorioUltimaManutencao" TEXT,
    "dataAvaliacao" TEXT,
    "aprovacao" TEXT,
    "estabelecimento" TEXT,
    "observacao" TEXT,
    "dataCadastro" TEXT,
    "dataUltimaAlteracao" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'synced',
    "lastSyncedAt" TEXT,
    "needsSync" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deviceId" TEXT NOT NULL DEFAULT '',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locacoes" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'locacao',
    "clienteId" TEXT NOT NULL,
    "clienteNome" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "produtoIdentificador" TEXT NOT NULL,
    "produtoTipo" TEXT NOT NULL,
    "dataLocacao" TEXT NOT NULL,
    "dataFim" TEXT,
    "observacao" TEXT,
    "formaPagamento" TEXT NOT NULL,
    "numeroRelogio" TEXT NOT NULL,
    "precoFicha" DOUBLE PRECISION NOT NULL,
    "percentualEmpresa" DOUBLE PRECISION NOT NULL,
    "percentualCliente" DOUBLE PRECISION NOT NULL,
    "periodicidade" TEXT,
    "valorFixo" DOUBLE PRECISION,
    "dataPrimeiraCobranca" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Ativa',
    "ultimaLeituraRelogio" DOUBLE PRECISION,
    "dataUltimaCobranca" TEXT,
    "trocaPano" BOOLEAN NOT NULL DEFAULT false,
    "dataUltimaManutencao" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'synced',
    "lastSyncedAt" TEXT,
    "needsSync" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deviceId" TEXT NOT NULL DEFAULT '',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cobrancas" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'cobranca',
    "locacaoId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "clienteNome" TEXT NOT NULL,
    "produtoId" TEXT,
    "produtoIdentificador" TEXT NOT NULL,
    "dataInicio" TEXT NOT NULL,
    "dataFim" TEXT NOT NULL,
    "dataPagamento" TEXT,
    "relogioAnterior" DOUBLE PRECISION NOT NULL,
    "relogioAtual" DOUBLE PRECISION NOT NULL,
    "fichasRodadas" DOUBLE PRECISION NOT NULL,
    "valorFicha" DOUBLE PRECISION NOT NULL,
    "totalBruto" DOUBLE PRECISION NOT NULL,
    "descontoPartidasQtd" DOUBLE PRECISION,
    "descontoPartidasValor" DOUBLE PRECISION,
    "descontoDinheiro" DOUBLE PRECISION,
    "percentualEmpresa" DOUBLE PRECISION NOT NULL,
    "subtotalAposDescontos" DOUBLE PRECISION NOT NULL,
    "valorPercentual" DOUBLE PRECISION NOT NULL,
    "totalClientePaga" DOUBLE PRECISION NOT NULL,
    "valorRecebido" DOUBLE PRECISION NOT NULL,
    "saldoDevedorGerado" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "dataVencimento" TEXT,
    "observacao" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'synced',
    "lastSyncedAt" TEXT,
    "needsSync" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deviceId" TEXT NOT NULL DEFAULT '',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cobrancas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'usuario',
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "telefone" TEXT,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "tipoPermissao" TEXT NOT NULL,
    "permissoesWeb" JSONB NOT NULL,
    "permissoesMobile" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Ativo',
    "bloqueado" BOOLEAN NOT NULL DEFAULT false,
    "tentativasLoginFalhas" INTEGER NOT NULL DEFAULT 0,
    "bloqueadoAte" TIMESTAMP(3),
    "dataUltimoAcesso" TEXT,
    "ultimoAcessoDispositivo" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'synced',
    "lastSyncedAt" TEXT,
    "needsSync" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deviceId" TEXT NOT NULL DEFAULT '',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario_rotas" (
    "usuarioId" TEXT NOT NULL,
    "rotaId" TEXT NOT NULL,

    CONSTRAINT "usuario_rotas_pkey" PRIMARY KEY ("usuarioId","rotaId")
);

-- CreateTable
CREATE TABLE "dispositivos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "senhaNumerica" TEXT,
    "deviceKey" TEXT,
    "deviceName" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'Celular',
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "ativado" BOOLEAN NOT NULL DEFAULT false,
    "ultimaSincronizacao" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispositivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "change_logs" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceId" TEXT NOT NULL,
    "synced" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3),

    CONSTRAINT "change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_conflicts" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "localVersion" JSONB NOT NULL,
    "remoteVersion" JSONB NOT NULL,
    "conflictType" TEXT NOT NULL,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_relogio" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "relogioAnterior" TEXT NOT NULL,
    "relogioNovo" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "dataAlteracao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioResponsavel" TEXT NOT NULL,

    CONSTRAINT "historico_relogio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_produto" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "syncStatus" TEXT NOT NULL DEFAULT 'synced',
    "lastSyncedAt" TEXT,
    "needsSync" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deviceId" TEXT NOT NULL DEFAULT '',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "descricoes_produto" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "syncStatus" TEXT NOT NULL DEFAULT 'synced',
    "lastSyncedAt" TEXT,
    "needsSync" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deviceId" TEXT NOT NULL DEFAULT '',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "descricoes_produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tamanhos_produto" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "syncStatus" TEXT NOT NULL DEFAULT 'synced',
    "lastSyncedAt" TEXT,
    "needsSync" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deviceId" TEXT NOT NULL DEFAULT '',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tamanhos_produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manutencoes" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "produtoIdentificador" TEXT,
    "produtoTipo" TEXT,
    "clienteId" TEXT,
    "clienteNome" TEXT,
    "locacaoId" TEXT,
    "cobrancaId" TEXT,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT,
    "data" TEXT NOT NULL,
    "registradoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "manutencoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estabelecimentos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT,
    "observacao" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'synced',
    "lastSyncedAt" TEXT,
    "needsSync" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deviceId" TEXT NOT NULL DEFAULT '',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estabelecimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes" (
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

-- CreateTable
CREATE TABLE "metas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'receita',
    "valorMeta" DOUBLE PRECISION NOT NULL,
    "valorAtual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "rotaId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativa',
    "criadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessoes" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "dispositivo" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tentativas_login" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "sucesso" BOOLEAN NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tentativas_login_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens_recuperacao" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_recuperacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_auditoria" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT,
    "detalhes" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rotas_descricao_deletedAt_key" ON "rotas"("descricao", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_identificador_key" ON "clientes"("identificador");

-- CreateIndex
CREATE INDEX "clientes_rotaId_idx" ON "clientes"("rotaId");

-- CreateIndex
CREATE INDEX "clientes_status_idx" ON "clientes"("status");

-- CreateIndex
CREATE INDEX "clientes_updatedAt_idx" ON "clientes"("updatedAt");

-- CreateIndex
CREATE INDEX "clientes_deletedAt_updatedAt_idx" ON "clientes"("deletedAt", "updatedAt");

-- CreateIndex
CREATE INDEX "clientes_deviceId_updatedAt_idx" ON "clientes"("deviceId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "produtos_identificador_key" ON "produtos"("identificador");

-- CreateIndex
CREATE INDEX "produtos_identificador_idx" ON "produtos"("identificador");

-- CreateIndex
CREATE INDEX "produtos_statusProduto_idx" ON "produtos"("statusProduto");

-- CreateIndex
CREATE INDEX "produtos_tipoId_idx" ON "produtos"("tipoId");

-- CreateIndex
CREATE INDEX "produtos_updatedAt_idx" ON "produtos"("updatedAt");

-- CreateIndex
CREATE INDEX "produtos_deletedAt_updatedAt_idx" ON "produtos"("deletedAt", "updatedAt");

-- CreateIndex
CREATE INDEX "produtos_deviceId_updatedAt_idx" ON "produtos"("deviceId", "updatedAt");

-- CreateIndex
CREATE INDEX "locacoes_clienteId_idx" ON "locacoes"("clienteId");

-- CreateIndex
CREATE INDEX "locacoes_produtoId_idx" ON "locacoes"("produtoId");

-- CreateIndex
CREATE INDEX "locacoes_status_idx" ON "locacoes"("status");

-- CreateIndex
CREATE INDEX "locacoes_updatedAt_idx" ON "locacoes"("updatedAt");

-- CreateIndex
CREATE INDEX "locacoes_deletedAt_updatedAt_idx" ON "locacoes"("deletedAt", "updatedAt");

-- CreateIndex
CREATE INDEX "locacoes_deviceId_updatedAt_idx" ON "locacoes"("deviceId", "updatedAt");

-- CreateIndex
CREATE INDEX "cobrancas_clienteId_idx" ON "cobrancas"("clienteId");

-- CreateIndex
CREATE INDEX "cobrancas_status_idx" ON "cobrancas"("status");

-- CreateIndex
CREATE INDEX "cobrancas_dataFim_idx" ON "cobrancas"("dataFim");

-- CreateIndex
CREATE INDEX "cobrancas_updatedAt_idx" ON "cobrancas"("updatedAt");

-- CreateIndex
CREATE INDEX "cobrancas_locacaoId_idx" ON "cobrancas"("locacaoId");

-- CreateIndex
CREATE INDEX "cobrancas_deletedAt_updatedAt_idx" ON "cobrancas"("deletedAt", "updatedAt");

-- CreateIndex
CREATE INDEX "cobrancas_deviceId_updatedAt_idx" ON "cobrancas"("deviceId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_updatedAt_idx" ON "usuarios"("updatedAt");

-- CreateIndex
CREATE INDEX "usuarios_deletedAt_updatedAt_idx" ON "usuarios"("deletedAt", "updatedAt");

-- CreateIndex
CREATE INDEX "usuarios_status_idx" ON "usuarios"("status");

-- CreateIndex
CREATE INDEX "usuarios_tipoPermissao_idx" ON "usuarios"("tipoPermissao");

-- CreateIndex
CREATE UNIQUE INDEX "dispositivos_chave_key" ON "dispositivos"("chave");

-- CreateIndex
CREATE UNIQUE INDEX "dispositivos_deviceKey_key" ON "dispositivos"("deviceKey");

-- CreateIndex
CREATE INDEX "change_logs_entityType_entityId_idx" ON "change_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "change_logs_deviceId_synced_idx" ON "change_logs"("deviceId", "synced");

-- CreateIndex
CREATE INDEX "change_logs_timestamp_idx" ON "change_logs"("timestamp");

-- CreateIndex
CREATE INDEX "change_logs_synced_syncedAt_idx" ON "change_logs"("synced", "syncedAt");

-- CreateIndex
CREATE INDEX "manutencoes_produtoId_idx" ON "manutencoes"("produtoId");

-- CreateIndex
CREATE INDEX "manutencoes_data_idx" ON "manutencoes"("data");

-- CreateIndex
CREATE INDEX "notificacoes_usuarioId_lida_idx" ON "notificacoes"("usuarioId", "lida");

-- CreateIndex
CREATE INDEX "notificacoes_createdAt_idx" ON "notificacoes"("createdAt");

-- CreateIndex
CREATE INDEX "metas_status_idx" ON "metas"("status");

-- CreateIndex
CREATE INDEX "metas_dataInicio_dataFim_idx" ON "metas"("dataInicio", "dataFim");

-- CreateIndex
CREATE INDEX "metas_rotaId_idx" ON "metas"("rotaId");

-- CreateIndex
CREATE UNIQUE INDEX "sessoes_refreshToken_key" ON "sessoes"("refreshToken");

-- CreateIndex
CREATE INDEX "sessoes_usuarioId_idx" ON "sessoes"("usuarioId");

-- CreateIndex
CREATE INDEX "sessoes_refreshToken_idx" ON "sessoes"("refreshToken");

-- CreateIndex
CREATE INDEX "sessoes_expiraEm_idx" ON "sessoes"("expiraEm");

-- CreateIndex
CREATE INDEX "tentativas_login_email_createdAt_idx" ON "tentativas_login"("email", "createdAt");

-- CreateIndex
CREATE INDEX "tentativas_login_ip_createdAt_idx" ON "tentativas_login"("ip", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_recuperacao_token_key" ON "tokens_recuperacao"("token");

-- CreateIndex
CREATE INDEX "tokens_recuperacao_token_idx" ON "tokens_recuperacao"("token");

-- CreateIndex
CREATE INDEX "tokens_recuperacao_usuarioId_idx" ON "tokens_recuperacao"("usuarioId");

-- CreateIndex
CREATE INDEX "tokens_recuperacao_expiraEm_idx" ON "tokens_recuperacao"("expiraEm");

-- CreateIndex
CREATE INDEX "log_auditoria_usuarioId_idx" ON "log_auditoria"("usuarioId");

-- CreateIndex
CREATE INDEX "log_auditoria_acao_idx" ON "log_auditoria"("acao");

-- CreateIndex
CREATE INDEX "log_auditoria_entidade_entidadeId_idx" ON "log_auditoria"("entidade", "entidadeId");

-- CreateIndex
CREATE INDEX "log_auditoria_createdAt_idx" ON "log_auditoria"("createdAt");

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_rotaId_fkey" FOREIGN KEY ("rotaId") REFERENCES "rotas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locacoes" ADD CONSTRAINT "locacoes_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locacoes" ADD CONSTRAINT "locacoes_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobrancas" ADD CONSTRAINT "cobrancas_locacaoId_fkey" FOREIGN KEY ("locacaoId") REFERENCES "locacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobrancas" ADD CONSTRAINT "cobrancas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobrancas" ADD CONSTRAINT "cobrancas_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_rotas" ADD CONSTRAINT "usuario_rotas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_rotas" ADD CONSTRAINT "usuario_rotas_rotaId_fkey" FOREIGN KEY ("rotaId") REFERENCES "rotas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_relogio" ADD CONSTRAINT "historico_relogio_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manutencoes" ADD CONSTRAINT "manutencoes_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens_recuperacao" ADD CONSTRAINT "tokens_recuperacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_auditoria" ADD CONSTRAINT "log_auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

