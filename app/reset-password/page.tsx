import { Metadata } from 'next'
import ResetPasswordForm from './reset-password-form'

export const metadata: Metadata = { title: 'Redefinir Senha' }

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-100 text-2xl mb-4">
              🔐
            </div>
            <h1 className="text-xl font-semibold text-slate-900">
              Redefinir Senha
            </h1>
            <p className="text-slate-500 text-sm mt-2">
              Crie uma nova senha forte para sua conta.
            </p>
          </div>
          <ResetPasswordForm />
        </div>

        {/* Link para login */}
        <p className="text-center text-slate-400 text-sm mt-6">
          <a href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Voltar ao login
          </a>
        </p>
      </div>
    </div>
  )
}
