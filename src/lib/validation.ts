// ============================================================
// Input validation helpers — shared by API routes.
// ============================================================

/** Keep only digits (UltraMsg expects no leading '+'). */
export function normalizeWhatsApp(raw: string): string {
  return String(raw ?? '').replace(/[^\d]/g, '');
}

/**
 * Validate a WhatsApp number. Accepts an optional leading '+',
 * spaces/dashes, and 8–15 digits.
 */
export function isValidWhatsApp(raw: string): boolean {
  const trimmed = String(raw ?? '').trim();
  if (!/^\+?[\d\s\-()]+$/.test(trimmed)) return false;
  const digits = normalizeWhatsApp(trimmed);
  return digits.length >= 8 && digits.length <= 15;
}

export function isValidInterval(value: unknown): boolean {
  const n = Number(value);
  return Number.isFinite(n) && Number.isInteger(n) && n >= 1 && n <= 1440;
}

export function parsePositiveInt(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/** Returns an error string or null. */
export function validateTaskInput(input: {
  title?: unknown;
  startDateTime?: unknown;
  durationMinutes?: unknown;
}): string | null {
  if (!input.title || String(input.title).trim().length === 0) {
    return 'Task title cannot be empty.';
  }
  const duration = Number(input.durationMinutes);
  if (!Number.isFinite(duration) || duration <= 0) {
    return 'Duration must be a positive number of minutes.';
  }
  const start = new Date(input.startDateTime as string);
  if (isNaN(start.getTime())) {
    return 'Start time is invalid.';
  }
  return null;
}
