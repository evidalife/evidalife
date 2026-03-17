'use client';

import { useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFlag = 'optimal' | 'good' | 'moderate' | 'risk';

type BiomarkerDef = {
  id: string;
  name: string;
  unit: string | null;
  category: string | null;
};

type LabResult = {
  id: string;
  order_id: string | null;
  user_id: string | null;
  biomarker_definition_id: string;
  value_numeric: number | null;
  status_flag: StatusFlag | null;
  collected_at: string | null;
  lab_partner_id: string | null;
  notes: string | null;
  created_at: string;
  biomarker_definitions: BiomarkerDef | null;
  profiles: { email: string | null; full_name: string | null } | null;
  orders: { order_number: string } | null;
};

type Order = {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  profiles: { email: string | null; full_name: string | null } | null;
};

type BiomarkerRow = {
  biomarker: BiomarkerDef;
  existingResult: LabResult | null;
  value: string;
  flag: StatusFlag | '';
};

// ─── Config ───────────────────────────────────────────────────────────────────

const ALL_FLAGS: StatusFlag[] = ['optimal', 'good', 'moderate', 'risk'];

const FLAG_LABEL: Record<StatusFlag, string> = {
  optimal:  'Optimal',
  good:     'Good',
  moderate: 'Moderate',
  risk:     'Risk',
};

type FlagVariant = 'green' | 'teal' | 'amber' | 'red';

const FLAG_COLOR: Record<StatusFlag, FlagVariant> = {
  optimal:  'green',
  good:     'teal',
  moderate: 'amber',
  risk:     'red',
};

// ─── Shared primitives ────────────────────────────────────────────────────────

function Badge({ variant, children }: { variant: FlagVariant | 'gray'; children: React.ReactNode }) {
  const cls: Record<string, string> = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    teal:  'bg-[#0e393d]/8 text-[#0e393d] ring-[#0e393d]/20',
    amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    red:   'bg-red-50 text-red-700 ring-red-600/20',
    gray:  'bg-gray-50 text-gray-500 ring-gray-400/20',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset whitespace-nowrap ${cls[variant]}`}>
      {children}
    </span>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ceab84] mb-3">{children}</p>
  );
}

function Spinner() {
  return <div className="h-3 w-3 animate-spin rounded-full border border-[#0e393d]/30 border-t-[#0e393d]" />;
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LabResultsManager({
  initialResults,
  initialOrders,
}: {
  initialResults: LabResult[];
  initialOrders: Order[];
}) {
  const supabase = createClient();

  const [results, setResults] = useState<LabResult[]>(initialResults);
  const [orders] = useState<Order[]>(initialOrders);

  // List filters
  const [flagFilter, setFlagFilter] = useState<StatusFlag | 'all'>('all');
  const [search, setSearch] = useState('');

  // Upload panel state
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [biomarkerRows, setBiomarkerRows] = useState<BiomarkerRow[]>([]);
  const [loadingBiomarkers, setLoadingBiomarkers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [collectedAt, setCollectedAt] = useState('');

  // Edit state
  const [editingResult, setEditingResult] = useState<LabResult | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editFlag, setEditFlag] = useState<StatusFlag | ''>('');
  const [editSaving, setEditSaving] = useState(false);

  // ── Refresh ──────────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('lab_results')
      .select(`
        *,
        biomarker_definitions ( id, name, unit, category ),
        profiles ( email, full_name ),
        orders ( order_number )
      `)
      .order('created_at', { ascending: false })
      .limit(1000);
    if (data) setResults(data);
  }, [supabase]);

  // ── Load biomarkers for selected order ───────────────────────────────────────

  const loadBiomarkersForOrder = useCallback(async (orderId: string) => {
    if (!orderId) { setBiomarkerRows([]); return; }
    setLoadingBiomarkers(true);
    setBiomarkerRows([]);

    // Traverse: order_items → products → product_items → product_item_definitions → biomarker_definitions
    const { data: items } = await supabase
      .from('order_items')
      .select(`
        products (
          id, name,
          product_items (
            id,
            product_item_definitions (
              id,
              biomarker_definitions ( id, name, unit, category )
            )
          )
        )
      `)
      .eq('order_id', orderId);

    // Flatten to unique biomarkers
    const seen = new Set<string>();
    const biomarkers: BiomarkerDef[] = [];
    for (const oi of items ?? []) {
      const product = (oi as any).products;
      if (!product) continue;
      for (const pi of product.product_items ?? []) {
        const bd = pi.product_item_definitions?.biomarker_definitions;
        if (bd && !seen.has(bd.id)) {
          seen.add(bd.id);
          biomarkers.push(bd);
        }
      }
    }

    // Find existing results for this order to pre-fill
    const existing = results.filter((r) => r.order_id === orderId);

    const rows: BiomarkerRow[] = biomarkers.map((bm) => {
      const ex = existing.find((r) => r.biomarker_definition_id === bm.id) ?? null;
      return {
        biomarker: bm,
        existingResult: ex,
        value: ex?.value_numeric?.toString() ?? '',
        flag: ex?.status_flag ?? '',
      };
    });

    setBiomarkerRows(rows);
    setLoadingBiomarkers(false);
  }, [supabase, results]);

  // ── Handle order select ───────────────────────────────────────────────────────

  const handleOrderSelect = (orderId: string) => {
    setSelectedOrderId(orderId);
    loadBiomarkersForOrder(orderId);
  };

  // ── Update a row value ────────────────────────────────────────────────────────

  const updateRow = (idx: number, field: 'value' | 'flag', val: string) => {
    setBiomarkerRows((rows) =>
      rows.map((r, i) => (i === idx ? { ...r, [field]: val } : r))
    );
  };

  // ── Save all results ─────────────────────────────────────────────────────────

  const handleSave = async () => {
    const order = orders.find((o) => o.id === selectedOrderId);
    if (!order) return;
    setSaving(true);
    setSaveError('');

    const rowsToSave = biomarkerRows.filter((r) => r.value !== '' || r.flag !== '');
    if (rowsToSave.length === 0) {
      setSaveError('Enter at least one value before saving.');
      setSaving(false);
      return;
    }

    const upserts = rowsToSave.map((r) => ({
      ...(r.existingResult ? { id: r.existingResult.id } : {}),
      order_id: selectedOrderId,
      user_id: order.profiles ? (r.existingResult?.user_id ?? null) : null,
      biomarker_definition_id: r.biomarker.id,
      value_numeric: r.value !== '' ? parseFloat(r.value) : null,
      status_flag: r.flag !== '' ? r.flag : null,
      collected_at: collectedAt || null,
    }));

    const { error } = await supabase
      .from('lab_results')
      .upsert(upserts, { onConflict: 'id' });

    if (error) {
      setSaveError(error.message);
      setSaving(false);
      return;
    }

    await refresh();
    setSaving(false);
    setPanelOpen(false);
    setSelectedOrderId('');
    setBiomarkerRows([]);
    setCollectedAt('');
  };

  // ── Edit existing result ──────────────────────────────────────────────────────

  const openEdit = (r: LabResult) => {
    setEditingResult(r);
    setEditValue(r.value_numeric?.toString() ?? '');
    setEditFlag(r.status_flag ?? '');
  };

  const handleEditSave = async () => {
    if (!editingResult) return;
    setEditSaving(true);
    await supabase
      .from('lab_results')
      .update({
        value_numeric: editValue !== '' ? parseFloat(editValue) : null,
        status_flag: editFlag !== '' ? editFlag : null,
      })
      .eq('id', editingResult.id);
    await refresh();
    setEditSaving(false);
    setEditingResult(null);
  };

  // ── Filters ───────────────────────────────────────────────────────────────────

  const filtered = results.filter((r) => {
    if (flagFilter !== 'all' && r.status_flag !== flagFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const bm = r.biomarker_definitions?.name?.toLowerCase() ?? '';
      const em = r.profiles?.email?.toLowerCase() ?? '';
      const on = r.orders?.order_number?.toLowerCase() ?? '';
      if (!bm.includes(q) && !em.includes(q) && !on.includes(q)) return false;
    }
    return true;
  });

  const flagCounts = ALL_FLAGS.reduce((acc, f) => {
    acc[f] = results.filter((r) => r.status_flag === f).length;
    return acc;
  }, {} as Record<StatusFlag, number>);

  // ── Close upload panel ────────────────────────────────────────────────────────

  const closePanel = () => {
    setPanelOpen(false);
    setSelectedOrderId('');
    setBiomarkerRows([]);
    setSaveError('');
    setCollectedAt('');
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-[#0e393d]">Lab Results</h1>
          <p className="mt-0.5 text-sm text-[#1c2a2b]/50">
            {results.length} result{results.length !== 1 ? 's' : ''} uploaded
          </p>
        </div>
        <button
          onClick={() => setPanelOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-[#0e393d] px-4 py-2 text-sm font-medium text-white hover:bg-[#0e393d]/90 transition"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          Upload Results
        </button>
      </div>

      {/* Status flag quick-filter pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => setFlagFilter('all')}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            flagFilter === 'all'
              ? 'bg-[#0e393d] text-white'
              : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30'
          }`}
        >
          All ({results.length})
        </button>
        {ALL_FLAGS.map((f) => (
          <button
            key={f}
            onClick={() => setFlagFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              flagFilter === f
                ? 'bg-[#0e393d] text-white'
                : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30'
            }`}
          >
            {FLAG_LABEL[f]} ({flagCounts[f]})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search biomarker, email, or order #…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition w-72"
        />
        {(search || flagFilter !== 'all') && (
          <button
            onClick={() => { setSearch(''); setFlagFilter('all'); }}
            className="text-xs text-[#1c2a2b]/40 hover:text-[#1c2a2b] transition"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Results table */}
      <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/3">
              {['Biomarker', 'Patient', 'Order #', 'Value', 'Status', 'Date', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0e393d]/6">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-[#1c2a2b]/40">
                  {results.length === 0
                    ? 'No lab results uploaded yet. Use the Upload Results button to get started.'
                    : 'No results match the current filters.'}
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-[#fafaf8] transition-colors">

                {/* Biomarker */}
                <td className="px-4 py-3">
                  <div className="text-xs font-medium text-[#1c2a2b]">
                    {r.biomarker_definitions?.name ?? <span className="text-[#1c2a2b]/30">Unknown</span>}
                  </div>
                  {r.biomarker_definitions?.category && (
                    <div className="text-[10px] text-[#1c2a2b]/40 mt-0.5">{r.biomarker_definitions.category}</div>
                  )}
                </td>

                {/* Patient */}
                <td className="px-4 py-3">
                  <div className="text-xs text-[#1c2a2b]">{r.profiles?.email ?? <span className="text-[#1c2a2b]/30">—</span>}</div>
                  {r.profiles?.full_name && (
                    <div className="text-[10px] text-[#1c2a2b]/40 mt-0.5">{r.profiles.full_name}</div>
                  )}
                </td>

                {/* Order # */}
                <td className="px-4 py-3">
                  <span className="font-mono text-[#0e393d] text-xs">
                    {r.orders?.order_number ?? <span className="text-[#1c2a2b]/30">—</span>}
                  </span>
                </td>

                {/* Value */}
                <td className="px-4 py-3 tabular-nums text-xs text-[#1c2a2b]/80">
                  {r.value_numeric != null
                    ? `${r.value_numeric.toLocaleString('de-CH')}${r.biomarker_definitions?.unit ? ` ${r.biomarker_definitions.unit}` : ''}`
                    : <span className="text-[#1c2a2b]/30">—</span>
                  }
                </td>

                {/* Status flag */}
                <td className="px-4 py-3">
                  {r.status_flag
                    ? <Badge variant={FLAG_COLOR[r.status_flag]}>{FLAG_LABEL[r.status_flag]}</Badge>
                    : <Badge variant="gray">—</Badge>
                  }
                </td>

                {/* Date */}
                <td className="px-4 py-3 text-xs text-[#1c2a2b]/50 whitespace-nowrap">
                  {fmtDate(r.created_at)}
                </td>

                {/* Edit */}
                <td className="px-4 py-3">
                  <button
                    onClick={() => openEdit(r)}
                    className="px-3 py-1 rounded-md text-xs font-medium text-[#0e393d] bg-[#0e393d]/8 hover:bg-[#0e393d]/15 transition"
                  >
                    Edit
                  </button>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length !== results.length && (
        <p className="mt-2 text-xs text-[#1c2a2b]/40">
          Showing {filtered.length} of {results.length} results
        </p>
      )}

      {/* ── Upload slide-over ────────────────────────────────────────────────── */}
      {panelOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]"
            onClick={closePanel}
          />
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-white shadow-2xl">

            {/* Panel header */}
            <div className="flex items-start justify-between border-b border-[#0e393d]/10 px-6 py-4">
              <div>
                <h2 className="font-serif text-lg text-[#0e393d]">Upload Lab Results</h2>
                <p className="text-xs text-[#1c2a2b]/40 mt-0.5">
                  Select an order, then enter values for each biomarker in the package.
                </p>
              </div>
              <button
                onClick={closePanel}
                className="text-[#1c2a2b]/40 hover:text-[#1c2a2b] transition mt-0.5"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* Order selector */}
              <div>
                <SectionHeading>Select Order</SectionHeading>
                <select
                  value={selectedOrderId}
                  onChange={(e) => handleOrderSelect(e.target.value)}
                  className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2.5 text-sm text-[#1c2a2b] focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition cursor-pointer"
                >
                  <option value="">— Choose an order —</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.order_number}
                      {o.profiles?.email ? ` · ${o.profiles.email}` : ''}
                      {o.profiles?.full_name ? ` (${o.profiles.full_name})` : ''}
                    </option>
                  ))}
                </select>
                {orders.length === 0 && (
                  <p className="mt-2 text-xs text-amber-600">
                    No eligible orders found. Orders must be in paid, dispatched, sample_received, processing, or results_ready status.
                  </p>
                )}
              </div>

              {/* Collection date */}
              {selectedOrderId && (
                <div>
                  <SectionHeading>Collection Date (optional)</SectionHeading>
                  <input
                    type="date"
                    value={collectedAt}
                    onChange={(e) => setCollectedAt(e.target.value)}
                    className="rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
                  />
                </div>
              )}

              {/* Biomarkers form */}
              {selectedOrderId && (
                <div>
                  <SectionHeading>
                    Biomarker Values
                    {biomarkerRows.length > 0 && ` (${biomarkerRows.length} markers)`}
                  </SectionHeading>

                  {loadingBiomarkers && (
                    <div className="flex items-center gap-2 py-6 text-sm text-[#1c2a2b]/50">
                      <Spinner />
                      Loading biomarkers…
                    </div>
                  )}

                  {!loadingBiomarkers && biomarkerRows.length === 0 && (
                    <p className="text-sm text-[#1c2a2b]/40 py-4">
                      No biomarkers found for this order. The order's products may not have biomarker definitions linked.
                    </p>
                  )}

                  {!loadingBiomarkers && biomarkerRows.length > 0 && (
                    <div className="rounded-xl border border-[#0e393d]/10 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-[#0e393d]/3 border-b border-[#0e393d]/8">
                            <th className="px-4 py-2.5 text-left text-xs font-medium text-[#0e393d]/60">Biomarker</th>
                            <th className="px-4 py-2.5 text-left text-xs font-medium text-[#0e393d]/60 w-36">Value</th>
                            <th className="px-4 py-2.5 text-left text-xs font-medium text-[#0e393d]/60 w-40">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#0e393d]/6">
                          {biomarkerRows.map((row, idx) => (
                            <tr key={row.biomarker.id} className={row.existingResult ? 'bg-[#0e393d]/2' : 'bg-white'}>
                              <td className="px-4 py-2.5">
                                <div className="text-xs font-medium text-[#1c2a2b]">{row.biomarker.name}</div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {row.biomarker.unit && (
                                    <span className="text-[10px] font-mono text-[#1c2a2b]/40">{row.biomarker.unit}</span>
                                  )}
                                  {row.biomarker.category && (
                                    <span className="text-[10px] text-[#1c2a2b]/30">{row.biomarker.category}</span>
                                  )}
                                  {row.existingResult && (
                                    <span className="text-[10px] text-[#ceab84]">existing</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    step="any"
                                    value={row.value}
                                    onChange={(e) => updateRow(idx, 'value', e.target.value)}
                                    placeholder="—"
                                    className="w-24 rounded border border-[#0e393d]/15 bg-white px-2 py-1 text-xs tabular-nums focus:border-[#0e393d]/40 focus:outline-none focus:ring-1 focus:ring-[#0e393d]/10 transition"
                                  />
                                  {row.biomarker.unit && (
                                    <span className="text-[10px] text-[#1c2a2b]/40 shrink-0">{row.biomarker.unit}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-2.5">
                                <select
                                  value={row.flag}
                                  onChange={(e) => updateRow(idx, 'flag', e.target.value)}
                                  className="rounded border border-[#0e393d]/15 bg-white px-2 py-1 text-xs text-[#1c2a2b] focus:border-[#0e393d]/40 focus:outline-none focus:ring-1 focus:ring-[#0e393d]/10 transition cursor-pointer"
                                >
                                  <option value="">— flag —</option>
                                  {ALL_FLAGS.map((f) => (
                                    <option key={f} value={f}>{FLAG_LABEL[f]}</option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {saveError && (
                <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-xs text-red-600">
                  {saveError}
                </p>
              )}

            </div>

            {/* Panel footer */}
            <div className="border-t border-[#0e393d]/10 px-6 py-4 flex items-center justify-between gap-4">
              <button
                onClick={closePanel}
                className="text-sm text-[#1c2a2b]/50 hover:text-[#1c2a2b] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !selectedOrderId || biomarkerRows.length === 0}
                className="flex items-center gap-2 rounded-lg bg-[#0e393d] px-5 py-2 text-sm font-medium text-white hover:bg-[#0e393d]/90 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving && <Spinner />}
                Save Results
              </button>
            </div>

          </div>
        </>
      )}

      {/* ── Edit result slide-over ───────────────────────────────────────────── */}
      {editingResult && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]"
            onClick={() => setEditingResult(null)}
          />
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-2xl">

            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#0e393d]/10 px-6 py-4">
              <div>
                <h2 className="font-serif text-lg text-[#0e393d]">Edit Result</h2>
                <p className="text-xs text-[#1c2a2b]/40 mt-0.5">
                  {editingResult.biomarker_definitions?.name}
                  {editingResult.orders?.order_number ? ` · ${editingResult.orders.order_number}` : ''}
                </p>
              </div>
              <button
                onClick={() => setEditingResult(null)}
                className="text-[#1c2a2b]/40 hover:text-[#1c2a2b] transition mt-0.5"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div>
                <SectionHeading>Biomarker</SectionHeading>
                <div className="rounded-lg border border-[#0e393d]/8 bg-[#fafaf8] px-4 py-3 space-y-1.5">
                  <p className="text-sm font-medium text-[#1c2a2b]">{editingResult.biomarker_definitions?.name}</p>
                  {editingResult.biomarker_definitions?.category && (
                    <p className="text-xs text-[#1c2a2b]/50">{editingResult.biomarker_definitions.category}</p>
                  )}
                </div>
              </div>

              <div>
                <SectionHeading>Value</SectionHeading>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="any"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-36 rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm tabular-nums focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
                  />
                  {editingResult.biomarker_definitions?.unit && (
                    <span className="text-sm text-[#1c2a2b]/50">{editingResult.biomarker_definitions.unit}</span>
                  )}
                </div>
              </div>

              <div>
                <SectionHeading>Status Flag</SectionHeading>
                <div className="flex flex-wrap gap-2">
                  {ALL_FLAGS.map((f) => (
                    <button
                      key={f}
                      onClick={() => setEditFlag(editFlag === f ? '' : f)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ring-1 ring-inset ${
                        editFlag === f
                          ? {
                              optimal:  'bg-emerald-600 text-white ring-emerald-600',
                              good:     'bg-[#0e393d] text-white ring-[#0e393d]',
                              moderate: 'bg-amber-500 text-white ring-amber-500',
                              risk:     'bg-red-600 text-white ring-red-600',
                            }[f]
                          : 'bg-white text-[#1c2a2b]/60 ring-[#0e393d]/15 hover:ring-[#0e393d]/30'
                      }`}
                    >
                      {FLAG_LABEL[f]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-[#0e393d]/10 px-6 py-4 flex items-center justify-between gap-4">
              <button
                onClick={() => setEditingResult(null)}
                className="text-sm text-[#1c2a2b]/50 hover:text-[#1c2a2b] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={editSaving}
                className="flex items-center gap-2 rounded-lg bg-[#0e393d] px-5 py-2 text-sm font-medium text-white hover:bg-[#0e393d]/90 transition disabled:opacity-40"
              >
                {editSaving && <Spinner />}
                Save
              </button>
            </div>

          </div>
        </>
      )}

    </div>
  );
}
