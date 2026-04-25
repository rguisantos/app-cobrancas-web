// lib/pix.ts — PIX EMV payload generator following Banco Central do Brasil specification
import QRCode from 'qrcode'

export function gerarPixEMV({
  chave,
  nome,
  cidade,
  valor,
  txid = '***',
}: {
  chave: string
  nome: string
  cidade: string
  valor: number
  txid?: string
}): string {
  function tlv(id: string, value: string): string {
    return `${id}${String(value.length).padStart(2, '0')}${value}`
  }

  const payload = [
    tlv('00', '01'), // Payload Format Indicator
    tlv(
      '26', // Merchant Account Information
      tlv('00', 'br.gov.bcb.pix') + tlv('01', chave)
    ),
    tlv('52', '0000'), // Merchant Category Code
    tlv('53', '986'), // Transaction Currency (BRL)
    tlv('54', valor.toFixed(2)), // Transaction Amount
    tlv('58', 'BR'), // Country Code
    tlv('59', nome.substring(0, 25)), // Merchant Name
    tlv('60', cidade.substring(0, 15)), // Merchant City
    tlv('62', tlv('05', txid)), // Additional Data Field
  ].join('')

  // Add CRC16 placeholder
  const payloadWithCRC = payload + '6304'

  // Calculate CRC16-CCITT
  const crc = crc16CCITT(payloadWithCRC)
  return payloadWithCRC + crc.toUpperCase()
}

function crc16CCITT(str: string): string {
  let crc = 0xffff
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021
      } else {
        crc <<= 1
      }
    }
    crc &= 0xffff
  }
  return crc.toString(16).padStart(4, '0')
}

export async function gerarQRCodePix(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    width: 200,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
  })
}
