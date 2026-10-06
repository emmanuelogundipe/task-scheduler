'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AppProvider } from './AppContext';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/tasks', label: 'Tasks', icon: '🗂️' },
  { href: '/team', label: 'Team', icon: '👥' },
  { href: '/notifications', label: 'Notifications', icon: '🔔' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function AppShell({
  children,
  adminName,
  adminWhatsapp,
  whatsappConfigured,
}: {
  children: React.ReactNode;
  adminName: string;
  adminWhatsapp: string;
  whatsappConfigured: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Light polling so background scheduler state (progress, milestones)
  // appears on the page without a manual reload.
  useEffect(() => {
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, [refresh]);

  // Close the mobile menu whenever the route changes.
  useEffect(() => setMenuOpen(false), [pathname]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <AppProvider
      value={{ refreshKey, refresh, adminName, adminWhatsapp, whatsappConfigured }}
    >
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/85 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-lg shadow-lg shadow-brand-600/30">
                🧭
              </div>
              <div className="leading-tight">
                <h1 className="text-sm font-bold">Odyssey Scheduler</h1>
                <p className="hidden text-xs text-slate-500 sm:block">
                  Task Management &amp; WhatsApp Reminders
                </p>
              </div>
            </Link>

            <nav className="hidden items-center gap-1 lg:flex">
              {NAV.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      active
                        ? 'bg-brand-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="mr-1.5">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              <span
                title={whatsappConfigured ? 'UltraMsg connected' : 'UltraMsg not configured'}
                className={`hidden h-2.5 w-2.5 rounded-full sm:block ${
                  whatsappConfigured ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold leading-tight">{adminName}</p>
                <p className="text-xs text-slate-500">{adminWhatsapp}</p>
              </div>
              <button onClick={logout} className="btn-ghost !px-3 !py-1.5 text-xs">
                Logout
              </button>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="btn-ghost !px-3 !py-1.5 text-xs lg:hidden"
                aria-label="Toggle navigation"
              >
                ☰
              </button>
            </div>
          </div>

          {menuOpen && (
            <nav className="border-t border-slate-800 px-4 pb-3 pt-2 lg:hidden">
              {NAV.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                      active ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>

        <footer className="mx-auto max-w-7xl px-4 pb-8 pt-2 text-center text-xs text-slate-600 sm:px-6">
          Odyssey Scheduler · Odyssey Educational Foundation · WhatsApp via UltraMsg
        </footer>
      </div>
    </AppProvider>
  );
}
