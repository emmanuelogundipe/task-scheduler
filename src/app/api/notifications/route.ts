import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api';

// GET /api/notifications — notification history with filters
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const type = sp.get('type') ?? '';
  const status = sp.get('status') ?? '';
  const taskId = sp.get('taskId') ?? '';
  const handlerId = sp.get('handlerId') ?? '';
  const from = sp.get('from') ?? '';
  const to = sp.get('to') ?? '';
  const page = Math.max(1, Number(sp.get('page') ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(sp.get('pageSize') ?? 25) || 25));

  const where: any = {};
  if (type && type !== 'ALL') where.notificationType = type;
  if (status && status !== 'ALL') where.status = status;
  if (taskId) where.taskId = Number(taskId);
  if (handlerId) where.recipientUserId = Number(handlerId);
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(new Date(to).getTime() + 86399999);
  }

  const [logs, total] = await Promise.all([
    prisma.notificationLog.findMany({
      where,
      include: { task: { select: { id: true, title: true } }, recipient: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.notificationLog.count({ where }),
  ]);

  return NextResponse.json({
    notifications: logs.map((l) => ({
      id: l.id,
      type: l.notificationType,
      recipient: l.recipient?.name ?? l.recipientWhatsApp,
      recipientWhatsApp: l.recipientWhatsApp,
      task: l.task ? { id: l.task.id, title: l.task.title } : null,
      message: l.message,
      provider: l.provider,
      status: l.status,
      error: l.status === 'FAILED' ? l.providerResponse : null,
      sentAt: l.sentAt,
      createdAt: l.createdAt,
    })),
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  });
}
