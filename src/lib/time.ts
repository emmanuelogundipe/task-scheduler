// ============================================================
// Time utilities — everything is computed in the application
// timezone (Africa/Lagos by default) so task starts, deadlines
// and progress never depend on the server's local timezone.
// ============================================================

export const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Africa/Lagos';

/** IANA-timezone-aware parts for a given instant. */
function zonedParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = fmt.formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour') % 24,
    minute: get('minute'),
    second: get('second'),
  };
}

/** Offset (ms) of a timezone from UTC at a given instant. */
function tzOffsetMs(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - date.getTime();
}

/**
 * Convert a wall-clock time authored in `timeZone` into a real UTC Date.
 * Handles DST-free zones such as Africa/Lagos transparently.
 */
export function zonedTimeToUtc(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number,
  timeZone: string = APP_TIMEZONE
): Date {
  const naive = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  // First guess, then correct by the zone offset at that instant.
  const offset1 = tzOffsetMs(new Date(naive), timeZone);
  const guess = new Date(naive - offset1);
  const offset2 = tzOffsetMs(guess, timeZone);
  return new Date(naive - offset2);
}

/** Parse a `YYYY-MM-DDTHH:mm` string as a wall-clock time in `timeZone`. */
export function parseZonedInput(value: string, timeZone: string = APP_TIMEZONE): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number) as unknown as number[];
  const date = zonedTimeToUtc(y, mo, d, h, mi, timeZone);
  return isNaN(date.getTime()) ? null : date;
}

/** Human-friendly wall-clock string in the app timezone. */
export function formatDateTime(date: Date, timeZone: string = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatTime(date: Date, timeZone: string = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatDate(date: Date, timeZone: string = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/** `3 hours 30 minutes` style duration. */
export function humanizeMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const d = Math.floor(total / 1440);
  const h = Math.floor((total % 1440) / 60);
  const m = total % 60;
  const parts: string[] = [];
  if (d) parts.push(`${d} day${d === 1 ? '' : 's'}`);
  if (h) parts.push(`${h} hour${h === 1 ? '' : 's'}`);
  if (m) parts.push(`${m} minute${m === 1 ? '' : 's'}`);
  if (!parts.length) parts.push('0 minutes');
  return parts.join(' ');
}

/** `2 hours 15 minutes remaining` / `Deadline reached` / `Overdue by 35 minutes`. */
export function describeRemaining(deadline: Date, now: Date = new Date()): string {
  const diffMs = deadline.getTime() - now.getTime();
  if (diffMs >= 0) {
    const mins = diffMs / 60000;
    return `${humanizeMinutes(Math.ceil(mins))} remaining`;
  }
  const overdueMs = now.getTime() - deadline.getTime();
  const overdueMin = Math.floor(overdueMs / 60000);
  if (overdueMin < 1) return 'Deadline reached';
  return `Overdue by ${humanizeMinutes(overdueMin)}`;
}

/** Start/end instants of the current calendar day in the app timezone. */
export function dayBounds(date: Date = new Date(), timeZone: string = APP_TIMEZONE): { start: Date; end: Date } {
  const p = zonedParts(date, timeZone);
  const start = zonedTimeToUtc(p.year, p.month, p.day, 0, 0, timeZone);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end };
}

/** Clamp the elapsed fraction (0..1) of a task's duration. */
export function elapsedFraction(start: Date, durationMinutes: number, now: Date = new Date()): number {
  if (durationMinutes <= 0) return 1;
  const elapsed = (now.getTime() - start.getTime()) / 60000;
  return Math.min(1, Math.max(0, elapsed / durationMinutes));
}

/** Progress percentage 0..100. */
export function progressPercentage(start: Date, durationMinutes: number, now: Date = new Date()): number {
  return Math.round(elapsedFraction(start, durationMinutes, now) * 100);
}
