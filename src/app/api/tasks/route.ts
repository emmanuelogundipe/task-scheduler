import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api';
import { notifyTaskAssigned } from '@/lib/taskService';
import { serializeTask } from '@/lib/serialize';
import { validateTaskInput } from '@/lib/validation';
import { parseZonedInput, APP_TIMEZONE } from '@/lib/time';

// GET /api/tasks — list tasks with filtering + pagination
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const status = sp.get('status') ?? '';
  const handlerId = sp.get('handlerId') ?? '';
  const search = sp.get('search') ?? '';
  const filter = sp.get('filter') ?? '';
  const page = Math.max(1, Number(sp.get('page') ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(sp.get('pageSize') ?? 50) || 50));

  const where: any = {};
  if (status && status !== 'ALL') where.status = status;
  if (handlerId) where.assignedToId = Number(handlerId);
  if (search) where.title = { contains: search };
  if (filter === 'overdue') {
    where.status = { in: ['IN_PROGRESS', 'OVERDUE'] };
    where.deadlineDateTime = { lt: new Date() };
  }

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: { assignedTo: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.task.count({ where }),
  ]);

  const settings = await prisma.settings.findFirst();
  const timezone = settings?.timezone ?? APP_TIMEZONE;

  return NextResponse.json({
    tasks: tasks.map((t) => serializeTask(t, new Date(), timezone)),
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  });
}

// POST /api/tasks — create and assign a task, notify the handler
export async function POST(req: NextRequest) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const { handlerId, title, description, startDateTime } = body;

    const validationError = validateTaskInput(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    if (!handlerId) {
      return NextResponse.json({ error: 'Please select a task handler.' }, { status: 400 });
    }

    const handler = await prisma.user.findFirst({
      where: { id: Number(handlerId), role: 'TASK_HANDLER', status: 'ACTIVE' },
    });
    if (!handler) {
      return NextResponse.json(
        { error: 'Task handler not found or is inactive.' },
        { status: 404 }
      );
    }

    const settings = await prisma.settings.findFirst();
    const timezone = settings?.timezone ?? APP_TIMEZONE;
    // The browser sends a `YYYY-MM-DDTHH:mm` wall-clock value that must be
    // interpreted in the application timezone, never the server's timezone.
    const start =
      parseZonedInput(String(startDateTime), timezone) ?? new Date(String(startDateTime));
    const duration = Math.floor(Number(body.durationMinutes));
    if (isNaN(start.getTime())) {
      return NextResponse.json({ error: 'Start time is invalid.' }, { status: 400 });
    }
    const deadline = new Date(start.getTime() + duration * 60000);

    if (deadline.getTime() <= start.getTime()) {
      return NextResponse.json({ error: 'Deadline must be later than the start time.' }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        title: String(title).trim(),
        description: String(description ?? '').trim(),
        startDateTime: start,
        deadlineDateTime: deadline,
        durationMinutes: duration,
        status: 'IN_PROGRESS',
        progressPercentage: 0,
        assignedToId: handler.id,
      },
      include: { assignedTo: true },
    });

    // Send the assignment WhatsApp + write the assignment audit entry.
    const result = await notifyTaskAssigned(task, user);

    return NextResponse.json(
      {
        task: serializeTask(task, new Date(), timezone),
        whatsappSent: result.ok,
        whatsappError: result.ok ? null : result.error ?? 'WhatsApp delivery failed.',
        message: result.ok
          ? 'Task assigned successfully. WhatsApp notification sent.'
          : 'Task created successfully, but WhatsApp notification could not be delivered.',
      },
      { status: 201 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed to create task' }, { status: 500 });
  }
}
