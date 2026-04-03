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

  // Fetch domain weights from ai_settings (or null if not set)
  const { data: weightsSetting } = await admin
    .from('ai_settings')
    .select('value')
    .eq('key', 'domain_weights')
    .single();

  // Fetch biomarkers with categories
  const { data: biomarkers } = await admin
    .from('biomarkers')
    .select('id, slug, name, category, unit, reference_range_low, reference_range_high, optimal_range_low, optimal_range_high, age_stratified, has_sex_specific_ranges')
    .order('category')
    .order('slug');

  // Fetch presentation rules if they exist
  const { data: rulesSetting } = await admin
    .from('ai_settings')
    .select('value')
    .eq('key', 'he_presentation_rules')
    .single();

  // Fetch bio age weights
  const { data: bioAgeWeightsSetting } = await admin
    .from('ai_settings')
    .select('value')
    .eq('key', 'bio_age_weights')
    .single();

  return (
    <HealthEngineSettings
      initialWeights={weightsSetting?.value as Record<string, number> | null}
      initialBioAgeWeights={bioAgeWeightsSetting?.value as Record<string, number> | null}
      initialBiomarkers={biomarkers ?? []}
      initialPresentationRules={rulesSetting?.value as Record<string, unknown> | null}
    />
  );
}
