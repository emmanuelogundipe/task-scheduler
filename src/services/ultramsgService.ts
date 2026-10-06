// ============================================================
// UltraMsg WhatsApp Service
// The ONLY external communication integration used by
// Odyssey Scheduler. Credentials come exclusively from
// environment variables and are never exposed to the browser.
//
// Docs: https://app.ultramsg.com/api-docs
// ============================================================

const INSTANCE = process.env.ULTR_INSTANCE_ID || process.env.ULTRA_INSTANCE_ID || '';
const TOKEN = process.env.ULTRA_TOKEN || '';

const ULTRAMSG_BASE = 'https://api.ultramsg.com';

export function whatsappConfigured(): boolean {
  return Boolean(INSTANCE && TOKEN);
}

export function whatsappInstanceStatus(): 'connected' | 'not_configured' {
  return whatsappConfigured() ? 'connected' : 'not_configured';
}

/** Mask a token so it is safe to render in the UI. */
export function maskSecret(value: string, visible = 0): string {
  if (!value) return '';
  const shown = visible > 0 ? value.slice(0, visible) : '';
  return `${shown}${'•'.repeat(Math.max(8, value.length - visible))}`;
}

export interface WhatsAppResult {
  ok: boolean;
  id?: string;
  status: 'SENT' | 'FAILED' | 'PENDING';
  error?: string;
  providerResponse?: string;
  attempts?: number;
}

function normalizeNumber(to: string): string {
  // UltraMsg expects the number without a leading '+'.
  return to.replace(/[^\d]/g, '');
}

/**
 * Send a WhatsApp message via UltraMsg with bounded retry/backoff.
 * Never throws — failures are reported so callers can log them
 * without crashing the request or the scheduler.
 */
export async function sendWhatsApp(
  to: string,
  body: string,
  { retries = 2 }: { retries?: number } = {}
): Promise<WhatsAppResult> {
  if (!whatsappConfigured()) {
    return {
      ok: false,
      status: 'FAILED',
      error: 'WhatsApp not configured — set ULTR_INSTANCE_ID and ULTRA_TOKEN in .env',
    };
  }

  const recipient = normalizeNumber(to);
  if (!recipient) {
    return { ok: false, status: 'FAILED', error: `Invalid WhatsApp number: "${to}"` };
  }

  const url = `${ULTRAMSG_BASE}/instance${INSTANCE}/messages/chat`;
  let lastError = 'Unknown UltraMsg error';
  let lastResponse: string | undefined;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: TOKEN, to: recipient, body }),
        // Don't let the scheduler hang on a slow network
        signal: AbortSignal.timeout(15000),
      });

      const raw = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(raw);
      } catch {
        data = { raw };
      }

      const sent =
        res.ok && (data?.sent === true || data?.sent === 'true' || Boolean(data?.id));

      if (sent) {
        return {
          ok: true,
          status: 'SENT',
          id: data?.id ? String(data.id) : undefined,
          providerResponse: raw.slice(0, 500),
          attempts: attempt,
        };
      }

      lastError = data?.error || data?.message || `HTTP ${res.status}`;
      lastResponse = raw.slice(0, 500);
    } catch (e: any) {
      lastError = e?.name === 'TimeoutError' ? 'UltraMsg request timed out' : e?.message ?? 'Network error';
    }

    // Exponential-ish backoff before the next retry
    if (attempt <= retries) await new Promise((r) => setTimeout(r, 400 * attempt));
  }

  return {
    ok: false,
    status: 'FAILED',
    error: lastError,
    providerResponse: lastResponse,
    attempts: retries + 1,
  };
}
