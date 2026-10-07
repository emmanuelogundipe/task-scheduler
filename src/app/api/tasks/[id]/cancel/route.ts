import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api';
import { serializeTask } from '@/lib/serialize';
import { logAudit } from '@/lib/audit';
import { APP_TIMEZONE } from '@/lib/time';

// POST /api/tasks/:id/cancel — cancel a task and halt reminders
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const id = Number(params.id);
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  if (existing.status === 'COMPLETED') {
    return NextResponse.json({ error: 'Completed tasks cannot be cancelled.' }, { status: 400 });
  }

  const task = await prisma.task.update({
    where: { id },
    data: {
      status: 'CANCELLED',
      dayBeforeReminderSent: true,
      deadlineNotificationSent: true,
    },
    include: { assignedTo: true },
  });
  await logAudit({ action: 'TASK_CANCELLED', userId: user.id, taskId: id, details: `'${task.title}' cancelled` });

  const settings = await prisma.settings.findFirst();
  return NextResponse.json({ task: serializeTask(task, new Date(), settings?.timezone ?? APP_TIMEZONE) });
}
