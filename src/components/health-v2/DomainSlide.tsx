import { DomainSummaryData, Lang } from '@/lib/health-engine-v2-types';
import HealthGauge from '@/components/health/HealthGauge';
import { SectionTag, MarkerCard, MarkerRow, Sparkline, DeltaTag, scoreColor } from './SlideBlocks';

export default function DomainSlide({ data, lang }: { data: DomainSummaryData; lang: Lang }) {
  const trendScores = data.domainTrend.map((t) => t.score);
  const hasCritical = data.criticalMarkers.length > 0;
  const hasExceptional = data.exceptionalMarkers.length > 0;

  return (
    <div className="w-full max-w-4xl bg-white rounded-2xl ring-1 ring-[#0e393d]/8 shadow-sm overflow-hidden">
      {/* ── Domain Header Band ─────────────────────────────── */}
      <div className="flex items-center gap-4 px-8 py-5 border-b border-[#0e393d]/6">
        <span className="text-2xl shrink-0">{data.domainIcon}</span>
        <div className="flex-1 min-w-0">
          <h2 className="font-serif text-xl font-bold text-[#0e393d] leading-tight">{data.domainName}</h2>
          <p className="text-[10px] text-[#1c2a2b]/45 uppercase tracking-[.18em] mt-0.5">Weight: {data.weight}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="font-serif text-3xl font-bold" style={{ color: scoreColor(data.score) }}>{data.score}</span>
          <DeltaTag current={data.score} previous={data.prevScore} />
        </div>
      </div>

      {/* ── Landscape 2-Column: Gauge+Trend | Critical Markers ─ */}
      <div className="grid md:grid-cols-[280px_1fr] gap-0">
        {/* Left Column: Gauge + Trend + Description */}
        <div className="p-6 md:border-r border-[#0e393d]/6 flex flex-col items-center">
          <HealthGauge score={data.score} size="md" />

          {trendScores.length > 1 && (
            <div className="w-full mt-4">
              <p className="text-[9px] font-semibold tracking-[.15em] uppercase text-[#ceab84] mb-1.5">History</p>
              <Sparkline vals={trendScores} color={scoreColor(data.score)} height={28} />
            </div>
          )}

          <p className="text-[11px] text-[#1c2a2b]/50 leading-relaxed mt-4 italic text-center">
            {data.domainDescription}
          </p>
        </div>

        {/* Right Column: Critical / Exceptional Highlights */}
        <div className="p-6 space-y-5">
          {/* Critical markers — zoom cards */}
          {hasCritical && (
            <div>
              <SectionTag>Needs Attention</SectionTag>
              <div className="grid grid-cols-2 gap-3">
                {data.criticalMarkers.slice(0, 4).map((m) => (
                  <MarkerCard key={m.slug} m={m} compact />
                ))}
              </div>
            </div>
          )}

          {/* Exceptional markers — standout highlights */}
          {hasExceptional && !hasCritical && (
            <div>
              <SectionTag>Standout Performers</SectionTag>
              <div className="grid grid-cols-2 gap-3">
                {data.exceptionalMarkers.slice(0, 4).map((m) => (
                  <MarkerCard key={m.slug} m={m} compact />
                ))}
              </div>
            </div>
          )}

          {/* If neither critical nor exceptional, show top 4 markers as cards */}
          {!hasCritical && !hasExceptional && (
            <div>
              <SectionTag>Key Markers</SectionTag>
              <div className="grid grid-cols-2 gap-3">
                {data.markers.slice(0, 4).map((m) => (
                  <MarkerCard key={m.slug} m={m} compact />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── All Markers List ──────────────────────────────── */}
      <div className="px-8 pb-6">
        <SectionTag>All Markers</SectionTag>
        <div className="space-y-1.5">
          {data.markers.map((m) => (
            <MarkerRow key={m.slug} m={m} />
          ))}
        </div>
      </div>
    </div>
  );
}
