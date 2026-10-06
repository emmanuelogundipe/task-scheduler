import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { isValidWhatsApp, normalizeWhatsApp } from '@/lib/validation';

// PATCH /api/team/:id — edit details and/or activate/deactivate
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  try {
    const id = Number(params.id);
    const body = await req.json();
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Task handler not found.' }, { status: 404 });
    if (existing.role !== 'TASK_HANDLER') {
      return NextResponse.json({ error: 'Only task handlers can be edited here.' }, { status: 400 });
    }

    const data: any = {};
    if (body.name !== undefined) {
      if (!String(body.name).trim()) {
        return NextResponse.json({ error: 'Name cannot be empty.' }, { status: 400 });
      }
      data.name = String(body.name).trim();
    }
    if (body.whatsappNumber !== undefined) {
      if (!isValidWhatsApp(body.whatsappNumber)) {
        return NextResponse.json({ error: 'A valid WhatsApp number is required.' }, { status: 400 });
      }
      data.whatsappNumber = normalizeWhatsApp(body.whatsappNumber);
    }
    if (body.status !== undefined) {
      if (!['ACTIVE', 'INACTIVE'].includes(body.status)) {
        return NextResponse.json({ error: 'Status must be ACTIVE or INACTIVE.' }, { status: 400 });
      }
      data.status = body.status;
    }

    const handler = await prisma.user.update({ where: { id }, data });
    await logAudit({
      action: data.status === 'INACTIVE' ? 'HANDLER_DEACTIVATED' : 'HANDLER_EDITED',
      userId: user.id,
      details: `${handler.name} (${handler.whatsappNumber}) updated`,
    });
    return NextResponse.json({ handler });
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'A user with this WhatsApp number already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: e?.message ?? 'Failed to update handler' }, { status: 500 });
  }
}

// DELETE /api/team/:id — deactivate if the handler has history,
// otherwise remove entirely. Historical task records are preserved.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  try {
    const id = Number(params.id);
    const existing = await prisma.user.findUnique({
      where: { id },
      include: { _count: { select: { assignedTasks: true } } },
    });
    if (!existing) return NextResponse.json({ error: 'Task handler not found.' }, { status: 404 });

    if (existing._count.assignedTasks > 0) {
      const handler = await prisma.user.update({ where: { id }, data: { status: 'INACTIVE' } });
      await logAudit({
        action: 'HANDLER_DEACTIVATED',
        userId: user.id,
        details: `${handler.name} deactivated (has ${existing._count.assignedTasks} historical tasks)`,
      });
      return NextResponse.json({
        handler,
        deactivated: true,
        message: 'Handler has historical tasks and was deactivated instead of deleted.',
      });
    }

    await prisma.user.delete({ where: { id } });
    await logAudit({ action: 'HANDLER_DELETED', userId: user.id, details: `${existing.name} deleted` });
    return NextResponse.json({ ok: true, deactivated: false });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed to delete handler' }, { status: 500 });
  }
}
