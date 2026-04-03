import { createAdminClient } from '@/lib/supabase/admin';

export interface CompanyInfo {
  name: string;
  street: string;
  postalCode: string;
  city: string;
  canton: string;
  country: string;       // localized
  email: string;
  uid: string;
  registry: string;      // localized
}

/**
 * Fetch company info from site_settings table.
 * For use in server components — cached by Next.js data cache.
 */
export async function getCompanyInfo(lang = 'en'): Promise<CompanyInfo> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('site_settings')
    .select('key, value')
    .like('key', 'company_%');

  const map: Record<string, unknown> = {};
  for (const row of data ?? []) {
    map[row.key] = row.value;
  }

  const localized = (val: unknown): string => {
    if (typeof val === 'string') return val;
    if (val && typeof val === 'object' && lang in (val as Record<string, string>)) {
      return (val as Record<string, string>)[lang];
    }
    if (val && typeof val === 'object' && 'en' in (val as Record<string, string>)) {
      return (val as Record<string, string>).en;
    }
    return String(val ?? '');
  };

  return {
    name: localized(map.company_name),
    street: localized(map.company_street),
    postalCode: localized(map.company_postal_code),
    city: localized(map.company_city),
    canton: localized(map.company_canton),
    country: localized(map.company_country),
    email: localized(map.company_email),
    uid: localized(map.company_uid),
    registry: localized(map.company_registry),
  };
}
