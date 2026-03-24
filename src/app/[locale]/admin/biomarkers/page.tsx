import { createAdminClient } from '@/lib/supabase/admin';
import BiomarkersManager from '@/components/admin/biomarkers/BiomarkersManager';

export default async function BiomarkersPage() {
  const supabase = createAdminClient();
  const { data: items } = await supabase
    .from('product_item_definitions')
    .select('id, slug, name, description, item_type, is_active, sort_order, unit, range_type, ref_range_low, ref_range_high, optimal_range_low, optimal_range_high, he_domain')
    .order('sort_order', { ascending: true });

  return <BiomarkersManager initialItems={items ?? []} />;
}
