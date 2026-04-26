'use client';

import { useState, useEffect } from 'react';
import { Plus, Loader2, Key, Copy, Check, Eye, EyeOff, Smartphone, Tablet, Monitor, Trash2, RefreshCw, Wifi, WifiOff, X, AlertTriangle, MoreVertical, Clock, CheckCircle2, XCircle, SmartphoneIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/components/ui/toaster';

interface Dispositivo {
  id: string;
  nome: string;
  chave: string;
  senhaNumerica: string | null;
  deviceKey: string | null;
  deviceName: string | null;
  tipo: string;
  status: string;
  ativado: boolean;
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
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const { error: toastError } = useToast();
  
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

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    if (activeMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [activeMenu]);

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
      toastError('Erro ao criar dispositivo');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerarSenha = async (id: string) => {
    setActiveMenu(null);
    if (!confirm('Regenerar senha de acesso? Isso permitirá reativar o dispositivo com a nova senha.')) return;
    
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
      toastError('Erro ao regenerar senha');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    setActiveMenu(null);
    const novoStatus = currentStatus === 'ativo' ? 'inativo' : 'ativo';
    
    try {
      const res = await fetch(`/api/dispositivos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus })
      });

      if (!res.ok) throw new Error('Erro');

      setDispositivos(dispositivos.map(d => 
        d.id === id ? { ...d, status: novoStatus } : d
      ));
    } catch {
      toastError('Erro ao alterar status');
    }
  };

  const handleExcluir = async (id: string) => {
    setActiveMenu(null);
    if (!confirm('Excluir este dispositivo? Ele não poderá mais sincronizar dados.')) return;
    
    try {
      const res = await fetch(`/api/dispositivos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro');
      setDispositivos(dispositivos.filter(d => d.id !== id));
    } catch {
      toastError('Erro ao excluir');
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
    if (!ultimaSync) return 'Nunca sincronizou';
    return formatDistanceToNow(new Date(ultimaSync), { locale: ptBR, addSuffix: true });
  };

  return (
    <>
      {/* Botão adicionar - fixo em mobile */}
      <div className="flex justify-end mb-6">
        <button
          onClick={handleNovoDispositivo}
          className="btn-primary w-full sm:w-auto justify-center"
        >
          <Plus className="w-5 h-5" />
          <span>Novo Dispositivo</span>
        </button>
      </div>

      {/* Lista de dispositivos - Cards responsivos otimizados para mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {dispositivos.length === 0 && (
          <div className="col-span-full card p-8 sm:p-12 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium text-lg">Nenhum dispositivo registrado</p>
            <p className="text-sm text-slate-400 mt-2">Clique em &quot;Novo Dispositivo&quot; para começar</p>
          </div>
        )}
        
        {dispositivos.map(d => {
          const online = isOnline(d.ultimaSincronizacao);
          
          return (
            <div 
              key={d.id} 
              className="card overflow-hidden"
            >
              {/* Card Header com status visual */}
              <div className={`px-4 py-3 sm:px-5 sm:py-4 flex items-center justify-between ${
                online 
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100' 
                  : d.status === 'ativo' && d.ativado
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100'
                    : d.status === 'ativo' && !d.ativado
                      ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100'
                      : 'bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100'
              }`}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    online ? 'bg-green-200' : d.ativado ? 'bg-blue-200' : 'bg-amber-200'
                  }`}>
                    {online ? (
                      <Wifi className="w-5 h-5 sm:w-6 sm:h-6 text-green-700" />
                    ) : d.ativado ? (
                      <SmartphoneIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-700" />
                    ) : (
                      <Key className="w-5 h-5 sm:w-6 sm:h-6 text-amber-700" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900 truncate text-base sm:text-lg">{d.nome}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${
                        d.status === 'ativo' 
                          ? 'bg-green-200 text-green-800' 
                          : 'bg-red-200 text-red-800'
                      }`}>
                        {d.status === 'ativo' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Ativo
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            Inativo
                          </>
                        )}
                      </span>
                      {d.ativado && (
                        <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Ativado
                        </span>
                      )}
                      {!d.ativado && d.senhaNumerica && (
                        <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                          <Key className="w-3 h-3 mr-1" />
                          Aguardando ativação
                        </span>
                      )}
                      {online && (
                        <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1 animate-pulse" />
                          Online
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Menu de ações - sempre visível em mobile */}
                <div className="relative flex-shrink-0 ml-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(activeMenu === d.id ? null : d.id);
                    }}
                    className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                  >
                    <MoreVertical className="w-5 h-5 text-slate-500" />
                  </button>
                  
                  {activeMenu === d.id && (
                    <div 
                      className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-slate-200 py-2 min-w-[180px] z-20"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleToggleStatus(d.id, d.status)}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center gap-3 text-slate-700"
                      >
                        {d.status === 'ativo' ? (
                          <>
                            <XCircle className="w-4 h-4 text-orange-500" />
                            Desativar
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            Ativar
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleRegenerarSenha(d.id)}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center gap-3 text-slate-700"
                      >
                        <RefreshCw className="w-4 h-4 text-blue-500" />
                        {d.ativado ? 'Nova Senha (Reativar)' : 'Regenerar Senha'}
                      </button>
                      <hr className="my-2 border-slate-100" />
                      <button
                        onClick={() => handleExcluir(d.id)}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-50 flex items-center gap-3 text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 sm:p-5 space-y-4">
                {/* Chave de ativação - permanece sempre a mesma */}
                <div>
                  <p className="text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wide">Chave de Ativação</p>
                  <div className="flex items-center gap-2">
                    <code className="bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg text-sm font-mono text-blue-700 flex-1 break-all">
                      {d.chave}
                    </code>
                    <button 
                      onClick={() => copiar(d.chave, `chave-${d.id}`)} 
                      className="p-2.5 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0 active:scale-95 border border-transparent hover:border-blue-200"
                      title="Copiar chave"
                    >
                      {copiedId === `chave-${d.id}` 
                        ? <Check className="w-5 h-5 text-green-500" /> 
                        : <Copy className="w-5 h-5 text-blue-500" />
                      }
                    </button>
                  </div>
                </div>

                {/* Senha de Acesso (apenas para dispositivos não ativados ou com senha regenerada) */}
                {d.senhaNumerica ? (
                  <div>
                    <p className="text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wide">
                      {d.ativado ? 'Nova Senha de Reativação' : 'Senha de Acesso'}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg px-3 py-2.5 flex items-center justify-between">
                        <code className="font-mono text-xl sm:text-2xl font-bold tracking-widest text-amber-800">
                          {showSenha === d.id ? d.senhaNumerica : '••• •••'}
                        </code>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => setShowSenha(showSenha === d.id ? null : d.id)} 
                            className="p-2 hover:bg-amber-100 rounded-lg transition-colors active:scale-95"
                          >
                            {showSenha === d.id 
                              ? <EyeOff className="w-5 h-5 text-amber-600" /> 
                              : <Eye className="w-5 h-5 text-amber-600" />
                            }
                          </button>
                          <button 
                            onClick={() => copiar(d.senhaNumerica!, `senha-${d.id}`)} 
                            className="p-2 hover:bg-amber-100 rounded-lg transition-colors active:scale-95"
                          >
                            {copiedId === `senha-${d.id}` 
                              ? <Check className="w-5 h-5 text-green-500" /> 
                              : <Copy className="w-5 h-5 text-amber-600" />
                            }
                          </button>
                        </div>
                      </div>
                    </div>
                    {!d.ativado && (
                      <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Use esta senha para ativar o dispositivo no app mobile
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wide">Senha de Acesso</p>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-500 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Key className="w-4 h-4" />
                        {d.ativado ? 'Senha já utilizada' : 'Senha não gerada'}
                      </span>
                      <button
                        onClick={() => handleRegenerarSenha(d.id)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Gerar senha
                      </button>
                    </div>
                  </div>
                )}

                {/* Dispositivo/Aparelho (após ativação) */}
                {d.ativado && d.deviceName && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wide">Aparelho Vinculado</p>
                    <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 flex items-center gap-2">
                      <SmartphoneIcon className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-700 font-medium">{d.deviceName}</span>
                    </div>
                  </div>
                )}

                {/* Última sincronização */}
                <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-sm text-slate-500">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>Última sync: {formatLastSync(d.ultimaSincronizacao)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Novo Dispositivo */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto animate-slide-up">
            {/* Header */}
            <div className="px-4 py-4 sm:px-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-slate-900">Novo Dispositivo</h2>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-4 sm:p-6 space-y-5">
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
                  className={`w-full px-4 py-3 rounded-xl border outline-none transition-all text-base ${
                    errors.nome 
                      ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' 
                      : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                />
                {errors.nome && <p className="text-red-500 text-sm mt-1.5">{errors.nome}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo de Dispositivo</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Celular', 'Tablet', 'Desktop'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTipo(t)}
                      className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5 ${
                        tipo === t 
                          ? 'border-blue-500 bg-blue-50 text-blue-700' 
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      {t === 'Celular' && <Smartphone className="w-6 h-6" />}
                      {t === 'Tablet' && <Tablet className="w-6 h-6" />}
                      {t === 'Desktop' && <Monitor className="w-6 h-6" />}
                      <span className="text-xs font-medium">{t}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-amber-700 font-medium mb-2">Senha de Acesso Gerada</p>
                    <code className="font-mono text-3xl sm:text-4xl font-bold tracking-widest text-amber-800">
                      {senhaGerada}
                    </code>
                  </div>
                  <button 
                    onClick={() => copiar(senhaGerada, 'nova-senha')} 
                    className="p-3 hover:bg-amber-100 rounded-xl transition-colors active:scale-95 flex-shrink-0"
                  >
                    {copiedId === 'nova-senha' 
                      ? <Check className="w-6 h-6 text-green-500" /> 
                      : <Copy className="w-6 h-6 text-amber-600" />
                    }
                  </button>
                </div>
                <div className="mt-4 flex items-start gap-2 text-sm text-amber-700 bg-amber-100/50 rounded-lg p-3">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span><strong>Importante:</strong> Anote esta senha! Ela será necessária no primeiro acesso do aplicativo mobile.</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-4 sm:px-6 border-t border-slate-100 flex flex-col sm:flex-row gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 btn-secondary justify-center py-3"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvar}
                disabled={loading}
                className="flex-1 btn-primary justify-center py-3"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Criando...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    <span>Criar Dispositivo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info box - How to activate */}
      <div className="mt-8 card overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4">
          <h3 className="font-semibold text-white flex items-center gap-2 text-lg">
            <Smartphone className="w-5 h-5" />
            Como funciona a ativação?
          </h3>
        </div>
        <div className="p-5">
          <div className="grid gap-4">
            <div key="1" className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                1
              </div>
              <div>
                <p className="text-slate-700 font-medium">Crie o dispositivo no painel web</p>
                <p className="text-sm text-slate-500">Anote a <strong>chave</strong> (DEV-XXXXXX) e a <strong>senha de 6 dígitos</strong></p>
              </div>
            </div>
            <div key="2" className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                2
              </div>
              <div>
                <p className="text-slate-700 font-medium">No app mobile, toque em &quot;Novo Dispositivo&quot;</p>
                <p className="text-sm text-slate-500">Digite a chave e a senha de 6 dígitos</p>
              </div>
            </div>
            <div key="3" className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                3
              </div>
              <div>
                <p className="text-slate-700 font-medium">Pronto! Dispositivo ativado</p>
                <p className="text-sm text-slate-500">A <strong>chave permanece a mesma</strong> para futuras sincronizações</p>
              </div>
            </div>
            <div key="4" className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                💡
              </div>
              <div>
                <p className="text-slate-700 font-medium">Precisa reativar?</p>
                <p className="text-sm text-slate-500">Clique em &quot;Nova Senha&quot; no menu do dispositivo para gerar uma nova senha de ativação</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
