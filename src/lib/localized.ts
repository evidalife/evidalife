/**
 * Picks the best translation from a JSONB locale map.
 * Falls back: locale → en → de → first available value → ''
 */
export function localized(
  jsonb: Record<string, string> | null | undefined,
  locale: string
): string {
  if (!jsonb) return '';
  return jsonb[locale] ?? jsonb.en ?? jsonb.de ?? Object.values(jsonb)[0] ?? '';
}
