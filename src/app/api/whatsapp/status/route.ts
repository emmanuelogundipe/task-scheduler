import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api';
import { whatsappConfigured, whatsappInstanceStatus, maskSecret } from '@/services/ultramsgService';

// GET /api/whatsapp/status — integration status (credentials masked)
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const instance = process.env.ULTR_INSTANCE_ID || process.env.ULTRA_INSTANCE_ID || '';
  const token = process.env.ULTRA_TOKEN || '';

  return NextResponse.json({
    provider: 'UltraMsg',
    configured: whatsappConfigured(),
    instanceStatus: whatsappInstanceStatus(),
    instanceId: instance ? maskSecret(instance, 3) : '',
    tokenMasked: token ? maskSecret(token) : '',
  });
}
