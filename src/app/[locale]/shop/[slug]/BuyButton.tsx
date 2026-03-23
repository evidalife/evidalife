'use client';

import { useState } from 'react';

export default function BuyButton({ productId, label }: { productId: string; label: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    setError(false);
    try {
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
    } catch {
      setLoading(false);
      setError(true);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full rounded-xl bg-[#0e393d] py-4 text-base font-medium text-white hover:bg-[#0e393d]/90 disabled:opacity-60 transition-colors"
      >
        {loading ? '…' : label}
      </button>
      {error && (
        <p className="mt-2 rounded-lg bg-[#ceab84]/15 px-3 py-2 text-sm text-[#8a6a3e]">
          Checkout coming soon — join the waitlist to be notified.
        </p>
      )}
    </div>
  );
}
