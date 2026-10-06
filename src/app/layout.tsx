import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Odyssey Scheduler — Task Management & WhatsApp Reminders',
  description:
    'Odyssey Scheduler — in-office task management with automated WhatsApp reminders via UltraMsg.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
