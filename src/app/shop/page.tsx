import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export const metadata = {
  title: 'Shop – Evida Life',
  description: 'Longevity Bluttest-Pakete und Add-ons. Wisse, wo du stehst.',
};

// ─── Types ───────────────────────────────────────────────────────────────────

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  marker_count: number | null;
  product_type: string;
  is_featured: boolean | null;
  slug: string | null;
  features: string[] | null;
};

// ─── Fallback data (mirrors seed) ────────────────────────────────────────────

const FALLBACK_PACKAGES: Product[] = [
  {
    id: 'core', name: 'Longevity Core', slug: 'longevity-core',
    description: 'Der ideale Einstieg – die wichtigsten Biomarker für deine Gesundheitsbasis.',
    price: 149, marker_count: 11, product_type: 'package', is_featured: false,
    features: ['Blutbild (CBC)', 'Lipidprofil', 'Blutzucker & HbA1c', 'Schilddrüse (TSH)', 'Vitamin D', 'Leber- & Nierenwerte'],
  },
  {
    id: 'pro', name: 'Longevity Pro', slug: 'longevity-pro',
    description: 'Unser meistgewähltes Paket – umfassende Analyse für ernsthafte Longevity-Optimierung.',
    price: 299, marker_count: 23, product_type: 'package', is_featured: true,
    features: ['Alles aus Core', 'Entzündungsmarker (hsCRP, IL-6)', 'Homocystein', 'Insulin & HOMA-IR', 'Omega-3-Index', 'Ferritin & Eisen', 'Cortisol', 'Testosteron / Östrogen'],
  },
  {
    id: 'complete', name: 'Longevity Complete', slug: 'longevity-complete',
    description: 'Die umfassendste Analyse – für maximale Präzision und tiefe Einblicke in deine Gesundheit.',
    price: 499, marker_count: 37, product_type: 'package', is_featured: false,
    features: ['Alles aus Pro', 'Hormonstatus vollständig', 'Schwermetalle & Mineralien', 'Darmgesundheit', 'Genetische Risikomarker', 'Longevity Score Baseline'],
  },
];

const FALLBACK_ADDONS: Product[] = [
  {
    id: 'vo2max', name: 'VO₂max CPET', slug: 'vo2max-cpet',
    description: 'Kardiopulmonaler Belastungstest – misst deine maximale Sauerstoffaufnahme, den stärksten Prädiktor für Langlebigkeit.',
    price: 149, marker_count: null, product_type: 'addon', is_featured: false,
    features: ['VO₂max-Messung', 'Anaerobe Schwelle', 'Herzfrequenzanalyse', 'Trainingsempfehlungen'],
  },
  {
    id: 'dexa', name: 'DEXA Body Composition', slug: 'dexa-body-composition',
    description: 'Präzise Körperzusammensetzung via DEXA-Scan – Muskelmasse, Fettanteil und Knochendichte.',
    price: 129, marker_count: null, product_type: 'addon', is_featured: false,
    features: ['Viszeralfettmessung', 'Segmentale Muskelanalyse', 'Knochendichte (T-Score)', 'Fortschritts-Tracking'],
  },
  {
    id: 'bioage', name: 'Biological Age', slug: 'biological-age',
    description: 'Dein biologisches Alter basierend auf epigenetischen Markern – wie alt ist dein Körper wirklich?',
    price: 349, marker_count: null, product_type: 'addon', is_featured: false,
    features: ['Epigenetische Uhr (DNAm)', 'Biologisches vs. chronologisches Alter', 'Organ-Altersprofile', 'Interventionsempfehlungen'],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function chf(amount: number) {
  return `CHF ${amount.toLocaleString('de-CH')}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function VitalcheckBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ceab84]/15 px-3 py-1 text-xs font-medium text-[#8a6a3e]">
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="5.5" stroke="#ceab84" />
        <path d="M3.5 6l1.8 1.8L8.5 4" stroke="#ceab84" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Gratis Vitalcheck inkl.
    </span>
  );
}

function PackageCard({ product, index }: { product: Product; index: number }) {
  const featured = product.is_featured;
  return (
    <div
      className={`relative flex flex-col rounded-2xl p-7 transition-shadow hover:shadow-lg ${
        featured
          ? 'bg-[#0e393d] text-white shadow-xl ring-2 ring-[#ceab84]/40'
          : 'bg-white text-[#1c2a2b] shadow-sm ring-1 ring-[#0e393d]/8'
      }`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {featured && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="inline-block rounded-full bg-[#ceab84] px-4 py-1 text-xs font-semibold text-[#0e393d] tracking-wide">
            EMPFOHLEN
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-5">
        <h3 className={`font-serif text-2xl mb-1 ${featured ? 'text-white' : 'text-[#0e393d]'}`}>
          {product.name}
        </h3>
        <p className={`text-sm leading-relaxed ${featured ? 'text-white/70' : 'text-[#1c2a2b]/60'}`}>
          {product.description}
        </p>
      </div>

      {/* Price */}
      <div className="mb-4">
        <div className="flex items-baseline gap-1.5">
          <span className={`font-serif text-4xl font-medium ${featured ? 'text-[#ceab84]' : 'text-[#0e393d]'}`}>
            {chf(product.price)}
          </span>
        </div>
        {product.marker_count && (
          <p className={`mt-1 text-xs ${featured ? 'text-white/50' : 'text-[#1c2a2b]/40'}`}>
            {product.marker_count} Biomarker analysiert
          </p>
        )}
      </div>

      {/* Vitalcheck */}
      <div className="mb-5">
        <VitalcheckBadge />
      </div>

      {/* Features */}
      {product.features && (
        <ul className="mb-7 flex-1 space-y-2">
          {product.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <svg className={`mt-0.5 shrink-0 ${featured ? 'text-[#ceab84]' : 'text-[#0e393d]'}`} width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 7l3 3L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className={featured ? 'text-white/80' : 'text-[#1c2a2b]/70'}>{f}</span>
            </li>
          ))}
        </ul>
      )}

      {/* CTA */}
      <Link
        href={`/shop/${product.slug ?? product.id}`}
        className={`block rounded-xl py-3 text-center text-sm font-medium transition-colors ${
          featured
            ? 'bg-[#ceab84] text-[#0e393d] hover:bg-[#ceab84]/90'
            : 'bg-[#0e393d] text-white hover:bg-[#0e393d]/90'
        }`}
      >
        Paket wählen
      </Link>
    </div>
  );
}

function AddonCard({ product }: { product: Product }) {
  return (
    <div className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#0e393d]/8 hover:shadow-md transition-shadow">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="font-serif text-lg text-[#0e393d]">{product.name}</h3>
        <span className="shrink-0 font-serif text-xl text-[#0e393d]">{chf(product.price)}</span>
      </div>
      <p className="mb-4 flex-1 text-sm leading-relaxed text-[#1c2a2b]/60">{product.description}</p>
      <div className="mb-5">
        <VitalcheckBadge />
      </div>
      {product.features && (
        <ul className="mb-6 space-y-1.5">
          {product.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-[#1c2a2b]/60">
              <svg className="mt-0.5 shrink-0 text-[#ceab84]" width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 7l3 3L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {f}
            </li>
          ))}
        </ul>
      )}
      <Link
        href={`/shop/${product.slug ?? product.id}`}
        className="block rounded-xl border border-[#0e393d]/20 py-2.5 text-center text-sm font-medium text-[#0e393d] hover:bg-[#0e393d] hover:text-white transition-colors"
      >
        Add-on wählen
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ShopPage() {
  // Fetch from Supabase — public RLS allows reading active, non-deleted products
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from('products')
    .select('id, name, description, price, marker_count, product_type, is_featured, slug, features')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('price', { ascending: true });

  // Split DB rows into packages and addons; fall back to hardcoded if empty
  const dbPackages = rows?.filter((p) => p.product_type === 'package') ?? [];
  const dbAddons   = rows?.filter((p) => p.product_type === 'addon') ?? [];

  const packages = dbPackages.length > 0 ? dbPackages : FALLBACK_PACKAGES;
  const addons   = dbAddons.length   > 0 ? dbAddons   : FALLBACK_ADDONS;

  return (
    <div className="min-h-screen bg-[#fafaf8]">

      {/* Nav bar */}
      <header className="border-b border-[#0e393d]/10 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="mx-auto max-w-[1060px] px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-serif text-xl text-[#0e393d] hover:text-[#ceab84] transition-colors">
            Evida Life
          </Link>
          <Link href="/" className="text-sm text-[#0e393d]/50 hover:text-[#0e393d] transition-colors">
            ← Zurück
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1060px] px-6 py-16">

        {/* Hero text */}
        <div className="mb-14 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84]">
            Longevity Testing
          </p>
          <h1 className="font-serif text-5xl text-[#0e393d] mb-4">
            Wisse, wo du stehst.
          </h1>
          <p className="mx-auto max-w-xl text-base text-[#1c2a2b]/60 leading-relaxed">
            Professionelle Bluttests über Partnerlabore – inklusive gratis Vitalcheck und
            persönlichem Longevity Dashboard.
          </p>
        </div>

        {/* ── Packages ─────────────────────────────────────────────────────── */}
        <section className="mb-20">
          <div className="mb-8 flex items-center gap-4">
            <h2 className="font-serif text-2xl text-[#0e393d]">Test-Pakete</h2>
            <div className="flex-1 h-px bg-[#0e393d]/10" />
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {packages.map((p, i) => (
              <PackageCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>

        {/* ── Addons ───────────────────────────────────────────────────────── */}
        <section className="mb-20">
          <div className="mb-8 flex items-center gap-4">
            <h2 className="font-serif text-2xl text-[#0e393d]">Add-ons</h2>
            <div className="flex-1 h-px bg-[#0e393d]/10" />
            <p className="text-sm text-[#1c2a2b]/40">Kombinierbar mit jedem Paket</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {addons.map((p) => (
              <AddonCard key={p.id} product={p} />
            ))}
          </div>
        </section>

        {/* ── Trust strip ──────────────────────────────────────────────────── */}
        <section className="rounded-2xl bg-[#0e393d]/5 px-8 py-8">
          <div className="grid gap-6 text-center sm:grid-cols-3">
            {[
              { icon: '🔬', title: 'Zertifizierte Partnerlabore', body: 'ISO-akkreditierte Labore in der Schweiz und Deutschland.' },
              { icon: '📊', title: 'Automatisches Dashboard', body: 'Alle Ergebnisse direkt in deinem Evida Life Profil.' },
              { icon: '🔒', title: 'Datenschutz first', body: 'Schweizer Datenhaltung, vollständig DSGVO- & nDSG-konform.' },
            ].map(({ icon, title, body }) => (
              <div key={title}>
                <div className="text-2xl mb-2">{icon}</div>
                <h3 className="font-serif text-base text-[#0e393d] mb-1">{title}</h3>
                <p className="text-sm text-[#1c2a2b]/55 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="mx-auto max-w-[1060px] px-6 py-8 border-t border-[#0e393d]/10 flex flex-wrap gap-6 text-sm text-[#0e393d]/40">
        <Link href="/legal" className="hover:text-[#0e393d] transition-colors">Impressum</Link>
        <Link href="/privacy" className="hover:text-[#0e393d] transition-colors">Datenschutz</Link>
        <Link href="/terms" className="hover:text-[#0e393d] transition-colors">AGB</Link>
      </footer>

    </div>
  );
}
