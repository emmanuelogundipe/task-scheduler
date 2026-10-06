import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api';
import { serializeTask } from '@/lib/serialize';
import { logAudit } from '@/lib/audit';
import { APP_TIMEZONE } from '@/lib/time';

// POST /api/tasks/:id/approve — approve finished work, stop reminders
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const id = Number(params.id);
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  if (existing.status !== 'PENDING_APPROVAL') {
    return NextResponse.json({ error: 'Only tasks pending approval can be approved.' }, { status: 400 });
  }

  const now = new Date();
  const task = await prisma.task.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      approvedAt: now,
      approvedById: user.id,
      completedAt: existing.completedAt ?? now,
      progressPercentage: 100,
      deadlineNotificationSent: true,
      milestone50Sent: true,
      milestone70Sent: true,
    },
    include: { assignedTo: true, approvedBy: true },
  });
  await logAudit({ action: 'TASK_APPROVED', userId: user.id, taskId: id, details: `'${task.title}' approved` });

  const settings = await prisma.settings.findFirst();
  return NextResponse.json({ task: serializeTask(task, now, settings?.timezone ?? APP_TIMEZONE) });
}
