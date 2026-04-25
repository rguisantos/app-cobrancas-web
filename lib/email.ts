import nodemailer from 'nodemailer'

// Email configuration from environment variables
const EMAIL_CONFIG = {
  host: process.env.EMAIL_HOST || '',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  user: process.env.EMAIL_USER || '',
  pass: process.env.EMAIL_PASS || '',
  fromName: process.env.EMAIL_FROM_NAME || 'Sistema Cobranças',
  fromEmail: process.env.EMAIL_FROM_EMAIL || '',
  ativo: !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS),
}

// Create transporter
function createTransporter() {
  if (!EMAIL_CONFIG.ativo) return null

  return nodemailer.createTransport({
    host: EMAIL_CONFIG.host,
    port: EMAIL_CONFIG.port,
    secure: EMAIL_CONFIG.secure,
    auth: {
      user: EMAIL_CONFIG.user,
      pass: EMAIL_CONFIG.pass,
    },
  })
}

// Send email
export async function enviarEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string
  subject: string
  html: string
  text?: string
}): Promise<boolean> {
  const transporter = createTransporter()
  if (!transporter) {
    console.log('[Email] Serviço de email não configurado. Pulando envio.')
    return false
  }

  try {
    const result = await transporter.sendMail({
      from: `"${EMAIL_CONFIG.fromName}" <${EMAIL_CONFIG.fromEmail || EMAIL_CONFIG.user}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    })

    console.log(`[Email] Enviado para ${to}: ${result.messageId}`)
    return true
  } catch (error) {
    console.error('[Email] Erro ao enviar:', error)
    return false
  }
}

// Email templates
export function emailCobrancaVencendo(params: {
  clienteNome: string
  valor: number
  dataVencimento: string
  produtoIdentificador: string
  link?: string
}): { subject: string; html: string } {
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  return {
    subject: `Lembrete: Cobrança vencendo em ${params.dataVencimento}`,
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #2563EB 0%, #3B82F6 100%); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Lembrete de Vencimento</h1>
        </div>
        <div style="background: white; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
          <p style="color: #334155; font-size: 16px;">Olá <strong>${params.clienteNome}</strong>,</p>
          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Informamos que sua cobrança referente ao produto <strong>${params.produtoIdentificador}</strong> 
            vence em <strong>${params.dataVencimento}</strong>.
          </p>
          <div style="background: #F1F5F9; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
            <p style="color: #64748B; font-size: 12px; margin: 0 0 4px;">Valor da Cobrança</p>
            <p style="color: #2563EB; font-size: 28px; font-weight: bold; margin: 0;">${formatCurrency(params.valor)}</p>
          </div>
          <p style="color: #475569; font-size: 14px;">
            Para evitar juros e multas, realize o pagamento até a data de vencimento.
          </p>
          ${params.link ? `<div style="text-align: center; margin-top: 20px;">
            <a href="${params.link}" style="background: #2563EB; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
              Ver Detalhes
            </a>
          </div>` : ''}
        </div>
        <div style="text-align: center; padding: 16px; color: #94A3B8; font-size: 12px;">
          <p>Este é um email automático do Sistema de Cobranças.</p>
          <p>Não responda este email.</p>
        </div>
      </div>
    `,
  }
}

export function emailCobrancaAtrasada(params: {
  clienteNome: string
  valor: number
  saldoDevedor: number
  diasAtraso: number
  produtoIdentificador: string
}): { subject: string; html: string } {
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  return {
    subject: `URGENTE: Cobrança atrasada há ${params.diasAtraso} dias`,
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Cobrança Atrasada</h1>
        </div>
        <div style="background: white; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
          <p style="color: #334155; font-size: 16px;">Olá <strong>${params.clienteNome}</strong>,</p>
          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Sua cobrança referente ao produto <strong>${params.produtoIdentificador}</strong> está 
            <strong style="color: #DC2626;">atrasada há ${params.diasAtraso} dias</strong>.
          </p>
          <div style="background: #FEF2F2; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #FECACA;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #991B1B; font-size: 14px;">Valor Original:</span>
              <span style="color: #991B1B; font-size: 14px; font-weight: bold;">${formatCurrency(params.valor)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #991B1B; font-size: 14px;">Saldo Devedor:</span>
              <span style="color: #DC2626; font-size: 18px; font-weight: bold;">${formatCurrency(params.saldoDevedor)}</span>
            </div>
          </div>
          <p style="color: #475569; font-size: 14px;">
            Por favor, regularize sua situação o mais rápido possível para evitar encargos adicionais.
          </p>
        </div>
        <div style="text-align: center; padding: 16px; color: #94A3B8; font-size: 12px;">
          <p>Este é um email automático do Sistema de Cobranças.</p>
        </div>
      </div>
    `,
  }
}

export function emailReciboPagamento(params: {
  clienteNome: string
  valor: number
  dataPagamento: string
  produtoIdentificador: string
  reciboLink?: string
}): { subject: string; html: string } {
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  return {
    subject: `Recibo de Pagamento - ${params.dataPagamento}`,
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #16A34A 0%, #22C55E 100%); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">✓ Pagamento Confirmado</h1>
        </div>
        <div style="background: white; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
          <p style="color: #334155; font-size: 16px;">Olá <strong>${params.clienteNome}</strong>,</p>
          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Seu pagamento referente ao produto <strong>${params.produtoIdentificador}</strong> foi confirmado.
          </p>
          <div style="background: #F0FDF4; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #BBF7D0;">
            <p style="color: #166534; font-size: 12px; margin: 0 0 4px;">Valor Pago</p>
            <p style="color: #16A34A; font-size: 28px; font-weight: bold; margin: 0;">${formatCurrency(params.valor)}</p>
            <p style="color: #166534; font-size: 12px; margin: 4px 0 0;">Data: ${params.dataPagamento}</p>
          </div>
          ${params.reciboLink ? `<div style="text-align: center; margin-top: 20px;">
            <a href="${params.reciboLink}" style="background: #16A34A; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
              Baixar Recibo
            </a>
          </div>` : ''}
        </div>
        <div style="text-align: center; padding: 16px; color: #94A3B8; font-size: 12px;">
          <p>Este é um email automático do Sistema de Cobranças.</p>
        </div>
      </div>
    `,
  }
}

// Batch email notification for all overdue cobranças
export async function notificarCobrancasAtrasadas(): Promise<{ enviados: number; erros: number }> {
  if (!EMAIL_CONFIG.ativo) return { enviados: 0, erros: 0 }

  const { prisma } = await import('@/lib/prisma')

  const atrasadas = await prisma.cobranca.findMany({
    where: {
      status: 'Atrasado',
      deletedAt: null,
    },
    include: {
      locacao: {
        include: {
          cliente: true,
        },
      },
    },
    take: 100,
  })

  let enviados = 0
  let erros = 0

  for (const cobranca of atrasadas) {
    const email = cobranca.locacao?.cliente?.email
    if (!email) continue

    const diasAtraso = Math.ceil(
      (Date.now() - new Date(cobranca.dataVencimento || cobranca.dataFim).getTime()) / (1000 * 60 * 60 * 24)
    )

    // Only send if at least 1 day overdue and not more than 30 days
    if (diasAtraso < 1 || diasAtraso > 30) continue

    const template = emailCobrancaAtrasada({
      clienteNome: cobranca.clienteNome,
      valor: cobranca.totalClientePaga,
      saldoDevedor: cobranca.saldoDevedorGerado,
      diasAtraso,
      produtoIdentificador: cobranca.produtoIdentificador,
    })

    const sent = await enviarEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    })

    if (sent) enviados++
    else erros++
  }

  return { enviados, erros }
}

export { EMAIL_CONFIG }
