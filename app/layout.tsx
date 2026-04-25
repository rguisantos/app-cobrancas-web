// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import AuthSessionProvider from '@/components/providers/session-provider'
import ThemeProvider from '@/components/providers/theme-provider'

export const metadata: Metadata = {
  title: { template: '%s | App Cobranças', default: 'App Cobranças' },
  description: 'Sistema de gestão de locações e cobranças',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Inline script to prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('cobrancas-theme') || 'system';
                  var resolved = theme;
                  if (theme === 'system') {
                    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  if (resolved === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch(e) {}
              })()
            `,
          }}
        />
      </head>
      <body>
        <AuthProvider>
          <AuthSessionProvider>{children}</AuthSessionProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

// Wrapper to provide ThemeProvider
function AuthProvider({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}
