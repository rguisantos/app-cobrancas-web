// lib/pix-config.ts — PIX configuration from environment variables
export const PIX_CONFIG = {
  chave: process.env.PIX_CHAVE || '',
  nome: process.env.PIX_NOME || '',
  cidade: process.env.PIX_CIDADE || '',
  ativo: !!(process.env.PIX_CHAVE && process.env.PIX_NOME && process.env.PIX_CIDADE),
}
