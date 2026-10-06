import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

// GET /api/auth/session — current admin session
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ authenticated: false }, { status: 200 });

  const settings = await prisma.settings.findFirst();
  return NextResponse.json({
    authenticated: true,
    user: { id: user.id, name: user.name, role: user.role },
    admin: settings
      ? { name: settings.adminName, whatsapp: settings.adminWhatsapp }
      : null,
  });
}
