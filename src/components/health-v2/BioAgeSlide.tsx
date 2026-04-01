import { BioAgeScoreData, Lang } from '@/lib/health-engine-v2-types';
import HealthGauge from '@/components/health/HealthGauge';
import { scoreColor } from './SlideBlocks';

export default function BioAgeSlide({ data, lang }: { data: BioAgeScoreData; lang: Lang }) {
  const isYounger = data.ageDiff < 0;
  const ageDiffAbsolute = Math.abs(data.ageDiff);
  const clocks = [
    data.phenoAge != null && { label: 'PhenoAge', value: `${data.phenoAge.toFixed(1)} yrs`, sub: 'Levine phenotypic age' },
    data.grimAge != null && { label: 'GrimAge', value: `${data.grimAge.toFixed(1)} yrs`, sub: 'Mortality risk clock' },
    data.dunedinPace != null && { label: 'DunedinPACE', value: data.dunedinPace.toFixed(2), sub: 'Pace of aging (1.0 = average)' },
  ].filter(Boolean) as { label: string; value: string; sub: string }[];

  return (
    <div className="w-full max-w-4xl bg-white rounded-2xl ring-1 ring-[#0e393d]/8 shadow-sm overflow-hidden">
      <div className="grid md:grid-cols-[1fr_1fr] gap-0">

        {/* Left: Gauge + Age Difference on dark teal */}
        <div className="bg-[#0e393d] p-8 flex flex-col items-center justify-center text-center">
          <p className="text-[10px] font-semibold tracking-[.2em] uppercase text-[#ceab84] mb-4">Biological Age</p>
          <HealthGauge score={data.bioAgeScore} size="md" />

          {/* Age difference hero stat */}
          <div className="mt-5 mb-2">
            <span className={`font-serif text-4xl font-bold ${isYounger ? 'text-[#0C9C6C]' : 'text-[#E06B5B]'}`}>
              {ageDiffAbsolute.toFixed(1)}
            </span>
            <span className="text-white/60 text-lg ml-1">years</span>
          </div>
          <p className="text-[13px] text-white/50">{isYounger ? 'younger' : 'older'} biologically</p>

          <div className="mt-5 px-5 py-3 rounded-xl bg-white/[.06] border border-white/[.06]">
            <span className="text-[10px] text-white/35 uppercase tracking-[.15em]">Chronological Age</span>
            <span className="font-serif text-xl font-bold text-white ml-3">{data.chronAge}</span>
          </div>
        </div>

        {/* Right: Epigenetic Clocks */}
        <div className="p-8 flex flex-col justify-center">
          {clocks.length > 0 && (
            <>
              <p className="text-[10px] font-semibold tracking-[.18em] uppercase text-[#ceab84] mb-4">Epigenetic Clocks</p>
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
              <p className="text-[13px] text-[#1c2a2b]/40">No epigenetic clock data available.</p>
              <p className="text-[11px] text-[#1c2a2b]/25 mt-1">Bio age is estimated from blood biomarkers.</p>
            </div>
          )}

          {/* Score indicator */}
          <div className="mt-6 pt-5 border-t border-[#0e393d]/[.06] flex items-center justify-between">
            <span className="text-[10px] text-[#1c2a2b]/40 uppercase tracking-[.12em]">Epigenetics Score</span>
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
