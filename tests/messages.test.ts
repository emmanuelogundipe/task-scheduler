import { describe, it, expect } from 'vitest';
import {
  taskAssignedMessage,
  taskReminderMessage,
  milestoneMessage,
  deadlineReachedMessage,
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
  it('builds the assignment message', () => {
    const msg = taskAssignedMessage(task, 'Emmanuel', 'Africa/Lagos');
    expect(msg).toContain('ODYSSEY SCHEDULER');
    expect(msg).toContain('You have been assigned a new task.');
    expect(msg).toContain('Prepare August Newsletter');
    expect(msg).toContain('Duration:');
    expect(msg).toContain('4 hours');
    expect(msg).toContain('Odyssey Educational Foundation');
  });

  it('builds the reminder message', () => {
    const msg = taskReminderMessage(task, {
      elapsedMinutes: 45,
      remainingMinutes: 75,
      statusLabel: 'IN PROGRESS',
      timezone: 'Africa/Lagos',
    });
    expect(msg).toContain('ODYSSEY SCHEDULER REMINDER');
    expect(msg).toContain('Status: IN PROGRESS');
    expect(msg).toContain('Time remaining: 1 hour 15 minutes');
  });

  it('builds the 50% and 70% milestone messages', () => {
    const m50 = milestoneMessage(task, { percent: 50, assignedTo: 'Emmanuel', timezone: 'Africa/Lagos' });
    expect(m50).toContain('TASK MILESTONE: 50%');
    expect(m50).toContain('Assigned To: Emmanuel');

    const m70 = milestoneMessage(task, { percent: 70, assignedTo: 'Emmanuel', timezone: 'Africa/Lagos' });
    expect(m70).toContain('TASK MILESTONE: 70%');
    expect(m70).toContain('deadline is approaching');
  });

  it('builds the deadline-reached message', () => {
    const msg = deadlineReachedMessage(task, 'Emmanuel');
    expect(msg).toContain('DEADLINE REACHED');
    expect(msg).toContain('has not yet been marked as completed');
  });
});
