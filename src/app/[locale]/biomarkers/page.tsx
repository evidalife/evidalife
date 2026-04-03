import { Fragment } from 'react';
import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import PageHero from '@/components/PageHero';
import { buildMeta, PAGE_META } from '@/lib/seo';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const metaLang = locale === 'de' ? 'de' : 'en';
  return buildMeta({ ...PAGE_META.biomarkers[metaLang], path: '/biomarkers', locale });
}

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = (typeof VALID_LANGS)[number];

// ─── Clinical domain groupings (based on sort_order ranges from seed data) ───

type DomainDef = {
  key: string;
  emoji: string;
  label: Record<Lang, string>;
};

type DomainDesc = {
  en: string;
  de: string;
  fr: string;
  es: string;
  it: string;
};

const DOMAIN_DESCRIPTIONS: Record<string, DomainDesc> = {
  heart_vessels: {
    en: 'Cardiovascular markers predict heart attack and stroke risk. Optimizing these biomarkers is the single most impactful step for extending healthspan.',
    de: 'Herz-Kreislauf-Marker sagen das Risiko für Herzinfarkt und Schlaganfall voraus. Die Optimierung dieser Biomarker ist der wirkungsvollste Schritt zur Verlängerung der Healthspan.',
    fr: 'Les marqueurs cardiovasculaires prédisent le risque de crise cardiaque et d\'accident vasculaire cérébral. L\'optimisation de ces biomarqueurs est l\'étape la plus impactante pour prolonger la durée de vie en bonne santé.',
    es: 'Los marcadores cardiovasculares predicen el riesgo de infarto de miocardio y accidente cerebrovascular. La optimización de estos biomarcadores es el paso más impactante para extender la vida útil saludable.',
    it: 'I marcatori cardiovascolari prevedono il rischio di infarto e ictus. L\'ottimizzazione di questi biomarcatori è il passo più impattante per estendere l\'aspettativa di vita sana.',
  },
  metabolism: {
    en: 'Blood sugar regulation and insulin sensitivity are central drivers of aging. Metabolic dysfunction accelerates every chronic disease.',
    de: 'Blutzuckerregulation und Insulinempfindlichkeit sind zentrale Treiber des Alterns. Metabolische Dysfunktion beschleunigt jede chronische Krankheit.',
    fr: 'La régulation du glucose sanguin et la sensibilité à l\'insuline sont des moteurs centraux du vieillissement. La dysfonction métabolique accélère toute maladie chronique.',
    es: 'La regulación del azúcar en sangre y la sensibilidad a la insulina son impulsores centrales del envejecimiento. La disfunción metabólica acelera todas las enfermedades crónicas.',
    it: 'La regolazione della glicemia e la sensibilità all\'insulina sono fattori centrali dell\'invecchiamento. La disfunzione metabolica accelera tutte le malattie croniche.',
  },
  inflammation: {
    en: 'Chronic inflammation is the root cause of age-related diseases. Anti-inflammatory lifestyle choices are fundamental to longevity.',
    de: 'Chronische Entzündung ist die Grundursache altersbedingter Krankheiten. Entzündungshemmende Lebensstiländerungen sind grundlegend für Langlebigkeit.',
    fr: 'L\'inflammation chronique est la cause profonde des maladies liées à l\'âge. Les choix de mode de vie anti-inflammatoires sont fondamentaux pour la longévité.',
    es: 'La inflamación crónica es la causa raíz de las enfermedades relacionadas con la edad. Las opciones de estilo de vida antiinflamatorio son fundamentales para la longevidad.',
    it: 'L\'infiammazione cronica è la causa profonda delle malattie legate all\'età. Le scelte di stile di vita antinfiammatorio sono fondamentali per la longevità.',
  },
  organ_function: {
    en: 'Kidney, liver, and thyroid function decline with age. Maintaining organ health is essential for metabolic resilience and longevity.',
    de: 'Nieren-, Leber- und Schilddrüsenfunktion nehmen mit dem Alter ab. Der Erhalt der Organfunktion ist entscheidend für metabolische Widerstandskraft und Langlebigkeit.',
    fr: 'La fonction rénale, hépatique et thyroïdienne diminue avec l\'âge. Maintenir la santé des organes est essentiel pour la résilience métabolique et la longévité.',
    es: 'La función renal, hepática y tiroidea disminuye con la edad. Mantener la salud de los órganos es esencial para la resiliencia metabólica y la longevidad.',
    it: 'La funzione renale, epatica e tiroidea diminuisce con l\'età. Mantenere la salute degli organi è essenziale per la resilienza metabolica e la longevità.',
  },
  nutrients: {
    en: 'Vitamin and mineral deficiencies impair mitochondrial function and immune defense. Optimal micronutrient status protects against disease.',
    de: 'Vitamin- und Mineralstoffmängel beeinträchtigen die Mitochondrienfunktion und die Immunabwehr. Ein optimaler Mikronährstoffstatus schützt vor Krankheiten.',
    fr: 'Les carences en vitamines et minéraux altèrent la fonction mitochondriale et la défense immunitaire. Un statut optimal en micronutriments protège contre les maladies.',
    es: 'Las deficiencias de vitaminas y minerales deterioran la función mitocondrial y la defensa inmunológica. Un estado óptimo de micronutrientes protege contra enfermedades.',
    it: 'Le carenze di vitamine e minerali compromettono la funzione mitocondriale e la difesa immunitaria. Uno stato ottimale di micronutrienti protegge dalle malattie.',
  },
  hormones: {
    en: 'Hormone balance regulates energy, mood, immunity, and cellular repair. Hormonal dysregulation accelerates aging across all systems.',
    de: 'Hormonelles Gleichgewicht reguliert Energie, Stimmung, Immunität und Zellreparatur. Hormonelle Dysregulation beschleunigt das Altern in allen Systemen.',
    fr: 'L\'équilibre hormonal régule l\'énergie, l\'humeur, l\'immunité et la réparation cellulaire. Le dérèglement hormonal accélère le vieillissement dans tous les systèmes.',
    es: 'El equilibrio hormonal regula la energía, el estado de ánimo, la inmunidad y la reparación celular. El desequilibrio hormonal acelera el envejecimiento en todos los sistemas.',
    it: 'L\'equilibrio ormonale regola l\'energia, l\'umore, l\'immunità e la riparazione cellulare. Lo squilibrio ormonale accelera l\'invecchiamento in tutti i sistemi.',
  },
  body_composition: {
    en: 'Excess body fat drives inflammation and insulin resistance. Lean muscle mass predicts strength, independence, and longevity.',
    de: 'Überschüssiges Körperfett fördert Entzündungen und Insulinresistenz. Magermasse sagt Kraft, Unabhängigkeit und Langlebigkeit voraus.',
    fr: 'L\'excès de graisse corporelle provoque l\'inflammation et la résistance à l\'insuline. La masse musculaire maigre prédit la force, l\'indépendance et la longévité.',
    es: 'El exceso de grasa corporal causa inflamación y resistencia a la insulina. La masa muscular magra predice la fuerza, la independencia y la longevidad.',
    it: 'L\'eccesso di grasso corporeo causa infiammazione e resistenza all\'insulina. La massa muscolare magra predice la forza, l\'indipendenza e la longevità.',
  },
  fitness: {
    en: 'Cardiorespiratory fitness and recovery capacity are the strongest predictors of mortality risk. Fitness is modifiable at any age.',
    de: 'Kardiorespiratorische Fitness und Erholungskapazität sind die stärksten Prädiktoren für Sterblichkeitsrisiko. Fitness ist in jedem Alter veränderbar.',
    fr: 'La forme cardiovasculaire et la capacité de récupération sont les plus forts prédicteurs du risque de mortalité. La forme physique est modifiable à tout âge.',
    es: 'La forma cardiovascular y la capacidad de recuperación son los predictores más fuertes del riesgo de mortalidad. La forma física es modificable a cualquier edad.',
    it: 'La forma cardiovascolare e la capacità di recupero sono i più forti predittori del rischio di mortalità. La forma fisica è modificabile a qualsiasi età.',
  },
  epigenetics: {
    en: 'Epigenetic clocks measure biological aging independent of chronological age. They reveal how lifestyle choices accelerate or reverse aging.',
    de: 'Epigenetische Uhren messen das biologische Altern unabhängig vom chronologischen Alter. Sie zeigen, wie Lebensstiländerungen das Altern beschleunigen oder umkehren.',
    fr: 'Les horloges épigénétiques mesurent le vieillissement biologique indépendamment de l\'âge chronologique. Elles révèlent comment les choix de mode de vie accélèrent ou inversent le vieillissement.',
    es: 'Los relojes epigenéticos miden el envejecimiento biológico independientemente de la edad cronológica. Revelan cómo las opciones de estilo de vida aceleran o invierten el envejecimiento.',
    it: 'Gli orologi epigenetici misurano l\'invecchiamento biologico indipendentemente dall\'età cronologica. Rivelano come le scelte di stile di vita accelerano o invertono l\'invecchiamento.',
  },
};

const DOMAINS: DomainDef[] = [
  { key: 'heart_vessels',    emoji: '❤️',  label: { de: 'Herz & Gefässe',          en: 'Heart & Vessels',       fr: 'Cœur & Vaisseaux',      es: 'Corazón & Vasos',        it: 'Cuore & Vasi' } },
  { key: 'metabolism',       emoji: '⚡',  label: { de: 'Stoffwechsel',              en: 'Metabolism',            fr: 'Métabolisme',            es: 'Metabolismo',             it: 'Metabolismo' } },
  { key: 'inflammation',     emoji: '🛡️',  label: { de: 'Entzündung & Immunsystem', en: 'Inflammation & Immune', fr: 'Inflammation & Immunité',es: 'Inflamación & Inmunidad', it: 'Infiammazione & Immun.' } },
  { key: 'organ_function',   emoji: '🫀',  label: { de: 'Organfunktion',             en: 'Organ Function',        fr: 'Fonction Organique',     es: 'Función Orgánica',        it: 'Funzione Organica' } },
  { key: 'nutrients',        emoji: '🥬',  label: { de: 'Nährstoffe',                en: 'Nutrients',             fr: 'Nutriments',             es: 'Nutrientes',              it: 'Nutrienti' } },
  { key: 'hormones',         emoji: '⚖️',  label: { de: 'Hormone',                   en: 'Hormones',              fr: 'Hormones',               es: 'Hormonas',                it: 'Ormoni' } },
  { key: 'body_composition', emoji: '🏋️', label: { de: 'Körperzusammensetzung',     en: 'Body Composition',      fr: 'Composition Corporelle', es: 'Composición Corporal',    it: 'Composizione Corporea' } },
  { key: 'fitness',          emoji: '🏃',  label: { de: 'Fitness & Erholung',        en: 'Fitness & Recovery',    fr: 'Forme & Récupération',   es: 'Forma & Recuperación',    it: 'Forma & Recupero' } },
  { key: 'epigenetics',      emoji: '🧬',  label: { de: 'Epigenetik',                en: 'Epigenetics',           fr: 'Épigénétique',           es: 'Epigenética',             it: 'Epigenetica' } },
];

// ─── UI strings ───────────────────────────────────────────────────────────────

const T: Record<Lang, {
  tag: string;
  h1: string;
  sub: string;
  matrixHeading: string;
  markerCount: (n: number) => string;
  buyNow: string;
  included: string;
  notIncluded: string;
  total: string;
  markers: string;
  detailHeading: string;
  viewAll: string;
  refRange: string;
  optRange: string;
  rangeTypes: Record<string, string>;
  calculatedTitle: string;
  trust: { icon: string; title: string; body: string }[];
}> = {
  de: {
    tag: 'LONGEVITY TESTING',
    h1: 'Wissen, wo du stehst.',
    sub: 'Professionelle Bluttests über zertifizierte Partnerlabore – inkl. gratis Vitalcheck und persönlichem Longevity Dashboard.',
    matrixHeading: 'Paketvergleich',
    markerCount: (n) => `${n} Biomarker`,
    buyNow: 'Jetzt kaufen',
    included: 'Enthalten',
    notIncluded: 'Nicht enthalten',
    total: 'Gesamt',
    markers: 'Marker',
    detailHeading: 'Alle Biomarker',
    viewAll: 'Alle ansehen',
    refRange: 'Referenzbereich',
    optRange: 'Optimalbereich',
    calculatedTitle: 'Berechnet aus anderen Werten',
    rangeTypes: { range: 'Bereich', lower_is_better: 'Niedriger = besser', higher_is_better: 'Höher = besser' },
    trust: [
      { icon: '🔬', title: 'Zertifizierte Partnerlabore', body: 'ISO-akkreditierte Labore in der Schweiz und Deutschland.' },
      { icon: '📊', title: 'Automatisches Dashboard', body: 'Alle Ergebnisse direkt in deinem Evida Life Profil.' },
      { icon: '🔒', title: 'Datenschutz first', body: 'Schweizer Datenhaltung, vollständig DSGVO- & nDSG-konform.' },
    ],
  },
  en: {
    tag: 'LONGEVITY TESTING',
    h1: 'Know where you stand.',
    sub: 'Professional blood tests via certified partner labs – including a free vitality check and personal Longevity Dashboard.',
    matrixHeading: 'Package Comparison',
    markerCount: (n) => `${n} biomarkers`,
    buyNow: 'Buy Now',
    included: 'Included',
    notIncluded: 'Not included',
    total: 'Total',
    markers: 'markers',
    detailHeading: 'All Biomarkers',
    viewAll: 'View all',
    refRange: 'Reference range',
    optRange: 'Optimal range',
    calculatedTitle: 'Calculated from other values',
    rangeTypes: { range: 'Range', lower_is_better: 'Lower is better', higher_is_better: 'Higher is better' },
    trust: [
      { icon: '🔬', title: 'Certified partner labs', body: 'ISO-accredited laboratories in Switzerland and Germany.' },
      { icon: '📊', title: 'Automatic dashboard', body: 'All results directly in your Evida Life profile.' },
      { icon: '🔒', title: 'Privacy first', body: 'Swiss data storage, fully GDPR- & nDSG-compliant.' },
    ],
  },
  fr: {
    tag: 'TESTS DE LONGÉVITÉ',
    h1: 'Savoir où vous en êtes.',
    sub: 'Tests sanguins professionnels via des laboratoires partenaires certifiés – avec bilan de vitalité gratuit et tableau de bord de longévité personnel.',
    matrixHeading: 'Comparaison des forfaits',
    markerCount: (n) => `${n} biomarqueurs`,
    buyNow: 'Acheter maintenant',
    included: 'Inclus',
    notIncluded: 'Non inclus',
    total: 'Total',
    markers: 'marqueurs',
    detailHeading: 'Tous les biomarqueurs',
    viewAll: 'Tout voir',
    refRange: 'Plage de référence',
    optRange: 'Plage optimale',
    calculatedTitle: 'Calculé à partir d\'autres valeurs',
    rangeTypes: { range: 'Plage', lower_is_better: 'Plus bas = mieux', higher_is_better: 'Plus haut = mieux' },
    trust: [
      { icon: '🔬', title: 'Laboratoires partenaires certifiés', body: 'Laboratoires accrédités ISO en Suisse et en Allemagne.' },
      { icon: '📊', title: 'Tableau de bord automatique', body: 'Tous les résultats directement dans votre profil Evida Life.' },
      { icon: '🔒', title: 'Confidentialité d\'abord', body: 'Stockage des données en Suisse, conforme au RGPD et au nLPD.' },
    ],
  },
  es: {
    tag: 'PRUEBAS DE LONGEVIDAD',
    h1: 'Saber dónde estás.',
    sub: 'Análisis de sangre profesionales a través de laboratorios asociados certificados – con chequeo de vitalidad gratuito y panel de longevidad personal.',
    matrixHeading: 'Comparativa de paquetes',
    markerCount: (n) => `${n} biomarcadores`,
    buyNow: 'Comprar ahora',
    included: 'Incluido',
    notIncluded: 'No incluido',
    total: 'Total',
    markers: 'marcadores',
    detailHeading: 'Todos los biomarcadores',
    viewAll: 'Ver todos',
    refRange: 'Rango de referencia',
    optRange: 'Rango óptimo',
    calculatedTitle: 'Calculado a partir de otros valores',
    rangeTypes: { range: 'Rango', lower_is_better: 'Menor es mejor', higher_is_better: 'Mayor es mejor' },
    trust: [
      { icon: '🔬', title: 'Laboratorios asociados certificados', body: 'Laboratorios acreditados ISO en Suiza y Alemania.' },
      { icon: '📊', title: 'Panel automático', body: 'Todos los resultados directamente en tu perfil de Evida Life.' },
      { icon: '🔒', title: 'Privacidad primero', body: 'Almacenamiento de datos suizo, conforme con el RGPD y la nLPD.' },
    ],
  },
  it: {
    tag: 'TEST DI LONGEVITÀ',
    h1: 'Sapere dove ti trovi.',
    sub: 'Esami del sangue professionali tramite laboratori partner certificati – con controllo di vitalità gratuito e dashboard di longevità personale.',
    matrixHeading: 'Confronto pacchetti',
    markerCount: (n) => `${n} biomarcatori`,
    buyNow: 'Acquista ora',
    included: 'Incluso',
    notIncluded: 'Non incluso',
    total: 'Totale',
    markers: 'marcatori',
    detailHeading: 'Tutti i biomarcatori',
    viewAll: 'Vedi tutti',
    refRange: 'Intervallo di riferimento',
    optRange: 'Intervallo ottimale',
    calculatedTitle: 'Calcolato da altri valori',
    rangeTypes: { range: 'Intervallo', lower_is_better: 'Inferiore è meglio', higher_is_better: 'Superiore è meglio' },
    trust: [
      { icon: '🔬', title: 'Laboratori partner certificati', body: 'Laboratori accreditati ISO in Svizzera e Germania.' },
      { icon: '📊', title: 'Dashboard automatica', body: 'Tutti i risultati direttamente nel tuo profilo Evida Life.' },
      { icon: '🔒', title: 'Privacy prima di tutto', body: 'Archiviazione dei dati svizzera, pienamente conforme al GDPR e alla nLPD.' },
    ],
  },
};


// ─── Helpers ─────────────────────────────────────────────────────────────────

function getName(nameObj: Record<string, string> | null, lang: Lang): string {
  if (!nameObj) return '';
  return nameObj[lang] ?? nameObj['en'] ?? nameObj['de'] ?? '';
}


function RangeBar({
  refLow, refHigh, optLow, optHigh, rangeType,
}: {
  refLow: number | null;
  refHigh: number | null;
  optLow: number | null;
  optHigh: number | null;
  rangeType: string | null;
}) {
  if (!rangeType) return null;

  // Determine display bounds
  let minVal: number, maxVal: number;
  if (rangeType === 'lower_is_better' && refHigh != null) {
    minVal = 0;
    maxVal = (optHigh ?? refHigh) * 2;
  } else if (rangeType === 'higher_is_better' && refLow != null) {
    minVal = Math.max(0, (optLow ?? refLow) * 0.3);
    maxVal = (optLow ?? refLow) * 1.7;
  } else if (refLow != null && refHigh != null) {
    const span = refHigh - refLow;
    minVal = Math.max(0, refLow - span * 0.4);
    maxVal = refHigh + span * 0.4;
  } else {
    return null;
  }

  const range = maxVal - minVal;
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - minVal) / range) * 100));

  const refLeftPct  = refLow  != null ? pct(refLow)  : (rangeType === 'lower_is_better' ? 0 : null);
  const refRightPct = refHigh != null ? pct(refHigh) : (rangeType === 'higher_is_better' ? 100 : null);
  const optLeftPct  = optLow  != null ? pct(optLow)  : (rangeType === 'lower_is_better' ? 0 : null);
  const optRightPct = optHigh != null ? pct(optHigh) : (rangeType === 'higher_is_better' ? 100 : null);

  const refW  = refLeftPct  != null && refRightPct  != null ? refRightPct  - refLeftPct  : null;
  const optW  = optLeftPct  != null && optRightPct  != null ? optRightPct  - optLeftPct  : null;

  return (
    <div className="relative h-3 rounded-full bg-[#0e393d]/8 overflow-hidden w-full">
      {refW != null && refLeftPct != null && (
        <div
          className="absolute top-0 h-full rounded-full bg-emerald-100"
          style={{ left: `${refLeftPct}%`, width: `${refW}%` }}
        />
      )}
      {optW != null && optLeftPct != null && (
        <div
          className="absolute top-0 h-full rounded-full bg-emerald-400/70"
          style={{ left: `${optLeftPct}%`, width: `${optW}%` }}
        />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BiomarkersPage() {
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';
  const t = T[lang];

  const supabase = await createClient();

  // Fetch the 3 main test packages (sort_order 1–3)
  const { data: allProducts } = await supabase
    .from('products')
    .select('id, slug, name, price_chf, sort_order, is_featured')
    .eq('product_type', 'blood_test')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  const packages = (allProducts ?? []).filter((p) => (p.sort_order ?? 99) <= 3);

  // Fetch product_items (junction) for these packages
  const packageIds = packages.map((p) => p.id);
  const { data: productItems } = packageIds.length > 0
    ? await supabase
        .from('product_biomarkers')
        .select('product_id, biomarker_id')
        .in('product_id', packageIds)
    : { data: [] };

  // Build a map: product_id → Set of definition IDs
  const pkgItemMap = new Map<string, Set<string>>();
  for (const pkg of packages) pkgItemMap.set(pkg.id, new Set());
  for (const pi of productItems ?? []) {
    pkgItemMap.get(pi.product_id)?.add(pi.biomarker_id);
  }

  // Fetch active biomarkers (all types — item_type is an enum so .in() may not work)
  const { data: defs } = await supabase
    .from('biomarkers')
    .select('id, slug, name, description, unit, range_type, ref_range_low, ref_range_high, optimal_range_low, optimal_range_high, sort_order, he_domain, item_type, is_calculated')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  const allDefs = defs ?? [];

  // Collect all definition IDs linked to at least one package
  const linkedDefIds = new Set<string>();
  for (const ids of pkgItemMap.values()) {
    for (const id of ids) linkedDefIds.add(id);
  }

  // Group defs by he_domain field (matrix uses all defs; detail cards use only linked defs)
  const domainGroups: { domain: DomainDef; items: typeof allDefs }[] = [];
  for (const domain of DOMAINS) {
    const items = allDefs.filter((d) => d.he_domain === domain.key);
    if (items.length > 0) domainGroups.push({ domain, items });
  }

  // Detail cards: only show biomarkers linked to at least one package (dynamic)
  const linkedDomainGroups: { domain: DomainDef; items: typeof allDefs }[] = [];
  for (const domain of DOMAINS) {
    const items = allDefs.filter((d) => d.he_domain === domain.key && linkedDefIds.has(d.id));
    if (items.length > 0) linkedDomainGroups.push({ domain, items });
  }

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <PageHero variant="light" eyebrow={t.tag} title={t.h1} subtitle={t.sub} />

      <main className="mx-auto w-full max-w-[1060px] px-8 md:px-12 pb-16 flex-1">

        {/* ── Package comparison matrix ──────────────────────────────────────── */}
        {packages.length > 0 && (
          <section className="mb-20">
            <div className="mb-8 flex items-center gap-4">
              <h2 className="font-serif text-2xl text-[#0e393d]">{t.matrixHeading}</h2>
              <div className="flex-1 h-px bg-[#0e393d]/10" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                {/* Package header row */}
                <thead>
                  <tr>
                    <th className="text-left pb-4 pr-4 w-[40%]" />
                    {packages.map((pkg) => (
                      <th key={pkg.id} className={`text-center pb-4 px-3 ${pkg.is_featured ? 'text-[#ceab84]' : 'text-[#0e393d]'}`}>
                        <div className={`rounded-xl p-3 ${pkg.is_featured ? 'bg-[#0e393d]' : 'bg-white ring-1 ring-[#0e393d]/10'}`}>
                          {pkg.is_featured && (
                            <div className="text-[10px] font-semibold text-[#ceab84] uppercase tracking-wider mb-1">
                              ★
                            </div>
                          )}
                          <div className={`font-serif text-base font-medium ${pkg.is_featured ? 'text-white' : 'text-[#0e393d]'}`}>
                            {getName(pkg.name as Record<string, string>, lang)}
                          </div>
                          <div className={`font-serif text-lg mt-0.5 ${pkg.is_featured ? 'text-[#ceab84]' : 'text-[#0e393d]'}`}>
                            CHF {pkg.price_chf}
                          </div>
                          <div className={`text-[11px] mt-0.5 ${pkg.is_featured ? 'text-white/50' : 'text-[#1c2a2b]/40'}`}>
                            {t.markerCount(pkgItemMap.get(pkg.id)?.size ?? 0)}
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {/* Domain groups */}
                  {domainGroups
                    .filter((g) => g.items.some((item) => linkedDefIds.has(item.id)))
                    .map(({ domain, items }) => {
                      const bloodItems = items.filter((d) => linkedDefIds.has(d.id));
                      if (bloodItems.length === 0) return null;
                      return (
                        <Fragment key={domain.key}>
                          {/* Domain header */}
                          <tr>
                            <td
                              colSpan={1 + packages.length}
                              className="pt-5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#ceab84]"
                            >
                              {domain.emoji} {domain.label[lang]}
                            </td>
                          </tr>
                          {/* Biomarker rows */}
                          {bloodItems.map((def) => (
                            <tr
                              key={def.id}
                              className="border-b border-[#0e393d]/6 hover:bg-[#0e393d]/2 transition-colors"
                            >

                              <td className="py-2.5 pr-4">
                                <span className="text-[#1c2a2b]/80 text-sm">
                                  {getName(def.name as Record<string, string>, lang)}
                                </span>
                                {def.unit && (
                                  <span className="ml-1.5 text-[11px] text-[#1c2a2b]/35">{def.unit}</span>
                                )}
                                {def.is_calculated && (
                                  <span
                                    className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded bg-violet-100 text-violet-600 text-[9px] font-bold align-text-bottom"
                                    title={t.calculatedTitle}
                                  >
                                    fx
                                  </span>
                                )}
                              </td>
                              {packages.map((pkg) => {
                                const included = pkgItemMap.get(pkg.id)?.has(def.id) ?? false;
                                return (
                                  <td key={pkg.id} className="py-2.5 px-3 text-center">
                                    {included ? (
                                      <svg
                                        className="inline text-emerald-500"
                                        width="16" height="16" viewBox="0 0 16 16" fill="none"
                                        aria-label={t.included}
                                      >
                                        <circle cx="8" cy="8" r="7" fill="currentColor" fillOpacity="0.12" />
                                        <path d="M4.5 8l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    ) : (
                                      <span className="inline-block w-4 h-px bg-[#0e393d]/15" aria-label={t.notIncluded} />
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </Fragment>
                      );
                    })}

                  {/* Total row */}
                  <tr className="border-t-2 border-[#0e393d]/15 bg-[#0e393d]/3">
                    <td className="py-3 pr-4 text-sm font-semibold text-[#0e393d]">{t.total}</td>
                    {packages.map((pkg) => (
                      <td key={pkg.id} className="py-3 px-3 text-center text-sm font-semibold text-[#0e393d]">
                        {pkgItemMap.get(pkg.id)?.size ?? 0} {t.markers}
                      </td>
                    ))}
                  </tr>

                  {/* Price + CTA row */}
                  <tr>
                    <td className="pt-4 pb-2 pr-4" />
                    {packages.map((pkg) => (
                      <td key={pkg.id} className="pt-4 pb-2 px-3 text-center">
                        <Link
                          href={`/shop/${pkg.slug}`}
                          className={`block rounded-xl py-2.5 text-sm font-medium transition-colors ${
                            pkg.is_featured
                              ? 'bg-[#ceab84] text-[#0e393d] hover:bg-[#ceab84]/90'
                              : 'bg-[#0e393d] text-white hover:bg-[#0e393d]/90'
                          }`}
                        >
                          {t.buyNow}
                        </Link>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Biomarker detail cards ─────────────────────────────────────────── */}
        <section className="mb-20">
          <div className="mb-8 flex items-center gap-4">
            <h2 className="font-serif text-2xl text-[#0e393d]">{t.detailHeading}</h2>
            <div className="flex-1 h-px bg-[#0e393d]/10" />
          </div>

          {linkedDomainGroups.map(({ domain, items }) => {
            const domainDesc = DOMAIN_DESCRIPTIONS[domain.key];
            const descToShow = domainDesc?.[lang] ?? domainDesc?.en ?? '';

            return (
              <div key={domain.key} className="mb-14">
                {/* Domain header with emoji and description */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-3 mb-3">
                    <h3 className="text-2xl">{domain.emoji}</h3>
                    <h3 className="font-serif text-xl text-[#0e393d]">
                      {domain.label[lang]}
                    </h3>
                  </div>
                  {descToShow && (
                    <p className="text-sm text-[#1c2a2b]/65 leading-relaxed max-w-2xl">
                      {descToShow}
                    </p>
                  )}
                </div>

                {/* Biomarker cards grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((def) => {
                    const name = getName(def.name as Record<string, string>, lang);
                    const desc = getName(def.description as Record<string, string> | null ?? {}, lang);
                    const rt = def.range_type;

                    return (
                      <div
                        key={def.id}
                        className="rounded-xl bg-white ring-1 ring-[#0e393d]/8 p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow"
                      >
                        {/* Name + unit + range type badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-sm text-[#0e393d]">{name}</p>
                            {def.unit && (
                              <p className="text-xs text-[#1c2a2b]/40 mt-0.5">{def.unit}</p>
                            )}
                          </div>
                          {rt && (
                            <span className="shrink-0 text-[10px] font-medium rounded-full px-2 py-0.5 bg-[#ceab84]/15 text-[#8a6a3e] whitespace-nowrap">
                              {t.rangeTypes[rt] ?? rt}
                            </span>
                          )}
                        </div>

                        {/* Range bar */}
                        <RangeBar
                          refLow={def.ref_range_low}
                          refHigh={def.ref_range_high}
                          optLow={def.optimal_range_low}
                          optHigh={def.optimal_range_high}
                          rangeType={def.range_type}
                        />

                        {/* Range labels */}
                        {(def.ref_range_low != null || def.ref_range_high != null) && (
                          <div className="flex items-center gap-3 text-[10px] text-[#1c2a2b]/50">
                            <span className="flex items-center gap-1">
                              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-100" />
                              {t.refRange}: {def.ref_range_low != null ? `≥${def.ref_range_low}` : ''}{def.ref_range_low != null && def.ref_range_high != null ? ' – ' : ''}{def.ref_range_high != null ? `≤${def.ref_range_high}` : ''} {def.unit}
                            </span>
                            {(def.optimal_range_low != null || def.optimal_range_high != null) && (
                              <span className="flex items-center gap-1">
                                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-400/70" />
                                {t.optRange}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Package inclusion + calculated badge */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {packages.map((pkg) => {
                            const included = pkgItemMap.get(pkg.id)?.has(def.id) ?? false;
                            const pkgName = getName(pkg.name as Record<string, string>, lang);
                            // Short label: first word only (Core, Pro, Complete)
                            const shortLabel = (pkgName.split(/\s+/).pop() ?? pkgName);
                            return (
                              <span
                                key={pkg.id}
                                className={`text-[9px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5 ${
                                  included
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-[#0e393d]/5 text-[#1c2a2b]/25 line-through'
                                }`}
                              >
                                {shortLabel}
                              </span>
                            );
                          })}
                          {def.is_calculated && (
                            <span
                              className="text-[9px] font-bold rounded-full px-2 py-0.5 bg-violet-100 text-violet-600"
                              title={t.calculatedTitle}
                            >
                              fx
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        {desc && (
                          <p className="text-xs text-[#1c2a2b]/55 leading-relaxed">{desc}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>

        {/* ── Trust strip ────────────────────────────────────────────────────── */}
        <section className="rounded-2xl bg-[#0e393d]/5 px-8 py-8">
          <div className="grid gap-6 text-center sm:grid-cols-3">
            {t.trust.map((item, i) => (
              <div key={i}>
                <div className="text-2xl mb-2">{item.icon}</div>
                <h3 className="font-serif text-base text-[#0e393d] mb-1">{item.title}</h3>
                <p className="text-sm text-[#1c2a2b]/55 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

      </main>

      <PublicFooter />
    </div>
  );
}
