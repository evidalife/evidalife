import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';

export const metadata = { title: 'Dashboard – Evida Life' };

// Dashboard has been merged into the Coach page.
// This redirect ensures existing bookmarks/links still work.
export default async function DashboardPage() {
  const locale = await getLocale();
  redirect({ href: '/coach', locale });
}
