'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface Cliente {
  id: string
  nomeExibicao: string
  identificador: string
  endereco: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  latitude: number
  longitude: number
  rotaId: string
  rota_nome: string
  rota_cor: string
  locacoes_ativas: number
  cobrancas_pendentes: number
  cobrancas_atrasadas: number
  valor_pendente: number
  valor_atrasado: number
  valor_recebido: number
}

interface Rota {
  id: string
  nome: string
  cor: string
  total_clientes: number
  centro_lat: number | null
  centro_lng: number | null
}

interface MapViewProps {
  clientes: Cliente[]
  rotas: Rota[]
  getRotaColor: (rotaId: string) => string
}

const DEFAULT_COLOR = '#2563EB'

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

function createColoredIcon(color: string, hasOverdue: boolean, size?: 'sm' | 'md' | 'lg') {
  const sizeMap = {
    sm: hasOverdue ? 20 : 16,
    md: hasOverdue ? 24 : 20,
    lg: hasOverdue ? 30 : 24,
  }
  const s = sizeMap[size || 'md']
  const borderWidth = hasOverdue ? 3 : 2
  const pulse = hasOverdue
    ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:${s + 14}px;height:${s + 14}px;border-radius:50%;background:${color};opacity:0.3;animation:mapPulse 2s infinite;"></div>`
    : ''
  const innerShadow = hasOverdue
    ? `box-shadow:0 0 0 2px rgba(220,38,38,0.4),0 2px 8px rgba(0,0,0,0.3);`
    : `box-shadow:0 2px 8px rgba(0,0,0,0.3);`
  const style = `
    <style>@keyframes mapPulse{0%{transform:translate(-50%,-50%) scale(1);opacity:0.3}100%{transform:translate(-50%,-50%) scale(1.5);opacity:0}}</style>
    <div style="position:relative;width:${s}px;height:${s}px;">
      ${pulse}
      <div style="background-color:${color};width:${s}px;height:${s}px;border-radius:50%;border:${borderWidth}px solid white;${innerShadow}position:relative;z-index:1;"></div>
    </div>
  `
  return L.divIcon({
    className: 'custom-marker',
    html: style,
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2],
    popupAnchor: [0, -s / 2],
  })
}

function getStatusInfo(cliente: Cliente) {
  if (cliente.cobrancas_atrasadas > 0) {
    return { label: 'ATRASADO', bg: '#DC2626', textColor: 'white' }
  }
  if (cliente.cobrancas_pendentes > 0) {
    return { label: 'PENDENTE', bg: '#D97706', textColor: 'white' }
  }
  return { label: 'EM DIA', bg: '#16A34A', textColor: 'white' }
}

export default function MapView({ clientes, rotas, getRotaColor }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.LayerGroup | null>(null)

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const map = L.map(mapRef.current, {
      center: [-20.4435, -54.6478], // Campo Grande, MS
      zoom: 11,
      zoomControl: true,
      attributionControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map)

    markersRef.current = L.layerGroup().addTo(map)
    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
      markersRef.current = null
    }
  }, [])

  // Update markers when data changes
  useEffect(() => {
    const map = mapInstanceRef.current
    const markers = markersRef.current
    if (!map || !markers) return

    // Clear existing markers
    markers.clearLayers()

    if (clientes.length === 0) return

    const bounds: L.LatLngBounds = L.latLngBounds([])

    clientes.forEach(cliente => {
      const color = cliente.rota_cor || getRotaColor(cliente.rotaId) || DEFAULT_COLOR
      const hasOverdue = cliente.cobrancas_atrasadas > 0
      const icon = createColoredIcon(color, hasOverdue)
      const statusInfo = getStatusInfo(cliente)

      const marker = L.marker([cliente.latitude, cliente.longitude], { icon })
      markers.addLayer(marker)

      // Financial summary row
      const financeRows: string[] = []
      if (cliente.valor_atrasado > 0) {
        financeRows.push(`
          <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;">
            <span style="color:#DC2626;font-size:11px;font-weight:500;">Atrasado</span>
            <span style="color:#DC2626;font-size:12px;font-weight:700;">${formatCurrency(cliente.valor_atrasado)}</span>
          </div>
        `)
      }
      if (cliente.valor_pendente > 0) {
        financeRows.push(`
          <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;">
            <span style="color:#D97706;font-size:11px;font-weight:500;">Pendente</span>
            <span style="color:#D97706;font-size:12px;font-weight:700;">${formatCurrency(cliente.valor_pendente)}</span>
          </div>
        `)
      }
      if (cliente.valor_recebido > 0) {
        financeRows.push(`
          <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;">
            <span style="color:#16A34A;font-size:11px;font-weight:500;">Recebido</span>
            <span style="color:#16A34A;font-size:12px;font-weight:700;">${formatCurrency(cliente.valor_recebido)}</span>
          </div>
        `)
      }

      const financeSection = financeRows.length > 0
        ? `<div style="border-top:1px solid #e2e8f0;margin-top:8px;padding-top:6px;">${financeRows.join('')}</div>`
        : ''

      const popupContent = `
        <div style="min-width:240px;max-width:300px;font-family:system-ui,-apple-system,sans-serif;">
          <div style="margin-bottom:8px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
              <strong style="font-size:14px;color:#0f172a;">${cliente.nomeExibicao}</strong>
              <span style="background:${statusInfo.bg};color:${statusInfo.textColor};padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:600;letter-spacing:0.025em;">${statusInfo.label}</span>
            </div>
            ${cliente.identificador ? `<span style="color:#94a3b8;font-size:11px;font-family:monospace;">#${cliente.identificador}</span>` : ''}
          </div>

          ${cliente.endereco ? `<div style="color:#64748b;font-size:12px;margin-bottom:3px;">${cliente.endereco}</div>` : ''}
          ${cliente.cidade ? `<div style="color:#64748b;font-size:12px;margin-bottom:3px;">${cliente.cidade}${cliente.estado ? ` - ${cliente.estado}` : ''}</div>` : ''}
          
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <div style="width:10px;height:10px;border-radius:50%;background:${color};border:1.5px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div>
            <span style="color:#2563EB;font-size:12px;font-weight:500;">Rota: ${cliente.rota_nome}</span>
          </div>

          <div style="border-top:1px solid #e2e8f0;padding-top:6px;display:flex;gap:12px;font-size:12px;">
            <div style="text-align:center;">
              <div style="font-weight:700;color:#0f172a;font-size:14px;">${cliente.locacoes_ativas}</div>
              <div style="color:#64748b;font-size:10px;">Locacoes</div>
            </div>
            ${cliente.cobrancas_pendentes > 0 ? `
            <div style="text-align:center;">
              <div style="font-weight:700;color:#D97706;font-size:14px;">${cliente.cobrancas_pendentes}</div>
              <div style="color:#64748b;font-size:10px;">Pendentes</div>
            </div>
            ` : ''}
            ${hasOverdue ? `
            <div style="text-align:center;">
              <div style="font-weight:700;color:#DC2626;font-size:14px;">${cliente.cobrancas_atrasadas}</div>
              <div style="color:#64748b;font-size:10px;">Atrasadas</div>
            </div>
            ` : ''}
          </div>

          ${financeSection}

          <div style="margin-top:10px;border-top:1px solid #e2e8f0;padding-top:8px;">
            <a href="/clientes/${cliente.id}" style="color:#2563EB;font-size:12px;text-decoration:none;font-weight:600;display:flex;align-items:center;gap:4px;">
              Ver detalhes do cliente
              <span style="font-size:14px;">&#8594;</span>
            </a>
          </div>
        </div>
      `

      marker.bindPopup(popupContent, {
        maxWidth: 320,
        minWidth: 240,
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
