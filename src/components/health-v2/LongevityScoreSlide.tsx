import { LongevityScoreData, Lang } from '@/lib/health-engine-v2-types';
import HealthGauge from '@/components/health/HealthGauge';
import { Sparkline, DeltaTag, scoreColor } from './SlideBlocks';

export default function LongevityScoreSlide({ data, lang }: { data: LongevityScoreData; lang: Lang }) {
  const historyValues = data.history.map((h) => h.score);

  return (
    <div className="w-full max-w-4xl bg-white rounded-2xl ring-1 ring-[#0e393d]/8 shadow-sm overflow-hidden">
      {/* ── Landscape 2-column: Gauge | Details ──────────── */}
      <div className="grid md:grid-cols-[1fr_1fr] gap-0">

        {/* Left: Big gauge on dark teal */}
        <div className="bg-[#0e393d] p-8 flex flex-col items-center justify-center">
          <p className="text-[10px] font-semibold tracking-[.2em] uppercase text-[#ceab84] mb-4">Your Longevity Score</p>
          <HealthGauge score={data.score} size="lg" />
          <div className="flex items-center gap-3 mt-5">
            <span className="font-serif text-5xl font-bold text-white">{data.score}</span>
            <DeltaTag current={data.score} previous={data.prevScore} />
          </div>
          {data.prevScore != null && (
            <p className="text-[11px] text-white/35 mt-1">Previous: {data.prevScore}</p>
          )}
        </div>

        {/* Right: Trend + Domain highlights */}
        <div className="p-8 flex flex-col justify-center space-y-6">
          {/* Score History Sparkline */}
          {historyValues.length > 1 && (
            <div>
              <p className="text-[10px] font-semibold tracking-[.18em] uppercase text-[#ceab84] mb-2">Score History</p>
              <Sparkline vals={historyValues} color={scoreColor(data.score)} height={40} />
              <div className="flex justify-between text-[10px] text-[#1c2a2b]/35 mt-1">
                {data.history.length > 0 && (
                  <>
                    <span>{data.history[0].date}</span>
                    <span>{data.history[data.history.length - 1].date}</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Domain highlights */}
          <div className="grid grid-cols-2 gap-3">
            {data.bestDomain && (
              <div className="p-4 rounded-xl border-l-[3px] border-[#0C9C6C] bg-[#0C9C6C]/[.04]">
                <p className="text-[9px] font-semibold tracking-[.15em] uppercase text-[#0C9C6C] mb-1.5">Strongest</p>
                <p className="text-[13px] font-semibold text-[#0e393d]">{data.bestDomain.name}</p>
                <span className="font-serif text-xl font-bold" style={{ color: scoreColor(data.bestDomain.score) }}>
                  {data.bestDomain.score}
                </span>
              </div>
            )}
            {data.worstDomain && (
              <div className="p-4 rounded-xl border-l-[3px] border-[#E06B5B] bg-[#E06B5B]/[.04]">
                <p className="text-[9px] font-semibold tracking-[.15em] uppercase text-[#E06B5B] mb-1.5">Focus Area</p>
                <p className="text-[13px] font-semibold text-[#0e393d]">{data.worstDomain.name}</p>
                <span className="font-serif text-xl font-bold" style={{ color: scoreColor(data.worstDomain.score) }}>
                  {data.worstDomain.score}
                </span>
              </div>
            )}
          </div>

          {/* Stats row */}
          <div className="flex gap-4 text-center">
            <div className="flex-1 py-3 rounded-lg bg-[#fafaf8]">
              <span className="font-serif text-xl font-bold text-[#0e393d]">{data.domainCount}</span>
              <p className="text-[10px] text-[#1c2a2b]/40 mt-0.5">Domains</p>
            </div>
            <div className="flex-1 py-3 rounded-lg bg-[#fafaf8]">
              <span className="font-serif text-xl font-bold text-[#0e393d]">{historyValues.length}</span>
              <p className="text-[10px] text-[#1c2a2b]/40 mt-0.5">Measurements</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
