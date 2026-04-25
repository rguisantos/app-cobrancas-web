import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/header'
import { StatusClienteBadge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import { UserPlus, Shield, Mail, Clock, MapPin, Edit } from 'lucide-react'

export const metadata: Metadata = { title: 'Gerenciar Usuários' }

export default async function UsuariosPage() {
  const session = await getSession()
  if (session?.user.tipoPermissao !== 'Administrador') redirect('/dashboard')

  const usuarios = await prisma.usuario.findMany({
    where: { deletedAt: null },
    include: { rotasPermitidasRel: { include: { rota: { select: { descricao: true } } } } },
    orderBy: { nome: 'asc' },
  })

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'Administrador': return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'Secretario': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'AcessoControlado': return 'bg-amber-100 text-amber-700 border-amber-200'
      default: return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  return (
    <div>
      <Header
        title="Usuários"
        subtitle={`${usuarios.length} usuário${usuarios.length !== 1 ? 's' : ''} cadastrado${usuarios.length !== 1 ? 's' : ''}`}
        actions={
          <Link href="/admin/usuarios/novo" className="btn-primary">
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Usuário</span>
          </Link>
        }
      />

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left font-medium text-slate-500 px-6 py-4">Nome</th>
                <th className="text-left font-medium text-slate-500 px-6 py-4">Email</th>
                <th className="text-center font-medium text-slate-500 px-6 py-4">Tipo</th>
                <th className="text-center font-medium text-slate-500 px-6 py-4">Status</th>
                <th className="text-left font-medium text-slate-500 px-6 py-4">Rotas Permitidas</th>
                <th className="text-left font-medium text-slate-500 px-6 py-4">Último Acesso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usuarios.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                        {u.nome[0]?.toUpperCase() || 'U'}
                      </div>
                      <span className="font-medium text-slate-900">{u.nome}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{u.email}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getTipoColor(u.tipoPermissao)}`}>
                      {u.tipoPermissao}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <StatusClienteBadge status={u.status} />
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-xs">
                    {u.rotasPermitidasRel.length > 0
                      ? u.rotasPermitidasRel.map(r => r.rota.descricao).join(', ')
                      : <span className="text-slate-400">Todas</span>}
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {u.dataUltimoAcesso
                      ? format(new Date(u.dataUltimoAcesso), "dd/MM/yy 'às' HH:mm", { locale: ptBR })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {usuarios.map(u => (
          <div key={u.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {u.nome[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-slate-900 truncate">{u.nome}</h3>
                    <StatusClienteBadge status={u.status} />
                  </div>
                  <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                    <Mail className="w-3.5 h-3.5" />
                    {u.email}
                  </p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" />
                    Tipo
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getTipoColor(u.tipoPermissao)}`}>
                    {u.tipoPermissao}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Último acesso
                  </span>
                  <span className="text-xs font-medium text-slate-700">
                    {u.dataUltimoAcesso
                      ? format(new Date(u.dataUltimoAcesso), "dd/MM/yy 'às' HH:mm", { locale: ptBR })
                      : '—'}
                  </span>
                </div>

                {u.rotasPermitidasRel.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-slate-500 flex items-center gap-1 flex-shrink-0">
                      <MapPin className="w-3.5 h-3.5" />
                      Rotas
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {u.rotasPermitidasRel.map(r => (
                        <span key={r.rotaId} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {r.rota.descricao}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
              <Link 
                href={`/admin/usuarios/${u.id}/editar`}
                className="flex items-center justify-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <Edit className="w-4 h-4" />
                Editar usuário
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
