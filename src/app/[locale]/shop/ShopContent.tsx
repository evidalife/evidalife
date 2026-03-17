'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

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

function chf(amount: number) {
  return `CHF ${amount.toLocaleString('de-CH')}`;
}

function getLocalized(field: LocalizedString | null | undefined, lng: string): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field[lng] ?? field['de'] ?? '';
}

function getLocalizedFeatures(features: LocalizedArray, lng: string): string[] {
  if (!features) return [];
  if (Array.isArray(features)) return features;
  return features[lng] ?? features['de'] ?? [];
}

function VitalcheckBadge() {
  const t = useTranslations('shop.packages');
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ceab84]/15 px-3 py-1 text-xs font-medium text-[#8a6a3e]">
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="5.5" stroke="#ceab84" />
        <path d="M3.5 6l1.8 1.8L8.5 4" stroke="#ceab84" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {t('vitalcheck')}
    </span>
  );
}

function PackageCard({ product, index, onCheckoutError }: { product: Product; index: number; onCheckoutError: () => void }) {
  const t = useTranslations('shop.packages');
  const lng = useLocale();
  const featured = product.is_featured;
  const [loading, setLoading] = useState(false);
  const features = getLocalizedFeatures(product.features, lng);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      await startCheckout(product.id);
    } catch {
      setLoading(false);
      onCheckoutError();
    }
  };

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
            {t('featured')}
          </span>
        </div>
      )}

      <div className="mb-5">
        <h3 className={`font-serif text-2xl mb-1 ${featured ? 'text-white' : 'text-[#0e393d]'}`}>
          {getLocalized(product.name, lng)}
        </h3>
        <p className={`text-sm leading-relaxed ${featured ? 'text-white/70' : 'text-[#1c2a2b]/60'}`}>
          {getLocalized(product.description, lng)}
        </p>
      </div>

      <div className="mb-4">
        <div className="flex items-baseline gap-1.5">
          <span className={`font-serif text-4xl font-medium ${featured ? 'text-[#ceab84]' : 'text-[#0e393d]'}`}>
            {chf(product.price)}
          </span>
        </div>
        {product.marker_count && (
          <p className={`mt-1 text-xs ${featured ? 'text-white/50' : 'text-[#1c2a2b]/40'}`}>
            {t('biomarkers', { count: product.marker_count })}
          </p>
        )}
      </div>

      <div className="mb-5">
        <VitalcheckBadge />
      </div>

      {features.length > 0 && (
        <ul className="mb-7 flex-1 space-y-2">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <svg className={`mt-0.5 shrink-0 ${featured ? 'text-[#ceab84]' : 'text-[#0e393d]'}`} width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 7l3 3L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className={featured ? 'text-white/80' : 'text-[#1c2a2b]/70'}>{f}</span>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={handleCheckout}
        disabled={loading}
        className={`block w-full rounded-xl py-3 text-center text-sm font-medium transition-colors disabled:opacity-60 ${
          featured
            ? 'bg-[#ceab84] text-[#0e393d] hover:bg-[#ceab84]/90'
            : 'bg-[#0e393d] text-white hover:bg-[#0e393d]/90'
        }`}
      >
        {loading ? '…' : t('cta')}
      </button>
    </div>
  );
}

function AddonCard({ product, onCheckoutError }: { product: Product; onCheckoutError: () => void }) {
  const t = useTranslations('shop');
  const lng = useLocale();
  const [loading, setLoading] = useState(false);
  const features = getLocalizedFeatures(product.features, lng);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      await startCheckout(product.id);
    } catch {
      setLoading(false);
      onCheckoutError();
    }
  };

  return (
    <div className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#0e393d]/8 hover:shadow-md transition-shadow">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="font-serif text-lg text-[#0e393d]">{getLocalized(product.name, lng)}</h3>
        <span className="shrink-0 font-serif text-xl text-[#0e393d]">{chf(product.price)}</span>
      </div>
      <p className="mb-4 flex-1 text-sm leading-relaxed text-[#1c2a2b]/60">{getLocalized(product.description, lng)}</p>
      <div className="mb-5">
        <VitalcheckBadge />
      </div>
      {features.length > 0 && (
        <ul className="mb-6 space-y-1.5">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-[#1c2a2b]/60">
              <svg className="mt-0.5 shrink-0 text-[#ceab84]" width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 7l3 3L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {f}
            </li>
          ))}
        </ul>
      )}
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="block w-full rounded-xl border border-[#0e393d]/20 py-2.5 text-center text-sm font-medium text-[#0e393d] hover:bg-[#0e393d] hover:text-white transition-colors disabled:opacity-60"
      >
        {loading ? '…' : t('addons.cta')}
      </button>
    </div>
  );
}

interface ShopContentProps {
  packages: Product[];
  addons: Product[];
}

export default function ShopContent({ packages, addons }: ShopContentProps) {
  const t = useTranslations('shop');
  const trust = t.raw('trust') as { title: string; body: string }[];
  const trustIcons = ['🔬', '📊', '🔒'];
  const [checkoutError, setCheckoutError] = useState(false);

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

        {/* Hero text */}
        <div className="mb-14 text-center">
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

        {/* Packages */}
        <section className="mb-20">
          <div className="mb-8 flex items-center gap-4">
            <h2 className="font-serif text-2xl text-[#0e393d]">{t('packages.heading')}</h2>
            <div className="flex-1 h-px bg-[#0e393d]/10" />
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {packages.map((p, i) => (
              <PackageCard key={p.id} product={p} index={i} onCheckoutError={handleCheckoutError} />
            ))}
          </div>
        </section>

        {/* Add-ons */}
        <section className="mb-20">
          <div className="mb-8 flex items-center gap-4">
            <h2 className="font-serif text-2xl text-[#0e393d]">{t('addons.heading')}</h2>
            <div className="flex-1 h-px bg-[#0e393d]/10" />
            <p className="text-sm text-[#1c2a2b]/40">{t('addons.combo')}</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {addons.map((p) => (
              <AddonCard key={p.id} product={p} onCheckoutError={handleCheckoutError} />
            ))}
          </div>
        </section>

        {/* Trust strip */}
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

      </main>

      <PublicFooter />
    </div>
  );
}
