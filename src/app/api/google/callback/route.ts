import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode } from '@/lib/googleCalendar';

// GET /api/google/callback?code=... — OAuth2 redirect target
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL('/settings?google=error', req.url));
  }

  try {
    await exchangeCode(code);
    return NextResponse.redirect(new URL('/settings?google=connected', req.url));
  } catch (e) {
    console.error('[google] token exchange failed:', e);
    return NextResponse.redirect(new URL('/settings?google=error', req.url));
  }
}
