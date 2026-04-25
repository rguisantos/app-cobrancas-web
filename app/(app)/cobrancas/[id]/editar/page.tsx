import { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Header from '@/components/layout/header'
import { formatarMoeda } from '@/shared/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, Calculator, AlertTriangle, Clock, Settings, Hash } from 'lucide-react'
import EditarCobrancaForm from './form'

export const metadata: Metadata = { title: 'Editar Cobrança' }

export default async function EditarCobrancaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()

  if (!session?.user.permissoesWeb?.todosCadastros) {
    redirect('/cobrancas')
  }

  const cobranca = await prisma.cobranca.findFirst({
    where: { id, deletedAt: null },
    include: {
      cliente: { select: { nomeExibicao: true } },
      locacao: { 
        select: { 
          id: true,
          produtoTipo: true, 
          produtoIdentificador: true,
          status: true,
          precoFicha: true,
          cobrancas: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true }
          }
        } 
      }
    }
  })

  if (!cobranca) notFound()

  // Verificar se é a última cobrança da locação ativa
  const isUltimaCobranca = 
    cobranca.locacao?.cobrancas?.[0]?.id === cobranca.id && 
    cobranca.locacao?.status === 'Ativa'

  // Buscar o saldo anterior da cobrança anterior (mesma locação)
  const cobrancaAnterior = await prisma.cobranca.findFirst({
    where: {
      locacaoId: cobranca.locacaoId,
      deletedAt: null,
      id: { not: id },
      createdAt: { lt: cobranca.createdAt }
    },
    orderBy: { createdAt: 'desc' },
    select: { saldoDevedorGerado: true }
  })
  const saldoAnterior = cobrancaAnterior?.saldoDevedorGerado ?? 0

  if (!isUltimaCobranca) {
    return (
      <div>
        <Header
          title="Editar Cobrança"
          actions={
            <Link href={`/cobrancas/${id}`} className="btn-secondary text-sm">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Link>
          }
        />
        <div className="max-w-7xl mx-auto px-4">
          <div className="card p-8 text-center mt-6">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Edição não permitida</h2>
            <p className="text-slate-600 mb-4">
              Apenas a última cobrança de uma locação ativa pode ser editada.
            </p>
            <Link href={`/cobrancas/${id}`} className="btn-primary">
              Ver detalhes da cobrança
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header
        title="Editar Cobrança"
        subtitle={`${cobranca.cliente?.nomeExibicao ?? cobranca.clienteNome} - ${cobranca.produtoIdentificador}`}
        actions={
          <Link href={`/cobrancas/${id}`} className="btn-secondary text-sm">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
        }
      />

      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Formulário de Edição */}
          <div className="lg:col-span-2">
            <EditarCobrancaForm 
              cobranca={cobranca} 
              saldoAnterior={saldoAnterior}
              precoFicha={cobranca.locacao?.precoFicha ?? cobranca.valorFicha}
            />
          </div>

          {/* Sidebar - Informações */}
          <div className="space-y-6">
            {/* Resumo Original */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-slate-600" />
                  Dados Originais
                </h3>
              </div>
              <div className="p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Relógio Anterior</span>
                  <span className="font-mono font-medium">{cobranca.relogioAnterior.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Relógio Atual</span>
                  <span className="font-mono font-medium">{cobranca.relogioAtual.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fichas Rodadas</span>
                  <span className="font-bold text-purple-700">{cobranca.fichasRodadas.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Valor da Ficha</span>
                  <span>{formatarMoeda(cobranca.valorFicha)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Bruto</span>
                  <span>{formatarMoeda(cobranca.totalBruto)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">% Empresa</span>
                  <span>{cobranca.percentualEmpresa}%</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-100">
                  <span className="text-slate-700 font-medium">Total Cliente Paga</span>
                  <span className="font-bold text-emerald-700">{formatarMoeda(cobranca.totalClientePaga)}</span>
                </div>
                {saldoAnterior > 0 && (
                  <div className="flex justify-between pt-2 border-t border-red-100 bg-red-50 -mx-4 px-4 py-2">
                    <span className="text-red-600 font-medium">Saldo Anterior</span>
                    <span className="font-bold text-red-600">{formatarMoeda(saldoAnterior)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Período */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-blue-100/50 border-b">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Período
                </h3>
              </div>
              <div className="p-4">
                <p className="text-sm text-slate-700">
                  {format(new Date(cobranca.dataInicio), 'dd/MM/yyyy', { locale: ptBR })} — {format(new Date(cobranca.dataFim), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              </div>
            </div>

            {/* Aviso sobre edição */}
            <div className="card p-4 bg-blue-50 border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Campos Editáveis
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Relógio Anterior e Atual</li>
                <li>• Descontos (partidas e dinheiro)</li>
                <li>• Valor Recebido</li>
                <li>• Status do Pagamento</li>
                <li>• Observação</li>
              </ul>
            </div>

            {/* Aviso sobre recálculo */}
            <div className="card p-4 bg-amber-50 border-amber-200">
              <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Atenção
              </h3>
              <p className="text-sm text-amber-700">
                Ao alterar o relógio ou descontos, os valores serão recalculados automaticamente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
