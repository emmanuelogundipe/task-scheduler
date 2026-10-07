'use client';

import { useState } from 'react';
import { usePwaInstall } from './PwaRegister';

/** A dismissible banner that offers to install Odyssey Scheduler as an app. */
export default function InstallPrompt() {
  const { canInstall, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || dismissed) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-md items-center gap-3 rounded-xl border border-brand-600/40 bg-slate-900/95 px-4 py-3 shadow-2xl shadow-black/40 backdrop-blur">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-xl">
        🧭
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-100">Install Odyssey Scheduler</p>
        <p className="text-xs text-slate-400">Add it to your home screen for app-like access.</p>
      </div>
      <button onClick={promptInstall} className="btn-primary shrink-0 !px-3 !py-1.5 text-xs">
        Install
      </button>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="shrink-0 text-slate-500 hover:text-slate-300"
      >
        ✕
      </button>
    </div>
  );
}
