import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import HealthEngineContent from '@/components/health/HealthEngineContent';
import { createClient } from '@/lib/supabase/server';
import { computeHealthScore } from '@/lib/health-score';

export const metadata = { title: 'Health Engine – Evida Life' };

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];

// ─── Public page translations ──────────────────────────────────────────────────
const T: Record<Lang, {
  tag: string;
  title: string;
  sub: string;
  howHeading: string;
  steps: { n: string; title: string; desc: string }[];
  domainsHeading: string;
  diffHeading: string;
  diffNormalLabel: string;
  diffNormalDesc: string;
  diffOptimalLabel: string;
  diffOptimalDesc: string;
  diffExample: string;
  ctaTitle: string;
  ctaShop: string;
  ctaLogin: string;
}> = {
  en: {
    tag: 'HEALTH ENGINE',
    title: 'Your personal longevity score.',
    sub: 'All your health data in one place — blood biomarkers, clinical assessments, and epigenetic age combined into a single, actionable score.',
    howHeading: 'How it works',
    steps: [
      { n: '01', title: 'Test', desc: 'Order a blood test package. Our partner labs analyse 15–36 biomarkers across 6 health domains.' },
      { n: '02', title: 'Score', desc: 'Your results feed into the Health Engine. Each biomarker is scored against optimal ranges — not just normal ranges.' },
      { n: '03', title: 'Track', desc: 'Your Longevity Score updates with every new test. See trends over time, identify weak spots, and measure improvement.' },
    ],
    domainsHeading: '8 Health Domains',
    diffHeading: 'What we measure differently',
    diffNormalLabel: 'Normal ranges',
    diffNormalDesc: 'What most labs use. Defined as the 95th percentile of the general population — effectively "not sick".',
    diffOptimalLabel: 'Optimal ranges',
    diffOptimalDesc: 'What we use. Ranges associated with the lowest disease risk and longest healthspan — "thriving, not just surviving".',
    diffExample: 'Example: A normal HbA1c is below 5.7%. Our optimal target is below 5.0% — the range linked to the lowest cardiovascular risk.',
    ctaTitle: 'See where you stand.',
    ctaShop: 'Get your first blood test',
    ctaLogin: 'Already tested? Log in',
  },
  de: {
    tag: 'HEALTH ENGINE',
    title: 'Dein persönlicher Longevity Score.',
    sub: 'Alle deine Gesundheitsdaten an einem Ort — Blut-Biomarker, klinische Assessments und epigenetisches Alter zu einem einzigen, umsetzbaren Score kombiniert.',
    howHeading: 'So funktioniert es',
    steps: [
      { n: '01', title: 'Testen', desc: 'Bestelle ein Bluttest-Paket. Unsere Partnerlabore analysieren 15–36 Biomarker in 6 Gesundheitsdomänen.' },
      { n: '02', title: 'Bewerten', desc: 'Deine Ergebnisse fließen in die Health Engine ein. Jeder Biomarker wird gegen optimale Referenzwerte bewertet — nicht nur normale.' },
      { n: '03', title: 'Tracken', desc: 'Dein Longevity Score aktualisiert sich mit jedem neuen Test. Sieh Trends im Zeitverlauf, erkenne Schwachstellen und messe Verbesserungen.' },
    ],
    domainsHeading: '8 Gesundheitsdomänen',
    diffHeading: 'Was wir anders messen',
    diffNormalLabel: 'Normalwerte',
    diffNormalDesc: 'Was die meisten Labore verwenden. Definiert als das 95. Perzentil der Allgemeinbevölkerung — also effektiv "nicht krank".',
    diffOptimalLabel: 'Optimalwerte',
    diffOptimalDesc: 'Was wir verwenden. Bereiche, die mit dem niedrigsten Krankheitsrisiko und der längsten Gesundheitsspanne assoziiert sind — "gedeihen, nicht nur überleben".',
    diffExample: 'Beispiel: Ein normaler HbA1c-Wert liegt unter 5,7 %. Unser optimaler Zielwert liegt unter 5,0 % — der Bereich mit dem niedrigsten kardiovaskulären Risiko.',
    ctaTitle: 'Sieh, wo du stehst.',
    ctaShop: 'Ersten Bluttest bestellen',
    ctaLogin: 'Bereits getestet? Einloggen',
  },
  fr: {
    tag: 'HEALTH ENGINE',
    title: 'Votre score de longévité personnel.',
    sub: 'Toutes vos données de santé en un seul endroit — biomarqueurs sanguins, évaluations cliniques et âge épigénétique combinés en un score unique et exploitable.',
    howHeading: 'Comment ça marche',
    steps: [
      { n: '01', title: 'Tester', desc: "Commandez un test sanguin. Nos laboratoires partenaires analysent 15 à 36 biomarqueurs dans 6 domaines de santé." },
      { n: '02', title: 'Évaluer', desc: "Vos résultats alimentent le Health Engine. Chaque biomarqueur est évalué par rapport à des plages optimales, pas seulement normales." },
      { n: '03', title: 'Suivre', desc: "Votre score de longévité se met à jour à chaque nouveau test. Voyez les tendances, identifiez les points faibles et mesurez l'amélioration." },
    ],
    domainsHeading: '8 domaines de santé',
    diffHeading: 'Ce que nous mesurons différemment',
    diffNormalLabel: 'Plages normales',
    diffNormalDesc: 'Ce que la plupart des laboratoires utilisent. Définies comme le 95e percentile de la population générale — "pas malade".',
    diffOptimalLabel: 'Plages optimales',
    diffOptimalDesc: 'Ce que nous utilisons. Plages associées au risque de maladie le plus faible et à la plus longue espérance de santé — "prospérer, pas seulement survivre".',
    diffExample: "Exemple : un HbA1c normal est inférieur à 5,7 %. Notre cible optimale est inférieure à 5,0 % — la plage liée au risque cardiovasculaire le plus faible.",
    ctaTitle: 'Voyez où vous en êtes.',
    ctaShop: 'Obtenir votre premier test sanguin',
    ctaLogin: 'Déjà testé ? Se connecter',
  },
  es: {
    tag: 'HEALTH ENGINE',
    title: 'Tu puntuación de longevidad personal.',
    sub: 'Todos tus datos de salud en un solo lugar — biomarcadores sanguíneos, evaluaciones clínicas y edad epigenética combinados en una puntuación única y accionable.',
    howHeading: 'Cómo funciona',
    steps: [
      { n: '01', title: 'Analizar', desc: 'Pide un paquete de análisis de sangre. Nuestros laboratorios asociados analizan 15–36 biomarcadores en 6 dominios de salud.' },
      { n: '02', title: 'Puntuar', desc: 'Tus resultados alimentan el Health Engine. Cada biomarcador se evalúa contra rangos óptimos, no solo normales.' },
      { n: '03', title: 'Seguir', desc: 'Tu puntuación de longevidad se actualiza con cada nueva prueba. Ve tendencias, identifica puntos débiles y mide la mejora.' },
    ],
    domainsHeading: '8 dominios de salud',
    diffHeading: 'Lo que medimos diferente',
    diffNormalLabel: 'Rangos normales',
    diffNormalDesc: 'Lo que usan la mayoría de laboratorios. Definidos como el percentil 95 de la población general — "no enfermo".',
    diffOptimalLabel: 'Rangos óptimos',
    diffOptimalDesc: 'Lo que usamos nosotros. Rangos asociados al menor riesgo de enfermedad y mayor esperanza de salud — "prosperar, no solo sobrevivir".',
    diffExample: 'Ejemplo: un HbA1c normal está por debajo de 5,7 %. Nuestro objetivo óptimo está por debajo de 5,0 % — el rango vinculado al menor riesgo cardiovascular.',
    ctaTitle: 'Ve dónde estás.',
    ctaShop: 'Pedir tu primer análisis de sangre',
    ctaLogin: '¿Ya te has analizado? Iniciar sesión',
  },
  it: {
    tag: 'HEALTH ENGINE',
    title: 'Il tuo punteggio di longevità personale.',
    sub: 'Tutti i tuoi dati di salute in un unico posto — biomarcatori del sangue, valutazioni cliniche ed età epigenetica combinati in un unico punteggio attuabile.',
    howHeading: 'Come funziona',
    steps: [
      { n: '01', title: 'Testare', desc: 'Ordina un pacchetto di analisi del sangue. I nostri laboratori partner analizzano 15–36 biomarcatori in 6 domini di salute.' },
      { n: '02', title: 'Valutare', desc: "I tuoi risultati alimentano il Health Engine. Ogni biomarcatore viene valutato rispetto a intervalli ottimali, non solo normali." },
      { n: '03', title: 'Monitorare', desc: 'Il tuo Longevity Score si aggiorna ad ogni nuovo test. Vedi le tendenze nel tempo, individua i punti deboli e misura i miglioramenti.' },
    ],
    domainsHeading: '8 domini di salute',
    diffHeading: 'Cosa misuriamo in modo diverso',
    diffNormalLabel: 'Intervalli normali',
    diffNormalDesc: 'Ciò che usano la maggior parte dei laboratori. Definiti come il 95° percentile della popolazione generale — "non malato".',
    diffOptimalLabel: 'Intervalli ottimali',
    diffOptimalDesc: 'Ciò che usiamo noi. Intervalli associati al minor rischio di malattia e alla più lunga aspettativa di salute — "prosperare, non solo sopravvivere".',
    diffExample: "Esempio: un HbA1c normale è inferiore al 5,7%. Il nostro obiettivo ottimale è inferiore al 5,0% — l'intervallo associato al minor rischio cardiovascolare.",
    ctaTitle: 'Scopri dove ti trovi.',
    ctaShop: 'Ottieni il tuo primo esame del sangue',
    ctaLogin: 'Già testato? Accedi',
  },
};

const DOMAINS: { emoji: string; name: Record<Lang, string>; weight: number; desc: Record<Lang, string> }[] = [
  {
    emoji: '❤️',
    name: { en: 'Heart & Vessels', de: 'Herz & Gefäße', fr: 'Cœur & Vaisseaux', es: 'Corazón & Vasos', it: 'Cuore & Vasi' },
    weight: 20,
    desc: {
      en: 'Cholesterol, blood pressure markers, cardiovascular risk',
      de: 'Cholesterin, Blutdruckmarker, kardiovaskuläres Risiko',
      fr: 'Cholestérol, marqueurs de pression artérielle, risque cardiovasculaire',
      es: 'Colesterol, marcadores de presión arterial, riesgo cardiovascular',
      it: 'Colesterolo, marcatori della pressione arteriosa, rischio cardiovascolare',
    },
  },
  {
    emoji: '⚡',
    name: { en: 'Metabolism', de: 'Stoffwechsel', fr: 'Métabolisme', es: 'Metabolismo', it: 'Metabolismo' },
    weight: 18,
    desc: {
      en: 'Blood sugar, insulin sensitivity, metabolic health',
      de: 'Blutzucker, Insulinsensitivität, metabolische Gesundheit',
      fr: 'Glycémie, sensibilité à l\'insuline, santé métabolique',
      es: 'Azúcar en sangre, sensibilidad a la insulina, salud metabólica',
      it: 'Glicemia, sensibilità all\'insulina, salute metabolica',
    },
  },
  {
    emoji: '🛡️',
    name: { en: 'Inflammation', de: 'Entzündung', fr: 'Inflammation', es: 'Inflamación', it: 'Infiammazione' },
    weight: 15,
    desc: {
      en: 'CRP, inflammatory markers, immune balance',
      de: 'CRP, Entzündungsmarker, Immungleichgewicht',
      fr: 'CRP, marqueurs inflammatoires, équilibre immunitaire',
      es: 'PCR, marcadores inflamatorios, equilibrio inmune',
      it: 'PCR, marcatori infiammatori, equilibrio immunitario',
    },
  },
  {
    emoji: '🫀',
    name: { en: 'Organ Function', de: 'Organfunktion', fr: 'Fonction des organes', es: 'Función orgánica', it: 'Funzione degli organi' },
    weight: 15,
    desc: {
      en: 'Liver, kidney, and thyroid health markers',
      de: 'Leber-, Nieren- und Schilddrüsenmarker',
      fr: 'Foie, reins et marqueurs de santé thyroïdienne',
      es: 'Hígado, riñones y marcadores tiroideos',
      it: 'Marcatori di salute di fegato, reni e tiroide',
    },
  },
  {
    emoji: '🥬',
    name: { en: 'Nutrients', de: 'Nährstoffe', fr: 'Nutriments', es: 'Nutrientes', it: 'Nutrienti' },
    weight: 12,
    desc: {
      en: 'Vitamin D, B12, iron, omega-3 status',
      de: 'Vitamin D, B12, Eisen, Omega-3-Status',
      fr: 'Vitamine D, B12, fer, statut oméga-3',
      es: 'Vitamina D, B12, hierro, estado de omega-3',
      it: 'Vitamina D, B12, ferro, stato degli omega-3',
    },
  },
  {
    emoji: '⚖️',
    name: { en: 'Hormones', de: 'Hormone', fr: 'Hormones', es: 'Hormonas', it: 'Ormoni' },
    weight: 10,
    desc: {
      en: 'Sex hormones, cortisol, thyroid function',
      de: 'Sexualhormone, Cortisol, Schilddrüsenfunktion',
      fr: 'Hormones sexuelles, cortisol, fonction thyroïdienne',
      es: 'Hormonas sexuales, cortisol, función tiroidea',
      it: 'Ormoni sessuali, cortisolo, funzione tiroidea',
    },
  },
  {
    emoji: '🏋️',
    name: { en: 'Body Composition', de: 'Körperzusammensetzung', fr: 'Composition corporelle', es: 'Composición corporal', it: 'Composizione corporea' },
    weight: 5,
    desc: {
      en: 'Muscle mass, body fat percentage, BMI',
      de: 'Muskelmasse, Körperfettanteil, BMI',
      fr: 'Masse musculaire, pourcentage de graisse corporelle, IMC',
      es: 'Masa muscular, porcentaje de grasa corporal, IMC',
      it: 'Massa muscolare, percentuale di grasso corporeo, BMI',
    },
  },
  {
    emoji: '🏃',
    name: { en: 'Fitness', de: 'Fitness', fr: 'Forme physique', es: 'Condición física', it: 'Fitness' },
    weight: 5,
    desc: {
      en: 'Cardiovascular fitness, resting heart rate, VO₂ max',
      de: 'Kardiovaskuläre Fitness, Ruhepuls, VO₂ max',
      fr: 'Forme cardiovasculaire, fréquence cardiaque au repos, VO₂ max',
      es: 'Forma cardiovascular, frecuencia cardíaca en reposo, VO₂ máx',
      it: 'Fitness cardiovascolare, frequenza cardiaca a riposo, VO₂ max',
    },
  },
];

const STEP_VISUALS = [
  { gradient: 'from-sky-800/20 to-sky-600/10',      emoji: '🩺' },
  { gradient: 'from-emerald-800/20 to-emerald-600/10', emoji: '📊' },
  { gradient: 'from-amber-800/20 to-amber-600/10',   emoji: '📈' },
];

export default async function HealthEnginePage() {
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // ─── Authenticated: show dashboard ───────────────────────────────────────────
  if (user) {
    const { data: rawResults } = await supabase
      .from('lab_results')
      .select('id, value_numeric, unit, status_flag, measured_at, biomarker_definition_id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('measured_at', { ascending: false });

    const labResults = rawResults ?? [];

    const defIds = [...new Set(labResults.map((r) => r.biomarker_definition_id).filter(Boolean))] as string[];

    const { data: rawDefs } = defIds.length > 0
      ? await supabase
          .from('biomarker_definitions')
          .select('id, slug, name, unit, category, reference_range_low, reference_range_high, optimal_range_low, optimal_range_high')
          .in('id', defIds)
      : { data: [] };

    const definitions = rawDefs ?? [];
    const scores = computeHealthScore(labResults, definitions, lang);

    const defMeta = definitions.map((d) => ({
      id: d.id,
      reference_range_low: d.reference_range_low ?? null,
      reference_range_high: d.reference_range_high ?? null,
      optimal_range_low: d.optimal_range_low ?? null,
      optimal_range_high: d.optimal_range_high ?? null,
      unit: d.unit ?? null,
    }));

    return (
      <div className="min-h-screen bg-[#fafaf8] flex flex-col">
        <PublicNav />
        <HealthEngineContent
          lang={lang}
          userId={user.id}
          scores={scores}
          definitions={defMeta}
        />
        <PublicFooter />
      </div>
    );
  }

  // ─── Public: show explainer ───────────────────────────────────────────────────
  const t = T[lang];

  return (
    <div className="font-sans bg-[#fafaf8] text-[#1c2a2b] overflow-x-hidden">
      <PublicNav />

      {/* ─── HERO ─── */}
      <section className="max-w-[1060px] mx-auto px-8 md:px-12 pt-32 pb-16">
        <p className="text-[#ceab84] text-[10.5px] font-medium tracking-[0.14em] uppercase mb-4">{t.tag}</p>
        <h1 className="font-serif font-normal text-4xl md:text-5xl lg:text-[3.5rem] text-[#0e393d] leading-[1.08] tracking-tight mb-5 max-w-[680px]">
          {t.title}
        </h1>
        <p className="text-[1rem] font-light text-[#5a6e6f] leading-relaxed max-w-[560px]">{t.sub}</p>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="bg-[#0e393d] py-16 md:py-20 px-8 md:px-12">
        <div className="max-w-[1060px] mx-auto">
          <h2 className="font-serif font-normal text-3xl md:text-4xl text-white leading-[1.1] tracking-tight mb-10">
            {t.howHeading}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10 border border-white/10 rounded-2xl overflow-hidden">
            {t.steps.map((step, idx) => (
              <div key={step.n} className="bg-[#0e393d] p-10">
                <div className="font-serif font-normal text-[4.5rem] text-white/8 leading-none mb-6">{step.n}</div>
                <div className={`h-28 rounded-xl bg-gradient-to-br ${STEP_VISUALS[idx].gradient} flex items-center justify-center text-4xl mb-5`}>
                  {STEP_VISUALS[idx].emoji}
                </div>
                <h3 className="font-serif font-normal text-[1.5rem] text-white mb-2.5">{step.title}</h3>
                <p className="text-[0.83rem] font-light text-white/50 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 8 DOMAINS ─── */}
      <section className="border-b border-[#0e393d]/10">
        <div className="max-w-[1060px] mx-auto px-8 md:px-12 py-16 md:py-20">
          <h2 className="font-serif font-normal text-3xl md:text-4xl text-[#0e393d] leading-[1.1] tracking-tight mb-10">
            {t.domainsHeading}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {DOMAINS.map((d) => (
              <div key={d.name.en} className="rounded-xl border border-[#0e393d]/10 bg-white p-4 flex flex-col gap-2">
                <span className="text-2xl">{d.emoji}</span>
                <p className="font-light text-[0.88rem] text-[#0e393d] leading-snug">{d.name[lang]}</p>
                <p className="text-[0.75rem] text-[#ceab84] font-medium">{d.weight}%</p>
                <p className="text-[0.72rem] text-[#5a6e6f] font-light leading-snug">{d.desc[lang]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHAT WE MEASURE DIFFERENTLY ─── */}
      <section className="max-w-[1060px] mx-auto px-8 md:px-12 py-16 md:py-20 border-b border-[#0e393d]/10">
        <h2 className="font-serif font-normal text-3xl md:text-4xl text-[#0e393d] leading-[1.1] tracking-tight mb-10">
          {t.diffHeading}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-red-400 mb-2">{t.diffNormalLabel}</p>
            <p className="text-[0.9rem] font-light text-[#5a6e6f] leading-relaxed">{t.diffNormalDesc}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-emerald-600 mb-2">{t.diffOptimalLabel}</p>
            <p className="text-[0.9rem] font-light text-[#5a6e6f] leading-relaxed">{t.diffOptimalDesc}</p>
          </div>
        </div>
        <div className="rounded-xl bg-[#0e393d]/5 border border-[#0e393d]/10 px-6 py-4">
          <p className="text-[0.88rem] text-[#5a6e6f] font-light italic leading-relaxed">{t.diffExample}</p>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="max-w-[1060px] mx-auto px-8 md:px-12 py-16 md:py-20">
        <div className="rounded-2xl bg-[#0e393d] px-10 md:px-16 py-14 text-center">
          <h2 className="font-serif text-3xl md:text-4xl text-white mb-8 leading-tight">{t.ctaTitle}</h2>
          <div className="flex gap-3 flex-wrap justify-center">
            <Link
              href="/shop"
              className="bg-[#ceab84] text-[#0e393d] font-semibold text-[13px] tracking-wide px-8 py-3.5 rounded-full transition-colors hover:bg-[#dfc4a4] whitespace-nowrap"
            >
              {t.ctaShop}
            </Link>
            <Link
              href="/login"
              className="text-white border border-white/30 text-[13px] font-light px-8 py-3.5 rounded-full transition-all hover:bg-white/10 whitespace-nowrap"
            >
              {t.ctaLogin}
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
