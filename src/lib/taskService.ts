// ============================================================
// Task service — assignment notification + audit logging used
// by the task API routes.
// ============================================================

import { prisma } from './prisma';
import { sendAndLog, taskAssignedMessage, type TaskLike } from './notifications';
import { logAudit } from './audit';
import { APP_TIMEZONE } from './time';
import type { User } from '@prisma/client';

export async function notifyTaskAssigned(
  task: any & { assignedTo: User },
  admin: { id: number; name: string }
) {
  const settings = await prisma.settings.findFirst();
  const timezone = settings?.timezone ?? APP_TIMEZONE;

  await logAudit({
    action: 'TASK_CREATED',
    userId: admin.id,
    taskId: task.id,
    details: `'${task.title}' assigned to ${task.assignedTo.name}`,
  });

  const result = await sendAndLog({
    taskId: task.id,
    recipientUserId: task.assignedTo.id,
    type: 'TASK_ASSIGNED',
    to: task.assignedTo.whatsappNumber,
    message: taskAssignedMessage(task as TaskLike, task.assignedTo.name, timezone),
    timezone,
  });

  return result;
}
