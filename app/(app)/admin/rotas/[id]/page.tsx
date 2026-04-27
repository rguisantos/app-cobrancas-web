import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Header from '@/components/layout/header'
import { StatusRotaBadge } from '@/components/ui/badge'
import EmptyState from '@/components/ui/empty-state'
import { ArrowLeft, Edit, Users, MapPin, DollarSign, Package, UserCheck, Clock, TrendingUp, Palette, Tag, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import GerenciarCobradores from './gerenciar-cobradores'

export const metadata: Metadata = { title: 'Detalhes da Rota' }

export default async function RotaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()

  const rota = await prisma.rota.findFirst({
    where: { id, deletedAt: null },
    include: {
      clientes: {
        where: { deletedAt: null },
        select: {
          id: true,
          nomeExibicao: true,
          identificador: true,
          status: true,
          cidade: true,
          locacoes: {
            where: { status: 'Ativa' },
            select: { id: true, precoFicha: true },
          },
        },
        orderBy: { nomeExibicao: 'asc' },
      },
      usuarioRotas: {
        include: {
          usuario: {
            select: { id: true, nome: true, email: true, tipoPermissao: true },
          },
        },
      },
      _count: {
        select: {
          clientes: { where: { deletedAt: null } },
        },
      },
    },
  })

  if (!rota) notFound()

  // Buscar administradores (têm acesso total a todas as rotas)
  const adminUsers = await prisma.usuario.findMany({
    where: {
      deletedAt: null,
      status: 'Ativo',
      tipoPermissao: 'Administrador',
    },
    select: { id: true, nome: true, email: true, tipoPermissao: true },
  })

  // Usuários com acesso controlado — usar dados da junction table UsuarioRota
  const usuariosControlados = rota.usuarioRotas
    .filter(ur => ur.usuario.tipoPermissao === 'AcessoControlado')
    .map(ur => ur.usuario)

  // Combinar: admins + controlados (sem duplicatas)
  const adminIds = new Set(adminUsers.map(u => u.id))
  const usuariosComAcesso = [
    ...adminUsers,
    ...usuariosControlados.filter(u => !adminIds.has(u.id)),
  ]

  // Buscar todos os usuários AcessoControlado ativos para o select
  const todosControlados = await prisma.usuario.findMany({
    where: {
      deletedAt: null,
      status: 'Ativo',
      tipoPermissao: 'AcessoControlado',
    },
    select: { id: true, nome: true, email: true, tipoPermissao: true },
  })

  const podeEditar = session?.user.tipoPermissao === 'Administrador'
  const clientesAtivos = rota.clientes.filter(c => c.status === 'Ativo')

  // Calcular métricas
  const totalLocacoesAtivas = rota.clientes.reduce((acc, c) => acc + c.locacoes.length, 0)
  const valorTotalLocacoes = rota.clientes.reduce((acc, c) =>
    acc + c.locacoes.reduce((sum, l) => sum + (l.precoFicha || 0), 0), 0
  )

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

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{rota.clientes.length}</p>
              <p className="text-xs text-slate-500">Clientes</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{clientesAtivos.length}</p>
              <p className="text-xs text-slate-500">Ativos</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalLocacoesAtivas}</p>
              <p className="text-xs text-slate-500">Locações Ativas</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                R$ {valorTotalLocacoes.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-slate-500">Valor Mensal</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Clientes da Rota */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Clientes da Rota
              </h2>
              <StatusRotaBadge status={rota.status} />
            </div>

            {rota.clientes.length === 0 ? (
              <EmptyState
                icon="👥"
                title="Nenhum cliente nesta rota"
                description="Os clientes serão listados aqui quando forem cadastrados com esta rota."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left font-medium text-slate-500 pb-2">Código</th>
                      <th className="text-left font-medium text-slate-500 pb-2">Nome</th>
                      <th className="text-left font-medium text-slate-500 pb-2 hidden md:table-cell">Cidade</th>
                      <th className="text-center font-medium text-slate-500 pb-2">Status</th>
                      <th className="text-center font-medium text-slate-500 pb-2 hidden sm:table-cell">Loc.</th>
                      <th className="pb-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {rota.clientes.map(cliente => (
                      <tr key={cliente.id} className="hover:bg-slate-50">
                        <td className="py-2.5 font-mono text-xs text-slate-500">{cliente.identificador}</td>
                        <td className="py-2.5 font-medium">{cliente.nomeExibicao}</td>
                        <td className="py-2.5 text-slate-600 hidden md:table-cell">{cliente.cidade || '-'}</td>
                        <td className="py-2.5 text-center">
                          <StatusRotaBadge status={cliente.status} />
                        </td>
                        <td className="py-2.5 text-center hidden sm:table-cell">
                          {cliente.locacoes.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                              {cliente.locacoes.length}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5">
                          <Link
                            href={`/clientes/${cliente.id}`}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            Ver →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Usuários com Acesso */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                Cobradores da Rota
              </h2>
            </div>

            <GerenciarCobradores
              rotaId={rota.id}
              usuariosComAcesso={usuariosComAcesso}
              todosControlados={todosControlados}
              podeEditar={podeEditar}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Resumo */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Resumo
            </h3>
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
              <div className="border-t border-slate-100 pt-3 mt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Locações ativas</span>
                  <span className="font-semibold">{totalLocacoesAtivas}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-slate-500">Valor total/mês</span>
                  <span className="font-semibold text-emerald-600">
                    R$ {valorTotalLocacoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-slate-500">Cobradores</span>
                  <span className="font-semibold">{usuariosComAcesso.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Informações da Rota */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Informações
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <StatusRotaBadge status={rota.status} />
              </div>
              {rota.regiao && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Região</span>
                  <span className="font-medium">{rota.regiao}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Cor</span>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded border border-slate-200" style={{ backgroundColor: rota.cor }} />
                  <span className="font-mono text-xs">{rota.cor}</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ordem</span>
                <span className="font-medium">{rota.ordem || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Criada em</span>
                <span>{format(rota.createdAt, "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
              {rota.updatedAt && rota.updatedAt > rota.createdAt && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Atualizada</span>
                  <span>{format(rota.updatedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                </div>
              )}
            </div>
            {rota.observacao && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Observação</p>
                <p className="text-sm text-slate-700 whitespace-pre-line">{rota.observacao}</p>
              </div>
            )}
          </div>

          {/* Ações */}
          {podeEditar && (
            <div className="card p-5 bg-slate-50 border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Ações Rápidas
              </h3>
              <div className="space-y-2">
                <Link
                  href={`/admin/rotas/${rota.id}/editar`}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  <Edit className="w-4 h-4" />
                  Editar rota
                </Link>
                <Link
                  href={`/admin/usuarios?rota=${rota.id}`}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  <Users className="w-4 h-4" />
                  Gerenciar acessos
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
