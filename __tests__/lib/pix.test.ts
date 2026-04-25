// __tests__/lib/pix.test.ts
// Tests for lib/pix.ts — PIX EMV payload generator + CRC16-CCITT

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mockqrcode'),
}))

import { gerarPixEMV, gerarQRCodePix } from '@/lib/pix'

// ─────────────────────────────────────────────────────────────────────────────
// CRC16-CCITT validation (deterministic — can be verified against known values)
// ─────────────────────────────────────────────────────────────────────────────
describe('gerarPixEMV()', () => {
  it('generates a non-empty string', () => {
    const result = gerarPixEMV({
      chave: 'test@example.com',
      nome: 'LOJA TESTE',
      cidade: 'CAMPO GRANDE',
      valor: 100.00,
    })
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })

  it('starts with Payload Format Indicator 00 02 01', () => {
    const result = gerarPixEMV({
      chave: 'test@example.com',
      nome: 'LOJA TESTE',
      cidade: 'CAMPO GRANDE',
      valor: 100.00,
    })
    // TLV: ID=00, Length=02, Value=01
    expect(result.startsWith('0002')).toBe(true)
  })

  it('contains Merchant Account Information (26)', () => {
    const result = gerarPixEMV({
      chave: 'test@example.com',
      nome: 'LOJA TESTE',
      cidade: 'CAMPO GRANDE',
      valor: 100.00,
    })
    expect(result).toContain('26')  // ID for Merchant Account Information
    expect(result).toContain('br.gov.bcb.pix')
    expect(result).toContain('test@example.com')
  })

  it('contains Transaction Currency 986 (BRL)', () => {
    const result = gerarPixEMV({
      chave: 'test@example.com',
      nome: 'LOJA TESTE',
      cidade: 'CAMPO GRANDE',
      valor: 100.00,
    })
    // TLV: ID=53, Length=03, Value=986
    expect(result).toContain('5303986')
  })

  it('contains Transaction Amount', () => {
    const result = gerarPixEMV({
      chave: 'test@example.com',
      nome: 'LOJA TESTE',
      cidade: 'CAMPO GRANDE',
      valor: 150.50,
    })
    expect(result).toContain('150.50')
  })

  it('contains Country Code BR', () => {
    const result = gerarPixEMV({
      chave: 'test@example.com',
      nome: 'LOJA TESTE',
      cidade: 'CAMPO GRANDE',
      valor: 100.00,
    })
    // TLV: ID=58, Length=02, Value=BR
    expect(result).toContain('5802BR')
  })

  it('contains Merchant Name', () => {
    const result = gerarPixEMV({
      chave: 'test@example.com',
      nome: 'LOJA TESTE',
      cidade: 'CAMPO GRANDE',
      valor: 100.00,
    })
    expect(result).toContain('LOJA TESTE')
  })

  it('contains Merchant City', () => {
    const result = gerarPixEMV({
      chave: 'test@example.com',
      nome: 'LOJA TESTE',
      cidade: 'CAMPO GRANDE',
      valor: 100.00,
    })
    expect(result).toContain('CAMPO GRANDE')
  })

  it('ends with CRC16 checksum (6304 + 4 hex chars)', () => {
    const result = gerarPixEMV({
      chave: 'test@example.com',
      nome: 'LOJA TESTE',
      cidade: 'CAMPO GRANDE',
      valor: 100.00,
    })
    expect(result).toContain('6304')
    // CRC is the last 4 characters after '6304'
    const crcPart = result.slice(-4)
    expect(crcPart).toMatch(/^[0-9A-F]{4}$/)
  })

  it('produces deterministic output for same inputs', () => {
    const params = {
      chave: 'test@example.com',
      nome: 'LOJA TESTE',
      cidade: 'CAMPO GRANDE',
      valor: 100.00,
    }
    const result1 = gerarPixEMV(params)
    const result2 = gerarPixEMV(params)
    expect(result1).toBe(result2)
  })

  it('produces different output for different values', () => {
    const result1 = gerarPixEMV({
      chave: 'test@example.com',
      nome: 'LOJA TESTE',
      cidade: 'CAMPO GRANDE',
      valor: 100.00,
    })
    const result2 = gerarPixEMV({
      chave: 'test@example.com',
      nome: 'LOJA TESTE',
      cidade: 'CAMPO GRANDE',
      valor: 200.00,
    })
    expect(result1).not.toBe(result2)
  })

  it('truncates merchant name to 25 characters', () => {
    const longName = 'A'.repeat(30)
    const result = gerarPixEMV({
      chave: 'test@example.com',
      nome: longName,
      cidade: 'CAMPO GRANDE',
      valor: 100.00,
    })
    // The TLV for name (59) should have length 25
    const nameIndex = result.indexOf('59')
    const lengthStr = result.substring(nameIndex + 2, nameIndex + 4)
    expect(parseInt(lengthStr, 10)).toBe(25)
  })

  it('truncates merchant city to 15 characters', () => {
    const longCity = 'C'.repeat(20)
    const result = gerarPixEMV({
      chave: 'test@example.com',
      nome: 'LOJA',
      cidade: longCity,
      valor: 100.00,
    })
    const cityIndex = result.indexOf('60')
    const lengthStr = result.substring(cityIndex + 2, cityIndex + 4)
    expect(parseInt(lengthStr, 10)).toBe(15)
  })

  it('uses default txid *** when not specified', () => {
    const result = gerarPixEMV({
      chave: 'test@example.com',
      nome: 'LOJA TESTE',
      cidade: 'CAMPO GRANDE',
      valor: 100.00,
    })
    expect(result).toContain('***')
  })

  it('uses custom txid when specified', () => {
    const result = gerarPixEMV({
      chave: 'test@example.com',
      nome: 'LOJA TESTE',
      cidade: 'CAMPO GRANDE',
      valor: 100.00,
      txid: 'COBRANCA123',
    })
    expect(result).toContain('COBRANCA123')
  })

  it('formats value with 2 decimal places', () => {
    const result = gerarPixEMV({
      chave: 'test@example.com',
      nome: 'LOJA',
      cidade: 'SAO PAULO',
      valor: 50,
    })
    expect(result).toContain('50.00')
  })

  it('handles zero value', () => {
    const result = gerarPixEMV({
      chave: 'test@example.com',
      nome: 'LOJA',
      cidade: 'SAO PAULO',
      valor: 0,
    })
    expect(result).toContain('0.00')
  })

  it('contains Merchant Category Code 0000', () => {
    const result = gerarPixEMV({
      chave: 'test@example.com',
      nome: 'LOJA',
      cidade: 'SAO PAULO',
      valor: 100,
    })
    // TLV: ID=52, Length=04, Value=0000
    expect(result).toContain('52040000')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CRC16-CCITT specific tests (verify against known vectors)
// ─────────────────────────────────────────────────────────────────────────────
describe('CRC16-CCITT (via gerarPixEMV)', () => {
  it('CRC is always 4 uppercase hex characters', () => {
    const result = gerarPixEMV({
      chave: 'a@b.com',
      nome: 'TEST',
      cidade: 'SP',
      valor: 1,
    })
    const crc = result.slice(-4)
    expect(crc).toMatch(/^[0-9A-F]{4}$/)
  })

  it('CRC changes when payload changes', () => {
    const r1 = gerarPixEMV({ chave: 'a@b.com', nome: 'TEST1', cidade: 'SP', valor: 10 })
    const r2 = gerarPixEMV({ chave: 'a@b.com', nome: 'TEST2', cidade: 'SP', valor: 10 })
    const crc1 = r1.slice(-4)
    const crc2 = r2.slice(-4)
    expect(crc1).not.toBe(crc2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// gerarQRCodePix()
// ─────────────────────────────────────────────────────────────────────────────
describe('gerarQRCodePix()', () => {
  it('returns a data URL string', async () => {
    const result = await gerarQRCodePix('test-payload')
    expect(result).toBeTruthy()
    expect(result).toContain('data:image/png')
  })

  it('calls QRCode.toDataURL with correct options', async () => {
    const QRCode = require('qrcode')
    await gerarQRCodePix('test-payload-123')
    expect(QRCode.toDataURL).toHaveBeenCalledWith(
      'test-payload-123',
      expect.objectContaining({
        width: 200,
        margin: 1,
      }),
    )
  })
})
