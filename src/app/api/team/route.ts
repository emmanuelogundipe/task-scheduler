import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { isValidWhatsApp, normalizeWhatsApp } from '@/lib/validation';

// GET /api/team — list all task handlers (active + inactive)
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const activeOnly = req.nextUrl.searchParams.get('activeOnly') === 'true';
  const users = await prisma.user.findMany({
    where: { role: 'TASK_HANDLER', ...(activeOnly ? { status: 'ACTIVE' } : {}) },
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { assignedTasks: true } } },
  });

  return NextResponse.json({
    handlers: users.map((u) => ({
      id: u.id,
      name: u.name,
      whatsappNumber: u.whatsappNumber,
      status: u.status,
      taskCount: u._count.assignedTasks,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    })),
  });
}

// POST /api/team — add a task handler
export async function POST(req: NextRequest) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  try {
    const { name, whatsappNumber } = await req.json();
    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    }
    if (!whatsappNumber || !isValidWhatsApp(whatsappNumber)) {
      return NextResponse.json({ error: 'A valid WhatsApp number is required (8–15 digits).' }, { status: 400 });
    }

    const normalized = normalizeWhatsApp(whatsappNumber);
    const handler = await prisma.user.create({
      data: {
        name: String(name).trim(),
        whatsappNumber: normalized,
        role: 'TASK_HANDLER',
        status: 'ACTIVE',
      },
    });
    await logAudit({
      action: 'HANDLER_ADDED',
      userId: user.id,
      details: `${handler.name} (${handler.whatsappNumber}) added`,
    });
    return NextResponse.json({ handler }, { status: 201 });
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'A user with this WhatsApp number already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: e?.message ?? 'Failed to add handler' }, { status: 500 });
  }
}
