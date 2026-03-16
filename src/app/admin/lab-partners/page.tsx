import { createClient } from '@/lib/supabase/server';
import LabPartnersManager from '@/components/admin/lab-partners/LabPartnersManager';

export default async function LabPartnersPage() {
  const supabase = await createClient();
  const { data: labPartners } = await supabase
    .from('lab_partners')
    .select('*')
    .order('name', { ascending: true });

  return <LabPartnersManager initialLabPartners={labPartners ?? []} />;
}
