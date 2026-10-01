import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { passcode, whatsapp } = await req.json();
    if (!passcode || !whatsapp) {
      return NextResponse.json(
        { error: 'Passcode and WhatsApp number are required' },
        { status: 400 }
      );
    }

    const admin = await prisma.admin.findFirst();
    if (!admin || admin.passcode !== passcode || admin.whatsapp !== whatsapp) {
      return NextResponse.json(
        { error: 'Invalid passcode or WhatsApp number' },
        { status: 401 }
      );
    }

    await createSession(admin.id);
    return NextResponse.json({
      ok: true,
      admin: { name: admin.name, email: admin.email, whatsapp: admin.whatsapp },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
