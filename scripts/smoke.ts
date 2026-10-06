// ============================================================
// End-to-end smoke test (requires a running server).
//   npm start            # in one shell
//   npx tsx scripts/smoke.ts
// Verifies auth, task lifecycle, notifications logging and the
// scheduler engine against the live HTTP API + database.
// ============================================================

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3000';

let cookie = '';

async function api(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      ...(options.headers ?? {}),
    },
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const text = await res.text();
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

function assert(cond: any, message: string) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${message}`);
  console.log(`  ✓ ${message}`);
}

/** Format an instant as a `YYYY-MM-DDTHH:mm` wall-clock string in Africa/Lagos. */
function zonedInput(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}`;
}

async function main() {
  console.log('→ Health');
  const health = await api('/api/health');
  assert(health.status === 200, 'health endpoint responds');

  console.log('→ Login: incorrect credentials rejected');
  const bad = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ whatsapp: '+2348133226669', passcode: 'wrong' }),
  });
  assert(bad.status === 401, 'wrong passcode returns 401');

  console.log('→ Login: correct credentials');
  const login = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ whatsapp: '+2348133226669', passcode: 'Engstella' }),
  });
  assert(login.status === 200 && login.data.ok, 'admin login succeeds');
  assert(cookie.startsWith('odyssey_session='), 'httpOnly session cookie issued');

  console.log('→ Unauthenticated request blocked');
  const savedCookie = cookie;
  cookie = '';
  const unauth = await api('/api/tasks');
  assert(unauth.status === 401, 'tasks require authentication');
  cookie = savedCookie;

  console.log('→ Team');
  const team = await api('/api/team');
  assert(team.status === 200 && team.data.handlers.length >= 6, 'seeded handlers present');
  const handler = team.data.handlers[0];

  console.log('→ Create task (invalid deadline rejected)');
  const invalid = await api('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({
      handlerId: handler.id,
      title: 'Bad task',
      startDateTime: '2030-01-01T10:00',
      durationMinutes: 0,
    }),
  });
  assert(invalid.status === 400, 'zero duration rejected');

  console.log('→ Create task (valid)');
  const created = await api('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({
      handlerId: handler.id,
      title: 'Smoke Test Newsletter',
      description: 'Automated smoke test task.',
      startDateTime: '2020-01-01T10:00', // in the past → deadline already passed
      durationMinutes: 60,
    }),
  });
  assert(created.status === 201, 'task created');
  assert(created.data.task.status === 'IN_PROGRESS', 'new task is IN_PROGRESS');
  assert(created.data.whatsappSent === false, 'WhatsApp failure does not break creation');
  const taskId = created.data.task.id;

  console.log('→ Filter + search');
  const filtered = await api('/api/tasks?status=IN_PROGRESS&search=Smoke');
  assert(filtered.status === 200 && filtered.data.tasks.length >= 1, 'filter/search works');

  console.log('→ Scheduler: deadline notification (past task, sent once)');
  const { runSchedulerCycle } = await import('../src/lib/scheduler');
  const { prisma } = await import('../src/lib/prisma');
  await runSchedulerCycle(new Date());
  const afterFirst = await prisma.task.findUnique({ where: { id: taskId } });
  assert(afterFirst?.status === 'OVERDUE', 'overdue task marked OVERDUE');
  assert(afterFirst?.deadlineNotificationSent === true, 'deadline notification flagged once');
  assert(afterFirst?.milestone50Sent === false, 'no milestone fired after the deadline');

  console.log('→ Scheduler: in-flight task milestones + reminders');
  const now = Date.now();
  const live = await api('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({
      handlerId: handler.id,
      title: 'Smoke Milestone Task',
      description: 'Milestone timing test.',
      startDateTime: zonedInput(new Date(now - 50 * 60000)), // started 50 min ago
      durationMinutes: 100, // 50% elapsed now
    }),
  });
  assert(live.status === 201, 'in-flight task created');
  const liveId = live.data.task.id;

  // 50%: first cycle fires the reminder + 50% milestone.
  await runSchedulerCycle(new Date());
  const at50 = await prisma.task.findUnique({ where: { id: liveId } });
  assert(at50?.milestone50Sent === true, '50% milestone sent once');
  assert(at50?.milestone70Sent === false, '70% milestone not sent yet');
  assert(at50?.lastReminderAt != null, 'handler reminder recorded');

  // 70%: advance the clock 20 minutes (70% of 100 min).
  await runSchedulerCycle(new Date(now + 20 * 60000));
  const at70 = await prisma.task.findUnique({ where: { id: liveId } });
  assert(at70?.milestone70Sent === true, '70% milestone sent once');

  console.log('→ Duplicate protection on re-run');
  const dupBefore = await prisma.notificationLog.count({ where: { taskId: liveId } });
  await runSchedulerCycle(new Date(now + 20 * 60000));
  const dupAfter = await prisma.notificationLog.count({ where: { taskId: liveId } });
  assert(dupBefore === dupAfter, 'no duplicate milestone notifications');

  // Clean up the milestone task.
  await api(`/api/tasks/${liveId}`, { method: 'DELETE' });

  console.log('→ Duplicate protection (deadline task)');
  const before = await prisma.notificationLog.count({ where: { taskId } });
  await runSchedulerCycle(new Date());
  const after = await prisma.notificationLog.count({ where: { taskId } });
  assert(before === after, 'no duplicate deadline notification on re-run');

  console.log('→ Notifications history');
  const notifs = await api(`/api/notifications?taskId=${taskId}`);
  assert(notifs.status === 200 && notifs.data.notifications.length === before, 'notification log persisted');

  console.log('→ Completion stops notifications');
  const complete = await api(`/api/tasks/${taskId}/complete`, { method: 'POST' });
  assert(complete.status === 200 && complete.data.task.status === 'PENDING_APPROVAL', 'task pending approval');
  const before2 = await prisma.notificationLog.count({ where: { taskId } });
  await runSchedulerCycle(new Date());
  const after2 = await prisma.notificationLog.count({ where: { taskId } });
  assert(before2 === after2, 'completed task generates no further notifications');

  console.log('→ Approve');
  const approve = await api(`/api/tasks/${taskId}/approve`, { method: 'POST' });
  assert(approve.status === 200 && approve.data.task.status === 'COMPLETED', 'task approved/completed');

  console.log('→ Audit logs');
  const logs = await api('/api/logs');
  assert(logs.status === 200 && logs.data.logs.length > 0, 'audit log has entries');

  console.log('→ Cleanup');
  await api(`/api/tasks/${taskId}`, { method: 'DELETE' });
  await prisma.$disconnect();

  console.log('\n✅ Smoke test passed.');
}

main().catch((e) => {
  console.error('\n❌ Smoke test failed:', e.message);
  process.exit(1);
});
