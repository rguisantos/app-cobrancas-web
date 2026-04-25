'use client'

import { useState } from 'react'
import {
  Mail,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  Settings,
  AlertTriangle,
} from 'lucide-react'

export default function EmailClient() {
  const [testEmail, setTestEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [notifying, setNotifying] = useState(false)
  const [notifyResult, setNotifyResult] = useState<{ enviados: number; erros: number } | null>(null)

  async function handleTestEmail() {
    if (!testEmail) return
    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/email/teste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail }),
      })
      const data = await res.json()
      setResult({
        success: data.sent || false,
        message: data.message || data.error || 'Resultado desconhecido',
      })
    } catch (err) {
      setResult({ success: false, message: 'Erro ao conectar com o servidor' })
    } finally {
      setSending(false)
    }
  }

  async function handleNotificarAtrasadas() {
    if (!confirm('Deseja enviar notificações por email para todas as cobranças atrasadas?')) return
    setNotifying(true)
    setNotifyResult(null)
    try {
      const res = await fetch('/api/email/notificar-atrasadas', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setNotifyResult({ enviados: data.enviados || 0, erros: data.erros || 0 })
      } else {
        setNotifyResult({ enviados: 0, erros: 1 })
      }
    } catch (err) {
      setNotifyResult({ enviados: 0, erros: 1 })
    } finally {
      setNotifying(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Configuration Status */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Status da Configuração</h3>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Configuração via Variáveis de Ambiente
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                O serviço de email é configurado através das seguintes variáveis de ambiente no servidor:
              </p>
              <div className="mt-3 bg-white dark:bg-slate-800 rounded-lg p-3 text-xs font-mono space-y-1">
                <p><span className="text-slate-500">EMAIL_HOST=</span><span className="text-slate-700 dark:text-slate-300">smtp.seuprovedor.com</span></p>
                <p><span className="text-slate-500">EMAIL_PORT=</span><span className="text-slate-700 dark:text-slate-300">587</span></p>
                <p><span className="text-slate-500">EMAIL_SECURE=</span><span className="text-slate-700 dark:text-slate-300">false</span></p>
                <p><span className="text-slate-500">EMAIL_USER=</span><span className="text-slate-700 dark:text-slate-300">seu-email@provedor.com</span></p>
                <p><span className="text-slate-500">EMAIL_PASS=</span><span className="text-slate-700 dark:text-slate-300">sua-senha</span></p>
                <p><span className="text-slate-500">EMAIL_FROM_NAME=</span><span className="text-slate-700 dark:text-slate-300">Sistema Cobranças</span></p>
                <p><span className="text-slate-500">EMAIL_FROM_EMAIL=</span><span className="text-slate-700 dark:text-slate-300">noreply@seuprovedor.com</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Test Email */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Mail className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Teste de Envio</h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Envie um email de teste para verificar se a configuração está funcionando.
        </p>
        <div className="flex gap-3">
          <input
            type="email"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            placeholder="email@exemplo.com"
            className="flex-1 text-sm border border-slate-200 rounded-lg px-4 py-2 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
          />
          <button
            onClick={handleTestEmail}
            disabled={sending || !testEmail}
            className="flex items-center gap-2 px-5 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar Teste
          </button>
        </div>

        {result && (
          <div className={`mt-4 flex items-center gap-2 p-3 rounded-lg ${
            result.success
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
          }`}>
            {result.success ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            <span className="text-sm">{result.message}</span>
          </div>
        )}
      </div>

      {/* Batch Notification */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Notificar Cobranças Atrasadas</h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Envia email de notificação para todos os clientes com cobranças atrasadas (1 a 30 dias de atraso).
          Apenas clientes com email cadastrado receberão a notificação.
        </p>
        <button
          onClick={handleNotificarAtrasadas}
          disabled={notifying}
          className="flex items-center gap-2 px-5 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
        >
          {notifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Notificar Atrasadas
        </button>

        {notifyResult && (
          <div className="mt-4 flex items-center gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              {notifyResult.enviados} enviados
            </div>
            {notifyResult.erros > 0 && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <XCircle className="w-4 h-4" />
                {notifyResult.erros} erros
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
