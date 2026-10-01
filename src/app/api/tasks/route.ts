import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionAdmin } from '@/lib/auth';
import { notifyWhatsApp } from '@/lib/notifications';
import { createCalendarEvent } from '@/lib/googleCalendar';

// GET /api/tasks — list all tasks (newest first)
export async function GET() {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tasks = await prisma.task.findMany({
    include: { handler: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ tasks });
}

// POST /api/tasks — create a task, notify the handler, add to calendar
export async function POST(req: NextRequest) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { handlerId, title, description, startTime, durationMinutes } = await req.json();

    // ---- Validation ----
    if (!handlerId || !title || !startTime || !durationMinutes) {
      return NextResponse.json(
        { error: 'handlerId, title, startTime and durationMinutes are required' },
        { status: 400 }
      );
    }
    const duration = Number(durationMinutes);
    if (!Number.isFinite(duration) || duration <= 0) {
      return NextResponse.json(
        { error: 'Duration must be a positive number of minutes' },
        { status: 400 }
      );
    }

    const handler = await prisma.handler.findFirst({
      where: { id: Number(handlerId), active: true },
    });
    if (!handler) {
      return NextResponse.json({ error: 'Task handler not found' }, { status: 404 });
    }

    const start = new Date(startTime);
    if (isNaN(start.getTime())) {
      return NextResponse.json({ error: 'Invalid start time' }, { status: 400 });
    }
    const deadline = new Date(start.getTime() + duration * 60000);

    // ---- 1. Save task with status "In Progress" ----
    const task = await prisma.task.create({
      data: {
        title: String(title).trim(),
        description: String(description ?? '').trim(),
        startTime: start,
        durationMinutes: duration,
        deadline,
        handlerId: handler.id,
        adminId: admin.id,
        status: 'IN_PROGRESS',
      },
      include: { handler: true },
    });

    // ---- 2. Instant WhatsApp message to the assigned handler ----
    const handlerMsg = [
      `📋 New Task Assigned`,
      ``,
      `Task: ${task.title}`,
      `Description: ${task.description || '—'}`,
      `Start: ${start.toLocaleString()}`,
      `Duration: ${duration} min`,
      `Deadline: ${deadline.toLocaleString()}`,
      ``,
      `Please begin immediately and notify the admin when finished.`,
    ].join('\n');
    await notifyWhatsApp(task.id, handler.whatsapp, handlerMsg);

    // ---- 3. Google Calendar event with task details + deadline ----
    await createCalendarEvent({
      summary: `📋 ${task.title}`,
      description: [
        `Handler: ${handler.name} (${handler.whatsapp})`,
        `Duration: ${duration} min`,
        `Deadline: ${deadline.toLocaleString()}`,
        task.description ? `\n${task.description}` : '',
      ].join('\n'),
      start,
      end: deadline,
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
