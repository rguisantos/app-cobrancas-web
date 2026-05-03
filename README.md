# 📋 App Cobranças — Sistema Web + Backend

Sistema completo de gestão de cobranças para empresas de locação de equipamentos (bilhares, jukeboxes, mesas, etc.) com sincronização bidirecional entre aplicativo mobile e servidor web.

---

## 📑 Índice

- [Visão Geral](#visão-geral)
- [Stack Tecnológica](#stack-tecnológica)
- [Início Rápido](#início-rápido)
- [Estrutura do Banco de Dados](#estrutura-do-banco-de-dados)
- [APIs e Endpoints](#apis-e-endpoints)
- [Páginas do Sistema](#páginas-do-sistema)
- [Sistema de Sincronização](#sistema-de-sincronização)
- [Sistema de Autenticação](#sistema-de-autenticação)
- [Permissões e Controle de Acesso](#permissões-e-controle-de-acesso)
- [Cálculos de Cobrança](#cálculos-de-cobrança)
- [Fluxos de Negócio](#fluxos-de-negócio)
- [Segurança e Middleware](#segurança-e-middleware)
- [Motor de Sincronização](#motor-de-sincronização)
- [Sistema de Auditoria](#sistema-de-auditoria)
- [Automação (Cron Jobs)](#automação-cron-jobs)
- [Sistema de Email](#sistema-de-email)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Pacote Compartilhado (@cobrancas/shared)](#pacote-compartilhado-cobrancasshared)
- [Deploy](#deploy)
- [Problemas Conhecidos](#problemas-conhecidos)

---

## Visão Geral

O **App Cobranças Web** é uma plataforma completa para:

- 📊 **Gestão de Clientes** - Cadastro completo com endereço, contatos e vinculação a rotas
- 🎱 **Controle de Produtos** - Bilhares, jukeboxes, mesas e outros equipamentos
- 📍 **Gestão de Locações** - Contratos de locação com diferentes formas de pagamento
- 💰 **Cobranças** - Registro de leituras de relógio, cálculo de valores e controle de pagamentos
- 🗺️ **Mapa de Rotas** - Visualização interativa com dados financeiros no mapa (Leaflet)
- 📅 **Agenda** - Calendário de pagamentos e vencimentos
- 🎯 **Metas** - Metas de arrecadação por período e rota
- 🔄 **Sincronização Mobile** - Dados disponíveis offline no aplicativo mobile
- 🔒 **Auditoria** - Rastreamento completo de ações no sistema
- 📧 **Email** - Notificação automática de cobranças atrasadas
- ⏰ **Automação** - Geração automática de cobranças e marcação de vencimentos
- 👥 **Usuários** - Controle de acesso com diferentes níveis de permissão
- 🔔 **Notificações** - Alertas de cobranças vencidas, conflitos de sync e mais

---

## Stack Tecnológica

| Tecnologia | Versão | Finalidade |
|------------|--------|------------|
| **Next.js** | 15.x | Framework full-stack (App Router) |
| **React** | 19.x | Interface de usuário |
| **TypeScript** | 5.x | Tipagem estática |
| **PostgreSQL** | 15+ | Banco de dados relacional (Neon) |
| **Prisma** | 6.x | ORM com type-safety |
| **NextAuth** | 4.x | Autenticação web |
| **JWT** | - | Autenticação mobile |
| **Tailwind CSS** | 3.x | Estilização |
| **Zod** | 3.x | Validação de schemas |
| **Lucide React** | - | Ícones |
| **Leaflet / React-Leaflet** | 5.x | Mapa interativo |
| **Recharts** | 2.x | Gráficos e visualizações |
| **date-fns** | 3.x | Manipulação de datas |
| **bcryptjs** | - | Hash de senhas |
| **Nodemailer** | 7.x | Envio de emails |
| **jsPDF** | 4.x | Geração de recibos PDF |
| **ExcelJS** | 4.x | Exportação para Excel |
| **QRCode** | - | Geração de QR Codes para PIX |
| **clsx / tailwind-merge** | - | Utilitários de classes CSS |

---

## Início Rápido

### Pré-requisitos

- Node.js 18+
- PostgreSQL 15+ (ou conta no Neon/Supabase/Railway)
- npm ou bun

### Instalação

```bash
# 1. Clonar o repositório
git clone https://github.com/rguisantos/app-cobrancas-web.git
cd app-cobrancas-web

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env.local
```

### Variáveis de Ambiente

```env
# Banco de dados
DATABASE_URL="postgresql://usuario:senha@host:5432/banco"
DIRECT_URL="postgresql://usuario:senha@host:5432/banco"

# Autenticação Web (NextAuth)
NEXTAUTH_SECRET="chave-secreta-min-32-caracteres"
NEXTAUTH_URL="http://localhost:3000"

# Autenticação Mobile (JWT)
JWT_SECRET="outra-chave-secreta-min-32-caracteres"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="7d"

# Automação (Cron Jobs)
CRON_SECRET="chave-secreta-para-cron-jobs"

# Email (Nodemailer)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="seu-email@gmail.com"
EMAIL_PASS="senha-de-app"
EMAIL_FROM="App Cobranças <seu-email@gmail.com>"

# PIX (opcional)
PIX_CHAVE="sua-chave-pix"
PIX_NOME="Sua Empresa"
PIX_CIDADE="Campo Grande"

# Opcional
ENVIRONMENT="development"
```

### Inicialização

```bash
# 4. Criar tabelas no banco
npx prisma db push

# 5. Popular com dados iniciais (admin + atributos)
npx prisma db seed

# 6. Iniciar servidor de desenvolvimento
npm run dev
```

### Acesso Padrão

- **URL:** http://localhost:3000
- **Email:** admin@locacao.com
- **Senha:** admin123

---

## Estrutura do Banco de Dados

O sistema possui **23 tabelas** organizadas em entidades principais, tabelas de apoio e tabelas de sistema.

### 📊 Entidades Principais

#### Rota

Rotas de visitação para organização dos clientes.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String (UUID) | Identificador único |
| `descricao` | String | Nome da rota (ex: "Linha Norte", "Centro") |
| `cor` | String | Cor hexadecimal para identificação visual (default: "#2563EB") |
| `regiao` | String? | Região/zona (ex: "Zona Norte") |
| `ordem` | Int | Ordem de prioridade para cobrança |
| `observacao` | String? | Anotações operacionais |
| `status` | String | 'Ativo' ou 'Inativo' |
| `syncStatus` | String | Status de sincronização |
| `lastSyncedAt` | String? | Última sincronização |
| `version` | Int | Versão para controle de conflitos |
| `deletedAt` | DateTime? | Soft delete |

**Relacionamentos:**
- `clientes[]` - Clientes vinculados à rota
- `usuarioRotas[]` - Usuários com acesso à rota

---

#### Cliente

Clientes que recebem produtos em locação.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String (UUID) | Identificador único |
| `tipoPessoa` | String | 'Fisica' ou 'Juridica' |
| `identificador` | String (unique) | Código único para busca rápida |
| `nomeExibicao` | String | Nome curto para exibição |
| `nomeCompleto` | String? | Nome completo (PF) |
| `razaoSocial` | String? | Razão social (PJ) |
| `cpf` | String? | CPF (PF) |
| `cnpj` | String? | CNPJ (PJ) |
| `rg` | String? | RG |
| `inscricaoEstadual` | String? | Inscrição estadual (PJ) |
| `telefonePrincipal` | String | Telefone principal |
| `email` | String? | Email |
| `contatos` | Json? | Lista de contatos adicionais |
| `cep` | String | CEP |
| `logradouro` | String | Endereço |
| `numero` | String | Número |
| `complemento` | String? | Complemento |
| `bairro` | String | Bairro |
| `cidade` | String | Cidade |
| `estado` | String | Estado (UF) |
| `latitude` | Float? | Coordenada GPS |
| `longitude` | Float? | Coordenada GPS |
| `rotaId` | String? | FK para Rota (nullable) |
| `status` | String | 'Ativo' ou 'Inativo' |

**Relacionamentos:**
- `rota` - Rota do cliente
- `locacoes[]` - Locações do cliente
- `cobrancas[]` - Cobranças do cliente

---

#### Produto

Equipamentos disponíveis para locação.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String (UUID) | Identificador único |
| `identificador` | String (unique) | Número da placa/identificação física |
| `numeroRelogio` | String | Contador mecânico atual |
| `tipoId` | String | FK para TipoProduto |
| `tipoNome` | String | Nome do tipo (cache) |
| `descricaoId` | String | FK para DescricaoProduto |
| `descricaoNome` | String | Nome da descrição (cache) |
| `tamanhoId` | String | FK para TamanhoProduto |
| `tamanhoNome` | String | Nome do tamanho (cache) |
| `codigoCH` | String? | Código interno CH |
| `codigoABLF` | String? | Código interno ABLF |
| `conservacao` | String | 'Ótima', 'Boa', 'Regular', 'Ruim', 'Péssima' |
| `statusProduto` | String | 'Ativo', 'Inativo', 'Manutenção' |
| `estabelecimento` | String? | Local quando não locado |
| `observacao` | String? | Observações |

**Relacionamentos:**
- `locacoes[]` - Histórico de locações
- `cobrancas[]` - Cobranças relacionadas
- `historicoRelogio[]` - Histórico de alterações do relógio
- `manutencoes[]` - Histórico de manutenções

---

#### Locacao

Contratos de locação de produtos para clientes.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String (UUID) | Identificador único |
| `clienteId` | String | FK para Cliente |
| `clienteNome` | String | Nome do cliente (cache) |
| `produtoId` | String | FK para Produto |
| `produtoIdentificador` | String | Identificação do produto (cache) |
| `produtoTipo` | String | Tipo do produto (cache) |
| `dataLocacao` | String | Data de início da locação |
| `dataFim` | String? | Data de término |
| `formaPagamento` | String | 'Periodo', 'PercentualPagar', 'PercentualReceber' |
| `numeroRelogio` | String | Leitura inicial do relógio |
| `precoFicha` | Float | Valor por ficha/partida |
| `percentualEmpresa` | Float | Percentual da empresa |
| `percentualCliente` | Float | Percentual do cliente |
| `valorFixo` | Float? | Valor fixo (pagamento por período) |
| `periodicidade` | String? | 'Semanal', 'Quinzenal', 'Mensal' |
| `dataPrimeiraCobranca` | String? | Data da primeira cobrança |
| `observacoes` | String? | Observações |
| `status` | String | 'Ativa', 'Finalizada', 'Cancelada' |
| `ultimaLeituraRelogio` | Float? | Última leitura após cobrança |
| `trocaPano` | Boolean | Se houve troca de pano na relocação |

**Formas de Pagamento:**

1. **Periodo** - Valor fixo por período (semanal/quinzenal/mensal)
2. **PercentualPagar** - Cliente paga um percentual do faturamento
3. **PercentualReceber** - Cliente recebe um percentual do faturamento

**Relacionamentos:**
- `cliente` - Cliente da locação
- `produto` - Produto locado
- `cobrancas[]` - Cobranças da locação

---

#### Cobranca

Registro de cobranças periódicas com leitura de relógio.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String (UUID) | Identificador único |
| `locacaoId` | String | FK para Locacao |
| `clienteId` | String | FK para Cliente |
| `clienteNome` | String | Nome do cliente (cache) |
| `produtoId` | String? | FK para Produto |
| `produtoIdentificador` | String | Identificação do produto (cache) |
| `dataInicio` | String | Início do período cobrado |
| `dataFim` | String | Fim do período cobrado |
| `dataPagamento` | String? | Data do pagamento (auto-set quando Pago/Parcial) |
| `dataVencimento` | String? | Data de vencimento (auto-set = dataFim na criação) |
| `relogioAnterior` | Float | Leitura anterior do relógio |
| `relogioAtual` | Float | Leitura atual do relógio |
| `fichasRodadas` | Float | Diferença entre leituras |
| `valorFicha` | Float | Valor por ficha |
| `totalBruto` | Float | Valor bruto (fichas × preço) |
| `descontoPartidasQtd` | Float? | Quantidade de partidas de desconto |
| `descontoPartidasValor` | Float? | Valor do desconto de partidas |
| `descontoDinheiro` | Float? | Desconto em dinheiro |
| `percentualEmpresa` | Float | Percentual da empresa |
| `subtotalAposDescontos` | Float | Subtotal após descontos |
| `valorPercentual` | Float | Valor calculado do percentual |
| `totalClientePaga` | Float | Total que o cliente deve pagar |
| `valorRecebido` | Float | Valor efetivamente recebido |
| `saldoDevedorGerado` | Float | Saldo devedor (se pagamento parcial) |
| `status` | String | 'Pago', 'Parcial', 'Pendente', 'Atrasado' |

**Comportamento automático:**
- `dataVencimento` é setada como `dataFim` na criação
- `dataPagamento` é setada automaticamente quando status muda para Pago/Parcial

**Relacionamentos:**
- `locacao` - Locação relacionada
- `cliente` - Cliente cobrado
- `produto` - Produto cobrado

---

#### Usuario

Usuários do sistema (web e mobile).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String (UUID) | Identificador único |
| `nome` | String | Nome completo |
| `email` | String (unique) | Email (login) |
| `senha` | String | Senha hasheada (bcrypt 12 rounds) |
| `cpf` | String? | CPF |
| `telefone` | String? | Telefone |
| `tipoPermissao` | String | 'Administrador', 'Secretario', 'AcessoControlado' |
| `permissoesWeb` | Json | Permissões granulares para web (18 flags) |
| `permissoesMobile` | Json | Permissões granulares para mobile |
| `rotasPermitidas` | Json | Array de IDs de rotas permitidas |
| `status` | String | 'Ativo' ou 'Inativo' |
| `bloqueado` | Boolean | Se está bloqueado |
| `dataUltimoAcesso` | String? | Último acesso |
| `ultimoAcessoDispositivo` | String? | 'Web' ou nome do dispositivo |

**Relacionamentos:**
- `rotasPermitidasRel[]` - Rotas com acesso permitido
- `notificacoes[]` - Notificações do usuário
- `sessoes[]` - Sessões ativas
- `logsAuditoria[]` - Logs de auditoria

---

### 📋 Tabelas de Apoio

| Tabela | Campos | Descrição |
|--------|--------|-----------|
| **TipoProduto** | id, nome | Tipos: "Bilhar", "Jukebox", "Mesa", etc. |
| **DescricaoProduto** | id, nome | Descrições: "Azul", "Preto", "Branco", etc. |
| **TamanhoProduto** | id, nome | Tamanhos: "2,00m", "2,20m", "Grande", etc. |
| **Estabelecimento** | id, nome, endereco? | Locais de armazenamento/estoque |
| **UsuarioRota** | usuarioId, rotaId | Relação N:N usuário-rota |

---

### ⚙️ Tabelas de Sistema

| Tabela | Função |
|--------|--------|
| **Dispositivo** | Registro de dispositivos móveis autorizados |
| **ChangeLog** | Log de todas as alterações para sincronização |
| **SyncConflict** | Conflitos de sincronização detectados |
| **HistoricoRelogio** | Histórico de alterações de contador |
| **Manutencao** | Histórico de manutenções de produtos |
| **Notificacao** | Notificações para usuários (cobranças vencidas, conflitos, etc.) |
| **Meta** | Metas de arrecadação por período e rota |
| **LogAuditoria** | Rastreamento completo de ações no sistema |
| **Sessao** | Gerenciamento de sessões de autenticação |
| **TentativaLogin** | Rastreamento de tentativas de login (segurança) |
| **TokenRecuperacao** | Tokens para recuperação de senha |

---

### 🆕 Modelos de Sistema — Detalhes

#### Notificacao

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String (UUID) | Identificador único |
| `usuarioId` | String | FK para Usuario (destinatário) |
| `tipo` | String | 'cobranca_vencida', 'saldo_devedor', 'conflito_sync', 'cobranca_gerada', 'info' |
| `titulo` | String | Título da notificação |
| `mensagem` | String | Conteúdo da notificação |
| `lida` | Boolean | Se já foi lida |
| `link` | String? | Link de navegação opcional |

---

#### Meta

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String (UUID) | Identificador único |
| `nome` | String | Nome da meta (ex: "Meta Janeiro 2024") |
| `tipo` | String | 'receita', 'cobrancas', 'adimplencia' |
| `valorMeta` | Float | Valor alvo |
| `valorAtual` | Float | Valor alcançado |
| `dataInicio` | DateTime | Início do período |
| `dataFim` | DateTime | Fim do período |
| `rotaId` | String? | Rota (null = meta global) |
| `status` | String | 'ativa', 'atingida', 'expirada' |
| `criadoPor` | String? | ID do usuário que criou |

---

#### LogAuditoria

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String (UUID) | Identificador único |
| `usuarioId` | String? | Usuário que executou (null = sistema) |
| `acao` | String | Ação executada (ver lib/auditoria.ts) |
| `entidade` | String | Entidade afetada |
| `entidadeId` | String? | ID da entidade |
| `entidadeNome` | String? | Nome legível da entidade |
| `detalhes` | Json? | Dados adicionais |
| `antes` | Json? | Snapshot ANTES da alteração |
| `depois` | Json? | Snapshot DEPOIS da alteração |
| `ip` | String? | IP do usuário |
| `userAgent` | String? | User agent |
| `dispositivo` | String? | Dispositivo parseado |
| `severidade` | String | 'info', 'aviso', 'critico', 'seguranca' |
| `origem` | String | 'web', 'mobile', 'sistema', 'cron' |

---

#### Sessao

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String (UUID) | Identificador único |
| `usuarioId` | String | FK para Usuario |
| `refreshToken` | String (unique) | Hash do refresh token |
| `dispositivo` | String | 'Web' ou 'Mobile' |
| `ip` | String? | IP da sessão |
| `userAgent` | String? | User agent |
| `expiraEm` | DateTime | Data de expiração |

---

#### TentativaLogin

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String (UUID) | Identificador único |
| `email` | String | Email tentado |
| `ip` | String | IP da tentativa |
| `sucesso` | Boolean | Se o login teve sucesso |
| `userAgent` | String? | User agent |

---

#### TokenRecuperacao

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String (UUID) | Identificador único |
| `usuarioId` | String | FK para Usuario |
| `token` | String (unique) | Hash SHA-256 do token |
| `usado` | Boolean | Se já foi utilizado |
| `expiraEm` | DateTime | Data de expiração |

---

## APIs e Endpoints

### 🔐 Autenticação

| Endpoint | Método | Descrição | Body/Params |
|----------|--------|-----------|-------------|
| `/api/auth/login` | POST | Login mobile | `{ email, password }` |
| `/api/auth/me` | GET | Dados do usuário logado | - |
| `/api/auth/logout` | POST | Logout do usuário | - |
| `/api/auth/change-password` | POST | Alterar senha | `{ senhaAtual, novaSenha }` |
| `/api/auth/forgot-password` | POST | Solicitar recuperação de senha | `{ email }` |
| `/api/auth/reset-password` | POST | Redefinir senha com token | `{ token, novaSenha }` |
| `/api/auth/[...nextauth]` | GET/POST | NextAuth para web | - |

**Resposta do Login Mobile:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "nome": "João Silva",
    "email": "joao@email.com",
    "tipoPermissao": "AcessoControlado",
    "permissoes": { "web": {...}, "mobile": {...} },
    "rotasPermitidas": ["uuid-rota-1", "uuid-rota-2"]
  }
}
```

**Validações de Login:**
- Usuário deve ter `status = 'Ativo'`
- Usuário não pode estar `bloqueado = true`
- Usuário não pode ter `deletedAt` (soft delete)
- Atualiza `dataUltimoAcesso` e `ultimoAcessoDispositivo`
- Tentativas de login registradas na tabela `TentativaLogin`
- Rate limiting: 5 tentativas por IP a cada 15 minutos

---

### 🔄 Sincronização

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/sync/push` | POST | Mobile envia alterações locais |
| `/api/sync/pull` | POST | Mobile recebe alterações do servidor |
| `/api/sync/snapshot` | POST | Snapshot completo para devices stale |
| `/api/sync/conflicts` | GET | Lista conflitos pendentes |
| `/api/sync/conflict/resolve` | POST | Resolve um conflito |

**Autenticação de Sincronização:**

A sincronização **NÃO** usa o token JWT do usuário. A autenticação é feita via `deviceKey`:

```json
{
  "deviceKey": "samsung_mobile_1234567890_abc",
  "lastSyncAt": "2024-01-01T00:00:00Z",
  "changes": [...]
}
```

**PUSH - Enviar Mudanças:**
```json
// Request
{
  "deviceId": "dev_1234567890_abc",
  "deviceKey": "samsung_mobile_1234567890_abc",
  "lastSyncAt": "2024-01-01T00:00:00Z",
  "changes": [
    {
      "id": "changelog-uuid",
      "entityId": "cliente-uuid",
      "entityType": "cliente",
      "operation": "create",
      "changes": { "nome": "João", "telefone": "11999999999" },
      "timestamp": "2024-01-01T01:00:00Z",
      "deviceId": "dev_1234567890_abc"
    }
  ]
}

// Response
{
  "success": true,
  "lastSyncAt": "2024-01-01T01:00:00Z",
  "conflicts": [],
  "errors": [],
  "updatedVersions": [{"entityId": "uuid", "entityType": "cliente", "newVersion": 2}]
}
```

**PULL - Receber Mudanças:**
```json
// Response
{
  "success": true,
  "lastSyncAt": "2024-01-01T02:00:00Z",
  "hasMore": false,
  "isStale": false,
  "changes": {
    "clientes": [...],
    "produtos": [...],
    "locacoes": [...],
    "cobrancas": [...],
    "rotas": [...],
    "usuarios": [...]
  },
  "tiposProduto": [...],
  "descricoesProduto": [...],
  "tamanhosProduto": [...]
}
```

**SNAPSHOT - Sync Completo (para devices stale > 30 dias):**
```json
// Response
{
  "success": true,
  "lastSyncAt": "2024-01-01T02:00:00Z",
  "snapshot": {
    "clientes": [...],
    "produtos": [...],
    "locacoes": [...],
    "cobrancas": [...],
    "rotas": [...],
    "usuarios": [...],
    "tiposProduto": [...],
    "descricoesProduto": [...],
    "tamanhosProduto": [...]
  }
}
```

---

### 📦 CRUD de Entidades

#### Clientes

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/clientes` | GET | Listar (paginado, filtros) |
| `/api/clientes` | POST | Criar novo |
| `/api/clientes/[id]` | GET | Buscar por ID |
| `/api/clientes/[id]` | PUT | Atualizar |
| `/api/clientes/[id]` | DELETE | Remover (soft delete) |
| `/api/clientes/batch` | POST | Criar múltiplos |

**Query Params (GET):**
- `page` - Página (default: 1)
- `limit` - Itens por página (default: 20)
- `rotaId` - Filtrar por rota
- `status` - Filtrar por status
- `busca` - Buscar por nome/identificador

---

#### Produtos

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/produtos` | GET | Listar (paginado, filtros) |
| `/api/produtos` | POST | Criar novo |
| `/api/produtos/[id]` | GET | Buscar por ID |
| `/api/produtos/[id]` | PUT | Atualizar |
| `/api/produtos/[id]` | DELETE | Remover |
| `/api/produtos/batch` | POST | Criar múltiplos |

**Query Params Especiais:**
- `disponiveis=true` - Apenas produtos sem locação ativa
- `status=Ativo` - Filtrar por status

---

#### Locações

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/locacoes` | GET | Listar locações |
| `/api/locacoes` | POST | Criar nova locação |
| `/api/locacoes/ativas` | GET | Locações ativas |
| `/api/locacoes/por-rota` | GET | Locações agrupadas por rota |
| `/api/locacoes/[id]` | GET | Detalhes da locação |
| `/api/locacoes/[id]` | PUT | Atualizar locação |
| `/api/locacoes/[id]/relocar` | POST | Relocar para outro cliente |
| `/api/locacoes/[id]/enviar-estoque` | POST | Encerrar e enviar para estoque |

---

#### Cobranças

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/cobrancas` | GET | Listar cobranças |
| `/api/cobrancas` | POST | Criar cobrança |
| `/api/cobrancas/[id]` | GET | Detalhes |
| `/api/cobrancas/[id]` | PUT | Atualizar (inclui registrar pagamento) |
| `/api/cobrancas/batch` | POST | Criar múltiplas |

**Comportamento automático:**
- Ao criar cobrança: `dataVencimento` é setada automaticamente como `dataFim`
- Ao registrar pagamento (status Pago/Parcial): `dataPagamento` é setada automaticamente

---

#### Rotas

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/rotas` | GET | Listar rotas |
| `/api/rotas` | POST | Criar rota |
| `/api/rotas/[id]` | GET | Detalhes com clientes |
| `/api/rotas/[id]` | PUT | Atualizar |
| `/api/rotas/[id]` | DELETE | Remover |

---

#### Usuários (Admin)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/usuarios` | GET | Listar usuários |
| `/api/usuarios` | POST | Criar usuário |
| `/api/usuarios/[id]` | GET | Detalhes |
| `/api/usuarios/[id]` | PUT | Atualizar |
| `/api/usuarios/[id]` | DELETE | Remover (soft delete) |

**Acesso restrito:** Apenas Administradores podem criar/editar/deletar usuários.

---

### 📍 Localização

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/localizacao/estados` | GET | Lista de estados (IBGE) |
| `/api/localizacao/cidades?uf=SP` | GET | Cidades por estado |
| `/api/localizacao/cep?cep=01234567` | GET | Buscar endereço (ViaCEP) |

---

### 🗺️ Mapa de Rotas

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/mapa` | GET | Dados do mapa com clientes, financeiro e cores por rota |
| `/api/mapa/geocodificar` | POST | Geocodificar endereços dos clientes |
| `/api/mapa/seed-coordinates` | POST | Popular coordenadas iniciais |

**Resposta do `/api/mapa`:**
```json
{
  "clientes": [
    {
      "id": "uuid",
      "nomeExibicao": "Cliente",
      "latitude": -20.44,
      "longitude": -54.64,
      "rotaId": "uuid",
      "rotaNome": "Linha Norte",
      "rotaCor": "#2563EB",
      "totalRecebido": 1500.00,
      "totalPendente": 300.00,
      "locacoesAtivas": 2
    }
  ],
  "stats": {
    "totalClientes": 150,
    "clientesComCoordenadas": 120,
    "totalRecebido": 45000.00,
    "totalPendente": 5000.00
  },
  "rotas": [
    { "id": "uuid", "descricao": "Linha Norte", "cor": "#2563EB", "totalClientes": 30 }
  ]
}
```

---

### 🔍 Busca Global

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/busca-global?q=termo` | GET | Busca unificada em clientes, produtos, locações e cobranças |

**Parâmetros:**
- `q` - Termo de busca (mínimo 2 caracteres)

**Resposta:**
```json
{
  "clientes": [...],
  "produtos": [...],
  "locacoes": [...],
  "cobrancas": [...]
}
```

Cada tipo retorna no máximo 5 resultados. Busca case-insensitive com `mode: 'insensitive'`. Soft-delete aware (filtra `deletedAt: null`).

---

### 📅 Agenda

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/agenda` | GET | Listar pagamentos e vencimentos por data |

**Query Params:**
- `dataInicio` - Data inicial
- `dataFim` - Data final
- `rotaId` - Filtrar por rota (para AcessoControlado)

**Permissão:** Requer permissão `agenda`. AcessoControlado só vê cobranças das suas rotas.

---

### 🎯 Metas

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/metas` | GET | Listar metas |
| `/api/metas` | POST | Criar meta |
| `/api/metas/[id]` | GET | Detalhes da meta |
| `/api/metas/[id]` | PUT | Atualizar meta |
| `/api/metas/[id]` | DELETE | Remover meta |

**Permissão:** Requer permissão `relatorios`.

---

### 🔔 Notificações

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/notificacoes` | GET | Listar notificações do usuário |
| `/api/notificacoes/[id]` | PUT | Marcar como lida |
| `/api/notificacoes/[id]` | DELETE | Remover notificação |

**Tipos de notificação:**
- `cobranca_vencida` - Cobrança com vencimento passado
- `saldo_devedor` - Saldo devedor acumulado
- `conflito_sync` - Conflito de sincronização detectado
- `cobranca_gerada` - Cobrança gerada automaticamente (cron)
- `info` - Informações gerais

---

### 🛡️ Auditoria

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/auditoria` | GET | Listar logs de auditoria |

**Query Params:**
- `acao` - Filtrar por ação (ex: `criar_usuario`)
- `entidade` - Filtrar por entidade (ex: `usuario`)
- `usuarioId` - Filtrar por usuário
- `severidade` - Filtrar por severidade
- `origem` - Filtrar por origem (web/mobile/sistema/cron)
- `dataInicio` / `dataFim` - Filtrar por período
- `page` / `limit` - Paginação

**Permissão:** Requer permissão `adminAuditoria` (apenas Admin).

---

### ⏰ Automação (Cron)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/cron/vencimento` | POST | Marcar cobranças pendentes como 'Atrasado' |
| `/api/cron/gerar-cobrancas` | POST | Gerar cobranças automáticas para locações por período |

**Autenticação:** CRON_SECRET no header `x-cron-secret` ou query param `secret`. Também aceita sessão de Administrador.

---

### 📧 Email

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/email/notificar-atrasadas` | POST | Enviar notificação por email para cobranças atrasadas |
| `/api/email/teste` | POST | Enviar email de teste |

**Configuração:** Requer variáveis `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`.

---

### 📊 Dashboard e Relatórios

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/dashboard` | GET | Métricas para dashboard web |
| `/api/dashboard/atividade` | GET | Atividade recente |
| `/api/dashboard/mobile` | GET | Métricas para dashboard mobile |
| `/api/relatorios/financeiro` | GET | Relatório financeiro |
| `/api/relatorios/clientes` | GET | Relatório de clientes |
| `/api/relatorios/produtos` | GET | Relatório de produtos |
| `/api/relatorios/locacoes` | GET | Relatório de locações |
| `/api/relatorios/estoque` | GET | Relatório de estoque |
| `/api/relatorios/inadimplencia` | GET | Relatório de inadimplência |
| `/api/relatorios/recebimentos` | GET | Relatório de recebimentos |
| `/api/relatorios/rotas` | GET | Relatório por rotas |
| `/api/relatorios/locacoes-rota` | GET | Locações por rota |
| `/api/relatorios/comparativo` | GET | Comparativo mensal |
| `/api/relatorios/operacional` | GET | Relatório operacional |
| `/api/relatorios/manutencoes` | GET | Relatório de manutenções |
| `/api/relatorios/relogios` | GET | Relatório de relógios |

**Dashboard Web - Métricas retornadas:**
```json
{
  "ganhos": {
    "ganhoAtualMes": 12500.00,
    "ganhoComPercentual": 8000.00,
    "ganhoComPeriodo": 4500.00
  },
  "clientesNaoCobrados": [...],
  "totalClientesNaoCobrados": 5,
  "produtosLocadosEstoque": {
    "totalLocados": 65,
    "totalEstoque": 15
  },
  "dataReferencia": "2024-01-15T10:30:00Z",
  "mesReferencia": "Janeiro 2024"
}
```

---

### ⚙️ Sistema

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/health` | GET | Healthcheck |
| `/api/admin/init` | POST | Inicializar banco |
| `/api/admin/migrate` | POST | Executar migrações manuais |
| `/api/admin/migrate-db` | POST | Migrações de schema |
| `/api/dispositivos` | GET/POST | Listar/criar dispositivos |
| `/api/dispositivos/[id]` | DELETE | Remover dispositivo |
| `/api/dispositivos/ativar` | POST | Ativar dispositivo |
| `/api/dispositivos/status` | POST | Verificar status de ativação |
| `/api/equipamentos` | GET | Listar equipamentos |
| `/api/manutencoes` | GET/POST | Listar/criar manutenções |
| `/api/manutencoes/[id]` | GET/PUT/DELETE | CRUD de manutenção |
| `/api/historico-relogio` | GET/POST | Histórico de relógio |
| `/api/historico-relogio/[id]` | PUT | Atualizar registro |
| `/api/estabelecimentos` | GET/POST | CRUD de estabelecimentos |
| `/api/estabelecimentos/[id]` | PUT/DELETE | Atualizar/remover |
| `/api/tipos-produto` | GET/POST | CRUD de tipos |
| `/api/tipos-produto/[id]` | PUT/DELETE | Atualizar/remover |
| `/api/descricoes-produto` | GET/POST | CRUD de descrições |
| `/api/descricoes-produto/[id]` | PUT/DELETE | Atualizar/remover |
| `/api/tamanhos-produto` | GET/POST | CRUD de tamanhos |
| `/api/tamanhos-produto/[id]` | PUT/DELETE | Atualizar/remover |

---

## Páginas do Sistema

### 🔓 Rotas Públicas

| Página | Rota | Descrição |
|--------|------|-----------|
| Login | `/login` | Autenticação de usuários web |

---

### 🔒 Rotas Autenticadas

#### Dashboard (`/dashboard`) — Permissão: `dashboard`

**KPIs exibidos:**
- Ganhos do mês atual (total, percentual, período)
- Total de clientes ativos
- Produtos locados vs. disponíveis
- Clientes não cobrados recentemente
- Atividade recente

#### Clientes (`/clientes`) — Permissão: `clientes`

| Rota | Função |
|------|--------|
| `/clientes` | Listagem com filtros (rota, status, busca) e paginação |
| `/clientes/novo` | Formulário de cadastro com busca de CEP |
| `/clientes/[id]` | Detalhes com locações e cobranças |
| `/clientes/[id]/editar` | Editar dados do cliente |

#### Produtos (`/produtos`) — Permissão: `produtos`

| Rota | Função |
|------|--------|
| `/produtos` | Listagem com filtros (tipo, status, disponibilidade) |
| `/produtos/novo` | Cadastro de produto |
| `/produtos/[id]` | Detalhes com histórico de locações |
| `/produtos/[id]/editar` | Editar produto |

#### Locações (`/locacoes`) — Permissão: `locacaoRelocacaoEstoque`

| Rota | Função |
|------|--------|
| `/locacoes` | Listagem com filtros (status, cliente, produto) |
| `/locacoes/nova` | Nova locação |
| `/locacoes/[id]` | Detalhes com cobranças |
| `/locacoes/[id]/editar` | Editar locação |
| `/locacoes/[id]/relocar` | Relocar produto para outro cliente |
| `/locacoes/[id]/enviar-estoque` | Encerrar locação |

#### Cobranças (`/cobrancas`) — Permissão: `cobrancas`

| Rota | Função |
|------|--------|
| `/cobrancas` | Listagem com filtros (status, período, cliente) |
| `/cobrancas/nova` | Nova cobrança |
| `/cobrancas/[id]` | Detalhes com recibo PDF e PIX |
| `/cobrancas/[id]/editar` | Editar cobrança |

#### Relatórios (`/relatorios`) — Permissão: `relatorios`

14 tipos de relatório com exportação Excel e gráficos Recharts:
financeiro, clientes, produtos, locacoes, estoque, inadimplencia, recebimentos, rotas, locacoes-rota, comparativo, operacional, manutencoes, relogios.

#### Manutenções (`/manutencoes`) — Permissão: `manutencoes`

| Rota | Função |
|------|--------|
| `/manutencoes` | Listagem de manutenções |
| `/manutencoes/nova` | Nova manutenção |

#### Relógios (`/relogios`) — Permissão: `relogios`

| Rota | Função |
|------|--------|
| `/relogios` | Listagem de alterações de relógio |
| `/relogios/nova` | Registrar alteração de relógio |

#### 📅 Agenda (`/agenda`) — Permissão: `agenda`

Calendário de pagamentos e vencimentos com visualização por data. Mostra cobranças pagas, pendentes e atrasadas agrupadas por dia. AcessoControlado só visualiza cobranças das suas rotas.

#### 🗺️ Mapa de Rotas (`/mapa`) — Permissão: `mapa`

Mapa interativo (Leaflet) com:
- Marcadores coloridos por rota (cor definida no cadastro da rota)
- Popups com dados financeiros (total recebido, pendente, locações ativas)
- Cards de estatísticas gerais
- Legenda interativa com toggle de rotas (mostrar/ocultar)
- Centralizado em Campo Grande, MS

#### Perfil (`/perfil`) — Permissão: `dashboard`

Página de perfil do usuário com opção de alterar senha.

---

### 👑 Área Administrativa (`/admin/*`)

#### Usuários (`/admin/usuarios`) — Permissão: `adminUsuarios`

| Rota | Função |
|------|--------|
| `/admin/usuarios` | Listagem de usuários |
| `/admin/usuarios/novo` | Criar usuário |
| `/admin/usuarios/[id]/editar` | Editar usuário |

#### Rotas (`/admin/rotas`) — Permissão: `rotas`

| Rota | Função |
|------|--------|
| `/admin/rotas` | Listagem de rotas |
| `/admin/rotas/nova` | Criar rota |
| `/admin/rotas/[id]` | Editar rota com clientes vinculados |

#### Cadastros (`/admin/cadastros`) — Permissão: `adminCadastros`

Gerenciamento de tipos, descrições e tamanhos de produto, estabelecimentos e equipamentos.

#### Dispositivos (`/admin/dispositivos`) — Permissão: `adminDispositivos`

| Rota | Função |
|------|--------|
| `/admin/dispositivos` | Listar dispositivos móveis |
| `/admin/dispositivos/novo` | Criar novo dispositivo |

#### Sincronização (`/admin/sync`) — Permissão: `adminSincronizacao`

Status de sincronização de cada dispositivo, conflitos pendentes, logs de alterações.

#### 🛡️ Auditoria (`/admin/auditoria`) — Permissão: `adminAuditoria`

Visualização completa dos logs de auditoria com filtros por ação, entidade, usuário, severidade, origem e período.

#### 🎯 Metas (`/admin/metas`) — Permissão: `relatorios`

Gestão de metas de arrecadação por tipo (receita, cobranças, adimplência), período e rota.

#### ⏰ Automação (`/admin/cron`) — Permissão: `adminSincronizacao`

Painel de controle de automação: gerar cobranças automáticas, marcar cobranças vencidas.

#### 📧 Email (`/admin/email`) — Permissão: `adminCadastros`

Configuração e teste de email, envio de notificação de cobranças atrasadas.

---

## Sistema de Sincronização

### 📐 Arquitetura

O sistema implementa **sincronização bidirecional offline-first** entre o app mobile (SQLite) e o servidor web (PostgreSQL).

```
┌─────────────────┐                    ┌─────────────────┐
│   App Mobile    │                    │   Servidor Web  │
│   (SQLite)      │                    │   (PostgreSQL)  │
└────────┬────────┘                    └────────┬────────┘
         │                                      │
         │  1. PUSH (envia mudanças locais)    │
         │─────────────────────────────────────>│
         │                                      │
         │  2. PULL (recebe mudanças remotas)  │
         │<─────────────────────────────────────│
         │                                      │
```

### 🔐 Autenticação para Sincronização

**Importante:** A sincronização NÃO usa o token JWT do usuário. O dispositivo é a credencial.

- `deviceKey` - Chave única do dispositivo registrado
- Dispositivo precisa estar cadastrado e ativo no sistema
- Qualquer usuário logado no dispositivo pode sincronizar

### 📤 PUSH (Mobile → Servidor)

**Processo:**
1. Mobile coleta mudanças locais (ChangeLog)
2. Envia para `/api/sync/push` com `deviceKey`
3. Servidor valida dispositivo
4. Processa mudanças na ordem de dependência:
   - 1º: Rotas → 2º: Clientes → 3º: Produtos → 4º: Locações → 5º: Cobranças → 6º: Usuários
5. Detecta conflitos por versão
6. Retorna resultado com `updatedVersions`

### 📥 PULL (Servidor → Mobile)

**Processo:**
1. Mobile envia `lastSyncAt` para `/api/sync/pull`
2. Servidor busca entidades modificadas após essa data
3. Filtra apenas mudanças de **outros dispositivos**
4. Retorna todas as entidades atualizadas (máx. 500 por tipo)
5. Indica `hasMore` se há mais registros
6. Indica `isStale` se device está sem sync há > 30 dias

### 📸 Snapshot (para devices stale)

Quando um dispositivo está sem sincronizar há mais de 30 dias, o endpoint `/api/sync/snapshot` retorna um snapshot completo de todas as entidades.

### ⚠️ Detecção de Conflitos

**Resolução:**
```json
// POST /api/sync/conflict/resolve
{
  "conflitoId": "uuid",
  "estrategia": "local|remote|newest|manual",
  "versaoFinal": { /* dados manuais se estrategia=manual */ }
}
```

### 🏷️ Campos de Sincronização

Todas as entidades têm estes campos:

| Campo | Tipo | Função |
|-------|------|--------|
| `syncStatus` | String | 'pending', 'syncing', 'synced', 'conflict', 'error' |
| `lastSyncedAt` | String? | Timestamp da última sincronização |
| `needsSync` | Boolean | Se precisa ser sincronizado |
| `version` | Int | Versionamento para detecção de conflitos |
| `deviceId` | String | Dispositivo que criou/alterou |
| `deletedAt` | DateTime? | Soft delete |

---

## Sistema de Autenticação

### Web (NextAuth)

- Estratégia: JWT
- Sessão: 30 dias
- Providers: Credentials (email/senha)
- Proteção de rotas via middleware com permissões granulares

### Mobile (JWT Customizado)

- Access Token: 15 minutos (configurável via `JWT_EXPIRES_IN`)
- Refresh Token: 7 dias (armazenado na tabela `Sessao`)
- Algoritmo: HS256
- Hash de senha: bcrypt com 12 rounds

### Recuperação de Senha

```
1. POST /api/auth/forgot-password { email }
2. Servidor gera TokenRecuperacao (hash SHA-256)
3. Em produção: envia email com link de recuperação
4. POST /api/auth/reset-password { token, novaSenha }
5. Servidor valida token (não expirado, não usado)
6. Atualiza senha e marca token como usado
7. Registra auditoria (recuperar_senha)
```

---

## Permissões e Controle de Acesso

### Tipos de Permissão

| Tipo | Descrição | Acesso |
|------|-----------|--------|
| **Administrador** | Acesso total | Todas as rotas e funcionalidades |
| **Secretario** | Gestão operacional | Permissões configuráveis (default: acesso amplo) |
| **AcessoControlado** | Acesso restrito | Apenas rotas atribuídas + permissões específicas |

### Estrutura de Permissões Web

```typescript
interface PermissoesWeb {
  // Cadastros
  clientes: boolean;
  produtos: boolean;
  rotas: boolean;
  // Operações
  locacaoRelocacaoEstoque: boolean;
  cobrancas: boolean;
  manutencoes: boolean;
  relogios: boolean;
  // Visualização
  relatorios: boolean;
  dashboard: boolean;
  agenda: boolean;
  mapa: boolean;
  // Admin
  adminCadastros: boolean;
  adminUsuarios: boolean;
  adminDispositivos: boolean;
  adminSincronizacao: boolean;
  adminAuditoria: boolean;
}
```

### Estrutura de Permissões Mobile

```typescript
interface PermissoesMobile {
  clientes: boolean;
  produtos: boolean;
  alteracaoRelogio: boolean;
  locacaoRelocacaoEstoque: boolean;
  cobrancasFaturas: boolean;
  manutencoes: boolean;
  relatorios: boolean;
  sincronizacao: boolean;
}
```

### Controle por Rota

Para `AcessoControlado`, o campo `rotasPermitidas` contém os IDs das rotas que o usuário pode acessar. O middleware, as APIs e as páginas filtram automaticamente clientes e cobranças por essas rotas.

### Middleware de Proteção

O middleware implementa verificação granular em **duas camadas**:

1. **Middleware (frontend + API)** — Verifica sessão NextAuth e permissão granular
2. **API handlers (backend)** — Verificam `getAuthSession()` + permissões específicas

```typescript
// Mapeamento de rotas para permissões
const ROUTE_PERMISSIONS = {
  '/clientes': 'clientes',
  '/produtos': 'produtos',
  '/locacoes': 'locacaoRelocacaoEstoque',
  '/cobrancas': 'cobrancas',
  '/manutencoes': 'manutencoes',
  '/relogios': 'relogios',
  '/relatorios': 'relatorios',
  '/dashboard': 'dashboard',
  '/agenda': 'agenda',
  '/mapa': 'mapa',
  '/admin/usuarios': 'adminUsuarios',
  '/admin/cadastros': 'adminCadastros',
  '/admin/dispositivos': 'adminDispositivos',
  '/admin/sync': 'adminSincronizacao',
  '/admin/auditoria': 'adminAuditoria',
  '/admin/metas': 'relatorios',
  '/admin/email': 'adminCadastros',
  '/admin/cron': 'adminSincronizacao',
  '/admin/rotas': 'rotas',
  '/perfil': 'dashboard',
}
```

---

## Cálculos de Cobrança

### 📐 Fórmulas de Cálculo

#### 1. PercentualReceber (Cliente recebe parte do faturamento)

```
fichasRodadas = relogioAtual - relogioAnterior
totalBruto = fichasRodadas × precoFicha
subtotalAposDescontos = totalBruto - (descontoPartidasValor + descontoDinheiro)
valorPercentual = subtotalAposDescontos × (percentualEmpresa / 100)
totalClientePaga = subtotalAposDescontos - valorPercentual
```

#### 2. PercentualPagar (Cliente paga percentual do faturamento)

```
fichasRodadas = relogioAtual - relogioAnterior
totalBruto = fichasRodadas × precoFicha
subtotalAposDescontos = totalBruto - descontos
valorPercentual = subtotalAposDescontos × (percentualEmpresa / 100)
totalClientePaga = valorPercentual
```

#### 3. Periodo (Valor fixo por período)

```
totalClientePaga = valorFixo (definido na locação)
```

### 💰 Controle de Pagamento

```
saldoDevedorGerado = max(0, totalClientePaga - valorRecebido)
troco = max(0, valorRecebido - totalClientePaga)
```

**Status de Pagamento:**
- `Pago`: valorRecebido >= totalClientePaga
- `Parcial`: valorRecebido > 0 e valorRecebido < totalClientePaga
- `Pendente`: valorRecebido = 0
- `Atrasado`: Pendente após data de vencimento (marcado automaticamente pelo cron)

---

## Fluxos de Negócio

### 🔄 Relocação de Produto

```
1. Usuário seleciona locação ativa → Clica em "Relocar"
2. Informa: novo cliente, relógio, forma de pagamento, motivo, troca de pano
3. Sistema em TRANSAÇÃO ATÔMICA:
   a) Finaliza locação atual
   b) Cria nova locação para o novo cliente
   c) Registra manutenção (se troca de pano)
   d) Registra ChangeLog + LogAuditoria
4. Produto continua locado para novo cliente
```

### 📦 Envio para Estoque

```
1. Usuário seleciona locação ativa → Clica em "Enviar para Estoque"
2. Informa: estabelecimento, motivo, observações
3. Sistema em TRANSAÇÃO ATÔMICA:
   a) Finaliza locação
   b) Atualiza produto (estabelecimento, statusProduto = 'Ativo')
   c) Registra ChangeLog + LogAuditoria
4. Produto disponível para nova locação
```

### 📱 Ativação de Dispositivo

```
1. Admin cria dispositivo (gera senha 6 dígitos)
2. Mobile informa nome + senha numérica
3. POST /api/dispositivos/ativar
4. Servidor valida e gera deviceKey
5. Dispositivo pronto para sincronizar
```

---

## Segurança e Middleware

### 🔒 Proteções Implementadas

| Proteção | Implementação |
|----------|---------------|
| Senha hasheada | bcrypt com 12 rounds |
| Senha removida do retorno | `senha` nunca retornado nas APIs |
| Soft delete | `deletedAt` em todas as entidades sincronizáveis |
| Validação de input | Zod schemas centralizados em `lib/validations.ts` |
| Transações atômicas | Prisma `$transaction()` em operações críticas |
| Auth em todas as APIs | `getAuthSession()` em todos os endpoints |
| Rota-filtering | AcessoControlado só vê dados das rotas atribuídas |
| Mass assignment | Schemas Zod protegem contra campos indesejados |
| Rate limiting | Sliding window in-memory em `/api/auth/login` |
| Tentativas de login | Rastreadas na tabela `TentativaLogin` |
| Sessões ativas | Gerenciadas na tabela `Sessao` com refresh token |
| Recuperação de senha | Tokens com hash SHA-256, expiração e uso único |
| Auditoria | Todas as ações rastreadas com antes/depois |
| Cron auth | Rotas de automação usam `CRON_SECRET` próprio |
| Permissões granulares | Middleware com 18 permissões web distintas |

---

## Motor de Sincronização

### 📋 Arquivo: `lib/sync-engine.ts`

#### `processPush(deviceId, changes)`

1. Ordena mudanças por dependência: rota → cliente → produto → locação → cobrança → usuario
2. Filtra campos permitidos, converte tipos (SQLite → Prisma)
3. Valida foreign keys, detecta conflitos por versão
4. Registra no ChangeLog + LogAuditoria
5. Retorna conflitos, erros e versões atualizadas

#### `processPull(deviceId, lastSyncAt)`

1. Busca entidades modificadas após lastSyncAt
2. Filtra mudanças de outros dispositivos
3. Exclui registros com deletedAt
4. Limita a 500 registros por tipo (paginação)
5. Retorna entidades + atributos de produto

---

## Sistema de Auditoria

### 📋 Arquivo: `lib/auditoria.ts`

O sistema rastreia todas as ações importantes com snapshots antes/depois.

### 🏷️ Ações Rastreadas

| Categoria | Ações |
|-----------|-------|
| **Usuários** | criar_usuario, editar_usuario, excluir_usuario, desbloquear_usuario, reset_senha, alterar_permissao, login, logout, login_falha, alterar_senha, recuperar_senha |
| **Clientes** | criar_cliente, editar_cliente, excluir_cliente |
| **Produtos** | criar_produto, editar_produto, excluir_produto |
| **Locações** | criar_locacao, editar_locacao, excluir_locacao, relocar_locacao, enviar_estoque, finalizar_locacao |
| **Cobranças** | criar_cobranca, editar_cobranca, excluir_cobranca, alterar_status_cobranca, imprimir_recibo |
| **Rotas** | criar_rota, editar_rota, excluir_rota |
| **Manutenções** | criar_manutencao, editar_manutencao, excluir_manutencao |
| **Atributos** | criar/editar/excluir_tipo_produto, criar/editar/excluir_descricao_produto, criar/editar/excluir_tamanho_produto |
| **Estabelecimentos** | criar_estabelecimento, editar_estabelecimento, excluir_estabelecimento |
| **Relógio** | atualizar_relogio |
| **Dispositivos** | criar_dispositivo, editar_dispositivo, excluir_dispositivo, ativar_dispositivo |
| **Metas** | criar_meta, editar_meta, excluir_meta |
| **Notificações** | marcar_notificacao_lida, excluir_notificacao |
| **Sync** | sync_push, sync_pull, sync_conflict_resolve |
| **Sistema** | migracao_banco, init_admin, cron_vencimento, cron_gerar_cobrancas |
| **Sessão** | revogar_sessao, revogar_todas_sessoes |

### 🎯 Severidades

| Severidade | Uso |
|------------|-----|
| `info` | Operações normais (CRUD, login) |
| `aviso` | Operações sensíveis (reset de senha, alteração de permissão) |
| `critico` | Ações destrutivas (exclusão, envio para estoque) |
| `seguranca` | Eventos de segurança (login falha, bloqueio) |

### 📍 Origens

| Origem | Descrição |
|--------|-----------|
| `web` | Ações via interface web |
| `mobile` | Ações via aplicativo mobile |
| `sistema` | Ações automáticas do sistema |
| `cron` | Ações executadas por cron jobs |

---

## Automação (Cron Jobs)

### ⏰ Vencimento de Cobranças

**Endpoint:** `POST /api/cron/vencimento`

Verifica cobranças com `status = 'Pendente'` cuja `dataVencimento` já passou e atualiza para `'Atrasado'`. Também gera notificações para os usuários responsáveis.

### 📝 Geração Automática de Cobranças

**Endpoint:** `POST /api/cron/gerar-cobrancas`

Gera cobranças pendentes para locações ativas com pagamento por período:
- Calcula o período atual com base na `periodicidade`
- Usa `dataPrimeiraCobranca` como referência
- Não gera cobrança duplicada se já existe para o mesmo período
- Registra auditoria (cron_gerar_cobrancas)

### 🔑 Autenticação

Cron jobs usam autenticação própria via `CRON_SECRET`:
- Header: `x-cron-secret: <CRON_SECRET>`
- Query: `?secret=<CRON_SECRET>`
- Alternativa: Sessão de Administrador

**Configuração Vercel:**
```json
{
  "crons": [
    { "path": "/api/cron/vencimento", "schedule": "0 8 * * *" },
    { "path": "/api/cron/gerar-cobrancas", "schedule": "0 6 1 * *" }
  ]
}
```

---

## Sistema de Email

### 📧 Configuração (Nodemailer)

Variáveis necessárias: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`

### 🔔 Notificação de Cobranças Atrasadas

**Endpoint:** `POST /api/email/notificar-atrasadas`

Envia email para todos os clientes com cobranças em atraso, listando número da cobrança, produto, valor pendente, dias de atraso.

### 🧪 Email de Teste

**Endpoint:** `POST /api/email/teste`

---

## Estrutura de Pastas

```
app-cobrancas-web/
├── app/
│   ├── (app)/                    # Rotas autenticadas
│   │   ├── dashboard/            # Dashboard
│   │   ├── clientes/             # Gestão de clientes
│   │   ├── produtos/             # Gestão de produtos
│   │   ├── locacoes/             # Gestão de locações
│   │   ├── cobrancas/            # Gestão de cobranças
│   │   ├── manutencoes/          # Manutenções
│   │   ├── relogios/             # Alterações de relógio
│   │   ├── agenda/               # Calendário de pagamentos
│   │   ├── mapa/                 # Mapa interativo de rotas
│   │   ├── relatorios/           # 14 tipos de relatório
│   │   ├── perfil/               # Perfil do usuário
│   │   └── admin/                # Área administrativa
│   │       ├── usuarios/         # Gestão de usuários
│   │       ├── rotas/            # Gestão de rotas
│   │       ├── cadastros/        # Tipos/desc/tam/estabelecimentos
│   │       ├── dispositivos/     # Dispositivos móveis
│   │       ├── sync/             # Monitor de sincronização
│   │       ├── auditoria/        # Logs de auditoria
│   │       ├── metas/            # Metas de arrecadação
│   │       ├── cron/             # Automação
│   │       └── email/            # Configuração de email
│   ├── (auth)/login/             # Login web
│   └── api/                      # API Routes (50+ endpoints)
│       ├── auth/                 # Login, logout, forgot/reset password
│       ├── sync/                 # Push, Pull, Snapshot, Conflicts
│       ├── clientes/             # CRUD + batch
│       ├── produtos/             # CRUD + batch
│       ├── locacoes/             # CRUD + relocar + enviar-estoque
│       ├── cobrancas/            # CRUD + batch
│       ├── rotas/                # CRUD
│       ├── usuarios/             # CRUD
│       ├── manutencoes/          # CRUD
│       ├── historico-relogio/    # CRUD
│       ├── dispositivos/         # CRUD + ativar/status
│       ├── estabelecimentos/     # CRUD
│       ├── tipos-produto/        # CRUD
│       ├── descricoes-produto/   # CRUD
│       ├── tamanhos-produto/     # CRUD
│       ├── equipamentos/         # Listagem
│       ├── dashboard/            # Métricas + atividade + mobile
│       ├── relatorios/           # 14 tipos
│       ├── mapa/                 # Dados + geocodificar + seed
│       ├── agenda/               # Pagamentos por data
│       ├── busca-global/         # Busca unificada
│       ├── metas/                # CRUD
│       ├── notificacoes/         # CRUD
│       ├── auditoria/            # Logs
│       ├── cron/                 # vencimento + gerar-cobrancas
│       ├── email/                # notificar-atrasadas + teste
│       ├── admin/                # init + migrate + migrate-db + sync
│       ├── localizacao/          # CEP + estados + cidades
│       ├── mobile/auth/          # Auth mobile
│       └── health/               # Healthcheck
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx           # Menu lateral + botão X no mobile
│   │   ├── top-bar.tsx           # Header com busca + hamburger
│   │   ├── global-search.tsx     # Busca global (⌘K)
│   │   ├── notification-bell.tsx # Sino de notificações
│   │   └── theme-toggle.tsx      # Toggle dark/light
│   ├── providers/                # Session + Theme providers
│   ├── produtos/                 # ProdutoForm + AttributeCrud
│   ├── usuarios/                 # UsuarioForm
│   └── ui/                       # badge, confirm-modal, empty-state,
│                                  # form, kpi-card, loading, pagination,
│                                  # skeleton, stat-card, toast, toaster
├── lib/
│   ├── prisma.ts                 # Singleton Prisma Client
│   ├── auth.ts                   # NextAuth config
│   ├── auth-core.ts              # Auth compartilhada
│   ├── jwt.ts                    # JWT para mobile
│   ├── hash.ts                   # bcrypt
│   ├── api-helpers.ts            # getAuthSession, handleApiError
│   ├── sync-engine.ts            # Motor de sincronização
│   ├── sync-helpers.ts           # Helpers de sync
│   ├── sync-conflict-resolver.ts # Resolução de conflitos
│   ├── auditoria.ts              # Sistema de auditoria
│   ├── notificacoes.ts           # Sistema de notificações
│   ├── email.ts                  # Nodemailer
│   ├── rate-limit.ts             # Sliding window rate limiter
│   ├── logger.ts                 # Logger estruturado
│   ├── pix.ts                    # QR Code PIX
│   ├── pix-config.ts             # Config PIX
│   ├── export-utils.ts           # Excel/PDF export
│   ├── relatorios-helpers.ts     # Helpers relatórios
│   ├── locacao-service.ts        # Serviços locação
│   ├── produto-service.ts        # Serviços produto
│   ├── dispositivo-helpers.ts    # Helpers dispositivos
│   ├── permissoes-padrao.ts      # Permissões padrão
│   ├── validations.ts            # Schemas Zod centralizados
│   ├── utils.ts                  # Utilitários gerais
│   └── utils/masks.ts            # Máscaras CPF/CNPJ/CEP/tel
├── packages/
│   └── shared/                   # @cobrancas/shared
│       └── src/
│           ├── types.ts          # Tipos compartilhados
│           ├── constants.ts      # Constantes
│           ├── schemas.ts        # Schemas Zod
│           └── utils.ts          # Utilitários
├── shared/types.ts               # Backward compat
├── prisma/
│   ├── schema.prisma             # 23 modelos
│   └── seed.ts                   # Dados iniciais
├── types/next-auth.d.ts          # Extensão NextAuth
├── middleware.ts                 # Auth + permissões granulares
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## Pacote Compartilhado (@cobrancas/shared)

O projeto usa monorepo com `workspaces` para compartilhar tipos, constantes e schemas entre web e mobile.

### Estrutura

```
packages/shared/src/
├── types.ts      # Tipos TypeScript (SyncableEntity, Cliente, Produto, etc.)
├── constants.ts  # Constantes (SYNC_PROCESSING_ORDER, SYNC_PULL_LIMIT, etc.)
├── schemas.ts    # Schemas Zod compartilhados
└── utils.ts      # Utilitários (getProdutoNome, formatarMoeda, etc.)
```

### Uso

```typescript
import { Cliente, SYNC_PROCESSING_ORDER } from '@cobrancas/shared'
```

### Constantes Importantes

| Constante | Valor | Descrição |
|-----------|-------|-----------|
| `SYNC_PULL_LIMIT` | 500 | Máximo registros por entidade no pull |
| `SYNC_STALE_THRESHOLD_DAYS` | 30 | Dias sem sync para considerar stale |
| `DEFAULT_AUTO_SYNC_INTERVAL` | 5 | Intervalo de auto-sync (minutos) |
| `SYNC_PROCESSING_ORDER` | ['rota', 'cliente', ...] | Ordem de processamento no push |

---

## Deploy

### Vercel + Neon

```bash
# 1. Criar banco no Neon
# 2. Criar projeto na Vercel, conectar repositório
# 3. Configurar variáveis de ambiente:
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
NEXTAUTH_SECRET="chave-secreta-32-caracteres"
NEXTAUTH_URL="https://seu-dominio.vercel.app"
JWT_SECRET="outra-chave-secreta-32-caracteres"
CRON_SECRET="chave-secreta-para-cron"

# 4. Migrations e seed
npx prisma db push
npm run db:seed
```

### Cron Jobs na Vercel

```json
{
  "crons": [
    { "path": "/api/cron/vencimento", "schedule": "0 8 * * *" },
    { "path": "/api/cron/gerar-cobrancas", "schedule": "0 6 1 * *" }
  ]
}
```

### Build Local

```bash
npm run build
npm start
```

---

## Integração com Mobile

### Endpoints Consumidos pelo Mobile

| Endpoint | Uso |
|----------|-----|
| `/api/health` | Verificar conexão |
| `/api/auth/login` | Login |
| `/api/auth/me` | Dados do usuário |
| `/api/auth/change-password` | Alterar senha |
| `/api/sync/push` | Enviar mudanças |
| `/api/sync/pull` | Receber mudanças |
| `/api/sync/snapshot` | Snapshot completo |
| `/api/dispositivos/ativar` | Ativar dispositivo |
| `/api/dispositivos/status` | Verificar ativação |

---

## Problemas Conhecidos

### 🔴 Bugs Críticos

#### 1. Senha em Texto Plano no Mobile

**Problema:** O mobile salva senhas em texto plano no SQLite local.
**Solução Recomendada:** Implementar hash bcrypt no mobile.

#### 2. Senha Apagada na Sincronização

**Problema:** `INSERT OR REPLACE` no mobile apaga campos não enviados (incluindo senha).
**Solução Recomendada:** Usar `INSERT OR IGNORE` + `UPDATE` seletivo.

#### 3. Campo `senha` no ALLOWED_FIELDS do Sync

**Problema:** O campo `senha` está permitido no PUSH de sincronização.
**Solução Recomendada:** Remover `senha` de `ALLOWED_FIELDS.usuario`.

---

### ⚠️ Melhorias Recomendadas

| Item | Prioridade | Descrição |
|------|------------|-----------|
| Rate Limiting em APIs de sync | Alta | Implementar em `/api/sync/push` e `/api/sync/pull` |
| Campos de data como DateTime | Média | Migrar campos String para DateTime |
| PRAGMA journal_mode=WAL | Baixa | Melhorar performance SQLite no mobile |
| Sync fields em Manutencao/Meta | Média | Adicionar syncStatus, version, deviceId |
| Rate limiting persistente | Média | Migrar de in-memory para Redis/Vercel KV |
| Email em massa | Baixa | Fila de emails para grandes volumes |
| WebSocket | Baixa | Notificações em tempo real |

---

## Histórico de Refatoração

### Fase 1 — Áreas Core (Concluída)
- **Clientes**: API com Zod, auth, rota-filtering, batch, paginação
- **Cobranças**: API com Zod, auth, rota-filtering, batch, recibo térmico, PIX
- **Rotas**: API com Zod, auth, CRUD completo, cores para mapa
- **Locações**: API com Zod, auth, relocar, enviar-estoque, transações atômicas
- **Produtos**: API com Zod, auth, batch, filtros avançados
- **Usuários**: API com auth granular, CRUD completo, permissões expandidas

### Fase 2 — Áreas Administrativas (Concluída)
- **Dispositivos**: CRUD completo, ativação com PIN
- **Sincronização**: Push/Pull/Snapshot, resolução de conflitos, paginação
- **Relatórios**: 14 tipos com exportação Excel e gráficos Recharts

### Fase 3 — Segurança e Consistência (Concluída)
- **Metas**: Auth, mass assignment corrigido, Zod
- **Mapa de Rotas**: Dados financeiros, cores do DB, Leaflet interativo
- **Agenda**: Auth, rota-filtering
- **Auditoria**: Auth centralizado, ações para todas as entidades
- **Manutenções/Relógio/Estabelecimentos**: Zod centralizado
- **Atributos de Produto**: Auth consistente, Zod schemas
- **Notificações/Equipamentos**: Auth corrigida
- **Busca Global**: ⌘K, 4 entidades, recentes, mobile-friendly
- **Layout**: Menu na TopBar, dark mode, notificações

### Fase 4 — Funcionalidades Novas (Concluída)
- **Email**: Notificação de atrasadas via Nodemailer
- **Cron Jobs**: Geração automática de cobranças, marcação de vencimento
- **Recuperação de Senha**: Tokens com hash SHA-256 e expiração
- **Rate Limiting**: Sliding window in-memory
- **Sessões**: Tabela Sessao com refresh tokens
- **Tentativas de Login**: Rastreamento de IP e user agent
- **Permissões Granulares**: 18 permissões web no middleware
- **Monorepo**: @cobrancas/shared com tipos, constantes e schemas

---

## Licença

Propriedade privada. Todos os direitos reservados.
