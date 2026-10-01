import { redirect } from 'next/navigation';
import { getSessionAdmin } from '@/lib/auth';
import SettingsClient from '@/components/SettingsClient';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const admin = await getSessionAdmin();
  if (!admin) redirect('/');

  return <SettingsClient admin={admin} />;
}
