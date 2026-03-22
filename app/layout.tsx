// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import AuthSessionProvider from '@/components/providers/session-provider'

export const metadata: Metadata = {
  title: { template: '%s | App Cobranças', default: 'App Cobranças' },
  description: 'Sistema de gestão de locações e cobranças',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  )
}
