import { getLocale } from 'next-intl/server';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { createClient } from '@/lib/supabase/server';
import { buildMeta, PAGE_META } from '@/lib/seo';
import { T } from './translations';
import PartnerLabsClient, { type PublicLab } from '@/components/PartnerLabsClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const lang = locale === 'de' ? 'de' : 'en';
  return buildMeta({ ...PAGE_META.partnerLabs[lang], path: '/partner-labs', locale: lang });
}

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];

export default async function PartnerLabsPage() {
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';
  const t = T[lang];

  const supabase = await createClient();

  // Only fetch labs that actually perform tests (have test_categories set)
  // Exclude parent org umbrella entries that have no test offerings
  const { data: labs } = await supabase
    .from('lab_partners')
    .select('id, name, address, city, canton, postal_code, country, latitude, longitude, phone, website, iso_accreditation, test_categories, cover_image_url, description')
    .eq('is_active', true)
    .not('test_categories', 'is', null)
    .order('name', { ascending: true });

  // Filter to labs with at least 1 category
  const labList: PublicLab[] = (labs ?? []).filter(
    (l) => Array.isArray(l.test_categories) && l.test_categories.length > 0
  );

  const countryCount = new Set(labList.map((l) => l.country).filter(Boolean)).size;
  const isoCount = labList.filter((l) => l.iso_accreditation).length;

  const clientTranslations = {
    searchPlaceholder: t.searchPlaceholder,
    countryAll: t.countryAll,
    noResults: t.noResults,
    mapLink: t.mapLink,
    websiteLink: t.websiteLink,
    clearFilters: t.clearFilters,
  };

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <main className="flex-1">

        {/* Hero */}
        <section className="w-full bg-[#0e393d] px-6 pt-28 pb-20">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-4">{t.eyebrow}</p>
            <h1 className="font-serif text-4xl sm:text-5xl text-white leading-tight mb-5">{t.heading}</h1>
            <p className="text-white/60 text-base leading-relaxed max-w-xl">{t.heroSub}</p>
          </div>
        </section>

        {/* Stats bar */}
        {labList.length > 0 && (
          <section className="w-full border-b border-[#0e393d]/10 bg-white px-6 py-8">
            <div className="max-w-3xl mx-auto">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-5">{t.statsTitle}</p>
              <div className="flex flex-wrap gap-10">
                <div>
                  <p className="font-serif text-3xl text-[#0e393d]">{labList.length}</p>
                  <p className="text-xs text-[#1c2a2b]/50 mt-0.5">{t.statLabs}</p>
                </div>
                {countryCount > 0 && (
                  <div>
                    <p className="font-serif text-3xl text-[#0e393d]">{countryCount}</p>
                    <p className="text-xs text-[#1c2a2b]/50 mt-0.5">{t.statCountries}</p>
                  </div>
                )}
                {isoCount > 0 && (
                  <div>
                    <p className="font-serif text-3xl text-[#0e393d]">{isoCount}</p>
                    <p className="text-xs text-[#1c2a2b]/50 mt-0.5">{t.statCert}</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Why ISO */}
        <section className="w-full max-w-3xl mx-auto px-6 py-10">
          <div className="rounded-2xl border border-[#ceab84]/30 bg-[#ceab84]/6 px-6 py-6 flex gap-5">
            <div className="shrink-0 mt-0.5">
              <div className="w-10 h-10 rounded-full bg-[#ceab84]/20 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8a6a3e" strokeWidth="1.75">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#8a6a3e] mb-1">{t.whyHead}</p>
              <p className="text-sm text-[#8a6a3e]/75 leading-relaxed">{t.whyBody}</p>
            </div>
          </div>
        </section>

        {/* Interactive map + filter + cards (client) */}
        {labList.length > 0 ? (
          <PartnerLabsClient
            labs={labList}
            lang={lang}
            t={clientTranslations}
          />
        ) : (
          <section className="w-full max-w-5xl mx-auto px-6 pb-16">
            <div className="rounded-2xl border border-[#0e393d]/10 bg-white px-6 py-14 text-center">
              <p className="text-sm text-[#1c2a2b]/40">{t.noLabs}</p>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="w-full bg-white border-t border-[#0e393d]/10 px-6 py-16">
          <div className="max-w-xl mx-auto text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.ctaEyebrow}</p>
            <h2 className="font-serif text-3xl text-[#0e393d] mb-4">{t.ctaHead}</h2>
            <p className="text-[#1c2a2b]/60 text-base leading-relaxed mb-8">{t.ctaBody}</p>
            <a
              href={`/${locale}/shop`}
              className="inline-flex items-center gap-2 rounded-full bg-[#0e393d] px-8 py-3 text-sm font-semibold text-white hover:bg-[#0e393d]/85 transition"
            >
              {t.ctaBtn}
            </a>
          </div>
        </section>

      </main>

      <PublicFooter />
    </div>
  );
}
