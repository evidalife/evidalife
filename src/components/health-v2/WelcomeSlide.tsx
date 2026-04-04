import { WelcomeData, Lang, fmtDateFull } from '@/lib/health-engine';

export default function WelcomeSlide({ data, lang }: { data: WelcomeData; lang: Lang }) {
  return (
    <div className="w-full max-w-4xl rounded-2xl bg-[#0e393d] text-white overflow-hidden">
      <div className="grid md:grid-cols-[1.2fr_1fr] gap-0">

        {/* Left: Welcome text */}
        <div className="p-10 flex flex-col justify-center">
          <p className="text-[10px] font-semibold tracking-[.2em] uppercase text-[#ceab84] mb-4">Health Briefing</p>
          <h1 className="font-serif text-[clamp(1.8rem,3vw,2.8rem)] font-bold leading-[1.1] mb-4">
            Welcome, {data.firstName}
          </h1>
          <p className="text-[#ceab84] text-base mb-6 font-light">
            {fmtDateFull(data.testDate, lang)}
          </p>
          <p className="text-white/50 text-sm leading-relaxed max-w-sm">
            Your personalized walkthrough of {data.markerCount} biomarkers across {data.reportCount} lab report{data.reportCount !== 1 ? 's' : ''}.
          </p>
        </div>

        {/* Right: Stats panel */}
        <div className="bg-white/[.04] p-10 flex flex-col justify-center gap-5 border-l border-white/[.06]">
          <div className="text-center p-5 rounded-xl bg-white/[.05] border border-white/[.06]">
            <span className="font-serif text-4xl font-bold text-[#ceab84]">{data.markerCount}</span>
            <p className="text-[11px] text-white/35 mt-1 uppercase tracking-[.12em]">Biomarkers Analyzed</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-4 rounded-xl bg-white/[.05] border border-white/[.06]">
              <span className="font-serif text-2xl font-bold text-white/80">{data.reportCount}</span>
              <p className="text-[10px] text-white/30 mt-0.5">Reports</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/[.05] border border-white/[.06]">
              <span className="font-serif text-2xl font-bold text-white/80">9</span>
              <p className="text-[10px] text-white/30 mt-0.5">Domains</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
