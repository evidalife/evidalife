import { createClient } from '@/lib/supabase/server';
import UnitsManager, { type MeasurementUnit } from '@/components/admin/units/UnitsManager';

export default async function UnitsPage() {
  const supabase = await createClient();

  const { data: units } = await supabase
    .from('measurement_units')
    .select('id, code, name, abbreviation, category, sort_order')
    .order('sort_order');

  return <UnitsManager initialUnits={(units ?? []) as MeasurementUnit[]} />;
}
