// ============================================================
// WhatsApp Service — UltraMsg API
// Docs: https://app.ultramsg.com/api-docs
// Swap this module for Twilio / WhatsApp Business API by
// keeping the same `sendWhatsApp(to, body)` signature.
// ============================================================

const INSTANCE = process.env.ULTRA_INSTANCE_ID;
const TOKEN = process.env.ULTRA_TOKEN;

export function whatsappConfigured() {
  return Boolean(INSTANCE && TOKEN);
}

export async function sendWhatsApp(
  to: string,
  body: string
): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!whatsappConfigured()) {
    return {
      ok: false,
      error: 'WhatsApp not configured — set ULTRA_INSTANCE_ID and ULTRA_TOKEN in .env',
    };
  }

  try {
    const params = new URLSearchParams({ token: TOKEN!, to, body });
    const res = await fetch(
      `https://api.ultramsg.com/instance${INSTANCE}/messages/chat?${params.toString()}`
    );
    const data = await res.json().catch(() => ({}));

    // UltraMsg returns { sent: true, id: "..." } on success
    const sent = res.ok && (data?.sent === true || data?.sent === 'true' || Boolean(data?.id));
    if (sent) {
      return { ok: true, id: data?.id };
    }
    return { ok: false, error: JSON.stringify(data) || `HTTP ${res.status}` };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Network error' };
  }
}
