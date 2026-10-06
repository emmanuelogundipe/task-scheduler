// ============================================================
// Notification helpers — build messages, send via UltraMsg and
// persist every attempt to NotificationLog for auditing.
// ============================================================

import { prisma } from './prisma';
import { sendWhatsApp, type WhatsAppResult } from '@/services/ultramsgService';
import { formatDateTime, formatTime, humanizeMinutes } from './time';
import { logAudit } from './audit';

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_REMINDER'
  | 'MILESTONE_50'
  | 'MILESTONE_70'
  | 'DEADLINE_REACHED'
  | 'TEST_MESSAGE'
  | 'TASK_COMPLETED'
  | 'STATUS_CHANGE';

export interface TaskLike {
  id: number;
  title: string;
  description?: string | null;
  startDateTime: Date;
  deadlineDateTime: Date;
  durationMinutes: number;
}

interface SendOptions {
  taskId?: number | null;
  recipientUserId?: number | null;
  type: NotificationType;
  to: string;
  message: string;
  timezone?: string;
}

/**
 * Send a WhatsApp message and record it. Resolves to the send result
 * so callers can surface success/failure without an exception.
 */
export async function sendAndLog(opts: SendOptions): Promise<WhatsAppResult> {
  const result = await sendWhatsApp(opts.to, opts.message);
  const tz = opts.timezone || 'Africa/Lagos';

  try {
    await prisma.notificationLog.create({
      data: {
        taskId: opts.taskId ?? null,
        recipientUserId: opts.recipientUserId ?? null,
        recipientWhatsApp: opts.to,
        notificationType: opts.type,
        message: opts.message,
        provider: 'ULTRAMSG',
        status: result.status,
        providerResponse: result.providerResponse ?? result.error ?? null,
        sentAt: result.ok ? new Date() : null,
      },
    });
  } catch (e) {
    console.error('[notifications] failed to write notification log:', e);
  }

  await logAudit({
    action: result.ok ? 'WHATSAPP_SENT' : 'WHATSAPP_FAILED',
    taskId: opts.taskId ?? null,
    userId: opts.recipientUserId ?? null,
    details: `${opts.type} → ${opts.to} (${result.status})${result.error ? `: ${result.error}` : ''}`,
  });

  void tz;
  return result;
}

// ------------------------------------------------------------
// Message templates
// ------------------------------------------------------------

export function taskAssignedMessage(task: TaskLike, handlerName: string, timezone: string): string {
  return [
    'ODYSSEY SCHEDULER',
    '',
    'You have been assigned a new task.',
    '',
    `Task: ${task.title}`,
    '',
    'Description:',
    task.description?.trim() || '—',
    '',
    'Start:',
    formatTime(task.startDateTime, timezone),
    '',
    'Deadline:',
    formatTime(task.deadlineDateTime, timezone),
    '',
    'Duration:',
    humanizeMinutes(task.durationMinutes),
    '',
    'Please ensure the task is completed before the deadline.',
    '',
    'Thank you.',
    'Odyssey Educational Foundation',
  ].join('\n');
}

export function taskReminderMessage(
  task: TaskLike,
  opts: { elapsedMinutes: number; remainingMinutes: number; statusLabel: string; timezone: string }
): string {
  return [
    'ODYSSEY SCHEDULER REMINDER',
    '',
    `Task: ${task.title}`,
    '',
    `Status: ${opts.statusLabel}`,
    '',
    `Time elapsed: ${humanizeMinutes(opts.elapsedMinutes)}`,
    '',
    `Time remaining: ${humanizeMinutes(opts.remainingMinutes)}`,
    '',
    `Deadline: ${formatTime(task.deadlineDateTime, opts.timezone)}`,
    '',
    'Please continue working on the task and ensure it is completed before the deadline.',
  ].join('\n');
}

export function milestoneMessage(
  task: TaskLike,
  opts: { percent: 50 | 70; assignedTo: string; timezone: string }
): string {
  const lines = [
    'ODYSSEY SCHEDULER',
    '',
    `TASK MILESTONE: ${opts.percent}%`,
    '',
    `Task: ${task.title}`,
    '',
    `Assigned To: ${opts.assignedTo}`,
    '',
    `${opts.percent}% of the allocated task duration has elapsed.`,
  ];
  if (opts.percent === 70) {
    lines.push('', 'The task deadline is approaching.');
  } else {
    lines.push('', `Deadline: ${formatTime(task.deadlineDateTime, opts.timezone)}`);
  }
  return lines.join('\n');
}

export function deadlineReachedMessage(task: TaskLike, assignedTo: string): string {
  return [
    'ODYSSEY SCHEDULER',
    '',
    'DEADLINE REACHED',
    '',
    `Task: ${task.title}`,
    '',
    `Assigned To: ${assignedTo}`,
    '',
    'The task has reached its deadline and has not yet been marked as completed.',
    '',
    'Please review the task.',
  ].join('\n');
}

export function testMessage(timezone: string): string {
  return [
    'ODYSSEY SCHEDULER',
    '',
    'This is a test WhatsApp message.',
    '',
    'Your UltraMsg integration is working correctly.',
    '',
    `Sent: ${formatDateTime(new Date(), timezone)}`,
  ].join('\n');
}
