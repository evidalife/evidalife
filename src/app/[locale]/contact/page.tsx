import { getLocale } from 'next-intl/server';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import ContactForm from '@/components/ContactForm';
import { buildMeta, PAGE_META } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const lang = locale === 'de' ? 'de' : 'en';
  return buildMeta({ ...PAGE_META.contact[lang], path: '/contact', locale: lang });
}

type Lang = 'de' | 'en';

const T = {
  de: {
    eyebrow:  'Kontakt',
    heading:  'Schreib uns',
    sub:      'Fragen, Feedback oder Kooperationsanfragen – wir freuen uns von dir zu hören.',
    infoHead: 'Evida Life AG',
    address:  ['Zürich', 'Schweiz'],
    emailLabel: 'E-Mail',
    formHead: 'Nachricht senden',
  },
  en: {
    eyebrow:  'Contact',
    heading:  'Get in touch',
    sub:      "Questions, feedback, or partnership enquiries — we'd love to hear from you.",
    infoHead: 'Evida Life AG',
    address:  ['Zürich', 'Switzerland'],
    emailLabel: 'Email',
    formHead: 'Send a message',
  },
};

export default async function ContactPage() {
  const locale = await getLocale();
  const lang: Lang = locale === 'de' ? 'de' : 'en';
  const t = T[lang];

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 pt-28 pb-16">

        {/* Hero */}
        <div className="mb-12 max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-2">{t.eyebrow}</p>
          <h1 className="font-serif text-4xl text-[#0e393d] mb-3">{t.heading}</h1>
          <p className="text-[#1c2a2b]/60 text-base leading-relaxed">{t.sub}</p>
        </div>

        <div className="grid gap-10 lg:grid-cols-[280px_1fr] items-start">

          {/* Company info */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#0e393d]/10 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#ceab84] mb-4">
                {t.infoHead}
              </p>

              {/* Address */}
              <div className="flex items-start gap-3 mb-5">
                <span className="mt-0.5 text-[#0e393d]/40">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </span>
                <div>
                  {t.address.map((line) => (
                    <p key={line} className="text-sm text-[#1c2a2b]/70">{line}</p>
                  ))}
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-3">
                <span className="text-[#0e393d]/40">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#1c2a2b]/35 mb-0.5">{t.emailLabel}</p>
                  <a
                    href="mailto:hello@evidalife.com"
                    className="text-sm text-[#0e393d] font-medium hover:underline"
                  >
                    hello@evidalife.com
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div className="rounded-2xl border border-[#0e393d]/10 bg-white p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#ceab84] mb-6">{t.formHead}</p>
            <ContactForm lang={lang} />
          </div>

        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
