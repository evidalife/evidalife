import { ClosingData, Lang } from '@/lib/health-engine-v2-types';
import HealthGauge from '@/components/health/HealthGauge';
import { scoreColor } from './SlideBlocks';

export default function ClosingSlide({ data, lang }: { data: ClosingData; lang: Lang }) {
  return (
    <div className="w-full max-w-4xl bg-white rounded-2xl ring-1 ring-[#0e393d]/8 shadow-sm overflow-hidden">
      <div className="grid md:grid-cols-[1fr_1fr] gap-0">

        {/* Left: Score recap on dark teal */}
        <div className="bg-[#0e393d] p-8 flex flex-col items-center justify-center text-center">
          <p className="text-[10px] font-semibold tracking-[.2em] uppercase text-[#ceab84] mb-4">Your Longevity Score</p>
          <HealthGauge score={data.score} size="lg" dark />
          <span className="font-serif text-5xl font-bold text-white mt-3">{data.score}</span>
          <div className="flex gap-3 mt-5">
            <span className="text-[11px] px-3 py-1.5 rounded-full bg-white/[.08] text-white/60 border border-white/[.06]">
              {data.totalMarkers} markers
            </span>
            <span className="text-[11px] px-3 py-1.5 rounded-full bg-white/[.08] text-white/60 border border-white/[.06]">
              {data.totalDomains} domains
            </span>
          </div>
        </div>

        {/* Right: Next steps + CTAs */}
        <div className="p-8 flex flex-col justify-center space-y-6">
          {/* Improvements */}
          {data.improvements.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold tracking-[.18em] uppercase text-[#0C9C6C] mb-3">Key Improvements</p>
              <div className="space-y-2">
                {data.improvements.map((item, i) => (
                  <div key={i} className="flex gap-2 text-[13px] text-[#1c2a2b]/80 leading-relaxed">
                    <span className="text-[#0C9C6C] shrink-0 font-bold">+</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Steps */}
          {data.nextSteps.length > 0 && (
            <div className="p-5 rounded-xl bg-[#fafaf8] border border-[#0e393d]/[.05]">
              <p className="text-[10px] font-semibold tracking-[.18em] uppercase text-[#ceab84] mb-3">Next Steps</p>
              <ol className="space-y-2.5">
                {data.nextSteps.map((step, i) => (
                  <li key={i} className="flex gap-2.5 text-[13px] text-[#1c2a2b]/70 leading-relaxed">
                    <span className="font-serif text-[#ceab84] font-bold shrink-0">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
