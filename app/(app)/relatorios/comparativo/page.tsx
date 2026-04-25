import Header from '@/components/layout/header'
import ComparativoClient from './comparativo-client'

export default function ComparativoPage() {
  return (
    <>
      <Header
        title="Relatório Comparativo"
        subtitle="Compare períodos e analise tendências"
      />
      <ComparativoClient />
    </>
  )
}
