import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import AICoachManager from '@/components/admin/ai/AICoachManager';

export const metadata = { title: 'AI Coach – Evida Admin' };

export default async function AICoachPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) redirect('/admin');

  return <AICoachManager />;
}
