'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type AdminProfile = {
  id: number;
  name: string;
  email: string;
  whatsapp: string;
  googleEmail: string | null;
};

type Handler = { id: number; name: string; whatsapp: string };

export default function SettingsClient({ admin }: { admin: AdminProfile }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ---- Admin profile state ----
  const [profile, setProfile] = useState({
    name: admin.name,
    email: admin.email,
    whatsapp: admin.whatsapp,
    passcode: '',
  });
  const [profileMsg, setProfileMsg] = useState('');

  // ---- Google state ----
  const [googleConnected, setGoogleConnected] = useState(Boolean(admin.googleEmail));
  const [googleEmail, setGoogleEmail] = useState<string | null>(admin.googleEmail);
  const [googleMsg, setGoogleMsg] = useState('');

  // ---- Handlers state ----
  const [handlers, setHandlers] = useState<Handler[]>([]);
  const [newName, setNewName] = useState('');
  const [newWhatsapp, setNewWhatsapp] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [handlerMsg, setHandlerMsg] = useState('');

  // ---- Test notifications ----
  const [testMsg, setTestMsg] = useState('');

  const refreshHandlers = useCallback(async () => {
    const res = await fetch('/api/handlers');
    const data = await res.json();
    setHandlers(data.handlers ?? []);
  }, []);

  const refreshGoogle = useCallback(async () => {
    const res = await fetch('/api/google/status');
    const data = await res.json();
    setGoogleConnected(data.connected);
    setGoogleEmail(data.email);
  }, []);

  useEffect(() => {
    refreshHandlers();
    refreshGoogle();
  }, [refreshHandlers, refreshGoogle]);

  // Show OAuth result (?google=connected|error)
  useEffect(() => {
    const g = searchParams.get('google');
    if (g === 'connected') {
      setGoogleMsg('✅ Google Calendar connected successfully.');
      refreshGoogle();
    } else if (g === 'error') {
      setGoogleMsg('❌ Google connection failed — please try again.');
    }
  }, [searchParams, refreshGoogle]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  // ---- Profile save ----
  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg('');
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    const data = await res.json();
    if (res.ok) {
      setProfileMsg('✅ Profile updated. Use the new passcode next time you log in.');
    } else {
      setProfileMsg(`❌ ${data.error || 'Update failed'}`);
    }
  }

  // ---- Handler CRUD ----
  async function addHandler(e: React.FormEvent) {
    e.preventDefault();
    setHandlerMsg('');
    const res = await fetch('/api/handlers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, whatsapp: newWhatsapp }),
    });
    const data = await res.json();
    if (res.ok) {
      setNewName('');
      setNewWhatsapp('');
      setHandlerMsg(`✅ ${data.handler.name} added.`);
      refreshHandlers();
    } else {
      setHandlerMsg(`❌ ${data.error || 'Failed to add handler'}`);
    }
  }

  async function saveEdit(id: number) {
    setHandlerMsg('');
    const res = await fetch(`/api/handlers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, whatsapp: editWhatsapp }),
    });
    const data = await res.json();
    if (res.ok) {
      setEditingId(null);
      setHandlerMsg('✅ Handler updated.');
      refreshHandlers();
    } else {
      setHandlerMsg(`❌ ${data.error || 'Update failed'}`);
    }
  }

  async function deleteHandler(id: number, name: string) {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    setHandlerMsg('');
    const res = await fetch(`/api/handlers/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      setHandlerMsg(`✅ ${name} deleted.`);
      refreshHandlers();
    } else {
      setHandlerMsg(`❌ ${data.error || 'Delete failed'}`);
    }
  }

  // ---- Test notifications ----
  async function runTest(kind: 'whatsapp' | 'email') {
    setTestMsg('');
    const res = await fetch(`/api/test/${kind}`, { method: 'POST' });
    const data = await res.json();
    setTestMsg(
      data.ok
        ? `✅ Test ${kind} sent successfully.`
        : `❌ Test ${kind} failed: ${data.error ?? 'unknown error'}`
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard')} className="btn-ghost !px-3 !py-1.5 text-xs">
              ← Dashboard
            </button>
            <h1 className="text-sm font-bold">Settings</h1>
          </div>
          <button onClick={logout} className="btn-ghost !px-3 !py-1.5 text-xs">
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        {/* ============ Admin Profile ============ */}
        <section className="card space-y-4">
          <div>
            <h2 className="text-lg font-semibold">👤 Admin Profile</h2>
            <p className="mt-1 text-sm text-slate-400">
              Update your passcode, email and WhatsApp number. These are the credentials used to log in.
            </p>
          </div>
          <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Name</label>
              <input
                className="input"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">WhatsApp Number</label>
              <input
                className="input"
                value={profile.whatsapp}
                onChange={(e) => setProfile({ ...profile, whatsapp: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Email (receives deadline alerts)</label>
              <input
                type="email"
                className="input"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">New Passcode</label>
              <input
                className="input"
                placeholder="Enter new passcode"
                value={profile.passcode}
                onChange={(e) => setProfile({ ...profile, passcode: e.target.value })}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary">Save Profile</button>
              {profileMsg && <p className="mt-2 text-sm text-slate-400">{profileMsg}</p>}
            </div>
          </form>
        </section>

        {/* ============ Google Calendar ============ */}
        <section className="card space-y-4">
          <div>
            <h2 className="text-lg font-semibold">📅 Google Calendar Integration</h2>
            <p className="mt-1 text-sm text-slate-400">
              Link Engr. Mrs. Stella&apos;s Google account to create task events and deadline alerts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {googleConnected ? (
              <>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-400">
                  ✅ Connected{googleEmail ? ` — ${googleEmail}` : ''}
                </span>
                <a href="/api/google/auth" className="btn-ghost text-xs">
                  🔗 Re-link Account
                </a>
              </>
            ) : (
              <>
                <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-sm font-semibold text-slate-400">
                  ⚠️ Not connected
                </span>
                <a href="/api/google/auth" className="btn-primary text-xs">
                  🔗 Connect Google Calendar
                </a>
              </>
            )}
          </div>

          {googleMsg && <p className="text-sm text-slate-400">{googleMsg}</p>}

          <div className="border-t border-slate-800 pt-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-300">Test Notifications</h3>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => runTest('whatsapp')} className="btn-ghost text-xs">
                📱 Send Test WhatsApp
              </button>
              <button onClick={() => runTest('email')} className="btn-ghost text-xs">
                ✉️ Send Test Email
              </button>
            </div>
            {testMsg && <p className="mt-2 text-sm text-slate-400">{testMsg}</p>}
          </div>
        </section>

        {/* ============ Team Management ============ */}
        <section className="card space-y-4">
          <div>
            <h2 className="text-lg font-semibold">👥 Task Handlers</h2>
            <p className="mt-1 text-sm text-slate-400">
              Add, edit or remove team members who receive tasks and reminders.
            </p>
          </div>

          <form onSubmit={addHandler} className="flex flex-col gap-2 sm:flex-row">
            <input
              className="input sm:flex-1"
              placeholder="Name (e.g. Miss. Areta)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
            <input
              className="input sm:flex-1"
              placeholder="WhatsApp (e.g. +2348166460076)"
              value={newWhatsapp}
              onChange={(e) => setNewWhatsapp(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary shrink-0">+ Add Handler</button>
          </form>

          {handlerMsg && <p className="text-sm text-slate-400">{handlerMsg}</p>}

          <div className="divide-y divide-slate-800 overflow-hidden rounded-lg border border-slate-800">
            {handlers.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">No handlers yet.</p>
            ) : (
              handlers.map((h) => (
                <div key={h.id} className="flex flex-col gap-2 bg-slate-900/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  {editingId === h.id ? (
                    <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                      <input
                        className="input sm:flex-1"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Name"
                      />
                      <input
                        className="input sm:flex-1"
                        value={editWhatsapp}
                        onChange={(e) => setEditWhatsapp(e.target.value)}
                        placeholder="WhatsApp"
                      />
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-slate-200">{h.name}</p>
                      <p className="text-sm text-slate-500">{h.whatsapp}</p>
                    </div>
                  )}
                  <div className="flex shrink-0 gap-2">
                    {editingId === h.id ? (
                      <>
                        <button onClick={() => saveEdit(h.id)} className="btn-primary !px-3 !py-1 text-xs">Save</button>
                        <button onClick={() => setEditingId(null)} className="btn-ghost !px-3 !py-1 text-xs">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(h.id);
                            setEditName(h.name);
                            setEditWhatsapp(h.whatsapp);
                          }}
                          className="btn-ghost !px-3 !py-1 text-xs"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => deleteHandler(h.id, h.name)}
                          className="btn-ghost !border-red-500/40 !px-3 !py-1 text-xs !text-red-400 hover:!border-red-500"
                        >
                          🗑️ Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
