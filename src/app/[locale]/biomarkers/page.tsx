import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { buildMeta, PAGE_META } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const metaLang = locale === 'de' ? 'de' : 'en';
  return buildMeta({ ...PAGE_META.biomarkers[metaLang], path: '/biomarkers', locale });
}

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = (typeof VALID_LANGS)[number];

// ─── UI strings ───────────────────────────────────────────────────────────────

const T: Record<Lang, {
  tag: string;
  h1: string;
  sub: string;
  packagesHeading: string;
  recommended: string;
  biomarkers: (n: number) => string;
  vitalcheck: string;
  viewShop: string;
  addonsHeading: string;
  addonsCombo: string;
  trust: { title: string; body: string }[];
}> = {
  de: {
    tag: 'Longevity Testing',
    h1: 'Kenne deine Biomarker.',
    sub: 'Professionelle Bluttests über Partnerlabore – inklusive gratis Vitalcheck und persönlichem Longevity Dashboard.',
    packagesHeading: 'Test-Pakete',
    recommended: 'EMPFOHLEN',
    biomarkers: (n) => `${n} Biomarker analysiert`,
    vitalcheck: 'Gratis Vitalcheck inkl.',
    viewShop: 'Im Shop ansehen →',
    addonsHeading: 'Add-ons',
    addonsCombo: 'Kombinierbar mit jedem Paket',
    trust: [
      { title: 'Zertifizierte Partnerlabore', body: 'ISO-akkreditierte Labore in der Schweiz und Deutschland.' },
      { title: 'Automatisches Dashboard', body: 'Alle Ergebnisse direkt in deinem Evida Life Profil.' },
      { title: 'Datenschutz first', body: 'Schweizer Datenhaltung, vollständig DSGVO- & nDSG-konform.' },
    ],
  },
  en: {
    tag: 'Longevity Testing',
    h1: 'Know your biomarkers.',
    sub: 'Professional blood tests via partner labs – including a free vitality check and personal Longevity Dashboard.',
    packagesHeading: 'Test Packages',
    recommended: 'RECOMMENDED',
    biomarkers: (n) => `${n} biomarkers analysed`,
    vitalcheck: 'Free vitality check incl.',
    viewShop: 'View in Shop →',
    addonsHeading: 'Add-ons',
    addonsCombo: 'Combinable with any package',
    trust: [
      { title: 'Certified partner labs', body: 'ISO-accredited laboratories in Switzerland and Germany.' },
      { title: 'Automatic dashboard', body: 'All results directly in your Evida Life profile.' },
      { title: 'Privacy first', body: 'Swiss data storage, fully GDPR- & nDSG-compliant.' },
    ],
  },
  fr: {
    tag: 'Tests de longévité',
    h1: 'Connaissez vos biomarqueurs.',
    sub: 'Tests sanguins professionnels via des laboratoires partenaires – avec un bilan de vitalité gratuit et un tableau de bord de longévité personnel.',
    packagesHeading: 'Forfaits de test',
    recommended: 'RECOMMANDÉ',
    biomarkers: (n) => `${n} biomarqueurs analysés`,
    vitalcheck: 'Bilan de vitalité gratuit inclus',
    viewShop: 'Voir dans la boutique →',
    addonsHeading: 'Compléments',
    addonsCombo: 'Combinable avec n\'importe quel forfait',
    trust: [
      { title: 'Laboratoires partenaires certifiés', body: 'Laboratoires accrédités ISO en Suisse et en Allemagne.' },
      { title: 'Tableau de bord automatique', body: 'Tous les résultats directement dans votre profil Evida Life.' },
      { title: 'Confidentialité d\'abord', body: 'Stockage des données en Suisse, entièrement conforme au RGPD et au nLPD.' },
    ],
  },
  es: {
    tag: 'Pruebas de longevidad',
    h1: 'Conoce tus biomarcadores.',
    sub: 'Análisis de sangre profesionales a través de laboratorios asociados – incluyendo un chequeo de vitalidad gratuito y un panel de longevidad personal.',
    packagesHeading: 'Paquetes de prueba',
    recommended: 'RECOMENDADO',
    biomarkers: (n) => `${n} biomarcadores analizados`,
    vitalcheck: 'Chequeo de vitalidad gratuito incl.',
    viewShop: 'Ver en la tienda →',
    addonsHeading: 'Complementos',
    addonsCombo: 'Combinable con cualquier paquete',
    trust: [
      { title: 'Laboratorios asociados certificados', body: 'Laboratorios acreditados por ISO en Suiza y Alemania.' },
      { title: 'Panel automático', body: 'Todos los resultados directamente en tu perfil de Evida Life.' },
      { title: 'Privacidad primero', body: 'Almacenamiento de datos suizo, totalmente conforme con el RGPD y la nLPD.' },
    ],
  },
  it: {
    tag: 'Test di longevità',
    h1: 'Conosci i tuoi biomarcatori.',
    sub: 'Esami del sangue professionali tramite laboratori partner – incluso un controllo di vitalità gratuito e una dashboard di longevità personale.',
    packagesHeading: 'Pacchetti di test',
    recommended: 'CONSIGLIATO',
    biomarkers: (n) => `${n} biomarcatori analizzati`,
    vitalcheck: 'Controllo di vitalità gratuito incluso',
    viewShop: 'Vedi nel negozio →',
    addonsHeading: 'Componenti aggiuntivi',
    addonsCombo: 'Combinabile con qualsiasi pacchetto',
    trust: [
      { title: 'Laboratori partner certificati', body: 'Laboratori accreditati ISO in Svizzera e Germania.' },
      { title: 'Dashboard automatica', body: 'Tutti i risultati direttamente nel tuo profilo Evida Life.' },
      { title: 'Privacy prima di tutto', body: 'Archiviazione dei dati svizzera, pienamente conforme al GDPR e alla nLPD.' },
    ],
  },
};

// ─── Product data ─────────────────────────────────────────────────────────────

type L5 = Record<Lang, string>;
type L5arr = Record<Lang, string[]>;

type Package = {
  slug: string;
  name: string;
  price: number;
  markerCount: number;
  featured: boolean;
  description: L5;
  features: L5arr;
};

type Addon = {
  slug: string;
  name: string;
  price: number;
  description: L5;
  features: L5arr;
};

const PACKAGES: Package[] = [
  {
    slug: 'longevity-core',
    name: 'Longevity Core',
    price: 149,
    markerCount: 11,
    featured: false,
    description: {
      de: 'Der ideale Einstieg – die wichtigsten Biomarker für deine Gesundheitsbasis.',
      en: 'The ideal entry point – the most important biomarkers for your health baseline.',
      fr: 'Le point de départ idéal – les biomarqueurs les plus importants pour votre base de santé.',
      es: 'El punto de entrada ideal – los biomarcadores más importantes para tu base de salud.',
      it: 'Il punto di partenza ideale – i biomarcatori più importanti per la tua base di salute.',
    },
    features: {
      de: ['Blutbild (CBC)', 'Lipidprofil', 'Blutzucker & HbA1c', 'Schilddrüse (TSH)', 'Vitamin D', 'Leber- & Nierenwerte'],
      en: ['Blood count (CBC)', 'Lipid profile', 'Blood sugar & HbA1c', 'Thyroid (TSH)', 'Vitamin D', 'Liver & kidney values'],
      fr: ['Numération sanguine (CBC)', 'Profil lipidique', 'Glycémie & HbA1c', 'Thyroïde (TSH)', 'Vitamine D', 'Valeurs hépatiques & rénales'],
      es: ['Hemograma (CBC)', 'Perfil lipídico', 'Glucosa & HbA1c', 'Tiroides (TSH)', 'Vitamina D', 'Valores hepáticos y renales'],
      it: ['Emocromo (CBC)', 'Profilo lipidico', 'Glicemia & HbA1c', 'Tiroide (TSH)', 'Vitamina D', 'Valori epatici e renali'],
    },
  },
  {
    slug: 'longevity-pro',
    name: 'Longevity Pro',
    price: 299,
    markerCount: 23,
    featured: true,
    description: {
      de: 'Unser meistgewähltes Paket – umfassende Analyse für ernsthafte Longevity-Optimierung.',
      en: 'Our most popular package – comprehensive analysis for serious longevity optimisation.',
      fr: 'Notre forfait le plus populaire – analyse complète pour une optimisation sérieuse de la longévité.',
      es: 'Nuestro paquete más popular – análisis completo para una optimización seria de la longevidad.',
      it: 'Il nostro pacchetto più popolare – analisi completa per una seria ottimizzazione della longevità.',
    },
    features: {
      de: ['Alles aus Core', 'Entzündungsmarker (hsCRP, IL-6)', 'Homocystein', 'Insulin & HOMA-IR', 'Omega-3-Index', 'Ferritin & Eisen', 'Cortisol', 'Testosteron / Östrogen'],
      en: ['Everything from Core', 'Inflammation markers (hsCRP, IL-6)', 'Homocysteine', 'Insulin & HOMA-IR', 'Omega-3 index', 'Ferritin & iron', 'Cortisol', 'Testosterone / oestrogen'],
      fr: ['Tout de Core', 'Marqueurs d\'inflammation (hsCRP, IL-6)', 'Homocystéine', 'Insuline & HOMA-IR', 'Index Oméga-3', 'Ferritine & fer', 'Cortisol', 'Testostérone / œstrogène'],
      es: ['Todo de Core', 'Marcadores de inflamación (hsCRP, IL-6)', 'Homocisteína', 'Insulina & HOMA-IR', 'Índice Omega-3', 'Ferritina & hierro', 'Cortisol', 'Testosterona / estrógeno'],
      it: ['Tutto di Core', 'Marcatori infiammatori (hsCRP, IL-6)', 'Omocisteina', 'Insulina & HOMA-IR', 'Indice Omega-3', 'Ferritina & ferro', 'Cortisolo', 'Testosterone / estrogeno'],
    },
  },
  {
    slug: 'longevity-complete',
    name: 'Longevity Complete',
    price: 499,
    markerCount: 37,
    featured: false,
    description: {
      de: 'Die umfassendste Analyse – für maximale Präzision und tiefe Einblicke in deine Gesundheit.',
      en: 'The most comprehensive analysis – for maximum precision and deep insights into your health.',
      fr: 'L\'analyse la plus complète – pour une précision maximale et des insights profonds sur votre santé.',
      es: 'El análisis más completo – para máxima precisión y conocimientos profundos sobre tu salud.',
      it: 'L\'analisi più completa – per la massima precisione e approfondimenti sulla tua salute.',
    },
    features: {
      de: ['Alles aus Pro', 'Hormonstatus vollständig', 'Schwermetalle & Mineralien', 'Darmgesundheit', 'Genetische Risikomarker', 'Longevity Score Baseline'],
      en: ['Everything from Pro', 'Full hormone status', 'Heavy metals & minerals', 'Gut health', 'Genetic risk markers', 'Longevity Score baseline'],
      fr: ['Tout de Pro', 'Statut hormonal complet', 'Métaux lourds & minéraux', 'Santé intestinale', 'Marqueurs de risque génétique', 'Référence Longevity Score'],
      es: ['Todo de Pro', 'Estado hormonal completo', 'Metales pesados & minerales', 'Salud intestinal', 'Marcadores de riesgo genético', 'Línea base Longevity Score'],
      it: ['Tutto di Pro', 'Stato ormonale completo', 'Metalli pesanti & minerali', 'Salute intestinale', 'Marcatori di rischio genetico', 'Baseline Longevity Score'],
    },
  },
];

const ADDONS: Addon[] = [
  {
    slug: 'vo2max-cpet',
    name: 'VO₂max CPET',
    price: 149,
    description: {
      de: 'Kardiopulmonaler Belastungstest – misst deine maximale Sauerstoffaufnahme, den stärksten Prädiktor für Langlebigkeit.',
      en: 'Cardiopulmonary exercise test – measures your maximum oxygen uptake, the strongest predictor of longevity.',
      fr: 'Test d\'effort cardiopulmonaire – mesure votre absorption maximale d\'oxygène, le plus fort prédicteur de longévité.',
      es: 'Test de ejercicio cardiopulmonar – mide tu absorción máxima de oxígeno, el predictor más fuerte de longevidad.',
      it: 'Test da sforzo cardiopolmonare – misura il tuo massimo assorbimento di ossigeno, il più forte predittore di longevità.',
    },
    features: {
      de: ['VO₂max-Messung', 'Anaerobe Schwelle', 'Herzfrequenzanalyse', 'Trainingsempfehlungen'],
      en: ['VO₂max measurement', 'Anaerobic threshold', 'Heart rate analysis', 'Training recommendations'],
      fr: ['Mesure VO₂max', 'Seuil anaérobie', 'Analyse de la fréquence cardiaque', 'Recommandations d\'entraînement'],
      es: ['Medición VO₂max', 'Umbral anaeróbico', 'Análisis de frecuencia cardíaca', 'Recomendaciones de entrenamiento'],
      it: ['Misurazione VO₂max', 'Soglia anaerobica', 'Analisi della frequenza cardiaca', 'Raccomandazioni di allenamento'],
    },
  },
  {
    slug: 'dexa-body-composition',
    name: 'DEXA Body Composition',
    price: 129,
    description: {
      de: 'Präzise Körperzusammensetzung via DEXA-Scan – Muskelmasse, Fettanteil und Knochendichte.',
      en: 'Precise body composition via DEXA scan – muscle mass, body fat percentage, and bone density.',
      fr: 'Composition corporelle précise via scan DEXA – masse musculaire, pourcentage de graisse et densité osseuse.',
      es: 'Composición corporal precisa mediante escáner DEXA – masa muscular, porcentaje de grasa y densidad ósea.',
      it: 'Composizione corporea precisa tramite scansione DEXA – massa muscolare, percentuale di grasso e densità ossea.',
    },
    features: {
      de: ['Viszeralfettmessung', 'Segmentale Muskelanalyse', 'Knochendichte (T-Score)', 'Fortschritts-Tracking'],
      en: ['Visceral fat measurement', 'Segmental muscle analysis', 'Bone density (T-score)', 'Progress tracking'],
      fr: ['Mesure de la graisse viscérale', 'Analyse musculaire segmentaire', 'Densité osseuse (T-score)', 'Suivi des progrès'],
      es: ['Medición de grasa visceral', 'Análisis muscular segmental', 'Densidad ósea (T-score)', 'Seguimiento del progreso'],
      it: ['Misurazione del grasso viscerale', 'Analisi muscolare segmentale', 'Densità ossea (T-score)', 'Monitoraggio dei progressi'],
    },
  },
  {
    slug: 'biological-age',
    name: 'Biological Age',
    price: 349,
    description: {
      de: 'Dein biologisches Alter basierend auf epigenetischen Markern – wie alt ist dein Körper wirklich?',
      en: 'Your biological age based on epigenetic markers – how old is your body really?',
      fr: 'Votre âge biologique basé sur des marqueurs épigénétiques – quel est le vrai âge de votre corps?',
      es: 'Tu edad biológica basada en marcadores epigenéticos – ¿qué tan viejo es tu cuerpo realmente?',
      it: 'La tua età biologica basata su marcatori epigenetici – quanto è davvero vecchio il tuo corpo?',
    },
    features: {
      de: ['Epigenetische Uhr (DNAm)', 'Biologisches vs. chronologisches Alter', 'Organ-Altersprofile', 'Interventionsempfehlungen'],
      en: ['Epigenetic clock (DNAm)', 'Biological vs. chronological age', 'Organ age profiles', 'Intervention recommendations'],
      fr: ['Horloge épigénétique (DNAm)', 'Âge biologique vs. chronologique', 'Profils d\'âge des organes', 'Recommandations d\'intervention'],
      es: ['Reloj epigenético (DNAm)', 'Edad biológica vs. cronológica', 'Perfiles de edad de órganos', 'Recomendaciones de intervención'],
      it: ['Orologio epigenetico (DNAm)', 'Età biologica vs. cronologica', 'Profili di età degli organi', 'Raccomandazioni di intervento'],
    },
  },
];

// ─── Sub-components (server, no interactivity) ────────────────────────────────

function CheckIcon({ featured }: { featured: boolean }) {
  return (
    <svg className={`mt-0.5 shrink-0 ${featured ? 'text-[#ceab84]' : 'text-[#0e393d]'}`} width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7l3 3L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function VitalcheckBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ceab84]/15 px-3 py-1 text-xs font-medium text-[#8a6a3e]">
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="5.5" stroke="#ceab84" />
        <path d="M3.5 6l1.8 1.8L8.5 4" stroke="#ceab84" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BiomarkersPage() {
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';
  const t = T[lang];

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <main className="mx-auto w-full max-w-[1060px] px-6 pt-28 pb-16 flex-1">

        {/* Hero */}
        <div className="mb-14 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84]">
            {t.tag}
          </p>
          <h1 className="font-serif text-5xl text-[#0e393d] mb-4">
            {t.h1}
          </h1>
          <p className="mx-auto max-w-xl text-base text-[#1c2a2b]/60 leading-relaxed">
            {t.sub}
          </p>
        </div>

        {/* Test packages */}
        <section className="mb-20">
          <div className="mb-8 flex items-center gap-4">
            <h2 className="font-serif text-2xl text-[#0e393d]">{t.packagesHeading}</h2>
            <div className="flex-1 h-px bg-[#0e393d]/10" />
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {PACKAGES.map((pkg, i) => (
              <div
                key={pkg.slug}
                className={`relative flex flex-col rounded-2xl p-7 transition-shadow hover:shadow-lg ${
                  pkg.featured
                    ? 'bg-[#0e393d] text-white shadow-xl ring-2 ring-[#ceab84]/40'
                    : 'bg-white text-[#1c2a2b] shadow-sm ring-1 ring-[#0e393d]/8'
                }`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                {pkg.featured && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-block rounded-full bg-[#ceab84] px-4 py-1 text-xs font-semibold text-[#0e393d] tracking-wide">
                      {t.recommended}
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <h3 className={`font-serif text-2xl mb-1 ${pkg.featured ? 'text-white' : 'text-[#0e393d]'}`}>
                    {pkg.name}
                  </h3>
                  <p className={`text-sm leading-relaxed ${pkg.featured ? 'text-white/70' : 'text-[#1c2a2b]/60'}`}>
                    {pkg.description[lang]}
                  </p>
                </div>

                <div className="mb-4">
                  <div className="flex items-baseline gap-1.5">
                    <span className={`font-serif text-4xl font-medium ${pkg.featured ? 'text-[#ceab84]' : 'text-[#0e393d]'}`}>
                      CHF {pkg.price}
                    </span>
                  </div>
                  <p className={`mt-1 text-xs ${pkg.featured ? 'text-white/50' : 'text-[#1c2a2b]/40'}`}>
                    {t.biomarkers(pkg.markerCount)}
                  </p>
                </div>

                <div className="mb-5">
                  <VitalcheckBadge label={t.vitalcheck} />
                </div>

                <ul className="mb-7 flex-1 space-y-2">
                  {pkg.features[lang].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckIcon featured={pkg.featured} />
                      <span className={pkg.featured ? 'text-white/80' : 'text-[#1c2a2b]/70'}>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/shop"
                  className={`block w-full rounded-xl py-3 text-center text-sm font-medium transition-colors ${
                    pkg.featured
                      ? 'bg-[#ceab84] text-[#0e393d] hover:bg-[#ceab84]/90'
                      : 'bg-[#0e393d] text-white hover:bg-[#0e393d]/90'
                  }`}
                >
                  {t.viewShop}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Add-ons */}
        <section className="mb-20">
          <div className="mb-8 flex items-center gap-4">
            <h2 className="font-serif text-2xl text-[#0e393d]">{t.addonsHeading}</h2>
            <div className="flex-1 h-px bg-[#0e393d]/10" />
            <p className="text-sm text-[#1c2a2b]/40">{t.addonsCombo}</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {ADDONS.map((addon) => (
              <div key={addon.slug} className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#0e393d]/8 hover:shadow-md transition-shadow">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h3 className="font-serif text-lg text-[#0e393d]">{addon.name}</h3>
                  <span className="shrink-0 font-serif text-xl text-[#0e393d]">CHF {addon.price}</span>
                </div>
                <p className="mb-4 flex-1 text-sm leading-relaxed text-[#1c2a2b]/60">
                  {addon.description[lang]}
                </p>
                <div className="mb-5">
                  <VitalcheckBadge label={t.vitalcheck} />
                </div>
                <ul className="mb-6 space-y-1.5">
                  {addon.features[lang].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-[#1c2a2b]/60">
                      <svg className="mt-0.5 shrink-0 text-[#ceab84]" width="13" height="13" viewBox="0 0 14 14" fill="none">
                        <path d="M2.5 7l3 3L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/shop"
                  className="block w-full rounded-xl border border-[#0e393d]/20 py-2.5 text-center text-sm font-medium text-[#0e393d] hover:bg-[#0e393d] hover:text-white transition-colors"
                >
                  {t.viewShop}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Trust strip */}
        <section className="rounded-2xl bg-[#0e393d]/5 px-8 py-8">
          <div className="grid gap-6 text-center sm:grid-cols-3">
            {(['🔬', '📊', '🔒'] as const).map((icon, idx) => (
              <div key={idx}>
                <div className="text-2xl mb-2">{icon}</div>
                <h3 className="font-serif text-base text-[#0e393d] mb-1">{t.trust[idx].title}</h3>
                <p className="text-sm text-[#1c2a2b]/55 leading-relaxed">{t.trust[idx].body}</p>
              </div>
            ))}
          </div>
        </section>

      </main>

      <PublicFooter />
    </div>
  );
}
