'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

// ─── Types ────────────────────────────────────────────────────────────────────

type I18nStr = Record<string, string> | string | null;

export type Product = {
  id: string;
  name: I18nStr;
  description: I18nStr;
  short_description: I18nStr;
  price_chf: number | null;
  compare_at_price_chf: number | null;
  product_type: string | null;
  is_featured: boolean | null;
  slug: string | null;
  image_url: string | null;
  metadata: { marker_count?: number } | null;
};

// ─── Type labels (5 languages) ────────────────────────────────────────────────

const TYPE_LABELS: Record<string, Record<string, string>> = {
  test_package:      { de: 'Testpakete',        en: 'Test Packages',     fr: 'Forfaits de test',   es: 'Paquetes de análisis', it: 'Pacchetti test' },
  addon_test:        { de: 'Erweiterungen',      en: 'Add-ons',           fr: 'Compléments',        es: 'Complementos',         it: 'Aggiunte' },
  single_biomarker:  { de: 'Einzelbiomarker',    en: 'Single Biomarkers', fr: 'Biomarqueurs seuls', es: 'Biomarcadores simples', it: 'Biomarcatori singoli' },
  supplement:        { de: 'Nahrungsergänzung',  en: 'Supplements',       fr: 'Compléments',        es: 'Suplementos',          it: 'Integratori' },
  functional_food:   { de: 'Functional Food',    en: 'Functional Food',   fr: 'Alimentation fonctionnelle', es: 'Alimentos funcionales', it: 'Cibo funzionale' },
  food:              { de: 'Lebensmittel',        en: 'Food',              fr: 'Alimentation',       es: 'Alimentación',         it: 'Alimentazione' },
  food_product:      { de: 'Lebensmittel',        en: 'Food',              fr: 'Alimentation',       es: 'Alimentación',         it: 'Alimentazione' },
  ready_meal:        { de: 'Fertiggerichte',      en: 'Ready Meals',       fr: 'Plats préparés',     es: 'Platos preparados',    it: 'Pasti pronti' },
  subscription:      { de: 'Abonnements',         en: 'Subscriptions',     fr: 'Abonnements',        es: 'Suscripciones',        it: 'Abbonamenti' },
  meal_subscription: { de: 'Mahlzeiten-Abo',      en: 'Meal Plans',        fr: 'Plans repas',        es: 'Planes de comida',     it: 'Piani pasto' },
  program:           { de: 'Programme',           en: 'Programs',          fr: 'Programmes',         es: 'Programas',            it: 'Programmi' },
  bundle:            { de: 'Bundles',             en: 'Bundles',           fr: 'Offres groupées',    es: 'Paquetes',             it: 'Bundle' },
  digital_product:   { de: 'Digital',             en: 'Digital',           fr: 'Numérique',          es: 'Digital',              it: 'Digitale' },
  device:            { de: 'Geräte',              en: 'Devices',           fr: 'Appareils',          es: 'Dispositivos',         it: 'Dispositivi' },
  coaching_session:  { de: 'Coaching',            en: 'Coaching',          fr: 'Coaching',           es: 'Coaching',             it: 'Coaching' },
  merch:             { de: 'Merchandise',         en: 'Merchandise',       fr: 'Marchandise',        es: 'Merchandising',        it: 'Merchandise' },
  merchandise:       { de: 'Merchandise',         en: 'Merchandise',       fr: 'Marchandise',        es: 'Merchandising',        it: 'Merchandise' },
};

function typeLabel(type: string, lng: string): string {
  return TYPE_LABELS[type]?.[lng] ?? TYPE_LABELS[type]?.['en'] ?? type;
}

// ─── All pill label ────────────────────────────────────────────────────────────

const ALL_LABEL: Record<string, string> = {
  de: 'Alle', en: 'All', fr: 'Tout', es: 'Todo', it: 'Tutti',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loc(field: I18nStr, lng: string): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field[lng] ?? field['en'] ?? field['de'] ?? '';
}

function chf(amount: number) {
  return `CHF ${amount.toLocaleString('de-CH')}`;
}

async function startCheckout(productId: string): Promise<void> {
  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productIds: [productId] }),
  });
  const data = await res.json();
  if (data.url) {
    window.location.href = data.url;
  } else {
    throw new Error(data.error ?? 'Checkout failed');
  }
}

// ─── Product card ─────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onCheckoutError,
}: {
  product: Product;
  onCheckoutError: () => void;
}) {
  const t = useTranslations('shop');
  const lng = useLocale();
  const [loading, setLoading] = useState(false);
  const featured = product.is_featured ?? false;
  const isTestPackage = product.product_type === 'test_package';
  const markerCount = product.metadata?.marker_count;

  const handleCheckout = async () => {
    setLoading(true);
    try {
      await startCheckout(product.id);
    } catch {
      setLoading(false);
      onCheckoutError();
    }
  };

  const name = loc(product.name, lng);
  const subtitle = loc(product.short_description, lng) || loc(product.description, lng);

  // Image + name area — wrapped in Link when slug exists
  const imageEl = product.image_url ? (
    <div className="mb-0 -mx-7 -mt-7 rounded-t-2xl overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${product.image_url}?width=400&height=200&resize=cover`}
        alt={name}
        className="w-full h-32 object-cover"
      />
    </div>
  ) : null;

  const nameEl = (
    <div className="mb-4 flex-1 pt-5">
      <h3 className={`font-serif text-xl mb-1 ${featured ? 'text-white' : 'text-[#0e393d]'}`}>
        {name || '—'}
      </h3>
      {subtitle && (
        <p className={`text-sm leading-relaxed ${featured ? 'text-white/70' : 'text-[#1c2a2b]/60'}`}>
          {subtitle}
        </p>
      )}
    </div>
  );

  const clickableContent = product.slug ? (
    <Link href={`/shop/${product.slug}`} className="block group/link">
      {imageEl}
      {nameEl}
    </Link>
  ) : (
    <>
      {imageEl}
      {nameEl}
    </>
  );

  return (
    <div
      className={`relative flex flex-col rounded-2xl p-7 transition-shadow hover:shadow-lg ${
        featured
          ? 'bg-[#0e393d] text-white shadow-xl ring-2 ring-[#ceab84]/40'
          : 'bg-white text-[#1c2a2b] shadow-sm ring-1 ring-[#0e393d]/8'
      }`}
    >
      {featured && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="inline-block rounded-full bg-[#ceab84] px-4 py-1 text-xs font-semibold text-[#0e393d] tracking-wide">
            {t('packages.featured')}
          </span>
        </div>
      )}

      {clickableContent}

      <div className="mb-5">
        <div className="flex items-baseline gap-2">
          <span className={`font-serif text-3xl font-medium ${featured ? 'text-[#ceab84]' : 'text-[#0e393d]'}`}>
            {product.price_chf != null ? chf(product.price_chf) : '—'}
          </span>
          {product.compare_at_price_chf != null && product.compare_at_price_chf > (product.price_chf ?? 0) && (
            <span className={`text-sm line-through ${featured ? 'text-white/40' : 'text-[#1c2a2b]/35'}`}>
              {chf(product.compare_at_price_chf)}
            </span>
          )}
        </div>
        {markerCount != null && (
          <p className={`mt-1 text-xs ${featured ? 'text-white/50' : 'text-[#1c2a2b]/40'}`}>
            {t('packages.biomarkers', { count: markerCount })}
          </p>
        )}
      </div>

      <button
        onClick={handleCheckout}
        disabled={loading}
        className={`block w-full rounded-xl py-3 text-center text-sm font-medium transition-colors disabled:opacity-60 ${
          featured
            ? 'bg-[#ceab84] text-[#0e393d] hover:bg-[#ceab84]/90'
            : 'bg-[#0e393d] text-white hover:bg-[#0e393d]/90'
        }`}
      >
        {loading ? '…' : t('buyNow')}
      </button>

      {isTestPackage && (
        <Link
          href="/biomarkers"
          className={`mt-3 block text-center text-xs transition-colors ${
            featured ? 'text-white/50 hover:text-white/80' : 'text-[#1c2a2b]/40 hover:text-[#0e393d]'
          }`}
        >
          {t('viewBiomarkers')}
        </Link>
      )}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({
  heading,
  sub,
  products,
  onCheckoutError,
}: {
  heading: string;
  sub?: string;
  products: Product[];
  onCheckoutError: () => void;
}) {
  return (
    <section className="mb-20">
      <div className="mb-8 flex items-center gap-4">
        <h2 className="font-serif text-2xl text-[#0e393d]">{heading}</h2>
        <div className="flex-1 h-px bg-[#0e393d]/10" />
        {sub && <p className="text-sm text-[#1c2a2b]/40">{sub}</p>}
      </div>
      <div className="grid gap-6 sm:grid-cols-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} onCheckoutError={onCheckoutError} />
        ))}
      </div>
    </section>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ShopContent({ products }: { products: Product[] }) {
  const t = useTranslations('shop');
  const lng = useLocale();
  const trust = t.raw('trust') as { title: string; body: string }[];
  const trustIcons = ['🔬', '📊', '🔒'];
  const [checkoutError, setCheckoutError] = useState(false);
  const [activeType, setActiveType] = useState<string | null>(null);

  // Unique product types present in the data (preserve insertion order)
  const availableTypes = Array.from(
    new Set(products.map((p) => p.product_type).filter((type): type is string => type != null))
  );

  // Filter products by active type (null = show all)
  const displayProducts = activeType
    ? products.filter((p) => p.product_type === activeType)
    : products;

  const packages  = displayProducts.filter((p) => p.product_type === 'test_package');
  const addons    = displayProducts.filter((p) => p.product_type === 'addon_test');
  const food      = displayProducts.filter((p) => p.product_type === 'food' || p.product_type === 'food_product');
  const subs      = displayProducts.filter((p) => p.product_type === 'subscription' || p.product_type === 'meal_subscription');
  const other     = displayProducts.filter((p) =>
    !['test_package', 'addon_test', 'food', 'food_product', 'subscription', 'meal_subscription'].includes(p.product_type ?? '')
  );

  const handleCheckoutError = () => setCheckoutError(true);

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <main className="mx-auto w-full max-w-[1060px] px-6 pt-28 pb-16 flex-1">

        {/* Checkout error banner */}
        {checkoutError && (
          <div className="mb-8 rounded-xl bg-[#ceab84]/15 border border-[#ceab84]/30 px-5 py-4 text-sm text-[#8a6a3e] flex items-center justify-between gap-4">
            <span>{t('checkoutComingSoon')}</span>
            <button
              onClick={() => setCheckoutError(false)}
              className="shrink-0 text-[#ceab84] hover:text-[#8a6a3e] transition-colors"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {/* Hero */}
        <div className="mb-10 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84]">
            {t('tag')}
          </p>
          <h1 className="font-serif text-5xl text-[#0e393d] mb-4">
            {t('h1')}
          </h1>
          <p className="mx-auto max-w-xl text-base text-[#1c2a2b]/60 leading-relaxed">
            {t('sub')}
          </p>
        </div>

        {/* Filter pills */}
        {availableTypes.length > 1 && (
          <div className="mb-12 flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => setActiveType(null)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeType === null
                  ? 'bg-[#0e393d] text-white'
                  : 'border border-[#0e393d]/20 text-[#0e393d] hover:bg-[#0e393d]/5'
              }`}
            >
              {ALL_LABEL[lng] ?? 'All'}
            </button>
            {availableTypes.map((type) => (
              <button
                key={type}
                onClick={() => setActiveType(activeType === type ? null : type)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeType === type
                    ? 'bg-[#0e393d] text-white'
                    : 'border border-[#0e393d]/20 text-[#0e393d] hover:bg-[#0e393d]/5'
                }`}
              >
                {typeLabel(type, lng)}
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {products.length === 0 && (
          <div className="py-20 text-center text-[#1c2a2b]/40 text-sm">
            {t('emptyState')}
          </div>
        )}

        {/* Product sections */}
        {packages.length > 0 && (
          <Section
            heading={t('packages.heading')}
            products={packages}
            onCheckoutError={handleCheckoutError}
          />
        )}
        {addons.length > 0 && (
          <Section
            heading={t('addons.heading')}
            sub={t('addons.combo')}
            products={addons}
            onCheckoutError={handleCheckoutError}
          />
        )}
        {food.length > 0 && (
          <Section
            heading={typeLabel('food', lng)}
            products={food}
            onCheckoutError={handleCheckoutError}
          />
        )}
        {subs.length > 0 && (
          <Section
            heading={typeLabel('subscription', lng)}
            products={subs}
            onCheckoutError={handleCheckoutError}
          />
        )}
        {other.length > 0 && (
          <Section
            heading={typeLabel(other[0].product_type ?? 'other', lng)}
            products={other}
            onCheckoutError={handleCheckoutError}
          />
        )}

        {/* Trust strip */}
        {products.length > 0 && (
          <section className="rounded-2xl bg-[#0e393d]/5 px-8 py-8">
            <div className="grid gap-6 text-center sm:grid-cols-3">
              {trust.map(({ title, body }, idx) => (
                <div key={title}>
                  <div className="text-2xl mb-2">{trustIcons[idx]}</div>
                  <h3 className="font-serif text-base text-[#0e393d] mb-1">{title}</h3>
                  <p className="text-sm text-[#1c2a2b]/55 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>

      <PublicFooter />
    </div>
  );
}
