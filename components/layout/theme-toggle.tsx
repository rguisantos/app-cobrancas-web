'use client'

import { useTheme } from '@/components/providers/theme-provider'
import { Sun, Moon, Monitor } from 'lucide-react'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  const iconMap = {
    light: Sun,
    dark: Moon,
    system: Monitor,
  }

  const labelMap = {
    light: 'Modo claro',
    dark: 'Modo escuro',
    system: 'Seguir sistema',
  }

  const Icon = iconMap[theme]

  return (
    <button
      onClick={cycleTheme}
      className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors group w-full
                 dark:text-slate-400 dark:hover:text-primary-400 dark:hover:bg-slate-700/50"
      aria-label={labelMap[theme]}
      title={labelMap[theme]}
    >
      <Icon className="w-4 h-4" />
      <span>{labelMap[theme]}</span>
    </button>
  )
}
