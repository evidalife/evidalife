import { createClient } from '@/lib/supabase/server';
import UsersManager from '@/components/admin/users/UsersManager';

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name, is_admin, onboarding_completed, created_at, avatar_url')
    .order('created_at', { ascending: false })
    .limit(500);

  return <UsersManager initialProfiles={profiles ?? []} />;
}
