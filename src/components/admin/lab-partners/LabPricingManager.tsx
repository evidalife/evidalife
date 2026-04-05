'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  inputCls,
  selectCls,
  AdminTable,
  AdminTableHead,
  AdminTh,
  AdminEmptyRow,
  AdminPanel,
  AdminPanelFooter,
  AdminSectionBlock,
  AdminField,
  AdminBadge,
  AdminSearchField,
  AdminTableFooter,
} from '@/components/admin/shared/AdminUI';
import type { LabPartner } from './LabPartnersManager';

// ─── Types ────────────────────────────────────────────────────────────────────

type Product = {
  id: string;
  slug: string;
  name: Record<string, string> | string;
  price_chf: number | null;
  price_eur: number | null;
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
  created_at?: string;
  updated_at?: string;
};

type Currency = 'CHF' | 'EUR';
const CURRENCIES: Currency[] = ['CHF', 'EUR'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function productLabel(p: Product): string {
  if (typeof p.name === 'string') return p.name;
  return p.name?.de || p.name?.en || p.slug;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtCurrency(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

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
  const [search, setSearch] = useState('');
  const [filterCurrency, setFilterCurrency] = useState<Currency | 'all'>('all');

  // Slide-over edit panel state
  const [editOpen, setEditOpen] = useState(false);
  const [editLabId, setEditLabId] = useState<string | null>(null);
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<PricingRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit form state
  const [formCost, setFormCost] = useState('');
  const [formCurrency, setFormCurrency] = useState<Currency>('CHF');
  const [formEffectiveFrom, setFormEffectiveFrom] = useState('');
  const [formEffectiveTo, setFormEffectiveTo] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Section toggles for panel
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    pricing: true,
    validity: true,
    notes: false,
  });
  const toggleSection = (key: string) =>
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  // Only show parent labs and standalone labs (not daughter locations) for pricing
  const billingLabs = labPartners.filter(l => !l.parent_lab_id);

  // ─── Data Loading ─────────────────────────────────────────────────────────

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

  // ─── Pricing Helpers ──────────────────────────────────────────────────────

  const getPrice = (labId: string, productId: string, currency: string = 'CHF'): PricingRow | undefined => {
    const today = new Date().toISOString().slice(0, 10);
    return pricing.find(
      p => p.lab_partner_id === labId && p.product_id === productId &&
        p.currency === currency &&
        p.effective_from <= today && (!p.effective_to || p.effective_to >= today)
    );
  };

  const getAllPricesForLab = (labId: string): PricingRow[] => {
    const today = new Date().toISOString().slice(0, 10);
    return pricing.filter(
      p => p.lab_partner_id === labId &&
        p.effective_from <= today && (!p.effective_to || p.effective_to >= today)
    );
  };

  // ─── Edit Panel Logic ─────────────────────────────────────────────────────

  const openEditPanel = (labId: string, productId: string, currency: Currency = 'CHF') => {
    const existing = getPrice(labId, productId, currency);
    setEditLabId(labId);
    setEditProductId(productId);
    setEditRow(existing ?? null);
    setFormCost(existing ? String(existing.lab_cost) : '');
    setFormCurrency(existing?.currency as Currency ?? currency);
    setFormEffectiveFrom(existing?.effective_from ?? new Date().toISOString().slice(0, 10));
    setFormEffectiveTo(existing?.effective_to ?? '');
    setFormNotes(existing?.notes ?? '');
    setError(null);
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editLabId || !editProductId) return;
    const cost = parseFloat(formCost);
    if (isNaN(cost) || cost < 0) {
      setError('Please enter a valid cost (≥ 0).');
      return;
    }
    if (!formEffectiveFrom) {
      setError('Effective from date is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editRow) {
        // Update existing pricing row
        const { error: updateErr } = await supabase
          .from('lab_product_pricing')
          .update({
            lab_cost: cost,
            currency: formCurrency,
            effective_from: formEffectiveFrom,
            effective_to: formEffectiveTo || null,
            notes: formNotes.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editRow.id);
        if (updateErr) throw updateErr;
      } else {
        // Insert new pricing row
        const { error: insertErr } = await supabase
          .from('lab_product_pricing')
          .insert({
            lab_partner_id: editLabId,
            product_id: editProductId,
            lab_cost: cost,
            currency: formCurrency,
            effective_from: formEffectiveFrom,
            effective_to: formEffectiveTo || null,
            notes: formNotes.trim() || null,
          });
        if (insertErr) throw insertErr;
      }

      await loadPricing();
      setEditOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save pricing.');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!editRow) return;
    if (!confirm('Remove this pricing entry? The lab will have no negotiated cost for this product.')) return;

    setSaving(true);
    try {
      await supabase.from('lab_product_pricing').delete().eq('id', editRow.id);
      await loadPricing();
      setEditOpen(false);
    } catch { /* ignore */ }
    setSaving(false);
  };

  // ─── Filtering ────────────────────────────────────────────────────────────

  const labsWithPricing = [...new Set(pricing.map(p => p.lab_partner_id))];
  const allDisplayLabs = [...new Set([...labsWithPricing, ...billingLabs.map(l => l.id)])];

  const filteredLabs = allDisplayLabs.filter(labId => {
    const lab = labPartners.find(l => l.id === labId);
    if (!lab) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!lab.name.toLowerCase().includes(q) && !(lab.lab_code ?? '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // ─── Render ───────────────────────────────────────────────────────────────

  const currentLabName = editLabId ? (labPartners.find(l => l.id === editLabId)?.name ?? '—') : '—';
  const currentProductName = editProductId ? productLabel(products.find(p => p.id === editProductId)!) : '—';

  return (
    <div className="space-y-4">
      {/* Header row with search and filter */}
      <div className="flex items-center justify-between">
        <AdminSearchField
          value={search}
          onChange={setSearch}
          placeholder="Search labs…"
          className="w-64"
        />
        <div className="flex items-center gap-3">
          {/* Currency filter */}
          <div className="flex rounded-lg border border-[#0e393d]/10 overflow-hidden bg-white">
            <button
              onClick={() => setFilterCurrency('all')}
              className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${
                filterCurrency === 'all'
                  ? 'bg-[#0e393d] text-white'
                  : 'text-[#1c2a2b]/50 hover:text-[#0e393d] hover:bg-[#0e393d]/5'
              }`}
            >
              All
            </button>
            {CURRENCIES.map(c => (
              <button
                key={c}
                onClick={() => setFilterCurrency(c)}
                className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  filterCurrency === c
                    ? 'bg-[#0e393d] text-white'
                    : 'text-[#1c2a2b]/50 hover:text-[#0e393d] hover:bg-[#0e393d]/5'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing matrix */}
      {loading ? (
        <div className="rounded-xl border border-[#0e393d]/10 bg-white p-12 text-center text-sm text-[#1c2a2b]/40">
          Loading pricing data…
        </div>
      ) : (
        <AdminTable>
          <AdminTableHead>
            <AdminTh label="Lab Organization" />
            {products.map(p => (
              <th key={p.id} className="px-3 py-3 text-center">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0e393d]/50">
                  {productLabel(p)}
                </span>
                <div className="font-normal text-[10px] text-[#0e393d]/30 mt-0.5">
                  {p.price_chf != null && `CHF ${p.price_chf}`}
                  {p.price_chf != null && p.price_eur != null && ' / '}
                  {p.price_eur != null && `EUR ${p.price_eur}`}
                </div>
              </th>
            ))}
          </AdminTableHead>
          <tbody className="divide-y divide-[#0e393d]/5">
            {filteredLabs.map(labId => {
              const lab = labPartners.find(l => l.id === labId);
              if (!lab) return null;
              const daughters = labPartners.filter(l => l.parent_lab_id === labId);

              return (
                <tr key={labId} className="hover:bg-[#fafaf8] transition-colors">
                  <td className="px-3 py-3">
                    <div className="font-medium text-[#0e393d]">{lab.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {lab.lab_code && (
                        <span className="text-[10px] text-[#0e393d]/30 font-mono">{lab.lab_code}</span>
                      )}
                      {daughters.length > 0 && (
                        <span className="text-[10px] text-[#0e393d]/40">
                          {daughters.length} location{daughters.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </td>
                  {products.map(prod => {
                    const chfPrice = getPrice(labId, prod.id, 'CHF');
                    const eurPrice = getPrice(labId, prod.id, 'EUR');
                    const showChf = filterCurrency === 'all' || filterCurrency === 'CHF';
                    const showEur = filterCurrency === 'all' || filterCurrency === 'EUR';
                    const hasAny = chfPrice || eurPrice;

                    const chfMargin = chfPrice && prod.price_chf
                      ? (Number(prod.price_chf) - Number(chfPrice.lab_cost))
                      : null;
                    const eurMargin = eurPrice && prod.price_eur
                      ? (Number(prod.price_eur) - Number(eurPrice.lab_cost))
                      : null;

                    return (
                      <td
                        key={prod.id}
                        className="px-3 py-3 text-center cursor-pointer group"
                        onClick={() => openEditPanel(labId, prod.id, filterCurrency !== 'all' ? filterCurrency : 'CHF')}
                      >
                        {hasAny ? (
                          <div className="space-y-1">
                            {showChf && chfPrice && (
                              <div>
                                <span className="font-semibold text-[#0e393d]">
                                  {Number(chfPrice.lab_cost).toFixed(2)}
                                </span>
                                <span className="text-[10px] text-[#0e393d]/30 ml-1">CHF</span>
                                {chfMargin !== null && (
                                  <div className="text-[10px] text-emerald-600/70">
                                    +{chfMargin.toFixed(2)}
                                  </div>
                                )}
                              </div>
                            )}
                            {showEur && eurPrice && (
                              <div>
                                <span className="font-semibold text-[#0e393d]">
                                  {Number(eurPrice.lab_cost).toFixed(2)}
                                </span>
                                <span className="text-[10px] text-[#0e393d]/30 ml-1">EUR</span>
                                {eurMargin !== null && (
                                  <div className="text-[10px] text-emerald-600/70">
                                    +{eurMargin.toFixed(2)}
                                  </div>
                                )}
                              </div>
                            )}
                            {showChf && !chfPrice && showEur && !eurPrice && (
                              <span className="text-[#0e393d]/15 group-hover:text-[#ceab84] transition text-xs">
                                — set —
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#0e393d]/15 group-hover:text-[#ceab84] transition text-xs">
                            — set —
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {filteredLabs.length === 0 && (
              <AdminEmptyRow
                colSpan={products.length + 1}
                message="No lab organizations found"
                hint="Add lab partners first, or adjust your search"
              />
            )}
          </tbody>
        </AdminTable>
      )}

      <AdminTableFooter
        showing={filteredLabs.length}
        total={allDisplayLabs.length}
        hasFilters={!!search || filterCurrency !== 'all'}
        onClearFilters={() => { setSearch(''); setFilterCurrency('all'); }}
      />

      {/* ─── Slide-over Edit Panel ──────────────────────────────────────────── */}
      <AdminPanel
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={editRow ? 'Edit Pricing' : 'Set Pricing'}
        subtitle={`${currentLabName} × ${currentProductName}`}
        width="max-w-md"
        headerRight={
          editRow ? (
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition"
            >
              Remove
            </button>
          ) : undefined
        }
        footer={
          <AdminPanelFooter
            error={error}
            saving={saving}
            onCancel={() => setEditOpen(false)}
            onSave={handleSave}
            saveLabel={editRow ? 'Update Pricing' : 'Set Pricing'}
          />
        }
      >
        {/* Pricing Section */}
        <AdminSectionBlock
          title="Pricing"
          open={openSections.pricing ?? true}
          onToggle={() => toggleSection('pricing')}
        >
          <div className="grid grid-cols-2 gap-4">
            <AdminField label="Lab Cost">
              <input
                type="number"
                step="0.01"
                min="0"
                className={inputCls}
                value={formCost}
                onChange={e => setFormCost(e.target.value)}
                placeholder="e.g. 85.00"
              />
            </AdminField>
            <AdminField label="Currency">
              <select
                className={selectCls}
                value={formCurrency}
                onChange={e => setFormCurrency(e.target.value as Currency)}
              >
                {CURRENCIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </AdminField>
          </div>

          {/* Margin preview */}
          {formCost && editProductId && (() => {
            const prod = products.find(p => p.id === editProductId);
            const cost = parseFloat(formCost);
            const sellPrice = formCurrency === 'EUR' ? prod?.price_eur : prod?.price_chf;
            if (!prod || isNaN(cost) || sellPrice == null) return null;
            const margin = sellPrice - cost;
            const marginPct = ((margin / sellPrice) * 100).toFixed(1);
            return (
              <div className="rounded-lg bg-emerald-50/50 border border-emerald-200/40 px-4 py-3 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-700/70">Evida Margin</span>
                  <span className="text-sm font-semibold text-emerald-700">
                    {margin.toFixed(2)} {formCurrency} ({marginPct}%)
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-emerald-600/50">Sell price: {sellPrice} {formCurrency}</span>
                  <span className="text-[10px] text-emerald-600/50">Lab cost: {cost.toFixed(2)} {formCurrency}</span>
                </div>
              </div>
            );
          })()}
        </AdminSectionBlock>

        {/* Validity Section */}
        <AdminSectionBlock
          title="Validity Period"
          open={openSections.validity ?? true}
          onToggle={() => toggleSection('validity')}
        >
          <div className="grid grid-cols-2 gap-4">
            <AdminField label="Effective From" hint="When this price takes effect">
              <input
                type="date"
                className={inputCls}
                value={formEffectiveFrom}
                onChange={e => setFormEffectiveFrom(e.target.value)}
              />
            </AdminField>
            <AdminField label="Effective To" hint="Leave blank for no end date">
              <input
                type="date"
                className={inputCls}
                value={formEffectiveTo}
                onChange={e => setFormEffectiveTo(e.target.value)}
              />
            </AdminField>
          </div>
          {editRow && (
            <div className="text-[10px] text-[#1c2a2b]/30 mt-1">
              Created: {fmtDate(editRow.created_at ?? null)} · Last updated: {fmtDate(editRow.updated_at ?? null)}
            </div>
          )}
        </AdminSectionBlock>

        {/* Notes Section */}
        <AdminSectionBlock
          title="Notes"
          open={openSections.notes ?? false}
          onToggle={() => toggleSection('notes')}
        >
          <AdminField label="Internal Notes" hint="Not visible to lab partners">
            <textarea
              className={inputCls + ' min-h-[80px] resize-y'}
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              placeholder="E.g. negotiated during Q1 2026 partnership renewal…"
            />
          </AdminField>
        </AdminSectionBlock>
      </AdminPanel>
    </div>
  );
}
