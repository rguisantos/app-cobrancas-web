import Header from '@/components/layout/header'
import EmailClient from './email-client'

export default function EmailPage() {
  return (
    <>
      <Header
        title="Configuração de Email"
        subtitle="Configure o envio de notificações por email"
      />
      <EmailClient />
    </>
  )
}
