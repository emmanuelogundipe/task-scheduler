import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api';
import { progressPercentage, dayBounds, APP_TIMEZONE } from '@/lib/time';

// GET /api/dashboard/stats — overview statistics + recent activity
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const now = new Date();
  const settings = await prisma.settings.findFirst();
  const timezone = settings?.timezone ?? APP_TIMEZONE;
  const { start: dayStart, end: dayEnd } = dayBounds(now, timezone);
  const soon = new Date(now.getTime() + 6 * 60 * 60 * 1000);

  const [
    total,
    inProgress,
    pendingApproval,
    completed,
    overdue,
    dueToday,
    dueSoon,
    assignedToday,
    recentAudits,
    handlers,
  ] = await Promise.all([
    prisma.task.count(),
    prisma.task.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.task.count({ where: { status: 'PENDING_APPROVAL' } }),
    prisma.task.count({ where: { status: 'COMPLETED' } }),
    prisma.task.count({
      where: {
        status: { in: ['IN_PROGRESS', 'OVERDUE'] },
        deadlineDateTime: { lt: now },
      },
    }),
    prisma.task.count({
      where: { status: { in: ['IN_PROGRESS'] }, deadlineDateTime: { gte: dayStart, lte: dayEnd } },
    }),
    prisma.task.count({
      where: { status: { in: ['IN_PROGRESS'] }, deadlineDateTime: { gte: now, lte: soon } },
    }),
    prisma.task.count({ where: { createdAt: { gte: dayStart, lte: dayEnd } } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 12, include: { user: true, task: true } }),
    prisma.user.count({ where: { role: 'TASK_HANDLER', status: 'ACTIVE' } }),
  ]);

  const activeTasks = await prisma.task.findMany({
    where: { status: 'IN_PROGRESS' },
    include: { assignedTo: true },
    orderBy: { deadlineDateTime: 'asc' },
    take: 8,
  });

  return NextResponse.json({
    stats: {
      total,
      inProgress,
      pendingApproval,
      completed,
      overdue,
      dueToday,
      dueSoon,
      assignedToday,
      handlers,
    },
    activeTasks: activeTasks.map((t) => ({
      id: t.id,
      title: t.title,
      handler: t.assignedTo?.name ?? '—',
      deadlineTime: new Date(t.deadlineDateTime).toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: '2-digit',
      }),
      progress: progressPercentage(new Date(t.startDateTime), t.durationMinutes, now),
      overdue: now.getTime() > new Date(t.deadlineDateTime).getTime(),
    })),
    recentActivity: recentAudits.map((a) => ({
      id: a.id,
      action: a.action,
      details: a.details,
      user: a.user?.name ?? 'System',
      task: a.task?.title ?? null,
      createdAt: new Date(a.createdAt).toISOString(),
    })),
  });
}
