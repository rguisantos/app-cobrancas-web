export default function Loading({ text = 'Carregando...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <p className="text-sm text-slate-500">{text}</p>
      </div>
    </div>
  )
}

export function PageLoading() {
  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="text-4xl">🎱</div>
        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">App Cobranças</p>
      </div>
    </div>
  )
}
