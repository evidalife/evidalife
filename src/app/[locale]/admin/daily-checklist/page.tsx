import { createClient } from '@/lib/supabase/server';
import DailyChecklistManager from '@/components/admin/daily-checklist/DailyChecklistManager';

export const metadata = { title: 'Daily Checklist — Evida Admin' };

export default async function AdminDailyChecklistPage() {
  const supabase = await createClient();

  // Fetch 21 Tweaks + Anti-Aging items (editable)
  const { data: items } = await supabase
    .from('daily_checklist_items')
    .select('*')
    .order('framework')
    .order('sort_order');

  // Fetch Daily Dozen categories (read-only reference from existing table)
  const { data: ddCategories } = await supabase
    .from('daily_dozen_categories')
    .select('*')
    .order('sort_order');

  return (
    <DailyChecklistManager
      initialItems={items ?? []}
      dailyDozenCategories={ddCategories ?? []}
    />
  );
}
