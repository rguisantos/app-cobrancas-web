import Header from '@/components/layout/header'
import MapaClient from './mapa-client'

export default function MapaPage() {
  return (
    <>
      <Header
        title="Mapa de Rotas"
        subtitle="Visualize clientes e rotas no mapa"
      />
      <MapaClient />
    </>
  )
}
