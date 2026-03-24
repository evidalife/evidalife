import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import OrdersManager from '@/components/admin/orders/OrdersManager';

async function OrdersContent() {
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      *,
      profiles(email, first_name, last_name),
      order_items(id, quantity, unit_price, currency, products(name, sku, image_url))
    `)
    .order('created_at', { ascending: false })
    .limit(500);

  return <OrdersManager initialOrders={orders ?? []} />;
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-[#1c2a2b]/40">Loading orders…</div>}>
      <OrdersContent />
    </Suspense>
  );
}
