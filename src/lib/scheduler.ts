// ============================================================
// Background Scheduler — runs every minute via node-cron.
//
// For every IN_PROGRESS task it:
//   1. Sends periodic WhatsApp status reminders to the handler
//   2. Alerts the admin at 50% and 70% of elapsed duration
//   3. At 100% deadline: WhatsApp + Email + Google Calendar
//
// Milestone flags on the Task row guarantee each notification
// is sent exactly once. Completing a task removes it from the
// IN_PROGRESS query, which instantly halts all reminders.
// ============================================================

import cron from 'node-cron';
import { prisma } from './prisma';
import { notifyWhatsApp, notifyEmail } from './notifications';
import { createCalendarEvent } from './googleCalendar';

let started = false;

export function startScheduler() {
  if (started) return;
  started = true;
  console.log('[scheduler] started — checking tasks every minute');

  cron.schedule('* * * * *', async () => {
    try {
      await runChecks();
    } catch (e) {
      console.error('[scheduler] error:', e);
    }
  });
}

async function runChecks() {
  const now = new Date();
  const intervalMin = Number(process.env.REMINDER_INTERVAL_MIN ?? 30);

  const tasks = await prisma.task.findMany({
    where: { status: 'IN_PROGRESS' },
    include: { handler: true, admin: true },
  });

  for (const task of tasks) {
    const elapsedMin = (now.getTime() - task.startTime.getTime()) / 60000;
    const pct = task.durationMinutes > 0 ? elapsedMin / task.durationMinutes : 1;
    const remainingMin = Math.max(0, task.durationMinutes - elapsedMin);

    // ---- 1. Periodic handler reminder ----
    const dueForReminder =
      !task.lastReminderAt ||
      now.getTime() - task.lastReminderAt.getTime() >= intervalMin * 60000;

    if (dueForReminder && pct < 1) {
      const msg = [
        `⏰ Task Status Reminder`,
        ``,
        `Task: ${task.title}`,
        `Status: In Progress`,
        `Elapsed: ${Math.floor(elapsedMin)} min`,
        `Remaining: ${Math.floor(remainingMin)} min`,
        `Deadline: ${task.deadline.toLocaleString()}`,
        ``,
        `Please notify the admin once the work is finished.`,
      ].join('\n');

      await notifyWhatsApp(task.id, task.handler.whatsapp, msg);
      await prisma.task.update({
        where: { id: task.id },
        data: { lastReminderAt: now },
      });
    }

    // ---- 2. Admin milestone alerts (50% / 70%) ----
    if (pct >= 0.5 && !task.milestone50) {
      const msg = [
        `🔔 50% of task time elapsed`,
        ``,
        `Task: ${task.title}`,
        `Handler: ${task.handler.name}`,
        `Remaining: ${Math.floor(remainingMin)} min`,
        `Deadline: ${task.deadline.toLocaleString()}`,
      ].join('\n');
      await notifyWhatsApp(task.id, task.admin.whatsapp, msg);
      await prisma.task.update({ where: { id: task.id }, data: { milestone50: true } });
    }

    if (pct >= 0.7 && !task.milestone70) {
      const msg = [
        `⚠️ 70% of task time elapsed`,
        ``,
        `Task: ${task.title}`,
        `Handler: ${task.handler.name}`,
        `Remaining: ${Math.floor(remainingMin)} min`,
        `Deadline: ${task.deadline.toLocaleString()}`,
        ``,
        `Please follow up with the handler.`,
      ].join('\n');
      await notifyWhatsApp(task.id, task.admin.whatsapp, msg);
      await prisma.task.update({ where: { id: task.id }, data: { milestone70: true } });
    }

    // ---- 3. 100% deadline reached — WhatsApp + Email + Calendar ----
    if (pct >= 1 && !task.deadlineNotified) {
      const deadlineStr = task.deadline.toLocaleString();

      // 3a. WhatsApp alert to admin
      const waMsg = [
        `🚨 DEADLINE REACHED`,
        ``,
        `Task: ${task.title}`,
        `Handler: ${task.handler.name}`,
        `Deadline: ${deadlineStr}`,
        ``,
        `Please follow up immediately.`,
      ].join('\n');
      await notifyWhatsApp(task.id, task.admin.whatsapp, waMsg);

      // 3b. Email alert to admin
      await notifyEmail(
        task.id,
        task.admin.email,
        `🚨 Deadline Reached: ${task.title}`,
        `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
          <h2 style="color:#dc2626">🚨 Task Deadline Reached</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px;border:1px solid #e5e7eb"><b>Task</b></td>
                <td style="padding:8px;border:1px solid #e5e7eb">${task.title}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb"><b>Description</b></td>
                <td style="padding:8px;border:1px solid #e5e7eb">${task.description || '—'}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb"><b>Handler</b></td>
                <td style="padding:8px;border:1px solid #e5e7eb">${task.handler.name} (${task.handler.whatsapp})</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb"><b>Deadline</b></td>
                <td style="padding:8px;border:1px solid #e5e7eb">${deadlineStr}</td></tr>
          </table>
          <p>Please follow up with the handler immediately.</p>
        </div>`
      );

      // 3c. Google Calendar deadline alert event
      await createCalendarEvent({
        summary: `🚨 DEADLINE: ${task.title}`,
        description: [
          `Task: ${task.title}`,
          `Handler: ${task.handler.name} (${task.handler.whatsapp})`,
          `Deadline reached: ${deadlineStr}`,
        ].join('\n'),
        start: task.deadline,
        end: new Date(task.deadline.getTime() + 15 * 60000),
      });

      await prisma.task.update({
        where: { id: task.id },
        data: { deadlineNotified: true },
      });
    }
  }
}
