// ============================================================
// Background Task Reminder Engine
//
// Runs every minute from the server process (node-cron), fully
// independent of the browser. For every active task it:
//   1. Persists the current progress percentage
//   2. At 5 fixed intervals before completion it reminds BOTH handler + admin equally
//   3. Alerts handler + admin exactly once at 50% and 70% elapsed
//   4. Alerts handler + admin exactly once when the deadline is reached
//
// Duplicate protection is database-backed (milestone flags /
// remindersSent), so restarting the server never resends a
// notification. Completed and cancelled tasks are ignored.
//
// The per-task decision logic lives in the pure `planTaskActions`
// function so it can be unit-tested without a database.
// ============================================================

import cron from 'node-cron';
import { prisma } from './prisma';
import {
  sendAndLog,
  taskReminderMessage,
  milestoneMessage,
  deadlineReachedMessage,
} from './notifications';
import { progressPercentage, elapsedFraction } from './time';

let started = false;

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
  milestone50Sent: boolean;
  milestone70Sent: boolean;
  deadlineNotificationSent: boolean;
  lastReminderAt: Date | null;
  remindersSent: number;
}

/**
 * The 5 reminder intervals before a task completes, measured as the
 * fraction of its duration already elapsed. Each interval fires at most
 * once, and every fire is delivered to BOTH the admin and the task
 * handler equally.
 */
export const REMINDER_STAGES: number[] = [0.2, 0.4, 0.6, 0.8, 0.95];

export interface SchedulerDecision {
  progress: number;
  sendReminder: boolean;
  sendMilestone50: boolean;
  sendMilestone70: boolean;
  sendDeadline: boolean;
  markOverdue: boolean;
}

/**
 * Pure decision function — no IO. Given a task and the current
 * time, decide what (if anything) the scheduler should do.
 */
export function planTaskActions(
  task: PlanTask,
  now: Date,
  intervalMinutes: number
): SchedulerDecision {
  const active = task.status === 'IN_PROGRESS' || task.status === 'OVERDUE';
  const progress = progressPercentage(task.startDateTime, task.durationMinutes, now);
  const fraction = elapsedFraction(task.startDateTime, task.durationMinutes, now);
  const beforeDeadline = now.getTime() < task.deadlineDateTime.getTime();
  const started = now.getTime() >= task.startDateTime.getTime();

  const reminderDue = (() => {
    if (!active || !started || !beforeDeadline) return false;
    const desiredCount = REMINDER_STAGES.filter((stage) => fraction >= stage).length;
    return desiredCount > (task.remindersSent ?? 0);
  })();

  return {
    progress,
    sendReminder: reminderDue,
    sendMilestone50: active && beforeDeadline && fraction >= 0.5 && !task.milestone50Sent,
    sendMilestone70: active && beforeDeadline && fraction >= 0.7 && !task.milestone70Sent,
    sendDeadline: active && !beforeDeadline && !task.deadlineNotificationSent,
    markOverdue: active && !beforeDeadline && task.status === 'IN_PROGRESS',
  };
}

/** How many of the 5 pre-deadline reminder intervals are now due. */
export function desiredReminderCount(task: PlanTask, now: Date): number {
  const fraction = elapsedFraction(task.startDateTime, task.durationMinutes, now);
  return REMINDER_STAGES.filter((stage) => fraction >= stage).length;
}

/** Exposed for tests / manual runs. Runs a single scheduler pass. */
export async function runSchedulerCycle(now: Date = new Date()): Promise<void> {
  const settings = await prisma.settings.findFirst();
  if (!settings) return;

  const timezone = settings.timezone || 'Africa/Lagos';
  const intervalMin = Math.max(1, settings.reminderIntervalMinutes || 30);

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', status: 'ACTIVE' } });

  const tasks = await prisma.task.findMany({
    where: { status: { in: ['IN_PROGRESS', 'OVERDUE'] } },
    include: { assignedTo: true },
  });

  for (const task of tasks) {
    const decision = planTaskActions(task, now, intervalMin);

    // ---- 0. Persist computed progress ----
    if (task.progressPercentage !== decision.progress) {
      await prisma.task.update({
        where: { id: task.id },
        data: { progressPercentage: decision.progress },
      });
    }

    // ---- 1. Pre-deadline interval reminder — identical for admin + handler ----
    if (decision.sendReminder) {
      const elapsedMinutes = Math.max(0, (now.getTime() - task.startDateTime.getTime()) / 60000);
      const remainingMinutes = Math.max(0, (task.deadlineDateTime.getTime() - now.getTime()) / 60000);
      const message = taskReminderMessage(task, {
        elapsedMinutes: Math.floor(elapsedMinutes),
        remainingMinutes: Math.ceil(remainingMinutes),
        statusLabel: 'IN PROGRESS',
        timezone,
      });
      // Equal reminders: the handler and the admin get the same notification.
      await sendAndLog({
        taskId: task.id,
        recipientUserId: task.assignedToId,
        type: 'TASK_REMINDER',
        to: task.assignedTo.whatsappNumber,
        message,
        timezone,
      });
      if (settings.adminWhatsapp) {
        await sendAndLog({
          taskId: task.id,
          recipientUserId: admin?.id ?? null,
          type: 'TASK_REMINDER',
          to: settings.adminWhatsapp,
          message,
          timezone,
        });
      }
      await prisma.task.update({
        where: { id: task.id },
        data: { lastReminderAt: now, remindersSent: Math.max(task.remindersSent ?? 0, desiredReminderCount(task, now)) },
      });
    }

    // ---- 2. Milestone alerts — equal to admin AND handler ----
    if (decision.sendMilestone50) {
      const msg50 = milestoneMessage(task, { percent: 50, assignedTo: task.assignedTo.name, timezone });
      await sendAndLog({ taskId: task.id, recipientUserId: admin?.id ?? null, type: 'MILESTONE_50', to: settings.adminWhatsapp, message: msg50, timezone });
      await sendAndLog({ taskId: task.id, recipientUserId: task.assignedToId, type: 'MILESTONE_50', to: task.assignedTo.whatsappNumber, message: msg50, timezone });
      await prisma.task.update({ where: { id: task.id }, data: { milestone50Sent: true } });
    }

    if (decision.sendMilestone70) {
      const msg70 = milestoneMessage(task, { percent: 70, assignedTo: task.assignedTo.name, timezone });
      await sendAndLog({ taskId: task.id, recipientUserId: admin?.id ?? null, type: 'MILESTONE_70', to: settings.adminWhatsapp, message: msg70, timezone });
      await sendAndLog({ taskId: task.id, recipientUserId: task.assignedToId, type: 'MILESTONE_70', to: task.assignedTo.whatsappNumber, message: msg70, timezone });
      await prisma.task.update({ where: { id: task.id }, data: { milestone70Sent: true } });
    }

    // ---- 3. Deadline reached (once) — equal to admin AND handler ----
    if (decision.sendDeadline) {
      const msgDeadline = deadlineReachedMessage(task, task.assignedTo.name);
      await sendAndLog({ taskId: task.id, recipientUserId: admin?.id ?? null, type: 'DEADLINE_REACHED', to: settings.adminWhatsapp, message: msgDeadline, timezone });
      await sendAndLog({ taskId: task.id, recipientUserId: task.assignedToId, type: 'DEADLINE_REACHED', to: task.assignedTo.whatsappNumber, message: msgDeadline, timezone });
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
