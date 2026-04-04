'use client';

import { useCallback, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DiscountCode = {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed_amount';
  discount_value: number;
  currency: string | null;
  min_order_amount: number | null;
  max_uses: number | null;
  max_uses_per_user: number | null;
  used_count: number | null;
  valid_from: string | null;
  valid_until: string | null;
  applicable_product_types: string[] | null;
  is_active: boolean | null;
  created_at: string;
};

type FormState = {
  code: string;
  discount_type: 'percent' | 'fixed_amount';
  discount_value: string;
  currency: string;
  min_order_amount: string;
  max_uses: string;
  max_uses_per_user: string;
  valid_from: string;
  valid_until: string;
  applicable_product_types: string[];
  is_active: boolean;
};

const EMPTY_FORM: FormState = {
  code: '',
  discount_type: 'percent',
  discount_value: '',
  currency: 'CHF',
  min_order_amount: '',
  max_uses: '',
  max_uses_per_user: '',
  valid_from: '',
  valid_until: '',
  applicable_product_types: [],
  is_active: true,
};

const PRODUCT_TYPES = ['package', 'addon', 'food', 'subscription'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDiscount(dc: DiscountCode): string {
  if (dc.discount_type === 'percent') {
    return `${dc.discount_value}%`;
  }
  const currency = dc.currency ?? 'CHF';
  return `${currency} ${dc.discount_value.toFixed(2)}`;
}

function formatValidRange(dc: DiscountCode): string {
  if (!dc.valid_from && !dc.valid_until) return 'No limit';
  const from = dc.valid_from ? new Date(dc.valid_from).toLocaleDateString('de-CH') : '—';
  const until = dc.valid_until ? new Date(dc.valid_until).toLocaleDateString('de-CH') : '—';
  return `${from} → ${until}`;
}

function formatUses(dc: DiscountCode): string {
  const used = dc.used_count ?? 0;
  if (dc.max_uses == null || dc.max_uses === 0) return `${used} / ∞`;
  return `${used} / ${dc.max_uses}`;
}

function isExpired(dc: DiscountCode): boolean {
  if (!dc.valid_until) return false;
  return new Date(dc.valid_until) < new Date();
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  // Trim seconds and timezone for datetime-local input
  return iso.slice(0, 16);
}

function fromDatetimeLocal(local: string): string | null {
  if (!local) return null;
  return new Date(local).toISOString();
}

// ─── Shared primitives ────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition';
const selectCls = inputCls + ' cursor-pointer';

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#0e393d]/70 mb-1">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-[#1c2a2b]/40">{hint}</p>}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
        checked ? 'bg-[#0e393d]' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4.5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ceab84]">
      {children}
    </p>
  );
}

function Badge({
  color,
  children,
}: {
  color: 'green' | 'gray' | 'red' | 'gold';
  children: React.ReactNode;
}) {
  const cls = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    gray: 'bg-gray-50 text-gray-600 ring-gray-500/20',
    red: 'bg-red-50 text-red-700 ring-red-600/20',
    gold: 'bg-[#ceab84]/15 text-[#8a6a3e] ring-[#ceab84]/30',
  }[color];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${cls}`}
    >
      {children}
    </span>
  );
}

function StatusBadge({ dc }: { dc: DiscountCode }) {
  if (isExpired(dc)) return <Badge color="red">Expired</Badge>;
  if (!dc.is_active) return <Badge color="gray">Inactive</Badge>;
  return <Badge color="green">Active</Badge>;
}

// ─── Main component ───────────────────────────────────────────────────────────

type ActiveFilter = 'all' | 'active' | 'inactive';

export default function DiscountCodesManager({
  initialDiscountCodes,
}: {
  initialDiscountCodes: DiscountCode[];
}) {
  const supabase = createClient();
  const { confirm, ConfirmDialog: confirmDialog } = useConfirmDialog();
  const [codes, setCodes] = useState<DiscountCode[]>(initialDiscountCodes);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Data refresh ────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('discount_codes')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setCodes(data);
  }, [supabase]);

  // ── Panel helpers ────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, valid_from: new Date().toISOString().slice(0, 16) });
    setError(null);
    setPanelOpen(true);
  };

  const openEdit = (dc: DiscountCode) => {
    setEditingId(dc.id);
    setForm({
      code: dc.code ?? '',
      discount_type: dc.discount_type ?? 'percent',
      discount_value: dc.discount_value != null ? String(dc.discount_value) : '',
      currency: dc.currency ?? 'CHF',
      min_order_amount: dc.min_order_amount != null ? String(dc.min_order_amount) : '',
      max_uses: dc.max_uses != null ? String(dc.max_uses) : '',
      max_uses_per_user: dc.max_uses_per_user != null ? String(dc.max_uses_per_user) : '',
      valid_from: toDatetimeLocal(dc.valid_from),
      valid_until: toDatetimeLocal(dc.valid_until),
      applicable_product_types: dc.applicable_product_types ?? [],
      is_active: dc.is_active ?? true,
    });
    setError(null);
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setError(null);
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // ── Product type checkbox ────────────────────────────────────────────────────

  const toggleProductType = (type: string) => {
    setForm((prev) => {
      const current = prev.applicable_product_types;
      if (current.includes(type)) {
        return { ...prev, applicable_product_types: current.filter((t) => t !== type) };
      }
      return { ...prev, applicable_product_types: [...current, type] };
    });
  };

  // ── Inline toggle (active/inactive in table row) ─────────────────────────────

  const handleRowToggle = async (dc: DiscountCode) => {
    const newVal = !dc.is_active;
    await supabase.from('discount_codes').update({ is_active: newVal }).eq('id', dc.id);
    await refresh();
  };

  // ── Delete ────────────────────────────────────────────────────────────────────

  const handleDelete = async (dc: DiscountCode) => {
    if (!(await confirm({ title: 'Delete Discount Code', message: `Delete code "${dc.code}"? This cannot be undone.`, variant: 'danger' }))) return;
    await supabase.from('discount_codes').delete().eq('id', dc.id);
    await refresh();
  };

  // ── Save ──────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.code.trim()) {
      setError('Code is required.');
      return;
    }
    if (!form.discount_value) {
      setError('Discount value is required.');
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      code: form.code.trim().toUpperCase(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      currency: form.discount_type === 'fixed_amount' ? form.currency : null,
      min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : 0,
      max_uses: form.max_uses ? Number(form.max_uses) : 0,
      max_uses_per_user: form.max_uses_per_user ? Number(form.max_uses_per_user) : 0,
      valid_from: fromDatetimeLocal(form.valid_from) ?? new Date().toISOString(),
      valid_until: fromDatetimeLocal(form.valid_until),
      applicable_product_types:
        form.applicable_product_types.length > 0 ? form.applicable_product_types : null,
      is_active: form.is_active,
    };

    try {
      if (editingId) {
        const { error: err } = await supabase
          .from('discount_codes')
          .update(payload)
          .eq('id', editingId);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('discount_codes').insert(payload);
        if (err) throw err;
      }
      await refresh();
      closePanel();
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setError(typeof e === 'object' && e && 'message' in e ? (e as any).message : String(e));
    } finally {
      setSaving(false);
    }
  };

  // ── Filtered list ────────────────────────────────────────────────────────────

  const [sortCol, setSortCol] = useState<'code' | 'used_count' | 'valid_from' | 'is_active'>('code');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
  };

  const filtered = codes.filter((dc) => {
    if (search && !dc.code.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeFilter === 'active' && !dc.is_active) return false;
    if (activeFilter === 'inactive' && dc.is_active) return false;
    return true;
  });

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortCol === 'code') cmp = a.code.localeCompare(b.code);
    else if (sortCol === 'used_count') cmp = (a.used_count ?? 0) - (b.used_count ?? 0);
    else if (sortCol === 'valid_from') cmp = (a.valid_from ?? '').localeCompare(b.valid_from ?? '');
    else cmp = (a.is_active ? 0 : 1) - (b.is_active ? 0 : 1);
    return sortDir === 'asc' ? cmp : -cmp;
  }), [filtered, sortCol, sortDir]);

  const filterPills: { key: ActiveFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'inactive', label: 'Inactive' },
  ];

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">
      {confirmDialog}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-[#0e393d]">Discount Codes</h1>
          <p className="text-sm text-[#1c2a2b]/40 mt-1">
            {codes.length} total · {codes.filter((dc) => dc.is_active && !isExpired(dc)).length} active
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0e393d] text-white text-sm font-medium hover:bg-[#0e393d]/90 transition shadow-sm shadow-[#0e393d]/20"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> New Code
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative w-full max-w-xs">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1c2a2b]/40 pointer-events-none"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            type="text"
            placeholder="Search by code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[#0e393d]/12 bg-white px-3 py-2 pl-9 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
          />
        </div>
        <div className="flex gap-1.5">
          {filterPills.map((p) => (
            <button
              key={p.key}
              onClick={() => setActiveFilter(p.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                activeFilter === p.key
                  ? 'bg-[#0e393d] text-white'
                  : 'bg-[#0e393d]/8 text-[#0e393d]/70 hover:bg-[#0e393d]/15'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/[0.03]">
              {([
                { key: 'code',       label: 'Code',       align: 'left'  },
                { key: null,         label: 'Discount',   align: 'left'  },
                { key: 'valid_from', label: 'Valid Range', align: 'left' },
                { key: 'used_count', label: 'Uses',       align: 'left'  },
                { key: 'is_active',  label: 'Status',     align: 'left'  },
                { key: null,         label: 'Actions',    align: 'right' },
              ] as { key: typeof sortCol | null; label: string; align: 'left' | 'right' }[]).map(({ key, label, align }) => (
                <th
                  key={label}
                  onClick={key ? () => handleSort(key) : undefined}
                  className={`px-4 py-3 text-${align} text-[11px] font-semibold text-[#0e393d]/50 uppercase tracking-wider${key ? ' cursor-pointer select-none hover:text-[#0e393d]' : ''}`}
                >
                  {label}{key ? <>{' '}{sortCol === key && sortDir === 'asc' ? '▲' : sortCol === key && sortDir === 'desc' ? '▼' : <span className="opacity-0">▲</span>}</> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0e393d]/5">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center"><div className="text-sm text-[#1c2a2b]/40">No discount codes found.</div></td>
              </tr>
            )}
            {sorted.map((dc) => (
              <tr key={dc.id} className="cursor-pointer group hover:bg-[#fafaf8] transition-colors" onClick={() => openEdit(dc)}>
                {/* Code */}
                <td className="px-4 py-3">
                  <span className="font-mono font-bold text-[#0e393d] tracking-wider">
                    {dc.code}
                  </span>
                </td>

                {/* Type + Value */}
                <td className="px-4 py-3 text-[#1c2a2b]/70 tabular-nums">
                  {formatDiscount(dc)}
                </td>

                {/* Valid range */}
                <td className="px-4 py-3 text-[#1c2a2b]/60 text-xs">
                  {formatValidRange(dc)}
                </td>

                {/* Uses */}
                <td className="px-4 py-3 text-[#1c2a2b]/60 tabular-nums text-xs">
                  {formatUses(dc)}
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <StatusBadge dc={dc} />
                </td>

                {/* Actions */}
                <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => openEdit(dc)}
                      className="p-1.5 rounded-lg text-[#0e393d]/50 hover:text-[#0e393d] hover:bg-[#0e393d]/8 transition">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5Z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(dc)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Slide-over panel ──────────────────────────────────────────────────── */}
      {panelOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]"
            onClick={closePanel}
          />

          {/* Panel */}
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-2xl rounded-l-2xl">

            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-[#0e393d]/10 px-6 py-4">
              <h2 className="font-serif text-lg text-[#0e393d]">
                {editingId ? 'Edit Discount Code' : 'New Discount Code'}
              </h2>
              <button
                onClick={closePanel}
                className="p-1.5 rounded-lg text-[#1c2a2b]/40 hover:bg-[#0e393d]/5 hover:text-[#1c2a2b] transition"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                >
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Code details */}
              <div className="space-y-3">
                <SectionHead>Code</SectionHead>

                <Field label="Code *">
                  <input
                    className={inputCls + ' uppercase'}
                    value={form.code}
                    onChange={(e) => setField('code', e.target.value.toUpperCase())}
                    placeholder="SUMMER20"
                  />
                </Field>
              </div>

              {/* Discount */}
              <div className="space-y-3 border-t border-[#0e393d]/8 pt-5">
                <SectionHead>Discount</SectionHead>

                <Field label="Discount Type">
                  <select
                    className={selectCls}
                    value={form.discount_type}
                    onChange={(e) =>
                      setField('discount_type', e.target.value as 'percent' | 'fixed_amount')
                    }
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed_amount">Fixed Amount</option>
                  </select>
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Discount Value *">
                    <input
                      type="number"
                      className={inputCls}
                      value={form.discount_value}
                      onChange={(e) => setField('discount_value', e.target.value)}
                      placeholder={form.discount_type === 'percent' ? '20' : '30.00'}
                      min={0}
                      step={form.discount_type === 'percent' ? 1 : 0.01}
                    />
                  </Field>

                  {form.discount_type === 'fixed_amount' && (
                    <Field label="Currency">
                      <select
                        className={selectCls}
                        value={form.currency}
                        onChange={(e) => setField('currency', e.target.value)}
                      >
                        <option value="CHF">CHF</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </Field>
                  )}
                </div>

                <Field label="Min. Order Amount" hint="Leave blank for no minimum">
                  <input
                    type="number"
                    className={inputCls}
                    value={form.min_order_amount}
                    onChange={(e) => setField('min_order_amount', e.target.value)}
                    placeholder="0.00"
                    min={0}
                    step={0.01}
                  />
                </Field>
              </div>

              {/* Usage limits */}
              <div className="space-y-3 border-t border-[#0e393d]/8 pt-5">
                <SectionHead>Usage Limits</SectionHead>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Max Total Uses" hint="0 = unlimited">
                    <input
                      type="number"
                      className={inputCls}
                      value={form.max_uses}
                      onChange={(e) => setField('max_uses', e.target.value)}
                      placeholder="0"
                      min={0}
                    />
                  </Field>
                  <Field label="Max Uses per User" hint="0 = unlimited">
                    <input
                      type="number"
                      className={inputCls}
                      value={form.max_uses_per_user}
                      onChange={(e) => setField('max_uses_per_user', e.target.value)}
                      placeholder="0"
                      min={0}
                    />
                  </Field>
                </div>
              </div>

              {/* Validity */}
              <div className="space-y-3 border-t border-[#0e393d]/8 pt-5">
                <SectionHead>Validity</SectionHead>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Valid From">
                    <input
                      type="datetime-local"
                      className={inputCls}
                      value={form.valid_from}
                      onChange={(e) => setField('valid_from', e.target.value)}
                    />
                  </Field>
                  <Field label="Valid Until">
                    <input
                      type="datetime-local"
                      className={inputCls}
                      value={form.valid_until}
                      onChange={(e) => setField('valid_until', e.target.value)}
                    />
                  </Field>
                </div>
              </div>

              {/* Applicable product types */}
              <div className="space-y-3 border-t border-[#0e393d]/8 pt-5">
                <SectionHead>Applicable Product Types</SectionHead>
                <p className="text-xs text-[#1c2a2b]/40 -mt-1">
                  Leave all unchecked to apply to all types.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {PRODUCT_TYPES.map((type) => {
                    const checked = form.applicable_product_types.includes(type);
                    return (
                      <label
                        key={type}
                        className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition ${
                          checked
                            ? 'border-[#0e393d]/30 bg-[#0e393d]/5'
                            : 'border-[#0e393d]/10 hover:bg-[#fafaf8]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleProductType(type)}
                          className="accent-[#0e393d] h-3.5 w-3.5"
                        />
                        <span className="text-sm text-[#1c2a2b] capitalize">{type}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Settings */}
              <div className="space-y-3 border-t border-[#0e393d]/8 pt-5">
                <SectionHead>Settings</SectionHead>

                <div className="flex items-center justify-between rounded-lg border border-[#0e393d]/10 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#1c2a2b]">Active</p>
                    <p className="text-xs text-[#1c2a2b]/40">Code can be used at checkout</p>
                  </div>
                  <Toggle
                    checked={form.is_active}
                    onChange={(v) => setField('is_active', v)}
                  />
                </div>
              </div>

            </div>

            {/* Panel footer */}
            <div className="border-t border-[#0e393d]/10 px-6 py-4">
              {error && (
                <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={closePanel}
                  className="flex-1 rounded-lg border border-[#0e393d]/15 py-2.5 text-sm font-medium text-[#1c2a2b] hover:bg-[#fafaf8] transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-[#0e393d] py-2.5 text-sm font-medium text-white hover:bg-[#0e393d]/90 disabled:opacity-50 transition"
                >
                  {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Code'}
                </button>
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  );
}
