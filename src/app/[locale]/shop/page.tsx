import { createClient } from '@/lib/supabase/server';
import ShopContent, { type Product } from './ShopContent';
import { buildMeta, PAGE_META } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const metaLang = locale === 'de' ? 'de' : 'en';
  return buildMeta({ ...PAGE_META.shop[metaLang], path: '/shop', locale });
}

export default async function ShopPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from('products')
    .select('id, name, description, short_description, price_chf, compare_at_price_chf, product_type, is_featured, slug, image_url, metadata')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true });

  const products: Product[] = rows ?? [];

  return <ShopContent products={products} />;
}
