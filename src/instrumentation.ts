// Next.js instrumentation hook — starts the node-cron scheduler
// alongside the Node.js server (both dev and production).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startScheduler } = await import('./lib/scheduler');
    startScheduler();
  }
}
