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
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Deploy](#deploy)
- [Problemas Conhecidos](#problemas-conhecidos)

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
| **bcryptjs** | - | Hash de senhas |

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

O sistema possui **17 tabelas** organizadas em entidades principais, tabelas de apoio e tabelas de sistema.

### 📊 Entidades Principais

#### Rota

Rotas de visitação para organização dos clientes.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String (UUID) | Identificador único |
| `descricao` | String | Nome da rota (ex: "Linha Norte", "Centro") |
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
| `tipoId` | String | FK para TipoProduto |
| `tipoNome` | String | Nome do tipo (cache) |
| `descricaoId` | String | FK para DescricaoProduto |
| `descricaoNome` | String | Nome da descrição (cache) |
| `tamanhoId` | String | FK para TamanhoProduto |
| `tamanhoNome` | String | Nome do tamanho (cache) |
| `conservacao` | String | 'Ótima', 'Boa', 'Regular', 'Ruim', 'Péssima' |
| `statusProduto` | String | 'Ativo', 'Inativo', 'Manutenção' |
| `estabelecimento` | String? | Local quando não locado |
| `observacao` | String? | Observações |

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
| `percentualEmpresa` | Float | Percentual da empresa |
| `percentualCliente` | Float | Percentual do cliente |
| `valorFixo` | Float? | Valor fixo (pagamento por período) |
| `periodicidade` | String? | 'Semanal', 'Quinzenal', 'Mensal' |
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
| `dataPagamento` | String? | Data do pagamento |
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
| `permissoesWeb` | Json | Permissões detalhadas para web |
| `permissoesMobile` | Json | Permissões detalhadas para mobile |
| `rotasPermitidas` | Json | Array de IDs de rotas permitidas |
| `status` | String | 'Ativo' ou 'Inativo' |
| `bloqueado` | Boolean | Se está bloqueado |
| `dataUltimoAcesso` | String? | Último acesso |
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

**Validações de Login:**
- Usuário deve ter `status = 'Ativo'`
- Usuário não pode estar `bloqueado = true`
- Usuário não pode ter `deletedAt` (soft delete)
- Atualiza `dataUltimoAcesso` e `ultimoAcessoDispositivo`

---

### 🔄 Sincronização

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/sync/push` | POST | Mobile envia alterações locais |
| `/api/sync/pull` | POST | Mobile recebe alterações do servidor |
| `/api/sync/conflicts` | GET | Lista conflitos pendentes |
| `/api/sync/conflict/resolve` | POST | Resolve um conflito |

**Autenticação de Sincronização:**

A sincronização **NÃO** usa o token JWT do usuário. A autenticação é feita via `deviceKey`:

```json
// PUSH e PULL usam deviceKey
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
  },
  "tiposProduto": [...],
  "descricoesProduto": [...],
  "tamanhosProduto": [...]
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
  "novoClienteNome": "Nome do Cliente",
  "formaPagamento": "PercentualReceber",
  "numeroRelogio": "12345",
  "precoFicha": 2.50,
  "percentualEmpresa": 50,
  "percentualCliente": 50,
  "motivoRelocacao": "Cliente solicitou mudança",
  "observacao": "Observação opcional",
  "trocaPano": true
}
```

**Enviar para Estoque:**
```json
{
  "estabelecimento": "Barracão",
  "motivo": "Produto precisa de manutenção",
  "observacao": "Observação opcional"
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

**Query Params (GET):**
- `clienteId` - Filtrar por cliente
- `status` - Filtrar por status
- `dataInicio` - Data inicial
- `dataFim` - Data final

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

### 📊 Dashboard e Relatórios

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/dashboard` | GET | Métricas para dashboard web |
| `/api/dashboard/mobile` | GET | Métricas para dashboard mobile |
| `/api/relatorios/financeiro` | GET | Relatório financeiro |
| `/api/relatorios/produtos` | GET | Relatório de produtos |

**Dashboard Web - Métricas retornadas:**
```json
{
  "totalClientes": 150,
  "totalProdutos": 80,
  "produtosLocados": 65,
  "produtosEstoque": 15,
  "receitaMes": 12500.00,
  "totalCobrancasMes": 45,
  "saldoDevedor": 2300.00,
  "cobrancasAtrasadas": 5,
  "conflictsPendentes": 0,
  "dataReferencia": "2024-01-15T10:30:00Z"
}
```

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

#### Dashboard (`/dashboard`)

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
- Busca automática de endereço por CEP (ViaCEP)
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
   - 6º: Usuários
5. Detecta conflitos por versão
6. Retorna resultado

### 📥 PULL (Servidor → Mobile)

**Processo:**
1. Mobile envia `lastSyncAt` para `/api/sync/pull`
2. Servidor busca entidades modificadas após essa data
3. Filtra apenas mudanças de **outros dispositivos**
4. Retorna todas as entidades atualizadas
5. Inclui atributos de produto (tipos, descrições, tamanhos)

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
- Proteção de rotas via middleware

### Mobile (JWT Customizado)

- Access Token: 15 minutos (configurável via `JWT_EXPIRES_IN`)
- Refresh Token: 7 dias
- Algoritmo: HS256
- Hash de senha: bcrypt com 12 rounds

### Fluxo de Login Mobile

```
1. POST /api/auth/login { email, password }
   ↓
2. Servidor valida:
   - status = 'Ativo'
   - bloqueado = false
   - deletedAt = null
   ↓
3. Gera Access Token JWT
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
    todosCadastros: boolean;          // CRUD completo
    locacaoRelocacaoEstoque: boolean; // Gestão de locações
    relatorios: boolean;              // Acesso a relatórios
  };
  mobile: {
    todosCadastros: boolean;          // CRUD completo
    alteracaoRelogio: boolean;        // Alterar contador
    locacaoRelocacaoEstoque: boolean; // Gestão de locações
    cobrancasFaturas: boolean;        // Registrar cobranças
  };
}
```

### Controle por Rota

Para `AcessoControlado`, o campo `rotasPermitidas` contém os IDs das rotas que o usuário pode acessar. O mobile e web filtram automaticamente clientes e cobranças por essas rotas.

### Middleware de Proteção

```typescript
// Rotas protegidas pelo middleware
const config = {
  matcher: [
    '/dashboard/:path*',
    '/clientes/:path*',
    '/produtos/:path*',
    '/cobrancas/:path*',
    '/relatorios/:path*',
    '/admin/:path*',  // Apenas Administrador
  ],
}
```

---

## Cálculos de Cobrança

### 📐 Fórmulas de Cálculo

O sistema suporta três formas de pagamento, cada uma com sua lógica de cálculo:

#### 1. PercentualReceber (Cliente recebe parte do faturamento)

```
fichasRodadas = relogioAtual - relogioAnterior
totalBruto = fichasRodadas × precoFicha
subtotalAposDescontos = totalBruto - (descontoPartidasValor + descontoDinheiro)
valorPercentual = subtotalAposDescontos × (percentualEmpresa / 100)
totalClientePaga = subtotalAposDescontos - valorPercentual
```

**Exemplo:**
- Relógio anterior: 1000
- Relógio atual: 1100
- Fichas rodadas: 100
- Preço ficha: R$ 2,50
- Percentual empresa: 50%
- Total bruto: R$ 250,00
- Valor percentual: R$ 125,00
- **Cliente paga: R$ 125,00**

#### 2. PercentualPagar (Cliente paga percentual do faturamento)

```
fichasRodadas = relogioAtual - relogioAnterior
totalBruto = fichasRodadas × precoFicha
subtotalAposDescontos = totalBruto - descontos
valorPercentual = subtotalAposDescontos × (percentualEmpresa / 100)
totalClientePaga = valorPercentual
```

**Exemplo:**
- Fichas rodadas: 100
- Preço ficha: R$ 2,50
- Percentual empresa: 40%
- Total bruto: R$ 250,00
- **Cliente paga: R$ 100,00**

#### 3. Periodo (Valor fixo por período)

```
totalClientePaga = valorFixo (definido na locação)
```

**Exemplo:**
- Valor fixo mensal: R$ 300,00
- **Cliente paga: R$ 300,00**

### 💰 Controle de Pagamento

```
saldoDevedorGerado = max(0, totalClientePaga - valorRecebido)
troco = max(0, valorRecebido - totalClientePaga)
```

**Status de Pagamento:**
- `Pago`: valorRecebido >= totalClientePaga
- `Parcial`: valorRecebido > 0 e valorRecebido < totalClientePaga
- `Pendente`: valorRecebido = 0
- `Atrasado`: Pendente após data de vencimento

---

## Fluxos de Negócio

### 🔄 Relocação de Produto

Quando um produto precisa ser transferido de um cliente para outro:

```
1. Usuário seleciona locação ativa
   ↓
2. Clica em "Relocar"
   ↓
3. Informa:
   - Novo cliente
   - Novo número do relógio
   - Nova forma de pagamento
   - Motivo da relocação
   - Se houve troca de pano
   ↓
4. Sistema executa em TRANSAÇÃO ATÔMICA:
   a) Finaliza locação atual (status = 'Finalizada')
   b) Cria nova locação para o novo cliente
   c) Registra manutenção (se troca de pano)
   d) Registra no ChangeLog
   ↓
5. Produto continua locado, agora para novo cliente
```

**Endpoint:** `POST /api/locacoes/[id]/relocar`

**Validações:**
- Locação deve estar ativa
- Novo cliente deve existir e estar ativo
- Número do relógio é obrigatório

---

### 📦 Envio para Estoque

Quando um produto volta para o estoque:

```
1. Usuário seleciona locação ativa
   ↓
2. Clica em "Enviar para Estoque"
   ↓
3. Informa:
   - Estabelecimento de destino
   - Motivo do retorno
   - Observações (opcional)
   ↓
4. Sistema executa em TRANSAÇÃO ATÔMICA:
   a) Finaliza locação (status = 'Finalizada')
   b) Atualiza produto:
      - estabelecimento = destino
      - statusProduto = 'Ativo'
      - observacao = null (limpa)
   c) Registra no ChangeLog
   ↓
5. Produto disponível para nova locação
```

**Endpoint:** `POST /api/locacoes/[id]/enviar-estoque`

**Validações:**
- Locação deve estar ativa
- Estabelecimento é obrigatório
- Motivo é obrigatório (mínimo 3 caracteres)

---

### 📱 Ativação de Dispositivo

Fluxo para registrar um novo dispositivo móvel:

```
1. Admin cria dispositivo no web
   - Gera senha numérica de 6 dígitos
   ↓
2. Usuário no mobile informa:
   - Nome do dispositivo
   - Senha numérica
   ↓
3. Mobile POST /api/dispositivos/ativar
   ↓
4. Servidor valida:
   - Senha confere
   - Dispositivo não ativado anteriormente
   ↓
5. Servidor gera:
   - deviceKey único
   - Marca dispositivo como ativo
   ↓
6. Mobile armazena deviceKey
   ↓
7. Dispositivo pronto para sincronizar
```

---

## Segurança e Middleware

### 🛡️ Middleware de Autenticação

O middleware protege todas as rotas autenticadas:

```typescript
// Verificação em duas camadas:
// 1. Middleware (frontend)
// 2. Handler da API (backend)

// Middleware verifica:
- Token JWT válido (NextAuth)
- tipoPermissao para rotas /admin

// API handlers verificam:
- getAuthSession() retorna sessão válida
- Permissões específicas por operação
```

### 🔒 Proteções Implementadas

| Proteção | Implementação |
|----------|---------------|
| Senha hasheada | bcrypt com 12 rounds |
| Senha removida do retorno | `senha` nunca retornado nas APIs |
| Soft delete | `deletedAt` em todas as entidades sincronizáveis |
| Validação de input | Zod schemas centralizados em `lib/validations.ts` |
| Transações atômicas | Prisma `$transaction()` em operações críticas |
| Verificação de FK | Antes de inserir no sync |
| Auth em todas as APIs | `getAuthSession()` em todos os endpoints CRUD |
| Rota-filtering | AcessoControlado só vê dados das rotas atribuídas |
| Mass assignment | Schemas Zod protegem contra campos indesejados no UPDATE |
| Equipamentos legado | POST agora requer auth de admin |

### ⚠️ Rate Limiting

**Atenção:** O sistema atualmente não implementa rate limiting nas seguintes APIs:

- `/api/auth/login` - Vulnerável a força bruta
- `/api/sync/push` - Vulnerável a flood
- `/api/sync/pull` - Vulnerável a flood

**Recomendação:** Implementar rate limiting em produção.

---

## Motor de Sincronização

### 📋 Arquivo: `lib/sync-engine.ts`

O motor de sincronização é responsável por processar as mudanças enviadas pelo mobile e retornar as mudanças do servidor.

### 🔧 Funções Principais

#### `processPush(deviceId, changes)`

Processa mudanças enviadas pelo mobile:

```typescript
// 1. Ordena mudanças por dependência
const PROCESSING_ORDER = ['rota', 'cliente', 'produto', 'locacao', 'cobranca', 'usuario']

// 2. Para cada mudança:
//    - Filtra campos permitidos
//    - Converte tipos (SQLite → Prisma)
//    - Valida foreign keys
//    - Detecta conflitos por versão
//    - Registra no ChangeLog

// 3. Retorna conflitos e erros
```

#### `processPull(deviceId, lastSyncAt)`

Retorna mudanças do servidor:

```typescript
// 1. Busca entidades modificadas após lastSyncAt
// 2. Filtra mudanças de outros dispositivos
// 3. Exclui registros com deletedAt
// 4. Retorna todas as entidades + atributos de produto
```

### 📊 Campos Permitidos por Entidade

O sync engine filtra apenas campos conhecidos:

```typescript
const ALLOWED_FIELDS = {
  cliente: ['tipoPessoa', 'identificador', 'nomeExibicao', ...],
  produto: ['identificador', 'numeroRelogio', 'tipoId', ...],
  locacao: ['clienteId', 'produtoId', 'formaPagamento', ...],
  cobranca: ['locacaoId', 'relogioAnterior', 'relogioAtual', ...],
  rota: ['descricao', 'status'],
  usuario: ['nome', 'email', 'tipoPermissao', 'senha', ...], // ⚠️ Ver problemas conhecidos
}
```

### ⚠️ Validação de Foreign Keys

Antes de inserir, o motor valida referências:

```typescript
// Remove referências inválidas em vez de falhar
if (!await prisma.rota.findUnique({ where: { id: rotaId } })) {
  delete data.rotaId  // Remove referência inválida
}
```

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
│   │   │   ├── login/            # Login mobile
│   │   │   ├── me/               # Dados do usuário
│   │   │   ├── logout/           # Logout
│   │   │   ├── change-password/  # Alterar senha
│   │   │   └── [...nextauth]/    # NextAuth
│   │   ├── sync/                 # Sincronização
│   │   │   ├── push/             # Enviar mudanças
│   │   │   ├── pull/             # Receber mudanças
│   │   │   ├── conflicts/        # Listar conflitos
│   │   │   └── conflict/resolve/ # Resolver conflito
│   │   ├── clientes/             # CRUD clientes
│   │   ├── produtos/             # CRUD produtos
│   │   ├── locacoes/             # CRUD locações
│   │   │   └── [id]/
│   │   │       ├── relocar/      # Relocar produto
│   │   │       └── enviar-estoque/ # Enviar para estoque
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
│   │   ├── header.tsx            # Cabeçalho
│   │   └── sidebar.tsx           # Menu lateral
│   ├── providers/                # Providers
│   │   └── session-provider.tsx  # NextAuth provider
│   └── ui/                       # Componentes UI
│       ├── badge.tsx             # Badge de status
│       ├── button.tsx            # Botão
│       ├── card.tsx              # Card
│       ├── input.tsx             # Input
│       ├── pagination.tsx        # Paginação
│       ├── empty-state.tsx       # Estado vazio
│       ├── loading.tsx           # Loading
│       └── stat-card.tsx         # Card de estatística
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
│   └── next-auth.d.ts            # Extensão NextAuth
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

## Problemas Conhecidos

### 🔴 Bugs Críticos Identificados

#### 1. Senha em Texto Plano no Mobile

**Problema:** O mobile salva senhas em texto plano no SQLite local.

**Impacto:** Qualquer acesso ao arquivo de banco expõe senhas.

**Solução Recomendada:** Implementar hash bcrypt no mobile antes de salvar.

---

#### 2. Senha Apagada na Sincronização

**Problema:** `upsertUsuarioFromSync` no mobile usa `INSERT OR REPLACE` que apaga campos não enviados pelo servidor (incluindo senha).

**Impacto:** Após qualquer sync, o login offline quebra.

**Solução Recomendada:** Usar `INSERT OR IGNORE` + `UPDATE` seletivo.

---

#### 3. Campo `senha` no ALLOWED_FIELDS do Sync

**Problema:** O campo `senha` está permitido no PUSH de sincronização.

**Impacto:** Senha em texto plano pode ser enviada ao servidor.

**Solução Recomendada:** Remover `senha` de `ALLOWED_FIELDS.usuario`.

---

### ⚠️ Melhorias Recomendadas

| Item | Prioridade | Descrição |
|------|------------|-----------|
| Rate Limiting | Alta | Implementar em `/api/auth/login` e `/api/sync/*` |
| Paginação no PULL | Média | Limitar registros por sincronização |
| Campos de data como DateTime | Média | Migrar campos String para DateTime |
| PRAGMA journal_mode=WAL | Baixa | Melhorar performance SQLite no mobile |
| Sync fields em Manutencao/Meta | Média | Adicionar syncStatus, version, deviceId aos modelos |

---

## Histórico de Refatoração

### Fase 1 — Áreas Core (Concluída)
- **Clientes**: API com Zod, auth, rota-filtering, batch, paginação
- **Cobranças**: API com Zod, auth, rota-filtering, batch, recibo térmico
- **Rotas**: API com Zod, auth, CRUD completo, vinculação de usuários
- **Locações**: API com Zod, auth, relocar, enviar-estoque, transações atômicas
- **Produtos**: API com Zod, auth, batch, filtros avançados
- **Usuários**: API com auth granular, CRUD completo, permissões

### Fase 2 — Áreas Administrativas (Concluída)
- **Dispositivos**: CRUD completo, ativação com PIN, status de sincronização
- **Sincronização**: Push/Pull com motor próprio, resolução de conflitos
- **Relatórios**: 14 tipos de relatório com exportação

### Fase 3 — Refatoração de Segurança e Consistência (Concluída)
- **Metas**: Auth adicionada, mass assignment corrigido, Zod validation
- **Mapa**: Auth adicionada, rota-filtering para AcessoControlado
- **Agenda**: Auth adicionada, rota-filtering para AcessoControlado
- **Auditoria**: Auth adicionada, handleApiError centralizado
- **Manutenções**: manutencaoUpdateSchema via Zod, transação atômica
- **Histórico Relógio**: Zod centralizado em validations.ts, handleApiError
- **Estabelecimentos**: Zod schemas, paginação, handleApiError
- **Tipos/Descrições/Tamanhos Produto**: Auth consistente (NextAuth + JWT), Zod schemas
- **Notificações**: handleApiError centralizado
- **Equipamentos POST**: Auth de admin adicionada (antes era sem auth)

---

## Licença

Propriedade privada. Todos os direitos reservados.
