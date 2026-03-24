import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Health – Evida Life' };

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = (typeof VALID_LANGS)[number];

const T: Record<Lang, {
  tag: string;
  h1: string;
  sub: string;
  pillarsHeading: string;
  pillars: { icon: string; name: string; desc: (n: number) => string; link: string; cta: string }[];
  engineHeading: string;
  engineSub: string;
  engineSteps: { title: string; body: string }[];
  engineCta: string;
}> = {
  de: {
    tag: 'DEINE GESUNDHEIT',
    h1: 'Verstehe deinen Körper.',
    sub: 'Drei Säulen der Longevity-Diagnostik – von Blutbiomarkern bis zur epigenetischen Uhr.',
    pillarsHeading: 'Drei Säulen',
    pillars: [
      {
        icon: '🩸',
        name: 'Blut-Biomarker',
        desc: (n) => `${n} Blutmarker über 6 Domänen: Herz-Kreislauf, Stoffwechsel, Entzündung, Organfunktion, Nährstoffe und Hormone. Grundlage jedes Longevity-Protokolls.`,
        link: '/biomarkers',
        cta: 'Alle Biomarker →',
      },
      {
        icon: '🧬',
        name: 'Biologisches Alter',
        desc: () => 'Epigenetische Uhren (DunedinPACE & GrimAge v2), die deine echte Alterungsgeschwindigkeit und dein biologisches Alter messen. Messbar und veränderbar.',
        link: '/bioage',
        cta: 'Mehr erfahren →',
      },
      {
        icon: '🏥',
        name: 'Klinische Assessments',
        desc: () => 'VO₂max, DEXA-Körperscan und Vitalcheck – körperliche Messungen, die zeigen, was Blut nicht kann: Fitnesslevel, Körperzusammensetzung, Gefässgesundheit.',
        link: '/assessments',
        cta: 'Zur Übersicht →',
      },
    ],
    engineHeading: 'Wie alles zusammenkommt',
    engineSub: 'Alle deine Testergebnisse fliessen automatisch in den Health Engine ein.',
    engineSteps: [
      { title: 'Biomarker-Ergebnisse', body: 'Deine Bluttestergebnisse werden ins Dashboard importiert und berechnet.' },
      { title: '8 Gesundheitsdomänen', body: 'Herz & Gefässe, Stoffwechsel, Entzündung, Organfunktion, Nährstoffe, Hormone, Körperzusammensetzung, Fitness.' },
      { title: 'Gesamtscore', body: 'Gewichteter Score 0–100. Zeigt dir auf einen Blick, wo du heute stehst.' },
    ],
    engineCta: 'Health Dashboard öffnen →',
  },
  en: {
    tag: 'YOUR HEALTH',
    h1: 'Understand your body.',
    sub: 'Three pillars of longevity diagnostics — from blood biomarkers to epigenetic clocks.',
    pillarsHeading: 'Three pillars',
    pillars: [
      {
        icon: '🩸',
        name: 'Blood Biomarkers',
        desc: (n) => `${n} blood markers across 6 domains: heart & vessels, metabolism, inflammation, organ function, nutrients, and hormones. The foundation of any longevity protocol.`,
        link: '/biomarkers',
        cta: 'All biomarkers →',
      },
      {
        icon: '🧬',
        name: 'Biological Age',
        desc: () => 'Epigenetic clocks (DunedinPACE & GrimAge v2) measuring your true aging speed and biological age. Measurable and changeable.',
        link: '/bioage',
        cta: 'Learn more →',
      },
      {
        icon: '🏥',
        name: 'Clinical Assessments',
        desc: () => 'VO₂max, DEXA body scan, and vitalcheck — physical measurements that reveal what blood tests can\'t: fitness level, body composition, vascular health.',
        link: '/assessments',
        cta: 'See all assessments →',
      },
    ],
    engineHeading: 'How it all comes together',
    engineSub: 'All your test results feed automatically into the Health Engine.',
    engineSteps: [
      { title: 'Biomarker results', body: 'Your blood test results are imported and calculated in your dashboard.' },
      { title: '8 health domains', body: 'Heart & vessels, metabolism, inflammation, organ function, nutrients, hormones, body composition, fitness.' },
      { title: 'Overall score', body: 'Weighted score 0–100. Shows you at a glance where you stand today.' },
    ],
    engineCta: 'Open Health Dashboard →',
  },
  fr: {
    tag: 'VOTRE SANTÉ',
    h1: 'Comprendre votre corps.',
    sub: 'Trois piliers de la diagnostique de longévité — des biomarqueurs sanguins aux horloges épigénétiques.',
    pillarsHeading: 'Trois piliers',
    pillars: [
      {
        icon: '🩸',
        name: 'Biomarqueurs sanguins',
        desc: (n) => `${n} marqueurs sanguins sur 6 domaines: cœur & vaisseaux, métabolisme, inflammation, fonction organique, nutriments et hormones.`,
        link: '/biomarkers',
        cta: 'Tous les biomarqueurs →',
      },
      {
        icon: '🧬',
        name: 'Âge biologique',
        desc: () => 'Horloges épigénétiques (DunedinPACE & GrimAge v2) mesurant votre vitesse de vieillissement réelle et votre âge biologique. Mesurable et modifiable.',
        link: '/bioage',
        cta: 'En savoir plus →',
      },
      {
        icon: '🏥',
        name: 'Évaluations cliniques',
        desc: () => 'VO₂max, scan corporel DEXA et bilan de vitalité — mesures physiques révélant ce que les analyses sanguines ne peuvent pas: condition physique, composition corporelle.',
        link: '/assessments',
        cta: 'Voir toutes les évaluations →',
      },
    ],
    engineHeading: 'Comment tout se relie',
    engineSub: 'Tous vos résultats de tests alimentent automatiquement le Health Engine.',
    engineSteps: [
      { title: 'Résultats des biomarqueurs', body: 'Vos résultats d\'analyses sanguines sont importés et calculés dans votre tableau de bord.' },
      { title: '8 domaines de santé', body: 'Cœur & vaisseaux, métabolisme, inflammation, fonction organique, nutriments, hormones, composition corporelle, forme.' },
      { title: 'Score global', body: 'Score pondéré 0-100. Vous montre en un coup d\'œil où vous en êtes aujourd\'hui.' },
    ],
    engineCta: 'Ouvrir le tableau de bord →',
  },
  es: {
    tag: 'TU SALUD',
    h1: 'Entiende tu cuerpo.',
    sub: 'Tres pilares de la diagnóstica de longevidad — desde biomarcadores en sangre hasta relojes epigenéticos.',
    pillarsHeading: 'Tres pilares',
    pillars: [
      {
        icon: '🩸',
        name: 'Biomarcadores en sangre',
        desc: (n) => `${n} marcadores en sangre en 6 dominios: corazón & vasos, metabolismo, inflamación, función orgánica, nutrientes y hormonas.`,
        link: '/biomarkers',
        cta: 'Todos los biomarcadores →',
      },
      {
        icon: '🧬',
        name: 'Edad biológica',
        desc: () => 'Relojes epigenéticos (DunedinPACE & GrimAge v2) que miden tu velocidad de envejecimiento real y tu edad biológica. Medible y modificable.',
        link: '/bioage',
        cta: 'Saber más →',
      },
      {
        icon: '🏥',
        name: 'Evaluaciones clínicas',
        desc: () => 'VO₂max, escáner corporal DEXA y vitalcheck — mediciones físicas que revelan lo que la sangre no puede: nivel de forma física, composición corporal.',
        link: '/assessments',
        cta: 'Ver todas las evaluaciones →',
      },
    ],
    engineHeading: 'Cómo encaja todo',
    engineSub: 'Todos tus resultados de pruebas se incorporan automáticamente al Health Engine.',
    engineSteps: [
      { title: 'Resultados de biomarcadores', body: 'Tus resultados de análisis de sangre se importan y calculan en tu panel.' },
      { title: '8 dominios de salud', body: 'Corazón & vasos, metabolismo, inflamación, función orgánica, nutrientes, hormonas, composición corporal, forma física.' },
      { title: 'Puntuación global', body: 'Puntuación ponderada 0-100. Te muestra de un vistazo dónde estás hoy.' },
    ],
    engineCta: 'Abrir panel de salud →',
  },
  it: {
    tag: 'LA TUA SALUTE',
    h1: 'Comprendi il tuo corpo.',
    sub: 'Tre pilastri della diagnostica della longevità — dai biomarcatori nel sangue agli orologi epigenetici.',
    pillarsHeading: 'Tre pilastri',
    pillars: [
      {
        icon: '🩸',
        name: 'Biomarcatori nel sangue',
        desc: (n) => `${n} marcatori nel sangue su 6 domini: cuore & vasi, metabolismo, infiammazione, funzione organica, nutrienti e ormoni.`,
        link: '/biomarkers',
        cta: 'Tutti i biomarcatori →',
      },
      {
        icon: '🧬',
        name: 'Età biologica',
        desc: () => 'Orologi epigenetici (DunedinPACE & GrimAge v2) che misurano la tua vera velocità di invecchiamento e la tua età biologica. Misurabile e modificabile.',
        link: '/bioage',
        cta: 'Scopri di più →',
      },
      {
        icon: '🏥',
        name: 'Valutazioni cliniche',
        desc: () => 'VO₂max, scansione corporea DEXA e vitalcheck — misurazioni fisiche che rivelano ciò che il sangue non può: livello di forma fisica, composizione corporea.',
        link: '/assessments',
        cta: 'Vedi tutte le valutazioni →',
      },
    ],
    engineHeading: 'Come si unisce tutto',
    engineSub: 'Tutti i tuoi risultati dei test vengono alimentati automaticamente nell\'Health Engine.',
    engineSteps: [
      { title: 'Risultati dei biomarcatori', body: 'I tuoi risultati degli esami del sangue vengono importati e calcolati nel tuo cruscotto.' },
      { title: '8 domini di salute', body: 'Cuore & vasi, metabolismo, infiammazione, funzione organica, nutrienti, ormoni, composizione corporea, forma fisica.' },
      { title: 'Punteggio complessivo', body: 'Punteggio ponderato 0-100. Ti mostra a colpo d\'occhio dove ti trovi oggi.' },
    ],
    engineCta: 'Apri il cruscotto della salute →',
  },
};

export default async function HealthPage() {
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';
  const t = T[lang];

  const supabase = await createClient();
  const { data: completePkg } = await supabase
    .from('products')
    .select('id')
    .eq('slug', 'longevity-complete')
    .single();
  const { count: itemCount } = completePkg
    ? await supabase
        .from('product_biomarkers')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', completePkg.id)
    : { count: null };
  const biomarkerCount = itemCount ?? 36;

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <main className="mx-auto w-full max-w-[1060px] px-6 pt-28 pb-16 flex-1">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <div className="mb-16 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84]">{t.tag}</p>
          <h1 className="font-serif text-5xl text-[#0e393d] mb-4 leading-tight">{t.h1}</h1>
          <p className="mx-auto max-w-xl text-base text-[#1c2a2b]/60 leading-relaxed">{t.sub}</p>
        </div>

        {/* ── Three pillars ─────────────────────────────────────────────────── */}
        <section className="mb-20">
          <div className="mb-8 flex items-center gap-4">
            <h2 className="font-serif text-2xl text-[#0e393d]">{t.pillarsHeading}</h2>
            <div className="flex-1 h-px bg-[#0e393d]/10" />
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {t.pillars.map((pillar) => (
              <Link
                key={pillar.link}
                href={pillar.link}
                className="group flex flex-col rounded-2xl bg-white ring-1 ring-[#0e393d]/8 p-8 hover:shadow-md hover:ring-[#0e393d]/20 transition-all"
              >
                <div className="text-4xl mb-5">{pillar.icon}</div>
                <h3 className="font-serif text-xl text-[#0e393d] mb-3 group-hover:text-[#0e393d]">
                  {pillar.name}
                </h3>
                <p className="text-sm text-[#1c2a2b]/60 leading-relaxed flex-1 mb-5">
                  {pillar.desc(biomarkerCount)}
                </p>
                <span className="text-sm font-medium text-[#ceab84] group-hover:text-[#ceab84]/80 transition-colors">
                  {pillar.cta}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Health Engine ─────────────────────────────────────────────────── */}
        <section className="rounded-2xl bg-[#0e393d] p-10 sm:p-12">
          <h2 className="font-serif text-2xl text-white mb-2">{t.engineHeading}</h2>
          <p className="text-white/50 text-sm mb-10">{t.engineSub}</p>

          <div className="grid gap-6 sm:grid-cols-3 mb-10">
            {t.engineSteps.map((step, i) => (
              <div key={i} className="flex gap-4">
                <div className="shrink-0 w-8 h-8 rounded-full bg-[#ceab84]/20 flex items-center justify-center text-sm font-semibold text-[#ceab84]">
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-medium text-sm text-white mb-1">{step.title}</h3>
                  <p className="text-xs text-white/50 leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/health-engine"
            className="inline-block bg-[#ceab84] text-[#0e393d] font-semibold px-7 py-3 rounded-full text-sm hover:bg-[#ceab84]/90 transition-colors"
          >
            {t.engineCta}
          </Link>
        </section>

      </main>

      <PublicFooter />
    </div>
  );
}
