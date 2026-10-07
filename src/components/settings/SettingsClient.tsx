'use client';

import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../AppContext';

interface SettingsData {
  adminName: string;
  adminWhatsapp: string;
  reminderIntervalMinutes: number;
  timezone: string;
}

interface WhatsappStatus {
  provider: string;
  configured: boolean;
  connected: boolean;
  instanceStatus: string;
  statusDetail: string;
  error: string | null;
  instanceId: string;
  tokenMasked: string;
}

export default function SettingsClient() {
  const { refresh } = useApp();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [whatsapp, setWhatsapp] = useState<WhatsappStatus | null>(null);
  const [name, setName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [passcode, setPasscode] = useState('');
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [testMsg, setTestMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if (!res.ok) return;
    setSettings(data.settings);
    setWhatsapp(data.whatsapp);
    setName(data.settings.adminName);
    setWhatsappNumber(data.settings.adminWhatsapp);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminName: name,
          adminWhatsapp: whatsappNumber,
          ...(passcode ? { adminPasscode: passcode } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ text: data.error ?? 'Update failed', ok: false });
        return;
      }
      setSettings(data.settings);
      setPasscode('');
      setMsg({ text: 'Settings saved successfully.', ok: true });
      refresh();
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    setTestMsg(null);
    try {
      const res = await fetch('/api/whatsapp/test', { method: 'POST' });
      const data = await res.json();
      setTestMsg({ text: data.message ?? (data.ok ? 'Sent.' : data.error), ok: Boolean(data.ok) });
    } catch {
      setTestMsg({ text: 'Network error while testing WhatsApp.', ok: false });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-sm text-slate-400">Administrator profile, reminders and WhatsApp integration.</p>
      </div>

      {msg && (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            msg.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-red-500/30 bg-red-500/10 text-red-400'
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Admin profile */}
      <section className="card space-y-4">
        <div>
          <h2 className="text-lg font-semibold">👤 Admin Profile</h2>
          <p className="mt-1 text-sm text-slate-400">
            Update the administrator name, login WhatsApp number and passcode.
          </p>
        </div>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Admin Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Admin WhatsApp Number</label>
            <input className="input" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} required />
          </div>
          <div>
            <label className="label">New Passcode (leave blank to keep current)</label>
            <input
              type="password"
              className="input"
              placeholder="New passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              minLength={4}
              autoComplete="new-password"
            />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </form>
      </section>

      {/* WhatsApp integration */}
      <section className="card space-y-4">
        <div>
          <h2 className="text-lg font-semibold">📱 WhatsApp Integration</h2>
          <p className="mt-1 text-sm text-slate-400">
            UltraMsg is the only messaging provider. Credentials are loaded from environment variables.
          </p>
        </div>

        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <dt className="text-xs uppercase tracking-wide text-slate-500">Provider</dt>
            <dd className="mt-1 font-medium">UltraMsg</dd>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <dt className="text-xs uppercase tracking-wide text-slate-500">Instance</dt>
            <dd className="mt-1">
              {whatsapp?.connected ? (
                <span className="font-medium text-emerald-400">Connected</span>
              ) : whatsapp?.configured ? (
                <span className="font-medium text-amber-400">Not linked</span>
              ) : (
                <span className="font-medium text-red-400">Not configured</span>
              )}
            </dd>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <dt className="text-xs uppercase tracking-wide text-slate-500">Token</dt>
            <dd className="mt-1 font-mono text-sm text-slate-400">
              {whatsapp?.tokenMasked || '••••••••••••••••'}
            </dd>
          </div>
        </dl>

        {whatsapp && !whatsapp.configured && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            UltraMsg credentials are missing. Set <code>ULTR_INSTANCE_ID</code> and{' '}
            <code>ULTRA_TOKEN</code> in Render&apos;s Environment tab.
          </div>
        )}

        {whatsapp && whatsapp.configured && !whatsapp.connected && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
            <p className="font-semibold">WhatsApp is not linked to your UltraMsg instance.</p>
            <p className="mt-1">
              UltraMsg is accepting our API calls (requests are logged as <b>SENT</b>), but messages
              cannot be delivered until a WhatsApp number is connected. Open your{' '}
              <a
                href="https://app.ultramsg.com"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                UltraMsg dashboard
              </a>{' '}
              → your instance → <b>scan the QR code</b> with the WhatsApp app on the sending phone,
              then return here and reload.
            </p>
            {whatsapp.statusDetail && (
              <p className="mt-1 text-xs text-amber-500/80">UltraMsg status: {whatsapp.statusDetail}</p>
            )}
          </div>
        )}

        <div className="border-t border-slate-800 pt-4">
          <button onClick={sendTest} className="btn-ghost" disabled={testing}>
            {testing ? 'Sending…' : '📤 Send Test WhatsApp'}
          </button>
          {testMsg && (
            <p className={`mt-2 text-sm ${testMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{testMsg.text}</p>
          )}
        </div>
      </section>

      {/* Scheduler info */}
      <section className="card space-y-2">
        <h2 className="text-lg font-semibold">⏱️ Scheduler</h2>
        <p className="text-sm text-slate-400">
          The reminder engine runs on the backend every minute using the configured timezone
          <span className="text-slate-300"> ({settings?.timezone ?? 'Africa/Lagos'})</span>.
        </p>
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-400">
          <li>Exactly <b>three</b> reminders are sent per task, to <b>both</b> the task handler and the administrator.</li>
          <li><b>1. On assignment</b> — the moment the task is created.</li>
          <li><b>2. One day before</b> the deadline — skipped automatically for tasks shorter than 24 hours.</li>
          <li><b>3. On the deadline</b> — when the deadline is reached.</li>
          <li>Completed and cancelled tasks never generate further notifications.</li>
        </ul>
      </section>
    </div>
  );
}
