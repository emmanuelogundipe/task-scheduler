import { describe, it, expect } from 'vitest';
import {
  validateTaskInput,
  isValidWhatsApp,
  normalizeWhatsApp,
  isValidInterval,
} from '@/lib/validation';

describe('task validation', () => {
  const validStart = new Date('2026-08-10T10:00:00Z');

  it('accepts a valid task', () => {
    expect(
      validateTaskInput({ title: 'Prepare August Newsletter', startDateTime: validStart, durationMinutes: 120 })
    ).toBeNull();
  });

  it('rejects an empty title', () => {
    expect(validateTaskInput({ title: '   ', startDateTime: validStart, durationMinutes: 60 })).toBe(
      'Task title cannot be empty.'
    );
  });

  it('rejects a non-positive duration (invalid deadline)', () => {
    expect(validateTaskInput({ title: 'Task', startDateTime: validStart, durationMinutes: 0 })).toBe(
      'Duration must be a positive number of minutes.'
    );
  });

  it('rejects an invalid start date', () => {
    expect(validateTaskInput({ title: 'Task', startDateTime: 'nope', durationMinutes: 60 })).toBe(
      'Start time is invalid.'
    );
  });
});

describe('whatsapp validation', () => {
  it('accepts valid Nigerian numbers with +', () => {
    expect(isValidWhatsApp('+2348133226669')).toBe(true);
    expect(isValidWhatsApp('08133226669')).toBe(true);
  });

  it('rejects too-short or non-numeric numbers', () => {
    expect(isValidWhatsApp('123')).toBe(false);
    expect(isValidWhatsApp('abc')).toBe(false);
  });

  it('normalizes to digits only', () => {
    expect(normalizeWhatsApp('+234 813-322-6669')).toBe('2348133226669');
  });
});

describe('reminder interval validation', () => {
  it('accepts positive whole numbers', () => {
    expect(isValidInterval(30)).toBe(true);
    expect(isValidInterval('15')).toBe(true);
  });
  it('rejects zero, negatives and non-integers', () => {
    expect(isValidInterval(0)).toBe(false);
    expect(isValidInterval(-5)).toBe(false);
    expect(isValidInterval(2.5)).toBe(false);
  });
});
