import { createAdminClient } from '@/lib/supabase/admin';
import BiomarkersPageClient from '@/components/admin/biomarkers/BiomarkersPageClient';

export default async function BiomarkersPage() {
  const supabase = createAdminClient();
  const { data: items } = await supabase
    .from('biomarkers')
    .select('id, slug, name, description, item_type, is_active, sort_order, unit, range_type, ref_range_low, ref_range_high, optimal_range_low, optimal_range_high, he_domain')
    .order('sort_order', { ascending: true });

  return <BiomarkersPageClient initialItems={items ?? []} />;
}
