import Header from '@/components/layout/header'
import AgendaClient from './agenda-client'

export default function AgendaPage() {
  return (
    <>
      <Header
        title="Agenda"
        subtitle="Calendário de vencimentos, recebimentos e manutenções"
      />
      <AgendaClient />
    </>
  )
}
