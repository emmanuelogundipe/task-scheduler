import { NextResponse } from 'next/server';
import { getSessionAdmin } from '@/lib/auth';
import { getAuthUrl } from '@/lib/googleCalendar';

// GET /api/google/auth — start the Google OAuth2 connection flow
export async function GET() {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.redirect(getAuthUrl());
}
