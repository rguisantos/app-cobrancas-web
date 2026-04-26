'use client'

import { Ruler } from 'lucide-react'
import { AttributeCrud } from '@/components/produtos/AttributeCrud'

const config = {
  apiBase: '/api/tamanhos-produto',
  label: 'Tamanho de Produto',
  labelPlural: 'Tamanhos de Produto',
  placeholder: 'Ex: 2,00 / 2,20 / Grande / Média...',
  icon: Ruler,
  minNameLength: 1,
}

interface TamanhoProduto {
  id: string
  nome: string
  createdAt: string
}

export default function TamanhosProdutoClient({ tamanhosIniciais }: { tamanhosIniciais: TamanhoProduto[] }) {
  return <AttributeCrud config={config} initialItems={tamanhosIniciais} />
}
