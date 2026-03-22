import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/header'
import Badge from '@/components/ui/badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const metadata: Metadata = { title: 'Gerenciar Usuários' }

export default async function UsuariosPage() {
  const session = await getSession()
  if (session?.user.tipoPermissao !== 'Administrador') redirect('/dashboard')

  const usuarios = await prisma.usuario.findMany({
    where: { deletedAt: null },
    include: { rotasPermitidas: { include: { rota: { select: { descricao: true } } } } },
    orderBy: { nome: 'asc' },
  })

  const tipoVariant: Record<string, any> = {
    Administrador: 'blue', Secretario: 'green', AcessoControlado: 'yellow',
  }

  return (
    <div>
      <Header
        title="Usuários"
        subtitle={`${usuarios.length} usuário${usuarios.length !== 1 ? 's' : ''} cadastrado${usuarios.length !== 1 ? 's' : ''}`}
        actions={
          <a href="/admin/usuarios/novo" className="btn-primary">+ Novo Usuário</a>
        }
      />

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left font-medium text-slate-500 px-4 py-3">Nome</th>
              <th className="text-left font-medium text-slate-500 px-4 py-3">Email</th>
              <th className="text-center font-medium text-slate-500 px-4 py-3">Tipo</th>
              <th className="text-center font-medium text-slate-500 px-4 py-3">Status</th>
              <th className="text-left font-medium text-slate-500 px-4 py-3">Rotas Permitidas</th>
              <th className="text-left font-medium text-slate-500 px-4 py-3">Último Acesso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {usuarios.map(u => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{u.nome}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3 text-center">
                  <Badge label={u.tipoPermissao} variant={tipoVariant[u.tipoPermissao] ?? 'gray'} />
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge label={u.status} variant={u.status === 'Ativo' ? 'green' : 'red'} />
                </td>
                <td className="px-4 py-3 text-slate-600 text-xs">
                  {u.rotasPermitidas.length > 0
                    ? u.rotasPermitidas.map(r => r.rota.descricao).join(', ')
                    : <span className="text-slate-400">Todas</span>}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
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
  )
}
