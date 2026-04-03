import { LongevityScoreData, Lang, scoreColor } from '@/lib/health-engine-v2-types';
import HealthGauge from '@/components/health/HealthGauge';
import { LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer } from 'recharts';

// ── Translations ────────────────────────────────────────────────────────────
const T: Record<Lang, Record<string, string>> = {
  en: {
    longevityScore: 'LONGEVITY SCORE', basedOn: 'Based on {n} health domains', epiSeparate: 'Epigenetics shown separately',
    strongest: 'Strongest', focusArea: 'Focus Area', scoreHistory: 'Score over time',
    yourProgress: 'YOUR PROGRESS', borderlineHead: '{n} markers need attention', improvedHead: '{n} markers improved',
    topStrength: 'Top Strength', priorityAction: 'Priority Action', progress: 'Progress',
    longevity: 'Longevity', bioAge: 'Bio Age', yrsVsChrono: 'yrs vs chrono', pts: 'pts', markers: 'markers',
    domains: 'Domains', measurements: 'Measurements',
  },
  de: {
    longevityScore: 'LONGEVITY SCORE', basedOn: 'Basiert auf {n} Bereichen', epiSeparate: 'Epigenetik separat',
    strongest: 'Stärkster', focusArea: 'Fokusbereich', scoreHistory: 'Score-Verlauf',
    yourProgress: 'DEIN FORTSCHRITT', borderlineHead: '{n} Marker im Grenzbereich', improvedHead: '{n} Marker verbessert',
    topStrength: 'Top-Stärke', priorityAction: 'Priorität', progress: 'Fortschritt',
    longevity: 'Longevity', bioAge: 'Bio Alter', yrsVsChrono: 'J. vs chrono', pts: 'Pkt.', markers: 'Marker',
    domains: 'Bereiche', measurements: 'Messungen',
  },
  fr: {
    longevityScore: 'SCORE DE LONGÉVITÉ', basedOn: 'Basé sur {n} domaines', epiSeparate: 'Épigénétique séparée',
    strongest: 'Meilleur', focusArea: 'Zone de focus', scoreHistory: 'Historique',
    yourProgress: 'VOS PROGRÈS', borderlineHead: '{n} marqueurs à surveiller', improvedHead: '{n} marqueurs améliorés',
    topStrength: 'Force Top', priorityAction: 'Action Prioritaire', progress: 'Progrès',
    longevity: 'Longévité', bioAge: 'Âge Bio', yrsVsChrono: 'ans vs chrono', pts: 'pts', markers: 'marqueurs',
    domains: 'Domaines', measurements: 'Mesures',
  },
  es: {
    longevityScore: 'SCORE DE LONGEVIDAD', basedOn: 'Basado en {n} dominios', epiSeparate: 'Epigenética separada',
    strongest: 'Más fuerte', focusArea: 'Área de enfoque', scoreHistory: 'Historial',
    yourProgress: 'TU PROGRESO', borderlineHead: '{n} marcadores a vigilar', improvedHead: '{n} marcadores mejorados',
    topStrength: 'Fortaleza', priorityAction: 'Acción Prioritaria', progress: 'Progreso',
    longevity: 'Longevidad', bioAge: 'Edad Bio', yrsVsChrono: 'años vs crono', pts: 'pts', markers: 'marcadores',
    domains: 'Dominios', measurements: 'Mediciones',
  },
  it: {
    longevityScore: 'SCORE DI LONGEVITÀ', basedOn: 'Basato su {n} domini', epiSeparate: 'Epigenetica separata',
    strongest: 'Migliore', focusArea: 'Area di focus', scoreHistory: 'Storico',
    yourProgress: 'I TUOI PROGRESSI', borderlineHead: '{n} marcatori da monitorare', improvedHead: '{n} marcatori migliorati',
    topStrength: 'Forza Top', priorityAction: 'Azione Prioritaria', progress: 'Progresso',
    longevity: 'Longevità', bioAge: 'Età Bio', yrsVsChrono: 'anni vs crono', pts: 'pts', markers: 'marcatori',
    domains: 'Domini', measurements: 'Misurazioni',
  },
};

export default function LongevityScoreSlide({ data, lang }: { data: LongevityScoreData; lang: Lang }) {
  const t = T[lang] || T.en;
  const historyValues = data.history.map((h) => h.score);
  // Defaults for backwards compat with cached briefings that lack new fields
  const borderlineMarkers = data.borderlineMarkers ?? [];
  const improvedMarkers = data.improvedMarkers ?? [];
  const totalMarkers = data.totalMarkers ?? 1;
  // Derive firstScore from history when not explicitly set
  const firstScore = data.firstScore ?? (data.history.length >= 2 ? data.history[0].score : null);
  const progressLabel = data.progressLabel ?? '';
  const firstBioAgeDiff = data.firstBioAgeDiff ?? null;
  const latestBioAgeDiff = data.latestBioAgeDiff ?? null;

  return (
    <div className="w-full max-w-4xl space-y-3">

      {/* ── ROW 1: Longevity Gauge + Progress ─── */}
      <div className="grid md:grid-cols-2 gap-3">

        {/* LEFT: LONGEVITY SCORE gauge card (matches health engine) */}
        <div className="bg-[#0e393d] rounded-2xl overflow-hidden flex flex-col">
          <div className="px-5 pt-5 pb-3.5 flex flex-col items-center gap-[5px]">
            <div className="text-[10px] font-semibold tracking-[.16em] uppercase text-[#ceab84] mb-2 self-start">
              {t.longevityScore}
            </div>
            <div className="mt-2 mb-1"><HealthGauge score={data.score} size="lg" dark /></div>
            <div className="text-[11px] text-white/30 text-center">
              {t.basedOn.replace('{n}', String(data.domainCount || 8))}
            </div>
            <div className="text-[10px] text-white/[.18] text-center leading-snug mt-0.5">
              {t.epiSeparate}
            </div>
          </div>

          {/* Best Domain / Focus Area panels */}
          <div className="grid grid-cols-2 border-t border-white/[.06]">
            {data.bestDomain && (
              <div className="px-3.5 py-[11px] flex flex-col gap-0.5 border-r border-white/[.06]">
                <div className="text-xs font-semibold tracking-[.08em] uppercase text-white/28">{t.strongest}</div>
                <div className="font-serif text-[1.3rem] leading-none text-[#0C9C6C]">
                  {data.bestDomain.score}
                </div>
                <div className="text-xs text-white/22">{data.bestDomain.name}</div>
              </div>
            )}
            {data.worstDomain && (
              <div className="px-3.5 py-[11px] flex flex-col gap-0.5">
                <div className="text-xs font-semibold tracking-[.08em] uppercase text-white/28">{t.focusArea}</div>
                <div className="font-serif text-[1.3rem] leading-none text-[#C4A96A]">
                  {data.worstDomain.score}
                </div>
                <div className="text-xs text-white/22">{data.worstDomain.name}</div>
              </div>
            )}
          </div>

          {/* Score history chart */}
          {data.history.length >= 2 && (
            <div className="border-t border-white/[.06] px-4 py-3 bg-black/[.12]">
              <div className="text-[10px] font-semibold tracking-[.08em] uppercase text-white/22 mb-1.5">{t.scoreHistory}</div>
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.history.map(h => ({
                    date: new Date(h.date + 'T00:00:00').toLocaleDateString(lang === 'de' ? 'de-CH' : 'en-GB', { month: 'short', year: 'numeric' }),
                    score: h.score,
                  }))} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,.35)' }} axisLine={false} tickLine={false} />
                    <YAxis domain={['dataMin - 5', 'dataMax + 3']} tick={{ fontSize: 10, fill: 'rgba(255,255,255,.35)' }} axisLine={false} tickLine={false} tickCount={4} />
                    <RTooltip
                      formatter={(v: unknown) => [v as number, 'Score']}
                      contentStyle={{ fontSize: 11, background: '#0e393d', border: '1px solid rgba(255,255,255,.15)', borderRadius: 8 }}
                      labelStyle={{ color: 'rgba(255,255,255,.6)' }}
                    />
                    <Line type="monotone" dataKey="score" stroke="#0C9C6C" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: YOUR PROGRESS */}
        <div className="flex flex-col gap-3">
          <div className="bg-[#0e393d] rounded-2xl p-5 shadow-lg flex-1">
            <div className="text-[9px] font-semibold tracking-[.12em] uppercase text-[#ceab84] mb-4">{t.yourProgress}</div>

            {(borderlineMarkers.length > 0 || improvedMarkers.length > 0) ? (
              <div className="space-y-5">
                {borderlineMarkers.length > 0 && (
                  <div>
                    <div className="text-[13px] font-semibold text-white mb-2">
                      {t.borderlineHead.replace('{n}', String(borderlineMarkers.length))}
                    </div>
                    <div className="h-1 rounded-full bg-[#C4A96A]/20 mb-3 overflow-hidden">
                      <div className="h-full bg-[#C4A96A]" style={{ width: `${Math.min(100, (borderlineMarkers.length / totalMarkers) * 100)}%` }} />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {borderlineMarkers.map((name) => (
                        <span key={name} className="text-[10px] px-2 py-0.5 rounded-full bg-[#C4A96A]/15 text-[#C4A96A] font-medium">{name}</span>
                      ))}
                    </div>
                  </div>
                )}
                {improvedMarkers.length > 0 && (
                  <div>
                    <div className="text-[13px] font-semibold text-white mb-2">
                      {t.improvedHead.replace('{n}', String(improvedMarkers.length))}
                    </div>
                    <div className="h-1 rounded-full bg-[#0C9C6C]/20 mb-3 overflow-hidden">
                      <div className="h-full bg-[#0C9C6C]" style={{ width: `${Math.min(100, (improvedMarkers.length / totalMarkers) * 100)}%` }} />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {improvedMarkers.map((name) => (
                        <span key={name} className="text-[10px] px-2 py-0.5 rounded-full bg-[#0C9C6C]/15 text-[#0C9C6C] font-medium">{name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[13px] text-white/30 text-center py-6">
                All markers within optimal range
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── ROW 2: Summary cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Top Strength */}
        {data.bestDomain && (
          <div className="bg-white rounded-2xl border border-[#1c2a2b]/[.06] p-4 shadow-sm">
            <div className="text-[9px] font-semibold tracking-[.12em] uppercase text-[#0C9C6C]/60 mb-1.5">{t.topStrength}</div>
            <div className="text-[12px] font-semibold text-[#0e393d] mb-1.5">{data.bestDomain.name}</div>
            <div className="flex items-baseline gap-1">
              <span className="font-serif text-lg" style={{ color: scoreColor(data.bestDomain.score) }}>{data.bestDomain.score}</span>
              {data.bestDomain.markerCount != null && (
                <span className="text-[10px] text-[#1c2a2b]/40">{data.bestDomain.markerCount} {t.markers}</span>
              )}
            </div>
          </div>
        )}

        {/* Priority Action */}
        {data.worstDomain && (
          <div className="bg-white rounded-2xl border border-[#1c2a2b]/[.06] p-4 shadow-sm">
            <div className="text-[9px] font-semibold tracking-[.12em] uppercase text-[#C4A96A]/80 mb-1.5">{t.priorityAction}</div>
            <div className="text-[12px] font-semibold text-[#0e393d] mb-1.5">{data.worstDomain.name}</div>
            <span className="font-serif text-lg" style={{ color: scoreColor(data.worstDomain.score) }}>{data.worstDomain.score}</span>
          </div>
        )}

        {/* Longevity Progress */}
        {firstScore != null && (
          <div className="bg-white rounded-2xl border border-[#1c2a2b]/[.06] p-4 shadow-sm">
            <div className="text-[9px] font-semibold tracking-[.12em] uppercase text-[#1c2a2b]/35 mb-1.5">
              {progressLabel ? `${progressLabel} ${t.progress}` : t.progress}
            </div>
            <div className="text-[12px] font-semibold text-[#0e393d] mb-1.5">{t.longevity}</div>
            <div className="flex items-baseline gap-1 mb-0.5">
              <span className="font-serif text-lg" style={{ color: scoreColor(firstScore) }}>{firstScore}</span>
              <span className="text-[#1c2a2b]/25 mx-0.5">→</span>
              <span className="font-serif text-lg" style={{ color: scoreColor(data.score) }}>{data.score}</span>
            </div>
            <div className="text-[10px] text-[#1c2a2b]/50">
              {data.score - firstScore >= 0 ? '+' : ''}{data.score - firstScore} {t.pts}
            </div>
          </div>
        )}

        {/* Bio Age Progress */}
        {firstBioAgeDiff != null && latestBioAgeDiff != null && (
          <div className="bg-white rounded-2xl border border-[#1c2a2b]/[.06] p-4 shadow-sm">
            <div className="text-[9px] font-semibold tracking-[.12em] uppercase text-[#1c2a2b]/35 mb-1.5">
              {progressLabel ? `${progressLabel} ${t.progress}` : t.progress}
            </div>
            <div className="text-[12px] font-semibold text-[#0e393d] mb-1.5">{t.bioAge}</div>
            <div className="flex items-baseline gap-1 mb-0.5">
              <span className="font-serif text-lg" style={{ color: firstBioAgeDiff <= 0 ? '#0C9C6C' : '#E06B5B' }}>
                {firstBioAgeDiff > 0 ? '+' : ''}{firstBioAgeDiff}
              </span>
              <span className="text-[#1c2a2b]/25 mx-0.5">→</span>
              <span className="font-serif text-lg" style={{ color: latestBioAgeDiff <= 0 ? '#0C9C6C' : '#E06B5B' }}>
                {latestBioAgeDiff > 0 ? '+' : ''}{latestBioAgeDiff}
              </span>
            </div>
            <div className="text-[10px] text-[#1c2a2b]/50">
              {Math.abs(latestBioAgeDiff - firstBioAgeDiff).toFixed(1)} {t.yrsVsChrono}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
