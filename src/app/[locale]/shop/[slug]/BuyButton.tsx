'use client';

import { useState } from 'react';
import { useCart } from '@/lib/cart';

type Lang = 'de' | 'en' | 'fr' | 'es' | 'it';

const T: Record<Lang, { addToCart: string; added: string; buyNow: string; qty: string; checkoutError: string }> = {
  de: { addToCart: 'In den Warenkorb', added: '✓ Hinzugefügt', buyNow: 'Direkt kaufen →', qty: 'Menge', checkoutError: 'Fehler beim Checkout. Bitte erneut versuchen.' },
  en: { addToCart: 'Add to Cart', added: '✓ Added', buyNow: 'Buy Now →', qty: 'Quantity', checkoutError: 'Checkout failed. Please try again.' },
  fr: { addToCart: 'Ajouter au panier', added: '✓ Ajouté', buyNow: 'Acheter →', qty: 'Quantité', checkoutError: 'Erreur de paiement. Veuillez réessayer.' },
  es: { addToCart: 'Añadir al carrito', added: '✓ Añadido', buyNow: 'Comprar →', qty: 'Cantidad', checkoutError: 'Error al pagar. Inténtalo de nuevo.' },
  it: { addToCart: 'Aggiungi al carrello', added: '✓ Aggiunto', buyNow: 'Acquista →', qty: 'Quantità', checkoutError: 'Errore al pagamento. Riprova.' },
};

const VALID_LANGS = ['de', 'en', 'fr', 'es', 'it'] as const;

export default function BuyButton({ productId, locale }: { productId: string; locale: string }) {
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';
  const t = T[lang];
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState(false);

  const handleAddToCart = () => {
    addItem(productId, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleBuyNow = async () => {
    setBuyLoading(true);
    setBuyError(false);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ productId, quantity: qty }] }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error ?? 'Checkout failed');
      }
    } catch {
      setBuyLoading(false);
      setBuyError(true);
    }
  };

  return (
    <div className="space-y-3">
      {/* Quantity selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-[#1c2a2b]/50">{t.qty}</span>
        <div className="flex items-center rounded-xl border border-[#0e393d]/15 overflow-hidden">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="w-9 h-9 flex items-center justify-center text-[#0e393d] hover:bg-[#0e393d]/5 transition-colors text-lg font-light"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-9 text-center text-sm font-medium text-[#0e393d]">{qty}</span>
          <button
            onClick={() => setQty((q) => Math.min(10, q + 1))}
            className="w-9 h-9 flex items-center justify-center text-[#0e393d] hover:bg-[#0e393d]/5 transition-colors text-lg font-light"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>

      {/* Add to Cart */}
      <button
        onClick={handleAddToCart}
        className="w-full rounded-xl bg-[#0e393d] py-4 text-base font-medium text-white hover:bg-[#0e393d]/90 transition-colors"
      >
        {added ? t.added : t.addToCart}
      </button>

      {/* Buy Now */}
      <button
        onClick={handleBuyNow}
        disabled={buyLoading}
        className="w-full rounded-xl border border-[#0e393d]/20 py-2.5 text-sm font-medium text-[#0e393d] hover:bg-[#0e393d]/5 disabled:opacity-60 transition-colors"
      >
        {buyLoading ? '…' : t.buyNow}
      </button>

      {buyError && (
        <p className="rounded-lg bg-[#ceab84]/15 px-3 py-2 text-sm text-[#8a6a3e]">
          {t.checkoutError}
        </p>
      )}
    </div>
  );
}
