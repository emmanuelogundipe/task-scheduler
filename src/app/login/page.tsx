import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import LoginForm from '@/components/LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect('/dashboard');

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-brand-600/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl shadow-lg shadow-brand-600/40">
            🧭
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Odyssey Scheduler</h1>
          <p className="mt-2 text-sm text-slate-400">
            Task Management &amp; WhatsApp Reminders
          </p>
        </div>

        <LoginForm />

        <p className="mt-6 text-center text-xs text-slate-600">
          Restricted area — administrator access only.
        </p>
      </div>
    </main>
  );
}
