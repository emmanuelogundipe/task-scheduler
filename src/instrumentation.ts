// Next.js instrumentation hook — starts the node-cron reminder
// engine alongside the Node.js server (both dev and production),
// and seeds the database on first boot if it is empty.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { ensureSeeded } = await import('./lib/bootstrap');
      await ensureSeeded();
    } catch (e) {
      console.error('[instrumentation] bootstrap error:', e);
    }

    const { startScheduler } = await import('./lib/scheduler');
    startScheduler();
  }
}
