import { NextResponse } from 'next/server';
import { getSessionAdmin } from '@/lib/auth';
import { notifyEmail } from '@/lib/notifications';

// POST /api/test/email — send a test email to the admin's address
export async function POST() {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await notifyEmail(
    null,
    admin.email,
    '✅ Test Email — Task Scheduler',
    `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
       <h2 style="color:#4f46e5">✅ Email integration working</h2>
       <p>This is a test email from your In-Office Task Scheduler.</p>
       <p>Deadline alerts will be sent to <b>${admin.email}</b>.</p>
     </div>`
  );
  return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
