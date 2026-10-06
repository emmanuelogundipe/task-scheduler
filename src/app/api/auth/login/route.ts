import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPasscode } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { rateLimit, resetRateLimit, rateLimitKey } from '@/lib/rateLimit';

// POST /api/auth/login — throttled to slow brute-force attempts.
export async function POST(req: NextRequest) {
  try {
    const { whatsapp, passcode } = await req.json();

    if (!whatsapp || !passcode) {
      return NextResponse.json(
        { error: 'WhatsApp number and passcode are required.' },
        { status: 400 }
      );
    }

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const limit = rateLimit(rateLimitKey('login', ip), 10, 15 * 60 * 1000);
    if (!limit.allowed) {
      const mins = Math.ceil(limit.retryAfterMs / 60000);
      await logAudit({ action: 'ADMIN_LOGIN_RATE_LIMITED', details: `IP ${ip}` });
      return NextResponse.json(
        { error: `Too many login attempts. Please try again in ${mins} minute(s).` },
        { status: 429 }
      );
    }

    const settings = await prisma.settings.findFirst();
    if (!settings) {
      return NextResponse.json(
        { error: 'Application is not initialized. Please run the database seed.' },
        { status: 500 }
      );
    }

    const normalized = String(whatsapp).replace(/[^\d]/g, '');
    const adminNormalized = settings.adminWhatsapp.replace(/[^\d]/g, '');

    const passOk = await verifyPasscode(String(passcode), settings.adminPasscodeHash);
    if (normalized !== adminNormalized || !passOk) {
      await logAudit({ action: 'ADMIN_LOGIN_FAILED', details: `WhatsApp ${whatsapp}` });
      return NextResponse.json(
        { error: 'Invalid passcode or WhatsApp number.' },
        { status: 401 }
      );
    }

    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN', status: 'ACTIVE' } });
    if (!adminUser) {
      return NextResponse.json({ error: 'No active administrator account found.' }, { status: 500 });
    }

    const { createSession } = await import('@/lib/auth');
    await createSession(adminUser.id);
    resetRateLimit(rateLimitKey('login', ip));
    await logAudit({
      action: 'ADMIN_LOGIN',
      userId: adminUser.id,
      details: `${adminUser.name} signed in`,
    });

    return NextResponse.json({
      ok: true,
      admin: { id: adminUser.id, name: settings.adminName, whatsapp: settings.adminWhatsapp },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Login failed' }, { status: 500 });
  }
}
