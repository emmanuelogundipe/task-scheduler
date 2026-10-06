import { NextRequest, NextResponse } from 'next/server';
import { runSchedulerCycle } from '@/lib/scheduler';

// GET/POST /api/cron/run
//
// Runs a single scheduler pass. Intended for hosts where the
// long-running node-cron engine is unavailable (e.g. Render free
// tier that spins down), so an external cron can trigger it every
// minute.
//
// Protected by the CRON_SECRET environment variable. If CRON_SECRET
// is unset, the endpoint is disabled (the in-process scheduler
// remains the source of truth).
async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'Cron endpoint disabled. Set CRON_SECRET to enable it.' },
      { status: 404 }
    );
  }

  const provided =
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    req.nextUrl.searchParams.get('secret') ||
    '';

  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await runSchedulerCycle();
    return NextResponse.json({ ok: true, ranAt: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Scheduler run failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
