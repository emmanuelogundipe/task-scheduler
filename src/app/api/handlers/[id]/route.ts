import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionAdmin } from '@/lib/auth';

// PUT /api/handlers/:id — edit a task handler
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const id = Number(params.id);
    const { name, whatsapp } = await req.json();
    if (!name || !whatsapp) {
      return NextResponse.json({ error: 'Name and WhatsApp number are required' }, { status: 400 });
    }

    const handler = await prisma.handler.update({
      where: { id },
      data: { name: String(name).trim(), whatsapp: String(whatsapp).trim() },
    });
    return NextResponse.json({ handler });
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'A handler with this WhatsApp number already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/handlers/:id — remove a task handler
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const id = Number(params.id);
    const existing = await prisma.task.findFirst({ where: { handlerId: id } });
    if (existing) {
      return NextResponse.json(
        { error: 'Cannot delete: this handler has tasks assigned. Deactivate instead.' },
        { status: 409 }
      );
    }
    await prisma.handler.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
