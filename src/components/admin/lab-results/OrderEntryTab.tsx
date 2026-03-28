'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Badge, FlagBadge, FlagDot, HE_DOMAIN_LABEL, HE_DOMAIN_ORDER,
  SectionHeading, Spinner, Toast, ToastContainer, fmtDate, locName, nextToastId, todayISO,
} from './shared';
import { computeStatusFlag, checkPlausibility, StatusFlag } from '@/lib/lab-results/flagging';
import { convertToCanonical, UnitConversion } from '@/lib/biomarker-conversions';

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductItemDef = {
  id: string;
  name: Record<string, string> | string;
  unit: string | null;
  he_domain: string | null;
  ref_range_low: number | null;
  ref_range_high: number | null;
  optimal_range_low: number | null;
  optimal_range_high: number | null;
  range_type: string | null;
};

type TestItem = {
  id: string;
  status: string;
  result_value: number | null;
  result_unit: string | null;
  status_flag: string | null;
  lab_result_id: string | null;
  notes: string | null;
  biomarkers: ProductItemDef | null;
};

type OrderOption = {
  id: string;
  order_number: string;
  user_id: string;
  fulfilment_status: string | null;
  created_at: string;
  profiles: { first_name: string | null; last_name: string | null; email: string | null } | null;
  order_items: {
    products: { name: Record<string, string> | string | null } | null;
  }[];
};

type EditState = { itemId: string; value: string; notes: string } | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeLive(val: string, item: ProductItemDef | null): { flag: StatusFlag | null; warning: string | null } {
  if (!item || val === '') return { flag: null, warning: null };
  const n = parseFloat(val);
  if (isNaN(n)) return { flag: null, warning: null };
  const flag = computeStatusFlag(n, {
    ref_range_low: item.ref_range_low,
    ref_range_high: item.ref_range_high,
    optimal_range_low: item.optimal_range_low,
    optimal_range_high: item.optimal_range_high,
    range_type: item.range_type as any,
  });
  const plaus = checkPlausibility(n, locName(item.name), {
    ref_range_low: item.ref_range_low,
    ref_range_high: item.ref_range_high,
    optimal_range_low: item.optimal_range_low,
    optimal_range_high: item.optimal_range_high,
    range_type: item.range_type as any,
  });
  return { flag, warning: plaus.plausible ? null : plaus.message ?? null };
}

function RangeDisplay({ def }: { def: ProductItemDef }) {
  const parts: string[] = [];
  if (def.ref_range_low != null || def.ref_range_high != null) {
    const lo = def.ref_range_low != null ? String(def.ref_range_low) : '—';
    const hi = def.ref_range_high != null ? String(def.ref_range_high) : '—';
    parts.push(`Ref: ${lo}–${hi}`);
  }
  if (def.optimal_range_low != null || def.optimal_range_high != null) {
    const lo = def.optimal_range_low != null ? String(def.optimal_range_low) : '—';
    const hi = def.optimal_range_high != null ? String(def.optimal_range_high) : '—';
    parts.push(`Opt: ${lo}–${hi}`);
  }
  if (!parts.length) return <span className="text-[11px] text-[#1c2a2b]/30">No range</span>;
  return <span className="text-[11px] text-[#1c2a2b]/40">{parts.join(' · ')}</span>;
}

// ─── Main tab component ───────────────────────────────────────────────────────

export default function OrderEntryTab() {
  const supabase = createClient();

  // Order search
  const [orderSearch, setOrderSearch] = useState('');
  const [orderOptions, setOrderOptions] = useState<OrderOption[]>([]);
  const [orderSearching, setOrderSearching] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderOption | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Test items
  const [testItems, setTestItems] = useState<TestItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [inputNotes, setInputNotes] = useState<Record<string, string>>({});
  const [inputUnits, setInputUnits] = useState<Record<string, string>>({});
  const [conversionsMap, setConversionsMap] = useState<Record<string, UnitConversion[]>>({});
  const [collapsedDomains, setCollapsedDomains] = useState<Set<string>>(new Set());

  // Date
  const [testDate, setTestDate] = useState(todayISO());

  // Editing
  const [editState, setEditState] = useState<EditState>(null);

  // Saving
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const searchRef = useRef<NodeJS.Timeout | null>(null);

  // ── Order search ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (orderSearch.length < 2) { setOrderOptions([]); return; }
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(async () => {
      setOrderSearching(true);
      const { data } = await supabase
        .from('orders')
        .select(`
          id, order_number, user_id, fulfilment_status, created_at,
          profiles ( first_name, last_name, email ),
          order_items ( products ( name ) )
        `)
        .in('fulfilment_status', ['sample_collected', 'processing', 'results_ready'])
        .or(`order_number.ilike.%${orderSearch}%`)
        .limit(10);
      setOrderOptions((data as unknown as OrderOption[]) ?? []);
      setOrderSearching(false);
      setShowDropdown(true);
    }, 300);
  }, [orderSearch]);

  // ── Load test items ─────────────────────────────────────────────────────────

  const loadItems = useCallback(async (orderId: string) => {
    setLoadingItems(true);
    setTestItems([]);
    setInputValues({});
    setInputUnits({});
    const { data } = await supabase
      .from('order_test_items')
      .select(`
        id, status, result_value, result_unit, status_flag, lab_result_id, notes,
        biomarkers:biomarker_id (
          id, name, unit, he_domain, ref_range_low, ref_range_high,
          optimal_range_low, optimal_range_high, range_type
        )
      `)
      .eq('order_id', orderId)
      .order('created_at');
    const items = (data as unknown as TestItem[]) ?? [];
    setTestItems(items);

    // Load unit conversions for all biomarker IDs
    const biomarkerIds = [...new Set(items.map((i) => i.biomarkers?.id).filter(Boolean))] as string[];
    if (biomarkerIds.length > 0) {
      const { data: convRows } = await supabase
        .from('biomarker_unit_conversions')
        .select('biomarker_id, alt_unit, canonical_unit, multiplier, offset_value')
        .in('biomarker_id', biomarkerIds);
      const map: Record<string, UnitConversion[]> = {};
      for (const row of convRows ?? []) {
        if (!map[row.biomarker_id]) map[row.biomarker_id] = [];
        map[row.biomarker_id].push(row as UnitConversion);
      }
      setConversionsMap(map);
    }

    // Pre-fill input units with canonical unit per item
    const units: Record<string, string> = {};
    for (const item of items) {
      units[item.id] = item.biomarkers?.unit ?? '';
    }
    setInputUnits(units);

    setLoadingItems(false);
  }, [supabase]);

  const selectOrder = (order: OrderOption) => {
    setSelectedOrder(order);
    setOrderSearch('');
    setShowDropdown(false);
    loadItems(order.id);
  };

  const clearOrder = () => {
    setSelectedOrder(null);
    setTestItems([]);
    setInputValues({});
    setInputNotes({});
    setInputUnits({});
    setConversionsMap({});
  };

  // ── Group items by domain ───────────────────────────────────────────────────

  const grouped: Record<string, TestItem[]> = {};
  for (const item of testItems) {
    const domain = item.biomarkers?.he_domain ?? 'other';
    if (!grouped[domain]) grouped[domain] = [];
    grouped[domain].push(item);
  }

  const domainOrder = [...HE_DOMAIN_ORDER, ...Object.keys(grouped).filter((d) => !HE_DOMAIN_ORDER.includes(d))];
  const presentDomains = domainOrder.filter((d) => grouped[d]?.length);

  // ── Stats ───────────────────────────────────────────────────────────────────

  const totalItems = testItems.length;
  const receivedItems = testItems.filter((i) => i.status === 'completed').length;
  const pendingItems = testItems.filter((i) => i.status !== 'completed').length;

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!selectedOrder) return;
    const toSave = testItems.filter((item) => {
      const val = editState?.itemId === item.id ? editState.value : inputValues[item.id];
      return val && val.trim() !== '';
    });
    if (!toSave.length) {
      addToast('No values entered.', 'error');
      return;
    }

    setSaving(true);

    const userId = selectedOrder.user_id ?? null;

    const results = toSave.map((item) => {
      const def = item.biomarkers;
      const rawValue = editState?.itemId === item.id ? editState.value : inputValues[item.id];
      const notes = editState?.itemId === item.id ? editState.notes : (inputNotes[item.id] || '');
      const selectedUnit = inputUnits[item.id] ?? def?.unit ?? '';
      const canonicalUnit = def?.unit ?? '';

      // Apply unit conversion if the user selected an alt unit
      const numRaw = parseFloat(rawValue);
      let finalValue = rawValue;
      let originalValue: string | null = null;
      let originalUnit: string | null = null;
      if (!isNaN(numRaw) && selectedUnit && selectedUnit !== canonicalUnit && def?.id) {
        const conversions = conversionsMap[def.id] ?? [];
        const { convertedValue, wasConverted } = convertToCanonical(numRaw, selectedUnit, canonicalUnit, conversions);
        if (wasConverted) {
          finalValue = String(convertedValue);
          originalValue = rawValue;
          originalUnit = selectedUnit;
        }
      }

      return {
        orderId: selectedOrder.id,
        orderTestItemId: item.id,
        biomarkerDefinitionId: def?.id ?? null,
        userId,
        value: finalValue,
        unit: canonicalUnit || null,
        testDate,
        notes,
        biomarkerName: locName(def?.name),
        refRangeLow: def?.ref_range_low,
        refRangeHigh: def?.ref_range_high,
        optimalRangeLow: def?.optimal_range_low,
        optimalRangeHigh: def?.optimal_range_high,
        rangeType: def?.range_type,
        originalValue,
        originalUnit,
      };
    });

    const res = await fetch('/api/admin/lab-results/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results }),
    });
    const data = await res.json();
    setSaving(false);

    if (!data.success) {
      addToast(data.error ?? 'Save failed', 'error');
      return;
    }

    if (data.orderCompleted) {
      addToast(`All results received! Order moved to Results Ready. Customer will be notified.`, 'success');
    } else {
      addToast(`${data.created} result${data.created !== 1 ? 's' : ''} saved${data.warnings ? ` · ${data.warnings} review item${data.warnings !== 1 ? 's' : ''} created` : ''}`, 'success');
    }

    setInputValues({});
    setInputNotes({});
    setInputUnits({});
    setEditState(null);
    loadItems(selectedOrder.id);
  };

  // ── Delete (reset to pending) ───────────────────────────────────────────────

  const handleDelete = async (item: TestItem) => {
    if (!item.lab_result_id) return;
    await supabase.from('order_test_items').update({
      status: 'pending', lab_result_id: null,
      result_value: null, result_unit: null, status_flag: null, completed_at: null,
    }).eq('id', item.id);
    await supabase.from('lab_results').update({ deleted_at: new Date().toISOString() }).eq('id', item.lab_result_id);
    loadItems(selectedOrder!.id);
    addToast('Result removed — item reset to pending', 'success');
  };

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = nextToastId();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-serif text-2xl text-[#0e393d]">Order Entry</h1>
            <p className="text-sm text-[#1c2a2b]/40 mt-1">Enter lab results for existing orders</p>
          </div>
        </div>

        <ToastContainer toasts={toasts} dismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />

        {/* ── Order selector ──────────────────────────────────────────────────── */}
        {!selectedOrder ? (
          <div className="max-w-lg">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#0e393d]/50 mb-2">Select Order</div>
            <div className="relative">
              <svg className="absolute left-3 top-3 w-4 h-4 text-[#1c2a2b]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <input
                type="text"
                placeholder="Type order number (e.g. EVD-00042)…"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                onFocus={() => orderOptions.length && setShowDropdown(true)}
                className="w-full pl-10 rounded-lg border border-[#0e393d]/12 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
              />
            {orderSearching && (
              <div className="absolute right-3 top-3"><Spinner size={3} /></div>
            )}
            {showDropdown && orderOptions.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 rounded-lg border border-[#0e393d]/10 bg-white shadow-lg overflow-hidden">
                {orderOptions.map((o) => {
                  const productName = locName((o.order_items?.[0] as any)?.products?.name);
                  const customerName = [o.profiles?.first_name, o.profiles?.last_name].filter(Boolean).join(' ');
                  return (
                    <button
                      key={o.id}
                      onClick={() => selectOrder(o)}
                      className="w-full text-left px-4 py-3 hover:bg-[#fafaf8] transition flex items-center justify-between border-b border-[#0e393d]/6 last:border-0"
                    >
                      <div>
                        <div className="text-xs font-mono font-medium text-[#0e393d]">{o.order_number}</div>
                        <div className="text-xs text-[#1c2a2b]/60">{customerName || o.profiles?.email}</div>
                        {productName && <div className="text-[11px] text-[#1c2a2b]/40">{productName}</div>}
                      </div>
                      <Badge className="bg-sky-50 text-sky-700 ring-sky-600/20">
                        {o.fulfilment_status?.replace('_', ' ')}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
            {showDropdown && !orderSearching && orderOptions.length === 0 && orderSearch.length >= 2 && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 rounded-lg border border-[#0e393d]/10 bg-white shadow-lg px-4 py-3 text-sm text-[#1c2a2b]/40">
                No orders found in sample_collected / processing / results_ready status.
              </div>
            )}
            </div>
            <p className="mt-2 text-xs text-[#1c2a2b]/40">Only orders in sample_collected, processing, or results_ready state are shown.</p>
          </div>
        ) : (
          <>
            {/* ── Selected order info bar ──────────────────────────────────────── */}
            <div className="rounded-xl border border-[#0e393d]/10 bg-white px-5 py-4 flex items-center justify-between flex-wrap gap-3 shadow-sm">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <div className="text-xs text-[#1c2a2b]/40 mb-0.5">Order</div>
                <div className="font-mono font-semibold text-[#0e393d] text-sm">{selectedOrder.order_number}</div>
              </div>
              <div>
                <div className="text-xs text-[#1c2a2b]/40 mb-0.5">Customer</div>
                <div className="text-sm text-[#1c2a2b]">
                  {[selectedOrder.profiles?.first_name, selectedOrder.profiles?.last_name].filter(Boolean).join(' ') || selectedOrder.profiles?.email || '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#1c2a2b]/40 mb-0.5">Package</div>
                <div className="text-sm text-[#1c2a2b]">{locName((selectedOrder.order_items?.[0] as any)?.products?.name) || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-[#1c2a2b]/40 mb-0.5">Status</div>
                <Badge className="bg-sky-50 text-sky-700 ring-sky-600/20">
                  {selectedOrder.fulfilment_status?.replace('_', ' ')}
                </Badge>
              </div>
            </div>
            <button onClick={clearOrder} className="text-xs text-[#1c2a2b]/40 hover:text-[#1c2a2b] transition">
              Change order
            </button>
          </div>

            {/* ── Stats strip ──────────────────────────────────────────────────── */}
            {!loadingItems && testItems.length > 0 && (
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Total Biomarkers', value: totalItems, cls: 'text-[#0e393d]' },
                  { label: 'Received', value: receivedItems, cls: 'text-emerald-600' },
                  { label: 'Pending', value: pendingItems, cls: 'text-amber-600' },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="rounded-lg border border-[#0e393d]/10 bg-white px-4 py-3 text-center shadow-sm">
                    <div className={`text-2xl font-bold ${cls}`}>{value}</div>
                    <div className="text-xs text-[#1c2a2b]/50 mt-0.5">{label}</div>
                  </div>
                ))}
                {/* Progress */}
                <div className="rounded-lg border border-[#0e393d]/10 bg-white px-4 py-3 text-center shadow-sm">
                  <div className="text-2xl font-bold text-[#0e393d]">{totalItems ? Math.round((receivedItems / totalItems) * 100) : 0}%</div>
                  <div className="text-xs text-[#1c2a2b]/50 mt-0.5">Complete</div>
                </div>
              </div>
            )}

            {/* ── Test date picker ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-[#1c2a2b]/60 shrink-0">Test date</label>
              <input
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                className="rounded-lg border border-[#0e393d]/12 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
              />
            </div>

            {/* ── Biomarker grid ───────────────────────────────────────────────── */}
            {loadingItems ? (
              <div className="flex justify-center py-10"><Spinner size={6} /></div>
            ) : testItems.length === 0 ? (
              <p className="text-sm text-[#1c2a2b]/40 italic py-6 text-center">No test items found for this order. They are created when the sample is collected.</p>
            ) : (
              <div className="space-y-4">
                {presentDomains.map((domain) => {
                  const items = grouped[domain];
                  const doneCount = items.filter((i) => i.status === 'completed').length;
                  const label = HE_DOMAIN_LABEL[domain] ?? domain;
                  const collapsed = collapsedDomains.has(domain);

                  return (
                    <div key={domain} className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden shadow-sm">
                      {/* Domain header */}
                      <button
                        onClick={() => setCollapsedDomains((prev) => {
                          const next = new Set(prev);
                          collapsed ? next.delete(domain) : next.add(domain);
                          return next;
                        })}
                        className="w-full flex items-center justify-between px-5 py-3 bg-[#0e393d]/3 hover:bg-[#0e393d]/5 transition text-left"
                      >
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#ceab84]">
                          {label} — {doneCount} of {items.length} received
                        </span>
                        <div className="flex items-center gap-3">
                          {doneCount < items.length && (
                            <span className="text-[11px] text-amber-600 font-medium">{items.length - doneCount} pending</span>
                          )}
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                            className={`text-[#1c2a2b]/40 transition-transform ${collapsed ? '' : 'rotate-180'}`}>
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      </button>

                      {/* Rows */}
                      {!collapsed && (
                        <div className="divide-y divide-[#0e393d]/6">
                          {items.map((item) => {
                          const def = item.biomarkers;
                          const isCompleted = item.status === 'completed';
                            const isEditing = editState?.itemId === item.id;
                            const currentVal = isEditing ? editState.value : inputValues[item.id] ?? '';
                            const { flag: liveFlag, warning } = computeLive(currentVal, def ?? null);

                            return (
                              <div key={item.id} className={`px-5 py-3 flex items-center gap-4 ${isCompleted && !isEditing ? 'bg-[#fafaf8]/50' : ''}`}>
                                {/* Biomarker name */}
                                <div className="w-48 shrink-0">
                                  <div className="text-xs font-medium text-[#1c2a2b]">{locName(def?.name) || '—'}</div>
                                  {def?.unit && <div className="text-[11px] text-[#1c2a2b]/40">{def.unit}</div>}
                                </div>

                                {/* Value input or display */}
                                <div className="flex-1 flex items-center gap-2">
                                  {isCompleted && !isEditing ? (
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-[#0e393d]">{item.result_value}</span>
                                      <span className="text-xs text-[#1c2a2b]/40">{item.result_unit || def?.unit}</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <div className="relative">
                                        <input
                                          type="number"
                                          step="0.01"
                                          placeholder="Value"
                                          value={isEditing ? editState.value : (inputValues[item.id] ?? '')}
                                          onChange={(e) => {
                                            if (isEditing) {
                                              setEditState({ ...editState!, value: e.target.value });
                                            } else {
                                              setInputValues((prev) => ({ ...prev, [item.id]: e.target.value }));
                                            }
                                          }}
                                          className={`w-28 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition ${
                                            warning
                                              ? 'border-red-300 bg-red-50 focus:ring-red-200 text-red-700'
                                              : 'border-[#0e393d]/12 bg-white placeholder:text-[#1c2a2b]/30 focus:ring-[#0e393d]/10'
                                          }`}
                                        />
                                        {warning && (
                                          <div className="absolute top-full left-0 mt-1 z-10 bg-red-600 text-white text-[11px] rounded px-2 py-1 w-52 leading-tight shadow-lg">
                                            ⚠ {warning}
                                          </div>
                                        )}
                                      </div>
                                      {(() => {
                                        const altUnits = def?.id ? (conversionsMap[def.id] ?? []).map((c) => c.alt_unit) : [];
                                        const selectedUnit = inputUnits[item.id] ?? def?.unit ?? '';
                                        const isAltUnit = selectedUnit !== (def?.unit ?? '');
                                        if (altUnits.length === 0) {
                                          return <span className="text-xs text-[#1c2a2b]/40 shrink-0">{def?.unit}</span>;
                                        }
                                        return (
                                          <div className="flex flex-col gap-1">
                                            <select
                                              value={selectedUnit}
                                              onChange={(e) => setInputUnits((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                              className="rounded-lg border border-[#0e393d]/12 bg-white px-2 py-2 text-xs text-[#1c2a2b]/60 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
                                            >
                                              <option value={def?.unit ?? ''}>{def?.unit}</option>
                                              {altUnits.map((u) => <option key={u} value={u}>{u}</option>)}
                                            </select>
                                            {isAltUnit && (
                                              <span className="text-[10px] text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 leading-tight">
                                                → {def?.unit} on save
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })()}
                                      {liveFlag && <FlagDot flag={liveFlag} />}
                                      {liveFlag && <FlagBadge flag={liveFlag} />}
                                    </div>
                                  )}
                                </div>

                                {/* Reference ranges */}
                                <div className="w-48 shrink-0 hidden lg:block">
                                  {def && <RangeDisplay def={def} />}
                                </div>

                                {/* Status badge */}
                                <div className="w-28 shrink-0">
                                  {isCompleted && !isEditing
                                    ? <FlagBadge flag={item.status_flag} />
                                    : <span className="text-[11px] text-[#1c2a2b]/30 italic">—</span>
                                  }
                                </div>

                                {/* Actions */}
                                <div className="shrink-0 flex items-center gap-1">
                                  {isCompleted && !isEditing && (
                                    <>
                                      <button
                                        onClick={() => setEditState({ itemId: item.id, value: String(item.result_value ?? ''), notes: item.notes ?? '' })}
                                        className="text-[11px] text-[#0e393d]/60 hover:text-[#0e393d] px-2 py-1 rounded hover:bg-[#0e393d]/6 transition"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleDelete(item)}
                                        className="text-[11px] text-red-500/70 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition"
                                      >
                                        Remove
                                      </button>
                                    </>
                                  )}
                                  {isEditing && (
                                    <button
                                      onClick={() => setEditState(null)}
                                      className="text-[11px] text-[#1c2a2b]/40 hover:text-[#1c2a2b] px-2 py-1 rounded hover:bg-[#0e393d]/6 transition"
                                    >
                                      Cancel
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Save button ──────────────────────────────────────────────────── */}
            {testItems.length > 0 && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-[#0e393d] text-white hover:bg-[#0e393d]/90 transition shadow-sm disabled:opacity-50"
              >
                {saving ? <Spinner size={4} /> : null}
                {saving ? 'Saving…' : 'Save All Results'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
