import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/header'
import Badge from '@/components/ui/badge'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Key, Copy, Check, Smartphone } from 'lucide-react'

export const metadata: Metadata = { title: 'Dispositivos Móveis' }
const ONE_DAY_MS = 24 * 60 * 60 * 1000

function sincronizacaoAtrasada(ultimaSincronizacao?: Date | null) {
  if (!ultimaSincronizacao) return true
  return Date.now() - ultimaSincronizacao.getTime() > ONE_DAY_MS
}

// Componente para exibir e copiar senha
function SenhaNumerica({ senha }: { senha?: string | null }) {
  if (!senha) {
    return <span className="text-slate-400 text-xs">Não gerada</span>
  }
  
  return (
    <div className="flex items-center gap-2">
      <code className="bg-slate-100 px-2 py-1 rounded font-mono text-sm font-semibold tracking-wider">
        {senha}
      </code>
      <button
        className="copy-btn p-1 hover:bg-slate-100 rounded"
        data-senha={senha}
        title="Copiar senha"
      >
        <Copy className="w-4 h-4 text-slate-400" />
      </button>
    </div>
  )
}

export default async function DispositivosPage() {
  const session = await getSession()
  if (!session?.user || session.user.tipoPermissao !== 'Administrador') redirect('/dashboard')

  const dispositivos = await prisma.dispositivo.findMany({ 
    orderBy: { createdAt: 'desc' } 
  })

  return (
    <div>
      <Header 
        title="Dispositivos Móveis" 
        subtitle="Equipamentos registrados para sincronização"
        actions={
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Smartphone className="w-4 h-4" />
            <span>{dispositivos.length} dispositivo(s)</span>
          </div>
        }
      />

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left font-medium text-slate-500 px-4 py-3">Nome</th>
              <th className="text-left font-medium text-slate-500 px-4 py-3">Tipo</th>
              <th className="text-center font-medium text-slate-500 px-4 py-3">Status</th>
              <th className="text-center font-medium text-slate-500 px-4 py-3">
                <div className="flex items-center justify-center gap-1">
                  <Key className="w-4 h-4" />
                  Senha de Acesso
                </div>
              </th>
              <th className="text-left font-medium text-slate-500 px-4 py-3">Última Sincronização</th>
              <th className="text-left font-medium text-slate-500 px-4 py-3">Cadastrado em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {dispositivos.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-400">
                  Nenhum dispositivo registrado ainda
                </td>
              </tr>
            )}
            {dispositivos.map(d => {
              const atrasado = sincronizacaoAtrasada(d.ultimaSincronizacao)
              return (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{d.nome}</td>
                  <td className="px-4 py-3 text-slate-600">{d.tipo}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge label={d.status} variant={d.status === 'ativo' ? 'green' : 'gray'} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <SenhaNumerica senha={d.senhaNumerica} />
                  </td>
                  <td className="px-4 py-3">
                    {d.ultimaSincronizacao ? (
                      <div>
                        <p className={`text-sm font-medium ${atrasado ? 'text-red-600' : 'text-green-600'}`}>
                          {formatDistanceToNow(d.ultimaSincronizacao, { locale: ptBR, addSuffix: true })}
                        </p>
                        <p className="text-xs text-slate-400">
                          {format(d.ultimaSincronizacao, "dd/MM/yy HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">Nunca sincronizou</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {format(d.createdAt, "dd/MM/yy", { locale: ptBR })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Info sobre senha */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">📱 Como funciona a senha de acesso?</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Ao registrar um dispositivo, uma senha de 6 dígitos é gerada automaticamente</li>
          <li>• No primeiro acesso do aplicativo mobile, o usuário deve informar esta senha</li>
          <li>• Após a validação, o dispositivo pode sincronizar os dados</li>
          <li>• <strong>Importante:</strong> Anote a senha e forneça ao usuário do dispositivo</li>
        </ul>
      </div>

      {/* Script para copiar senha */}
      <script dangerouslySetInnerHTML={{
        __html: `
          document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
              const senha = btn.dataset.senha;
              await navigator.clipboard.writeText(senha);
              const icon = btn.querySelector('svg');
              icon.outerHTML = '<svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
              setTimeout(() => {
                location.reload();
              }, 500);
            });
          });
        `
      }} />
    </div>
  )
}
