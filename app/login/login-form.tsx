'use client'

import { useState, useCallback } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, Mail, Lock, AlertTriangle, Clock, ShieldCheck } from 'lucide-react'
import { z } from 'zod'

// Schema Zod de validação (espelha o schema do servidor)
const loginFormSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(1, 'Senha é obrigatória'),
})

type LoginForm = z.infer<typeof loginFormSchema>

interface FormErrors {
  email?: string
  senha?: string
}

export default function LoginForm() {
  const router = useRouter()
  const [formData, setFormData] = useState<LoginForm>({ email: '', senha: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lockoutInfo, setLockoutInfo] = useState<{ minutosRestantes: number } | null>(null)
  const [rateLimited, setRateLimited] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleInputChange = useCallback((field: keyof LoginForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
    if (error) setError('')
    if (lockoutInfo) setLockoutInfo(null)
    if (rateLimited) setRateLimited(false)
  }, [errors, error, lockoutInfo, rateLimited])

  const validateForm = useCallback((): boolean => {
    const result = loginFormSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors: FormErrors = {}
      result.error.errors.forEach(err => {
        const field = err.path[0] as keyof FormErrors
        if (!fieldErrors[field]) {
          fieldErrors[field] = err.message
        }
      })
      setErrors(fieldErrors)
      return false
    }
    setErrors({})
    return true
  }, [formData])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)
    setError('')
    setLockoutInfo(null)
    setRateLimited(false)

    try {
      // Primeiro, tentar via API direta para obter feedback detalhado
      const apiResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          senha: formData.senha,
          dispositivo: 'Web',
        }),
      })

      const apiData = await apiResponse.json()

      if (apiResponse.ok && apiData.token) {
        // Login via API bem-sucedido — agora autenticar via NextAuth para criar sessão web
        const nextAuthResult = await signIn('credentials', {
          email: formData.email,
          senha: formData.senha,
          redirect: false,
        })

        if (nextAuthResult?.error) {
          // Isso não deve acontecer se o login via API funcionou,
          // mas tratamos por segurança
          setError('Erro ao criar sessão. Tente novamente.')
        } else {
          router.push('/dashboard')
          router.refresh()
        }
      } else {
        // Login falhou — processar erro detalhado
        if (apiResponse.status === 423 && apiData.lockoutInfo) {
          // Conta bloqueada
          setLockoutInfo(apiData.lockoutInfo)
        } else if (apiResponse.status === 429) {
          // Rate limited
          setRateLimited(true)
        } else if (apiResponse.status === 401) {
          setError('Email ou senha incorretos. Verifique suas credenciais e tente novamente.')
        } else {
          setError(apiData.error || 'Erro ao fazer login. Tente novamente.')
        }
      }
    } catch {
      // Fallback: tentar via NextAuth diretamente (se API estiver offline)
      try {
        const result = await signIn('credentials', {
          email: formData.email,
          senha: formData.senha,
          redirect: false,
        })

        if (result?.error) {
          setError('Email ou senha incorretos. Verifique suas credenciais e tente novamente.')
        } else {
          router.push('/dashboard')
          router.refresh()
        }
      } catch {
        setError('Erro ao conectar com o servidor. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Campo Email */}
      <div className="space-y-1.5">
        <label className="label" htmlFor="email">Email</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="email"
            type="email"
            className={`input pl-10 ${errors.email ? 'border-red-400 focus:ring-red-400' : ''}`}
            placeholder="seu@email.com"
            value={formData.email}
            onChange={e => handleInputChange('email', e.target.value)}
            disabled={loading}
            autoComplete="email"
            autoFocus
          />
        </div>
        {errors.email && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> {errors.email}
          </p>
        )}
      </div>

      {/* Campo Senha */}
      <div className="space-y-1.5">
        <label className="label" htmlFor="senha">Senha</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="senha"
            type={showPassword ? 'text' : 'password'}
            className={`input pl-10 pr-10 ${errors.senha ? 'border-red-400 focus:ring-red-400' : ''}`}
            placeholder="••••••••"
            value={formData.senha}
            onChange={e => handleInputChange('senha', e.target.value)}
            disabled={loading}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.senha && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> {errors.senha}
          </p>
        )}
      </div>

      {/* Erro geral */}
      {error && !lockoutInfo && !rateLimited && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Feedback de conta bloqueada */}
      {lockoutInfo && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
          <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Conta temporariamente bloqueada</p>
            <p>Por segurança, sua conta foi bloqueada após muitas tentativas falhas. Tente novamente em {lockoutInfo.minutosRestantes} minutos.</p>
          </div>
        </div>
      )}

      {/* Feedback de rate limiting */}
      {rateLimited && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm text-orange-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Muitas tentativas</p>
            <p>Você fez muitas tentativas de login em pouco tempo. Aguarde alguns minutos antes de tentar novamente.</p>
          </div>
        </div>
      )}

      {/* Botão Submit */}
      <button
        type="submit"
        disabled={loading || !!lockoutInfo || rateLimited}
        className="btn-primary w-full justify-center py-3 text-base relative"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Entrando...</span>
          </>
        ) : (
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Entrar
          </span>
        )}
      </button>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white text-slate-400">ou</span>
        </div>
      </div>

      {/* Link para recuperação */}
      <p className="text-center text-sm text-slate-500">
        Esqueceu sua senha?{' '}
        <a href="/forgot-password" className="text-primary-600 hover:text-primary-700 font-medium">
          Recuperar acesso
        </a>
      </p>
    </form>
  )
}
