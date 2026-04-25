'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

const STORAGE_KEY = 'cobrancas-theme'

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {}
  return 'system'
}

function applyThemeClass(t: Theme): 'light' | 'dark' {
  const resolved = t === 'system' ? getSystemTheme() : t
  const root = document.documentElement
  if (resolved === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
  return resolved
}

// Lazy initializer - reads from localStorage only on client
function initTheme(): Theme {
  return getStoredTheme()
}

function initResolvedTheme(): 'light' | 'dark' {
  const stored = getStoredTheme()
  return stored === 'system' ? getSystemTheme() : stored
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [theme, setThemeRaw] = useState<Theme>(initTheme)
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(initResolvedTheme)

  const setTheme = useCallback((t: Theme) => {
    setThemeRaw(t)
    try {
      localStorage.setItem(STORAGE_KEY, t)
    } catch {}
    const resolved = applyThemeClass(t)
    setResolvedTheme(resolved)
  }, [])

  // Mount effect - only sets mounted flag
  useEffect(() => {
    // Apply theme class on mount (in case inline script didn't run)
    const stored = getStoredTheme()
    applyThemeClass(stored)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setMounted(true) in mount-only effect is valid
    setMounted(true)
  }, [])

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      const currentStored = getStoredTheme()
      if (currentStored === 'system') {
        const resolved = applyThemeClass('system')
        setResolvedTheme(resolved)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [mounted])

  // Prevent flash of wrong theme before mount
  if (!mounted) {
    return (
      <ThemeContext.Provider value={{ theme: 'system', resolvedTheme: 'light', setTheme: () => {} }}>
        {children}
      </ThemeContext.Provider>
    )
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
