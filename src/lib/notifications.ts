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
  | 'DAY_BEFORE_REMINDER'
  | 'DEADLINE_REMINDER'
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

/** Assignment notice sent to the administrator (a copy of #1). */
export function taskAssignedAdminMessage(task: TaskLike, handlerName: string, timezone: string): string {
  return [
    'ODYSSEY SCHEDULER',
    '',
    'A new task has been assigned.',
    '',
    `Task: ${task.title}`,
    '',
    `Assigned To: ${handlerName}`,
    '',
    'Start:',
    formatTime(task.startDateTime, timezone),
    '',
    'Deadline:',
    formatTime(task.deadlineDateTime, timezone),
    '',
    'Duration:',
    humanizeMinutes(task.durationMinutes),
  ].join('\n');
}

/** Reminder #2 — sent the day before the deadline (to handler and admin). */
export function dayBeforeReminderMessage(
  task: TaskLike,
  handlerName: string,
  timezone: string
): string {
  return [
    'ODYSSEY SCHEDULER REMINDER',
    '',
    'This task is due tomorrow.',
    '',
    `Task: ${task.title}`,
    '',
    `Assigned To: ${handlerName}`,
    '',
    `Deadline: ${formatDateTime(task.deadlineDateTime, timezone)}`,
    '',
    'Please ensure it is completed before the deadline.',
  ].join('\n');
}

/** Reminder #3 — sent on the deadline (to handler and admin). */
export function deadlineReminderMessage(
  task: TaskLike,
  handlerName: string,
  timezone: string,
  overdue: boolean
): string {
  return [
    'ODYSSEY SCHEDULER REMINDER',
    '',
    overdue ? 'The task deadline has been reached.' : 'This task is due now.',
    '',
    `Task: ${task.title}`,
    '',
    `Assigned To: ${handlerName}`,
    '',
    `Deadline: ${formatDateTime(task.deadlineDateTime, timezone)}`,
    '',
    overdue
      ? 'The task has not yet been marked as completed. Please review it as soon as possible.'
      : 'Please complete the task now.',
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
