import { describe, it, expect } from 'vitest';
import { planTaskActions, type PlanTask } from '@/lib/scheduler';

const NOW = new Date('2026-08-10T12:00:00Z');

function makeTask(overrides: Partial<PlanTask> = {}): PlanTask {
  return {
    status: 'IN_PROGRESS',
    startDateTime: new Date(NOW.getTime() - 60 * 60000), // started 60 min ago
    deadlineDateTime: new Date(NOW.getTime() + 60 * 60000), // ends in 60 min
    durationMinutes: 120, // 50% elapsed at NOW
    milestone50Sent: false,
    milestone70Sent: false,
    deadlineNotificationSent: false,
    lastReminderAt: NOW,
    remindersSent: 0,
    ...overrides,
  };
}

describe('scheduler planning + duplicate protection', () => {
  it('sends the 50% milestone exactly once', () => {
    const task = makeTask();
    const first = planTaskActions(task, NOW, 30);
    expect(first.sendMilestone50).toBe(true);
    expect(first.sendMilestone70).toBe(false);
    expect(first.progress).toBe(50);

    // Simulate the flag having been persisted after the first send.
    const second = planTaskActions({ ...task, milestone50Sent: true }, NOW, 30);
    expect(second.sendMilestone50).toBe(false);
  });

  it('sends the 70% milestone exactly once', () => {
    const task = makeTask({ startDateTime: new Date(NOW.getTime() - 84 * 60000) }); // 70%
    const first = planTaskActions(task, NOW, 30);
    expect(first.sendMilestone50).toBe(true);
    expect(first.sendMilestone70).toBe(true);

    const after = planTaskActions(
      { ...task, milestone50Sent: true, milestone70Sent: true },
      NOW,
      30
    );
    expect(after.sendMilestone50).toBe(false);
    expect(after.sendMilestone70).toBe(false);
  });

  it('sends the deadline notification exactly once after the deadline', () => {
    const task = makeTask({
      startDateTime: new Date(NOW.getTime() - 180 * 60000),
      deadlineDateTime: new Date(NOW.getTime() - 30 * 60000),
      durationMinutes: 150,
      milestone50Sent: true,
      milestone70Sent: true,
    });
    const first = planTaskActions(task, NOW, 30);
    expect(first.sendDeadline).toBe(true);
    expect(first.markOverdue).toBe(true);

    const second = planTaskActions({ ...task, deadlineNotificationSent: true }, NOW, 30);
    expect(second.sendDeadline).toBe(false);
  });

  it('sends each of the 5 pre-deadline reminders at most once', () => {
    // Mid-run at 60%: stages 1-3 are due → send.
    const mid = makeTask({ startDateTime: new Date(NOW.getTime() - 72 * 60000) });
    expect(planTaskActions(mid, NOW, 30).sendReminder).toBe(true);

    // After stages were logged, no new reminder until another stage is crossed.
    const logged = makeTask({ startDateTime: new Date(NOW.getTime() - 72 * 60000), remindersSent: 3 });
    expect(planTaskActions(logged, NOW, 30).sendReminder).toBe(false);

    // Just before completion (95%+) the final stage is due.
    const nearEnd = makeTask({ startDateTime: new Date(NOW.getTime() - 115 * 60000), remindersSent: 4 });
    expect(planTaskActions(nearEnd, NOW, 30).sendReminder).toBe(true);
  });

  it('never sends reminders before the task starts', () => {
    const future = makeTask({
      startDateTime: new Date(NOW.getTime() + 30 * 60000),
      deadlineDateTime: new Date(NOW.getTime() + 90 * 60000),
      lastReminderAt: null,
    });
    expect(planTaskActions(future, NOW, 30).sendReminder).toBe(false);
  });

  it('stops all notifications for completed/cancelled tasks', () => {
    for (const status of ['COMPLETED', 'CANCELLED', 'PENDING_APPROVAL']) {
      const task = makeTask({
        status,
        deadlineDateTime: new Date(NOW.getTime() - 30 * 60000),
        lastReminderAt: null,
      });
      const d = planTaskActions(task, NOW, 30);
      expect(d.sendReminder).toBe(false);
      expect(d.sendMilestone50).toBe(false);
      expect(d.sendMilestone70).toBe(false);
      expect(d.sendDeadline).toBe(false);
    }
  });

  it('recovers across restarts because state lives on the row', () => {
    // A restarted server re-reads the persisted flags and re-plans.
    const task = makeTask({ milestone50Sent: true, milestone70Sent: true, lastReminderAt: NOW });
    const d = planTaskActions(task, NOW, 30);
    expect(d.sendMilestone50).toBe(false);
    expect(d.sendMilestone70).toBe(false);
  });
});
