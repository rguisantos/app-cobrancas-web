# Task 3+9: Thermal Receipt Printing (80mm) and PIX QR Code

## Summary
Implemented 80mm thermal receipt printing and PIX QR Code generation for the cobrança (billing) system.

## Files Created

### 1. `lib/pix.ts` — PIX EMV Payload Generator
- Generates PIX EMV codes following Banco Central do Brasil specification
- Implements TLV (Tag-Length-Value) encoding for EMV payload
- CRC16-CCITT checksum calculation
- `gerarPixEMV()` — creates the full PIX EMV payload string with merchant info, amount, and CRC
- `gerarQRCodePix()` — generates a QR code data URL from a PIX EMV string using the `qrcode` package

### 2. `lib/pix-config.ts` — PIX Configuration
- Reads PIX credentials from environment variables (`PIX_CHAVE`, `PIX_NOME`, `PIX_CIDADE`)
- Exports `PIX_CONFIG.ativo` flag that indicates whether PIX is properly configured
- PIX sections in receipts are conditionally rendered only when `PIX_CONFIG.ativo` is true

### 3. `app/api/cobrancas/[id]/recibo-termico/route.ts` — 80mm Thermal Receipt API
- Page width: 72 points (≈80mm at 72 DPI)
- Custom jsPDF format: `[72, 600]` with dynamic height trimming
- Content sections (all centered, small font 7-10pt):
  - **Header**: Company name (bold 10pt), address, phone
  - **Separator**: "--------------------------------"
  - **Recibo #** and date/time
  - **Cliente**: nome, CPF/CNPJ
  - **Produto**: identificador, tipo, período
  - **Leitura Relógio**: anterior, atual, fichas
  - **Resumo Financeiro**: valor ficha, total bruto, descontos, % empresa, subtotal
  - **Total Cliente Paga** — highlighted with inverted colors (black bg, white text)
  - **Valor Recebido** and **Saldo Devedor** (red if > 0)
  - **Status do Pagamento** — colored status badge
  - **PIX QR Code** (conditional) — centered QR image + "Escaneie o QR Code para pagar via PIX"
  - **Footer**: "Obrigado pela preferência!" + generation timestamp
- Returns PDF with `Content-Disposition: inline` and `application/pdf` content type

## Files Modified

### 4. `app/(app)/cobrancas/[id]/page.tsx` — Cobrança Detail Page
- Added `Printer` icon import from lucide-react
- Added "Recibo Térmico" button (with Printer icon) alongside existing "Recibo PDF" button
- Button opens thermal receipt in new tab via `target="_blank"`

### 5. `app/api/cobrancas/[id]/recibo/route.ts` — Existing A4 Receipt
- Added imports for `gerarPixEMV`, `gerarQRCodePix` from `@/lib/pix` and `PIX_CONFIG` from `@/lib/pix-config`
- Added conditional PIX QR Code section after the observação section:
  - Only renders when `PIX_CONFIG.ativo` is true
  - Checks page space and adds new page if needed
  - "Pague com PIX" section header with blue styling
  - Centered 40mm QR code image
  - "Escaneie o QR Code para pagar via PIX" instruction text
- All existing functionality preserved — no breaking changes

## Technical Details
- **PIX EMV spec**: Follows Banco Central do Brasil EMV QR Code specification with proper TLV encoding
- **CRC16-CCITT**: Standard polynomial 0x1021, initial value 0xFFFF
- **Thermal receipt**: 72pt width, auto-trimming page height based on content
- **QR Code**: Generated at 200px with 1px margin, rendered as base64 PNG data URL
- **Conditional PIX**: PIX sections only appear when all 3 env vars are set (`PIX_CHAVE`, `PIX_NOME`, `PIX_CIDADE`)

## Verification
- TypeScript type check: ✅ No errors
- ESLint: ✅ No errors
- All existing receipt functionality preserved
