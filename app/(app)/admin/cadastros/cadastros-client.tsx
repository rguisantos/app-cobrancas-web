'use client'

import Link from 'next/link'
import { Tag, FileText, Ruler, Building2, ChevronRight } from 'lucide-react'

const cadastros = [
  {
    href: '/admin/cadastros/tipos-produto',
    title: 'Tipos de Produto',
    description: 'Cadastre tipos como Bilhar, Jukebox, Mesa, etc.',
    icon: Tag,
    color: 'bg-blue-500',
    shadowColor: 'shadow-blue-500/30',
    gradientFrom: 'from-blue-50',
    gradientTo: 'to-blue-50',
    borderColor: 'border-blue-100',
  },
  {
    href: '/admin/cadastros/descricoes-produto',
    title: 'Descrições de Produto',
    description: 'Cadastre descrições como Azul, Branco, Preto, etc.',
    icon: FileText,
    color: 'bg-emerald-500',
    shadowColor: 'shadow-emerald-500/30',
    gradientFrom: 'from-emerald-50',
    gradientTo: 'to-emerald-50',
    borderColor: 'border-emerald-100',
  },
  {
    href: '/admin/cadastros/tamanhos-produto',
    title: 'Tamanhos de Produto',
    description: 'Cadastre tamanhos como 2,00 / 2,20 / Grande, etc.',
    icon: Ruler,
    color: 'bg-amber-500',
    shadowColor: 'shadow-amber-500/30',
    gradientFrom: 'from-amber-50',
    gradientTo: 'to-amber-50',
    borderColor: 'border-amber-100',
  },
  {
    href: '/admin/cadastros/estabelecimentos',
    title: 'Estabelecimentos',
    description: 'Cadastre locais como Barracão, Depósito Central, etc.',
    icon: Building2,
    color: 'bg-purple-500',
    shadowColor: 'shadow-purple-500/30',
    gradientFrom: 'from-purple-50',
    gradientTo: 'to-purple-50',
    borderColor: 'border-purple-100',
  },
]

export default function CadastrosClient() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
      {cadastros.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`card p-6 bg-gradient-to-br ${item.gradientFrom} ${item.gradientTo} ${item.borderColor} hover:shadow-lg transition-all duration-200 group`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center shadow-lg ${item.shadowColor}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-lg group-hover:text-primary-700 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all mt-1" />
            </div>
          </Link>
        )
      })}
    </div>
  )
}
