import { Metadata } from 'next'
import Header from '@/components/layout/header'
import MapaClient from './mapa-client'

export const metadata: Metadata = {
  title: 'Mapa de Rotas',
  description: 'Visualize clientes e rotas no mapa interativo com dados de cobranças em tempo real',
}

export default function MapaPage() {
  return (
    <>
      <Header
        title="Mapa de Rotas"
        subtitle="Visualize clientes, rotas e cobranças no mapa interativo"
      />
      <MapaClient />
    </>
  )
}
