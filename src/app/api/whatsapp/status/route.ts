import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api';
import { maskSecret, fetchInstanceStatus } from '@/services/ultramsgService';

// GET /api/whatsapp/status — live UltraMsg integration status.
// Queries UltraMsg so the UI reflects whether WhatsApp is truly linked.
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const instance = process.env.ULTR_INSTANCE_ID || process.env.ULTRA_INSTANCE_ID || '';
  const token = process.env.ULTRA_TOKEN || '';

  const live = await fetchInstanceStatus();

  return NextResponse.json({
    provider: 'UltraMsg',
    configured: live.configured,
    // `connected` is the real, live answer from UltraMsg.
    connected: live.connected,
    instanceStatus: live.connected ? 'connected' : live.configured ? 'not_connected' : 'not_configured',
    statusDetail: live.status,
    error: live.error ?? null,
    instanceId: instance ? maskSecret(instance, 3) : '',
    tokenMasked: token ? maskSecret(token) : '',
  });
}
