import { getLocale } from 'next-intl/server';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { buildMeta, PAGE_META } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const lang = locale === 'de' ? 'de' : 'en';
  return buildMeta({ ...PAGE_META.team[lang], path: '/team', locale: lang });
}

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];

type Member = {
  initials: string;
  color: string;
  name: { de: string; en: string; fr?: string; es?: string; it?: string };
  role: { de: string; en: string; fr?: string; es?: string; it?: string };
  bio: { de: string; en: string; fr?: string; es?: string; it?: string };
};

const TEAM: Member[] = [
  {
    initials: 'EL',
    color: '#0e393d',
    name: { de: 'Evida Life Gründer', en: 'Evida Life Founder' },
    role: { de: 'CEO & Co-Founder', en: 'CEO & Co-Founder' },
    bio: {
      de: 'Verbindet jahrelange Erfahrung in Gesundheitstechnologie mit einer tiefen Überzeugung für präventive Medizin und pflanzliche Ernährung.',
      en: 'Combines years of experience in health technology with a deep commitment to preventive medicine and plant-based nutrition.',
    },
  },
  {
    initials: 'ML',
    color: '#2a6b72',
    name: { de: 'Medical Lead', en: 'Medical Lead' },
    role: { de: 'Chief Medical Officer', en: 'Chief Medical Officer' },
    bio: {
      de: 'Arzt mit Spezialisierung in Innerer Medizin und Präventivmedizin. Zuständig für die wissenschaftliche Validierung aller Inhalte und Empfehlungen.',
      en: 'Physician specialising in internal and preventive medicine. Responsible for the scientific validation of all content and recommendations.',
    },
  },
  {
    initials: 'DS',
    color: '#ceab84',
    name: { de: 'Data Science Lead', en: 'Data Science Lead' },
    role: { de: 'Chief Data Officer', en: 'Chief Data Officer' },
    bio: {
      de: 'Experte für maschinelles Lernen und Bioinformatik. Entwickelt die Algorithmen hinter dem Health Engine Score und der Biomarker-Analyse.',
      en: 'Expert in machine learning and bioinformatics. Develops the algorithms behind the Health Engine Score and biomarker analysis.',
    },
  },
  {
    initials: 'NR',
    color: '#4a8a6a',
    name: { de: 'Ernährungsberatung', en: 'Nutrition Lead' },
    role: { de: 'Head of Nutrition', en: 'Head of Nutrition' },
    bio: {
      de: 'Dipl. Ernährungsberaterin mit Fokus auf pflanzliche Ernährung und Sporternährung. Kuratiert Rezepte und Daily Dozen Inhalte.',
      en: 'Registered dietitian specialising in plant-based and sports nutrition. Curates recipes and Daily Dozen content.',
    },
  },
  {
    initials: 'PT',
    color: '#8a6a3e',
    name: { de: 'Produktentwicklung', en: 'Product Lead' },
    role: { de: 'Head of Product', en: 'Head of Product' },
    bio: {
      de: 'Gestaltet die Nutzererfahrung auf Evida Life. Hintergrund in UX-Design und Health-App-Entwicklung.',
      en: 'Shapes the user experience at Evida Life. Background in UX design and health app development.',
    },
  },
  {
    initials: 'LS',
    color: '#5a4a8a',
    name: { de: 'Labor & Diagnostik', en: 'Lab & Diagnostics' },
    role: { de: 'Head of Lab Operations', en: 'Head of Lab Operations' },
    bio: {
      de: 'Koordiniert die Zusammenarbeit mit Partnerlaboren und stellt die Qualität der Biomarker-Analysen sicher.',
      en: 'Coordinates partnerships with labs and ensures the quality of all biomarker analyses.',
    },
  },
];

const T = {
  de: {
    eyebrow: 'Unser Team',
    heading: 'Menschen hinter Evida Life',
    sub: 'Ein interdisziplinäres Team aus Medizin, Datenwissenschaft, Ernährung und Produktentwicklung – vereint durch die Mission einer zugänglichen Präventivmedizin.',
    joinEyebrow: 'Karriere',
    joinHead: 'Werde Teil des Teams.',
    joinBody: 'Wir suchen leidenschaftliche Menschen, die Gesundheit neu denken wollen. Schreib uns an hello@evidalife.com.',
    joinCta: 'Jetzt bewerben',
  },
  en: {
    eyebrow: 'Our team',
    heading: 'The people behind Evida Life',
    sub: 'An interdisciplinary team from medicine, data science, nutrition, and product development — united by the mission of accessible preventive health.',
    joinEyebrow: 'Careers',
    joinHead: 'Join the team.',
    joinBody: "We're looking for passionate people who want to rethink health. Write to us at hello@evidalife.com.",
    joinCta: 'Apply now',
  },
  fr: {
    eyebrow: 'Notre équipe',
    heading: 'Les personnes derrière Evida Life',
    sub: 'Une équipe interdisciplinaire de médecine, science des données, nutrition et développement de produits — unie par la mission d\'une santé préventive accessible.',
    joinEyebrow: 'Carrières',
    joinHead: 'Rejoignez l\'équipe.',
    joinBody: 'Nous cherchons des personnes passionnées qui veulent repenser la santé. Écrivez-nous à hello@evidalife.com.',
    joinCta: 'Postuler maintenant',
  },
  es: {
    eyebrow: 'Nuestro equipo',
    heading: 'Las personas detrás de Evida Life',
    sub: 'Un equipo interdisciplinario de medicina, ciencia de datos, nutrición y desarrollo de productos — unido por la misión de una salud preventiva accesible.',
    joinEyebrow: 'Carreras',
    joinHead: 'Únete al equipo.',
    joinBody: 'Buscamos personas apasionadas que quieran repensar la salud. Escríbenos a hello@evidalife.com.',
    joinCta: 'Aplicar ahora',
  },
  it: {
    eyebrow: 'Il nostro team',
    heading: 'Le persone dietro Evida Life',
    sub: 'Un team interdisciplinare di medicina, scienza dei dati, nutrizione e sviluppo di prodotti — unito dalla missione di una salute preventiva accessibile.',
    joinEyebrow: 'Carriere',
    joinHead: 'Unisciti al team.',
    joinBody: 'Cerchiamo persone appassionate che vogliono ripensare la salute. Scrivici a hello@evidalife.com.',
    joinCta: 'Candidati ora',
  },
};

function AvatarPlaceholder({ initials, color }: { initials: string; color: string }) {
  return (
    <div
      className="w-20 h-20 rounded-full flex items-center justify-center shrink-0 mx-auto mb-4 border-2 border-white shadow-sm"
      style={{ backgroundColor: color + '18', borderColor: color + '25' }}
    >
      <span className="font-serif text-xl font-semibold" style={{ color }}>
        {initials}
      </span>
    </div>
  );
}

export default async function TeamPage() {
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
            <h1 className="font-serif text-4xl sm:text-5xl text-white leading-tight mb-5">{t.heading}</h1>
            <p className="text-white/60 text-base leading-relaxed max-w-xl">{t.sub}</p>
          </div>
        </section>

        {/* Team grid */}
        <section className="w-full max-w-5xl mx-auto px-6 py-16">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {TEAM.map((member) => (
              <div
                key={member.initials}
                className="rounded-2xl border border-[#0e393d]/10 bg-white p-6 text-center hover:border-[#0e393d]/20 hover:shadow-sm transition-all duration-200"
              >
                <AvatarPlaceholder initials={member.initials} color={member.color} />
                <h3 className="font-serif text-lg text-[#0e393d] leading-snug mb-0.5">
                  {member.name[lang] ?? member.name.en}
                </h3>
                <p className="text-xs font-semibold text-[#ceab84] uppercase tracking-wide mb-3">
                  {member.role[lang] ?? member.role.en}
                </p>
                <div className="w-8 h-0.5 bg-[#0e393d]/10 mx-auto mb-3" />
                <p className="text-sm text-[#1c2a2b]/55 leading-relaxed">
                  {member.bio[lang] ?? member.bio.en}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Join CTA */}
        <section className="w-full bg-white border-t border-[#0e393d]/10 px-6 py-16">
          <div className="max-w-xl mx-auto text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.joinEyebrow}</p>
            <h2 className="font-serif text-3xl text-[#0e393d] mb-4">{t.joinHead}</h2>
            <p className="text-[#1c2a2b]/60 text-base leading-relaxed mb-8">{t.joinBody}</p>
            <a
              href="mailto:hello@evidalife.com"
              className="inline-flex items-center gap-2 rounded-full bg-[#0e393d] px-8 py-3 text-sm font-semibold text-white hover:bg-[#0e393d]/85 transition"
            >
              {t.joinCta}
            </a>
          </div>
        </section>

      </main>

      <PublicFooter />
    </div>
  );
}
