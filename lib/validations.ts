// lib/validations.ts
// Centralized Zod schemas for all main entities.
// Import from here instead of defining inline schemas in route files.

import { z } from 'zod'

// ─── Helpers ────────────────────────────────────────────────

/** Coerces a string to a Date object (for Prisma DateTime fields). */
const dateStringToDate = z.string().transform((v) => new Date(v))

// ─── Rota ───────────────────────────────────────────────────

export const rotaCreateSchema = z.object({
  descricao: z.string().min(1, 'Descrição é obrigatória').max(100, 'Descrição deve ter no máximo 100 caracteres'),
  status: z.enum(['Ativo', 'Inativo']).default('Ativo'),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve ser um hexadecimal válido (ex: #2563EB)').default('#2563EB'),
  regiao: z.string().max(100, 'Região deve ter no máximo 100 caracteres').optional().nullable(),
  ordem: z.number().int().min(0, 'Ordem deve ser um número positivo').default(0),
  observacao: z.string().max(500, 'Observação deve ter no máximo 500 caracteres').optional().nullable(),
})

export const rotaUpdateSchema = z.object({
  descricao: z.string().min(1, 'Descrição é obrigatória').max(100, 'Descrição deve ter no máximo 100 caracteres').optional(),
  status: z.enum(['Ativo', 'Inativo']).optional(),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve ser um hexadecimal válido').optional(),
  regiao: z.string().max(100, 'Região deve ter no máximo 100 caracteres').optional().nullable(),
  ordem: z.number().int().min(0, 'Ordem deve ser um número positivo').optional(),
  observacao: z.string().max(500, 'Observação deve ter no máximo 500 caracteres').optional().nullable(),
})

// ─── Cliente ────────────────────────────────────────────────

export const clienteCreateSchema = z.object({
  id: z.string().optional(),
  tipoPessoa: z.enum(['Fisica', 'Juridica'], {
    errorMap: () => ({ message: 'Tipo de pessoa deve ser Fisica ou Juridica' }),
  }),
  identificador: z.string().min(1, 'Identificador é obrigatório'),
  nomeExibicao: z.string().min(1, 'Nome de exibição é obrigatório'),
  nomeCompleto: z.string().optional(),
  razaoSocial: z.string().optional(),
  nomeFantasia: z.string().optional(),
  cpf: z.string().optional(),
  rg: z.string().optional(),
  cnpj: z.string().optional(),
  inscricaoEstadual: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  telefonePrincipal: z.string().min(1, 'Telefone principal é obrigatório'),
  contatos: z.array(z.any()).optional(),
  cep: z.string().min(1, 'CEP é obrigatório'),
  logradouro: z.string().min(1, 'Logradouro é obrigatório'),
  numero: z.string().min(1, 'Número é obrigatório'),
  complemento: z.string().optional(),
  bairro: z.string().min(1, 'Bairro é obrigatório'),
  cidade: z.string().min(1, 'Cidade é obrigatória'),
  estado: z.string().min(1, 'Estado é obrigatório'),
  rotaId: z.string().optional().nullable(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  status: z.string().default('Ativo'),
  observacao: z.string().optional(),
})

export const clienteUpdateSchema = clienteCreateSchema.partial().omit({ id: true })

// ─── Produto ────────────────────────────────────────────────

export const produtoCreateSchema = z.object({
  id: z.string().optional(),
  tipo: z.string().default('produto'),
  identificador: z.string().min(1, 'Identificador é obrigatório'),
  numeroRelogio: z.string().min(1, 'Número do relógio é obrigatório'),
  tipoId: z.string().min(1, 'Tipo é obrigatório'),
  tipoNome: z.string().min(1, 'Nome do tipo é obrigatório'),
  descricaoId: z.string().min(1, 'Descrição é obrigatória'),
  descricaoNome: z.string().min(1, 'Nome da descrição é obrigatório'),
  tamanhoId: z.string().min(1, 'Tamanho é obrigatório'),
  tamanhoNome: z.string().min(1, 'Nome do tamanho é obrigatório'),
  codigoCH: z.string().optional().nullable(),
  codigoABLF: z.string().optional().nullable(),
  conservacao: z.enum(['Ótima', 'Boa', 'Regular', 'Ruim', 'Péssima']).default('Boa'),
  statusProduto: z.enum(['Ativo', 'Inativo', 'Manutenção']).default('Ativo'),
  dataFabricacao: z.string().optional().nullable(),
  dataUltimaManutencao: z.string().optional().nullable(),
  relatorioUltimaManutencao: z.string().optional().nullable(),
  dataAvaliacao: z.string().optional().nullable(),
  aprovacao: z.string().optional().nullable(),
  estabelecimento: z.string().optional().nullable(),
  observacao: z.string().optional().nullable(),
  dataCadastro: z.string().optional().nullable(),
  dataUltimaAlteracao: z.string().optional().nullable(),
})

export const produtoUpdateSchema = produtoCreateSchema.partial().omit({ id: true })

// ─── Locação ────────────────────────────────────────────────

export const locacaoCreateSchema = z.object({
  id: z.string().optional(),
  clienteId: z.string().min(1, 'Cliente é obrigatório'),
  clienteNome: z.string().min(1, 'Nome do cliente é obrigatório'),
  produtoId: z.string().min(1, 'Produto é obrigatório'),
  produtoIdentificador: z.string().min(1, 'Identificador do produto é obrigatório'),
  produtoTipo: z.string().min(1, 'Tipo do produto é obrigatório'),
  dataLocacao: z.string().min(1, 'Data de locação é obrigatória'),
  dataFim: z.string().optional().nullable(),
  observacao: z.string().optional().nullable(),
  formaPagamento: z.enum(['Periodo', 'PercentualPagar', 'PercentualReceber'], {
    errorMap: () => ({ message: 'Forma de pagamento inválida' }),
  }),
  numeroRelogio: z.string().min(1, 'Número do relógio é obrigatório'),
  precoFicha: z.number({ required_error: 'Preço da ficha é obrigatório' }),
  percentualEmpresa: z.number().min(0, 'Percentual mínimo é 0').max(100, 'Percentual máximo é 100'),
  percentualCliente: z.number().min(0, 'Percentual mínimo é 0').max(100, 'Percentual máximo é 100'),
  periodicidade: z.string().optional().nullable(),
  valorFixo: z.number().optional().nullable(),
  dataPrimeiraCobranca: z.string().optional().nullable(),
  status: z.enum(['Ativa', 'Finalizada', 'Cancelada']).default('Ativa'),
  ultimaLeituraRelogio: z.number().optional().nullable(),
  dataUltimaCobranca: z.string().optional().nullable(),
  trocaPano: z.boolean().optional(),
  dataUltimaManutencao: z.string().optional().nullable(),
})

export const locacaoUpdateSchema = locacaoCreateSchema.partial().omit({ id: true })

// ─── Locação — Status Transitions ───────────────────────────

/** Locação status values */
export const LOCACAO_STATUS = ['Ativa', 'Finalizada', 'Cancelada'] as const
export type LocacaoStatus = (typeof LOCACAO_STATUS)[number]

/**
 * Allowed status transitions map.
 * Key = current status, Value = array of statuses that can be transitioned TO.
 */
export const LOCACAO_STATUS_TRANSITIONS: Record<LocacaoStatus, LocacaoStatus[]> = {
  Ativa: ['Finalizada', 'Cancelada'],
  Finalizada: [],    // No transitions allowed from Finalizada
  Cancelada: [],     // No transitions allowed from Cancelada
}

/**
 * Validates whether a status transition is allowed.
 * Returns true if the transition is valid, false otherwise.
 */
export function isStatusTransitionAllowed(currentStatus: string, newStatus: string): boolean {
  const allowed = LOCACAO_STATUS_TRANSITIONS[currentStatus as LocacaoStatus]
  if (!allowed) return false
  return allowed.includes(newStatus as LocacaoStatus)
}

/**
 * Zod schema for validating status transitions on locação updates.
 * Use this when updating the status field of an existing locação.
 */
export const locacaoStatusTransitionSchema = z.object({
  status: z.enum(LOCACAO_STATUS),
}).refine(
  (data) => data.status !== undefined,
  { message: 'Status é obrigatório', path: ['status'] },
)

// ─── Locação — Relocar ──────────────────────────────────────

export const relocarSchema = z.object({
  novoClienteId:       z.string().min(1, 'Novo cliente é obrigatório'),
  novoClienteNome:     z.string().min(1, 'Nome do novo cliente é obrigatório'),
  formaPagamento:      z.enum(['Periodo', 'PercentualPagar', 'PercentualReceber'], {
    errorMap: () => ({ message: 'Forma de pagamento inválida' }),
  }),
  numeroRelogio:       z.string().min(1, 'Número do relógio é obrigatório'),
  precoFicha:          z.number().positive('Preço da ficha deve ser positivo'),
  percentualEmpresa:   z.number().min(0, 'Percentual mínimo é 0').max(100, 'Percentual máximo é 100'),
  percentualCliente:   z.number().min(0, 'Percentual mínimo é 0').max(100, 'Percentual máximo é 100'),
  periodicidade:       z.enum(['Mensal', 'Semanal', 'Quinzenal', 'Diária']).optional().nullable(),
  valorFixo:           z.number().positive('Valor fixo deve ser positivo').optional().nullable(),
  dataPrimeiraCobranca: z.string().optional().nullable(),
  motivoRelocacao:     z.string().min(3, 'Motivo da relocação deve ter pelo menos 3 caracteres'),
  observacao:          z.string().optional().nullable(),
  trocaPano:           z.boolean().optional(),
})

// ─── Locação — Enviar para Estoque ──────────────────────────

export const enviarEstoqueSchema = z.object({
  estabelecimento: z.string().min(1, 'Selecione o estabelecimento'),
  motivo:          z.string().min(3, 'Informe o motivo (mínimo 3 caracteres)'),
  observacao:      z.string().optional().nullable(),
})

// ─── Locação — Finalizar ────────────────────────────────────

export const finalizarLocacaoSchema = z.object({
  motivo:     z.string().min(3, 'Informe o motivo (mínimo 3 caracteres)'),
  observacao: z.string().optional().nullable(),
})

// ─── Cobrança ───────────────────────────────────────────────

export const cobrancaCreateSchema = z.object({
  id: z.string().optional(),
  locacaoId: z.string().min(1, 'Locação é obrigatória'),
  clienteId: z.string().min(1, 'Cliente é obrigatório'),
  clienteNome: z.string().min(1, 'Nome do cliente é obrigatório'),
  produtoId: z.string().optional(),
  produtoIdentificador: z.string().min(1, 'Identificador do produto é obrigatório'),
  dataInicio: z.string().min(1, 'Data de início é obrigatória'),
  dataFim: z.string().min(1, 'Data de fim é obrigatória'),
  dataPagamento: z.string().optional().nullable(),
  relogioAnterior: z.number({ required_error: 'Leitura anterior é obrigatória' }),
  relogioAtual: z.number({ required_error: 'Leitura atual é obrigatória' }),
  fichasRodadas: z.number({ required_error: 'Fichas rodadas é obrigatório' }),
  valorFicha: z.number({ required_error: 'Valor da ficha é obrigatório' }),
  totalBruto: z.number({ required_error: 'Total bruto é obrigatório' }),
  descontoPartidasQtd: z.number().optional().nullable(),
  descontoPartidasValor: z.number().optional().nullable(),
  descontoDinheiro: z.number().optional().nullable(),
  percentualEmpresa: z.number({ required_error: 'Percentual da empresa é obrigatório' }),
  subtotalAposDescontos: z.number({ required_error: 'Subtotal é obrigatório' }),
  valorPercentual: z.number({ required_error: 'Valor percentual é obrigatório' }),
  totalClientePaga: z.number({ required_error: 'Total que o cliente paga é obrigatório' }),
  valorRecebido: z.number({ required_error: 'Valor recebido é obrigatório' }),
  saldoDevedorGerado: z.number({ required_error: 'Saldo devedor gerado é obrigatório' }),
  status: z.enum(['Pago', 'Parcial', 'Pendente', 'Atrasado']).default('Pendente'),
  dataVencimento: z.string().optional().nullable(),
  observacao: z.string().optional().nullable(),
})

export const cobrancaUpdateSchema = cobrancaCreateSchema.partial().omit({ id: true })

// ─── Manutenção ─────────────────────────────────────────────

export const manutencaoCreateSchema = z.object({
  produtoId: z.string().min(1, 'Produto é obrigatório'),
  produtoIdentificador: z.string().optional().nullable(),
  produtoTipo: z.string().optional().nullable(),
  clienteId: z.string().optional().nullable(),
  clienteNome: z.string().optional().nullable(),
  locacaoId: z.string().optional().nullable(),
  cobrancaId: z.string().optional().nullable(),
  tipo: z.enum(['trocaPano', 'manutencao'], {
    errorMap: () => ({ message: 'Tipo deve ser trocaPano ou manutencao' }),
  }),
  descricao: z.string().optional().nullable(),
  data: z.string().min(1, 'Data é obrigatória'),
  registradoPor: z.string().optional().nullable(),
})

export const manutencaoUpdateSchema = manutencaoCreateSchema.partial().omit({ produtoId: true })

// ─── Meta ───────────────────────────────────────────────────

export const metaCreateSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  tipo: z.enum(['receita', 'cobrancas', 'adimplencia'], {
    errorMap: () => ({ message: 'Tipo deve ser receita, cobrancas ou adimplencia' }),
  }).default('receita'),
  valorMeta: z.coerce.number().positive('Valor da meta deve ser positivo'),
  dataInicio: dateStringToDate,
  dataFim: dateStringToDate,
  rotaId: z.string().optional().nullable(),
  criadoPor: z.string().optional().nullable(),
}).refine(
  (data) => data.dataFim > data.dataInicio,
  { message: 'Data de fim deve ser posterior à data de início', path: ['dataFim'] },
)

export const metaUpdateSchema = z.object({
  nome: z.string().min(1).optional(),
  tipo: z.enum(['receita', 'cobrancas', 'adimplencia']).optional(),
  valorMeta: z.coerce.number().positive().optional(),
  dataInicio: dateStringToDate.optional(),
  dataFim: dateStringToDate.optional(),
  rotaId: z.string().optional().nullable(),
  status: z.enum(['ativa', 'atingida', 'expirada']).optional(),
  criadoPor: z.string().optional().nullable(),
}).refine(
  (data) => {
    if (data.dataInicio && data.dataFim) {
      return data.dataFim > data.dataInicio
    }
    return true
  },
  { message: 'Data de fim deve ser posterior à data de início', path: ['dataFim'] },
)

// ─── Estabelecimento ───────────────────────────────────────

export const estabelecimentoCreateSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome deve ter no máximo 100 caracteres'),
  endereco: z.string().max(200, 'Endereço deve ter no máximo 200 caracteres').optional().nullable(),
  observacao: z.string().max(500, 'Observação deve ter no máximo 500 caracteres').optional().nullable(),
})

export const estabelecimentoUpdateSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome deve ter no máximo 100 caracteres').optional(),
  endereco: z.string().max(200, 'Endereço deve ter no máximo 200 caracteres').optional().nullable(),
  observacao: z.string().max(500, 'Observação deve ter no máximo 500 caracteres').optional().nullable(),
})

// ─── Histórico Relógio ──────────────────────────────────────

export const historicoRelogioCreateSchema = z.object({
  produtoId: z.string().min(1, 'Produto é obrigatório'),
  relogioNovo: z.string().min(1, 'Novo relógio é obrigatório'),
  motivo: z.string().min(1, 'Motivo é obrigatório'),
})

// ─── Atributo de Produto (Tipos/Descrições/Tamanhos) ────────

export const atributoProdutoCreateSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome deve ter no máximo 100 caracteres'),
})

export const atributoProdutoUpdateSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome deve ter no máximo 100 caracteres'),
})

// ─── Autenticação ───────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(1, 'Senha é obrigatória'),
  dispositivo: z.enum(['Web', 'Mobile']).default('Web'),
})

export const trocarSenhaSchema = z.object({
  senhaAtual: z.string().min(1, 'Senha atual é obrigatória'),
  novaSenha: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
    .regex(/[!@#$%^&*()_+\-=\[\]{}|;:\',.<>?\/]/, 'Senha deve conter pelo menos um caractere especial'),
  confirmarSenha: z.string().min(1, 'Confirmação é obrigatória'),
}).refine(data => data.novaSenha === data.confirmarSenha, {
  message: 'As senhas não coincidem',
  path: ['confirmarSenha'],
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token é obrigatório'),
})

// ─── Type exports ───────────────────────────────────────────

export type ClienteCreateInput = z.infer<typeof clienteCreateSchema>
export type ClienteUpdateInput = z.infer<typeof clienteUpdateSchema>
export type ProdutoCreateInput = z.infer<typeof produtoCreateSchema>
export type ProdutoUpdateInput = z.infer<typeof produtoUpdateSchema>
export type LocacaoCreateInput = z.infer<typeof locacaoCreateSchema>
export type LocacaoUpdateInput = z.infer<typeof locacaoUpdateSchema>
export type CobrancaCreateInput = z.infer<typeof cobrancaCreateSchema>
export type CobrancaUpdateInput = z.infer<typeof cobrancaUpdateSchema>
export type ManutencaoCreateInput = z.infer<typeof manutencaoCreateSchema>
export type ManutencaoUpdateInput = z.infer<typeof manutencaoUpdateSchema>
export type MetaCreateInput = z.infer<typeof metaCreateSchema>
export type MetaUpdateInput = z.infer<typeof metaUpdateSchema>
export type RotaCreateInput = z.infer<typeof rotaCreateSchema>
export type RotaUpdateInput = z.infer<typeof rotaUpdateSchema>
export type RelocarInput = z.infer<typeof relocarSchema>
export type EnviarEstoqueInput = z.infer<typeof enviarEstoqueSchema>
export type FinalizarLocacaoInput = z.infer<typeof finalizarLocacaoSchema>
export type EstabelecimentoCreateInput = z.infer<typeof estabelecimentoCreateSchema>
export type EstabelecimentoUpdateInput = z.infer<typeof estabelecimentoUpdateSchema>
export type HistoricoRelogioCreateInput = z.infer<typeof historicoRelogioCreateSchema>
export type AtributoProdutoCreateInput = z.infer<typeof atributoProdutoCreateSchema>
export type AtributoProdutoUpdateInput = z.infer<typeof atributoProdutoUpdateSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type TrocarSenhaInput = z.infer<typeof trocarSenhaSchema>
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>
