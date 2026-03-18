import { getLocale } from 'next-intl/server';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { createClient } from '@/lib/supabase/server';
import { buildMeta, PAGE_META } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const lang = locale === 'en' ? 'en' : 'de';
  return buildMeta({ ...PAGE_META.partnerLabs[lang], path: '/partner-labs', locale: lang });
}

type Lang = 'de' | 'en';

type LabPartner = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  canton: string | null;
  postal_code: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  iso_accreditation: string | null;
};

const T = {
  de: {
    eyebrow: 'Partnerlabore',
    heading: 'Unser Labornetzwerk',
    heroSub: 'Evida Life arbeitet ausschliesslich mit ISO-akkreditierten Partnerlaboren zusammen. Höchste Analysequalität – für zuverlässige Biomarker-Ergebnisse, auf die du dich verlassen kannst.',
    statsTitle: 'Unser Netzwerk auf einen Blick',
    statLabs: 'Partnerlabore',
    statCountries: 'Länder',
    statCert: 'ISO-akkreditiert',
    whyHead: 'Warum ISO-Akkreditierung?',
    whyBody: 'ISO 15189 ist der internationale Qualitätsstandard für medizinische Laboratorien. Akkreditierte Labore werden regelmässig von unabhängigen Stellen geprüft – ein Garant für präzise und reproduzierbare Ergebnisse.',
    labsHead: 'Unsere Partnerlabore',
    noLabs: 'Noch keine Partnerlabore verfügbar.',
    isoLabel: 'Akkreditierung',
    mapLink: 'Auf Google Maps anzeigen',
    websiteLink: 'Website besuchen',
    addressLabel: 'Adresse',
    ctaEyebrow: 'Bluttest buchen',
    ctaHead: 'Jetzt Biomarker analysieren lassen.',
    ctaBody: 'Wähle dein Testpaket und wähle ein Partnerlabor in deiner Nähe.',
    ctaBtn: 'Zum Shop',
  },
  en: {
    eyebrow: 'Partner Labs',
    heading: 'Our lab network',
    heroSub: 'Evida Life works exclusively with ISO-accredited partner laboratories. The highest analytical quality — for reliable biomarker results you can trust.',
    statsTitle: 'Our network at a glance',
    statLabs: 'Partner labs',
    statCountries: 'Countries',
    statCert: 'ISO-accredited',
    whyHead: 'Why ISO accreditation?',
    whyBody: 'ISO 15189 is the international quality standard for medical laboratories. Accredited labs are regularly audited by independent bodies — a guarantee of precise and reproducible results.',
    labsHead: 'Our partner labs',
    noLabs: 'No partner labs available yet.',
    isoLabel: 'Accreditation',
    mapLink: 'View on Google Maps',
    websiteLink: 'Visit website',
    addressLabel: 'Address',
    ctaEyebrow: 'Book a blood test',
    ctaHead: 'Get your biomarkers analysed.',
    ctaBody: 'Choose your test package and select a partner lab near you.',
    ctaBtn: 'Go to shop',
  },
};

function IsoBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#ceab84]/15 px-2.5 py-1 text-[11px] font-semibold text-[#8a6a3e] ring-1 ring-inset ring-[#ceab84]/30">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      {value}
    </span>
  );
}

export default async function PartnerLabsPage() {
  const locale = (await getLocale()) as Lang;
  const t = T[locale];

  const supabase = await createClient();
  const { data: labs } = await supabase
    .from('lab_partners')
    .select('id, name, address, city, canton, postal_code, country, latitude, longitude, phone, email, website, iso_accreditation')
    .eq('is_active', true)
    .order('name', { ascending: true });

  const labList: LabPartner[] = labs ?? [];
  const countryCount = new Set(labList.map((l) => l.country).filter(Boolean)).size;
  const isoCount = labList.filter((l) => l.iso_accreditation).length;

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
        <section className="w-full max-w-3xl mx-auto px-6 py-14">
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

        {/* Labs grid */}
        <section className="w-full max-w-5xl mx-auto px-6 pb-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-6">{t.labsHead}</p>

          {labList.length === 0 ? (
            <div className="rounded-2xl border border-[#0e393d]/10 bg-white px-6 py-14 text-center">
              <p className="text-sm text-[#1c2a2b]/40">{t.noLabs}</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {labList.map((lab) => {
                const locationParts = [lab.address, [lab.postal_code, lab.city].filter(Boolean).join(' '), lab.canton ? `(${lab.canton})` : null, lab.country !== 'CH' ? lab.country : null].filter(Boolean);
                const mapsUrl = lab.latitude != null && lab.longitude != null
                  ? `https://www.google.com/maps?q=${lab.latitude},${lab.longitude}`
                  : null;

                return (
                  <div
                    key={lab.id}
                    className="rounded-2xl border border-[#0e393d]/10 bg-white p-6 flex flex-col hover:border-[#0e393d]/20 hover:shadow-sm transition-all duration-200"
                  >
                    {/* Name + ISO badge */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <h3 className="font-serif text-lg text-[#0e393d] leading-snug">{lab.name}</h3>
                      {lab.iso_accreditation && <IsoBadge value={lab.iso_accreditation} />}
                    </div>

                    {/* Location */}
                    {locationParts.length > 0 && (
                      <div className="flex items-start gap-2.5 mb-4">
                        <svg className="shrink-0 mt-0.5 text-[#0e393d]/35" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                        <div>
                          {locationParts.map((line, i) => (
                            <p key={i} className="text-sm text-[#1c2a2b]/60 leading-snug">{line}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Divider */}
                    <div className="w-full h-px bg-[#0e393d]/8 mb-4" />

                    {/* Links */}
                    <div className="mt-auto flex flex-wrap gap-2">
                      {mapsUrl && (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#0e393d]/15 bg-[#fafaf8] px-3 py-1.5 text-xs font-medium text-[#0e393d] hover:border-[#0e393d]/30 hover:bg-white transition"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                          </svg>
                          {t.mapLink}
                        </a>
                      )}
                      {lab.website && (
                        <a
                          href={lab.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#0e393d]/15 bg-[#fafaf8] px-3 py-1.5 text-xs font-medium text-[#0e393d] hover:border-[#0e393d]/30 hover:bg-white transition"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                            <polyline points="15 3 21 3 21 9"/>
                            <line x1="10" y1="14" x2="21" y2="3"/>
                          </svg>
                          {t.websiteLink}
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

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
