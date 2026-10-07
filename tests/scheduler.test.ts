import { describe, it, expect } from 'vitest';
import { planTaskActions, type PlanTask } from '@/lib/scheduler';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = new Date('2026-08-10T12:00:00Z');

function makeTask(overrides: Partial<PlanTask> = {}): PlanTask {
  return {
    status: 'IN_PROGRESS',
    startDateTime: new Date(NOW.getTime() - 10 * DAY), // started long ago
    deadlineDateTime: new Date(NOW.getTime() + 3 * DAY), // 3 days out
    durationMinutes: 13 * 24 * 60,
    dayBeforeReminderSent: false,
    deadlineNotificationSent: false,
    ...overrides,
  };
}

describe('scheduler — three-reminder engine', () => {
  it('does not send the day-before reminder too early', () => {
    const task = makeTask(); // deadline 3 days away
    const d = planTaskActions(task, NOW);
    expect(d.sendDayBefore).toBe(false);
    expect(d.sendDeadline).toBe(false);
  });

  it('sends the day-before reminder once within 24h of the deadline', () => {
    const task = makeTask({ deadlineDateTime: new Date(NOW.getTime() + 12 * HOUR) });
    const first = planTaskActions(task, NOW);
    expect(first.sendDayBefore).toBe(true);

    // Once the flag is persisted, it never fires again.
    const second = planTaskActions({ ...task, dayBeforeReminderSent: true }, NOW);
    expect(second.sendDayBefore).toBe(false);
  });

  it('skips the day-before reminder for tasks shorter than 24h', () => {
    const task = makeTask({
      startDateTime: new Date(NOW.getTime() - 1 * HOUR),
      deadlineDateTime: new Date(NOW.getTime() + 3 * HOUR),
      durationMinutes: 4 * 60, // 4-hour task
    });
    const d = planTaskActions(task, NOW);
    expect(d.sendDayBefore).toBe(false);
    expect(d.sendDeadline).toBe(false);
  });

  it('sends the deadline reminder exactly once', () => {
    const task = makeTask({
      startDateTime: new Date(NOW.getTime() - 2 * HOUR),
      deadlineDateTime: new Date(NOW.getTime() - 30 * 60 * 1000), // 30 min ago
      durationMinutes: 90,
    });
    const first = planTaskActions(task, NOW);
    expect(first.sendDeadline).toBe(true);
    expect(first.markOverdue).toBe(true);

    const second = planTaskActions({ ...task, deadlineNotificationSent: true }, NOW);
    expect(second.sendDeadline).toBe(false);
  });

  it('never notifies completed, cancelled or pending-approval tasks', () => {
    for (const status of ['COMPLETED', 'CANCELLED', 'PENDING_APPROVAL']) {
      const task = makeTask({
        status,
        deadlineDateTime: new Date(NOW.getTime() - HOUR),
      });
      const d = planTaskActions(task, NOW);
      expect(d.sendDayBefore).toBe(false);
      expect(d.sendDeadline).toBe(false);
      expect(d.markOverdue).toBe(false);
    }
  });

  it('recovers across restarts because state lives on the row', () => {
    const task = makeTask({
      deadlineDateTime: new Date(NOW.getTime() + 12 * HOUR),
      dayBeforeReminderSent: true,
      deadlineNotificationSent: true,
    });
    const d = planTaskActions(task, NOW);
    expect(d.sendDayBefore).toBe(false);
    expect(d.sendDeadline).toBe(false);
  });

  it('computes progress percentage', () => {
    const task = makeTask({
      startDateTime: new Date(NOW.getTime() - 30 * 60 * 1000),
      deadlineDateTime: new Date(NOW.getTime() + 30 * 60 * 1000),
      durationMinutes: 60,
    });
    expect(planTaskActions(task, NOW).progress).toBe(50);
  });
});
