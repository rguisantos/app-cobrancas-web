'use client'

import { useParams } from 'next/navigation'
import { ProdutoForm } from '@/components/produtos/ProdutoForm'

export default function EditarProdutoPage() {
  const params = useParams()
  const id = params.id as string

  return <ProdutoForm mode="editar" produtoId={id} />
}
