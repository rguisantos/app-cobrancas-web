'use client'

import { useState } from 'react'
import { UserCheck, Plus, X, Loader2 } from 'lucide-react'
import EmptyState from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toaster'

interface Usuario {
  id: string
  nome: string
  email: string
  tipoPermissao: string
}

interface GerenciarCobradoresProps {
  rotaId: string
  usuariosComAcesso: Usuario[]
  todosControlados: Usuario[]
  podeEditar: boolean
}

export default function GerenciarCobradores({
  rotaId,
  usuariosComAcesso,
  todosControlados,
  podeEditar,
}: GerenciarCobradoresProps) {
  const { success: toastSuccess, error: toastError } = useToast()
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    // Pré-selecionar os controlados que já têm acesso
    const controladosIds = usuariosComAcesso
      .filter(u => u.tipoPermissao === 'AcessoControlado')
      .map(u => u.id)
    return new Set(controladosIds)
  })
  const [currentUsuariosComAcesso, setCurrentUsuariosComAcesso] = useState(usuariosComAcesso)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/rotas/${rotaId}/usuarios`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioIds: Array.from(selectedIds) }),
      })

      if (res.ok) {
        const data = await res.json()
        toastSuccess('Cobradores atualizados com sucesso')
        setShowAddForm(false)

        // Atualizar lista local — combinar admins + recém-vinculados
        const adminUsuarios = currentUsuariosComAcesso.filter(u => u.tipoPermissao === 'Administrador')
        const controladosVinculados = data.usuariosVinculados || []
        const adminIds = new Set(adminUsuarios.map(u => u.id))
        setCurrentUsuariosComAcesso([
          ...adminUsuarios,
          ...controladosVinculados.filter((u: Usuario) => !adminIds.has(u.id)),
        ])
      } else {
        const errorData = await res.json()
        toastError(errorData.error || 'Erro ao atualizar cobradores')
      }
    } catch {
      toastError('Erro ao atualizar cobradores')
    } finally {
      setSaving(false)
    }
  }

  const toggleUsuario = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const admins = currentUsuariosComAcesso.filter(u => u.tipoPermissao === 'Administrador')
  const controlados = currentUsuariosComAcesso.filter(u => u.tipoPermissao === 'AcessoControlado')

  return (
    <div>
      {/* Lista de usuários com acesso */}
      {currentUsuariosComAcesso.length === 0 ? (
        <EmptyState
          icon="👤"
          title="Nenhum cobrador com acesso"
          description="Administradores têm acesso total. Para outros usuários, configure 'Acesso Controlado' e selecione esta rota."
        />
      ) : (
        <div className="space-y-3">
          {/* Administradores */}
          {admins.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2 font-medium">Administradores (acesso total)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {admins.map(usuario => (
                  <div
                    key={usuario.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-purple-100 bg-purple-50/50"
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold bg-purple-100 text-purple-700">
                      {usuario.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{usuario.nome}</p>
                      <p className="text-xs text-slate-500 truncate">{usuario.email}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                      Admin
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cobradores com acesso controlado */}
          {controlados.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2 font-medium">Cobradores (acesso controlado)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {controlados.map(usuario => (
                  <div
                    key={usuario.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-blue-100 bg-blue-50/50"
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold bg-blue-100 text-blue-700">
                      {usuario.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{usuario.nome}</p>
                      <p className="text-xs text-slate-500 truncate">{usuario.email}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      Cobrador
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Botão para gerenciar */}
      {podeEditar && !showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="mt-4 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          <Plus className="w-4 h-4" />
          Gerenciar cobradores
        </button>
      )}

      {/* Formulário para gerenciar */}
      {showAddForm && (
        <div className="mt-4 border border-slate-200 rounded-lg p-4 bg-slate-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-slate-900">Selecionar cobradores com acesso</h4>
            <button
              onClick={() => setShowAddForm(false)}
              className="p-1 hover:bg-slate-200 rounded"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          {todosControlados.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhum usuário com acesso controlado cadastrado. Crie um usuário com tipo &quot;Acesso Controlado&quot; primeiro.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {todosControlados.map(usuario => (
                <label
                  key={usuario.id}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    selectedIds.has(usuario.id)
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(usuario.id)}
                    onChange={() => toggleUsuario(usuario.id)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{usuario.nome}</p>
                    <p className="text-xs text-slate-500 truncate">{usuario.email}</p>
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary text-sm"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
              ) : (
                'Salvar alterações'
              )}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="btn-secondary text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
