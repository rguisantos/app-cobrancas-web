import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const meta = await prisma.meta.update({
      where: { id },
      data: body,
    })

    return NextResponse.json(meta)
  } catch (error) {
    console.error('Erro ao atualizar meta:', error)
    return NextResponse.json({ error: 'Erro ao atualizar meta' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.meta.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir meta:', error)
    return NextResponse.json({ error: 'Erro ao excluir meta' }, { status: 500 })
  }
}
