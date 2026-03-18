import { getLocale } from 'next-intl/server';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export const metadata = { title: 'Wissenschaft & Quellen – Evida Life' };

type Lang = 'de' | 'en';

type Reference = {
  authors: string;
  title: { de: string; en: string };
  journal: string;
  year: number;
  link: string;
};

const REFS: Reference[] = [
  {
    authors: 'Ornish D. et al.',
    title: {
      de: 'Können Lebensstilveränderungen Koronarerkrankungen umkehren?',
      en: 'Can lifestyle changes reverse coronary heart disease?',
    },
    journal: 'The Lancet',
    year: 1990,
    link: 'https://pubmed.ncbi.nlm.nih.gov/1973470/',
  },
  {
    authors: 'Esselstyn C.B. et al.',
    title: {
      de: 'Eine Ernährungsstrategie zur Aufhebung von KHK',
      en: 'A way to reverse coronary artery disease',
    },
    journal: 'Journal of Family Practice',
    year: 2014,
    link: 'https://pubmed.ncbi.nlm.nih.gov/25198208/',
  },
  {
    authors: 'Satija A. et al.',
    title: {
      de: 'Pflanzliche Ernährungsmuster und das Risiko für Typ-2-Diabetes',
      en: 'Plant-based dietary patterns and incidence of type 2 diabetes',
    },
    journal: 'PLOS Medicine',
    year: 2016,
    link: 'https://pubmed.ncbi.nlm.nih.gov/27299701/',
  },
  {
    authors: 'Willett W. et al.',
    title: {
      de: 'Ernährung im Anthropozän: die EAT-Lancet Kommission',
      en: 'Food in the Anthropocene: the EAT-Lancet Commission',
    },
    journal: 'The Lancet',
    year: 2019,
    link: 'https://pubmed.ncbi.nlm.nih.gov/30660336/',
  },
  {
    authors: 'Greger M. & Stone G.',
    title: {
      de: 'Wie man nicht stirbt (How Not to Die)',
      en: 'How Not to Die',
    },
    journal: 'Flatiron Books',
    year: 2015,
    link: 'https://nutritionfacts.org/book/how-not-to-die/',
  },
  {
    authors: 'Buettner D.',
    title: {
      de: 'Die Blue Zones: Lektionen für ein längeres Leben',
      en: 'The Blue Zones: Lessons for Living Longer',
    },
    journal: 'National Geographic Books',
    year: 2008,
    link: 'https://www.bluezones.com',
  },
];

const PRINCIPLES = [
  {
    icon: '🔬',
    title: { de: 'Peer-reviewed Quellen', en: 'Peer-reviewed sources' },
    body: {
      de: 'Wir stützen uns ausschliesslich auf in wissenschaftlichen Fachzeitschriften veröffentlichte, von Experten begutachtete Studien.',
      en: 'We rely exclusively on studies published in peer-reviewed scientific journals and evaluated by domain experts.',
    },
  },
  {
    icon: '📊',
    title: { de: 'Meta-Analysen bevorzugt', en: 'Meta-analyses preferred' },
    body: {
      de: 'Einzelstudien können täuschen. Wo möglich priorisieren wir systematische Reviews und Meta-Analysen, die viele Studien zusammenfassen.',
      en: 'Single studies can be misleading. Where possible, we prioritise systematic reviews and meta-analyses that synthesise large bodies of evidence.',
    },
  },
  {
    icon: '🔄',
    title: { de: 'Kontinuierliche Aktualisierung', en: 'Continuously updated' },
    body: {
      de: 'Wissenschaft ist kein statisches Gebäude. Wir überprüfen unsere Empfehlungen regelmässig und passen sie an neue Erkenntnisse an.',
      en: 'Science is not static. We regularly review our recommendations and update them as new evidence emerges.',
    },
  },
  {
    icon: '⚖️',
    title: { de: 'Transparente Unsicherheit', en: 'Transparent uncertainty' },
    body: {
      de: 'Nicht alles ist bewiesen. Wir kommunizieren klar, wo die Evidenz stark ist und wo noch Forschungsbedarf besteht.',
      en: 'Not everything is proven. We clearly communicate where evidence is strong and where further research is needed.',
    },
  },
];

const SOURCES = [
  { name: 'NutritionFacts.org', desc: { de: 'Täglich aktualisierte Ernährungsforschung von Dr. Michael Greger', en: 'Daily updated nutrition research by Dr. Michael Greger' }, link: 'https://nutritionfacts.org' },
  { name: 'PubMed', desc: { de: 'Datenbank biomedizinischer Fachliteratur (NIH)', en: 'Biomedical literature database by the NIH' }, link: 'https://pubmed.ncbi.nlm.nih.gov' },
  { name: 'The Lancet', desc: { de: 'Eine der führenden medizinischen Fachzeitschriften weltweit', en: 'One of the world\'s leading medical journals' }, link: 'https://www.thelancet.com' },
  { name: 'NEJM', desc: { de: 'New England Journal of Medicine – klinische Forschung', en: 'New England Journal of Medicine — clinical research' }, link: 'https://www.nejm.org' },
  { name: 'EAT-Lancet Commission', desc: { de: 'Wissenschaftliche Grundlage für gesunde und nachhaltige Ernährung', en: 'Scientific basis for healthy and sustainable diets' }, link: 'https://eatforum.org/eat-lancet-commission/' },
  { name: 'Blue Zones', desc: { de: 'Forschung zu Langlebigkeit in den gesündesten Bevölkerungen der Welt', en: 'Research on longevity in the world\'s healthiest populations' }, link: 'https://www.bluezones.com' },
];

const T = {
  de: {
    eyebrow: 'Wissenschaft',
    heading: 'Wissenschaft & Quellen',
    heroSub: 'Alles, was wir tun, basiert auf der besten verfügbaren wissenschaftlichen Evidenz. Hier findest du unsere Grundprinzipien und die wichtigsten Quellen, auf die wir uns stützen.',
    principlesHead: 'Unsere Evidenz-Prinzipien',
    refsHead: 'Schlüsselreferenzen',
    refsBody: 'Eine Auswahl der wichtigsten Studien und Werke, die unsere Empfehlungen prägen.',
    sourcesHead: 'Unsere wichtigsten Quellen',
    disclaimer: 'Haftungsausschluss',
    disclaimerBody: 'Die Inhalte auf Evida Life dienen der allgemeinen Information und ersetzen keine ärztliche Beratung. Bei gesundheitlichen Beschwerden wende dich an eine qualifizierte medizinische Fachperson.',
    viewStudy: 'Studie ansehen',
    visitSite: 'Webseite besuchen',
  },
  en: {
    eyebrow: 'Science',
    heading: 'Science & Sources',
    heroSub: 'Everything we do is based on the best available scientific evidence. Here you\'ll find our core principles and the key sources we rely on.',
    principlesHead: 'Our evidence principles',
    refsHead: 'Key references',
    refsBody: 'A selection of the most important studies and works that shape our recommendations.',
    sourcesHead: 'Our key sources',
    disclaimer: 'Disclaimer',
    disclaimerBody: 'The content on Evida Life is for general information purposes and does not replace medical advice. For health concerns, consult a qualified healthcare professional.',
    viewStudy: 'View study',
    visitSite: 'Visit site',
  },
};

export default async function SciencePage() {
  const locale = (await getLocale()) as Lang;
  const t = T[locale];

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <main className="flex-1">

        {/* Hero */}
        <section className="w-full bg-[#0e393d] px-6 py-20">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-4">{t.eyebrow}</p>
            <h1 className="font-serif text-4xl sm:text-5xl text-white leading-tight mb-5">{t.heading}</h1>
            <p className="text-white/60 text-base leading-relaxed max-w-xl">{t.heroSub}</p>
          </div>
        </section>

        {/* Evidence principles */}
        <section className="w-full max-w-5xl mx-auto px-6 py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.principlesHead}</p>
          <div className="grid gap-5 sm:grid-cols-2">
            {PRINCIPLES.map((p) => (
              <div key={p.title.en} className="rounded-2xl border border-[#0e393d]/10 bg-white p-6">
                <span className="text-2xl mb-3 block">{p.icon}</span>
                <h3 className="font-serif text-lg text-[#0e393d] mb-2">{p.title[locale]}</h3>
                <p className="text-sm text-[#1c2a2b]/60 leading-relaxed">{p.body[locale]}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Key references */}
        <section className="w-full bg-white border-y border-[#0e393d]/10 px-6 py-16">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-2">{t.refsHead}</p>
            <p className="text-[#1c2a2b]/55 text-sm mb-8">{t.refsBody}</p>
            <div className="space-y-3">
              {REFS.map((ref) => (
                <div key={ref.link} className="rounded-xl border border-[#0e393d]/10 bg-[#fafaf8] px-5 py-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0e393d] leading-snug mb-1">
                      {ref.title[locale]}
                    </p>
                    <p className="text-xs text-[#1c2a2b]/45">
                      {ref.authors} · <span className="italic">{ref.journal}</span> · {ref.year}
                    </p>
                  </div>
                  <a
                    href={ref.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-[#0e393d]/15 bg-white px-3 py-1.5 text-xs font-medium text-[#0e393d] hover:border-[#0e393d]/35 hover:bg-[#0e393d]/4 transition"
                  >
                    {t.viewStudy}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                      <polyline points="15 3 21 3 21 9"/>
                      <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Key sources */}
        <section className="w-full max-w-5xl mx-auto px-6 py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-6">{t.sourcesHead}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SOURCES.map((s) => (
              <a
                key={s.link}
                href={s.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-2xl border border-[#0e393d]/10 bg-white p-5 hover:border-[#0e393d]/25 hover:shadow-sm transition-all duration-200 flex flex-col"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-sm text-[#0e393d] group-hover:text-[#1a5055] transition-colors">{s.name}</p>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#0e393d]/30 group-hover:text-[#0e393d]/60 transition-colors shrink-0">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </div>
                <p className="text-xs text-[#1c2a2b]/50 leading-relaxed">{s.desc[locale]}</p>
              </a>
            ))}
          </div>
        </section>

        {/* Disclaimer */}
        <section className="w-full max-w-3xl mx-auto px-6 pb-16">
          <div className="rounded-2xl border border-[#ceab84]/30 bg-[#ceab84]/6 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#8a6a3e] mb-2">{t.disclaimer}</p>
            <p className="text-sm text-[#8a6a3e]/80 leading-relaxed">{t.disclaimerBody}</p>
          </div>
        </section>

      </main>

      <PublicFooter />
    </div>
  );
}
