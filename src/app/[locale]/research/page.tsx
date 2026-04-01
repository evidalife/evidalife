import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import ResearchChat from '@/components/research/ResearchChat';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Research Engine | Evida Life',
  description: 'Ask health and nutrition questions answered by AI synthesis of 500,000+ peer-reviewed studies.',
};

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];

const T: Record<Lang, { eyebrow: string; heading: string; sub: string; badge: string }> = {
  de: {
    eyebrow: 'KI-Forschung',
    heading: 'Research Engine',
    sub: 'Stelle Fragen zu Ernährung, Langlebigkeit und deinen Biomarkern — Antworten aus über 500.000 Peer-Reviewed-Studien mit vollständigen Quellenangaben.',
    badge: '500K+ Studien indexiert',
  },
  en: {
    eyebrow: 'AI Research',
    heading: 'Research Engine',
    sub: 'Ask questions about nutrition, longevity and your biomarkers — answers synthesized from 500,000+ peer-reviewed studies with full citations.',
    badge: '500K+ studies indexed',
  },
  fr: {
    eyebrow: 'Recherche IA',
    heading: 'Research Engine',
    sub: 'Posez des questions sur la nutrition, la longévité et vos biomarqueurs — réponses synthétisées à partir de plus de 500 000 études avec citations complètes.',
    badge: '500K+ études indexées',
  },
  es: {
    eyebrow: 'Investigación IA',
    heading: 'Research Engine',
    sub: 'Haz preguntas sobre nutrición, longevidad y tus biomarcadores — respuestas sintetizadas de más de 500.000 estudios con citas completas.',
    badge: '500K+ estudios indexados',
  },
  it: {
    eyebrow: 'Ricerca IA',
    heading: 'Research Engine',
    sub: 'Fai domande su nutrizione, longevità e i tuoi biomarcatori — risposte sintetizzate da oltre 500.000 studi con citazioni complete.',
    badge: '500K+ studi indicizzati',
  },
};

export default async function ResearchPage() {
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';
  const t = T[lang];

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch user's latest biomarker context for personalized answers
  const { data: labRows } = await supabase
    .from('lab_results')
    .select('value_numeric, status_flag, biomarker_definitions:biomarkers!inner( slug, name, unit )')
    .eq('user_id', user.id)
    .order('measured_at', { ascending: false })
    .limit(50);

  let biomarkerContext: string | undefined;
  if (labRows && labRows.length > 0) {
    const seen = new Set<string>();
    const lines: string[] = [];
    for (const r of labRows) {
      const bd = r.biomarker_definitions as unknown as { slug: string; name: Record<string, string>; unit: string } | null;
      if (!bd || seen.has(bd.slug)) continue;
      seen.add(bd.slug);
      const name = bd.name?.en || bd.name?.de || bd.slug;
      const flag = r.status_flag ? ` (${r.status_flag})` : '';
      lines.push(`${name}: ${r.value_numeric} ${bd.unit}${flag}`);
    }
    if (lines.length > 0) biomarkerContext = lines.join(', ');
  }

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      {/* ── Dark teal hero ─────────────────────────────────────────────── */}
      <section className="w-full bg-[#0e393d] px-6 pt-28 pb-14">
        <div className="max-w-[1060px] mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-4">{t.eyebrow}</p>
              <h1 className="font-serif text-3xl sm:text-4xl text-white leading-tight mb-3">{t.heading}</h1>
              <p className="text-sm font-light text-white/50 max-w-xl leading-relaxed">{t.sub}</p>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-white/40 bg-white/[.06] rounded-full px-3.5 py-1.5 shrink-0 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {t.badge}
            </div>
          </div>
        </div>
      </section>

      {/* ── Chat area ──────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col" style={{ height: 'calc(100vh - 170px)' }}>
        <div className="flex-1 max-w-[1060px] mx-auto w-full px-0 md:px-4 flex flex-col">
          <ResearchChat biomarkerContext={biomarkerContext} />
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
