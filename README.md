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
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Deploy](#deploy)

---

## Visão Geral

O **App Cobranças Web** é uma plataforma completa para:

- 📊 **Gestão de Clientes** - Cadastro completo com endereço, contatos e vinculação a rotas
- 🎱 **Controle de Produtos** - Bilhares, jukeboxes, mesas e outros equipamentos
- 📍 **Gestão de Locações** - Contratos de locação com diferentes formas de pagamento
- 💰 **Cobranças** - Registro de leituras de relógio, cálculo de valores e controle de pagamentos
- 🗺️ **Rotas** - Organização de clientes por rotas de visitação
- 👥 **Usuários** - Controle de acesso com diferentes níveis de permissão
- 🔄 **Sincronização Mobile** - Dados disponíveis offline no aplicativo mobile

---

## Stack Tecnológica

| Tecnologia | Versão | Finalidade |
|------------|--------|------------|
| **Next.js** | 15.x | Framework full-stack (App Router) |
| **React** | 19.x | Interface de usuário |
| **TypeScript** | 5.x | Tipagem estática |
| **PostgreSQL** | 15+ | Banco de dados relacional |
| **Prisma** | 6.x | ORM com type-safety |
| **NextAuth** | 4.x | Autenticação web |
| **JWT** | - | Autenticação mobile |
| **Tailwind CSS** | 3.x | Estilização |
| **Zod** | 3.x | Validação de schemas |
| **Lucide React** | - | Ícones |
| **date-fns** | 4.x | Manipulação de datas |

---

## Início Rápido

### Pré-requisitos

- Node.js 18+
- PostgreSQL 15+ (ou conta no Supabase/Railway)
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

# Autenticação Web (NextAuth)
NEXTAUTH_SECRET="chave-secreta-min-32-caracteres"
NEXTAUTH_URL="http://localhost:3000"

# Autenticação Mobile (JWT)
JWT_SECRET="outra-chave-secreta-min-32-caracteres"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="7d"

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

O sistema possui **14 tabelas** organizadas em entidades principais, tabelas de apoio e tabelas de sistema.

### 📊 Entidades Principais

#### Rota

Rotas de visitação para organização dos clientes.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String (UUID) | Identificador único |
| `descricao` | String | Nome da rota (ex: "Linha Norte", "Centro") |
| `status` | String | 'Ativo' ou 'Inativo' |
| `syncStatus` | String | Status de sincronização |
| `lastSyncedAt` | DateTime? | Última sincronização |
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
| `telefoneSecundario` | String? | Telefone secundário |
| `email` | String? | Email |
| `contatos` | Json? | Lista de contatos adicionais |
| `cep` | String? | CEP |
| `logradouro` | String? | Endereço |
| `numero` | String? | Número |
| `complemento` | String? | Complemento |
| `bairro` | String? | Bairro |
| `cidade` | String? | Cidade |
| `estado` | String? | Estado (UF) |
| `observacoes` | String? | Observações gerais |
| `rotaId` | String | FK para Rota |
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
| `tipoId` | String? | FK para TipoProduto |
| `tipoNome` | String | Nome do tipo (cache) |
| `descricaoId` | String? | FK para DescricaoProduto |
| `descricaoNome` | String | Nome da descrição (cache) |
| `tamanhoId` | String? | FK para TamanhoProduto |
| `tamanhoNome` | String | Nome do tamanho (cache) |
| `conservacao` | String | 'Ótima', 'Boa', 'Regular', 'Ruim', 'Péssima' |
| `statusProduto` | String | 'Ativo', 'Inativo', 'Manutenção' |
| `estabelecimento` | String? | Local quando não locado |
| `observacoes` | String? | Observações |

**Relacionamentos:**
- `locacoes[]` - Histórico de locações
- `cobrancas[]` - Cobranças relacionadas
- `historicoRelogio[]` - Histórico de alterações do relógio

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
| `dataLocacao` | String | Data de início da locação |
| `dataFim` | String? | Data de término |
| `formaPagamento` | String | 'Periodo', 'PercentualPagar', 'PercentualReceber' |
| `numeroRelogio` | String | Leitura inicial do relógio |
| `precoFicha` | Float | Valor por ficha/partida |
| `percentualEmpresa` | Float? | Percentual da empresa |
| `percentualCliente` | Float? | Percentual do cliente |
| `valorFixo` | Float? | Valor fixo (pagamento por período) |
| `periodicidade` | String? | 'Semanal', 'Quinzenal', 'Mensal' |
| `observacoes` | String? | Observações |
| `status` | String | 'Ativa', 'Finalizada', 'Cancelada' |

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
| `locacaoId` | String? | FK para Locacao |
| `clienteId` | String | FK para Cliente |
| `clienteNome` | String | Nome do cliente (cache) |
| `produtoId` | String | FK para Produto |
| `produtoIdentificador` | String | Identificação do produto (cache) |
| `dataInicio` | String | Início do período cobrado |
| `dataFim` | String | Fim do período cobrado |
| `dataPagamento` | String? | Data do pagamento |
| `relogioAnterior` | Float | Leitura anterior do relógio |
| `relogioAtual` | Float | Leitura atual do relógio |
| `fichasRodadas` | Float | Diferença entre leituras |
| `totalBruto` | Float | Valor bruto (fichas × preço) |
| `descontoPartidasQtd` | Float? | Quantidade de partidas de desconto |
| `descontoDinheiro` | Float? | Desconto em dinheiro |
| `percentualEmpresa` | Float | Percentual da empresa |
| `valorPercentual` | Float | Valor calculado do percentual |
| `totalClientePaga` | Float | Total que o cliente deve pagar |
| `valorRecebido` | Float? | Valor efetivamente recebido |
| `saldoDevedorGerado` | Float? | Saldo devedor (se pagamento parcial) |
| `observacoes` | String? | Observações |
| `status` | String | 'Pago', 'Parcial', 'Pendente', 'Atrasado' |

**Cálculo de Valores:**

```
fichasRodadas = relogioAtual - relogioAnterior
totalBruto = fichasRodadas × precoFicha
valorPercentual = totalBruto × (percentualEmpresa / 100)
totalClientePaga = valorPercentual - descontoDinheiro
```

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
| `senha` | String | Senha hasheada (bcrypt) |
| `cpf` | String? | CPF |
| `telefone` | String? | Telefone |
| `tipoPermissao` | String | 'Administrador', 'Secretario', 'AcessoControlado' |
| `permissoesWeb` | Json? | Permissões detalhadas para web |
| `permissoesMobile` | Json? | Permissões detalhadas para mobile |
| `rotasPermitidas` | Json? | Array de IDs de rotas permitidas |
| `status` | String | 'Ativo' ou 'Inativo' |
| `bloqueado` | Boolean | Se está bloqueado |
| `dataUltimoAcesso` | DateTime? | Último acesso |
| `ultimoAcessoDispositivo` | String? | 'Web' ou nome do dispositivo |

**Relacionamentos:**
- `rotasPermitidasRel[]` - Rotas com acesso permitido

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
| **RefreshToken** | Tokens de renovação para mobile |

---

## APIs e Endpoints

### 🔐 Autenticação

| Endpoint | Método | Descrição | Body/Params |
|----------|--------|-----------|-------------|
| `/api/auth/login` | POST | Login mobile | `{ email, password }` |
| `/api/auth/me` | GET | Dados do usuário logado | - |
| `/api/auth/logout` | POST | Logout do usuário | - |
| `/api/auth/change-password` | POST | Alterar senha | `{ senhaAtual, novaSenha }` |
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

---

### 🔄 Sincronização

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/sync/push` | POST | Mobile envia alterações locais |
| `/api/sync/pull` | POST | Mobile recebe alterações do servidor |
| `/api/sync/conflicts` | GET | Lista conflitos pendentes |
| `/api/sync/conflict/resolve` | POST | Resolve um conflito |

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
  "errors": []
}
```

**PULL - Receber Mudanças:**
```json
// Request
{
  "deviceId": "dev_1234567890_abc",
  "deviceKey": "samsung_mobile_1234567890_abc",
  "lastSyncAt": "2024-01-01T00:00:00Z"
}

// Response
{
  "success": true,
  "lastSyncAt": "2024-01-01T02:00:00Z",
  "changes": {
    "clientes": [...],
    "produtos": [...],
    "locacoes": [...],
    "cobrancas": [...],
    "rotas": [...],
    "usuarios": [...]
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
| `/api/locacoes/[id]` | GET | Detalhes da locação |
| `/api/locacoes/[id]` | PUT | Atualizar locação |
| `/api/locacoes/[id]/relocar` | POST | Relocar para outro cliente |
| `/api/locacoes/[id]/enviar-estoque` | POST | Encerrar e enviar para estoque |

**Relocação:**
```json
{
  "novoClienteId": "uuid-novo-cliente",
  "dataRelocacao": "2024-01-15",
  "numeroRelogio": "12345",
  "observacoes": "Observação opcional"
}
```

---

#### Cobranças

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/cobrancas` | GET | Listar cobranças |
| `/api/cobrancas` | POST | Criar cobrança |
| `/api/cobrancas/[id]` | GET | Detalhes |
| `/api/cobrancas/[id]` | PUT | Atualizar |

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
| `/api/usuarios/[id]` | DELETE | Remover |

---

### 📍 Localização

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/localizacao/estados` | GET | Lista de estados (IBGE) |
| `/api/localizacao/cidades?uf=SP` | GET | Cidades por estado |
| `/api/localizacao/cep?cep=01234567` | GET | Buscar endereço (ViaCEP) |

---

### 📊 Dashboard e Relatórios

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/dashboard` | GET | Métricas para dashboard web |
| `/api/dashboard/mobile` | GET | Métricas para dashboard mobile |
| `/api/relatorios/financeiro` | GET | Relatório financeiro |
| `/api/relatorios/produtos` | GET | Relatório de produtos |

---

### ⚙️ Sistema

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/health` | GET | Healthcheck |
| `/api/admin/init` | POST | Inicializar banco |
| `/api/dispositivos` | GET | Listar dispositivos |
| `/api/dispositivos` | POST | Criar dispositivo |
| `/api/dispositivos/[id]` | DELETE | Remover dispositivo |
| `/api/dispositivos/ativar` | POST | Ativar dispositivo |
| `/api/dispositivos/status` | POST | Verificar status de ativação |

---

## Páginas do Sistema

### 🔓 Rotas Públicas

| Página | Rota | Descrição |
|--------|------|-----------|
| Login | `/login` | Autenticação de usuários web |

---

### 🔒 Rotas Autenticadas

#### Dashboard (`/`)

**KPIs exibidos:**
- Total de clientes ativos
- Produtos locados vs. disponíveis
- Receita do mês atual
- Saldo devedor total
- Cobranças recentes (últimas 10)
- Alertas (cobranças atrasadas, conflitos de sync)

---

#### Clientes (`/clientes`)

| Rota | Função |
|------|--------|
| `/clientes` | Listagem com filtros (rota, status, busca) e paginação |
| `/clientes/novo` | Formulário de cadastro com busca de CEP |
| `/clientes/[id]` | Detalhes com locações e cobranças |
| `/clientes/[id]/editar` | Editar dados do cliente |

**Funcionalidades:**
- Cadastro de pessoa física ou jurídica
- Validação de CPF/CNPJ
- Busca automática de endereço por CEP
- Vinculação a rotas
- Histórico de locações e cobranças

---

#### Produtos (`/produtos`)

| Rota | Função |
|------|--------|
| `/produtos` | Listagem com filtros (tipo, status, disponibilidade) |
| `/produtos/novo` | Cadastro de produto |
| `/produtos/[id]` | Detalhes com histórico de locações |
| `/produtos/[id]/editar` | Editar produto |

**Funcionalidades:**
- Cadastro com identificador único (placa)
- Controle de relógio (contador)
- Classificação por tipo, descrição, tamanho
- Status de conservação
- Histórico de locações

---

#### Locações (`/locacoes`)

| Rota | Função |
|------|--------|
| `/locacoes` | Listagem com filtros (status, cliente, produto) |
| `/locacoes/nova` | Nova locação |
| `/locacoes/[id]` | Detalhes com cobranças |
| `/locacoes/[id]/editar` | Editar locação |
| `/locacoes/[id]/relocar` | Relocar produto para outro cliente |
| `/locacoes/[id]/enviar-estoque` | Encerrar locação |

**Funcionalidades:**
- Seleção de cliente e produto disponível
- Três formas de pagamento (período, percentual)
- Registro de leitura inicial do relógio
- Relocação de produto para outro cliente
- Envio para estoque ao finalizar

---

#### Cobranças (`/cobrancas`)

| Rota | Função |
|------|--------|
| `/cobrancas` | Listagem com filtros (status, período, cliente) |
| `/cobrancas/nova` | Nova cobrança |
| `/cobrancas/[id]` | Detalhes |
| `/cobrancas/[id]/editar` | Editar cobrança |

**Funcionalidades:**
- Seleção de locação ativa
- Registro de leitura do relógio
- Cálculo automático de valores
- Aplicação de descontos
- Controle de pagamento parcial
- Geração de saldo devedor

---

#### Relatórios (`/relatorios`)

**Informações disponíveis:**
- Receita por período (mês/ano)
- Saldo devedor total e por cliente
- Cobranças por status
- Produtos mais locados
- Clientes por rota

---

### 👑 Área Administrativa (`/admin/*`)

**Acesso restrito:** Apenas usuários com `tipoPermissao = 'Administrador'`

#### Usuários (`/admin/usuarios`)

| Rota | Função |
|------|--------|
| `/admin/usuarios` | Listagem de usuários |
| `/admin/usuarios/novo` | Criar usuário |
| `/admin/usuarios/[id]/editar` | Editar usuário |

**Funcionalidades:**
- Definir tipo de permissão
- Configurar permissões específicas (web/mobile)
- Vincular rotas permitidas (para AcessoControlado)
- Bloquear/desbloquear usuários

---

#### Rotas (`/admin/rotas`)

| Rota | Função |
|------|--------|
| `/admin/rotas` | Listagem de rotas |
| `/admin/rotas/nova` | Criar rota |
| `/admin/rotas/[id]` | Editar rota com clientes vinculados |

---

#### Dispositivos (`/admin/dispositivos`)

| Rota | Função |
|------|--------|
| `/admin/dispositivos` | Listar dispositivos móveis |
| `/admin/dispositivos/novo` | Criar novo dispositivo |

**Funcionalidades:**
- Gerar senha numérica de 6 dígitos para ativação
- Visualizar chave do dispositivo
- Ver último acesso de cada dispositivo
- Ativar/desativar dispositivos

---

#### Sincronização (`/admin/sync`)

**Informações exibidas:**
- Status de sincronização de cada dispositivo
- Última sincronização
- Conflitos pendentes
- Logs de alterações recentes

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

**Importante:** A sincronização NÃO usa o token JWT do usuário. O dispositivo é a credencial para sincronização.

- `deviceKey` - Chave única do dispositivo registrado
- Dispositivo precisa estar cadastrado e ativo no sistema
- Qualquer usuário logado no dispositivo pode sincronizar

### 📤 PUSH (Mobile → Servidor)

**Processo:**
1. Mobile coleta mudanças locais (ChangeLog)
2. Envia para `/api/sync/push` com `deviceKey`
3. Servidor valida dispositivo
4. Processa mudanças na ordem de dependência:
   - 1º: Rotas
   - 2º: Clientes
   - 3º: Produtos
   - 4º: Locações
   - 5º: Cobranças
5. Detecta conflitos por versão
6. Retorna resultado

### 📥 PULL (Servidor → Mobile)

**Processo:**
1. Mobile envia `lastSyncAt` para `/api/sync/pull`
2. Servidor busca entidades modificadas após essa data
3. Filtra apenas mudanças de **outros dispositivos**
4. Retorna todas as entidades atualizadas

### ⚠️ Detecção de Conflitos

**Critério:** Conflito detectado quando:
- Servidor tem versão mais recente que o mobile
- Ambos modificaram a mesma entidade

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
| `lastSyncedAt` | DateTime? | Timestamp da última sincronização |
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

### Mobile (JWT Customizado)

- Access Token: 15 minutos (configurável)
- Refresh Token: 7 dias
- Armazenado em PostgreSQL para revogação

### Fluxo de Login Mobile

```
1. POST /api/auth/login { email, password }
   ↓
2. Servidor valida credenciais
   ↓
3. Gera Access Token + Refresh Token
   ↓
4. Retorna { token, user }
   ↓
5. Mobile armazena token
   ↓
6. Próximas requisições: Authorization: Bearer <token>
```

---

## Permissões e Controle de Acesso

### Tipos de Permissão

| Tipo | Descrição | Acesso |
|------|-----------|--------|
| **Administrador** | Acesso total ao sistema | Todas as rotas e funcionalidades |
| **Secretario** | Gestão operacional | Clientes, produtos, locações, cobranças |
| **AcessoControlado** | Acesso restrito | Apenas rotas atribuídas |

### Estrutura de Permissões

```typescript
interface PermissoesUsuario {
  web: {
    todosCadastros: boolean;
    locacaoRelocacaoEstoque: boolean;
    relatorios: boolean;
  };
  mobile: {
    todosCadastros: boolean;
    alteracaoRelogio: boolean;
    locacaoRelocacaoEstoque: boolean;
    cobrancasFaturas: boolean;
  };
}
```

### Controle por Rota

Para `AcessoControlado`, o campo `rotasPermitidas` contém os IDs das rotas que o usuário pode acessar. O mobile e web filtram automaticamente clientes e cobranças por essas rotas.

---

## Estrutura de Pastas

```
app-cobrancas-web/
├── app/                          # Next.js App Router
│   ├── (app)/                    # Rotas autenticadas
│   │   ├── dashboard/            # Dashboard principal
│   │   ├── clientes/             # Gestão de clientes
│   │   │   ├── [id]/             # Detalhes e edição
│   │   │   └── novo/             # Novo cliente
│   │   ├── produtos/             # Gestão de produtos
│   │   ├── locacoes/             # Gestão de locações
│   │   ├── cobrancas/            # Gestão de cobranças
│   │   ├── relatorios/           # Relatórios
│   │   └── admin/                # Área administrativa
│   │       ├── usuarios/         # Gestão de usuários
│   │       ├── rotas/            # Gestão de rotas
│   │       ├── dispositivos/     # Dispositivos móveis
│   │       └── sync/             # Monitor de sync
│   ├── (auth)/                   # Rotas de autenticação
│   │   └── login/                # Login web
│   ├── api/                      # API Routes
│   │   ├── auth/                 # Autenticação
│   │   ├── sync/                 # Sincronização
│   │   ├── clientes/             # CRUD clientes
│   │   ├── produtos/             # CRUD produtos
│   │   ├── locacoes/             # CRUD locações
│   │   ├── cobrancas/            # CRUD cobranças
│   │   ├── rotas/                # CRUD rotas
│   │   ├── usuarios/             # CRUD usuários
│   │   ├── dispositivos/         # CRUD dispositivos
│   │   ├── dashboard/            # Métricas
│   │   ├── relatorios/           # Relatórios
│   │   ├── localizacao/          # CEP/Estados/Cidades
│   │   └── health/               # Healthcheck
│   ├── globals.css               # Estilos globais
│   ├── layout.tsx                # Layout raiz
│   └── page.tsx                  # Página inicial
├── components/                   # Componentes React
│   ├── layout/                   # Componentes de layout
│   │   ├── AppSidebar.tsx        # Menu lateral
│   │   └── Header.tsx            # Cabeçalho
│   └── ui/                       # Componentes UI
│       ├── badge.tsx             # Badge de status
│       ├── button.tsx            # Botão
│       ├── card.tsx              # Card
│       ├── input.tsx             # Input
│       ├── pagination.tsx        # Paginação
│       └── ...                   # Outros componentes
├── lib/                          # Bibliotecas e utilitários
│   ├── prisma.ts                 # Singleton Prisma Client
│   ├── auth.ts                   # Configuração NextAuth
│   ├── jwt.ts                    # JWT para mobile
│   ├── hash.ts                   # bcrypt para senhas
│   ├── api-helpers.ts            # Helpers para API
│   └── sync-engine.ts            # Motor de sincronização
├── shared/                       # Código compartilhado
│   └── types.ts                  # Tipos TypeScript
├── prisma/                       # Prisma ORM
│   ├── schema.prisma             # Schema do banco
│   └── seed.ts                   # Dados iniciais
├── types/                        # Tipos TypeScript
├── middleware.ts                 # Middleware de auth
├── next.config.ts                # Configuração Next.js
├── tailwind.config.ts            # Configuração Tailwind
└── package.json                  # Dependências
```

---

## Deploy

### Vercel + Supabase/Railway

```bash
# 1. Criar banco no Supabase ou Railway
#    Copiar DATABASE_URL

# 2. Criar projeto na Vercel
#    Conectar repositório GitHub

# 3. Configurar variáveis de ambiente:
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="chave-secreta-32-caracteres"
NEXTAUTH_URL="https://seu-dominio.vercel.app"
JWT_SECRET="outra-chave-secreta-32-caracteres"

# 4. Rodar migrations (local ou via script)
npx prisma db push

# 5. Popular banco
npm run db:seed
```

### Build Local

```bash
npm run build
npm start
```

---

## Integração com Mobile

Configurar no app mobile (`app.json` ou `.env`):

```json
{
  "expo": {
    "extra": {
      "API_URL": "https://seu-dominio.vercel.app",
      "USE_MOCK": "false"
    }
  }
}
```

### Endpoints Consumidos pelo Mobile

| Endpoint | Uso |
|----------|-----|
| `/api/health` | Verificar conexão |
| `/api/auth/login` | Login |
| `/api/sync/push` | Enviar mudanças |
| `/api/sync/pull` | Receber mudanças |
| `/api/dispositivos/ativar` | Ativar dispositivo |
| `/api/dispositivos/status` | Verificar ativação |

---

## Licença

Propriedade privada. Todos os direitos reservados.
