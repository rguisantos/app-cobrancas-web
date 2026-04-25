import Link from 'next/link'
import Header from '@/components/layout/header'
import {
  DollarSign,
  CreditCard,
  AlertTriangle,
  FileText,
  MapPin,
  Package,
  Warehouse,
  Wrench,
  Timer,
  Users,
  Route,
  Activity,
  ChevronRight,
  GitCompare,
  type LucideIcon,
} from 'lucide-react'

interface Report {
  href: string
  title: string
  description: string
  icon: LucideIcon
  colorClass: string
}

interface ReportCategory {
  emoji: string
  title: string
  colorClass: string
  reports: Report[]
}

const categories: ReportCategory[] = [
  {
    emoji: '💰',
    title: 'Financeiro',
    colorClass: 'bg-blue-50 text-blue-600',
    reports: [
      {
        href: '/relatorios/financeiro',
        title: 'Financeiro',
        description: 'Receitas, despesas, comparativos e análise financeira completa',
        icon: DollarSign,
        colorClass: 'bg-blue-50 text-blue-600',
      },
      {
        href: '/relatorios/recebimentos',
        title: 'Recebimentos',
        description: 'Acompanhamento de pagamentos recebidos e pendentes',
        icon: CreditCard,
        colorClass: 'bg-blue-50 text-blue-600',
      },
      {
        href: '/relatorios/inadimplencia',
        title: 'Inadimplência',
        description: 'Análise de débitos, atrasos e inadimplentes',
        icon: AlertTriangle,
        colorClass: 'bg-blue-50 text-blue-600',
      },
    ],
  },
  {
    emoji: '📋',
    title: 'Locações',
    colorClass: 'bg-emerald-50 text-emerald-600',
    reports: [
      {
        href: '/relatorios/locacoes',
        title: 'Locações',
        description: 'Visão geral de todas as locações, ativas e encerradas',
        icon: FileText,
        colorClass: 'bg-emerald-50 text-emerald-600',
      },
      {
        href: '/relatorios/locacoes-rota',
        title: 'Locações por Rota',
        description: 'Distribuição e performance de locações por rota',
        icon: MapPin,
        colorClass: 'bg-emerald-50 text-emerald-600',
      },
    ],
  },
  {
    emoji: '🎱',
    title: 'Produtos',
    colorClass: 'bg-purple-50 text-purple-600',
    reports: [
      {
        href: '/relatorios/produtos',
        title: 'Produtos',
        description: 'Análise de produtos, tipos e conservação',
        icon: Package,
        colorClass: 'bg-purple-50 text-purple-600',
      },
      {
        href: '/relatorios/estoque',
        title: 'Estoque',
        description: 'Produtos disponíveis, locados e em manutenção',
        icon: Warehouse,
        colorClass: 'bg-purple-50 text-purple-600',
      },
      {
        href: '/relatorios/manutencoes',
        title: 'Manutenções',
        description: 'Histórico de manutenções e trocas de pano',
        icon: Wrench,
        colorClass: 'bg-purple-50 text-purple-600',
      },
      {
        href: '/relatorios/relogios',
        title: 'Relógios',
        description: 'Histórico de alterações de contadores/relógios',
        icon: Timer,
        colorClass: 'bg-purple-50 text-purple-600',
      },
    ],
  },
  {
    emoji: '👥',
    title: 'Clientes e Rotas',
    colorClass: 'bg-cyan-50 text-cyan-600',
    reports: [
      {
        href: '/relatorios/clientes',
        title: 'Clientes',
        description: 'Análise de clientes, receitas e distribuição geográfica',
        icon: Users,
        colorClass: 'bg-cyan-50 text-cyan-600',
      },
      {
        href: '/relatorios/rotas',
        title: 'Rotas',
        description: 'Performance e comparativo entre rotas',
        icon: Route,
        colorClass: 'bg-cyan-50 text-cyan-600',
      },
    ],
  },
  {
    emoji: '⚡',
    title: 'Operacional',
    colorClass: 'bg-amber-50 text-amber-600',
    reports: [
      {
        href: '/relatorios/operacional',
        title: 'Operacional',
        description: 'Volume operacional, produtividade e tendências',
        icon: Activity,
        colorClass: 'bg-amber-50 text-amber-600',
      },
    ],
  },
  {
    emoji: '📊',
    title: 'Comparativo',
    colorClass: 'bg-indigo-50 text-indigo-600',
    reports: [
      {
        href: '/relatorios/comparativo',
        title: 'Comparativo de Períodos',
        description: 'Compare receitas, cobranças e inadimplência entre períodos',
        icon: GitCompare,
        colorClass: 'bg-indigo-50 text-indigo-600',
      },
    ],
  },
]

export default function RelatoriosPage() {
  return (
    <div className="space-y-8">
      <Header title="Relatórios" subtitle="Análises detalhadas do seu negócio" />

      {categories.map((category) => (
        <section key={category.title}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">{category.emoji}</span>
            <h2 className="text-lg font-semibold text-slate-800">{category.title}</h2>
            <div className="flex-1 h-px bg-slate-200 ml-3" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {category.reports.map((report) => {
              const Icon = report.icon
              return (
                <Link
                  key={report.href}
                  href={report.href}
                  className="card p-5 hover:shadow-lg transition-all duration-200 group cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${report.colorClass} flex-shrink-0`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 group-hover:text-primary-600 transition-colors">
                        {report.title}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">{report.description}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary-400 transition-colors flex-shrink-0 mt-1" />
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
