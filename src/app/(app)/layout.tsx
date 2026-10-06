import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { whatsappConfigured } from '@/services/ultramsgService';
import AppShell from '@/components/AppShell';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user || user.role !== 'ADMIN') redirect('/login');

  const settings = await prisma.settings.findFirst();

  return (
    <AppShell
      adminName={settings?.adminName ?? user.name}
      adminWhatsapp={settings?.adminWhatsapp ?? user.whatsappNumber}
      whatsappConfigured={whatsappConfigured()}
    >
      {children}
    </AppShell>
  );
}
