import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/header'
import Badge from '@/components/ui/badge'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const metadata: Metadata = { title: 'Dispositivos Móveis' }

export default async function DispositivosPage() {
  const session = await getSession()
  if (session?.user.tipoPermissao !== 'Administrador') redirect('/dashboard')

  const dispositivos = await prisma.dispositivo.findMany({ orderBy: { createdAt: 'desc' } })

  return (
    <div>
      <Header title="Dispositivos Móveis" subtitle="Equipamentos registrados para sincronização" />

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left font-medium text-slate-500 px-4 py-3">Nome</th>
              <th className="text-left font-medium text-slate-500 px-4 py-3">Tipo</th>
              <th className="text-center font-medium text-slate-500 px-4 py-3">Status</th>
              <th className="text-left font-medium text-slate-500 px-4 py-3">Última Sincronização</th>
              <th className="text-left font-medium text-slate-500 px-4 py-3">Cadastrado em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {dispositivos.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">Nenhum dispositivo registrado ainda</td></tr>
            )}
            {dispositivos.map(d => {
              const atrasado = d.ultimaSincronizacao
                ? (Date.now() - d.ultimaSincronizacao.getTime()) > 24 * 60 * 60 * 1000
                : true
              return (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{d.nome}</td>
                  <td className="px-4 py-3 text-slate-600">{d.tipo}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge label={d.status} variant={d.status === 'ativo' ? 'green' : 'gray'} />
                  </td>
                  <td className="px-4 py-3">
                    {d.ultimaSincronizacao ? (
                      <div>
                        <p className={`text-sm font-medium ${atrasado ? 'text-red-600' : 'text-green-600'}`}>
                          {formatDistanceToNow(d.ultimaSincronizacao, { locale: ptBR, addSuffix: true })}
                        </p>
                        <p className="text-xs text-slate-400">{format(d.ultimaSincronizacao, "dd/MM/yy HH:mm", { locale: ptBR })}</p>
                      </div>
                    ) : <span className="text-slate-400 text-xs">Nunca sincronizou</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{format(d.createdAt, "dd/MM/yy", { locale: ptBR })}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
