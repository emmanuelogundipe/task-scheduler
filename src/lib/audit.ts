// ============================================================
// Audit log — records important administrative and system
// events. Never throws: auditing must not break a request.
// ============================================================

import { prisma } from './prisma';

export interface AuditInput {
  action: string;
  userId?: number | null;
  taskId?: number | null;
  details?: string | null;
}

export async function logAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        userId: input.userId ?? null,
        taskId: input.taskId ?? null,
        details: input.details ?? null,
      },
    });
  } catch (e) {
    console.error('[audit] failed to write audit log:', e);
  }
}
