'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, Loader2, AlertTriangle, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { z } from 'zod'

const resetPasswordSchema = z.object({
  novaSenha: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
    .regex(/[!@#$%^&*()_+\-=\[\]{}|;:',.<>?\/]/, 'Senha deve conter pelo menos um caractere especial'),
  confirmarSenha: z.string().min(1, 'Confirmação é obrigatória'),
}).refine(data => data.novaSenha === data.confirmarSenha, {
  message: 'As senhas não coincidem',
  path: ['confirmarSenha'],
})

interface FormErrors {
  novaSenha?: string
  confirmarSenha?: string
}

// Requisitos de senha para indicador visual
const SENHA_REQUISITOS = [
  { label: 'Mínimo 8 caracteres', test: (s: string) => s.length >= 8 },
  { label: 'Uma letra maiúscula', test: (s: string) => /[A-Z]/.test(s) },
  { label: 'Uma letra minúscula', test: (s: string) => /[a-z]/.test(s) },
  { label: 'Um número', test: (s: string) => /[0-9]/.test(s) },
  { label: 'Um caractere especial', test: (s: string) => /[!@#$%^&*()_+\-=\[\]{}|;:',.<>?\/]/.test(s) },
]

export default function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [invalidToken, setInvalidToken] = useState(false)

  useEffect(() => {
    if (!token) {
      setInvalidToken(true)
    }
  }, [token])

  const handleNovaSenhaChange = useCallback((value: string) => {
    setNovaSenha(value)
    if (errors.novaSenha) setErrors(prev => ({ ...prev, novaSenha: undefined }))
    if (error) setError('')
  }, [errors.novaSenha, error])

  const handleConfirmarChange = useCallback((value: string) => {
    setConfirmarSenha(value)
    if (errors.confirmarSenha) setErrors(prev => ({ ...prev, confirmarSenha: undefined }))
    if (error) setError('')
  }, [errors.confirmarSenha, error])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const result = resetPasswordSchema.safeParse({ novaSenha, confirmarSenha })
    if (!result.success) {
      const fieldErrors: FormErrors = {}
      result.error.errors.forEach(err => {
        const field = err.path[0] as keyof FormErrors
        if (!fieldErrors[field]) {
          fieldErrors[field] = err.message
        }
      })
      setErrors(fieldErrors)
      return
    }

    if (!token) {
      setError('Token de recuperação não encontrado. Solicite uma nova recuperação.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, novaSenha, confirmarSenha }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erro ao redefinir senha')
        if (data.details) {
          setError(`${data.error}: ${data.details.join(', ')}`)
        }
        return
      }

      setSuccess(true)
      // Redirecionar para login após 3 segundos
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch {
      setError('Erro ao conectar com o servidor. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Token inválido ou ausente
  if (invalidToken) {
    return (
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-100">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Link inválido</h2>
          <p className="text-slate-500 text-sm mt-2">
            Este link de recuperação é inválido ou expirou. Solicite uma nova recuperação de senha.
          </p>
        </div>
        <a
          href="/forgot-password"
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium text-sm"
        >
          Solicitar nova recuperação
        </a>
      </div>
    )
  }

  // Sucesso
  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Senha redefinida!</h2>
          <p className="text-slate-500 text-sm mt-2">
            Sua senha foi alterada com sucesso. Redirecionando para o login...
          </p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Indicador de força da senha */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Requisitos da senha</p>
        <div className="grid grid-cols-2 gap-1">
          {SENHA_REQUISITOS.map((req, i) => {
            const met = req.test(novaSenha)
            return (
              <div key={i} className={`flex items-center gap-1 text-xs ${met ? 'text-green-600' : 'text-slate-400'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${met ? 'bg-green-500' : 'bg-slate-300'}`} />
                {req.label}
              </div>
            )
          })}
        </div>
      </div>

      {/* Campo Nova Senha */}
      <div className="space-y-1.5">
        <label className="label" htmlFor="nova-senha">Nova Senha</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="nova-senha"
            type={showPassword ? 'text' : 'password'}
            className={`input pl-10 pr-10 ${errors.novaSenha ? 'border-red-400 focus:ring-red-400' : ''}`}
            placeholder="Nova senha forte"
            value={novaSenha}
            onChange={e => handleNovaSenhaChange(e.target.value)}
            disabled={loading}
            autoComplete="new-password"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.novaSenha && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> {errors.novaSenha}
          </p>
        )}
      </div>

      {/* Campo Confirmar Senha */}
      <div className="space-y-1.5">
        <label className="label" htmlFor="confirmar-senha">Confirmar Nova Senha</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="confirmar-senha"
            type={showConfirm ? 'text' : 'password'}
            className={`input pl-10 pr-10 ${errors.confirmarSenha ? 'border-red-400 focus:ring-red-400' : ''}`}
            placeholder="Confirme a nova senha"
            value={confirmarSenha}
            onChange={e => handleConfirmarChange(e.target.value)}
            disabled={loading}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            tabIndex={-1}
          >
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.confirmarSenha && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> {errors.confirmarSenha}
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
            <span>Redefinindo...</span>
          </>
        ) : (
          'Redefinir Senha'
        )}
      </button>
    </form>
  )
}
