import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// PATCH - Atualizar dispositivo (ex: regenerar senha)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user || session.user.tipoPermissao !== 'Administrador') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { senhaNumerica, status, nome } = body;

    const dispositivo = await prisma.dispositivo.update({
      where: { id },
      data: {
        ...(senhaNumerica !== undefined && { senhaNumerica }),
        ...(status && { status }),
        ...(nome && { nome }),
        updatedAt: new Date()
      }
    });

    return NextResponse.json(dispositivo);
  } catch (error) {
    console.error('Erro ao atualizar dispositivo:', error);
    return NextResponse.json({ error: 'Erro ao atualizar dispositivo' }, { status: 500 });
  }
}

// DELETE - Excluir dispositivo
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user || session.user.tipoPermissao !== 'Administrador') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    await prisma.dispositivo.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir dispositivo:', error);
    return NextResponse.json({ error: 'Erro ao excluir dispositivo' }, { status: 500 });
  }
}
