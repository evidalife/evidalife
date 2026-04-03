import { createAdminClient } from '@/lib/supabase/admin';

let cachedCount: number | null = null;
let cachedAt = 0;
const TTL = 60 * 60 * 1000; // 1 hour cache

/**
 * Returns the total number of studies in the research database.
 * Result is cached for 1 hour to avoid hitting Supabase on every page load.
 */
export async function getStudyCount(): Promise<number> {
  const now = Date.now();
  if (cachedCount !== null && now - cachedAt < TTL) return cachedCount;

  const supabase = createAdminClient();
  const { count } = await supabase
    .from('studies')
    .select('*', { count: 'exact', head: true });

  cachedCount = count ?? 0;
  cachedAt = now;
  return cachedCount;
}

/** Format a number like 27431 → "27,000+" (rounded down to nearest 1000) */
export function formatStudyCount(n: number, locale: string = 'en'): string {
  const rounded = Math.floor(n / 1000) * 1000;
  if (locale === 'de' || locale === 'it') {
    return `${rounded.toLocaleString('de-DE')}+`;
  }
  if (locale === 'fr') {
    return `${rounded.toLocaleString('fr-FR')}+`;
  }
  if (locale === 'es') {
    return `${rounded.toLocaleString('es-ES')}+`;
  }
  return `${rounded.toLocaleString('en-US')}+`;
}
