import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api';
import { serializeTask } from '@/lib/serialize';
import { logAudit } from '@/lib/audit';
import { sendAndLog } from '@/lib/notifications';
import { parseZonedInput, APP_TIMEZONE } from '@/lib/time';
import { validateTaskInput } from '@/lib/validation';

// GET /api/tasks/:id
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const task = await prisma.task.findUnique({
    where: { id: Number(params.id) },
    include: { assignedTo: true, approvedBy: true },
  });
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  const settings = await prisma.settings.findFirst();
  return NextResponse.json({ task: serializeTask(task, new Date(), settings?.timezone ?? APP_TIMEZONE) });
}

// PATCH /api/tasks/:id — edit or run a lifecycle action.
// Body: { action: 'complete'|'approve'|'cancel'|'reopen' } or editable fields.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  try {
    const id = Number(params.id);
    const body = await req.json();
    const existing = await prisma.task.findUnique({ where: { id }, include: { assignedTo: true } });
    if (!existing) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const settings = await prisma.settings.findFirst();
    const timezone = settings?.timezone ?? APP_TIMEZONE;

    // ----- Lifecycle actions -----
    if (body.action === 'complete') {
      // Handler/admin marks work finished → awaiting approval.
      if (existing.status !== 'IN_PROGRESS' && existing.status !== 'OVERDUE') {
        return NextResponse.json({ error: 'Only active tasks can be marked complete.' }, { status: 400 });
      }
      const task = await prisma.task.update({
        where: { id },
        data: { status: 'PENDING_APPROVAL', completedAt: new Date() },
        include: { assignedTo: true },
      });
      await logAudit({
        action: 'TASK_COMPLETED',
        userId: user.id,
        taskId: id,
        details: `'${task.title}' marked complete — awaiting approval`,
      });
      return NextResponse.json({ task: serializeTask(task, new Date(), timezone) });
    }

    if (body.action === 'approve') {
      if (existing.status !== 'PENDING_APPROVAL') {
        return NextResponse.json(
          { error: 'Only tasks pending approval can be approved.' },
          { status: 400 }
        );
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
          // Ensure all future automated reminders are permanently stopped.
          deadlineNotificationSent: true,
          milestone50Sent: true,
          milestone70Sent: true,
        },
        include: { assignedTo: true, approvedBy: true },
      });
      await logAudit({
        action: 'TASK_APPROVED',
        userId: user.id,
        taskId: id,
        details: `'${task.title}' approved by ${user.name}`,
      });
      return NextResponse.json({ task: serializeTask(task, now, timezone) });
    }

    if (body.action === 'cancel') {
      if (existing.status === 'COMPLETED') {
        return NextResponse.json({ error: 'Completed tasks cannot be cancelled.' }, { status: 400 });
      }
      const task = await prisma.task.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          deadlineNotificationSent: true,
          milestone50Sent: true,
          milestone70Sent: true,
        },
        include: { assignedTo: true },
      });
      await logAudit({
        action: 'TASK_CANCELLED',
        userId: user.id,
        taskId: id,
        details: `'${task.title}' cancelled by ${user.name}`,
      });
      return NextResponse.json({ task: serializeTask(task, new Date(), timezone) });
    }

    if (body.action === 'reopen') {
      const task = await prisma.task.update({
        where: { id },
        data: { status: 'IN_PROGRESS' },
        include: { assignedTo: true },
      });
      await logAudit({ action: 'TASK_REOPENED', userId: user.id, taskId: id, details: `'${task.title}' reopened` });
      return NextResponse.json({ task: serializeTask(task, new Date(), timezone) });
    }

    // ----- Plain edit -----
    const validationError = validateTaskInput({
      title: body.title ?? existing.title,
      startDateTime: body.startDateTime ?? existing.startDateTime,
      durationMinutes: body.durationMinutes ?? existing.durationMinutes,
    });
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const start = body.startDateTime
      ? parseZonedInput(body.startDateTime, timezone) ?? new Date(body.startDateTime)
      : existing.startDateTime;
    const duration = body.durationMinutes ? Math.floor(Number(body.durationMinutes)) : existing.durationMinutes;
    const deadline = new Date(start.getTime() + duration * 60000);

    if (deadline.getTime() <= start.getTime()) {
      return NextResponse.json({ error: 'Deadline must be later than the start time.' }, { status: 400 });
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        title: body.title ? String(body.title).trim() : existing.title,
        description: body.description !== undefined ? String(body.description).trim() : existing.description,
        startDateTime: start,
        durationMinutes: duration,
        deadlineDateTime: deadline,
      },
      include: { assignedTo: true },
    });
    await logAudit({ action: 'TASK_EDITED', userId: user.id, taskId: id, details: `'${task.title}' updated` });
    return NextResponse.json({ task: serializeTask(task, new Date(), timezone) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed to update task' }, { status: 500 });
  }
}

// DELETE /api/tasks/:id
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  try {
    const id = Number(params.id);
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    await prisma.task.delete({ where: { id } });
    await logAudit({ action: 'TASK_DELETED', userId: user.id, details: `Deleted '${existing.title}'` });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed to delete task' }, { status: 500 });
  }
}
