'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useCart } from '@/lib/cart';
import { createClient } from '@/lib/supabase/client';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

// ─── Types ────────────────────────────────────────────────────────────────────

type I18n = Record<string, string> | string | null;

type Product = {
  id: string;
  name: I18n;
  short_description: I18n;
  price_chf: number | null;
  slug: string | null;
  image_url: string | null;
};

type Lang = 'de' | 'en' | 'fr' | 'es' | 'it';

// ─── Translations ─────────────────────────────────────────────────────────────

const T: Record<Lang, {
  title: string;
  empty: string;
  browseShop: string;
  continueShopping: string;
  subtotal: string;
  tax: string;
  total: string;
  checkout: string;
  loading: string;
  checkoutError: string;
  qty: string;
}> = {
  de: {
    title: 'Warenkorb',
    empty: 'Dein Warenkorb ist leer.',
    browseShop: '→ Zum Shop',
    continueShopping: '← Weiter einkaufen',
    subtotal: 'Zwischensumme',
    tax: 'MwSt 8.1 %',
    total: 'Gesamtbetrag',
    checkout: 'Zur Kasse',
    loading: 'Lade …',
    checkoutError: 'Fehler beim Checkout. Bitte erneut versuchen.',
    qty: 'Menge',
  },
  en: {
    title: 'Your Cart',
    empty: 'Your cart is empty.',
    browseShop: '→ Browse Shop',
    continueShopping: '← Continue Shopping',
    subtotal: 'Subtotal',
    tax: 'VAT 8.1 %',
    total: 'Total',
    checkout: 'Proceed to Checkout',
    loading: 'Loading…',
    checkoutError: 'Checkout failed. Please try again.',
    qty: 'Qty',
  },
  fr: {
    title: 'Votre panier',
    empty: 'Votre panier est vide.',
    browseShop: '→ Voir la boutique',
    continueShopping: '← Continuer les achats',
    subtotal: 'Sous-total',
    tax: 'TVA 8.1 %',
    total: 'Total',
    checkout: 'Passer à la caisse',
    loading: 'Chargement…',
    checkoutError: 'Erreur de paiement. Veuillez réessayer.',
    qty: 'Qté',
  },
  es: {
    title: 'Tu carrito',
    empty: 'Tu carrito está vacío.',
    browseShop: '→ Ver la tienda',
    continueShopping: '← Seguir comprando',
    subtotal: 'Subtotal',
    tax: 'IVA 8.1 %',
    total: 'Total',
    checkout: 'Proceder al pago',
    loading: 'Cargando…',
    checkoutError: 'Error al pagar. Inténtalo de nuevo.',
    qty: 'Cant.',
  },
  it: {
    title: 'Il tuo carrello',
    empty: 'Il tuo carrello è vuoto.',
    browseShop: '→ Visita il negozio',
    continueShopping: '← Continua a fare acquisti',
    subtotal: 'Subtotale',
    tax: 'IVA 8.1 %',
    total: 'Totale',
    checkout: 'Procedi al pagamento',
    loading: 'Caricamento…',
    checkoutError: 'Errore al pagamento. Riprova.',
    qty: 'Qtà',
  },
};

const SWISS_TAX = 0.081;
const VALID_LANGS = ['de', 'en', 'fr', 'es', 'it'] as const;

function loc(field: I18n, lng: string): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field[lng] ?? field['en'] ?? field['de'] ?? '';
}

function chf(amount: number) {
  return `CHF ${amount.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CartContent({ locale }: { locale: string }) {
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';
  const t = T[lang];
  const { items, removeItem, updateQuantity, clearCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [fetching, setFetching] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState(false);

  // Fetch product details when cart items change
  useEffect(() => {
    if (!items.length) { setProducts([]); return; }
    const ids = items.map((i) => i.productId);
    setFetching(true);
    const supabase = createClient();
    supabase
      .from('products')
      .select('id, name, short_description, price_chf, slug, image_url')
      .in('id', ids)
      .eq('is_active', true)
      .is('deleted_at', null)
      .then(({ data }) => {
        setProducts(data ?? []);
        setFetching(false);
      });
  }, [items]);

  const subtotal = items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId);
    return sum + (product?.price_chf ?? 0) * item.quantity;
  }, 0);
  const tax = Math.round(subtotal * SWISS_TAX * 100) / 100;
  const total = subtotal + tax;

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    setCheckoutError(false);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })) }),
      });
      const data = await res.json();
      if (data.url) {
        clearCart();
        window.location.href = data.url;
      } else {
        throw new Error(data.error ?? 'Checkout failed');
      }
    } catch {
      setCheckoutLoading(false);
      setCheckoutError(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <main className="mx-auto w-full max-w-3xl px-6 pt-28 pb-20 flex-1">

        <h1 className="font-serif text-4xl text-[#0e393d] mb-10">{t.title}</h1>

        {/* Empty state */}
        {!fetching && items.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-[#1c2a2b]/50 text-base mb-6">{t.empty}</p>
            <Link
              href="/shop"
              className="inline-block bg-[#0e393d] text-[#f2ebdb] text-sm font-medium px-6 py-3 rounded-full hover:bg-[#1a5055] transition-colors"
            >
              {t.browseShop}
            </Link>
          </div>
        )}

        {fetching && (
          <p className="text-[#1c2a2b]/40 text-sm py-8">{t.loading}</p>
        )}

        {/* Cart items */}
        {!fetching && items.length > 0 && (
          <div className="space-y-4 mb-10">
            {items.map((item) => {
              const product = products.find((p) => p.id === item.productId);
              const name = product ? loc(product.name, lang) : item.productId;
              const linePrice = (product?.price_chf ?? 0) * item.quantity;

              return (
                <div
                  key={item.productId}
                  className="flex items-center gap-4 rounded-2xl bg-white shadow-sm ring-1 ring-[#0e393d]/8 p-4"
                >
                  {/* Image */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-[#0e393d]/5">
                    {product?.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`${product.image_url}?width=128&height=128&resize=cover`}
                        alt={name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#0e393d]/20">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Name + subtitle */}
                  <div className="flex-1 min-w-0">
                    {product?.slug ? (
                      <Link
                        href={`/shop/${product.slug}`}
                        className="font-medium text-[#0e393d] hover:underline line-clamp-1 block"
                      >
                        {name}
                      </Link>
                    ) : (
                      <span className="font-medium text-[#0e393d] line-clamp-1 block">{name}</span>
                    )}
                    {product && (
                      <p className="text-sm text-[#1c2a2b]/45 line-clamp-1">
                        {loc(product.short_description, lang)}
                      </p>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="flex items-center rounded-xl border border-[#0e393d]/15 overflow-hidden shrink-0">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="w-8 h-8 flex items-center justify-center text-[#0e393d] hover:bg-[#0e393d]/5 disabled:opacity-30 transition-colors text-lg font-light"
                      aria-label="Decrease"
                    >
                      −
                    </button>
                    <span className="w-7 text-center text-sm font-medium text-[#0e393d]">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      disabled={item.quantity >= 10}
                      className="w-8 h-8 flex items-center justify-center text-[#0e393d] hover:bg-[#0e393d]/5 disabled:opacity-30 transition-colors text-lg font-light"
                      aria-label="Increase"
                    >
                      +
                    </button>
                  </div>

                  {/* Line price */}
                  <span className="shrink-0 w-24 text-right font-medium text-[#0e393d] text-sm">
                    {chf(linePrice)}
                  </span>

                  {/* Remove */}
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-[#1c2a2b]/30 hover:text-red-500 hover:bg-red-50 transition-colors"
                    aria-label="Remove item"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Totals + checkout */}
        {!fetching && items.length > 0 && (
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-[#0e393d]/8 p-6 max-w-sm ml-auto">
            <div className="space-y-2.5 mb-5">
              <div className="flex justify-between text-sm text-[#1c2a2b]/60">
                <span>{t.subtotal}</span>
                <span>{chf(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-[#1c2a2b]/60">
                <span>{t.tax}</span>
                <span>{chf(tax)}</span>
              </div>
              <div className="border-t border-[#0e393d]/10 pt-3 flex justify-between font-semibold text-[#0e393d]">
                <span>{t.total}</span>
                <span className="font-serif text-xl">{chf(total)}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="w-full rounded-xl bg-[#0e393d] py-3.5 text-sm font-medium text-white hover:bg-[#0e393d]/90 disabled:opacity-60 transition-colors"
            >
              {checkoutLoading ? '…' : t.checkout}
            </button>

            {checkoutError && (
              <p className="mt-3 rounded-lg bg-[#ceab84]/15 px-3 py-2 text-sm text-[#8a6a3e]">
                {t.checkoutError}
              </p>
            )}

            <div className="mt-4 text-center">
              <Link
                href="/shop"
                className="text-sm text-[#0e393d]/50 hover:text-[#0e393d] transition-colors"
              >
                {t.continueShopping}
              </Link>
            </div>
          </div>
        )}

      </main>

      <PublicFooter />
    </div>
  );
}
