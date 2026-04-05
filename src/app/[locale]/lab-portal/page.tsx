import { getLocale } from 'next-intl/server';
import { getLabSession } from '@/lib/lab-auth';
import LabPortalClient from './LabPortalClient';

export const metadata = { title: 'Lab Portal – Evida Life' };

export default async function LabPortalPage() {
  const locale = await getLocale();
  const session = await getLabSession();

  return <LabPortalClient locale={locale} initialSession={session} />;
}
