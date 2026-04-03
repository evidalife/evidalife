import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import AICreditsManager from '@/components/admin/ai/AICreditsManager';

export const metadata = { title: 'AI Credits – Evida Admin' };

export default async function AICreditsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) redirect('/admin');

  // Fetch plans
  const { data: plans } = await admin
    .from('subscription_plans')
    .select('*')
    .order('sort_order');

  // Fetch users with their credits and subscriptions
  const { data: users } = await admin
    .from('profiles')
    .select('id, first_name, last_name, email, avatar_url')
    .order('created_at', { ascending: false })
    .limit(100);

  const { data: subscriptions } = await admin
    .from('user_subscriptions')
    .select('*, subscription_plans(slug, name)')
    .eq('status', 'active');

  const { data: credits } = await admin
    .from('user_credits')
    .select('*');

  // Aggregate usage stats from ai_usage_log (this month)
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data: monthlyUsage } = await admin
    .from('ai_usage_log')
    .select('user_id, estimated_cost_usd, endpoint, provider')
    .gte('created_at', monthStart.toISOString());

  return (
    <AICreditsManager
      plans={plans ?? []}
      users={users ?? []}
      subscriptions={subscriptions ?? []}
      credits={credits ?? []}
      monthlyUsage={monthlyUsage ?? []}
    />
  );
}
