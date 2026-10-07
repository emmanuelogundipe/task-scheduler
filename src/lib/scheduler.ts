// ============================================================
// Background Task Reminder Engine
//
// Runs every minute from the server process (node-cron), fully
// independent of the browser.
//
// Exactly THREE automated notifications are sent per task, each
// delivered to BOTH the assigned task handler and the administrator:
//
//   1. On assignment      — when the task is created (immediate)
//   2. One day before     — ~24h before the deadline
//                           (skipped if the task is shorter than 24h)
//   3. On the deadline    — when the deadline is reached
//
// Duplicate protection is database-backed (flags on the task row),
// so restarting the server never resends a notification. Completed
// and cancelled tasks are ignored entirely.
//
// The per-task decision logic lives in the pure `planTaskActions`
// function so it can be unit-tested without a database.
// ============================================================

import cron from 'node-cron';
import { prisma } from './prisma';
import {
  sendAndLog,
  dayBeforeReminderMessage,
  deadlineReminderMessage,
} from './notifications';
import { progressPercentage, elapsedFraction } from './time';

let started = false;

const DAY_MS = 24 * 60 * 60 * 1000;
// A task is "long enough" to warrant the day-before reminder only if
// its full duration spans at least a day (minus a small tolerance).
const LONG_TASK_THRESHOLD_MS = DAY_MS - 5 * 60 * 1000;

export function startScheduler() {
  if (started) return;
  started = true;
  console.log('[odyssey-scheduler] reminder engine started — checking every minute');

  // Run once shortly after boot so restarts reconcile immediately.
  setTimeout(() => {
    runSchedulerCycle().catch((e) => console.error('[scheduler] boot cycle error:', e));
  }, 5000);

  cron.schedule('* * * * *', async () => {
    try {
      await runSchedulerCycle();
    } catch (e) {
      console.error('[scheduler] cycle error:', e);
    }
  });
}

export interface PlanTask {
  status: string;
  startDateTime: Date;
  deadlineDateTime: Date;
  durationMinutes: number;
  dayBeforeReminderSent: boolean;
  deadlineNotificationSent: boolean;
}

export interface SchedulerDecision {
  progress: number;
  /** Reminder #2 — one day before the deadline (long tasks only). */
  sendDayBefore: boolean;
  /** Reminder #3 — on the deadline. */
  sendDeadline: boolean;
  markOverdue: boolean;
}

/**
 * Pure decision function — no IO. Given a task and the current
 * time, decide what (if anything) the scheduler should do.
 */
export function planTaskActions(task: PlanTask, now: Date): SchedulerDecision {
  const active = task.status === 'IN_PROGRESS' || task.status === 'OVERDUE';
  const progress = progressPercentage(task.startDateTime, task.durationMinutes, now);
  const deadlineMs = task.deadlineDateTime.getTime();
  const nowMs = now.getTime();
  const beforeDeadline = nowMs < deadlineMs;

  const durationMs = Math.max(0, deadlineMs - task.startDateTime.getTime());
  const isLongTask = durationMs >= LONG_TASK_THRESHOLD_MS;
  // The day-before reminder is due once we are within 24h of the deadline.
  const dayBeforeDue = nowMs >= deadlineMs - DAY_MS;

  return {
    progress,
    // Reminder #2: only for long tasks, once, and only before the deadline.
    sendDayBefore:
      active && isLongTask && beforeDeadline && dayBeforeDue && !task.dayBeforeReminderSent,
    // Reminder #3: once, at/after the deadline.
    sendDeadline: active && !beforeDeadline && !task.deadlineNotificationSent,
    markOverdue: active && !beforeDeadline && task.status === 'IN_PROGRESS',
  };
}

/** Send a single message to both the handler and the admin. */
async function sendToBoth(opts: {
  task: any;
  adminId: number | null;
  adminWhatsapp: string;
  type: 'DAY_BEFORE_REMINDER' | 'DEADLINE_REMINDER';
  build: (handlerName: string) => string;
  timezone: string;
}) {
  const { task } = opts;
  const message = opts.build(task.assignedTo.name);

  await sendAndLog({
    taskId: task.id,
    recipientUserId: task.assignedToId,
    type: opts.type,
    to: task.assignedTo.whatsappNumber,
    message,
    timezone: opts.timezone,
  });

  await sendAndLog({
    taskId: task.id,
    recipientUserId: opts.adminId,
    type: opts.type,
    to: opts.adminWhatsapp,
    message,
    timezone: opts.timezone,
  });
}

/** Exposed for tests / manual runs. Runs a single scheduler pass. */
export async function runSchedulerCycle(now: Date = new Date()): Promise<void> {
  const settings = await prisma.settings.findFirst();
  if (!settings) return;

  const timezone = settings.timezone || 'Africa/Lagos';

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', status: 'ACTIVE' } });

  const tasks = await prisma.task.findMany({
    where: { status: { in: ['IN_PROGRESS', 'OVERDUE'] } },
    include: { assignedTo: true },
  });

  for (const task of tasks) {
    const decision = planTaskActions(task, now);

    // ---- 0. Persist computed progress ----
    if (task.progressPercentage !== decision.progress) {
      await prisma.task.update({
        where: { id: task.id },
        data: { progressPercentage: decision.progress },
      });
    }

    // ---- Reminder #2: one day before the deadline ----
    if (decision.sendDayBefore) {
      await sendToBoth({
        task,
        adminId: admin?.id ?? null,
        adminWhatsapp: settings.adminWhatsapp,
        type: 'DAY_BEFORE_REMINDER',
        timezone,
        build: (handlerName) => dayBeforeReminderMessage(task, handlerName, timezone),
      });
      await prisma.task.update({
        where: { id: task.id },
        data: { dayBeforeReminderSent: true },
      });
    }

    // ---- Reminder #3: on the deadline ----
    if (decision.sendDeadline) {
      const overdue = now.getTime() > task.deadlineDateTime.getTime();
      await sendToBoth({
        task,
        adminId: admin?.id ?? null,
        adminWhatsapp: settings.adminWhatsapp,
        type: 'DEADLINE_REMINDER',
        timezone,
        build: (handlerName) => deadlineReminderMessage(task, handlerName, timezone, overdue),
      });
      await prisma.task.update({
        where: { id: task.id },
        data: {
          deadlineNotificationSent: true,
          status: 'OVERDUE',
          progressPercentage: 100,
        },
      });
    } else if (decision.markOverdue) {
      await prisma.task.update({ where: { id: task.id }, data: { status: 'OVERDUE' } });
    }
  }
}
