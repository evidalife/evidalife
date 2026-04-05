'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { LabPartner } from './LabPartnersManager';

type Product = {
  id: string;
  slug: string;
  name: Record<string, string> | string;
  price_chf: number | null;
  product_type: string;
};

type PricingRow = {
  id: string;
  lab_partner_id: string;
  product_id: string;
  lab_cost: number;
  currency: string;
  effective_from: string;
  effective_to: string | null;
  notes: string | null;
};

const inputCls =
  'w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition';

function productLabel(p: Product): string {
  if (typeof p.name === 'string') return p.name;
  return p.name?.de || p.name?.en || p.slug;
}

export default function LabPricingManager({
  labPartners,
  products,
}: {
  labPartners: LabPartner[];
  products: Product[];
}) {
  const supabase = createClient();
  const [pricing, setPricing] = useState<PricingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editCell, setEditCell] = useState<{ labId: string; productId: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showAddRow, setShowAddRow] = useState(false);
  const [newLabId, setNewLabId] = useState('');
  const [newProductId, setNewProductId] = useState('');
  const [newCost, setNewCost] = useState('');

  // Only show parent labs and standalone labs (not daughter locations) for pricing
  const billingLabs = labPartners.filter(l => !l.parent_lab_id && l.is_active);

  const loadPricing = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('lab_product_pricing')
      .select('*')
      .order('lab_partner_id')
      .order('product_id');
    setPricing(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadPricing(); }, [loadPricing]);

  const getPrice = (labId: string, productId: string): PricingRow | undefined => {
    const today = new Date().toISOString().slice(0, 10);
    return pricing.find(
      p => p.lab_partner_id === labId && p.product_id === productId &&
        p.effective_from <= today && (!p.effective_to || p.effective_to >= today)
    );
  };

  const handleCellClick = (labId: string, productId: string) => {
    const existing = getPrice(labId, productId);
    setEditCell({ labId, productId });
    setEditValue(existing ? String(existing.lab_cost) : '');
  };

  const handleCellSave = async () => {
    if (!editCell) return;
    const { labId, productId } = editCell;
    const cost = parseFloat(editValue);
    if (isNaN(cost) || cost < 0) { setEditCell(null); return; }

    setSaving(`${labId}-${productId}`);
    const existing = getPrice(labId, productId);

    if (existing) {
      await supabase
        .from('lab_product_pricing')
        .update({ lab_cost: cost, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('lab_product_pricing')
        .insert({
          lab_partner_id: labId,
          product_id: productId,
          lab_cost: cost,
          effective_from: new Date().toISOString().slice(0, 10),
        });
    }

    await loadPricing();
    setEditCell(null);
    setSaving(null);
  };

  const handleAddRow = async () => {
    if (!newLabId || !newProductId || !newCost) return;
    const cost = parseFloat(newCost);
    if (isNaN(cost) || cost < 0) return;

    setSaving('new');
    await supabase
      .from('lab_product_pricing')
      .insert({
        lab_partner_id: newLabId,
        product_id: newProductId,
        lab_cost: cost,
        effective_from: new Date().toISOString().slice(0, 10),
      });
    await loadPricing();
    setShowAddRow(false);
    setNewLabId('');
    setNewProductId('');
    setNewCost('');
    setSaving(null);
  };

  const labName = (id: string) => labPartners.find(l => l.id === id)?.name ?? id;

  // Find labs that have at least one pricing entry
  const labsWithPricing = [...new Set(pricing.map(p => p.lab_partner_id))];
  // Add billing labs that don't have pricing yet
  const allDisplayLabs = [...new Set([...labsWithPricing, ...billingLabs.map(l => l.id)])];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-serif text-[#0e393d]">Lab Pricing</h2>
          <p className="text-xs text-[#1c2a2b]/50 mt-0.5">
            Fixed cost per test that Evida pays each lab. Set at the organization level (parent labs).
          </p>
        </div>
        <button
          onClick={() => setShowAddRow(!showAddRow)}
          className="px-4 py-2 rounded-lg bg-[#0e393d] text-white text-sm font-medium hover:bg-[#0e393d]/90 transition"
        >
          + Add Price
        </button>
      </div>

      {/* Add new pricing row */}
      {showAddRow && (
        <div className="bg-white rounded-xl border border-[#ceab84]/30 p-4 space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#0e393d]/70 mb-1">Lab Organization</label>
              <select className={inputCls} value={newLabId} onChange={e => setNewLabId(e.target.value)}>
                <option value="">Select lab…</option>
                {billingLabs.map(l => (
                  <option key={l.id} value={l.id}>{l.name} ({l.lab_code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#0e393d]/70 mb-1">Product</label>
              <select className={inputCls} value={newProductId} onChange={e => setNewProductId(e.target.value)}>
                <option value="">Select product…</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{productLabel(p)} ({p.price_chf} CHF)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#0e393d]/70 mb-1">Lab Cost (CHF)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={inputCls}
                value={newCost}
                onChange={e => setNewCost(e.target.value)}
                placeholder="e.g. 85.00"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAddRow}
                disabled={saving === 'new'}
                className="w-full py-2 rounded-lg bg-[#ceab84] text-white text-sm font-medium hover:bg-[#b8956e] disabled:opacity-50 transition"
              >
                {saving === 'new' ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pricing matrix */}
      {loading ? (
        <div className="bg-white rounded-xl border border-[#0e393d]/10 p-8 text-center text-sm text-[#0e393d]/40">
          Loading pricing data…
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#0e393d]/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#fafaf8] text-xs uppercase tracking-wide text-[#0e393d]/50">
                  <th className="text-left px-5 py-3 font-medium">Lab Organization</th>
                  {products.map(p => (
                    <th key={p.id} className="text-center px-4 py-3 font-medium">
                      <div>{productLabel(p)}</div>
                      <div className="font-normal text-[10px] text-[#0e393d]/30 mt-0.5">
                        Sells for {p.price_chf} CHF
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allDisplayLabs.map(labId => {
                  const lab = labPartners.find(l => l.id === labId);
                  if (!lab) return null;
                  // Count daughter locations
                  const daughters = labPartners.filter(l => l.parent_lab_id === labId);

                  return (
                    <tr key={labId} className="border-t border-[#0e393d]/5 hover:bg-[#fafaf8]/50">
                      <td className="px-5 py-3">
                        <div className="font-medium text-[#0e393d]">{lab.name}</div>
                        {daughters.length > 0 && (
                          <div className="text-[10px] text-[#0e393d]/40 mt-0.5">
                            {daughters.length} location{daughters.length > 1 ? 's' : ''}: {daughters.map(d => d.name.replace(/^Run-in Labor /, '')).join(', ')}
                          </div>
                        )}
                      </td>
                      {products.map(prod => {
                        const price = getPrice(labId, prod.id);
                        const isEditing = editCell?.labId === labId && editCell?.productId === prod.id;
                        const margin = price && prod.price_chf
                          ? (Number(prod.price_chf) - Number(price.lab_cost))
                          : null;

                        return (
                          <td
                            key={prod.id}
                            className="px-4 py-3 text-center cursor-pointer group"
                            onClick={() => !isEditing && handleCellClick(labId, prod.id)}
                          >
                            {isEditing ? (
                              <div className="flex items-center gap-1 justify-center">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  className="w-20 rounded border border-[#ceab84] px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#ceab84]/40"
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleCellSave();
                                    if (e.key === 'Escape') setEditCell(null);
                                  }}
                                  autoFocus
                                />
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCellSave(); }}
                                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                                >
                                  OK
                                </button>
                              </div>
                            ) : price ? (
                              <div>
                                <span className="font-semibold text-[#0e393d]">
                                  {Number(price.lab_cost).toFixed(2)}
                                </span>
                                <span className="text-[10px] text-[#0e393d]/30 ml-1">CHF</span>
                                {margin !== null && (
                                  <div className="text-[10px] text-emerald-600/70 mt-0.5">
                                    Margin: {margin.toFixed(2)}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[#0e393d]/15 group-hover:text-[#ceab84] transition text-xs">
                                — click to set —
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {allDisplayLabs.length === 0 && (
                  <tr>
                    <td colSpan={products.length + 1} className="px-5 py-8 text-center text-sm text-[#0e393d]/40">
                      No lab organizations found. Add lab partners first.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
