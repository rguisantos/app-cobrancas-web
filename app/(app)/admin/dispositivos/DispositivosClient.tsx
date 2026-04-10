'use client';

import { useState } from 'react';
import { Plus, Loader2, Key, Copy, Check, Eye, EyeOff, Smartphone, Tablet, Monitor, Trash2, RefreshCw } from 'lucide-react';

interface Dispositivo {
  id: string;
  nome: string;
  chave: string;
  senhaNumerica: string | null;
  tipo: string;
  status: string;
  ultimaSincronizacao: Date | null;
  createdAt: Date;
}

interface DispositivosClientProps {
  dispositivosIniciais: Dispositivo[];
}

function gerarSenhaNumerica(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function gerarChave(): string {
  return 'DEV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function DispositivosClient({ dispositivosIniciais }: DispositivosClientProps) {
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>(dispositivosIniciais);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSenha, setShowSenha] = useState<string | null>(null);
  
  // Form state
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('Celular');
  const [senhaGerada, setSenhaGerada] = useState('');

  const handleNovoDispositivo = () => {
    setNome('');
    setTipo('Celular');
    setSenhaGerada(gerarSenhaNumerica());
    setShowModal(true);
  };

  const handleSalvar = async () => {
    if (!nome.trim()) {
      alert('Informe o nome do dispositivo');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/dispositivos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          tipo,
          senhaNumerica: senhaGerada
        })
      });

      if (!res.ok) throw new Error('Erro ao criar dispositivo');

      const novo = await res.json();
      setDispositivos([novo, ...dispositivos]);
      setShowModal(false);
    } catch (error) {
      alert('Erro ao criar dispositivo');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerarSenha = async (id: string) => {
    if (!confirm('Regenerar senha de acesso? A senha anterior não funcionará mais.')) return;
    
    try {
      const novaSenha = gerarSenhaNumerica();
      const res = await fetch(`/api/dispositivos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senhaNumerica: novaSenha })
      });

      if (!res.ok) throw new Error('Erro');

      setDispositivos(dispositivos.map(d => 
        d.id === id ? { ...d, senhaNumerica: novaSenha } : d
      ));
    } catch {
      alert('Erro ao regenerar senha');
    }
  };

  const handleExcluir = async (id: string) => {
    if (!confirm('Excluir este dispositivo?')) return;
    
    try {
      const res = await fetch(`/api/dispositivos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro');
      setDispositivos(dispositivos.filter(d => d.id !== id));
    } catch {
      alert('Erro ao excluir');
    }
  };

  const copiar = async (texto: string, id: string) => {
    await navigator.clipboard.writeText(texto);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'Celular': return <Smartphone className="w-4 h-4" />;
      case 'Tablet': return <Tablet className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  return (
    <>
      {/* Botão adicionar */}
      <div className="mb-4">
        <button
          onClick={handleNovoDispositivo}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Dispositivo
        </button>
      </div>

      {/* Lista de dispositivos - Cards para mobile, tabela para desktop */}
      <div className="hidden md:block card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left font-medium text-slate-500 px-4 py-3">Nome</th>
              <th className="text-left font-medium text-slate-500 px-4 py-3">ID / Chave</th>
              <th className="text-left font-medium text-slate-500 px-4 py-3">Tipo</th>
              <th className="text-center font-medium text-slate-500 px-4 py-3">Status</th>
              <th className="text-center font-medium text-slate-500 px-4 py-3">
                <div className="flex items-center justify-center gap-1">
                  <Key className="w-4 h-4" />
                  Senha
                </div>
              </th>
              <th className="text-left font-medium text-slate-500 px-4 py-3">Última Sync</th>
              <th className="text-center font-medium text-slate-500 px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {dispositivos.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-400">
                  Nenhum dispositivo registrado
                </td>
              </tr>
            )}
            {dispositivos.map(d => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{d.nome}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <code className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">{d.chave}</code>
                    <button onClick={() => copiar(d.chave, `chave-${d.id}`)} className="p-1 hover:bg-slate-200 rounded">
                      {copiedId === `chave-${d.id}` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-slate-600">
                    {getTipoIcon(d.tipo)}
                    {d.tipo}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${d.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {d.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    {d.senhaNumerica ? (
                      <>
                        <code className="bg-amber-50 border border-amber-200 px-3 py-1 rounded font-mono text-lg font-bold tracking-wider text-amber-800">
                          {showSenha === d.id ? d.senhaNumerica : '••••••'}
                        </code>
                        <button onClick={() => setShowSenha(showSenha === d.id ? null : d.id)} className="p-1 hover:bg-slate-100 rounded">
                          {showSenha === d.id ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                        </button>
                        <button onClick={() => copiar(d.senhaNumerica!, `senha-${d.id}`)} className="p-1 hover:bg-slate-100 rounded">
                          {copiedId === `senha-${d.id}` ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                        </button>
                      </>
                    ) : (
                      <span className="text-slate-400 text-xs">Não gerada</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {d.ultimaSincronizacao 
                    ? new Date(d.ultimaSincronizacao).toLocaleString('pt-BR')
                    : 'Nunca'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => handleRegenerarSenha(d.id)} title="Regenerar senha" className="p-2 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleExcluir(d.id)} title="Excluir" className="p-2 hover:bg-red-50 rounded text-slate-500 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards para mobile */}
      <div className="md:hidden space-y-4">
        {dispositivos.length === 0 && (
          <div className="card p-8 text-center text-slate-400">
            Nenhum dispositivo registrado
          </div>
        )}
        {dispositivos.map(d => (
          <div key={d.id} className="card p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-medium text-slate-900">{d.nome}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <code className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono">{d.chave}</code>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${d.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {d.status}
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                {getTipoIcon(d.tipo)}
              </div>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-600 mb-1">Senha de Acesso</p>
                  <code className="font-mono text-xl font-bold tracking-wider text-amber-800">
                    {showSenha === d.id ? d.senhaNumerica : '••••••'}
                  </code>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowSenha(showSenha === d.id ? null : d.id)} className="p-2 hover:bg-amber-100 rounded">
                    {showSenha === d.id ? <EyeOff className="w-5 h-5 text-amber-600" /> : <Eye className="w-5 h-5 text-amber-600" />}
                  </button>
                  <button onClick={() => copiar(d.senhaNumerica!, d.id)} className="p-2 hover:bg-amber-100 rounded">
                    {copiedId === d.id ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-amber-600" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Última sync: {d.ultimaSincronizacao ? new Date(d.ultimaSincronizacao).toLocaleString('pt-BR') : 'Nunca'}</span>
              <div className="flex gap-2">
                <button onClick={() => handleRegenerarSenha(d.id)} className="text-blue-600 hover:underline">Regenerar senha</button>
                <button onClick={() => handleExcluir(d.id)} className="text-red-600 hover:underline">Excluir</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Novo Dispositivo */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Novo Dispositivo</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Dispositivo *</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: iPhone do João, Tablet do Caixa"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Celular">Celular</option>
                    <option value="Tablet">Tablet</option>
                    <option value="Desktop">Desktop</option>
                  </select>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-amber-700 mb-1">Senha de Acesso Gerada</p>
                      <code className="font-mono text-2xl font-bold tracking-wider text-amber-800">{senhaGerada}</code>
                    </div>
                    <button onClick={() => copiar(senhaGerada, 'nova-senha')} className="p-3 hover:bg-amber-100 rounded-lg">
                      {copiedId === 'nova-senha' ? <Check className="w-6 h-6 text-green-500" /> : <Copy className="w-6 h-6 text-amber-600" />}
                    </button>
                  </div>
                  <p className="text-xs text-amber-600 mt-2">⚠️ Anote esta senha! Ela será necessária no primeiro acesso do app.</p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvar}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">📱 Como ativar o aplicativo mobile?</h3>
        <ol className="text-sm text-blue-700 space-y-2">
          <li>1. Crie um novo dispositivo acima e anote a <strong>senha de 6 dígitos</strong></li>
          <li>2. No app mobile, na tela de login, toque em "Novo Dispositivo"</li>
          <li>3. Digite a senha de 6 dígitos para vincular o aparelho</li>
          <li>4. Pronto! O dispositivo está ativo e pode sincronizar dados</li>
        </ol>
      </div>
    </>
  );
}
