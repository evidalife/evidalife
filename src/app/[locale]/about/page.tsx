import { getLocale } from 'next-intl/server';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { buildMeta, PAGE_META } from '@/lib/seo';
import { T } from './translations';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const lang = locale === 'de' ? 'de' : 'en';
  return buildMeta({ ...PAGE_META.about[lang], path: '/about', locale: lang });
}

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];


export default async function AboutPage() {
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';
  const t = T[lang];

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <main className="flex-1">

        {/* Hero */}
        <section className="w-full bg-[#0e393d] px-6 pt-28 pb-20">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-4">{t.eyebrow}</p>
            <h1 className="font-serif text-4xl sm:text-5xl text-white leading-tight mb-6">{t.heroHead}</h1>
            <p className="text-white/60 text-lg leading-relaxed max-w-2xl">{t.heroSub}</p>
          </div>
        </section>

        {/* Mission */}
        <section className="w-full max-w-3xl mx-auto px-6 py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.missionEyebrow}</p>
          <h2 className="font-serif text-3xl text-[#0e393d] mb-6 leading-snug">{t.missionHead}</h2>
          <p className="text-[#1c2a2b]/65 text-base leading-relaxed">{t.missionBody}</p>
        </section>

        <div className="max-w-3xl mx-auto px-6"><hr className="border-[#0e393d]/10" /></div>

        {/* Vision */}
        <section className="w-full max-w-3xl mx-auto px-6 py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.visionEyebrow}</p>
          <h2 className="font-serif text-3xl text-[#0e393d] mb-6 leading-snug">{t.visionHead}</h2>
          <p className="text-[#1c2a2b]/65 text-base leading-relaxed">{t.visionBody}</p>
        </section>

        {/* Why plant-based */}
        <section className="w-full bg-white border-y border-[#0e393d]/10 px-6 py-16">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.whyEyebrow}</p>
            <h2 className="font-serif text-3xl text-[#0e393d] mb-10 leading-snug">{t.whyHead}</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {t.whyPoints.map((point) => (
                <div key={point.title} className="rounded-2xl border border-[#0e393d]/10 p-6">
                  <div className="w-8 h-0.5 bg-[#ceab84] mb-4" />
                  <h3 className="font-serif text-lg text-[#0e393d] mb-2">{point.title}</h3>
                  <p className="text-sm text-[#1c2a2b]/60 leading-relaxed">{point.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Science approach */}
        <section className="w-full max-w-3xl mx-auto px-6 py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.scienceEyebrow}</p>
          <h2 className="font-serif text-3xl text-[#0e393d] mb-6 leading-snug">{t.scienceHead}</h2>
          <p className="text-[#1c2a2b]/65 text-base leading-relaxed">{t.scienceBody}</p>
        </section>

        {/* Founder */}
        <section className="w-full bg-white border-t border-[#0e393d]/10 px-6 py-16">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.founderEyebrow}</p>
            <h2 className="font-serif text-3xl text-[#0e393d] mb-8 leading-snug">{t.founderHead}</h2>
            <div className="flex items-start gap-6">
              <div className="shrink-0 w-20 h-20 rounded-full bg-[#0e393d]/8 border-2 border-[#0e393d]/12 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-[#0e393d]/30">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-[#1c2a2b]/65 text-base leading-relaxed mb-4">{t.founderBody}</p>
                <p className="text-sm font-semibold text-[#0e393d]">{t.founderName}</p>
                <p className="text-xs text-[#1c2a2b]/45">{t.founderRole}</p>
              </div>
            </div>
          </div>
        </section>

      </main>

      <PublicFooter />
    </div>
  );
}
