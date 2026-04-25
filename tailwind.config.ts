import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        success: { 500: '#22C55E', 600: '#16A34A' },
        warning: { 500: '#F59E0B', 600: '#D97706' },
        danger:  { 500: '#EF4444', 600: '#DC2626' },
      },
    },
  },
  plugins: [],
}

export default config
