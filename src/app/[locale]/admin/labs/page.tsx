import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import LabsAdminTabs from '@/components/admin/lab-partners/LabsAdminTabs';

export default async function LabPartnersPage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const [{ data: labPartners }, { data: products }] = await Promise.all([
    supabase.from('lab_partners').select('*').order('name', { ascending: true }),
    admin.from('products').select('id, slug, name, price_chf, product_type').eq('is_active', true).is('deleted_at', null).order('sort_order'),
  ]);

  return (
    <LabsAdminTabs
      initialLabPartners={labPartners ?? []}
      initialProducts={products ?? []}
    />
  );
}
