import { NextRequest, NextResponse } from 'next/server'
import { notificarCobrancasAtrasadas, EMAIL_CONFIG } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    if (!EMAIL_CONFIG.ativo) {
      return NextResponse.json(
        { error: 'Serviço de email não configurado. Configure as variáveis EMAIL_HOST, EMAIL_USER, EMAIL_PASS.' },
        { status: 400 }
      )
    }

    const resultado = await notificarCobrancasAtrasadas()

    return NextResponse.json({
      message: `${resultado.enviados} emails enviados, ${resultado.erros} erros`,
      ...resultado,
    })
  } catch (error) {
    console.error('Erro ao notificar cobranças atrasadas:', error)
    return NextResponse.json({ error: 'Erro ao enviar notificações' }, { status: 500 })
  }
}
