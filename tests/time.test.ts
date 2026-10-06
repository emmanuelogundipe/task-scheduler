import { describe, it, expect } from 'vitest';
import {
  parseZonedInput,
  progressPercentage,
  elapsedFraction,
  describeRemaining,
  humanizeMinutes,
} from '@/lib/time';

describe('time utilities (Africa/Lagos)', () => {
  it('parses a wall-clock input as Africa/Lagos time (UTC+1)', () => {
    const d = parseZonedInput('2026-08-10T10:00')!;
    // 10:00 in Lagos (UTC+1) === 09:00 UTC
    expect(d.getTime()).toBe(Date.UTC(2026, 7, 10, 9, 0, 0));
  });

  it('rejects malformed input', () => {
    expect(parseZonedInput('not-a-date')).toBeNull();
  });

  it('calculates progress percentage', () => {
    const now = new Date('2026-08-10T10:00:00Z');
    const start = new Date(now.getTime() - 30 * 60000);
    expect(progressPercentage(start, 60, now)).toBe(50);
  });

  it('clamps progress at 0% and 100%', () => {
    const now = new Date('2026-08-10T10:00:00Z');
    // Deadline just starting
    expect(progressPercentage(now, 60, now)).toBe(0);
    // Well past the deadline
    const longAgo = new Date(now.getTime() - 600 * 60000);
    expect(progressPercentage(longAgo, 60, now)).toBe(100);
  });

  it('reports 50% and 70% elapsed fractions', () => {
    const now = new Date('2026-08-10T10:00:00Z');
    expect(elapsedFraction(new Date(now.getTime() - 50 * 60000), 100, now)).toBeCloseTo(0.5, 5);
    expect(elapsedFraction(new Date(now.getTime() - 70 * 60000), 100, now)).toBeCloseTo(0.7, 5);
  });

  it('humanizes durations', () => {
    expect(humanizeMinutes(210)).toBe('3 hours 30 minutes');
    expect(humanizeMinutes(60)).toBe('1 hour');
    expect(humanizeMinutes(0)).toBe('0 minutes');
  });

  it('describes remaining / overdue time', () => {
    const now = new Date('2026-08-10T10:00:00Z');
    expect(describeRemaining(new Date(now.getTime() + 135 * 60000), now)).toBe(
      '2 hours 15 minutes remaining'
    );
    expect(describeRemaining(new Date(now.getTime() - 35 * 60000), now)).toBe(
      'Overdue by 35 minutes'
    );
  });
});
