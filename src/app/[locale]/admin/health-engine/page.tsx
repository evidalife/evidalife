import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import HealthEngineSettings from '@/components/admin/health/HealthEngineSettings';

export const metadata = { title: 'Health Engine – Evida Admin' };

export default async function HealthEnginePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) redirect('/admin');

  // Fetch all data in parallel
  const [
    { data: weightsSetting },
    { data: bioAgeWeightsSetting },
    { data: rulesSetting },
    { data: biomarkers },
    { data: products },
    { data: productBiomarkers },
  ] = await Promise.all([
    admin.from('ai_settings').select('value').eq('key', 'domain_weights').single(),
    admin.from('ai_settings').select('value').eq('key', 'bio_age_weights').single(),
    admin.from('ai_settings').select('value').eq('key', 'he_presentation_rules').single(),
    admin.from('biomarkers')
      .select('id, slug, name, he_domain, unit, ref_range_low, ref_range_high, optimal_range_low, optimal_range_high, age_stratified, has_sex_specific_ranges, is_calculated, is_active')
      .eq('is_active', true)
      .order('he_domain')
      .order('slug'),
    admin.from('products')
      .select('id, name, product_type, sort_order, is_active')
      .in('product_type', ['blood_test', 'clinical_test', 'epigenetic_test', 'genetic_test', 'microbiome_test', 'addon_test'])
      .is('deleted_at', null)
      .order('sort_order'),
    admin.from('product_biomarkers')
      .select('product_id, biomarker_id'),
  ]);

  return (
    <HealthEngineSettings
      initialWeights={weightsSetting?.value as Record<string, number> | null}
      initialBioAgeWeights={bioAgeWeightsSetting?.value as Record<string, number> | null}
      initialBiomarkers={biomarkers ?? []}
      initialPresentationRules={rulesSetting?.value as Record<string, unknown> | null}
      products={(products ?? []).map(p => ({
        id: p.id,
        name: (p.name as Record<string, string>)?.en ?? p.id,
        productType: p.product_type,
        sortOrder: p.sort_order,
        isActive: p.is_active,
      }))}
      productBiomarkers={(productBiomarkers ?? []).map(pb => ({
        productId: pb.product_id,
        biomarkerId: pb.biomarker_id,
      }))}
    />
  );
}
