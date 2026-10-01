import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OfficeTask — Task Scheduler & Reminders',
  description: 'In-office task scheduler with automated WhatsApp reminders, email alerts and Google Calendar integration',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
