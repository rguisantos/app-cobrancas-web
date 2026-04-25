// __tests__/lib/sync-engine.test.ts
import type { ChangeLog } from '@/shared/types'

// ─────────────────────────────────────────────────────────────────────────────
// Module-level mocks — MUST be before importing the module under test
// ─────────────────────────────────────────────────────────────────────────────

const mockPrismaClient = {
  cliente: {
    findUnique: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
  },
  changeLog: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  syncConflict: {
    create: jest.fn(),
  },
  dispositivo: {
    updateMany: jest.fn(),
  },
}

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrismaClient,
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

// Import AFTER mocks are set up
import {
  parseChanges,
  filterAllowedFields,
  convertForPrisma,
  parseSafeSince,
  sortChangesByDependency,
  processPush,
} from '@/lib/sync-engine'

// ─────────────────────────────────────────────────────────────────────────────
// parseChanges()
// ─────────────────────────────────────────────────────────────────────────────
describe('parseChanges()', () => {
  it('parses a JSON string into an object', () => {
    const input = JSON.stringify({ nome: 'João', idade: 30 })
    expect(parseChanges(input)).toEqual({ nome: 'João', idade: 30 })
  })

  it('returns empty object for invalid JSON string', () => {
    expect(parseChanges('{invalid json}')).toEqual({})
    expect(parseChanges('not json at all')).toEqual({})
  })

  it('returns the object as-is when input is already an object', () => {
    const obj = { nome: 'Maria', ativo: true }
    expect(parseChanges(obj)).toBe(obj)
  })

  it('returns empty object for null', () => {
    expect(parseChanges(null)).toEqual({})
  })

  it('returns empty object for undefined', () => {
    expect(parseChanges(undefined)).toEqual({})
  })

  it('parses nested JSON string correctly', () => {
    const nested = { contatos: [{ nome: 'a' }], endereco: { cidade: 'SP' } }
    expect(parseChanges(JSON.stringify(nested))).toEqual(nested)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// filterAllowedFields()
// ─────────────────────────────────────────────────────────────────────────────
describe('filterAllowedFields()', () => {
  it('filters out fields not in ALLOWED_FIELDS for cliente model', () => {
    const data = {
      nomeExibicao: 'João',
      email: 'joao@test.com',
      senha: 'should-be-removed',
      fotoUrl: 'http://example.com',
    }
    const result = filterAllowedFields('cliente', data)
    expect(result).toHaveProperty('nomeExibicao', 'João')
    expect(result).toHaveProperty('email', 'joao@test.com')
    expect(result).not.toHaveProperty('senha')
    expect(result).not.toHaveProperty('fotoUrl')
  })

  it('keeps fields that are in ALLOWED_FIELDS', () => {
    const data = {
      tipo: 'cliente',
      tipoPessoa: 'Fisica',
      nomeExibicao: 'Maria',
      cpf: '12345678900',
      latitude: '-20.4435',
      longitude: '-54.6487',
    }
    const result = filterAllowedFields('cliente', data)
    expect(result).toEqual(data)
  })

  it('ignores known virtual fields (id, createdAt, cpfCnpj) without logging them as removed', () => {
    const data = {
      id: 'some-uuid',
      createdAt: '2024-01-01',
      cpfCnpj: '12345678900',
      rgIe: '1234567',
      locacaoAtiva: { locacaoId: 'x' },
      estaLocado: true,
      nomeExibicao: 'João',
    }
    const result = filterAllowedFields('cliente', data)
    expect(result).not.toHaveProperty('id')
    expect(result).not.toHaveProperty('createdAt')
    expect(result).not.toHaveProperty('cpfCnpj')
    expect(result).not.toHaveProperty('rgIe')
    expect(result).not.toHaveProperty('locacaoAtiva')
    expect(result).not.toHaveProperty('estaLocado')
    expect(result).toHaveProperty('nomeExibicao', 'João')
  })

  it('returns data as-is for unknown models (with warning)', () => {
    const data = { nome: 'Test', valor: 100 }
    const result = filterAllowedFields('modeloInexistente', data)
    expect(result).toEqual(data)
  })

  it('keeps latitude and longitude for cliente model', () => {
    const data = {
      latitude: '-20.4435',
      longitude: '-54.6487',
      nomeExibicao: 'Teste',
    }
    const result = filterAllowedFields('cliente', data)
    expect(result).toHaveProperty('latitude', '-20.4435')
    expect(result).toHaveProperty('longitude', '-54.6487')
  })

  it('filters fields correctly for produto model', () => {
    const data = {
      identificador: '515',
      conservacao: 'Ótima',
      statusProduto: 'Ativo',
      senha: 'removed',
    }
    const result = filterAllowedFields('produto', data)
    expect(result).toHaveProperty('identificador', '515')
    expect(result).toHaveProperty('conservacao', 'Ótima')
    expect(result).toHaveProperty('statusProduto', 'Ativo')
    expect(result).not.toHaveProperty('senha')
  })

  it('filters fields correctly for usuario model (senha removed)', () => {
    const data = {
      nome: 'Admin',
      email: 'admin@test.com',
      senha: 'secret123',
      permissoesWeb: '{}',
    }
    const result = filterAllowedFields('usuario', data)
    expect(result).toHaveProperty('nome', 'Admin')
    expect(result).toHaveProperty('email', 'admin@test.com')
    expect(result).not.toHaveProperty('senha')
    expect(result).toHaveProperty('permissoesWeb', '{}')
  })

  it('handles empty data object', () => {
    const result = filterAllowedFields('cliente', {})
    expect(result).toEqual({})
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// convertForPrisma()
// ─────────────────────────────────────────────────────────────────────────────
describe('convertForPrisma()', () => {
  it('converts string JSON contatos to object', () => {
    const contatos = [{ nome: 'João', telefone: '11999999999' }]
    const result = convertForPrisma({ contatos: JSON.stringify(contatos) })
    expect(result.contatos).toEqual(contatos)
  })

  it('converts invalid string JSON contatos to null', () => {
    const result = convertForPrisma({ contatos: '{not valid json}' })
    expect(result.contatos).toBeNull()
  })

  it('converts string JSON permissoesWeb to object', () => {
    const permissoes = { todosCadastros: true, relatorios: false }
    const result = convertForPrisma({ permissoesWeb: JSON.stringify(permissoes) })
    expect(result.permissoesWeb).toEqual(permissoes)
  })

  it('converts invalid string JSON permissoesWeb to empty object', () => {
    const result = convertForPrisma({ permissoesWeb: 'invalid' })
    expect(result.permissoesWeb).toEqual({})
  })

  it('converts string JSON permissoesMobile to object', () => {
    const permissoes = { todosCadastros: true, cobrancasFaturas: true }
    const result = convertForPrisma({ permissoesMobile: JSON.stringify(permissoes) })
    expect(result.permissoesMobile).toEqual(permissoes)
  })

  it('converts invalid string JSON permissoesMobile to empty object', () => {
    const result = convertForPrisma({ permissoesMobile: 'invalid' })
    expect(result.permissoesMobile).toEqual({})
  })

  it('converts string JSON rotasPermitidas to array', () => {
    const rotas = ['rota-1', 'rota-2', 'rota-3']
    const result = convertForPrisma({ rotasPermitidas: JSON.stringify(rotas) })
    expect(result.rotasPermitidas).toEqual(rotas)
  })

  it('converts invalid string JSON rotasPermitidas to empty array', () => {
    const result = convertForPrisma({ rotasPermitidas: 'invalid' })
    expect(result.rotasPermitidas).toEqual([])
  })

  describe('boolean conversions', () => {
    it('converts "true" string to true for needsSync', () => {
      expect(convertForPrisma({ needsSync: 'true' }).needsSync).toBe(true)
    })

    it('converts "1" string to true for needsSync', () => {
      expect(convertForPrisma({ needsSync: '1' }).needsSync).toBe(true)
    })

    it('converts 1 (number) to true for needsSync', () => {
      expect(convertForPrisma({ needsSync: 1 }).needsSync).toBe(true)
    })

    it('converts "false" string to false for needsSync', () => {
      expect(convertForPrisma({ needsSync: 'false' }).needsSync).toBe(false)
    })

    it('converts "0" string to false for needsSync', () => {
      expect(convertForPrisma({ needsSync: '0' }).needsSync).toBe(false)
    })

    it('converts 0 (number) to false for needsSync', () => {
      expect(convertForPrisma({ needsSync: 0 }).needsSync).toBe(false)
    })

    it('converts empty string to false for needsSync', () => {
      expect(convertForPrisma({ needsSync: '' }).needsSync).toBe(false)
    })

    it('converts boolean strings for trocaPano', () => {
      expect(convertForPrisma({ trocaPano: 'true' }).trocaPano).toBe(true)
      expect(convertForPrisma({ trocaPano: 'false' }).trocaPano).toBe(false)
      expect(convertForPrisma({ trocaPano: 1 }).trocaPano).toBe(true)
      expect(convertForPrisma({ trocaPano: 0 }).trocaPano).toBe(false)
    })

    it('converts boolean strings for bloqueado', () => {
      expect(convertForPrisma({ bloqueado: 'true' }).bloqueado).toBe(true)
      expect(convertForPrisma({ bloqueado: 'false' }).bloqueado).toBe(false)
      expect(convertForPrisma({ bloqueado: '1' }).bloqueado).toBe(true)
      expect(convertForPrisma({ bloqueado: '0' }).bloqueado).toBe(false)
    })
  })

  describe('numeric conversions', () => {
    it('converts string version to number', () => {
      expect(convertForPrisma({ version: '5' }).version).toBe(5)
    })

    it('converts string precoFicha to number', () => {
      expect(convertForPrisma({ precoFicha: '2.50' }).precoFicha).toBe(2.5)
    })

    it('converts string latitude to number', () => {
      expect(convertForPrisma({ latitude: '-20.4435' }).latitude).toBe(-20.4435)
    })

    it('converts string longitude to number', () => {
      expect(convertForPrisma({ longitude: '-54.6487' }).longitude).toBe(-54.6487)
    })

    it('converts string percentualEmpresa to number', () => {
      expect(convertForPrisma({ percentualEmpresa: '60' }).percentualEmpresa).toBe(60)
    })

    it('converts string totalBruto to number', () => {
      expect(convertForPrisma({ totalBruto: '150.75' }).totalBruto).toBe(150.75)
    })

    it('converts string fichasRodadas to number', () => {
      expect(convertForPrisma({ fichasRodadas: '100' }).fichasRodadas).toBe(100)
    })

    it('does not convert NaN-producing strings', () => {
      const result = convertForPrisma({ version: 'abc' })
      expect(result.version).toBe('abc')
    })

    it('does not convert empty string to 0', () => {
      const result = convertForPrisma({ version: '' })
      expect(result.version).toBe('')
    })
  })

  it('leaves null values unchanged', () => {
    const result = convertForPrisma({
      contatos: null,
      permissoesWeb: null,
      needsSync: null,
      version: null,
    })
    expect(result.contatos).toBeNull()
    expect(result.permissoesWeb).toBeNull()
    expect(result.needsSync).toBeNull()
    expect(result.version).toBeNull()
  })

  it('leaves undefined values unchanged', () => {
    const result = convertForPrisma({ contatos: undefined })
    expect(result.contatos).toBeUndefined()
  })

  it('handles mixed conversions in a single call', () => {
    const input = {
      contatos: JSON.stringify([{ nome: 'João' }]),
      permissoesWeb: JSON.stringify({ todosCadastros: true }),
      needsSync: 'true',
      version: '3',
      precoFicha: '2.50',
      latitude: '-20.4435',
      nomeExibicao: 'Test',
    }
    const result = convertForPrisma(input)
    expect(result.contatos).toEqual([{ nome: 'João' }])
    expect(result.permissoesWeb).toEqual({ todosCadastros: true })
    expect(result.needsSync).toBe(true)
    expect(result.version).toBe(3)
    expect(result.precoFicha).toBe(2.5)
    expect(result.latitude).toBe(-20.4435)
    expect(result.nomeExibicao).toBe('Test')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// parseSafeSince()
// ─────────────────────────────────────────────────────────────────────────────
describe('parseSafeSince()', () => {
  it('returns valid Date for valid ISO string', () => {
    const isoString = '2024-06-15T10:30:00.000Z'
    const result = parseSafeSince(isoString)
    expect(result).toBeInstanceOf(Date)
    expect(result.toISOString()).toBe(isoString)
  })

  it('returns epoch (new Date(0)) for invalid string', () => {
    const result = parseSafeSince('not-a-date')
    expect(result).toBeInstanceOf(Date)
    expect(result.getTime()).toBe(0)
  })

  it('returns epoch for empty string', () => {
    const result = parseSafeSince('')
    expect(result).toBeInstanceOf(Date)
    expect(result.getTime()).toBe(0)
  })

  it('parses various valid date formats', () => {
    const result1 = parseSafeSince('15 Jun 2024 10:30:00 GMT')
    expect(result1.getTime()).not.toBe(0)

    const result2 = parseSafeSince('2024-06-15T10:30:00Z')
    expect(result2.getTime()).not.toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// sortChangesByDependency()
// ─────────────────────────────────────────────────────────────────────────────
describe('sortChangesByDependency()', () => {
  function makeChange(
    entityType: ChangeLog['entityType'],
    entityId: string,
    operation: ChangeLog['operation'] = 'create'
  ): ChangeLog {
    return {
      id: `log-${entityType}-${entityId}`,
      entityId,
      entityType,
      operation,
      changes: {},
      timestamp: new Date().toISOString(),
      deviceId: 'test-device',
      synced: false,
    }
  }

  it('sorts changes by dependency order (rota before cliente, cliente before locacao, etc.)', () => {
    const changes = [
      makeChange('cobranca', 'cob-1'),
      makeChange('locacao', 'loc-1'),
      makeChange('cliente', 'cli-1'),
      makeChange('rota', 'rota-1'),
    ]

    const sorted = sortChangesByDependency(changes)
    const types = sorted.map((c) => c.entityType)
    expect(types).toEqual(['rota', 'cliente', 'locacao', 'cobranca'])
  })

  it('sorts all entity types in correct dependency order', () => {
    const changes = [
      makeChange('usuario', 'usr-1'),
      makeChange('cobranca', 'cob-1'),
      makeChange('locacao', 'loc-1'),
      makeChange('produto', 'prod-1'),
      makeChange('cliente', 'cli-1'),
      makeChange('rota', 'rota-1'),
    ]

    const sorted = sortChangesByDependency(changes)
    const types = sorted.map((c) => c.entityType)
    expect(types).toEqual(['rota', 'cliente', 'produto', 'locacao', 'cobranca', 'usuario'])
  })

  it('handles empty array', () => {
    const sorted = sortChangesByDependency([])
    expect(sorted).toEqual([])
  })

  it('handles single element array', () => {
    const changes = [makeChange('cliente', 'cli-1')]
    const sorted = sortChangesByDependency(changes)
    expect(sorted).toHaveLength(1)
    expect(sorted[0].entityType).toBe('cliente')
  })

  it('handles unknown entity types (indexOf returns -1, sorts before valid types)', () => {
    const changes: ChangeLog[] = [
      makeChange('cliente', 'cli-1'),
      {
        ...makeChange('cliente', 'cli-2'),
        entityType: 'desconhecido' as ChangeLog['entityType'],
      },
      makeChange('rota', 'rota-1'),
    ]

    const sorted = sortChangesByDependency(changes)
    const types = sorted.map((c) => c.entityType)

    expect(types[0]).toBe('desconhecido')
    expect(types[1]).toBe('rota')
    expect(types[2]).toBe('cliente')
  })

  it('preserves relative order for same entity type', () => {
    const changes = [
      makeChange('cliente', 'cli-2'),
      makeChange('cliente', 'cli-1'),
      makeChange('cliente', 'cli-3'),
    ]

    const sorted = sortChangesByDependency(changes)
    const ids = sorted.map((c) => c.entityId)
    expect(ids).toEqual(['cli-2', 'cli-1', 'cli-3'])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// processPush() with mocks — integration tests
// ─────────────────────────────────────────────────────────────────────────────
describe('processPush() with mocks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates a new cliente when entity does not exist', async () => {
    // No existing changelog (replay check)
    mockPrismaClient.changeLog.findUnique.mockResolvedValue(null)

    // Entity does not exist → create path
    mockPrismaClient.cliente.findUnique.mockResolvedValue(null)

    // Create succeeds
    mockPrismaClient.cliente.create.mockResolvedValue({
      id: 'cli-1',
      version: 1,
    })

    // Changelog upsert
    mockPrismaClient.changeLog.upsert.mockResolvedValue({})

    // Dispositivo update (in finally block)
    mockPrismaClient.dispositivo.updateMany.mockResolvedValue({ count: 0 })

    const changes: ChangeLog[] = [
      {
        id: 'log-1',
        entityId: 'cli-1',
        entityType: 'cliente',
        operation: 'create',
        changes: {
          nomeExibicao: 'João',
          tipoPessoa: 'Fisica',
          version: 1,
        },
        timestamp: new Date().toISOString(),
        deviceId: 'device-1',
        synced: false,
      },
    ]

    const result = await processPush('device-1', changes)

    expect(result.errors).toHaveLength(0)
    expect(result.conflicts).toHaveLength(0)
    expect(result.updatedVersions).toHaveLength(1)
    expect(result.updatedVersions[0].entityId).toBe('cli-1')
    expect(mockPrismaClient.cliente.create).toHaveBeenCalled()
  })

  it('detects version conflict (server version > mobile version)', async () => {
    // No existing changelog
    mockPrismaClient.changeLog.findUnique.mockResolvedValue(null)

    // Entity exists with higher version
    mockPrismaClient.cliente.findUnique.mockResolvedValue({
      id: 'cli-1',
      version: 5,
    })

    // Conflict recording
    mockPrismaClient.syncConflict.create.mockResolvedValue({})

    // Changelog upsert for conflict
    mockPrismaClient.changeLog.upsert.mockResolvedValue({})

    // Dispositivo update
    mockPrismaClient.dispositivo.updateMany.mockResolvedValue({ count: 0 })

    const changes: ChangeLog[] = [
      {
        id: 'log-2',
        entityId: 'cli-1',
        entityType: 'cliente',
        operation: 'update',
        changes: {
          nomeExibicao: 'João Updated',
          version: 2,
        },
        timestamp: new Date().toISOString(),
        deviceId: 'device-1',
        synced: false,
      },
    ]

    const result = await processPush('device-1', changes)

    expect(result.conflicts).toHaveLength(1)
    expect(result.conflicts[0].conflictType).toBe('update')
    expect(result.conflicts[0].entityId).toBe('cli-1')
    expect(result.updatedVersions).toHaveLength(0)
  })

  it('detects replay (existing synced changelog) and skips processing', async () => {
    // Existing synced changelog → replay detection
    mockPrismaClient.changeLog.findUnique.mockResolvedValue({
      id: 'log-3',
      synced: true,
    })

    // Dispositivo update
    mockPrismaClient.dispositivo.updateMany.mockResolvedValue({ count: 0 })

    const changes: ChangeLog[] = [
      {
        id: 'log-3',
        entityId: 'cli-1',
        entityType: 'cliente',
        operation: 'create',
        changes: { nomeExibicao: 'João' },
        timestamp: new Date().toISOString(),
        deviceId: 'device-1',
        synced: false,
      },
    ]

    const result = await processPush('device-1', changes)

    // Should not have called create/update since it's a replay
    expect(mockPrismaClient.cliente.findUnique).not.toHaveBeenCalled()
    expect(mockPrismaClient.cliente.create).not.toHaveBeenCalled()
    expect(result.errors).toHaveLength(0)
    expect(result.conflicts).toHaveLength(0)
    expect(result.updatedVersions).toHaveLength(0)
  })
})
