import { BioAgeScoreData, Lang, scoreColor } from '@/lib/health-engine-v2-types';
import HealthGauge from '@/components/health/HealthGauge';
import { LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer } from 'recharts';

const T: Record<Lang, Record<string, string>> = {
  en: {
    bioAgeScore: 'BIOLOGICAL AGE SCORE', youngerThan: 'years younger than chronological age', olderThan: 'years older than chronological age',
    avgAcross: 'avg. across {n} clocks', bestClock: 'Best Clock', focusClock: 'Focus Clock',
    avgVsChron: 'Avg Bio Age vs Chronological', epiClocks: 'Epigenetic Clocks',
    phenoLabel: 'PhenoAge', phenoSub: 'Levine phenotypic age',
    grimLabel: 'GrimAge', grimSub: 'Mortality risk clock',
    dunedinLabel: 'DunedinPACE', dunedinSub: 'Pace of aging (1.0 = average)',
    epiScore: 'Epigenetics Score', noClocks: 'No epigenetic clock data available.', noClocksSub: 'Bio age is estimated from blood biomarkers.',
  },
  de: {
    bioAgeScore: 'BIOLOGISCHES ALTER SCORE', youngerThan: 'Jahre jünger als chronologisches Alter', olderThan: 'Jahre älter als chronologisches Alter',
    avgAcross: 'Durchschnitt aus {n} Uhren', bestClock: 'Beste Uhr', focusClock: 'Fokus-Uhr',
    avgVsChron: 'Bio Alter vs Chronologisch', epiClocks: 'Epigenetische Uhren',
    phenoLabel: 'PhenoAge', phenoSub: 'Phänotypisches Alter', grimLabel: 'GrimAge', grimSub: 'Mortalitätsrisiko-Uhr',
    dunedinLabel: 'DunedinPACE', dunedinSub: 'Alterungstempo (1.0 = Durchschnitt)',
    epiScore: 'Epigenetik-Score', noClocks: 'Keine epigenetischen Daten.', noClocksSub: 'Bio-Alter wird aus Blutmarkern geschätzt.',
  },
  fr: {
    bioAgeScore: 'SCORE ÂGE BIOLOGIQUE', youngerThan: 'ans plus jeune que l\'âge chronologique', olderThan: 'ans plus vieux que l\'âge chronologique',
    avgAcross: 'moyenne de {n} horloges', bestClock: 'Meilleure Horloge', focusClock: 'Horloge Focus',
    avgVsChron: 'Âge Bio vs Chronologique', epiClocks: 'Horloges Épigénétiques',
    phenoLabel: 'PhenoAge', phenoSub: 'Âge phénotypique', grimLabel: 'GrimAge', grimSub: 'Horloge de risque',
    dunedinLabel: 'DunedinPACE', dunedinSub: 'Rythme de vieillissement',
    epiScore: 'Score Épigénétique', noClocks: 'Aucune donnée épigénétique.', noClocksSub: 'L\'âge bio est estimé à partir des biomarqueurs.',
  },
  es: {
    bioAgeScore: 'SCORE EDAD BIOLÓGICA', youngerThan: 'años más joven que la edad cronológica', olderThan: 'años mayor que la edad cronológica',
    avgAcross: 'promedio de {n} relojes', bestClock: 'Mejor Reloj', focusClock: 'Reloj Focus',
    avgVsChron: 'Edad Bio vs Cronológica', epiClocks: 'Relojes Epigenéticos',
    phenoLabel: 'PhenoAge', phenoSub: 'Edad fenotípica', grimLabel: 'GrimAge', grimSub: 'Reloj de riesgo',
    dunedinLabel: 'DunedinPACE', dunedinSub: 'Ritmo de envejecimiento',
    epiScore: 'Score Epigenético', noClocks: 'Sin datos epigenéticos.', noClocksSub: 'La edad bio se estima de biomarcadores.',
  },
  it: {
    bioAgeScore: 'SCORE ETÀ BIOLOGICA', youngerThan: 'anni più giovane dell\'età cronologica', olderThan: 'anni più vecchio dell\'età cronologica',
    avgAcross: 'media di {n} orologi', bestClock: 'Miglior Orologio', focusClock: 'Orologio Focus',
    avgVsChron: 'Età Bio vs Cronologica', epiClocks: 'Orologi Epigenetici',
    phenoLabel: 'PhenoAge', phenoSub: 'Età fenotipica', grimLabel: 'GrimAge', grimSub: 'Orologio di rischio',
    dunedinLabel: 'DunedinPACE', dunedinSub: 'Ritmo di invecchiamento',
    epiScore: 'Score Epigenetico', noClocks: 'Nessun dato epigenetico.', noClocksSub: 'L\'età bio è stimata dai biomarcatori.',
  },
};

export default function BioAgeSlide({ data, lang }: { data: BioAgeScoreData; lang: Lang }) {
  const t = T[lang] || T.en;

  // Derive backwards-compat values from available clock data
  const ageClocks: { label: string; age: number }[] = [];
  if (data.phenoAge != null) ageClocks.push({ label: 'PhenoAge', age: data.phenoAge });
  if (data.grimAge != null) ageClocks.push({ label: 'GrimAge', age: data.grimAge });

  const avgBioAge = data.avgBioAge ?? (ageClocks.length > 0 ? ageClocks.reduce((s, c) => s + c.age, 0) / ageClocks.length : null);
  const ageDiff = data.ageDiff ?? (avgBioAge != null ? avgBioAge - data.chronAge : 0);
  const clockCount = data.clockCount ?? ageClocks.length;
  const bestClock = data.bestClock ?? (ageClocks.length > 0 ? ageClocks.reduce((a, b) => a.age < b.age ? a : b) : null);
  const focusClock = data.focusClock ?? (ageClocks.length > 1 ? ageClocks.reduce((a, b) => a.age > b.age ? a : b) : null);

  const isYounger = ageDiff < 0;
  const ageDiffAbsolute = Math.abs(ageDiff);

  const clocks = [
    data.phenoAge != null && { label: t.phenoLabel, value: `${data.phenoAge.toFixed(1)} yrs`, sub: t.phenoSub },
    data.grimAge != null && { label: t.grimLabel, value: `${data.grimAge.toFixed(1)} yrs`, sub: t.grimSub },
    data.dunedinPace != null && { label: t.dunedinLabel, value: data.dunedinPace.toFixed(2), sub: t.dunedinSub },
  ].filter(Boolean) as { label: string; value: string; sub: string }[];

  // Chart data filtering (with backwards compat defaults)
  const chartPoints = (data.chartData ?? []).filter(d => d.avg != null);

  return (
    <div className="w-full max-w-4xl bg-white rounded-2xl ring-1 ring-[#0e393d]/8 shadow-sm overflow-hidden">
      <div className="grid md:grid-cols-[1fr_1fr] gap-0">

        {/* LEFT: Bio Age Gauge matching health engine (dark teal) */}
        <div className="bg-[#0e393d] flex flex-col">
          <div className="px-5 pt-5 pb-3.5 flex flex-col items-center gap-[5px]">
            <div className="text-[10px] font-semibold tracking-[.16em] uppercase text-[#ceab84] mb-2 self-start">
              {t.bioAgeScore}
            </div>
            <div className="mt-2 mb-1"><HealthGauge score={data.bioAgeScore} size="md" dark /></div>
            {avgBioAge != null && (
              <>
                <div className="text-[11px] text-white/30 text-center">
                  {isYounger
                    ? `↓ ${ageDiffAbsolute.toFixed(1)} ${t.youngerThan}`
                    : `↑ ${ageDiffAbsolute.toFixed(1)} ${t.olderThan}`
                  }
                </div>
                <div className="text-[10px] text-white/[.18] text-center leading-snug mt-0.5">
                  {t.avgAcross.replace('{n}', String(clockCount))}
                </div>
              </>
            )}
          </div>

          {/* Best / Focus clock panels */}
          <div className="grid grid-cols-2 border-t border-white/[.06]">
            {bestClock && (
              <div className="px-3.5 py-[11px] flex flex-col gap-0.5 border-r border-white/[.06]">
                <div className="text-xs font-semibold tracking-[.08em] uppercase text-white/28">{t.bestClock}</div>
                <div className="font-serif text-[1.3rem] leading-none text-[#0C9C6C]">{bestClock.age.toFixed(1)}</div>
                <div className="text-xs text-white/22">{bestClock.label}</div>
              </div>
            )}
            {focusClock && (
              <div className="px-3.5 py-[11px] flex flex-col gap-0.5">
                <div className="text-xs font-semibold tracking-[.08em] uppercase text-white/28">{t.focusClock}</div>
                <div className="font-serif text-[1.3rem] leading-none text-[#C4A96A]">{focusClock.age.toFixed(1)}</div>
                <div className="text-xs text-white/22">{focusClock.label}</div>
              </div>
            )}
          </div>

          {/* Bio age trend chart */}
          {chartPoints.length >= 2 && (
            <div className="border-t border-white/[.06] px-4 py-3 bg-black/[.12]">
              <div className="text-[10px] font-semibold tracking-[.08em] uppercase text-white/22 mb-1.5">{t.avgVsChron}</div>
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.chartData} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,.35)' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'rgba(255,255,255,.35)' }} axisLine={false} tickLine={false} tickCount={4}
                      tickFormatter={(v: number) => parseFloat(v.toFixed(1)).toString()}
                    />
                    <RTooltip
                      formatter={(v) => typeof v === 'number' ? parseFloat(v.toFixed(1)).toString() : String(v ?? '')}
                      contentStyle={{ fontSize: 11, background: '#0e393d', border: '1px solid rgba(255,255,255,.15)', borderRadius: 8 }}
                      labelStyle={{ color: 'rgba(255,255,255,.5)' }}
                    />
                    <Line name="Chronological" type="monotone" dataKey="chron" stroke="rgba(255,255,255,.2)" strokeWidth={1} strokeDasharray="5 4" dot={false} />
                    <Line name="Avg Bio Age" type="monotone" dataKey="avg" stroke="#0C9C6C" strokeWidth={2} dot={false} activeDot={{ r: 4 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Epigenetic Clocks */}
        <div className="p-8 flex flex-col justify-center">
          {clocks.length > 0 && (
            <>
              <p className="text-[10px] font-semibold tracking-[.18em] uppercase text-[#ceab84] mb-4">{t.epiClocks}</p>
              <div className="space-y-3">
                {clocks.map((c) => (
                  <div key={c.label}
                    className="flex items-center justify-between p-4 rounded-xl bg-[#fafaf8] border border-[#0e393d]/[.05] hover:shadow-sm transition-shadow"
                  >
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#1c2a2b]/40 mb-0.5">{c.label}</p>
                      <p className="text-[11px] text-[#1c2a2b]/35">{c.sub}</p>
                    </div>
                    <span className="font-serif text-2xl font-bold text-[#0e393d] shrink-0 ml-4">{c.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {clocks.length === 0 && (
            <div className="text-center py-8">
              <p className="text-[13px] text-[#1c2a2b]/40">{t.noClocks}</p>
              <p className="text-[11px] text-[#1c2a2b]/25 mt-1">{t.noClocksSub}</p>
            </div>
          )}

          {/* Score indicator */}
          <div className="mt-6 pt-5 border-t border-[#0e393d]/[.06] flex items-center justify-between">
            <span className="text-[10px] text-[#1c2a2b]/40 uppercase tracking-[.12em]">{t.epiScore}</span>
            <div className="flex items-center gap-2">
              <span className="font-serif text-2xl font-bold" style={{ color: scoreColor(data.bioAgeScore) }}>
                {data.bioAgeScore}
              </span>
              <span className="text-[10px] text-[#1c2a2b]/30">/ 100</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
