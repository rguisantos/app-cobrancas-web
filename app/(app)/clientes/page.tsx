import { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Header from '@/components/layout/header'
import { ClientesClient } from './clientes-client'

export const metadata: Metadata = { title: 'Clientes' }

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; rotaId?: string; status?: string; page?: string }>
}) {
  const params = await searchParams
  const session = await getSession()
  const page    = Number(params.page || 1)
  const limit   = 20

  const where: any = { deletedAt: null }
  if (params.busca) {
    where.OR = [
      { nomeExibicao:     { contains: params.busca, mode: 'insensitive' } },
      { identificador:    { contains: params.busca, mode: 'insensitive' } },
      { telefonePrincipal:{ contains: params.busca } },
    ]
  }
  if (params.rotaId) where.rotaId = params.rotaId
  if (params.status) where.status  = params.status

  const [clientes, total, rotas] = await Promise.all([
    prisma.cliente.findMany({
      where,
      include: { rota: { select: { descricao: true } } },
      orderBy: { nomeExibicao: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.cliente.count({ where }),
    prisma.rota.findMany({ where: { status: 'Ativo', deletedAt: null }, orderBy: { descricao: 'asc' } }),
  ])

  const podeEditar = session?.user.permissoesWeb?.todosCadastros

  // Preparar dados para o cliente
  const clientesFormatados = clientes.map(c => ({
    id: c.id,
    identificador: c.identificador,
    nomeExibicao: c.nomeExibicao,
    telefonePrincipal: c.telefonePrincipal,
    cidade: c.cidade,
    estado: c.estado,
    rotaDescricao: c.rota?.descricao,
    status: c.status,
  }))

  const rotasFormatadas = rotas.map(r => ({
    id: r.id,
    descricao: r.descricao,
  }))

  return (
    <div>
      <Header
        title="Clientes"
        subtitle={`${total} cliente${total !== 1 ? 's' : ''} cadastrado${total !== 1 ? 's' : ''}`}
        actions={
          podeEditar && (
            <Link href="/clientes/novo" className="btn-primary text-sm">
              + Novo Cliente
            </Link>
          )
        }
      />

      <ClientesClient
        clientes={clientesFormatados}
        total={total}
        page={page}
        limit={limit}
        rotas={rotasFormatadas}
        podeEditar={podeEditar || false}
        buscaFilter={params.busca}
        rotaIdFilter={params.rotaId}
        statusFilter={params.status}
      />
    </div>
  )
}
