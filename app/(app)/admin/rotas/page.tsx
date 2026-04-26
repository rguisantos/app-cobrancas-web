import { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Header from '@/components/layout/header'
import { StatusRotaBadge } from '@/components/ui/badge'
import EmptyState from '@/components/ui/empty-state'
import { MapPin, Users, Edit, UserCheck } from 'lucide-react'

export const metadata: Metadata = { title: 'Rotas' }

export default async function RotasPage() {
  const session = await getSession()

  const rotas = await prisma.rota.findMany({
    where: { deletedAt: null },
    include: {
      _count: {
        select: { 
          clientes: { where: { deletedAt: null } },
          usuarioRotas: true,
        }
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
        actions={podeEditar && (
          <Link href="/admin/rotas/novo" className="btn-primary">
            <MapPin className="w-4 h-4" />
            <span className="hidden sm:inline">Nova Rota</span>
          </Link>
        )}
      />

      {rotas.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <EmptyState 
            icon="🗺️" 
            title="Nenhuma rota cadastrada" 
            description="As rotas são usadas para organizar clientes por região."
            action={podeEditar && (
              <Link href="/admin/rotas/novo" className="btn-primary">
                Criar primeira rota
              </Link>
            )}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rotas.map(rota => (
            <Link
              key={rota.id}
              href={`/admin/rotas/${rota.id}`}
              className="group bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md hover:border-blue-300 transition-all"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm shadow-blue-500/30 group-hover:shadow-md transition-shadow">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {rota.descricao}
                      </h3>
                      <StatusRotaBadge status={rota.status} />
                    </div>
                  </div>
                  {podeEditar && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="p-2 rounded-lg bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600">
                        <Edit className="w-4 h-4" />
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Users className="w-4 h-4" />
                    <span>
                      <strong className="text-slate-900">{rota._count.clientes}</strong> cliente{rota._count.clientes !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {rota._count.usuarioRotas > 0 && (
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <UserCheck className="w-4 h-4" />
                      <span>
                        <strong className="text-slate-900">{rota._count.usuarioRotas}</strong> cobrador{rota._count.usuarioRotas !== 1 ? 'es' : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
