import { createAdminClient } from '@/lib/supabase/admin';
import BiomarkersPageClient from '@/components/admin/biomarkers/BiomarkersPageClient';

export default async function BiomarkersPage() {
  const supabase = createAdminClient();
  const { data: items } = await supabase
    .from('biomarkers')
    .select('id, slug, name, name_short, description, item_type, is_active, is_calculated, formula, calculation_inputs, sort_order, unit, range_type, ref_range_low, ref_range_high, optimal_range_low, optimal_range_high, he_domain, chart_range_low, chart_range_high, has_sex_specific_ranges, ref_range_low_f, ref_range_high_f, optimal_range_low_f, optimal_range_high_f, requires_fasting, fasting_hours, preferred_draw_time, critical_low, critical_high, age_stratified, cvi_pct, cva_pct, assay_note, loinc_code')
    .order('sort_order', { ascending: true });

  return <BiomarkersPageClient initialItems={items ?? []} />;
}
