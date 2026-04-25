// __tests__/lib/validations.test.ts
// Tests for lib/validations.ts — Zod schemas for all main entities

import {
  clienteCreateSchema,
  clienteUpdateSchema,
  produtoCreateSchema,
  locacaoCreateSchema,
  cobrancaCreateSchema,
  manutencaoCreateSchema,
  metaCreateSchema,
  metaUpdateSchema,
  rotaCreateSchema,
} from '@/lib/validations'
import { validateBody, ApiError } from '@/lib/api-helpers'

// ─────────────────────────────────────────────────────────────────────────────
// clienteCreateSchema
// ─────────────────────────────────────────────────────────────────────────────
describe('clienteCreateSchema', () => {
  const validCliente = {
    tipoPessoa: 'Fisica' as const,
    identificador: '12345678900',
    nomeExibicao: 'João da Silva',
    telefonePrincipal: '(67) 99999-0000',
    cep: '79000-000',
    logradouro: 'Rua Teste',
    numero: '123',
    bairro: 'Centro',
    cidade: 'Campo Grande',
    estado: 'MS',
    rotaId: 'rota-1',
  }

  it('validates a complete cliente', () => {
    const result = clienteCreateSchema.safeParse(validCliente)
    expect(result.success).toBe(true)
  })

  it('rejects empty nomeExibicao', () => {
    const result = clienteCreateSchema.safeParse({ ...validCliente, nomeExibicao: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid tipoPessoa', () => {
    const result = clienteCreateSchema.safeParse({ ...validCliente, tipoPessoa: 'Outro' })
    expect(result.success).toBe(false)
  })

  it('accepts both Fisica and Juridica', () => {
    expect(clienteCreateSchema.safeParse({ ...validCliente, tipoPessoa: 'Fisica' }).success).toBe(true)
    expect(clienteCreateSchema.safeParse({ ...validCliente, tipoPessoa: 'Juridica' }).success).toBe(true)
  })

  it('accepts optional latitude and longitude', () => {
    const withCoords = { ...validCliente, latitude: -20.4435, longitude: -54.6478 }
    const result = clienteCreateSchema.safeParse(withCoords)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.latitude).toBe(-20.4435)
      expect(result.data.longitude).toBe(-54.6478)
    }
  })

  it('accepts null latitude/longitude', () => {
    const withNull = { ...validCliente, latitude: null, longitude: null }
    const result = clienteCreateSchema.safeParse(withNull)
    expect(result.success).toBe(true)
  })

  it('rejects invalid email format', () => {
    const result = clienteCreateSchema.safeParse({ ...validCliente, email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('accepts valid email', () => {
    const result = clienteCreateSchema.safeParse({ ...validCliente, email: 'test@example.com' })
    expect(result.success).toBe(true)
  })

  it('accepts empty string email', () => {
    const result = clienteCreateSchema.safeParse({ ...validCliente, email: '' })
    expect(result.success).toBe(true)
  })

  it('defaults status to Ativo when not provided', () => {
    const result = clienteCreateSchema.safeParse(validCliente)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('Ativo')
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// clienteUpdateSchema
// ─────────────────────────────────────────────────────────────────────────────
describe('clienteUpdateSchema', () => {
  it('allows partial updates', () => {
    const result = clienteUpdateSchema.safeParse({ nomeExibicao: 'Novo Nome' })
    expect(result.success).toBe(true)
  })

  it('allows empty object', () => {
    const result = clienteUpdateSchema.safeParse({})
    expect(result.success).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// produtoCreateSchema
// ─────────────────────────────────────────────────────────────────────────────
describe('produtoCreateSchema', () => {
  const validProduto = {
    identificador: '515',
    numeroRelogio: '12345',
    tipoId: 'tipo-1',
    tipoNome: 'Bilhar',
    descricaoId: 'desc-1',
    descricaoNome: 'Azul',
    tamanhoId: 'tam-1',
    tamanhoNome: '2,20',
  }

  it('validates a complete produto', () => {
    const result = produtoCreateSchema.safeParse(validProduto)
    expect(result.success).toBe(true)
  })

  it('rejects invalid conservacao', () => {
    const result = produtoCreateSchema.safeParse({ ...validProduto, conservacao: 'Excelente' })
    expect(result.success).toBe(false)
  })

  it('accepts all valid conservacao values', () => {
    const values = ['Ótima', 'Boa', 'Regular', 'Ruim', 'Péssima']
    for (const val of values) {
      const result = produtoCreateSchema.safeParse({ ...validProduto, conservacao: val })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid statusProduto', () => {
    const result = produtoCreateSchema.safeParse({ ...validProduto, statusProduto: 'Quebrado' })
    expect(result.success).toBe(false)
  })

  it('accepts all valid statusProduto values', () => {
    const values = ['Ativo', 'Inativo', 'Manutenção']
    for (const val of values) {
      const result = produtoCreateSchema.safeParse({ ...validProduto, statusProduto: val })
      expect(result.success).toBe(true)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// locacaoCreateSchema
// ─────────────────────────────────────────────────────────────────────────────
describe('locacaoCreateSchema', () => {
  const validLocacao = {
    clienteId: 'cli-1',
    clienteNome: 'João',
    produtoId: 'prod-1',
    produtoIdentificador: '515',
    produtoTipo: 'Bilhar',
    dataLocacao: '2024-01-15',
    formaPagamento: 'Periodo' as const,
    numeroRelogio: '12345',
    precoFicha: 2.50,
    percentualEmpresa: 60,
    percentualCliente: 40,
  }

  it('validates a complete locacao', () => {
    const result = locacaoCreateSchema.safeParse(validLocacao)
    expect(result.success).toBe(true)
  })

  it('rejects invalid formaPagamento', () => {
    const result = locacaoCreateSchema.safeParse({ ...validLocacao, formaPagamento: 'Invalido' })
    expect(result.success).toBe(false)
  })

  it('rejects percentualEmpresa above 100', () => {
    const result = locacaoCreateSchema.safeParse({ ...validLocacao, percentualEmpresa: 101 })
    expect(result.success).toBe(false)
  })

  it('rejects percentualEmpresa below 0', () => {
    const result = locacaoCreateSchema.safeParse({ ...validLocacao, percentualEmpresa: -1 })
    expect(result.success).toBe(false)
  })

  it('accepts boundary values for percentuais (0 and 100)', () => {
    expect(locacaoCreateSchema.safeParse({ ...validLocacao, percentualEmpresa: 0 }).success).toBe(true)
    expect(locacaoCreateSchema.safeParse({ ...validLocacao, percentualEmpresa: 100 }).success).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// cobrancaCreateSchema
// ─────────────────────────────────────────────────────────────────────────────
describe('cobrancaCreateSchema', () => {
  const validCobranca = {
    locacaoId: 'loc-1',
    clienteId: 'cli-1',
    clienteNome: 'João',
    produtoIdentificador: '515',
    dataInicio: '2024-01-01',
    dataFim: '2024-01-31',
    relogioAnterior: 100,
    relogioAtual: 200,
    fichasRodadas: 100,
    valorFicha: 2.50,
    totalBruto: 250,
    percentualEmpresa: 60,
    subtotalAposDescontos: 250,
    valorPercentual: 150,
    totalClientePaga: 150,
    valorRecebido: 100,
    saldoDevedorGerado: 50,
  }

  it('validates a complete cobranca', () => {
    const result = cobrancaCreateSchema.safeParse(validCobranca)
    expect(result.success).toBe(true)
  })

  it('rejects missing required numeric fields', () => {
    const { relogioAnterior, ...withoutRelogio } = validCobranca
    const result = cobrancaCreateSchema.safeParse(withoutRelogio)
    expect(result.success).toBe(false)
  })

  it('accepts all valid status values', () => {
    const statuses = ['Pago', 'Parcial', 'Pendente', 'Atrasado']
    for (const status of statuses) {
      const result = cobrancaCreateSchema.safeParse({ ...validCobranca, status })
      expect(result.success).toBe(true)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// manutencaoCreateSchema
// ─────────────────────────────────────────────────────────────────────────────
describe('manutencaoCreateSchema', () => {
  it('validates a complete manutencao', () => {
    const result = manutencaoCreateSchema.safeParse({
      produtoId: 'prod-1',
      tipo: 'trocaPano',
      data: '2024-01-15',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid tipo', () => {
    const result = manutencaoCreateSchema.safeParse({
      produtoId: 'prod-1',
      tipo: 'outro',
      data: '2024-01-15',
    })
    expect(result.success).toBe(false)
  })

  it('accepts both trocaPano and manutencao', () => {
    expect(manutencaoCreateSchema.safeParse({ produtoId: 'p1', tipo: 'trocaPano', data: '2024-01-01' }).success).toBe(true)
    expect(manutencaoCreateSchema.safeParse({ produtoId: 'p1', tipo: 'manutencao', data: '2024-01-01' }).success).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// metaCreateSchema
// ─────────────────────────────────────────────────────────────────────────────
describe('metaCreateSchema', () => {
  it('validates a complete meta', () => {
    const result = metaCreateSchema.safeParse({
      nome: 'Meta Janeiro 2024',
      tipo: 'receita',
      valorMeta: 50000,
      dataInicio: '2024-01-01',
      dataFim: '2024-01-31',
    })
    expect(result.success).toBe(true)
  })

  it('transforms date strings to Date objects', () => {
    const result = metaCreateSchema.safeParse({
      nome: 'Meta Teste',
      tipo: 'receita',
      valorMeta: 10000,
      dataInicio: '2024-01-01',
      dataFim: '2024-01-31',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.dataInicio).toBeInstanceOf(Date)
      expect(result.data.dataFim).toBeInstanceOf(Date)
    }
  })

  it('rejects dataFim before dataInicio', () => {
    const result = metaCreateSchema.safeParse({
      nome: 'Meta Inválida',
      tipo: 'receita',
      valorMeta: 10000,
      dataInicio: '2024-12-31',
      dataFim: '2024-01-01',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const fimError = result.error.errors.find(e => e.path.includes('dataFim'))
      expect(fimError).toBeDefined()
    }
  })

  it('coerces valorMeta from string to number', () => {
    const result = metaCreateSchema.safeParse({
      nome: 'Meta Teste',
      tipo: 'receita',
      valorMeta: '50000',
      dataInicio: '2024-01-01',
      dataFim: '2024-01-31',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.valorMeta).toBe(50000)
      expect(typeof result.data.valorMeta).toBe('number')
    }
  })

  it('rejects negative valorMeta', () => {
    const result = metaCreateSchema.safeParse({
      nome: 'Meta Negativa',
      tipo: 'receita',
      valorMeta: -1000,
      dataInicio: '2024-01-01',
      dataFim: '2024-01-31',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid tipo', () => {
    const result = metaCreateSchema.safeParse({
      nome: 'Meta Teste',
      tipo: 'invalido',
      valorMeta: 10000,
      dataInicio: '2024-01-01',
      dataFim: '2024-01-31',
    })
    expect(result.success).toBe(false)
  })

  it('accepts all valid tipos', () => {
    const tipos = ['receita', 'cobrancas', 'adimplencia']
    for (const tipo of tipos) {
      const result = metaCreateSchema.safeParse({
        nome: 'Meta Teste',
        tipo,
        valorMeta: 10000,
        dataInicio: '2024-01-01',
        dataFim: '2024-01-31',
      })
      expect(result.success).toBe(true)
    }
  })

  it('defaults tipo to receita', () => {
    const result = metaCreateSchema.safeParse({
      nome: 'Meta Teste',
      valorMeta: 10000,
      dataInicio: '2024-01-01',
      dataFim: '2024-01-31',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tipo).toBe('receita')
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// metaUpdateSchema
// ─────────────────────────────────────────────────────────────────────────────
describe('metaUpdateSchema', () => {
  it('allows partial updates', () => {
    const result = metaUpdateSchema.safeParse({ nome: 'Novo Nome' })
    expect(result.success).toBe(true)
  })

  it('validates dataFim > dataInicio when both provided', () => {
    const result = metaUpdateSchema.safeParse({
      dataInicio: '2024-12-31',
      dataFim: '2024-01-01',
    })
    expect(result.success).toBe(false)
  })

  it('allows updating just one date', () => {
    const result = metaUpdateSchema.safeParse({
      dataFim: '2024-06-30',
    })
    expect(result.success).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// rotaCreateSchema
// ─────────────────────────────────────────────────────────────────────────────
describe('rotaCreateSchema', () => {
  it('validates a complete rota', () => {
    const result = rotaCreateSchema.safeParse({ descricao: 'Rota Centro' })
    expect(result.success).toBe(true)
  })

  it('rejects empty descricao', () => {
    const result = rotaCreateSchema.safeParse({ descricao: '' })
    expect(result.success).toBe(false)
  })

  it('defaults status to Ativo', () => {
    const result = rotaCreateSchema.safeParse({ descricao: 'Rota Norte' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('Ativo')
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// validateBody() integration
// ─────────────────────────────────────────────────────────────────────────────
describe('validateBody()', () => {
  it('returns parsed data on valid input', () => {
    const data = { descricao: 'Rota Sul' }
    const result = validateBody(rotaCreateSchema, data)
    expect(result.descricao).toBe('Rota Sul')
  })

  it('throws ApiError on invalid input', () => {
    const data = { descricao: '' }
    expect(() => validateBody(rotaCreateSchema, data)).toThrow(ApiError)
  })

  it('throws ApiError with status 400', () => {
    const data = { descricao: '' }
    try {
      validateBody(rotaCreateSchema, data)
      fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect((err as ApiError).statusCode).toBe(400)
      expect((err as ApiError).message).toContain('Dados inválidos')
    }
  })

  it('includes field path in error message', () => {
    const data = { descricao: '' }
    try {
      validateBody(rotaCreateSchema, data)
      fail('Should have thrown')
    } catch (err) {
      expect((err as ApiError).message).toContain('descricao')
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ApiError class
// ─────────────────────────────────────────────────────────────────────────────
describe('ApiError', () => {
  it('has correct properties', () => {
    const err = new ApiError(400, 'Bad request', { field: 'nome' })
    expect(err.statusCode).toBe(400)
    expect(err.message).toBe('Bad request')
    expect(err.details).toEqual({ field: 'nome' })
    expect(err.name).toBe('ApiError')
  })

  it('is an instance of Error', () => {
    const err = new ApiError(500, 'Server error')
    expect(err).toBeInstanceOf(Error)
  })

  it('details is optional', () => {
    const err = new ApiError(404, 'Not found')
    expect(err.details).toBeUndefined()
  })
})
