import Header from '@/components/layout/header'
import AuditoriaClient from './auditoria-client'

export default function AuditoriaPage() {
  return (
    <>
      <Header
        title="Auditoria de Alterações"
        subtitle="Histórico detalhado de todas as alterações no sistema"
      />
      <AuditoriaClient />
    </>
  )
}
