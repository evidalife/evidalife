import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';

export const metadata = { title: 'Profile – Evida Life' };

// Admin profile redirects to the user profile page
export default async function AdminProfilePage() {
  const locale = await getLocale();
  redirect({ href: '/profile', locale });
}
