'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import HealthGauge from './HealthGauge';
import BiomarkerTrendChart from './BiomarkerTrendChart';
import {
  type HealthScoreResult,
  type BiomarkerCategory,
  type ScoredBiomarker,
  CATEGORY_DISPLAY,
} from '@/lib/health-score';

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'de' | 'en' | 'fr' | 'es' | 'it';

interface DefinitionMeta {
  id: string;
  reference_range_low: number | null;
  reference_range_high: number | null;
  optimal_range_low: number | null;
  optimal_range_high: number | null;
  unit: string | null;
}

interface Props {
  lang: Lang;
  userId: string;
  scores: HealthScoreResult;
  definitions: DefinitionMeta[];
}

// ─── Translations ─────────────────────────────────────────────────────────────

const T: Record<Lang, {
  eyebrow: string;
  title: string;
  subtitle: string;
  overallScore: string;
  overallSub: string;
  domains: string;
  results: string;
  noResults: string;
  noResultsSub: string;
  shopCta: string;
  trend: string;
  value: string;
  lastMeasured: string;
  status: Record<string, string>;
  tiers: Record<string, string>;
}> = {
  de: {
    eyebrow: 'Gesundheit',
    title: 'Dein Gesundheits-Dashboard',
    subtitle: 'Dein persönlicher Gesundheitsscore basiert auf deinen Biomarker-Ergebnissen und zeigt dir, wo du heute stehst.',
    overallScore: 'Gesamtscore',
    overallSub: 'Basierend auf allen gemessenen Biomarkern',
    domains: 'Domänen-Scores',
    results: 'Biomarker-Ergebnisse',
    noResults: 'Noch keine Ergebnisse',
    noResultsSub: 'Lass deinen ersten Bluttest durchführen, um deinen Gesundheitsscore zu sehen.',
    shopCta: '→ Zum Shop',
    trend: 'Verlauf',
    value: 'Wert',
    lastMeasured: 'Zuletzt gemessen',
    status: { optimal: 'Optimal', good: 'Gut', moderate: 'Mäßig', risk: 'Risiko' },
    tiers: { green: 'Optimal', yellow: 'Verbesserungswürdig', red: 'Handlungsbedarf' },
  },
  en: {
    eyebrow: 'Health',
    title: 'Your Health Dashboard',
    subtitle: 'Your personal health score is calculated from your biomarker results and shows you where you stand today.',
    overallScore: 'Overall Score',
    overallSub: 'Based on all measured biomarkers',
    domains: 'Domain Scores',
    results: 'Biomarker Results',
    noResults: 'No results yet',
    noResultsSub: 'Get your first blood test to see your health score.',
    shopCta: '→ Browse Shop',
    trend: 'Trend',
    value: 'Value',
    lastMeasured: 'Last measured',
    status: { optimal: 'Optimal', good: 'Good', moderate: 'Moderate', risk: 'Risk' },
    tiers: { green: 'Optimal', yellow: 'Needs attention', red: 'Action needed' },
  },
  fr: {
    eyebrow: 'Santé',
    title: 'Votre tableau de bord santé',
    subtitle: 'Votre score de santé personnel est calculé à partir de vos résultats de biomarqueurs.',
    overallScore: 'Score global',
    overallSub: 'Basé sur tous les biomarqueurs mesurés',
    domains: 'Scores par domaine',
    results: 'Résultats des biomarqueurs',
    noResults: 'Aucun résultat pour l\'instant',
    noResultsSub: 'Faites votre premier bilan sanguin pour voir votre score de santé.',
    shopCta: '→ Voir la boutique',
    trend: 'Évolution',
    value: 'Valeur',
    lastMeasured: 'Dernière mesure',
    status: { optimal: 'Optimal', good: 'Bon', moderate: 'Modéré', risk: 'Risque' },
    tiers: { green: 'Optimal', yellow: 'À surveiller', red: 'Action requise' },
  },
  es: {
    eyebrow: 'Salud',
    title: 'Tu panel de salud',
    subtitle: 'Tu puntuación de salud personal se calcula a partir de tus resultados de biomarcadores.',
    overallScore: 'Puntuación global',
    overallSub: 'Basada en todos los biomarcadores medidos',
    domains: 'Puntuaciones por dominio',
    results: 'Resultados de biomarcadores',
    noResults: 'Aún no hay resultados',
    noResultsSub: 'Hazte tu primer análisis de sangre para ver tu puntuación de salud.',
    shopCta: '→ Ver la tienda',
    trend: 'Tendencia',
    value: 'Valor',
    lastMeasured: 'Última medición',
    status: { optimal: 'Óptimo', good: 'Bueno', moderate: 'Moderado', risk: 'Riesgo' },
    tiers: { green: 'Óptimo', yellow: 'Mejorable', red: 'Acción requerida' },
  },
  it: {
    eyebrow: 'Salute',
    title: 'Il tuo cruscotto della salute',
    subtitle: 'Il tuo punteggio di salute personale è calcolato dai risultati dei tuoi biomarcatori.',
    overallScore: 'Punteggio complessivo',
    overallSub: 'Basato su tutti i biomarcatori misurati',
    domains: 'Punteggi per dominio',
    results: 'Risultati dei biomarcatori',
    noResults: 'Nessun risultato ancora',
    noResultsSub: 'Fai il tuo primo esame del sangue per vedere il tuo punteggio di salute.',
    shopCta: '→ Visita il negozio',
    trend: 'Andamento',
    value: 'Valore',
    lastMeasured: 'Ultima misurazione',
    status: { optimal: 'Ottimale', good: 'Buono', moderate: 'Moderato', risk: 'Rischio' },
    tiers: { green: 'Ottimale', yellow: 'Da migliorare', red: 'Azione necessaria' },
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FEATURED_DOMAINS: BiomarkerCategory[] = [
  'metabolic', 'cardiovascular', 'inflammation', 'organ_function', 'hormonal', 'nutritional',
];

function TrafficDot({ light }: { light: string }) {
  const colors = {
    green: 'bg-emerald-500',
    yellow: 'bg-amber-400',
    red: 'bg-red-400',
  };
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${colors[light as keyof typeof colors] ?? 'bg-gray-300'}`} />
  );
}

function TrendArrow({ current, previous }: { current: number; previous?: number }) {
  if (previous == null) return <span className="text-[#1c2a2b]/30 text-sm">—</span>;
  const diff = current - previous;
  if (Math.abs(diff) < 0.01) return <span className="text-[#1c2a2b]/40 text-sm">→</span>;
  return diff > 0
    ? <span className="text-red-400 text-sm">↑</span>
    : <span className="text-emerald-500 text-sm">↓</span>;
}

function formatDate(iso: string, lang: string): string {
  return new Date(iso).toLocaleDateString(
    lang === 'de' ? 'de-CH' : lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : lang === 'it' ? 'it-IT' : 'en-GB',
    { day: 'numeric', month: 'short', year: 'numeric' },
  );
}

// ─── Domain Card ──────────────────────────────────────────────────────────────

function DomainCard({
  category,
  lang,
  score,
  count,
}: {
  category: BiomarkerCategory;
  lang: Lang;
  score: number | undefined;
  count: number | undefined;
}) {
  const name = CATEGORY_DISPLAY[category]?.[lang] ?? CATEGORY_DISPLAY[category]?.['en'] ?? category;
  const hasData = score !== undefined;

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-[#0e393d]/8 p-4 flex flex-col items-center gap-2">
      {hasData ? (
        <>
          <HealthGauge score={score!} size="sm" />
          <p className="text-xs font-medium text-[#0e393d] text-center leading-tight">{name}</p>
          <p className="text-[10px] text-[#1c2a2b]/40">{count} biomarker{count !== 1 ? 's' : ''}</p>
        </>
      ) : (
        <>
          <div className="w-28 h-20 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-[#0e393d]/5 flex items-center justify-center">
              <span className="text-2xl font-light text-[#0e393d]/20">—</span>
            </div>
          </div>
          <p className="text-xs font-medium text-[#0e393d]/60 text-center leading-tight">{name}</p>
          <p className="text-[10px] text-[#1c2a2b]/30">No data</p>
        </>
      )}
    </div>
  );
}

// ─── Biomarker Row ────────────────────────────────────────────────────────────

function BiomarkerRow({
  bm,
  userId,
  defMeta,
  lang,
  t,
}: {
  bm: ScoredBiomarker;
  userId: string;
  defMeta: DefinitionMeta | undefined;
  lang: Lang;
  t: typeof T['en'];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className="hover:bg-[#fafaf8] transition-colors cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2.5">
            <TrafficDot light={bm.trafficLight} />
            <span className="font-medium text-sm text-[#0e393d]">{bm.name}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-[#1c2a2b]/70 tabular-nums">
          <span className="font-medium">{bm.value.toLocaleString('de-CH', { maximumFractionDigits: 2 })}</span>
          <span className="ml-1 text-xs text-[#1c2a2b]/40">{bm.unit}</span>
        </td>
        <td className="px-4 py-3">
          <TrendArrow current={bm.value} />
        </td>
        <td className="px-4 py-3">
          {bm.statusFlag ? (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
              bm.statusFlag === 'optimal' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' :
              bm.statusFlag === 'good' ? 'bg-green-50 text-green-700 ring-green-600/20' :
              bm.statusFlag === 'moderate' ? 'bg-amber-50 text-amber-700 ring-amber-600/20' :
              'bg-red-50 text-red-700 ring-red-600/20'
            }`}>
              {t.status[bm.statusFlag] ?? bm.statusFlag}
            </span>
          ) : <span className="text-[#1c2a2b]/30 text-xs">—</span>}
        </td>
        <td className="px-4 py-3 text-xs text-[#1c2a2b]/40">
          {formatDate(bm.measuredAt, lang)}
        </td>
        <td className="px-4 py-3 text-right">
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`inline text-[#0e393d]/30 transition-transform ${expanded ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-[#fafaf8]">
          <td colSpan={6} className="px-4 pb-4 pt-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#ceab84] mb-2">
              {t.trend}
            </p>
            <BiomarkerTrendChart
              userId={userId}
              definitionId={bm.definitionId}
              unit={bm.unit}
              refLow={defMeta?.reference_range_low ?? null}
              refHigh={defMeta?.reference_range_high ?? null}
              optLow={defMeta?.optimal_range_low ?? null}
              optHigh={defMeta?.optimal_range_high ?? null}
            />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HealthEngineContent({ lang, userId, scores, definitions }: Props) {
  const t = T[lang];
  const hasResults = scores.biomarkers.length > 0;

  const defMap = new Map(definitions.map((d) => [d.id, d]));

  // Group biomarkers by category for table display
  const grouped = new Map<string, ScoredBiomarker[]>();
  for (const bm of scores.biomarkers) {
    const key = bm.category ?? 'functional';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(bm);
  }

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <main className="flex-1 w-full max-w-5xl mx-auto px-6 pt-28 pb-16">

        {/* Hero */}
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-2">
            {t.eyebrow}
          </p>
          <h1 className="font-serif text-4xl text-[#0e393d] mb-3">{t.title}</h1>
          <p className="text-[#1c2a2b]/60 text-base max-w-xl">{t.subtitle}</p>
        </div>

        {!hasResults ? (
          /* ── Empty state ─────────────────────────────────────────────────── */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-[#0e393d]/6 flex items-center justify-center mb-6">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(14,57,61,0.3)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <h2 className="font-serif text-2xl text-[#0e393d] mb-3">{t.noResults}</h2>
            <p className="text-[#1c2a2b]/50 text-sm mb-8 max-w-xs">{t.noResultsSub}</p>
            <Link
              href="/shop"
              className="inline-block bg-[#0e393d] text-[#f2ebdb] text-sm font-medium px-6 py-3 rounded-full hover:bg-[#0e393d]/90 transition-colors"
            >
              {t.shopCta}
            </Link>
          </div>
        ) : (
          <>
            {/* ── Overall Score ───────────────────────────────────────────── */}
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-[#0e393d]/8 p-8 mb-8 flex flex-col items-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-4">
                {t.overallScore}
              </p>
              <HealthGauge score={scores.overall} size="lg" />
              <p className="text-sm text-[#1c2a2b]/50 mt-3">{t.overallSub}</p>

              {/* Score tier pills */}
              <div className="flex gap-3 mt-5">
                {(['red', 'yellow', 'green'] as const).map((tier) => {
                  const count = scores.biomarkers.filter((b) => b.trafficLight === tier).length;
                  const colors = {
                    red: 'bg-red-50 text-red-700 ring-red-200',
                    yellow: 'bg-amber-50 text-amber-700 ring-amber-200',
                    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
                  };
                  return (
                    <div key={tier} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ring-1 ${colors[tier]}`}>
                      <TrafficDot light={tier} />
                      {count} {t.tiers[tier]}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Domain Cards ─────────────────────────────────────────────── */}
            <section className="mb-10">
              <h2 className="font-serif text-xl text-[#0e393d] mb-4">{t.domains}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {FEATURED_DOMAINS.map((cat) => {
                  const ds = scores.domains[cat];
                  return (
                    <DomainCard
                      key={cat}
                      category={cat}
                      lang={lang}
                      score={ds?.score}
                      count={ds?.biomarkerCount}
                    />
                  );
                })}
              </div>
            </section>

            {/* ── Biomarker Results Table ────────────────────────────────── */}
            <section>
              <h2 className="font-serif text-xl text-[#0e393d] mb-4">{t.results}</h2>

              <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/3">
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">
                        Biomarker
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">
                        {t.value}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider w-10">
                        {t.trend}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">
                        {t.lastMeasured}
                      </th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0e393d]/6">
                    {[...grouped.entries()].map(([cat, bms]) => (
                      <>
                        <tr key={`group-${cat}`} className="bg-[#0e393d]/2">
                          <td
                            colSpan={6}
                            className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ceab84]/70"
                          >
                            {CATEGORY_DISPLAY[cat]?.[lang] ?? CATEGORY_DISPLAY[cat]?.['en'] ?? cat}
                          </td>
                        </tr>
                        {bms.map((bm) => (
                          <BiomarkerRow
                            key={bm.id}
                            bm={bm}
                            userId={userId}
                            defMeta={defMap.get(bm.definitionId)}
                            lang={lang}
                            t={t}
                          />
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
