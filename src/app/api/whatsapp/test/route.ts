import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api';
import { sendAndLog, testMessage } from '@/lib/notifications';
import { APP_TIMEZONE } from '@/lib/time';

// POST /api/whatsapp/test — send a test WhatsApp to the admin number
export async function POST() {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const settings = await prisma.settings.findFirst();
  if (!settings) return NextResponse.json({ error: 'Settings not initialized' }, { status: 500 });

  const result = await sendAndLog({
    taskId: null,
    recipientUserId: user.id,
    type: 'TEST_MESSAGE',
    to: settings.adminWhatsapp,
    message: testMessage(settings.timezone || APP_TIMEZONE),
    timezone: settings.timezone || APP_TIMEZONE,
  });

  return NextResponse.json(
    {
      ok: result.ok,
      status: result.status,
      error: result.error ?? null,
      message: result.ok
        ? `Test WhatsApp sent to ${settings.adminWhatsapp}.`
        : `Test failed: ${result.error ?? 'unknown error'}`,
    },
    { status: result.ok ? 200 : 502 }
  );
}
