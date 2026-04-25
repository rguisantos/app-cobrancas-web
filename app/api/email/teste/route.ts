import { NextRequest, NextResponse } from 'next/server'
import { enviarEmail, EMAIL_CONFIG } from '@/lib/email'

// POST /api/email/teste - Send a test email
export async function POST(request: NextRequest) {
  try {
    if (!EMAIL_CONFIG.ativo) {
      return NextResponse.json({
        configured: false,
        message: 'Email não configurado. Configure as variáveis de ambiente: EMAIL_HOST, EMAIL_USER, EMAIL_PASS, EMAIL_FROM_EMAIL',
      })
    }

    const body = await request.json()
    const to = body.email

    if (!to) {
      return NextResponse.json({ error: 'Informe o email de destino' }, { status: 400 })
    }

    const sent = await enviarEmail({
      to,
      subject: 'Teste - Sistema de Cobranças',
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #2563EB, #3B82F6); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">✓ Email Configurado!</h1>
          </div>
          <div style="background: white; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
            <p style="color: #334155; font-size: 16px;">Este é um email de teste do <strong>Sistema de Cobranças</strong>.</p>
            <p style="color: #475569; font-size: 14px;">Se você recebeu este email, a configuração de envio está funcionando corretamente.</p>
            <div style="background: #F1F5F9; border-radius: 8px; padding: 12px; margin-top: 16px;">
              <p style="color: #64748B; font-size: 12px; margin: 0;">Configuração: ${EMAIL_CONFIG.host}:${EMAIL_CONFIG.port} (${EMAIL_CONFIG.secure ? 'SSL' : 'TLS'})</p>
            </div>
          </div>
        </div>
      `,
    })

    return NextResponse.json({
      configured: true,
      sent,
      message: sent ? 'Email de teste enviado com sucesso!' : 'Falha ao enviar email de teste.',
    })
  } catch (error) {
    console.error('Erro no teste de email:', error)
    return NextResponse.json({ error: 'Erro ao enviar email de teste' }, { status: 500 })
  }
}
