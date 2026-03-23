import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Header from '@/components/layout/header'
import { StatusClienteBadge } from '@/components/ui/badge'
import EmptyState from '@/components/ui/empty-state'
import { ArrowLeft, Edit, Users, MapPin } from 'lucide-react'

export const metadata: Metadata = { title: 'Detalhes da Rota' }

export default async function RotaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()

  const rota = await prisma.rota.findFirst({
    where: { id, deletedAt: null },
    include: {
      clientes: {
        where: { deletedAt: null },
        select: { id: true, nomeExibicao: true, identificador: true, status: true, cidade: true },
        orderBy: { nomeExibicao: 'asc' }
      }
    }
  })

  if (!rota) notFound()

  const podeEditar = session?.user.tipoPermissao === 'Administrador'
  const clientesAtivos = rota.clientes.filter(c => c.status === 'Ativo')

  return (
    <div>
      <Header
        title={rota.descricao}
        subtitle={`${rota.clientes.length} cliente${rota.clientes.length !== 1 ? 's' : ''} nesta rota`}
        actions={
          <div className="flex gap-2">
            <Link href="/admin/rotas" className="btn-secondary">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Clientes da Rota
              </h2>
              <StatusClienteBadge status={rota.status} />
            </div>

            {rota.clientes.length === 0 ? (
              <EmptyState 
                icon="👥" 
                title="Nenhum cliente nesta rota" 
                description="Os clientes serão listados aqui quando forem cadastrados com esta rota."
              />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left font-medium text-slate-500 pb-2">Código</th>
                    <th className="text-left font-medium text-slate-500 pb-2">Nome</th>
                    <th className="text-left font-medium text-slate-500 pb-2">Cidade</th>
                    <th className="text-center font-medium text-slate-500 pb-2">Status</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rota.clientes.map(cliente => (
                    <tr key={cliente.id} className="hover:bg-slate-50">
                      <td className="py-2 font-mono text-xs text-slate-500">{cliente.identificador}</td>
                      <td className="py-2 font-medium">{cliente.nomeExibicao}</td>
                      <td className="py-2 text-slate-600">{cliente.cidade}</td>
                      <td className="py-2 text-center">
                        <StatusClienteBadge status={cliente.status} />
                      </td>
                      <td className="py-2">
                        <Link 
                          href={`/clientes/${cliente.id}`}
                          className="text-primary-600 hover:text-primary-800 text-xs font-medium"
                        >
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Resumo */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-4">📊 Resumo</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total de clientes</span>
                <span className="font-semibold">{rota.clientes.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Clientes ativos</span>
                <span className="font-semibold text-green-600">{clientesAtivos.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Clientes inativos</span>
                <span className="font-semibold text-slate-400">{rota.clientes.length - clientesAtivos.length}</span>
              </div>
            </div>
          </div>

          {/* Informações */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Informações
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <StatusClienteBadge status={rota.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Criada em</span>
                <span>{new Date(rota.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          </div>

          {/* Ações */}
          {podeEditar && (
            <div className="card p-5 bg-slate-50">
              <h3 className="font-semibold text-slate-900 mb-4">⚙️ Ações</h3>
              <div className="space-y-2 text-sm">
                <p className="text-slate-600">
                  Para editar ou excluir esta rota, utilize a API diretamente ou entre em contato com o administrador do sistema.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
