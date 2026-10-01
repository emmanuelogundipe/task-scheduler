import { NextResponse } from 'next/server';

// Lightweight health check for uptime monitors (e.g., UptimeRobot).
// Returns 200 OK so free-tier hosting stays awake and the cron
// scheduler keeps running.
export async function GET() {
  return NextResponse.json({ status: 'ok', uptime: process.uptime() });
}
