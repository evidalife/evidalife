import { createClient } from '@/lib/supabase/server';
import ProductsManager from '@/components/admin/products/ProductsManager';

export default async function ProductsPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  return <ProductsManager initialProducts={products ?? []} />;
}
