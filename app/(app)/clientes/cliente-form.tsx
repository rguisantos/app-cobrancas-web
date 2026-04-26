'use client'

import Link from 'next/link'
import { Save, User, Building2, Plus, Trash2, MapPin, Loader2, Phone, Mail, FileText, Tag, Navigation, CheckCircle2 } from 'lucide-react'
import { useClienteForm } from '@/hooks/useClienteForm'
import type { ContatoForm } from '@/hooks/useClienteForm'

// ============================================================================
// TIPOS
// ============================================================================

interface ClienteFormProps {
  /** If provided, form works in edit mode */
  clienteId?: string
  /** Title displayed in the header */
  title: string
  /** Subtitle displayed in the header */
  subtitle: string
  /** Label for the submit button */
  submitLabel: string
  /** Loading label for the submit button */
  submitLoadingLabel?: string
  /** Called when form is submitted. Return true to navigate back on success. */
  onSubmit: (data: {
    formData: ReturnType<typeof useClienteForm>['formData']
    contatos: ContatoForm[]
    identificador: string
  }) => Promise<{ success: boolean; errors?: Record<string, string>; message?: string }>
  /** Called after successful submission */
  onSuccess?: () => void
}

// ============================================================================
// COMPONENTE DE FORMULÁRIO UNIFICADO
// ============================================================================

export function ClienteForm({
  clienteId,
  title,
  subtitle,
  submitLabel,
  submitLoadingLabel = 'Salvando...',
  onSubmit,
  onSuccess,
}: ClienteFormProps) {
  const {
    formData,
    contatos,
    errors,
    rotas,
    estados,
    cidades,
    loading,
    loadingData,
    loadingCidades,
    loadingGps,
    gpsCaptured,
    handleChange,
    handleCepChange,
    adicionarContato,
    removerContato,
    atualizarContato,
    handleCapturarLocalizacao,
    getIdentificador,
    setErrors,
  } = useClienteForm({ clienteId })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await onSubmit({
      formData,
      contatos: contatos.filter(c => c.nome || c.telefone),
      identificador: getIdentificador(),
    })

    if (result.success) {
      onSuccess?.()
    } else if (result.errors) {
      setErrors(result.errors)
    }
  }

  // Loading state while fetching existing cliente data
  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-slate-500">Carregando dados do cliente...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-24 lg:pb-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ─── Tipo de Pessoa ─────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              {formData.tipoPessoa === 'Fisica' ? <User className="w-5 h-5 text-blue-600" /> : <Building2 className="w-5 h-5 text-purple-600" />}
              Tipo de Pessoa
            </h2>
          </div>
          <div className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                formData.tipoPessoa === 'Fisica'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="tipoPessoa"
                  value="Fisica"
                  checked={formData.tipoPessoa === 'Fisica'}
                  onChange={handleChange}
                  className="sr-only"
                />
                <User className="w-5 h-5" />
                <span className="font-medium">Pessoa Física</span>
              </label>
              <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                formData.tipoPessoa === 'Juridica'
                  ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="tipoPessoa"
                  value="Juridica"
                  checked={formData.tipoPessoa === 'Juridica'}
                  onChange={handleChange}
                  className="sr-only"
                />
                <Building2 className="w-5 h-5" />
                <span className="font-medium">Pessoa Jurídica</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nome de Exibição <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    name="nomeExibicao"
                    value={formData.nomeExibicao}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg border outline-none transition-all ${
                      errors.nomeExibicao
                        ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    }`}
                    placeholder="Nome curto para identificação"
                    required
                  />
                </div>
                {errors.nomeExibicao && <p className="text-red-500 text-xs mt-1">{errors.nomeExibicao}</p>}
                <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                  <span className="text-blue-500">&#128161;</span>
                  O identificador será gerado automaticamente a partir do CPF/CNPJ
                </p>
              </div>

              {formData.tipoPessoa === 'Fisica' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome Completo</label>
                    <input
                      name="nomeCompleto"
                      value={formData.nomeCompleto}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      placeholder="Nome completo"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">CPF</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        name="cpf"
                        value={formData.cpf}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        placeholder="000.000.000-00"
                        maxLength={14}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">RG</label>
                    <input
                      name="rg"
                      value={formData.rg}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      placeholder="00.000.000-0"
                      maxLength={12}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Razão Social</label>
                    <input
                      name="razaoSocial"
                      value={formData.razaoSocial}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                      placeholder="Razão social da empresa"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome Fantasia</label>
                    <input
                      name="nomeFantasia"
                      value={formData.nomeFantasia}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                      placeholder="Nome fantasia"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">CNPJ</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        name="cnpj"
                        value={formData.cnpj}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                        placeholder="00.000.000/0000-00"
                        maxLength={18}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Inscrição Estadual</label>
                    <input
                      name="inscricaoEstadual"
                      value={formData.inscricaoEstadual}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                      placeholder="000.000.000.000"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ─── Contato Principal ──────────────────────────────── */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Phone className="w-5 h-5 text-emerald-600" />
              Contato Principal
            </h2>
          </div>
          <div className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Telefone Principal <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    name="telefonePrincipal"
                    value={formData.telefonePrincipal}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg border outline-none transition-all ${
                      errors.telefonePrincipal
                        ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                    }`}
                    placeholder="(00) 00000-0000"
                    required
                    maxLength={15}
                  />
                </div>
                {errors.telefonePrincipal && <p className="text-red-500 text-xs mt-1">{errors.telefonePrincipal}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Contatos Adicionais ────────────────────────────── */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-amber-600" />
              Contatos Adicionais
            </h2>
            <button
              type="button"
              onClick={adicionarContato}
              className="btn-secondary text-sm py-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Adicionar</span>
            </button>
          </div>
          <div className="p-4 md:p-6">
            {contatos.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <User className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500">Nenhum contato adicional</p>
                <p className="text-xs text-slate-400 mt-1">Clique em &quot;Adicionar&quot; para incluir contatos extras</p>
              </div>
            ) : (
              <div className="space-y-4">
                {contatos.map((contato, index) => (
                  <div key={contato.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-slate-600 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </span>
                        Contato
                      </span>
                      <button
                        type="button"
                        onClick={() => removerContato(contato.id)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Nome</label>
                        <input
                          value={contato.nome}
                          onChange={(e) => atualizarContato(contato.id, 'nome', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all text-sm"
                          placeholder="Nome do contato"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Telefone</label>
                        <input
                          value={contato.telefone}
                          onChange={(e) => atualizarContato(contato.id, 'telefone', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all text-sm"
                          placeholder="(00) 00000-0000"
                          maxLength={15}
                        />
                      </div>
                      <div className="flex items-end pb-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={contato.whatsapp}
                            onChange={(e) => atualizarContato(contato.id, 'whatsapp', e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-sm text-slate-600">WhatsApp</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ─── Endereço ───────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-rose-600" />
              Endereço
            </h2>
            <button
              type="button"
              onClick={handleCapturarLocalizacao}
              disabled={loadingGps}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                gpsCaptured
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {loadingGps ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : gpsCaptured ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Navigation className="w-4 h-4" />
              )}
              {loadingGps ? 'Obtendo...' : gpsCaptured ? 'Localização capturada!' : 'Usar minha localização'}
            </button>
          </div>
          {errors.gps && (
            <div className="mx-4 md:mx-6 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              {errors.gps}
            </div>
          )}
          <div className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  CEP <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    name="cep"
                    value={formData.cep}
                    onChange={handleCepChange}
                    className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all ${
                      errors.cep
                        ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                    }`}
                    placeholder="00000-000"
                    required
                    maxLength={9}
                  />
                </div>
                {errors.cep && <p className="text-red-500 text-xs mt-1">{errors.cep}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Logradouro <span className="text-red-500">*</span>
                </label>
                <input
                  name="logradouro"
                  value={formData.logradouro}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all"
                  placeholder="Rua, Avenida, etc."
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Número <span className="text-red-500">*</span>
                </label>
                <input
                  name="numero"
                  value={formData.numero}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all"
                  placeholder="123"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Complemento</label>
                <input
                  name="complemento"
                  value={formData.complemento}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all"
                  placeholder="Sala, Apto..."
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Bairro <span className="text-red-500">*</span>
                </label>
                <input
                  name="bairro"
                  value={formData.bairro}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all"
                  placeholder="Bairro"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Estado <span className="text-red-500">*</span>
                </label>
                <select
                  name="estado"
                  value={formData.estado}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all bg-white"
                  required
                >
                  <option value="">Selecione</option>
                  {estados.map(e => (
                    <option key={e.id} value={e.sigla}>{e.sigla} - {e.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Cidade <span className="text-red-500">*</span>
                </label>
                <select
                  name="cidade"
                  value={formData.cidade}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all bg-white"
                  required
                  disabled={!formData.estado || loadingCidades}
                >
                  <option value="">
                    {loadingCidades ? 'Carregando...' : 'Selecione'}
                  </option>
                  {cidades.map(c => (
                    <option key={c.id} value={c.nome}>{c.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Rota <span className="text-red-500">*</span>
                </label>
                <select
                  name="rotaId"
                  value={formData.rotaId}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all bg-white ${
                    errors.rotaId
                      ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                      : 'border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  }`}
                  required
                >
                  <option value="">Selecione uma rota</option>
                  {rotas.map(r => (
                    <option key={r.id} value={r.id}>{r.descricao}</option>
                  ))}
                </select>
                {errors.rotaId && <p className="text-red-500 text-xs mt-1">{errors.rotaId}</p>}
              </div>
            </div>
          </div>
        </section>

        {/* ─── Outras Informações ─────────────────────────────── */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-600" />
              Outras Informações
            </h2>
          </div>
          <div className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 outline-none transition-all bg-white"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Observação</label>
              <textarea
                name="observacao"
                value={formData.observacao}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 outline-none transition-all resize-none"
                placeholder="Observações sobre o cliente..."
              />
            </div>
          </div>
        </section>

        {/* ─── Botões de Ação - Sticky em Mobile ──────────────── */}
        <div className="fixed bottom-0 left-0 right-0 lg:static lg:mt-0 bg-white border-t border-slate-200 p-4 lg:bg-transparent lg:border-0 lg:p-0 z-10">
          <div className="max-w-7xl mx-auto flex gap-3">
            <button type="submit" disabled={loading} className="flex-1 lg:flex-none btn-primary justify-center">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {submitLoadingLabel}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {submitLabel}
                </>
              )}
            </button>
            <Link href="/clientes" className="btn-secondary hidden lg:inline-flex">
              Cancelar
            </Link>
          </div>
        </div>
      </form>
    </div>
  )
}
