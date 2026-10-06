// ============================================================
// API guard — require an authenticated, active administrator.
// ============================================================

import { NextResponse } from 'next/server';
import { getSessionUser } from './auth';
import type { User } from '@prisma/client';

export async function requireAdmin(): Promise<
  { user: User; error: null } | { user: null; error: NextResponse }
> {
  const user = await getSessionUser();
  if (!user || user.role !== 'ADMIN') {
    return {
      user: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return { user, error: null };
}
