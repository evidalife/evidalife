import { createClient } from '@/lib/supabase/server';
import LabResultsManager from '@/components/admin/lab-results/LabResultsManager';

export default async function LabResultsPage() {
  const supabase = await createClient();

  const [{ data: results }, { data: orders }] = await Promise.all([
    supabase
      .from('lab_results')
      .select(`
        *,
        biomarker_definitions ( id, name, unit, category ),
        profiles ( email, full_name ),
        orders ( order_number )
      `)
      .order('created_at', { ascending: false })
      .limit(1000),

    supabase
      .from('orders')
      .select(`
        id, order_number, status, created_at,
        profiles ( email, full_name )
      `)
      .in('status', ['paid', 'dispatched', 'sample_received', 'processing', 'results_ready'])
      .order('created_at', { ascending: false })
      .limit(500),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <LabResultsManager initialResults={(results ?? []) as any} initialOrders={(orders ?? []) as any} />;
}
