import { createClient } from '@/lib/supabase/server';
import DiscountCodesManager from '@/components/admin/discount-codes/DiscountCodesManager';

export default async function DiscountCodesPage() {
  const supabase = await createClient();
  const { data: discountCodes } = await supabase
    .from('discount_codes')
    .select('*')
    .order('created_at', { ascending: false });

  return <DiscountCodesManager initialDiscountCodes={discountCodes ?? []} />;
}
