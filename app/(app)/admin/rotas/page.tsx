import { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Header from '@/components/layout/header'
import { StatusClienteBadge } from '@/components/ui/badge'
import EmptyState from '@/components/ui/empty-state'
import { MapPin, Users } from 'lucide-react'

export const metadata: Metadata = { title: 'Rotas' }

export default async function RotasPage() {
  const session = await getSession()

  const rotas = await prisma.rota.findMany({
    where: { deletedAt: null },
    include: {
      _count: {
        select: { clientes: { where: { deletedAt: null } } }
      }
    },
    orderBy: { descricao: 'asc' }
  })

  const podeEditar = session?.user.tipoPermissao === 'Administrador'

  return (
    <div>
      <Header
        title="Rotas"
        subtitle={`${rotas.length} rota${rotas.length !== 1 ? 's' : ''} cadastrada${rotas.length !== 1 ? 's' : ''}`}
        actions={podeEditar && <Link href="/admin/rotas/novo" className="btn-primary">+ Nova Rota</Link>}
      />

      {rotas.length === 0 ? (
        <div className="card">
          <EmptyState 
            icon="🗺️" 
            title="Nenhuma rota cadastrada" 
            description="As rotas são usadas para organizar clientes por região."
            action={podeEditar && <Link href="/admin/rotas/novo" className="btn-primary">Criar primeira rota</Link>}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rotas.map(rota => (
            <Link
              key={rota.id}
              href={`/admin/rotas/${rota.id}`}
              className="card p-5 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                    <MapPin className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 group-hover:text-primary-600 transition-colors">
                      {rota.descricao}
                    </h3>
                    <StatusClienteBadge status={rota.status} />
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex items-center gap-4 text-sm text-slate-500">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{rota._count.clientes} cliente{rota._count.clientes !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
