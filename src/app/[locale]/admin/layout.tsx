import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminSidebar from '@/components/admin/Sidebar';

export const metadata = { title: 'Admin — Evida Life' };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: '/login?redirectTo=/admin', locale });
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) redirect({ href: '/', locale });

  return (
    <div className="flex h-screen bg-[#f5f4f0] overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
