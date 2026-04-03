import { getLocale } from 'next-intl/server';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import PageHero from '@/components/PageHero';
import ContactForm from '@/components/ContactForm';
import { buildMeta, PAGE_META } from '@/lib/seo';
import { getCompanyInfo } from '@/lib/site-settings';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const lang = locale === 'de' ? 'de' : 'en';
  return buildMeta({ ...PAGE_META.contact[lang], path: '/contact', locale: lang });
}

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];

const T = {
  de: {
    eyebrow:  'Kontakt',
    heading:  'Schreib uns',
    sub:      'Fragen, Feedback oder Kooperationsanfragen – wir freuen uns von dir zu hören.',
    infoHead: 'Evida Life AG',
    address:  ['Sihleggstrasse 5', '8832 Wollerau', 'Schweiz'],
    emailLabel: 'E-Mail',
    formHead: 'Nachricht senden',
  },
  en: {
    eyebrow:  'Contact',
    heading:  'Get in touch',
    sub:      "Questions, feedback, or partnership enquiries — we'd love to hear from you.",
    infoHead: 'Evida Life AG',
    address:  ['Sihleggstrasse 5', '8832 Wollerau', 'Switzerland'],
    emailLabel: 'Email',
    formHead: 'Send a message',
  },
  fr: {
    eyebrow:  'Contact',
    heading:  'Contactez-nous',
    sub:      "Questions, retours ou demandes de partenariat – nous serions ravis d'avoir de vos nouvelles.",
    infoHead: 'Evida Life AG',
    address:  ['Sihleggstrasse 5', '8832 Wollerau', 'Suisse'],
    emailLabel: 'E-mail',
    formHead: 'Envoyer un message',
  },
  es: {
    eyebrow:  'Contacto',
    heading:  'Contáctanos',
    sub:      'Preguntas, comentarios o consultas de asociación – nos encantaría saber de ti.',
    infoHead: 'Evida Life AG',
    address:  ['Sihleggstrasse 5', '8832 Wollerau', 'Suiza'],
    emailLabel: 'Correo electrónico',
    formHead: 'Enviar un mensaje',
  },
  it: {
    eyebrow:  'Contatto',
    heading:  'Contattaci',
    sub:      'Domande, feedback o richieste di partnership – ci farebbe piacere sentirti.',
    infoHead: 'Evida Life AG',
    address:  ['Sihleggstrasse 5', '8832 Wollerau', 'Svizzera'],
    emailLabel: 'E-mail',
    formHead: 'Invia un messaggio',
  },
};

export default async function ContactPage() {
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';
  const t = T[lang];
  const company = await getCompanyInfo(lang);

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <PageHero
        variant="light"
        eyebrow={t.eyebrow}
        title={t.heading}
        subtitle={t.sub}
      />

      <main className="flex-1 w-full max-w-[1060px] mx-auto px-8 md:px-12 pb-16">
        <div className="grid gap-10 lg:grid-cols-[280px_1fr] items-start">

          {/* Company info */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#0e393d]/10 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#ceab84] mb-4">
                {company.name}
              </p>

              {/* Address — from site_settings */}
              <div className="flex items-start gap-3 mb-5">
                <span className="mt-0.5 text-[#0e393d]/40">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </span>
                <div>
                  <p className="text-sm text-[#1c2a2b]/70">{company.street}</p>
                  <p className="text-sm text-[#1c2a2b]/70">{company.postalCode} {company.city}</p>
                  <p className="text-sm text-[#1c2a2b]/70">{company.country}</p>
                </div>
              </div>

              {/* Email — from site_settings */}
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
                    href={`mailto:${company.email}`}
                    className="text-sm text-[#0e393d] font-medium hover:underline"
                  >
                    {company.email}
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
