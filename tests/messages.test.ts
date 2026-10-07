import { describe, it, expect } from 'vitest';
import {
  taskAssignedMessage,
  taskAssignedAdminMessage,
  dayBeforeReminderMessage,
  deadlineReminderMessage,
} from '@/lib/notifications';

const task = {
  id: 1,
  title: 'Prepare August Newsletter',
  description: 'Prepare and finalize the August newsletter.',
  startDateTime: new Date(Date.UTC(2026, 7, 10, 9, 0)),
  deadlineDateTime: new Date(Date.UTC(2026, 7, 10, 13, 0)),
  durationMinutes: 240,
};

describe('whatsapp message templates', () => {
  it('builds the assignment message for the handler', () => {
    const msg = taskAssignedMessage(task, 'Emmanuel', 'Africa/Lagos');
    expect(msg).toContain('ODYSSEY SCHEDULER');
    expect(msg).toContain('You have been assigned a new task.');
    expect(msg).toContain('Prepare August Newsletter');
    expect(msg).toContain('Odyssey Educational Foundation');
  });

  it('builds the assignment message for the administrator', () => {
    const msg = taskAssignedAdminMessage(task, 'Emmanuel', 'Africa/Lagos');
    expect(msg).toContain('A new task has been assigned.');
    expect(msg).toContain('Assigned To: Emmanuel');
    expect(msg).toContain('Prepare August Newsletter');
  });

  it('builds the day-before reminder message', () => {
    const msg = dayBeforeReminderMessage(task, 'Emmanuel', 'Africa/Lagos');
    expect(msg).toContain('ODYSSEY SCHEDULER REMINDER');
    expect(msg).toContain('due tomorrow');
    expect(msg).toContain('Prepare August Newsletter');
    expect(msg).toContain('Emmanuel');
  });

  it('builds the deadline reminder message (on time and overdue)', () => {
    const onTime = deadlineReminderMessage(task, 'Emmanuel', 'Africa/Lagos', false);
    expect(onTime).toContain('due now');
    expect(onTime).toContain('Prepare August Newsletter');

    const overdue = deadlineReminderMessage(task, 'Emmanuel', 'Africa/Lagos', true);
    expect(overdue).toContain('deadline has been reached');
    expect(overdue).toContain('not yet been marked as completed');
  });
});
