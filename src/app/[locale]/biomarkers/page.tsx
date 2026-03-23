import { Fragment } from 'react';
import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
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
  addonsHeading: string;
  addonsSub: string;
  detailHeading: string;
  viewAll: string;
  learnMore: string;
  refRange: string;
  optRange: string;
  rangeTypes: Record<string, string>;
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
    addonsHeading: 'Add-on Tests',
    addonsSub: 'Kombinierbar mit jedem Paket',
    detailHeading: 'Alle Biomarker',
    viewAll: 'Alle ansehen',
    learnMore: 'Mehr erfahren →',
    refRange: 'Referenzbereich',
    optRange: 'Optimalbereich',
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
    addonsHeading: 'Add-on Tests',
    addonsSub: 'Combinable with any package',
    detailHeading: 'All Biomarkers',
    viewAll: 'View all',
    learnMore: 'Learn more →',
    refRange: 'Reference range',
    optRange: 'Optimal range',
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
    addonsHeading: 'Tests complémentaires',
    addonsSub: 'Combinable avec n\'importe quel forfait',
    detailHeading: 'Tous les biomarqueurs',
    viewAll: 'Tout voir',
    learnMore: 'En savoir plus →',
    refRange: 'Plage de référence',
    optRange: 'Plage optimale',
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
    addonsHeading: 'Tests adicionales',
    addonsSub: 'Combinable con cualquier paquete',
    detailHeading: 'Todos los biomarcadores',
    viewAll: 'Ver todos',
    learnMore: 'Saber más →',
    refRange: 'Rango de referencia',
    optRange: 'Rango óptimo',
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
    addonsHeading: 'Test aggiuntivi',
    addonsSub: 'Combinabile con qualsiasi pacchetto',
    detailHeading: 'Tutti i biomarcatori',
    viewAll: 'Vedi tutti',
    learnMore: 'Scopri di più →',
    refRange: 'Intervallo di riferimento',
    optRange: 'Intervallo ottimale',
    rangeTypes: { range: 'Intervallo', lower_is_better: 'Inferiore è meglio', higher_is_better: 'Superiore è meglio' },
    trust: [
      { icon: '🔬', title: 'Laboratori partner certificati', body: 'Laboratori accreditati ISO in Svizzera e Germania.' },
      { icon: '📊', title: 'Dashboard automatica', body: 'Tutti i risultati direttamente nel tuo profilo Evida Life.' },
      { icon: '🔒', title: 'Privacy prima di tutto', body: 'Archiviazione dei dati svizzera, pienamente conforme al GDPR e alla nLPD.' },
    ],
  },
};

// ─── Add-on data (static — prices shown for reference) ───────────────────────

const ADDONS = [
  {
    slug: 'assessments',
    name: { de: 'Vitalcheck', en: 'Vitalcheck', fr: 'Vitalcheck', es: 'Vitalcheck', it: 'Vitalcheck' },
    price: { de: 'Gratis', en: 'Free', fr: 'Gratuit', es: 'Gratis', it: 'Gratuito' },
    desc: {
      de: 'Blutdruck, Taillenumfang, Griffkraft, SpO₂, Ruhepuls & AGEs-Haut­scan – bei jedem Bluttest inklusive.',
      en: 'Blood pressure, waist circumference, grip strength, SpO₂, resting heart rate & AGEs skin scan – included with every blood test.',
      fr: 'Pression artérielle, tour de taille, force de préhension, SpO₂, FC repos & scan AGEs – inclus avec tout bilan sanguin.',
      es: 'Tensión arterial, perímetro abdominal, fuerza de agarre, SpO₂, FC reposo & escáner AGEs – incluido con cualquier análisis.',
      it: 'Pressione, circonferenza vita, forza presa, SpO₂, FC riposo & scan AGEs – incluso con ogni esame del sangue.',
    },
    link: '/assessments',
  },
  {
    slug: 'vo2max-cpet',
    name: { de: 'VO₂max Test (CPET)', en: 'VO₂max Test (CPET)', fr: 'Test VO₂max (CPET)', es: 'Test VO₂max (CPET)', it: 'Test VO₂max (CPET)' },
    price: { de: 'CHF 149', en: 'CHF 149', fr: 'CHF 149', es: 'CHF 149', it: 'CHF 149' },
    desc: {
      de: 'Kardiopulmonaler Belastungstest. Misst deine maximale Sauerstoffaufnahme – den stärksten Prädiktor für Langlebigkeit.',
      en: 'Cardiopulmonary exercise test. Measures your VO₂max – the strongest single predictor of longevity.',
      fr: 'Test d\'effort cardiopulmonaire. Mesure votre VO₂max – le plus puissant prédicteur de longévité.',
      es: 'Test de esfuerzo cardiopulmonar. Mide tu VO₂max – el predictor individual más potente de longevidad.',
      it: 'Test da sforzo cardiopolmonare. Misura il tuo VO₂max – il più potente predittore di longevità.',
    },
    link: '/assessments',
  },
  {
    slug: 'dexa-body-composition',
    name: { de: 'Körperanalyse (DEXA)', en: 'Body Composition (DEXA)', fr: 'Composition corporelle (DEXA)', es: 'Composición corporal (DEXA)', it: 'Composizione corporea (DEXA)' },
    price: { de: 'CHF 129', en: 'CHF 129', fr: 'CHF 129', es: 'CHF 129', it: 'CHF 129' },
    desc: {
      de: 'Gold-Standard für Körperzusammensetzung: Körperfettanteil, Viszeralfett, Muskelmasse pro Segment & Knochendichte.',
      en: 'Gold standard for body composition: body fat %, visceral fat, lean mass per segment & bone density.',
      fr: 'Étalon-or pour la composition corporelle: % graisse, graisse viscérale, masse maigre par segment & densité osseuse.',
      es: 'Estándar de oro para la composición corporal: % grasa, grasa visceral, masa magra por segmento & densidad ósea.',
      it: 'Standard oro per la composizione corporea: % grasso, grasso viscerale, massa magra per segmento & densità ossea.',
    },
    link: '/assessments',
  },
  {
    slug: 'addon-biological-age',
    name: { de: 'Biologisches Alter', en: 'Biological Age', fr: 'Âge biologique', es: 'Edad biológica', it: 'Età biologica' },
    price: { de: 'CHF 349', en: 'CHF 349', fr: 'CHF 349', es: 'CHF 349', it: 'CHF 349' },
    desc: {
      de: 'Epigenetische Uhr (DunedinPACE & GrimAge v2) – wie schnell alterst du wirklich? Messbar und veränderbar.',
      en: 'Epigenetic clock (DunedinPACE & GrimAge v2) – how fast are you really aging? Measurable and changeable.',
      fr: 'Horloge épigénétique (DunedinPACE & GrimAge v2) – à quelle vitesse vieillissez-vous vraiment?',
      es: 'Reloj epigenético (DunedinPACE & GrimAge v2) – ¿a qué velocidad estás envejeciendo realmente?',
      it: 'Orologio epigenetico (DunedinPACE & GrimAge v2) – quanto velocemente stai invecchiando davvero?',
    },
    link: '/bioage',
  },
];

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
    .eq('product_type', 'test_package')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  const packages = (allProducts ?? []).filter((p) => (p.sort_order ?? 99) <= 3);

  // Fetch product_items (junction) for these packages
  const packageIds = packages.map((p) => p.id);
  const { data: productItems } = packageIds.length > 0
    ? await supabase
        .from('product_items')
        .select('product_id, product_item_definition_id')
        .in('product_id', packageIds)
    : { data: [] };

  // Build a map: product_id → Set of definition IDs
  const pkgItemMap = new Map<string, Set<string>>();
  for (const pkg of packages) pkgItemMap.set(pkg.id, new Set());
  for (const pi of productItems ?? []) {
    pkgItemMap.get(pi.product_id)?.add(pi.product_item_definition_id);
  }

  // Fetch active product_item_definitions (biomarker-relevant item types)
  const { data: defs } = await supabase
    .from('product_item_definitions')
    .select('id, slug, name, description, unit, range_type, ref_range_low, ref_range_high, optimal_range_low, optimal_range_high, sort_order, he_domain, item_type')
    .eq('is_active', true)
    .in('item_type', ['biomarker', 'vitalcheck_measurement', 'vo2max_test', 'dexa_scan', 'biological_age_test', 'genetic_test'])
    .order('sort_order', { ascending: true });

  const allDefs = defs ?? [];

  // Group defs by he_domain field
  const domainGroups: { domain: DomainDef; items: typeof allDefs }[] = [];
  for (const domain of DOMAINS) {
    const items = allDefs.filter((d) => d.he_domain === domain.key);
    if (items.length > 0) domainGroups.push({ domain, items });
  }

  // Count biomarkers per package (only blood biomarker types)
  const bloodTypes = ['biomarker'];
  const bloodDefs = allDefs.filter((d) => bloodTypes.includes(d.item_type ?? ''));

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <main className="mx-auto w-full max-w-[1060px] px-6 pt-28 pb-16 flex-1">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <div className="mb-14 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84]">
            {t.tag}
          </p>
          <h1 className="font-serif text-5xl text-[#0e393d] mb-4 leading-tight">
            {t.h1}
          </h1>
          <p className="mx-auto max-w-xl text-base text-[#1c2a2b]/60 leading-relaxed">
            {t.sub}
          </p>
        </div>

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
                            {t.markerCount(bloodDefs.filter((d) => pkgItemMap.get(pkg.id)?.has(d.id)).length)}
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {/* Domain groups */}
                  {domainGroups
                    .filter((g) => g.items.some((item) => bloodTypes.includes(item.item_type ?? '')))
                    .map(({ domain, items }) => {
                      const bloodItems = items.filter((d) => bloodTypes.includes(d.item_type ?? ''));
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
                        {bloodDefs.filter((d) => pkgItemMap.get(pkg.id)?.has(d.id)).length} {t.markers}
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

          {domainGroups.map(({ domain, items }) => (
            <div key={domain.key} className="mb-10">
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#ceab84] mb-4">
                {domain.emoji} {domain.label[lang]}
              </h3>
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

                      {/* Description */}
                      {desc && (
                        <p className="text-xs text-[#1c2a2b]/55 leading-relaxed">{desc}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        {/* ── Add-on tests ────────────────────────────────────────────────────── */}
        <section className="mb-20">
          <div className="mb-8 flex items-center gap-4">
            <h2 className="font-serif text-2xl text-[#0e393d]">{t.addonsHeading}</h2>
            <div className="flex-1 h-px bg-[#0e393d]/10" />
            <p className="text-sm text-[#1c2a2b]/40">{t.addonsSub}</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {ADDONS.map((addon) => (
              <div
                key={addon.slug}
                className="flex flex-col rounded-2xl bg-white ring-1 ring-[#0e393d]/8 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-serif text-base text-[#0e393d]">{addon.name[lang]}</h3>
                  <span className="shrink-0 font-semibold text-sm text-[#ceab84]">{addon.price[lang]}</span>
                </div>
                <p className="text-sm text-[#1c2a2b]/60 leading-relaxed flex-1 mb-4">
                  {addon.desc[lang]}
                </p>
                <Link
                  href={addon.link}
                  className="block text-center rounded-xl border border-[#0e393d]/20 py-2.5 text-sm font-medium text-[#0e393d] hover:bg-[#0e393d] hover:text-white transition-colors"
                >
                  {t.learnMore}
                </Link>
              </div>
            ))}
          </div>
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
