'use client'

import { useState, useCallback } from 'react'
import { Mail, Loader2, AlertTriangle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { z } from 'zod'

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
})

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleInputChange = useCallback((value: string) => {
    setEmail(value)
    if (emailError) setEmailError('')
    if (error) setError('')
  }, [emailError, error])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const result = forgotPasswordSchema.safeParse({ email })
    if (!result.success) {
      setEmailError(result.error.errors[0]?.message || 'Email inválido')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erro ao processar solicitação')
        return
      }

      setSuccess(true)

      // Em desenvolvimento, se o token foi retornado, salvar para facilitar testes
      if (data.token) {
        console.log('[dev] Token de recuperação:', data.token)
        console.log('[dev] Link de reset:', `${window.location.origin}/reset-password?token=${data.token}`)
      }
    } catch {
      setError('Erro ao conectar com o servidor. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Email enviado!</h2>
          <p className="text-slate-500 text-sm mt-2">
            Se o email <strong>{email}</strong> estiver cadastrado, você receberá as instruções para redefinir sua senha.
          </p>
        </div>
        <a
          href="/login"
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao login
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Campo Email */}
      <div className="space-y-1.5">
        <label className="label" htmlFor="forgot-email">Email cadastrado</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="forgot-email"
            type="email"
            className={`input pl-10 ${emailError ? 'border-red-400 focus:ring-red-400' : ''}`}
            placeholder="seu@email.com"
            value={email}
            onChange={e => handleInputChange(e.target.value)}
            disabled={loading}
            autoComplete="email"
            autoFocus
          />
        </div>
        {emailError && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> {emailError}
          </p>
        )}
      </div>

      {/* Erro geral */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Botão Submit */}
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full justify-center py-3 text-base"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Enviando...</span>
          </>
        ) : (
          'Enviar instruções'
        )}
      </button>
    </form>
  )
}
