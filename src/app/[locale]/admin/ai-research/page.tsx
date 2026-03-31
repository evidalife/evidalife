import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import PageShell from '@/components/admin/PageShell';
import AIResearchManager from '@/components/admin/ai/AIResearchManager';

export const metadata = { title: 'Research Engine – Evida Admin' };

export default async function AIResearchPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) redirect('/admin');

  return (
    <PageShell
      title="Research Engine"
      description="Manage the RAG knowledge base — peer-reviewed studies for evidence-based health answers"
    >
      <AIResearchManager />
    </PageShell>
  );
}
