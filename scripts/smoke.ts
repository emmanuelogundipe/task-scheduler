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

  console.log('→ Assignment goes to BOTH handler and admin');
  const { runSchedulerCycle } = await import('../src/lib/scheduler');
  const { prisma } = await import('../src/lib/prisma');
  const assignedLogs = await prisma.notificationLog.findMany({
    where: { taskId, notificationType: 'TASK_ASSIGNED' },
  });
  assert(assignedLogs.length === 2, 'assignment notification logged for handler and admin');

  console.log('→ Scheduler: deadline reminder (past task, sent once to both)');
  await runSchedulerCycle(new Date());
  const afterFirst = await prisma.task.findUnique({ where: { id: taskId } });
  assert(afterFirst?.status === 'OVERDUE', 'overdue task marked OVERDUE');
  assert(afterFirst?.deadlineNotificationSent === true, 'deadline reminder flagged');
  const deadlineLogs = await prisma.notificationLog.count({
    where: { taskId, notificationType: 'DEADLINE_REMINDER' },
  });
  assert(deadlineLogs === 2, 'deadline reminder sent to handler and admin');

  console.log('→ Scheduler: day-before reminder (long task within 24h of deadline)');
  const now = Date.now();
  const longTask = await api('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({
      handlerId: handler.id,
      title: 'Smoke Long Task',
      description: 'Day-before timing test.',
      startDateTime: zonedInput(new Date(now - 2 * 24 * 60 * 60 * 1000)), // started 2 days ago
      durationMinutes: 2 * 24 * 60 + 12 * 60, // ~60h → deadline in ~12h
    }),
  });
  assert(longTask.status === 201, 'long task created');
  const longId = longTask.data.task.id;

  await runSchedulerCycle(new Date());
  const longRow = await prisma.task.findUnique({ where: { id: longId } });
  assert(longRow?.dayBeforeReminderSent === true, 'day-before reminder flagged once');
  const dayBeforeLogs = await prisma.notificationLog.count({
    where: { taskId: longId, notificationType: 'DAY_BEFORE_REMINDER' },
  });
  assert(dayBeforeLogs === 2, 'day-before reminder sent to handler and admin');

  console.log('→ Scheduler: short task skips the day-before reminder');
  const shortTask = await api('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({
      handlerId: handler.id,
      title: 'Smoke Short Task',
      description: 'Short-task timing test.',
      startDateTime: zonedInput(new Date(now)),
      durationMinutes: 4 * 60, // 4 hours
    }),
  });
  const shortId = shortTask.data.task.id;
  await runSchedulerCycle(new Date());
  const shortRow = await prisma.task.findUnique({ where: { id: shortId } });
  assert(shortRow?.dayBeforeReminderSent === false, 'short task has no day-before reminder');
  assert(shortRow?.deadlineNotificationSent === false, 'short task not past deadline yet');

  console.log('→ Duplicate protection on re-run');
  const dupBefore = await prisma.notificationLog.count({ where: { taskId: longId } });
  await runSchedulerCycle(new Date());
  const dupAfter = await prisma.notificationLog.count({ where: { taskId: longId } });
  assert(dupBefore === dupAfter, 'no duplicate reminders on re-run');

  // Clean up the timing-test tasks.
  await api(`/api/tasks/${longId}`, { method: 'DELETE' });
  await api(`/api/tasks/${shortId}`, { method: 'DELETE' });

  console.log('→ Duplicate protection (deadline task)');
  const before = await prisma.notificationLog.count({ where: { taskId } });
  await runSchedulerCycle(new Date());
  const after = await prisma.notificationLog.count({ where: { taskId } });
  assert(before === after, 'no duplicate deadline reminder on re-run');

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
