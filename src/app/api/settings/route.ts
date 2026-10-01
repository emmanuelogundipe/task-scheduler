import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionAdmin } from '@/lib/auth';

// GET /api/settings — admin profile
export async function GET() {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({
    admin: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      whatsapp: admin.whatsapp,
      googleEmail: admin.googleEmail,
    },
  });
}

// PUT /api/settings — update admin profile (passcode / email / whatsapp)
export async function PUT(req: NextRequest) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { name, email, whatsapp, passcode } = await req.json();
    if (!name || !email || !whatsapp || !passcode) {
      return NextResponse.json(
        { error: 'Name, email, whatsapp and passcode are all required' },
        { status: 400 }
      );
    }

    const updated = await prisma.admin.update({
      where: { id: admin.id },
      data: {
        name: String(name).trim(),
        email: String(email).trim(),
        whatsapp: String(whatsapp).trim(),
        passcode: String(passcode).trim(),
      },
    });

    return NextResponse.json({
      admin: { id: updated.id, name: updated.name, email: updated.email, whatsapp: updated.whatsapp },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
