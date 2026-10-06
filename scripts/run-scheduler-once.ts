// ============================================================
// Run one scheduler pass and exit.
// Useful on serverless / external-cron hosts where the
// long-running node-cron engine is not available.
//
//   npx tsx scripts/run-scheduler-once.ts
//   # or schedule with cron every minute on your server:
//   * * * * * cd /app && npx tsx scripts/run-scheduler-once.ts
// ============================================================

import { runSchedulerCycle } from '../src/lib/scheduler';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('[scheduler-once] running a single cycle…');
  await runSchedulerCycle();
  console.log('[scheduler-once] done.');
}

main()
  .catch((e) => {
    console.error('[scheduler-once] error:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
