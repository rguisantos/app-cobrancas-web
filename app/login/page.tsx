import { Metadata } from 'next'
import LoginForm from './login-form'

export const metadata: Metadata = { title: 'Login' }

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 text-3xl mb-4">🎱</div>
          <h1 className="text-2xl font-bold text-white">App Cobranças</h1>
          <p className="text-slate-400 text-sm mt-1">Sistema de Gestão de Locações</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Entrar na sua conta</h2>
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
