// ============================================================
// Serialization helpers — turn Prisma rows into client-friendly
// payloads with computed progress / time-remaining values.
// ============================================================

import {
  progressPercentage,
  describeRemaining,
  humanizeMinutes,
  formatDateTime,
  formatTime,
  APP_TIMEZONE,
} from './time';

export const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: 'In Progress',
  PENDING_APPROVAL: 'Pending Approval',
  COMPLETED: 'Completed',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
};

export interface SerializedTask {
  id: number;
  title: string;
  description: string;
  status: string;
  statusLabel: string;
  handler: { id: number; name: string; whatsappNumber: string } | null;
  startDateTime: string;
  deadlineDateTime: string;
  durationMinutes: number;
  durationLabel: string;
  progressPercentage: number;
  startLabel: string;
  deadlineLabel: string;
  deadlineTimeLabel: string;
  timeRemaining: string;
  overdue: boolean;
  lastReminderAt: string | null;
  completedAt: string | null;
  approvedAt: string | null;
  approvedById: number | null;
  milestone50Sent: boolean;
  milestone70Sent: boolean;
  deadlineNotificationSent: boolean;
  createdAt: string;
}

export function serializeTask(task: any, now: Date = new Date(), timezone = APP_TIMEZONE): SerializedTask {
  const start = new Date(task.startDateTime);
  const deadline = new Date(task.deadlineDateTime);
  const finished = task.status === 'COMPLETED';
  const progress = finished
    ? 100
    : progressPercentage(start, task.durationMinutes, now);
  const overdue =
    (task.status === 'IN_PROGRESS' || task.status === 'OVERDUE') && now.getTime() > deadline.getTime();

  return {
    id: task.id,
    title: task.title,
    description: task.description ?? '',
    status: task.status,
    statusLabel: STATUS_LABELS[task.status] ?? task.status,
    handler: task.assignedTo
      ? {
          id: task.assignedTo.id,
          name: task.assignedTo.name,
          whatsappNumber: task.assignedTo.whatsappNumber,
        }
      : null,
    startDateTime: start.toISOString(),
    deadlineDateTime: deadline.toISOString(),
    durationMinutes: task.durationMinutes,
    durationLabel: humanizeMinutes(task.durationMinutes),
    progressPercentage: progress,
    startLabel: formatDateTime(start, timezone),
    deadlineLabel: formatDateTime(deadline, timezone),
    deadlineTimeLabel: formatTime(deadline, timezone),
    timeRemaining: finished
      ? 'Completed'
      : task.status === 'CANCELLED'
        ? 'Cancelled'
        : describeRemaining(deadline, now),
    overdue,
    lastReminderAt: task.lastReminderAt ? new Date(task.lastReminderAt).toISOString() : null,
    completedAt: task.completedAt ? new Date(task.completedAt).toISOString() : null,
    approvedAt: task.approvedAt ? new Date(task.approvedAt).toISOString() : null,
    approvedById: task.approvedById ?? null,
    milestone50Sent: task.milestone50Sent,
    milestone70Sent: task.milestone70Sent,
    deadlineNotificationSent: task.deadlineNotificationSent,
    createdAt: new Date(task.createdAt).toISOString(),
  };
}
