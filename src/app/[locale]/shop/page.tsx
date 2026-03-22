import { createClient } from '@/lib/supabase/server';
import ShopContent from './ShopContent';
import { buildMeta, PAGE_META } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const metaLang = locale === 'en' ? 'en' : 'de';
  return buildMeta({ ...PAGE_META.shop[metaLang], path: '/shop', locale });
}

type LocalizedString = string | Record<string, string>;

type LocalizedArray = string[] | Record<string, string[]> | null;

type Product = {
  id: string;
  name: LocalizedString;
  description: LocalizedString | null;
  price: number;
  marker_count: number | null;
  product_type: string;
  is_featured: boolean | null;
  slug: string | null;
  features: LocalizedArray;
};

const FALLBACK_PACKAGES: Product[] = [
  {
    id: 'core', name: { de: 'Longevity Core', en: 'Longevity Core' }, slug: 'longevity-core',
    description: {
      de: 'Der ideale Einstieg – die wichtigsten Biomarker für deine Gesundheitsbasis.',
      en: 'The ideal entry point – the most important biomarkers for your health baseline.',
    },
    price: 149, marker_count: 11, product_type: 'test_package', is_featured: false,
    features: {
      de: ['Blutbild (CBC)', 'Lipidprofil', 'Blutzucker & HbA1c', 'Schilddrüse (TSH)', 'Vitamin D', 'Leber- & Nierenwerte'],
      en: ['Blood count (CBC)', 'Lipid profile', 'Blood sugar & HbA1c', 'Thyroid (TSH)', 'Vitamin D', 'Liver & kidney values'],
    },
  },
  {
    id: 'pro', name: { de: 'Longevity Pro', en: 'Longevity Pro' }, slug: 'longevity-pro',
    description: {
      de: 'Unser meistgewähltes Paket – umfassende Analyse für ernsthafte Longevity-Optimierung.',
      en: 'Our most popular package – comprehensive analysis for serious longevity optimisation.',
    },
    price: 299, marker_count: 23, product_type: 'test_package', is_featured: true,
    features: {
      de: ['Alles aus Core', 'Entzündungsmarker (hsCRP, IL-6)', 'Homocystein', 'Insulin & HOMA-IR', 'Omega-3-Index', 'Ferritin & Eisen', 'Cortisol', 'Testosteron / Östrogen'],
      en: ['Everything from Core', 'Inflammation markers (hsCRP, IL-6)', 'Homocysteine', 'Insulin & HOMA-IR', 'Omega-3 index', 'Ferritin & iron', 'Cortisol', 'Testosterone / oestrogen'],
    },
  },
  {
    id: 'complete', name: { de: 'Longevity Complete', en: 'Longevity Complete' }, slug: 'longevity-complete',
    description: {
      de: 'Die umfassendste Analyse – für maximale Präzision und tiefe Einblicke in deine Gesundheit.',
      en: 'The most comprehensive analysis – for maximum precision and deep insights into your health.',
    },
    price: 499, marker_count: 37, product_type: 'test_package', is_featured: false,
    features: {
      de: ['Alles aus Pro', 'Hormonstatus vollständig', 'Schwermetalle & Mineralien', 'Darmgesundheit', 'Genetische Risikomarker', 'Longevity Score Baseline'],
      en: ['Everything from Pro', 'Full hormone status', 'Heavy metals & minerals', 'Gut health', 'Genetic risk markers', 'Longevity Score baseline'],
    },
  },
];

const FALLBACK_ADDONS: Product[] = [
  {
    id: 'vo2max', name: { de: 'VO₂max CPET', en: 'VO₂max CPET' }, slug: 'vo2max-cpet',
    description: {
      de: 'Kardiopulmonaler Belastungstest – misst deine maximale Sauerstoffaufnahme, den stärksten Prädiktor für Langlebigkeit.',
      en: 'Cardiopulmonary exercise test – measures your maximum oxygen uptake, the strongest predictor of longevity.',
    },
    price: 149, marker_count: null, product_type: 'addon_test', is_featured: false,
    features: {
      de: ['VO₂max-Messung', 'Anaerobe Schwelle', 'Herzfrequenzanalyse', 'Trainingsempfehlungen'],
      en: ['VO₂max measurement', 'Anaerobic threshold', 'Heart rate analysis', 'Training recommendations'],
    },
  },
  {
    id: 'dexa', name: { de: 'DEXA Body Composition', en: 'DEXA Body Composition' }, slug: 'dexa-body-composition',
    description: {
      de: 'Präzise Körperzusammensetzung via DEXA-Scan – Muskelmasse, Fettanteil und Knochendichte.',
      en: 'Precise body composition via DEXA scan – muscle mass, body fat percentage, and bone density.',
    },
    price: 129, marker_count: null, product_type: 'addon_test', is_featured: false,
    features: {
      de: ['Viszeralfettmessung', 'Segmentale Muskelanalyse', 'Knochendichte (T-Score)', 'Fortschritts-Tracking'],
      en: ['Visceral fat measurement', 'Segmental muscle analysis', 'Bone density (T-score)', 'Progress tracking'],
    },
  },
  {
    id: 'bioage', name: { de: 'Biological Age', en: 'Biological Age' }, slug: 'biological-age',
    description: {
      de: 'Dein biologisches Alter basierend auf epigenetischen Markern – wie alt ist dein Körper wirklich?',
      en: 'Your biological age based on epigenetic markers – how old is your body really?',
    },
    price: 349, marker_count: null, product_type: 'addon_test', is_featured: false,
    features: {
      de: ['Epigenetische Uhr (DNAm)', 'Biologisches vs. chronologisches Alter', 'Organ-Altersprofile', 'Interventionsempfehlungen'],
      en: ['Epigenetic clock (DNAm)', 'Biological vs. chronological age', 'Organ age profiles', 'Intervention recommendations'],
    },
  },
];

export default async function ShopPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from('products')
    .select('id, name, description, price, marker_count, product_type, is_featured, slug, features')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('price', { ascending: true });

  const dbPackages = rows?.filter((p) => p.product_type === 'test_package') ?? [];
  const dbAddons   = rows?.filter((p) => p.product_type === 'addon_test') ?? [];

  const packages = dbPackages.length > 0 ? dbPackages : FALLBACK_PACKAGES;
  const addons   = dbAddons.length   > 0 ? dbAddons   : FALLBACK_ADDONS;

  return <ShopContent packages={packages} addons={addons} />;
}
