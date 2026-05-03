'use client'

import { Menu } from 'lucide-react'
import GlobalSearch from '@/components/layout/global-search'
import NotificationBell from '@/components/layout/notification-bell'

export default function TopBar() {
  const toggleSidebar = () => {
    window.dispatchEvent(new CustomEvent('toggle-sidebar'))
  }

  return (
    <div className="fixed top-0 left-0 right-0 lg:left-64 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/60 dark:bg-slate-900/80 dark:border-slate-700/60">
      <div className="flex items-center justify-between h-14 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Left: Mobile menu button */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Center: Global Search on mobile, left on desktop */}
        <div className="flex-1 flex justify-center lg:justify-start">
          <GlobalSearch />
        </div>

        {/* Right: Notification Bell */}
        <div className="flex items-center gap-2">
          <NotificationBell />
        </div>
      </div>
    </div>
  )
}
