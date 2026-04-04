import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import Anthropic from '@anthropic-ai/sdk';

const LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = (typeof LANGS)[number];

const LANG_NAMES: Record<Lang, string> = {
  en: 'English', de: 'German (Swiss/DACH)', fr: 'French', es: 'Spanish', it: 'Italian',
};

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single();
  return profile?.is_admin ? user.id : null;
}

/**
 * Translates the source script (EN) to all other languages using Claude.
 * Body: { id: string, source_lang?: string }
 */
export async function POST(req: NextRequest) {
  const uid = await requireAdmin();
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });

  const { id, source_lang = 'en' } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const admin = createAdminClient();
  const { data: briefing } = await admin.from('voice_briefings').select('*').eq('id', id).single();
  if (!briefing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const sourceScript = briefing[`script_${source_lang}`] as string;
  if (!sourceScript?.trim()) {
    return NextResponse.json({ error: `No script in ${source_lang} to translate from` }, { status: 400 });
  }

  const targetLangs = LANGS.filter(l => l !== source_lang);
  const sourceName = LANG_NAMES[source_lang as Lang] ?? 'English';
  const targetNames = targetLangs.map(l => `${LANG_NAMES[l]} (${l})`).join(', ');

  const client = new Anthropic({ apiKey });

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    messages: [{
      role: 'user',
      content: `Translate this voice-over script from ${sourceName} to: ${targetNames}.

IMPORTANT RULES:
- This is a spoken voice-over script for text-to-speech. Keep it natural and flowing for spoken delivery.
- Maintain the emotional, heroic, and inspiring tone of the original.
- For German, use Swiss/DACH conventions (use "grösstenteils" not "größtenteils", "ss" instead of "ß" where Swiss German differs).
- Keep brand name "Evida Life" unchanged.
- Keep numbers, statistics, and facts identical.
- Use culturally appropriate phrasing for each language.

Source script:
${sourceScript}

Return ONLY valid JSON with this exact structure (no markdown, no code fences):
{
${targetLangs.map(l => `  "${l}": "translated script in ${LANG_NAMES[l]}"`).join(',\n')}
}`
    }],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  let translations: Record<string, string>;
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    translations = JSON.parse(cleaned);
  } catch {
    return NextResponse.json({ error: 'Failed to parse translation response', raw: text }, { status: 500 });
  }

  // Update DB with translations
  const updates: Record<string, string> = { updated_at: new Date().toISOString() };
  for (const lang of targetLangs) {
    if (translations[lang]) {
      updates[`script_${lang}`] = translations[lang];
    }
  }

  const { error } = await admin.from('voice_briefings').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, translations });
}
