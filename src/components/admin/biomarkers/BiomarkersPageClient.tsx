'use client';

import { useState, useEffect } from 'react';
import BiomarkersManager, { ItemDefinition } from './BiomarkersManager';
import UnitConversionsManager from './UnitConversionsManager';
import UnitsOverview from './UnitsOverview';
import { createClient } from '@/lib/supabase/client';

type Tab = 'biomarkers' | 'conversions' | 'units' | 'products';

// ── Linked Products tab ──────────────────────────────────────────────────────

function extractName(val: unknown): string {
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    for (const key of ['en', 'de', 'fr', 'es', 'it']) {
      if (typeof obj[key] === 'string' && obj[key]) return obj[key] as string;
    }
    for (const v of Object.values(obj)) {
      if (typeof v === 'string' && v) return v;
    }
  }
  return String(val ?? '');
}

type ProductRow = {
  id: string;
  name: string;
  product_type: string | null;
  biomarkers: { id: string; name: string }[];
};

function LinkedProductsTab() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('product_biomarkers')
      .select('product_id, biomarker_id, products(id, name, product_type), biomarkers(id, name)')
      .then(({ data, error }) => {
        if (error || !data) { setLoading(false); return; }

        const map = new Map<string, ProductRow>();
        for (const row of data as any[]) {
          const p = row.products;
          const b = row.biomarkers;
          if (!p) continue;
          if (!map.has(p.id)) map.set(p.id, { id: p.id, name: extractName(p.name), product_type: p.product_type, biomarkers: [] });
          if (b) map.get(p.id)!.biomarkers.push({ id: b.id, name: extractName(b.name) });
        }
        const sorted = [...map.values()].sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')));
        setProducts(sorted);
        setLoading(false);
      });
  }, []);

  const filtered = search.trim()
    ? products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.biomarkers.some(b => b.name.toLowerCase().includes(search.toLowerCase()))
      )
    : products;

  return (
    <div className="px-8 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-[#0e393d]">Linked Products</h1>
          <p className="text-sm text-[#1c2a2b]/40 mt-1">Products and their associated biomarkers</p>
        </div>
        <div className="relative w-64">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1c2a2b]/30 pointer-events-none">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Search products or biomarkers…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[#0e393d]/12 bg-white pl-9 pr-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/30 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/8 transition"
          />
        </div>
      </div>

      {/* Stats card */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl border border-[#0e393d]/8 bg-gradient-to-br from-white to-[#0e393d]/[0.02] px-4 py-3">
          <div className="text-2xl font-semibold text-[#0e393d]">{products.length}</div>
          <div className="text-xs text-[#1c2a2b]/50 mt-0.5">Linked products</div>
        </div>
        <div className="rounded-xl border border-[#0e393d]/8 bg-gradient-to-br from-white to-[#0e393d]/[0.02] px-4 py-3">
          <div className="text-2xl font-semibold text-[#0e393d]">{products.reduce((sum, p) => sum + p.biomarkers.length, 0)}</div>
          <div className="text-xs text-[#1c2a2b]/50 mt-0.5">Total links</div>
        </div>
        <div className="rounded-xl border border-[#0e393d]/8 bg-gradient-to-br from-white to-[#0e393d]/[0.02] px-4 py-3">
          <div className="text-2xl font-semibold text-[#0e393d]">{products.length > 0 ? Math.round(products.reduce((sum, p) => sum + p.biomarkers.length, 0) / products.length) : 0}</div>
          <div className="text-xs text-[#1c2a2b]/50 mt-0.5">Avg. per product</div>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-[#0e393d]/30 py-16 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <div className="text-[#1c2a2b]/30 text-sm">No products found</div>
          <p className="text-xs text-[#1c2a2b]/20 mt-1">Try adjusting your search</p>
        </div>
      ) : (
        <div className="border border-[#0e393d]/10 rounded-xl overflow-hidden shadow-sm bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/[0.03]">
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#0e393d]/50 uppercase tracking-wider">Product Name</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#0e393d]/50 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 w-20 text-center text-[11px] font-semibold text-[#0e393d]/50 uppercase tracking-wider">Count</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#0e393d]/50 uppercase tracking-wider">Biomarkers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0e393d]/5">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-[#fafaf8] transition-colors">
                  <td className="px-4 py-3 font-medium text-[#0e393d]">{p.name}</td>
                  <td className="px-4 py-3">
                    {p.product_type
                      ? <span className="inline-flex items-center rounded-md bg-[#ceab84]/10 px-2 py-0.5 text-[11px] font-medium text-[#8a6a3e] ring-1 ring-inset ring-[#ceab84]/20 capitalize">{p.product_type}</span>
                      : <span className="text-[#1c2a2b]/25">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#0e393d]/6 text-xs font-semibold text-[#0e393d]/70">{p.biomarkers.length}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.biomarkers.slice(0, 6).map(b => (
                        <span key={b.id} className="bg-[#0e393d]/5 text-[#0e393d]/60 text-[10px] px-1.5 py-0.5 rounded-md">
                          {b.name}
                        </span>
                      ))}
                      {p.biomarkers.length > 6 && (
                        <span className="text-[10px] text-[#1c2a2b]/35 px-1 py-0.5">+{p.biomarkers.length - 6} more</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 text-xs text-[#1c2a2b]/40 px-1">
        Showing {filtered.length} of {products.length} products
      </div>
    </div>
  );
}

// ── Page client ──────────────────────────────────────────────────────────────

export default function BiomarkersPageClient({ initialItems }: { initialItems: ItemDefinition[] }) {
  const [activeTab, setActiveTab] = useState<Tab>('biomarkers');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'biomarkers',  label: '🔬 Biomarkers' },
    { id: 'conversions', label: '⚖️ Unit Conversions' },
    { id: 'units',       label: '📏 Units' },
    { id: 'products',    label: '📦 Linked Products' },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="border-b border-[#0e393d]/8 px-8 pt-5">
        <div className="flex gap-1">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors rounded-t-lg ${
                activeTab === id
                  ? 'text-[#0e393d] bg-white'
                  : 'text-[#0e393d]/45 hover:text-[#0e393d]/70 hover:bg-[#0e393d]/[0.03]'
              }`}
            >
              {label}
              {activeTab === id && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#0e393d] rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'biomarkers'  && <BiomarkersManager initialItems={initialItems} />}
      {activeTab === 'conversions' && <UnitConversionsManager />}
      {activeTab === 'units'       && <UnitsOverview />}
      {activeTab === 'products'    && <LinkedProductsTab />}
    </div>
  );
}
