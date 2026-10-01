import { redirect } from 'next/navigation';
import { getSessionAdmin } from '@/lib/auth';
import DashboardClient from '@/components/DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const admin = await getSessionAdmin();
  if (!admin) redirect('/');

  return <DashboardClient admin={admin} />;
}
