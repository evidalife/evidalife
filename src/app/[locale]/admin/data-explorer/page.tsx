import { createAdminClient } from '@/lib/supabase/admin';
import DataExplorerManager from '@/components/admin/data-explorer/DataExplorerManager';

export default async function DataExplorerPage() {
  const supabase = createAdminClient();

  const [users, products, biomarkers, orders, labResults] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('product_item_definitions').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase.from('lab_results').select('id', { count: 'exact', head: true }),
  ]);

  return (
    <DataExplorerManager
      initialStats={{
        users:       users.count ?? 0,
        products:    products.count ?? 0,
        biomarkers:  biomarkers.count ?? 0,
        orders:      orders.count ?? 0,
        lab_results: labResults.count ?? 0,
      }}
    />
  );
}
