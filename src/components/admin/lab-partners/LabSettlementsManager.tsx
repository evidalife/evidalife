'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  inputCls,
  selectCls,
  StatCard,
  StatCardRow,
  AdminTable,
  AdminTableHead,
  AdminTh,
  AdminEmptyRow,
  AdminPanel,
  AdminPanelFooter,
  AdminField,
  AdminBadge,
  AdminSearchField,
  AdminTableFooter,
  AdminSectionBlock,
} from '@/components/admin/shared/AdminUI';
import type { LabPartner } from './LabPartnersManager';

// ─── Types ────────────────────────────────────────────────────────────────────

type SettlementItem = {
  id: string;
  lab_partner_id: string;
  billing_lab_id: string | null;
  redeeming_lab_id: string | null;
  product_id: string | null;
  product_name: string;
  gross_amount: number;
  lab_cost: number | null;
  lab_payout_amount: number;
  evida_revenue: number;
  currency: string;
  status: string;
  batch_id: string | null;
  notes: string | null;
  created_at: string;
  order_vouchers: { voucher_code: string; redeemed_at: string } | null;
  orders: { order_number: string } | null;
};

type SettlementBatch = {
  id: string;
  batch_number: string;
  lab_partner_id: string;
  period_from: string;
  period_to: string;
  total_gross: number;
  total_lab_payout: number;
  total_evida_revenue: number;
  item_count: number;
  currency: string;
  status: string;
  paid_at: string | null;
  payment_reference: string | null;
  notes: string | null;
};

type LabSummary = {
  labId: string;
  labName: string;
  labCode: string | null;
  pendingCount: number;
  pendingPayout: number;
  paidPayout: number;
  totalGross: number;
  totalEvidaRevenue: number;
  itemCount: number;
};

type View = 'overview' | 'lab-detail' | 'batch-detail';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtAmount(amount: number | string, currency: string = 'CHF'): string {
  return `${Number(amount).toFixed(2)} ${currency}`;
}

function statusColor(status: string): 'amber' | 'green' | 'gray' | 'teal' {
  switch (status) {
    case 'pending': return 'amber';
    case 'approved': return 'teal';
    case 'paid': return 'green';
    default: return 'gray';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LabSettlementsManager({
  labPartners,
}: {
  labPartners: LabPartner[];
}) {
  const [items, setItems] = useState<SettlementItem[]>([]);
  const [batches, setBatches] = useState<SettlementBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');

  // View state
  const [view, setView] = useState<View>('overview');
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  // Settle panel state
  const [settleOpen, setSettleOpen] = useState(false);
  const [settleLabId, setSettleLabId] = useState<string | null>(null);
  const [settleRef, setSettleRef] = useState('');
  const [settleNotes, setSettleNotes] = useState('');
  const [settling, setSettling] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);
  const [settleSelectedItems, setSettleSelectedItems] = useState<Set<string>>(new Set());

  const billingLabs = labPartners.filter(l => !l.parent_lab_id);

  // ─── Data Loading ─────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setLoading(true);
    const promises = billingLabs.map(async lab => {
      const res = await fetch(`/api/admin/lab-settlements?labId=${lab.id}`);
      if (!res.ok) return { items: [], batches: [] };
      return res.json();
    });
    const results = await Promise.all(promises);
    const allItems: SettlementItem[] = [];
    const allBatches: SettlementBatch[] = [];
    results.forEach(r => {
      allItems.push(...(r.items ?? []));
      allBatches.push(...(r.batches ?? []));
    });
    setItems(allItems);
    setBatches(allBatches);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ─── Aggregations ─────────────────────────────────────────────────────────

  const labSummaries: LabSummary[] = billingLabs.map(lab => {
    const labItems = items.filter(i => (i.billing_lab_id || i.lab_partner_id) === lab.id);
    const pending = labItems.filter(i => i.status === 'pending' || i.status === 'approved');
    const paid = labItems.filter(i => i.status === 'paid');
    return {
      labId: lab.id,
      labName: lab.name,
      labCode: lab.lab_code,
      pendingCount: pending.length,
      pendingPayout: pending.reduce((s, i) => s + Number(i.lab_payout_amount), 0),
      paidPayout: paid.reduce((s, i) => s + Number(i.lab_payout_amount), 0),
      totalGross: labItems.reduce((s, i) => s + Number(i.gross_amount), 0),
      totalEvidaRevenue: labItems.reduce((s, i) => s + Number(i.evida_revenue), 0),
      itemCount: labItems.length,
    };
  }).filter(s => s.itemCount > 0 || s.pendingCount > 0);

  // Global totals
  const globalPending = items.filter(i => i.status === 'pending' || i.status === 'approved');
  const globalPaid = items.filter(i => i.status === 'paid');
  const totalPendingPayout = globalPending.reduce((s, i) => s + Number(i.lab_payout_amount), 0);
  const totalPaidOut = globalPaid.reduce((s, i) => s + Number(i.lab_payout_amount), 0);
  const totalGross = items.reduce((s, i) => s + Number(i.gross_amount), 0);
  const totalEvidaRevenue = items.reduce((s, i) => s + Number(i.evida_revenue), 0);

  const labName = (id: string | null) => {
    if (!id) return '—';
    return labPartners.find(l => l.id === id)?.name ?? id.slice(0, 8);
  };

  // ─── Filtering ────────────────────────────────────────────────────────────

  const filteredSummaries = labSummaries.filter(s => {
    if (search) {
      const q = search.toLowerCase();
      if (!s.labName.toLowerCase().includes(q) && !(s.labCode ?? '').toLowerCase().includes(q)) return false;
    }
    if (statusFilter === 'pending' && s.pendingCount === 0) return false;
    if (statusFilter === 'paid' && s.pendingCount > 0 && s.paidPayout === 0) return false;
    return true;
  });

  // ─── Settle Flow ──────────────────────────────────────────────────────────

  const openSettlePanel = (labId: string) => {
    const pendingItems = items.filter(
      i => (i.billing_lab_id || i.lab_partner_id) === labId && (i.status === 'pending' || i.status === 'approved')
    );
    setSettleLabId(labId);
    setSettleSelectedItems(new Set(pendingItems.map(i => i.id)));
    setSettleRef('');
    setSettleNotes('');
    setSettleError(null);
    setSettleOpen(true);
  };

  const handleSettle = async () => {
    if (!settleLabId || settleSelectedItems.size === 0) return;

    setSettling(true);
    setSettleError(null);

    try {
      const res = await fetch('/api/admin/lab-settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          labId: settleLabId,
          itemIds: [...settleSelectedItems],
          paymentReference: settleRef.trim() || null,
          notes: settleNotes.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Settlement failed');
      }
      await loadAll();
      setSettleOpen(false);
    } catch (err: unknown) {
      setSettleError(err instanceof Error ? err.message : 'Settlement failed');
    }
    setSettling(false);
  };

  // ─── Lab Detail View ──────────────────────────────────────────────────────

  const labDetailItems = selectedLabId
    ? items.filter(i => (i.billing_lab_id || i.lab_partner_id) === selectedLabId)
    : [];
  const labDetailBatches = selectedLabId
    ? batches.filter(b => b.lab_partner_id === selectedLabId)
    : [];

  // ─── Batch Detail View ────────────────────────────────────────────────────

  const batchDetailItems = selectedBatchId
    ? items.filter(i => i.batch_id === selectedBatchId)
    : [];
  const selectedBatch = selectedBatchId
    ? batches.find(b => b.id === selectedBatchId)
    : null;

  // ─── Loading State ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="rounded-xl border border-[#0e393d]/10 bg-white p-12 text-center text-sm text-[#1c2a2b]/40">
        Loading settlement data…
      </div>
    );
  }

  // ─── Batch Detail View ────────────────────────────────────────────────────

  if (view === 'batch-detail' && selectedBatch) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => { setView(selectedLabId ? 'lab-detail' : 'overview'); setSelectedBatchId(null); }}
          className="flex items-center gap-1.5 text-sm text-[#0e393d]/50 hover:text-[#0e393d] transition"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-lg text-[#0e393d]">Batch {selectedBatch.batch_number}</h3>
            <p className="text-xs text-[#1c2a2b]/40 mt-0.5">
              {labName(selectedBatch.lab_partner_id)} · {fmtDate(selectedBatch.period_from)} — {fmtDate(selectedBatch.period_to)}
            </p>
          </div>
          <AdminBadge color={selectedBatch.status === 'paid' ? 'green' : 'amber'}>
            {selectedBatch.status}
          </AdminBadge>
        </div>

        <StatCardRow>
          <StatCard value={fmtAmount(selectedBatch.total_lab_payout, selectedBatch.currency)} label="Lab Payout" variant="emerald" />
          <StatCard value={fmtAmount(selectedBatch.total_evida_revenue, selectedBatch.currency)} label="Evida Revenue" variant="gold" />
          <StatCard value={selectedBatch.item_count} label="Items" />
          <StatCard value={selectedBatch.payment_reference || '—'} label="Payment Reference" />
        </StatCardRow>

        <AdminTable>
          <AdminTableHead>
            <AdminTh label="Product" />
            <AdminTh label="Voucher" />
            <AdminTh label="Order" />
            <AdminTh label="Gross" className="text-right" />
            <AdminTh label="Lab Cost" className="text-right" />
            <AdminTh label="Margin" className="text-right" />
            <AdminTh label="Redeemed" />
          </AdminTableHead>
          <tbody className="divide-y divide-[#0e393d]/5">
            {batchDetailItems.map(item => (
              <tr key={item.id}>
                <td className="px-3 py-3 text-[#0e393d]">{item.product_name}</td>
                <td className="px-3 py-3 font-mono text-xs text-[#0e393d]/50">{item.order_vouchers?.voucher_code ?? '—'}</td>
                <td className="px-3 py-3 font-mono text-xs text-[#0e393d]/50">{item.orders?.order_number ?? '—'}</td>
                <td className="px-3 py-3 text-right text-[#0e393d]/60">{fmtAmount(item.gross_amount, item.currency)}</td>
                <td className="px-3 py-3 text-right font-medium text-[#0e393d]">{fmtAmount(item.lab_payout_amount, item.currency)}</td>
                <td className="px-3 py-3 text-right text-emerald-700">{fmtAmount(item.evida_revenue, item.currency)}</td>
                <td className="px-3 py-3 text-[#0e393d]/40 text-xs">{fmtDate(item.order_vouchers?.redeemed_at ?? null)}</td>
              </tr>
            ))}
            {batchDetailItems.length === 0 && (
              <AdminEmptyRow colSpan={7} message="No items in this batch" />
            )}
          </tbody>
        </AdminTable>
      </div>
    );
  }

  // ─── Lab Detail View ──────────────────────────────────────────────────────

  if (view === 'lab-detail' && selectedLabId) {
    const summary = labSummaries.find(s => s.labId === selectedLabId);
    return (
      <div className="space-y-4">
        <button
          onClick={() => { setView('overview'); setSelectedLabId(null); }}
          className="flex items-center gap-1.5 text-sm text-[#0e393d]/50 hover:text-[#0e393d] transition"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          All Labs
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-lg text-[#0e393d]">{labName(selectedLabId)}</h3>
            <p className="text-xs text-[#1c2a2b]/40 mt-0.5">
              {summary?.itemCount ?? 0} total settlement items
            </p>
          </div>
          {summary && summary.pendingCount > 0 && (
            <button
              onClick={() => openSettlePanel(selectedLabId)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0e393d] text-white text-sm font-medium hover:bg-[#0e393d]/90 shadow-sm shadow-[#0e393d]/20 transition"
            >
              Settle {fmtAmount(summary.pendingPayout)}
            </button>
          )}
        </div>

        {summary && (
          <StatCardRow>
            <StatCard value={fmtAmount(summary.pendingPayout)} label="Pending Payout" variant="amber" detail={`${summary.pendingCount} items`} />
            <StatCard value={fmtAmount(summary.paidPayout)} label="Paid Out" variant="emerald" />
            <StatCard value={fmtAmount(summary.totalGross)} label="Gross Revenue" />
            <StatCard value={fmtAmount(summary.totalEvidaRevenue)} label="Evida Margin" variant="gold" />
          </StatCardRow>
        )}

        {/* Pending items */}
        {labDetailItems.filter(i => i.status === 'pending' || i.status === 'approved').length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-[#ceab84] mb-3">
              Pending Settlement
            </h4>
            <AdminTable>
              <AdminTableHead>
                <AdminTh label="Product" />
                <AdminTh label="Voucher" />
                <AdminTh label="Order" />
                <AdminTh label="Redeemed By" />
                <AdminTh label="Gross" className="text-right" />
                <AdminTh label="Lab Cost" className="text-right" />
                <AdminTh label="Margin" className="text-right" />
                <AdminTh label="Status" />
                <AdminTh label="Date" />
              </AdminTableHead>
              <tbody className="divide-y divide-[#0e393d]/5">
                {labDetailItems
                  .filter(i => i.status === 'pending' || i.status === 'approved')
                  .sort((a, b) => b.created_at.localeCompare(a.created_at))
                  .map(item => (
                    <tr key={item.id} className="hover:bg-[#fafaf8] transition-colors">
                      <td className="px-3 py-3 text-[#0e393d] font-medium">{item.product_name}</td>
                      <td className="px-3 py-3 font-mono text-xs text-[#0e393d]/50">{item.order_vouchers?.voucher_code ?? '—'}</td>
                      <td className="px-3 py-3 font-mono text-xs text-[#0e393d]/50">{item.orders?.order_number ?? '—'}</td>
                      <td className="px-3 py-3 text-xs text-[#0e393d]/50">
                        {item.redeeming_lab_id && item.redeeming_lab_id !== (item.billing_lab_id || item.lab_partner_id)
                          ? labName(item.redeeming_lab_id)
                          : '—'
                        }
                      </td>
                      <td className="px-3 py-3 text-right text-[#0e393d]/60">{fmtAmount(item.gross_amount, item.currency)}</td>
                      <td className="px-3 py-3 text-right font-medium text-[#0e393d]">{fmtAmount(item.lab_payout_amount, item.currency)}</td>
                      <td className="px-3 py-3 text-right text-emerald-700">{fmtAmount(item.evida_revenue, item.currency)}</td>
                      <td className="px-3 py-3">
                        <AdminBadge color={statusColor(item.status)}>{item.status}</AdminBadge>
                      </td>
                      <td className="px-3 py-3 text-[#0e393d]/40 text-xs">{fmtDate(item.created_at)}</td>
                    </tr>
                  ))}
              </tbody>
            </AdminTable>
          </div>
        )}

        {/* Settlement history */}
        {labDetailBatches.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-[#ceab84] mb-3">
              Settlement History
            </h4>
            <AdminTable>
              <AdminTableHead>
                <AdminTh label="Batch" />
                <AdminTh label="Period" />
                <AdminTh label="Lab Payout" className="text-right" />
                <AdminTh label="Evida Revenue" className="text-right" />
                <AdminTh label="Items" className="text-right" />
                <AdminTh label="Paid" />
                <AdminTh label="Reference" />
              </AdminTableHead>
              <tbody className="divide-y divide-[#0e393d]/5">
                {labDetailBatches
                  .sort((a, b) => (b.paid_at ?? '').localeCompare(a.paid_at ?? ''))
                  .map(b => (
                    <tr
                      key={b.id}
                      className="cursor-pointer hover:bg-[#fafaf8] transition-colors"
                      onClick={() => { setSelectedBatchId(b.id); setView('batch-detail'); }}
                    >
                      <td className="px-3 py-3 font-mono text-xs text-[#0e393d]/50">{b.batch_number}</td>
                      <td className="px-3 py-3 text-[#0e393d]/60 text-xs">{fmtDate(b.period_from)} — {fmtDate(b.period_to)}</td>
                      <td className="px-3 py-3 text-right font-medium text-emerald-700">{fmtAmount(b.total_lab_payout, b.currency)}</td>
                      <td className="px-3 py-3 text-right text-[#ceab84]">{fmtAmount(b.total_evida_revenue, b.currency)}</td>
                      <td className="px-3 py-3 text-right text-[#0e393d]/50">{b.item_count}</td>
                      <td className="px-3 py-3 text-[#0e393d]/50 text-xs">{fmtDate(b.paid_at)}</td>
                      <td className="px-3 py-3 text-[#0e393d]/40 text-xs">{b.payment_reference || '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </AdminTable>
          </div>
        )}

        {/* Paid items (collapsed by default, recent 20) */}
        {labDetailItems.filter(i => i.status === 'paid').length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-widest text-[#0e393d]/30 hover:text-[#0e393d]/50 transition mb-3 list-none flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform group-open:rotate-90"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Paid Items ({labDetailItems.filter(i => i.status === 'paid').length})
            </summary>
            <AdminTable>
              <AdminTableHead>
                <AdminTh label="Product" />
                <AdminTh label="Voucher" />
                <AdminTh label="Lab Payout" className="text-right" />
                <AdminTh label="Batch" />
                <AdminTh label="Date" />
              </AdminTableHead>
              <tbody className="divide-y divide-[#0e393d]/5">
                {labDetailItems
                  .filter(i => i.status === 'paid')
                  .sort((a, b) => b.created_at.localeCompare(a.created_at))
                  .slice(0, 20)
                  .map(item => {
                    const batch = item.batch_id ? batches.find(b => b.id === item.batch_id) : null;
                    return (
                      <tr key={item.id}>
                        <td className="px-3 py-3 text-[#0e393d]">{item.product_name}</td>
                        <td className="px-3 py-3 font-mono text-xs text-[#0e393d]/50">{item.order_vouchers?.voucher_code ?? '—'}</td>
                        <td className="px-3 py-3 text-right font-medium text-emerald-700">{fmtAmount(item.lab_payout_amount, item.currency)}</td>
                        <td className="px-3 py-3 font-mono text-xs text-[#0e393d]/40">{batch?.batch_number ?? '—'}</td>
                        <td className="px-3 py-3 text-[#0e393d]/40 text-xs">{fmtDate(item.created_at)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </AdminTable>
          </details>
        )}
      </div>
    );
  }

  // ─── Overview ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Global summary cards */}
      <StatCardRow>
        <StatCard value={fmtAmount(totalPendingPayout)} label="Pending Payouts" variant="amber" detail={`${globalPending.length} items`} />
        <StatCard value={fmtAmount(totalPaidOut)} label="Paid Out" variant="emerald" detail={`${globalPaid.length} items`} />
        <StatCard value={fmtAmount(totalGross)} label="Total Revenue" detail="Gross" />
        <StatCard value={fmtAmount(totalEvidaRevenue)} label="Evida Margin" variant="gold" detail="Net" />
      </StatCardRow>

      {/* Search & filter bar */}
      <div className="flex items-center justify-between">
        <AdminSearchField
          value={search}
          onChange={setSearch}
          placeholder="Search labs…"
          className="w-64"
        />
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-[#0e393d]/10 overflow-hidden bg-white">
            {(['all', 'pending', 'paid'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-[#0e393d] text-white'
                    : 'text-[#1c2a2b]/50 hover:text-[#0e393d] hover:bg-[#0e393d]/5'
                }`}
              >
                {s === 'all' ? 'All' : s === 'pending' ? 'Pending' : 'Paid'}
              </button>
            ))}
          </div>
          <button
            onClick={loadAll}
            className="px-3.5 py-1.5 rounded-lg border border-[#0e393d]/10 text-xs text-[#0e393d]/40 hover:text-[#0e393d] hover:border-[#0e393d]/20 transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Per-lab breakdown */}
      <AdminTable>
        <AdminTableHead>
          <AdminTh label="Lab Organization" />
          <AdminTh label="Pending" className="text-right" />
          <AdminTh label="Paid" className="text-right" />
          <AdminTh label="Gross" className="text-right" />
          <AdminTh label="Evida Margin" className="text-right" />
          <AdminTh label="" className="text-center" />
        </AdminTableHead>
        <tbody className="divide-y divide-[#0e393d]/5">
          {filteredSummaries.map(s => (
            <tr
              key={s.labId}
              className="cursor-pointer hover:bg-[#fafaf8] transition-colors"
              onClick={() => { setSelectedLabId(s.labId); setView('lab-detail'); }}
            >
              <td className="px-3 py-3">
                <span className="font-medium text-[#0e393d]">{s.labName}</span>
                {s.labCode && <span className="ml-2 text-[10px] text-[#0e393d]/30 font-mono">{s.labCode}</span>}
              </td>
              <td className="px-3 py-3 text-right">
                {s.pendingCount > 0 ? (
                  <span className="font-semibold text-amber-700">
                    {fmtAmount(s.pendingPayout)}
                    <span className="text-[10px] font-normal ml-1">({s.pendingCount})</span>
                  </span>
                ) : (
                  <span className="text-[#0e393d]/20">—</span>
                )}
              </td>
              <td className="px-3 py-3 text-right text-emerald-700">{fmtAmount(s.paidPayout)}</td>
              <td className="px-3 py-3 text-right text-[#0e393d]/60">{fmtAmount(s.totalGross)}</td>
              <td className="px-3 py-3 text-right text-[#ceab84]">{fmtAmount(s.totalEvidaRevenue)}</td>
              <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                {s.pendingCount > 0 && (
                  <button
                    onClick={() => openSettlePanel(s.labId)}
                    className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100 ring-1 ring-inset ring-amber-600/20 transition"
                  >
                    Settle
                  </button>
                )}
              </td>
            </tr>
          ))}
          {filteredSummaries.length === 0 && (
            <AdminEmptyRow
              colSpan={6}
              message="No settlements yet"
              hint="Settlements are created when labs redeem vouchers"
            />
          )}
        </tbody>
      </AdminTable>

      <AdminTableFooter
        showing={filteredSummaries.length}
        total={labSummaries.length}
        hasFilters={!!search || statusFilter !== 'all'}
        onClearFilters={() => { setSearch(''); setStatusFilter('all'); }}
      />

      {/* Recent batches */}
      {batches.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-widest text-[#ceab84] mb-3 mt-6">
            Recent Settlement Batches
          </h4>
          <AdminTable>
            <AdminTableHead>
              <AdminTh label="Batch" />
              <AdminTh label="Lab" />
              <AdminTh label="Period" />
              <AdminTh label="Lab Payout" className="text-right" />
              <AdminTh label="Items" className="text-right" />
              <AdminTh label="Paid" />
              <AdminTh label="Reference" />
            </AdminTableHead>
            <tbody className="divide-y divide-[#0e393d]/5">
              {batches
                .sort((a, b) => (b.paid_at ?? '').localeCompare(a.paid_at ?? ''))
                .slice(0, 10)
                .map(b => (
                  <tr
                    key={b.id}
                    className="cursor-pointer hover:bg-[#fafaf8] transition-colors"
                    onClick={() => { setSelectedLabId(b.lab_partner_id); setSelectedBatchId(b.id); setView('batch-detail'); }}
                  >
                    <td className="px-3 py-3 font-mono text-xs text-[#0e393d]/50">{b.batch_number}</td>
                    <td className="px-3 py-3 text-[#0e393d]">{labName(b.lab_partner_id)}</td>
                    <td className="px-3 py-3 text-[#0e393d]/60 text-xs">{fmtDate(b.period_from)} — {fmtDate(b.period_to)}</td>
                    <td className="px-3 py-3 text-right font-medium text-emerald-700">{fmtAmount(b.total_lab_payout, b.currency)}</td>
                    <td className="px-3 py-3 text-right text-[#0e393d]/50">{b.item_count}</td>
                    <td className="px-3 py-3 text-[#0e393d]/50 text-xs">{fmtDate(b.paid_at)}</td>
                    <td className="px-3 py-3 text-[#0e393d]/40 text-xs">{b.payment_reference || '—'}</td>
                  </tr>
                ))}
            </tbody>
          </AdminTable>
        </div>
      )}

      {/* ─── Settle Panel (Slide-over) ───────────────────────────────────────── */}
      <AdminPanel
        open={settleOpen}
        onClose={() => setSettleOpen(false)}
        title="Create Settlement"
        subtitle={settleLabId ? labName(settleLabId) : undefined}
        width="max-w-lg"
        footer={
          <AdminPanelFooter
            error={settleError}
            saving={settling}
            onCancel={() => setSettleOpen(false)}
            onSave={handleSettle}
            saveLabel={`Settle ${fmtAmount(
              items
                .filter(i => settleSelectedItems.has(i.id))
                .reduce((s, i) => s + Number(i.lab_payout_amount), 0)
            )}`}
          />
        }
      >
        <AdminSectionBlock
          title="Payment Details"
          open={true}
          onToggle={() => {}}
        >
          <AdminField label="Payment Reference" hint="Bank transfer reference number">
            <input
              className={inputCls}
              value={settleRef}
              onChange={e => setSettleRef(e.target.value)}
              placeholder="e.g. WIRE-2026-0042"
            />
          </AdminField>
          <AdminField label="Notes" hint="Optional internal notes">
            <textarea
              className={inputCls + ' min-h-[60px] resize-y'}
              value={settleNotes}
              onChange={e => setSettleNotes(e.target.value)}
              placeholder="Settlement notes…"
            />
          </AdminField>
        </AdminSectionBlock>

        <AdminSectionBlock
          title={`Items (${settleSelectedItems.size})`}
          open={true}
          onToggle={() => {}}
        >
          <div className="space-y-2">
            {settleLabId && items
              .filter(i => (i.billing_lab_id || i.lab_partner_id) === settleLabId && (i.status === 'pending' || i.status === 'approved'))
              .map(item => {
                const isSelected = settleSelectedItems.has(item.id);
                return (
                  <label
                    key={item.id}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2.5 cursor-pointer transition ${
                      isSelected
                        ? 'border-[#0e393d]/20 bg-[#0e393d]/[0.02]'
                        : 'border-[#0e393d]/8 bg-white opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          const next = new Set(settleSelectedItems);
                          isSelected ? next.delete(item.id) : next.add(item.id);
                          setSettleSelectedItems(next);
                        }}
                        className="rounded border-[#0e393d]/30 text-[#0e393d] focus:ring-[#0e393d]/20"
                      />
                      <div>
                        <div className="text-sm text-[#0e393d] font-medium">{item.product_name}</div>
                        <div className="text-[10px] text-[#0e393d]/40">
                          {item.order_vouchers?.voucher_code ?? '—'} · {fmtDate(item.created_at)}
                          {item.redeeming_lab_id && item.redeeming_lab_id !== (item.billing_lab_id || item.lab_partner_id) && (
                            <> · Redeemed by {labName(item.redeeming_lab_id)}</>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-[#0e393d]">{fmtAmount(item.lab_payout_amount, item.currency)}</div>
                      <div className="text-[10px] text-emerald-600/70">Margin: {fmtAmount(item.evida_revenue, item.currency)}</div>
                    </div>
                  </label>
                );
              })}
          </div>

          {/* Totals */}
          <div className="mt-3 pt-3 border-t border-[#0e393d]/8 flex items-center justify-between">
            <span className="text-xs text-[#0e393d]/50">{settleSelectedItems.size} items selected</span>
            <span className="text-sm font-semibold text-[#0e393d]">
              Total: {fmtAmount(
                items
                  .filter(i => settleSelectedItems.has(i.id))
                  .reduce((s, i) => s + Number(i.lab_payout_amount), 0)
              )}
            </span>
          </div>
        </AdminSectionBlock>
      </AdminPanel>
    </div>
  );
}
