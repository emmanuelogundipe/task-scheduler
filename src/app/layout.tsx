import type { Metadata, Viewport } from 'next';
import './globals.css';
import PwaRegister from '@/components/PwaRegister';
import InstallPrompt from '@/components/InstallPrompt';

export const metadata: Metadata = {
  title: 'Odyssey Scheduler — Task Management & WhatsApp Reminders',
  description:
    'Odyssey Scheduler — in-office task management with automated WhatsApp reminders via UltraMsg.',
  applicationName: 'Odyssey Scheduler',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Odyssey',
  },
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#059669',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <PwaRegister />
        <InstallPrompt />
      </body>
    </html>
  );
}
