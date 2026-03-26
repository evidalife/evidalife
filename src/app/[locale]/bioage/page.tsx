import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Biological Age Testing – Evida Life' };

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = (typeof VALID_LANGS)[number];

const T: Record<Lang, {
  tag: string;
  h1: string;
  sub: string;
  whatIsTitle: string;
  whatIs: string;
  testsHeading: string;
  howWorksHeading: string;
  steps: { title: string; body: string }[];
  whyMattersHeading: string;
  whyMatters: string;
  ctaHeading: string;
  ctaBody: string;
  ctaBtn: string;
  price: string;
  badges: string[];
  dunedin: { name: string; tag: string; desc: string; details: string[]; badge: string };
  grimage: { name: string; tag: string; desc: string; details: string[]; badge: string };
}> = {
  de: {
    tag: 'EPIGENETISCHE TESTS',
    h1: 'Wie schnell alterst du?',
    sub: 'Dein biologisches Alter ist nicht dasselbe wie dein Geburtsalter. Epigenetische Tests messen, wie schnell dein Körper wirklich altert – und ob deine Interventionen wirken.',
    whatIsTitle: 'Was ist biologisches Alter?',
    whatIs: 'Dein chronologisches Alter zählt Geburtstage. Dein biologisches Alter misst den Zustand deiner Zellen, DNA-Methylierungsmuster und Entzündungsmarker. Menschen mit gleichem Geburtsalter können biologisch 10–20 Jahre auseinanderliegen. Das ist veränderbar.',
    testsHeading: 'Die zwei Tests',
    howWorksHeading: 'Wie es funktioniert',
    steps: [
      { title: 'Blutentnahme beim Partnerlabor', body: 'Eine einfache Blutabnahme bei einem unserer zertifizierten Partnerlabore in der Schweiz und Deutschland.' },
      { title: 'DNA-Methylierungsanalyse', body: 'Dein Blut wird auf Methylierungsmuster an Tausenden von CpG-Stellen analysiert – ein hochpräzises molekulares Profil deiner Alterung.' },
      { title: 'Ergebnisse im Health Dashboard', body: 'Dein DunedinPACE-Score und dein biologisches Alter erscheinen direkt in deinem Evida Life Profil. Verfolge Veränderungen über Zeit.' },
    ],
    whyMattersHeading: 'Warum es für Longevity wichtig ist',
    whyMatters: 'Epigenetische Uhren sind heute die präzisesten Biomarker für Alterung und Mortalitätsrisiko. Studien zeigen, dass ein erhöhtes DunedinPACE mit höherem Risiko für Herzerkrankungen, Demenz und vorzeitigen Tod korreliert – unabhängig von anderen Risikofaktoren. Wer seine Interventionen (Ernährung, Bewegung, Schlaf, Stressreduktion) systematisch verfolgt, kann seinen Pace senken und sein biologisches Alter um Jahre reduzieren.',
    ctaHeading: 'Kenne dein biologisches Alter',
    ctaBody: 'Einmalige Messung für CHF 349. Wiederholen nach 6–12 Monaten, um Interventionen zu messen.',
    ctaBtn: 'Jetzt testen',
    price: 'CHF 349',
    badges: ['Bluttest', 'Laboranalyse', '2–3 Wochen'],
    dunedin: {
      name: 'DunedinPACE',
      tag: 'Alterungsgeschwindigkeit',
      desc: 'Misst, wie schnell du JETZT alterst. Ein Score von 1.0 = durchschnittliche Alterungsgeschwindigkeit. Score < 0.9 = du alterst langsamer als der Durchschnitt.',
      details: [
        'Score < 0.9 — optimal (langsamer als normal)',
        'Score 0.9–1.1 — durchschnittlich',
        'Score > 1.1 — beschleunigt (Handlungsbedarf)',
        'Messbar und veränderbar durch Lebensstil',
        'Ideal zur Interventionskontrolle (jährlich messen)',
      ],
      badge: 'Empfohlen für Tracking',
    },
    grimage: {
      name: 'GrimAge v2',
      tag: 'Biologisches Alter & Mortalitätsrisiko',
      desc: 'Schätzt dein biologisches Alter und Mortalitätsrisiko. Jünger als dein Kalenderalter = besser. Eine der am besten validierten epigenetischen Uhren.',
      details: [
        'Gibt dein biologisches Alter in Jahren an',
        'Prognostiziert Mortalitätsrisiko (validiert in Langzeitstudien)',
        'Klinisch bedeutsam: jedes Jahr biologisch jünger = Risikoreduktion',
        'Erkennt frühzeitig Alterungsbeschleunigung',
        'Benchmark für Longevity-Interventionen',
      ],
      badge: 'Höchste klinische Validierung',
    },
  },
  en: {
    tag: 'EPIGENETIC TESTING',
    h1: 'How fast are you aging?',
    sub: 'Your biological age is not the same as your chronological age. Epigenetic tests measure how fast your body is really aging – and whether your interventions are working.',
    whatIsTitle: 'What is biological age?',
    whatIs: 'Your chronological age counts birthdays. Your biological age measures the state of your cells, DNA methylation patterns, and inflammation markers. People with the same birth year can differ by 10–20 biological years. And it\'s changeable.',
    testsHeading: 'The two tests',
    howWorksHeading: 'How it works',
    steps: [
      { title: 'Blood draw at partner lab', body: 'A simple blood draw at one of our certified partner labs in Switzerland and Germany.' },
      { title: 'DNA methylation analysis', body: 'Your blood is analysed for methylation patterns at thousands of CpG sites – a high-precision molecular profile of your aging.' },
      { title: 'Results in your Health Dashboard', body: 'Your DunedinPACE score and biological age appear directly in your Evida Life profile. Track changes over time.' },
    ],
    whyMattersHeading: 'Why it matters for longevity',
    whyMatters: 'Epigenetic clocks are today\'s most precise biomarkers for aging and mortality risk. Studies show that elevated DunedinPACE correlates with higher risk of heart disease, dementia, and premature death – independent of other risk factors. Those who systematically track their interventions (nutrition, exercise, sleep, stress reduction) can lower their pace and reduce their biological age by years.',
    ctaHeading: 'Know your biological age',
    ctaBody: 'One-time measurement for CHF 349. Repeat after 6–12 months to measure interventions.',
    ctaBtn: 'Get tested now',
    price: 'CHF 349',
    badges: ['Blood test', 'Lab analysis', '2–3 weeks'],
    dunedin: {
      name: 'DunedinPACE',
      tag: 'Aging speed',
      desc: 'Measures how fast you\'re aging RIGHT NOW. A score of 1.0 = average aging speed. Score < 0.9 = you\'re aging slower than average.',
      details: [
        'Score < 0.9 — optimal (slower than average)',
        'Score 0.9–1.1 — average',
        'Score > 1.1 — accelerated (action needed)',
        'Measurable and changeable through lifestyle',
        'Ideal for intervention tracking (measure annually)',
      ],
      badge: 'Recommended for tracking',
    },
    grimage: {
      name: 'GrimAge v2',
      tag: 'Biological age & mortality risk',
      desc: 'Estimates your biological age and mortality risk. Younger than your calendar age = better. One of the most validated epigenetic clocks.',
      details: [
        'Reports your biological age in years',
        'Predicts mortality risk (validated in long-term studies)',
        'Clinically meaningful: every biological year younger = risk reduction',
        'Early detection of accelerated aging',
        'Benchmark for longevity interventions',
      ],
      badge: 'Highest clinical validation',
    },
  },
  fr: {
    tag: 'TESTS ÉPIGÉNÉTIQUES',
    h1: 'À quelle vitesse vieillissez-vous ?',
    sub: 'Votre âge biologique n\'est pas le même que votre âge chronologique. Les tests épigénétiques mesurent à quelle vitesse votre corps vieillit réellement – et si vos interventions fonctionnent.',
    whatIsTitle: 'Qu\'est-ce que l\'âge biologique ?',
    whatIs: 'Votre âge chronologique compte les anniversaires. Votre âge biologique mesure l\'état de vos cellules, les profils de méthylation de l\'ADN et les marqueurs inflammatoires. Des personnes du même âge de naissance peuvent différer de 10 à 20 ans biologiquement. Et c\'est modifiable.',
    testsHeading: 'Les deux tests',
    howWorksHeading: 'Comment ça fonctionne',
    steps: [
      { title: 'Prise de sang au laboratoire partenaire', body: 'Une simple prise de sang dans l\'un de nos laboratoires partenaires certifiés en Suisse et en Allemagne.' },
      { title: 'Analyse de la méthylation de l\'ADN', body: 'Votre sang est analysé pour des profils de méthylation à des milliers de sites CpG – un profil moléculaire haute précision de votre vieillissement.' },
      { title: 'Résultats dans votre tableau de bord', body: 'Votre score DunedinPACE et votre âge biologique apparaissent directement dans votre profil Evida Life. Suivez les changements dans le temps.' },
    ],
    whyMattersHeading: 'Pourquoi c\'est important pour la longévité',
    whyMatters: 'Les horloges épigénétiques sont les biomarqueurs les plus précis aujourd\'hui pour le vieillissement et le risque de mortalité. Des études montrent qu\'un DunedinPACE élevé est corrélé à un risque plus élevé de maladies cardiaques, de démence et de mort prématurée. Ceux qui suivent systématiquement leurs interventions peuvent abaisser leur rythme et réduire leur âge biologique de plusieurs années.',
    ctaHeading: 'Connaissez votre âge biologique',
    ctaBody: 'Mesure unique pour CHF 349. À répéter après 6–12 mois pour mesurer les interventions.',
    ctaBtn: 'Se faire tester maintenant',
    price: 'CHF 349',
    badges: ['Prise de sang', 'Analyse en laboratoire', '2–3 semaines'],
    dunedin: {
      name: 'DunedinPACE',
      tag: 'Vitesse de vieillissement',
      desc: 'Mesure à quelle vitesse vous vieillissez EN CE MOMENT. Score 1.0 = vitesse de vieillissement moyenne. Score < 0.9 = vous vieillissez plus lentement que la moyenne.',
      details: [
        'Score < 0.9 — optimal (plus lent que la normale)',
        'Score 0.9–1.1 — dans la moyenne',
        'Score > 1.1 — accéléré (action requise)',
        'Mesurable et modifiable par le mode de vie',
        'Idéal pour le suivi des interventions (mesure annuelle)',
      ],
      badge: 'Recommandé pour le suivi',
    },
    grimage: {
      name: 'GrimAge v2',
      tag: 'Âge biologique & risque de mortalité',
      desc: 'Estime votre âge biologique et votre risque de mortalité. Plus jeune que votre âge calendaire = mieux. L\'une des horloges épigénétiques les plus validées.',
      details: [
        'Indique votre âge biologique en années',
        'Prédit le risque de mortalité (validé dans des études à long terme)',
        'Cliniquement significatif : chaque année biologiquement plus jeune = réduction du risque',
        'Détection précoce du vieillissement accéléré',
        'Référence pour les interventions de longévité',
      ],
      badge: 'Validation clinique la plus élevée',
    },
  },
  es: {
    tag: 'PRUEBAS EPIGENÉTICAS',
    h1: '¿A qué velocidad estás envejeciendo?',
    sub: 'Tu edad biológica no es lo mismo que tu edad cronológica. Las pruebas epigenéticas miden a qué velocidad envejece realmente tu cuerpo y si tus intervenciones están funcionando.',
    whatIsTitle: '¿Qué es la edad biológica?',
    whatIs: 'Tu edad cronológica cuenta cumpleaños. Tu edad biológica mide el estado de tus células, los patrones de metilación del ADN y los marcadores inflamatorios. Personas de la misma fecha de nacimiento pueden diferir 10-20 años biológicamente. Y es modificable.',
    testsHeading: 'Las dos pruebas',
    howWorksHeading: 'Cómo funciona',
    steps: [
      { title: 'Extracción de sangre en laboratorio asociado', body: 'Una simple extracción de sangre en uno de nuestros laboratorios asociados certificados en Suiza y Alemania.' },
      { title: 'Análisis de metilación del ADN', body: 'Tu sangre se analiza en busca de patrones de metilación en miles de sitios CpG – un perfil molecular de alta precisión de tu envejecimiento.' },
      { title: 'Resultados en tu panel de salud', body: 'Tu puntuación DunedinPACE y tu edad biológica aparecen directamente en tu perfil de Evida Life. Sigue los cambios a lo largo del tiempo.' },
    ],
    whyMattersHeading: 'Por qué importa para la longevidad',
    whyMatters: 'Los relojes epigenéticos son hoy los biomarcadores más precisos para el envejecimiento y el riesgo de mortalidad. Los estudios muestran que un DunedinPACE elevado se correlaciona con mayor riesgo de enfermedades cardíacas, demencia y muerte prematura. Quienes realizan un seguimiento sistemático de sus intervenciones pueden reducir su ritmo de envejecimiento y su edad biológica en años.',
    ctaHeading: 'Conoce tu edad biológica',
    ctaBody: 'Medición única por CHF 349. Repetir después de 6–12 meses para medir intervenciones.',
    ctaBtn: 'Hacerse la prueba ahora',
    price: 'CHF 349',
    badges: ['Análisis de sangre', 'Análisis de laboratorio', '2–3 semanas'],
    dunedin: {
      name: 'DunedinPACE',
      tag: 'Velocidad de envejecimiento',
      desc: 'Mide qué tan rápido estás envejeciendo AHORA MISMO. Una puntuación de 1.0 = velocidad de envejecimiento promedio. Puntuación < 0.9 = estás envejeciendo más lento que el promedio.',
      details: [
        'Puntuación < 0.9 — óptimo (más lento que lo normal)',
        'Puntuación 0.9–1.1 — promedio',
        'Puntuación > 1.1 — acelerado (acción necesaria)',
        'Medible y modificable a través del estilo de vida',
        'Ideal para el seguimiento de intervenciones (medir anualmente)',
      ],
      badge: 'Recomendado para seguimiento',
    },
    grimage: {
      name: 'GrimAge v2',
      tag: 'Edad biológica & riesgo de mortalidad',
      desc: 'Estima tu edad biológica y riesgo de mortalidad. Más joven que tu edad calendario = mejor. Uno de los relojes epigenéticos más validados.',
      details: [
        'Indica tu edad biológica en años',
        'Predice el riesgo de mortalidad (validado en estudios a largo plazo)',
        'Clínicamente significativo: cada año biológicamente más joven = reducción del riesgo',
        'Detección temprana del envejecimiento acelerado',
        'Referencia para intervenciones de longevidad',
      ],
      badge: 'Mayor validación clínica',
    },
  },
  it: {
    tag: 'TEST EPIGENETICI',
    h1: 'Quanto velocemente stai invecchiando?',
    sub: 'La tua età biologica non è uguale alla tua età cronologica. I test epigenetici misurano quanto velocemente il tuo corpo sta davvero invecchiando e se i tuoi interventi stanno funzionando.',
    whatIsTitle: 'Cos\'è l\'età biologica?',
    whatIs: 'La tua età cronologica conta i compleanni. La tua età biologica misura lo stato delle tue cellule, i modelli di metilazione del DNA e i marcatori infiammatori. Persone della stessa età anagrafica possono differire di 10-20 anni biologicamente. Ed è modificabile.',
    testsHeading: 'I due test',
    howWorksHeading: 'Come funziona',
    steps: [
      { title: 'Prelievo del sangue al laboratorio partner', body: 'Un semplice prelievo del sangue presso uno dei nostri laboratori partner certificati in Svizzera e Germania.' },
      { title: 'Analisi della metilazione del DNA', body: 'Il tuo sangue viene analizzato per i modelli di metilazione in migliaia di siti CpG – un profilo molecolare ad alta precisione del tuo invecchiamento.' },
      { title: 'Risultati nel tuo cruscotto della salute', body: 'Il tuo punteggio DunedinPACE e la tua età biologica appaiono direttamente nel tuo profilo Evida Life. Traccia i cambiamenti nel tempo.' },
    ],
    whyMattersHeading: 'Perché è importante per la longevità',
    whyMatters: 'Gli orologi epigenetici sono oggi i biomarcatori più precisi per l\'invecchiamento e il rischio di mortalità. Gli studi mostrano che un DunedinPACE elevato si correla con un rischio più elevato di malattie cardiache, demenza e morte prematura. Chi monitora sistematicamente i propri interventi può abbassare il proprio ritmo e ridurre la propria età biologica di anni.',
    ctaHeading: 'Conosci la tua età biologica',
    ctaBody: 'Misurazione unica per CHF 349. Da ripetere dopo 6-12 mesi per misurare gli interventi.',
    ctaBtn: 'Fai il test ora',
    price: 'CHF 349',
    badges: ['Esame del sangue', 'Analisi di laboratorio', '2-3 settimane'],
    dunedin: {
      name: 'DunedinPACE',
      tag: 'Velocità di invecchiamento',
      desc: 'Misura quanto velocemente stai invecchiando ADESSO. Un punteggio di 1.0 = velocità di invecchiamento media. Punteggio < 0.9 = stai invecchiando più lentamente della media.',
      details: [
        'Punteggio < 0.9 — ottimale (più lento del normale)',
        'Punteggio 0.9–1.1 — nella media',
        'Punteggio > 1.1 — accelerato (azione necessaria)',
        'Misurabile e modificabile attraverso lo stile di vita',
        'Ideale per il monitoraggio degli interventi (misurare annualmente)',
      ],
      badge: 'Consigliato per il monitoraggio',
    },
    grimage: {
      name: 'GrimAge v2',
      tag: 'Età biologica & rischio di mortalità',
      desc: 'Stima la tua età biologica e il rischio di mortalità. Più giovane della tua età anagrafica = meglio. Uno degli orologi epigenetici più validati.',
      details: [
        'Riporta la tua età biologica in anni',
        'Predice il rischio di mortalità (validato in studi a lungo termine)',
        'Clinicamente significativo: ogni anno biologicamente più giovane = riduzione del rischio',
        'Rilevamento precoce dell\'invecchiamento accelerato',
        'Riferimento per gli interventi di longevità',
      ],
      badge: 'Massima validazione clinica',
    },
  },
};

function CheckItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2 text-sm text-[#1c2a2b]/70">
      <svg className="mt-0.5 shrink-0 text-emerald-500" width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2.5 7l3 3L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {text}
    </li>
  );
}

export default async function BioAgePage() {
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';
  const t = T[lang];

  // Fetch the BioAge product for price/link
  const supabase = await createClient();
  const { data: bioageProd } = await supabase
    .from('products')
    .select('slug, price_chf')
    .eq('slug', 'addon-biological-age')
    .eq('is_active', true)
    .single();

  const shopSlug = bioageProd?.slug ?? 'addon-biological-age';

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <main className="mx-auto w-full max-w-[1060px] px-6 pt-28 pb-16 flex-1">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div className="mb-16 text-center max-w-2xl mx-auto">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84]">{t.tag}</p>
          <h1 className="font-serif text-5xl text-[#0e393d] mb-4 leading-tight">{t.h1}</h1>
          <p className="text-base text-[#1c2a2b]/60 leading-relaxed">{t.sub}</p>
          <div className="flex items-center justify-center gap-3 mt-6">
            {t.badges.map((b) => (
              <span key={b} className="inline-flex items-center rounded-full bg-[#ceab84]/15 px-3 py-1 text-xs font-medium text-[#8a6a3e]">
                {b}
              </span>
            ))}
          </div>
        </div>

        {/* ── What is biological age ─────────────────────────────────────── */}
        <section className="mb-16 rounded-2xl bg-[#0e393d] text-white p-10 sm:p-12">
          <h2 className="font-serif text-2xl text-[#ceab84] mb-4">{t.whatIsTitle}</h2>
          <p className="text-white/75 leading-relaxed text-base max-w-3xl">{t.whatIs}</p>
        </section>

        {/* ── Two test cards ─────────────────────────────────────────────── */}
        <section className="mb-16">
          <h2 className="font-serif text-2xl text-[#0e393d] mb-6">{t.testsHeading}</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {/* DunedinPACE */}
            <div className="rounded-2xl bg-white ring-1 ring-[#0e393d]/10 p-8 flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#ceab84] mb-1">
                    {t.dunedin.tag}
                  </p>
                  <h3 className="font-serif text-2xl text-[#0e393d]">{t.dunedin.name}</h3>
                </div>
                <span className="shrink-0 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 px-2.5 py-1">
                  {t.dunedin.badge}
                </span>
              </div>
              <p className="text-sm text-[#1c2a2b]/65 leading-relaxed mb-5">{t.dunedin.desc}</p>
              <ul className="space-y-2 flex-1">
                {t.dunedin.details.map((d) => <CheckItem key={d} text={d} />)}
              </ul>
            </div>

            {/* GrimAge v2 */}
            <div className="rounded-2xl bg-white ring-1 ring-[#0e393d]/10 p-8 flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#ceab84] mb-1">
                    {t.grimage.tag}
                  </p>
                  <h3 className="font-serif text-2xl text-[#0e393d]">{t.grimage.name}</h3>
                </div>
                <span className="shrink-0 text-[10px] font-semibold rounded-full bg-[#ceab84]/15 text-[#8a6a3e] ring-1 ring-[#ceab84]/30 px-2.5 py-1">
                  {t.grimage.badge}
                </span>
              </div>
              <p className="text-sm text-[#1c2a2b]/65 leading-relaxed mb-5">{t.grimage.desc}</p>
              <ul className="space-y-2 flex-1">
                {t.grimage.details.map((d) => <CheckItem key={d} text={d} />)}
              </ul>
            </div>
          </div>
        </section>

        {/* ── How it works ───────────────────────────────────────────────── */}
        <section className="mb-16">
          <h2 className="font-serif text-2xl text-[#0e393d] mb-8">{t.howWorksHeading}</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {t.steps.map((step, i) => (
              <div key={i} className="flex gap-4">
                <div className="shrink-0 w-8 h-8 rounded-full bg-[#ceab84]/20 flex items-center justify-center text-sm font-semibold text-[#ceab84]">
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-medium text-sm text-[#0e393d] mb-1">{step.title}</h3>
                  <p className="text-sm text-[#1c2a2b]/55 leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Why it matters ─────────────────────────────────────────────── */}
        <section className="mb-16 rounded-2xl bg-[#ceab84]/10 p-8 sm:p-10">
          <h2 className="font-serif text-xl text-[#0e393d] mb-3">{t.whyMattersHeading}</h2>
          <p className="text-[#1c2a2b]/70 leading-relaxed text-sm max-w-3xl">{t.whyMatters}</p>
        </section>

        {/* ── CTA ────────────────────────────────────────────────────────── */}
        <section className="rounded-2xl bg-[#0e393d] p-10 sm:p-12 text-center">
          <h2 className="font-serif text-3xl text-white mb-3">{t.ctaHeading}</h2>
          <p className="text-white/60 text-sm mb-2">{t.ctaBody}</p>
          <p className="font-serif text-2xl text-[#ceab84] mb-8">{t.price}</p>
          <Link
            href={`/shop/${shopSlug}`}
            className="inline-block bg-[#ceab84] text-[#0e393d] font-semibold px-8 py-3.5 rounded-full text-sm hover:bg-[#ceab84]/90 transition-colors"
          >
            {t.ctaBtn}
          </Link>
        </section>

      </main>

      <PublicFooter />
    </div>
  );
}
