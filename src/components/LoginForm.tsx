'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const router = useRouter();
  const [passcode, setPasscode] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode, whatsapp }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Admin Login</h2>
        <p className="mt-1 text-sm text-slate-400">
          Verify your credentials to open the dashboard.
        </p>
      </div>

      <div>
        <label htmlFor="whatsapp" className="label">WhatsApp Number</label>
        <input
          id="whatsapp"
          type="tel"
          className="input"
          placeholder="+2348133226669"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          required
          autoComplete="username"
        />
      </div>

      <div>
        <label htmlFor="passcode" className="label">Passcode</label>
        <input
          id="passcode"
          type="password"
          className="input"
          placeholder="Enter admin passcode"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? 'Verifying…' : 'Sign In to Dashboard'}
      </button>
    </form>
  );
}
