import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { hashPasscode } from '@/lib/auth';
import { isValidWhatsApp, isValidInterval, normalizeWhatsApp } from '@/lib/validation';
import { fetchInstanceStatus, maskSecret } from '@/services/ultramsgService';

// GET /api/settings — admin profile + live WhatsApp integration status
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const settings = await prisma.settings.findFirst();
  if (!settings) return NextResponse.json({ error: 'Settings not initialized' }, { status: 500 });

  const instance = process.env.ULTR_INSTANCE_ID || process.env.ULTRA_INSTANCE_ID || '';
  const token = process.env.ULTRA_TOKEN || '';
  const live = await fetchInstanceStatus();

  return NextResponse.json({
    settings: {
      adminName: settings.adminName,
      adminWhatsapp: settings.adminWhatsapp,
      reminderIntervalMinutes: settings.reminderIntervalMinutes,
      timezone: settings.timezone,
    },
    whatsapp: {
      provider: 'UltraMsg',
      configured: live.configured,
      connected: live.connected,
      instanceStatus: live.connected ? 'connected' : live.configured ? 'not_connected' : 'not_configured',
      statusDetail: live.status,
      error: live.error ?? null,
      instanceId: instance ? maskSecret(instance, 3) : '',
      tokenMasked: token ? maskSecret(token) : '',
    },
  });
}

// PATCH /api/settings — update admin profile and reminder interval
export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const settings = await prisma.settings.findFirst();
    if (!settings) return NextResponse.json({ error: 'Settings not initialized' }, { status: 500 });

    const data: any = {};
    const changes: string[] = [];

    if (body.adminName !== undefined) {
      if (!String(body.adminName).trim()) {
        return NextResponse.json({ error: 'Admin name cannot be empty.' }, { status: 400 });
      }
      data.adminName = String(body.adminName).trim();
      changes.push('name');
    }

    if (body.adminWhatsapp !== undefined) {
      if (!body.adminWhatsapp || !isValidWhatsApp(body.adminWhatsapp)) {
        return NextResponse.json({ error: 'Admin WhatsApp number cannot be empty and must be valid.' }, { status: 400 });
      }
      data.adminWhatsapp = normalizeWhatsApp(body.adminWhatsapp);
      changes.push('whatsapp number');
    }

    if (body.reminderIntervalMinutes !== undefined) {
      if (!isValidInterval(body.reminderIntervalMinutes)) {
        return NextResponse.json(
          { error: 'Reminder interval must be a whole number between 1 and 1440 minutes.' },
          { status: 400 }
        );
      }
      data.reminderIntervalMinutes = Number(body.reminderIntervalMinutes);
      changes.push('reminder interval');
    }

    if (body.adminPasscode !== undefined && String(body.adminPasscode).length > 0) {
      if (String(body.adminPasscode).length < 4) {
        return NextResponse.json({ error: 'Passcode must be at least 4 characters.' }, { status: 400 });
      }
      data.adminPasscodeHash = await hashPasscode(String(body.adminPasscode));
      changes.push('passcode');
    }

    if (!changes.length) {
      return NextResponse.json({ error: 'No changes supplied.' }, { status: 400 });
    }

    const updated = await prisma.settings.update({ where: { id: settings.id }, data });

    // Keep the ADMIN user record in sync with the profile.
    if (data.adminName || data.adminWhatsapp) {
      const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
      if (adminUser) {
        await prisma.user.update({
          where: { id: adminUser.id },
          data: {
            ...(data.adminName ? { name: data.adminName } : {}),
            ...(data.adminWhatsapp ? { whatsappNumber: data.adminWhatsapp } : {}),
          },
        });
      }
    }

    await logAudit({
      action: 'ADMIN_SETTINGS_CHANGED',
      userId: user.id,
      details: `Updated: ${changes.join(', ')}`,
    });

    return NextResponse.json({
      settings: {
        adminName: updated.adminName,
        adminWhatsapp: updated.adminWhatsapp,
        reminderIntervalMinutes: updated.reminderIntervalMinutes,
        timezone: updated.timezone,
      },
    });
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'That WhatsApp number is already in use.' }, { status: 409 });
    }
    return NextResponse.json({ error: e?.message ?? 'Failed to update settings' }, { status: 500 });
  }
}
