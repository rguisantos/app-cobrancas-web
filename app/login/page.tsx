import { Metadata } from 'next'
import LoginForm from './login-form'

export const metadata: Metadata = { title: 'Login' }

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Coluna esquerda - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-slate-900 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>
        
        {/* Decorative circles */}
        <div className="absolute -left-20 -top-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-primary-400/20 rounded-full blur-3xl" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
          {/* Logo */}
          <div className="mb-8">
            <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-5xl shadow-xl">
              🎱
            </div>
          </div>
          
          {/* Title */}
          <h1 className="text-4xl font-bold mb-4 text-center">
            App Cobranças
          </h1>
          <p className="text-xl text-white/80 mb-8 text-center max-w-md">
            Sistema completo de gestão de locações e cobranças
          </p>
          
          {/* Features */}
          <div className="space-y-4 w-full max-w-sm">
            {[
              { icon: '📊', text: 'Dashboard com métricas em tempo real' },
              { icon: '👥', text: 'Gestão de clientes e rotas' },
              { icon: '💰', text: 'Controle de cobranças e receitas' },
              { icon: '📱', text: 'Sincronização com app mobile' },
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-4 bg-white/5 backdrop-blur-sm rounded-lg p-4">
                <span className="text-2xl">{feature.icon}</span>
                <span className="text-white/90">{feature.text}</span>
              </div>
            ))}
          </div>
          
          {/* Footer */}
          <div className="absolute bottom-8 text-white/40 text-sm">
            © {new Date().getFullYear()} App Cobranças
          </div>
        </div>
      </div>
      
      {/* Coluna direita - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-3xl mb-4 shadow-lg">
              🎱
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
              App Cobranças
            </h1>
            <p className="text-slate-400 text-sm mt-1">Sistema de Gestão</p>
          </div>
          
          {/* Card do form */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Bem-vindo de volta!
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              Entre com suas credenciais para acessar o sistema
            </p>
            <LoginForm />
          </div>
          
          {/* Help text */}
          <p className="text-center text-slate-400 text-sm mt-6">
            Precisa de ajuda?{' '}
            <a href="#" className="text-primary-600 hover:text-primary-700 font-medium">
              Entre em contato
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
