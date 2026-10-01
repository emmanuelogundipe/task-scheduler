import { NextResponse } from 'next/server';
import { getSessionAdmin } from '@/lib/auth';
import { isGoogleConnected, getGoogleEmail } from '@/lib/googleCalendar';

// GET /api/google/status — is a Google account linked?
export async function GET() {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const connected = await isGoogleConnected();
  const email = connected ? await getGoogleEmail() : null;
  return NextResponse.json({ connected, email });
}
