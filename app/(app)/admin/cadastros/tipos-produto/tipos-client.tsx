'use client'

import { Tag } from 'lucide-react'
import { AttributeCrud } from '@/components/produtos/AttributeCrud'

const config = {
  apiBase: '/api/tipos-produto',
  label: 'Tipo de Produto',
  labelPlural: 'Tipos de Produto',
  placeholder: 'Ex: Bilhar, Jukebox, Mesa...',
  icon: Tag,
  minNameLength: 2,
}

interface TipoProduto {
  id: string
  nome: string
  createdAt: string
}

export default function TiposProdutoClient({ tiposIniciais }: { tiposIniciais: TipoProduto[] }) {
  return <AttributeCrud config={config} initialItems={tiposIniciais} />
}
