import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import Sidebar from '@/components/layout/sidebar'
import TopBar from '@/components/layout/top-bar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <main className="flex-1 lg:ml-64 overflow-y-auto">
        <TopBar />
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto pt-20 lg:pt-20">
          {children}
        </div>
      </main>
    </div>
  )
}
