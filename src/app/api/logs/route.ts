import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api';

// GET /api/logs — audit log with optional action filter
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const action = sp.get('action') ?? '';
  const page = Math.max(1, Number(sp.get('page') ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(sp.get('pageSize') ?? 50) || 50));

  const where: any = {};
  if (action && action !== 'ALL') where.action = action;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true } }, task: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({
    logs: logs.map((l) => ({
      id: l.id,
      action: l.action,
      user: l.user?.name ?? 'System',
      task: l.task?.title ?? null,
      details: l.details,
      createdAt: l.createdAt,
    })),
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  });
}
