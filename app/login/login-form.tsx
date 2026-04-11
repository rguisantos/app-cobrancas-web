'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, Mail, Lock } from 'lucide-react'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email,
      senha,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Email ou senha incorretos. Verifique suas credenciais e tente novamente.')
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Campo Email */}
      <div className="space-y-1.5">
        <label className="label">Email</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="email"
            className="input pl-10"
            placeholder="seu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
            disabled={loading}
          />
        </div>
      </div>

      {/* Campo Senha */}
      <div className="space-y-1.5">
        <label className="label">Senha</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type={showPassword ? 'text' : 'password'}
            className="input pl-10 pr-10"
            placeholder="••••••••"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            required
            disabled={loading}
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
      </div>

      {/* Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <span className="flex-shrink-0 mt-0.5">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Botão Submit */}
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full justify-center py-3 text-base relative"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Entrando...</span>
          </>
        ) : (
          'Entrar'
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
        <a href="#" className="text-primary-600 hover:text-primary-700 font-medium">
          Recuperar acesso
        </a>
      </p>
    </form>
  )
}
