import { NextResponse } from 'next/server';
import { getSessionAdmin } from '@/lib/auth';
import { notifyWhatsApp } from '@/lib/notifications';

// POST /api/test/whatsapp — send a test WhatsApp to the admin's number
export async function POST() {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await notifyWhatsApp(
    null,
    admin.whatsapp,
    `✅ Test message from your Task Scheduler.\n\nWhatsApp integration is working correctly.`
  );
  return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
