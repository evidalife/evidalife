import { DomainSummaryData, Lang } from '@/lib/health-engine-v2-types';
import HealthGauge from '@/components/health/HealthGauge';
import { SectionTag, MarkerCard, MarkerRow, Sparkline, scoreColor } from './SlideBlocks';

export default function DomainSlide({ data, lang }: { data: DomainSummaryData; lang: Lang }) {
  const trendScores = data.domainTrend.map((t) => t.score);
  const hasCritical = data.criticalMarkers.length > 0;
  const hasExceptional = data.exceptionalMarkers.length > 0;
  const delta = data.prevScore != null ? data.score - data.prevScore : null;

  return (
    <div className="w-full max-w-4xl bg-white rounded-2xl ring-1 ring-[#0e393d]/8 shadow-sm overflow-hidden">
      {/* ── Landscape 2-Column: Title+Gauge+Trend | Standout Markers ─ */}
      <div className="grid md:grid-cols-[260px_1fr] gap-0">
        {/* Left Column: Domain Title + Gauge + Trend + Description */}
        <div className="p-5 md:border-r border-[#0e393d]/6 flex flex-col items-center">
          {/* Domain title */}
          <div className="flex items-center gap-2.5 self-start mb-3 w-full">
            <span className="text-xl shrink-0">{data.domainIcon}</span>
            <div className="min-w-0">
              <h2 className="font-serif text-lg font-bold text-[#0e393d] leading-tight truncate">{data.domainName}</h2>
              <p className="text-[9px] text-[#1c2a2b]/40 uppercase tracking-[.18em]">Weight: {data.weight}</p>
            </div>
          </div>

          <HealthGauge score={data.score} size="md" delta={delta} />

          {trendScores.length > 1 && (
            <div className="w-full mt-3">
              <p className="text-[9px] font-semibold tracking-[.15em] uppercase text-[#ceab84] mb-1.5">History</p>
              <Sparkline vals={trendScores} color={scoreColor(data.score)} height={28} />
            </div>
          )}

          <p className="text-[11px] text-[#1c2a2b]/50 leading-relaxed mt-3 italic text-center">
            {data.domainDescription}
          </p>
        </div>

        {/* Right Column: Critical / Exceptional Highlights */}
        <div className="p-5 space-y-4">
          {/* Critical markers — zoom cards */}
          {hasCritical && (
            <div>
              <SectionTag>Needs Attention</SectionTag>
              <div className="grid grid-cols-2 gap-2.5">
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
              <div className="grid grid-cols-2 gap-2.5">
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
              <div className="grid grid-cols-2 gap-2.5">
                {data.markers.slice(0, 4).map((m) => (
                  <MarkerCard key={m.slug} m={m} compact />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── All Markers Grid ─────────────────────────────── */}
      <div className="px-6 pb-5">
        <SectionTag>All Markers</SectionTag>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
          {data.markers.map((m) => (
            <MarkerRow key={m.slug} m={m} />
          ))}
        </div>
      </div>
    </div>
  );
}
