import { createClient } from '@/lib/supabase/server';
import ProductItemsManager from '@/components/admin/product-items/ProductItemsManager';

export default async function ProductItemsPage() {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from('product_item_definitions')
    .select('id, slug, name, item_type, is_active, sort_order')
    .order('sort_order', { ascending: true });

  return <ProductItemsManager initialItems={items ?? []} />;
}
