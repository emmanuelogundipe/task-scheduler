import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// POST /api/auth/logout
export async function POST() {
  try {
    const { getSessionUser } = await import('@/lib/auth');
    const user = await getSessionUser();
    if (user) await logAudit({ action: 'ADMIN_LOGOUT', userId: user.id, details: `${user.name} signed out` });
  } catch {
    /* ignore */
  }
  await destroySession();
  return NextResponse.json({ ok: true });
}
