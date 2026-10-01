import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionAdmin } from '@/lib/auth';

// PATCH /api/tasks/:id — status transitions
//   action: "submit"  → IN_PROGRESS     → PENDING_APPROVAL
//   action: "approve" → PENDING_APPROVAL → COMPLETED (halts all reminders)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const id = Number(params.id);
    const { action } = await req.json();

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (action === 'submit') {
      if (existing.status !== 'IN_PROGRESS') {
        return NextResponse.json({ error: 'Only In Progress tasks can be submitted' }, { status: 400 });
      }
      const task = await prisma.task.update({
        where: { id },
        data: { status: 'PENDING_APPROVAL' },
        include: { handler: true },
      });
      return NextResponse.json({ task });
    }

    if (action === 'approve') {
      if (existing.status !== 'PENDING_APPROVAL') {
        return NextResponse.json(
          { error: 'Only Pending Approval tasks can be approved' },
          { status: 400 }
        );
      }
      const task = await prisma.task.update({
        where: { id },
        data: { status: 'COMPLETED', completedAt: new Date() },
        include: { handler: true },
      });
      return NextResponse.json({ task });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
