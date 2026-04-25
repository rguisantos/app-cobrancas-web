'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface Cliente {
  id: string
  nomeExibicao: string
  endereco: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  latitude: number
  longitude: number
  rotaId: string
  rota_nome: string
  locacoes_ativas: number
  cobrancas_pendentes: number
  cobrancas_atrasadas: number
}

interface Rota {
  id: string
  nome: string
  total_clientes: number
  centro_lat: number | null
  centro_lng: number | null
}

interface MapViewProps {
  clientes: Cliente[]
  rotas: Rota[]
  getRotaColor: (rotaId: string) => string
}

function createColoredIcon(color: string, hasOverdue: boolean) {
  const size = hasOverdue ? 28 : 22
  const borderWidth = hasOverdue ? 3 : 2
  const pulse = hasOverdue
    ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:${size + 12}px;height:${size + 12}px;border-radius:50%;background:${color};opacity:0.3;animation:pulse 2s infinite;"></div>`
    : ''
  const style = `
    <style>@keyframes pulse{0%{transform:translate(-50%,-50%) scale(1);opacity:0.3}100%{transform:translate(-50%,-50%) scale(1.5);opacity:0}}</style>
    <div style="position:relative;width:${size}px;height:${size}px;">
      ${pulse}
      <div style="background-color:${color};width:${size}px;height:${size}px;border-radius:50%;border:${borderWidth}px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);position:relative;z-index:1;"></div>
    </div>
  `
  return L.divIcon({
    className: 'custom-marker',
    html: style,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

export default function MapView({ clientes, rotas, getRotaColor }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const map = L.map(mapRef.current, {
      center: [-14.235, -51.925],
      zoom: 4,
      zoomControl: true,
      attributionControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map)

    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || clientes.length === 0) return

    // Clear existing markers
    map.eachLayer(layer => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer)
      }
    })

    const bounds: L.LatLngBounds = L.latLngBounds([])

    clientes.forEach(cliente => {
      const color = getRotaColor(cliente.rotaId)
      const hasOverdue = cliente.cobrancas_atrasadas > 0
      const icon = createColoredIcon(color, hasOverdue)

      const marker = L.marker([cliente.latitude, cliente.longitude], { icon }).addTo(map)

      const statusBadge = hasOverdue
        ? '<span style="background:#DC2626;color:white;padding:1px 6px;border-radius:9999px;font-size:10px;font-weight:600;">ATRASADO</span>'
        : cliente.cobrancas_pendentes > 0
        ? '<span style="background:#D97706;color:white;padding:1px 6px;border-radius:9999px;font-size:10px;font-weight:600;">PENDENTE</span>'
        : '<span style="background:#16A34A;color:white;padding:1px 6px;border-radius:9999px;font-size:10px;font-weight:600;">EM DIA</span>'

      const popupContent = `
        <div style="min-width:220px;font-family:system-ui,sans-serif;">
          <div style="margin-bottom:8px;">
            <strong style="font-size:14px;">${cliente.nomeExibicao}</strong>
            <div style="margin-top:2px;">${statusBadge}</div>
          </div>
          ${cliente.endereco ? `<div style="color:#64748b;font-size:12px;margin-bottom:4px;">📍 ${cliente.endereco}</div>` : ''}
          ${cliente.cidade ? `<div style="color:#64748b;font-size:12px;margin-bottom:4px;">🏙️ ${cliente.cidade}${cliente.estado ? ` - ${cliente.estado}` : ''}</div>` : ''}
          <div style="color:#2563EB;font-size:12px;margin-bottom:6px;">🗺️ Rota: ${cliente.rota_nome}</div>
          <div style="border-top:1px solid #e2e8f0;padding-top:6px;margin-top:6px;display:flex;gap:12px;font-size:12px;">
            <div><strong>${cliente.locacoes_ativas}</strong> locações</div>
            <div><strong>${cliente.cobrancas_pendentes}</strong> pendentes</div>
            ${hasOverdue ? `<div style="color:#DC2626;"><strong>${cliente.cobrancas_atrasadas}</strong> atrasadas</div>` : ''}
          </div>
          <div style="margin-top:8px;">
            <a href="/clientes/${cliente.id}" style="color:#2563EB;font-size:12px;text-decoration:none;font-weight:500;">Ver detalhes →</a>
          </div>
        </div>
      `

      marker.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'custom-popup',
      })

      bounds.extend([cliente.latitude, cliente.longitude])
    })

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
    }
  }, [clientes, rotas, getRotaColor])

  return <div ref={mapRef} className="h-full w-full" />
}
