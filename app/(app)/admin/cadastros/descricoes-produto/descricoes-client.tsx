'use client'

import { FileText } from 'lucide-react'
import { AttributeCrud } from '@/components/produtos/AttributeCrud'

const config = {
  apiBase: '/api/descricoes-produto',
  label: 'Descrição de Produto',
  labelPlural: 'Descrições de Produto',
  placeholder: 'Ex: Azul, Branco, Preto...',
  icon: FileText,
  minNameLength: 2,
}

interface DescricaoProduto {
  id: string
  nome: string
  createdAt: string
}

export default function DescricoesProdutoClient({ descricoesIniciais }: { descricoesIniciais: DescricaoProduto[] }) {
  return <AttributeCrud config={config} initialItems={descricoesIniciais} />
}
