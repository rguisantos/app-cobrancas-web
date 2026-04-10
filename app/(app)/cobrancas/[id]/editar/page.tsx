import { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Header from '@/components/layout/header'
import { formatarMoeda } from '@/shared/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, Calculator, AlertTriangle } from 'lucide-react'
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
        <div className="card p-8 text-center">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário de Edição */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <h2 className="font-semibold text-slate-900 mb-6">📝 Dados Editáveis</h2>
            <EditarCobrancaForm cobranca={cobranca} />
          </div>
        </div>

        {/* Sidebar - Informações */}
        <div className="space-y-6">
          {/* Resumo Original */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-4">📊 Dados Originais</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Relógio Anterior</span>
                <span className="font-mono">{cobranca.relogioAnterior}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Relógio Atual</span>
                <span className="font-mono">{cobranca.relogioAtual}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fichas Rodadas</span>
                <span className="font-bold">{cobranca.fichasRodadas}</span>
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
                <span className="text-slate-500 font-medium">Total Cliente Paga</span>
                <span className="font-bold text-green-700">{formatarMoeda(cobranca.totalClientePaga)}</span>
              </div>
            </div>
          </div>

          {/* Período */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-4">📅 Período</h3>
            <p className="text-sm">
              {format(new Date(cobranca.dataInicio), 'dd/MM/yyyy', { locale: ptBR })} — {format(new Date(cobranca.dataFim), 'dd/MM/yyyy', { locale: ptBR })}
            </p>
          </div>

          {/* Aviso */}
          <div className="card p-5 bg-blue-50 border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">ℹ️ Informação</h3>
            <p className="text-sm text-blue-700">
              Os campos editáveis são: valor recebido, descontos, status e observação. 
              As leituras do relógio e quantidade de fichas não podem ser alterados.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
