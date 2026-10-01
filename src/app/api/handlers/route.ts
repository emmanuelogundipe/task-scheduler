import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionAdmin } from '@/lib/auth';

// GET /api/handlers — list all task handlers
export async function GET() {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const handlers = await prisma.handler.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json({ handlers });
}

// POST /api/handlers — add a new task handler
export async function POST(req: NextRequest) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { name, whatsapp } = await req.json();
    if (!name || !whatsapp) {
      return NextResponse.json({ error: 'Name and WhatsApp number are required' }, { status: 400 });
    }

    const handler = await prisma.handler.create({
      data: { name: String(name).trim(), whatsapp: String(whatsapp).trim(), adminId: admin.id },
    });
    return NextResponse.json({ handler }, { status: 201 });
  } catch (e: any) {
    // SQLite unique constraint on whatsapp
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'A handler with this WhatsApp number already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
