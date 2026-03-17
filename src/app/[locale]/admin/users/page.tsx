import { createAdminClient } from '@/lib/supabase/admin';
import UsersManager from '@/components/admin/users/UsersManager';

export default async function UsersPage() {
  const supabase = createAdminClient();
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  return <UsersManager initialProfiles={profiles ?? []} />;
}
