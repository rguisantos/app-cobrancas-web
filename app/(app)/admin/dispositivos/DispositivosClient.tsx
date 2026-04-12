'use client';

import { useState, useEffect } from 'react';
import { Plus, Loader2, Key, Copy, Check, Eye, EyeOff, Smartphone, Tablet, Monitor, Trash2, RefreshCw, Wifi, WifiOff, X, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Dispositivo {
  id: string;
  nome: string;
  chave: string;
  senhaNumerica: string | null;
  tipo: string;
  status: string;
  ultimaSincronizacao: string | null;
  createdAt: string;
}

interface DispositivosClientProps {
  dispositivosIniciais: Dispositivo[];
}

function gerarSenhaNumerica(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function DispositivosClient({ dispositivosIniciais }: DispositivosClientProps) {
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>(dispositivosIniciais);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSenha, setShowSenha] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  
  // Form state
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('Celular');
  const [senhaGerada, setSenhaGerada] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Atualizar timestamp a cada minuto para status online
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleNovoDispositivo = () => {
    setNome('');
    setTipo('Celular');
    setSenhaGerada(gerarSenhaNumerica());
    setErrors({});
    setShowModal(true);
  };

  const handleSalvar = async () => {
    const newErrors: Record<string, string> = {};
    if (!nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
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
    if (!confirm('Excluir este dispositivo? Ele não poderá mais sincronizar dados.')) return;
    
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

  const isOnline = (ultimaSync: string | null) => {
    if (!ultimaSync) return false;
    return (now - new Date(ultimaSync).getTime()) < 1000 * 60 * 30; // 30 min
  };

  const formatLastSync = (ultimaSync: string | null) => {
    if (!ultimaSync) return 'Nunca';
    return formatDistanceToNow(new Date(ultimaSync), { locale: ptBR, addSuffix: true });
  };

  return (
    <>
      {/* Botão adicionar */}
      <div className="flex justify-end mb-6">
        <button
          onClick={handleNovoDispositivo}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Novo Dispositivo
        </button>
      </div>

      {/* Lista de dispositivos - Cards responsivos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dispositivos.length === 0 && (
          <div className="col-span-full card p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">Nenhum dispositivo registrado</p>
            <p className="text-sm text-slate-400 mt-1">Clique em &quot;Novo Dispositivo&quot; para começar</p>
          </div>
        )}
        
        {dispositivos.map(d => {
          const online = isOnline(d.ultimaSincronizacao);
          
          return (
            <div 
              key={d.id} 
              className="card p-5 hover:shadow-md transition-shadow group"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    online ? 'bg-green-100' : 'bg-slate-100'
                  }`}>
                    {online ? (
                      <Wifi className="w-6 h-6 text-green-600" />
                    ) : (
                      <WifiOff className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{d.nome}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        d.status === 'ativo' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {d.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        {getTipoIcon(d.tipo)}
                        {d.tipo}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chave de ativação */}
              <div className="mb-4">
                <p className="text-xs text-slate-500 mb-1">Chave de Ativação</p>
                <div className="flex items-center gap-2">
                  <code className="bg-slate-100 px-3 py-1.5 rounded-lg text-sm font-mono text-slate-700 flex-1">
                    {d.chave}
                  </code>
                  <button 
                    onClick={() => copiar(d.chave, `chave-${d.id}`)} 
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Copiar chave"
                  >
                    {copiedId === `chave-${d.id}` 
                      ? <Check className="w-4 h-4 text-green-500" /> 
                      : <Copy className="w-4 h-4 text-slate-400" />
                    }
                  </button>
                </div>
              </div>

              {/* Senha */}
              <div className="mb-4">
                <p className="text-xs text-slate-500 mb-1">Senha de Acesso</p>
                {d.senhaNumerica ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center justify-between">
                      <code className="font-mono text-lg font-bold tracking-widest text-amber-800">
                        {showSenha === d.id ? d.senhaNumerica : '••• •••'}
                      </code>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => setShowSenha(showSenha === d.id ? null : d.id)} 
                          className="p-1.5 hover:bg-amber-100 rounded transition-colors"
                        >
                          {showSenha === d.id 
                            ? <EyeOff className="w-4 h-4 text-amber-600" /> 
                            : <Eye className="w-4 h-4 text-amber-600" />
                          }
                        </button>
                        <button 
                          onClick={() => copiar(d.senhaNumerica!, `senha-${d.id}`)} 
                          className="p-1.5 hover:bg-amber-100 rounded transition-colors"
                        >
                          {copiedId === `senha-${d.id}` 
                            ? <Check className="w-4 h-4 text-green-500" /> 
                            : <Copy className="w-4 h-4 text-amber-600" />
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-400">
                    Senha não gerada
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-500' : 'bg-slate-300'}`} />
                    {formatLastSync(d.ultimaSincronizacao)}
                  </span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleRegenerarSenha(d.id)} 
                    title="Regenerar senha" 
                    className="p-2 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleExcluir(d.id)} 
                    title="Excluir" 
                    className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Novo Dispositivo */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-slide-up">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Novo Dispositivo</h2>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nome do Dispositivo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => {
                    setNome(e.target.value);
                    setErrors(prev => ({ ...prev, nome: '' }));
                  }}
                  placeholder="Ex: iPhone do João, Tablet do Caixa"
                  className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all ${
                    errors.nome 
                      ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' 
                      : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                />
                {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white"
                >
                  <option value="Celular">📱 Celular</option>
                  <option value="Tablet">📲 Tablet</option>
                  <option value="Desktop">💻 Desktop</option>
                </select>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-amber-700 font-medium mb-1">Senha de Acesso Gerada</p>
                    <code className="font-mono text-3xl font-bold tracking-widest text-amber-800">
                      {senhaGerada}
                    </code>
                  </div>
                  <button 
                    onClick={() => copiar(senhaGerada, 'nova-senha')} 
                    className="p-3 hover:bg-amber-100 rounded-xl transition-colors"
                  >
                    {copiedId === 'nova-senha' 
                      ? <Check className="w-6 h-6 text-green-500" /> 
                      : <Copy className="w-6 h-6 text-amber-600" />
                    }
                  </button>
                </div>
                <div className="mt-3 flex items-start gap-2 text-xs text-amber-600">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Anote esta senha! Ela será necessária no primeiro acesso do aplicativo mobile.</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 btn-secondary justify-center"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvar}
                disabled={loading}
                className="flex-1 btn-primary justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Criar Dispositivo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info box */}
      <div className="mt-8 card p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          Como ativar o aplicativo mobile?
        </h3>
        <ol className="text-sm text-blue-700 space-y-3">
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
            <span>Crie um novo dispositivo acima e anote a <strong className="text-blue-900">senha de 6 dígitos</strong></span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
            <span>No app mobile, na tela de login, toque em <strong className="text-blue-900">&quot;Novo Dispositivo&quot;</strong></span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
            <span>Digite a senha de 6 dígitos para vincular o aparelho</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
            <span>Pronto! O dispositivo está ativo e pode sincronizar dados</span>
          </li>
        </ol>
      </div>
    </>
  );
}
