import Header from '@/components/layout/header'
import MetasClient from './metas-client'

export default function MetasPage() {
  return (
    <>
      <Header
        title="Painel de Metas"
        subtitle="Defina metas de arrecadação e acompanhe o progresso"
      />
      <MetasClient />
    </>
  )
}
