'use client';

import { useState, useEffect } from 'react';
import BiomarkersManager, { ItemDefinition } from './BiomarkersManager';
import UnitConversionsManager from './UnitConversionsManager';
import UnitsOverview from './UnitsOverview';
import { createClient } from '@/lib/supabase/client';

type Tab = 'biomarkers' | 'conversions' | 'units' | 'products';

// ── Linked Products tab ──────────────────────────────────────────────────────

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
          if (!map.has(p.id)) map.set(p.id, { id: p.id, name: p.name, product_type: p.product_type, biomarkers: [] });
          if (b) map.get(p.id)!.biomarkers.push({ id: b.id, name: b.name });
        }
        const sorted = [...map.values()].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
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
    <div className="px-8 py-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#0e393d]/50">{products.length} products linked to biomarkers</p>
        <input
          type="text"
          placeholder="Search products or biomarkers…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-[#0e393d]/20 rounded-lg px-3 py-1.5 text-sm w-64 focus:outline-none focus:border-[#0e393d]/50"
        />
      </div>

      {loading ? (
        <div className="text-sm text-[#0e393d]/40 py-12 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-[#0e393d]/40 py-12 text-center">No results</div>
      ) : (
        <div className="border border-[#0e393d]/12 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0e393d]/4 text-left text-xs font-semibold text-[#0e393d]/50 uppercase tracking-wide">
                <th className="px-4 py-3">Product Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 w-16 text-center">Count</th>
                <th className="px-4 py-3">Biomarkers</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#0e393d]/2'}>
                  <td className="px-4 py-3 font-medium text-[#0e393d]">{p.name}</td>
                  <td className="px-4 py-3 text-[#0e393d]/60 capitalize">{p.product_type ?? '—'}</td>
                  <td className="px-4 py-3 text-center text-[#0e393d]/60">{p.biomarkers.length}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.biomarkers.map(b => (
                        <span key={b.id} className="bg-[#0e393d]/8 text-[#0e393d]/70 text-xs px-2 py-0.5 rounded-full">
                          {b.name}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
      <div className="flex gap-2 px-8 pt-6 pb-4">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              activeTab === id
                ? 'bg-[#0e393d] text-white'
                : 'bg-[#0e393d]/6 text-[#0e393d]/60 hover:bg-[#0e393d]/12'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'biomarkers'  && <BiomarkersManager initialItems={initialItems} />}
      {activeTab === 'conversions' && <UnitConversionsManager />}
      {activeTab === 'units'       && <UnitsOverview />}
      {activeTab === 'products'    && <LinkedProductsTab />}
    </div>
  );
}
