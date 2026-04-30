import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ReciboTermicoPrint } from './recibo-print'

export const dynamic = 'force-dynamic'

export default async function ImprimirReciboPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) notFound()

  const cobranca = await prisma.cobranca.findFirst({
    where: { id, deletedAt: null },
    include: {
      cliente: {
        select: {
          nomeExibicao: true,
          cpf: true,
          cnpj: true,
          tipoPessoa: true,
          telefonePrincipal: true,
        },
      },
      locacao: {
        select: {
          produtoTipo: true,
          produtoIdentificador: true,
        },
      },
    },
  })

  if (!cobranca) notFound()

  // Buscar saldo anterior
  const cobrancaAnterior = await prisma.cobranca.findFirst({
    where: {
      locacaoId: cobranca.locacaoId,
      deletedAt: null,
      id: { not: id },
      createdAt: { lt: cobranca.createdAt },
    },
    orderBy: { createdAt: 'desc' },
    select: { saldoDevedorGerado: true },
  })
  const saldoAnterior = cobrancaAnterior?.saldoDevedorGerado ?? 0

  return <ReciboTermicoPrint cobranca={cobranca} saldoAnterior={saldoAnterior} />
}
