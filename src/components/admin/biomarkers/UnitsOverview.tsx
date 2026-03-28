'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type BiomarkerRow = {
  unit: string | null;
  slug: string | null;
  name: Record<string, string> | null;
};

type ConversionRow = {
  alt_unit: string;
  canonical_unit: string;
  multiplier: number;
  offset_value: number;
  biomarker_id: string;
  biomarkers: { slug: string | null; name: Record<string, string> | null } | null;
};

type CanonicalUnitEntry = {
  unit: string;
  count: number;
  examples: string[];
};

type AltUnitEntry = {
  alt_unit: string;
  canonical_unit: string;
  multiplier: number;
  offset_value: number;
  biomarkers: string[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bmName(name: Record<string, string> | null, slug: string | null): string {
  return name?.en || name?.de || slug || '—';
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UnitsOverview() {
  const supabase = createClient();

  const [canonicalUnits, setCanonicalUnits] = useState<CanonicalUnitEntry[]>([]);
  const [altUnits, setAltUnits] = useState<AltUnitEntry[]>([]);
  const [gapBiomarkers, setGapBiomarkers] = useState<{ name: string; unit: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: bms }, { data: convs }] = await Promise.all([
        supabase
          .from('biomarkers')
          .select('unit, slug, name')
          .eq('is_active', true)
          .order('unit'),
        supabase
          .from('biomarker_unit_conversions')
          .select('alt_unit, canonical_unit, multiplier, offset_value, biomarker_id, biomarkers!inner(slug, name)'),
      ]);

      const biomarkerRows = (bms ?? []) as BiomarkerRow[];
      const conversionRows = (convs ?? []) as unknown as ConversionRow[];

      // ── Canonical units ────────────────────────────────────────────────────
      const canonicalMap = new Map<string, { count: number; examples: string[] }>();
      for (const bm of biomarkerRows) {
        const unit = bm.unit ?? '(none)';
        const existing = canonicalMap.get(unit) ?? { count: 0, examples: [] };
        existing.count++;
        if (existing.examples.length < 4) {
          existing.examples.push(bmName(bm.name, bm.slug));
        }
        canonicalMap.set(unit, existing);
      }
      const sortedCanonical = [...canonicalMap.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .map(([unit, { count, examples }]) => ({ unit, count, examples }));
      setCanonicalUnits(sortedCanonical);

      // ── Alt units ─────────────────────────────────────────────────────────
      // Group by alt_unit + canonical_unit + multiplier combination
      const altMap = new Map<string, AltUnitEntry>();
      for (const conv of conversionRows) {
        const key = `${conv.alt_unit}→${conv.canonical_unit}@${conv.multiplier}`;
        const existing = altMap.get(key) ?? {
          alt_unit: conv.alt_unit,
          canonical_unit: conv.canonical_unit,
          multiplier: conv.multiplier,
          offset_value: conv.offset_value,
          biomarkers: [],
        };
        const name = bmName(conv.biomarkers?.name ?? null, conv.biomarkers?.slug ?? null);
        if (!existing.biomarkers.includes(name)) {
          existing.biomarkers.push(name);
        }
        altMap.set(key, existing);
      }
      const sortedAlt = [...altMap.values()].sort((a, b) => a.alt_unit.localeCompare(b.alt_unit));
      setAltUnits(sortedAlt);

      // ── Coverage gaps ─────────────────────────────────────────────────────
      const biomarkersWithConversions = new Set(conversionRows.map((c) => c.biomarker_id));
      const gaps = biomarkerRows
        .filter((bm) => {
          // Need the biomarker ID — re-query is expensive; use slug as proxy check
          // We'll compute gaps by cross-referencing names
          return true; // placeholder; computed below
        });

      // Fetch biomarker IDs for gap detection
      const { data: bmWithIds } = await supabase
        .from('biomarkers')
        .select('id, slug, name, unit')
        .eq('is_active', true);

      const gapList = (bmWithIds ?? [])
        .filter((bm: any) => !biomarkersWithConversions.has(bm.id))
        .map((bm: any) => ({
          name: bmName(bm.name, bm.slug),
          unit: bm.unit ?? '?',
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

      setGapBiomarkers(gapList);
      setLoading(false);
    }

    load();
  }, [supabase]);

  if (loading) {
    return (
      <div className="p-8 pt-2">
        <div className="text-sm text-[#1c2a2b]/40 py-10 text-center">Loading units…</div>
      </div>
    );
  }

  return (
    <div className="p-8 pt-4 space-y-8">

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[#0e393d]/8 bg-gradient-to-br from-white to-[#0e393d]/[0.02] px-4 py-3">
          <div className="text-2xl font-semibold text-[#0e393d]">{canonicalUnits.length}</div>
          <div className="text-xs text-[#1c2a2b]/50 mt-0.5">Canonical units</div>
        </div>
        <div className="rounded-xl border border-[#0e393d]/8 bg-gradient-to-br from-white to-[#0e393d]/[0.02] px-4 py-3">
          <div className="text-2xl font-semibold text-[#0e393d]">{altUnits.length}</div>
          <div className="text-xs text-[#1c2a2b]/50 mt-0.5">Conversion rules</div>
        </div>
        <div className={`rounded-xl border px-4 py-3 ${gapBiomarkers.length === 0 ? 'border-emerald-200/60 bg-gradient-to-br from-white to-emerald-50/30' : 'border-amber-200/60 bg-gradient-to-br from-white to-amber-50/30'}`}>
          <div className={`text-2xl font-semibold ${gapBiomarkers.length === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>{gapBiomarkers.length}</div>
          <div className={`text-xs mt-0.5 ${gapBiomarkers.length === 0 ? 'text-emerald-600/60' : 'text-amber-600/60'}`}>Coverage gaps</div>
        </div>
      </div>

      {/* ── Section 1: Canonical Units ───────────────────────────────────────── */}
      <div>
        <div className="mb-3">
          <h2 className="font-serif text-lg text-[#0e393d]">Canonical Units</h2>
          <p className="text-xs text-[#1c2a2b]/40 mt-0.5">
            The standard unit stored in the DB for each biomarker. Values are always converted to these before saving.
          </p>
        </div>
        <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/[0.03]">
                {['Unit', '# Biomarkers', 'Examples'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#0e393d]/50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0e393d]/5">
              {canonicalUnits.map(({ unit, count, examples }) => (
                <tr key={unit} className="hover:bg-[#fafaf8] transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm font-medium text-[#0e393d] bg-[#0e393d]/[0.03] px-2 py-0.5 rounded">{unit}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#1c2a2b]">{count}</span>
                      <div className="h-1.5 bg-[#0e393d]/8 rounded-full flex-1 max-w-24 overflow-hidden">
                        <div className="h-full bg-[#0e393d]/30 rounded-full" style={{ width: `${Math.min(100, (count / Math.max(...canonicalUnits.map(c => c.count))) * 100)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#1c2a2b]/50">
                    {examples.join(', ')}{count > examples.length ? `, +${count - examples.length} more` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 2: Alternative Units ─────────────────────────────────────── */}
      <div>
        <div className="mb-3">
          <h2 className="font-serif text-lg text-[#0e393d]">Alternative Units</h2>
          <p className="text-xs text-[#1c2a2b]/40 mt-0.5">
            Non-canonical units supported via the conversion table. Accepted on input and automatically converted.
          </p>
        </div>
        <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/[0.03]">
                {['Alt Unit', '→ Canonical', 'Formula', 'Biomarkers'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#0e393d]/50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0e393d]/5">
              {altUnits.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-[#1c2a2b]/30">No conversions defined yet</td></tr>
              ) : altUnits.map((entry, i) => (
                <tr key={i} className="hover:bg-[#fafaf8] transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-[#1c2a2b] bg-[#0e393d]/[0.03] px-2 py-0.5 rounded">{entry.alt_unit}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-[#0e393d] bg-[#0e393d]/[0.03] px-2 py-0.5 rounded">{entry.canonical_unit}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-[#1c2a2b]/70 bg-[#fafaf8] px-2 py-1 rounded border border-[#0e393d]/6">
                      ×{entry.multiplier}{entry.offset_value !== 0 && <span className="text-[#1c2a2b]/40"> + {entry.offset_value}</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {entry.biomarkers.slice(0, 3).map((b) => (
                        <span key={b} className="bg-[#0e393d]/5 text-[#1c2a2b]/60 text-[10px] px-1.5 py-0.5 rounded-md">{b}</span>
                      ))}
                      {entry.biomarkers.length > 3 && (
                        <span className="text-[10px] text-[#1c2a2b]/35 px-1 py-0.5">+{entry.biomarkers.length - 3}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 3: Coverage Gaps ──────────────────────────────────────────── */}
      <div>
        <div className="mb-3">
          <h2 className="font-serif text-lg text-[#0e393d] flex items-center gap-2">
            Coverage Gaps
            <span className={`text-xs font-sans font-medium px-2 py-0.5 rounded-full ${gapBiomarkers.length === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              {gapBiomarkers.length}
            </span>
          </h2>
          <p className="text-xs text-[#1c2a2b]/40 mt-0.5">
            Biomarkers that only accept their canonical unit. Add conversion rules in the Unit Conversions tab.
          </p>
        </div>
        {gapBiomarkers.length === 0 ? (
          <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/50 px-5 py-5 text-center">
            <div className="text-emerald-600 text-sm font-medium">All biomarkers have at least one conversion rule</div>
            <p className="text-xs text-emerald-600/50 mt-1">Great coverage across all units</p>
          </div>
        ) : (
          <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {gapBiomarkers.map(({ name, unit }, idx) => (
                <div key={name} className={`px-4 py-3 border-b border-r border-[#0e393d]/6 hover:bg-amber-50/30 transition-colors ${idx >= gapBiomarkers.length - (gapBiomarkers.length % 4 || 4) ? 'border-b-0' : ''}`}>
                  <div className="text-xs font-medium text-[#1c2a2b]">{name}</div>
                  <div className="text-[11px] font-mono text-[#1c2a2b]/35 mt-0.5">{unit}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
