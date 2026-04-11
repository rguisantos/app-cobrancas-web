import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function gerarChave(): string {
  return 'DEV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

// GET - Listar dispositivos
export async function GET() {
  try {
    const dispositivos = await prisma.dispositivo.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(dispositivos);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao listar dispositivos' }, { status: 500 });
  }
}

// POST - Criar dispositivo
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user || session.user.tipoPermissao !== 'Administrador') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { nome, tipo = 'Celular', senhaNumerica } = body;

    if (!nome) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    const dispositivo = await prisma.dispositivo.create({
      data: {
        nome,
        tipo,
        chave: gerarChave(),
        senhaNumerica: senhaNumerica || null,
        status: 'ativo'
      }
    });

    return NextResponse.json(dispositivo);
  } catch (error) {
    console.error('Erro ao criar dispositivo:', error);
    return NextResponse.json({ error: 'Erro ao criar dispositivo' }, { status: 500 });
  }
}
