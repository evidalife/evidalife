'use client';

import { useState, useEffect, useCallback } from 'react';
import type { LabPartner } from './LabPartnersManager';

type SettlementItem = {
  id: string;
  lab_partner_id: string;
  billing_lab_id: string | null;
  redeeming_lab_id: string | null;
  product_name: string;
  gross_amount: number;
  lab_cost: number | null;
  lab_payout_amount: number;
  evida_revenue: number;
  currency: string;
  status: string;
  batch_id: string | null;
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
};

const inputCls =
  'w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition';

export default function LabSettlementsManager({
  labPartners,
}: {
  labPartners: LabPartner[];
}) {
  const [items, setItems] = useState<SettlementItem[]>([]);
  const [batches, setBatches] = useState<SettlementBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLab, setSelectedLab] = useState<string | null>(null);
  const [settling, setSettling] = useState(false);
  const [settleRef, setSettleRef] = useState('');
  const [view, setView] = useState<'overview' | 'detail'>('overview');

  const billingLabs = labPartners.filter(l => !l.parent_lab_id);

  const loadAll = useCallback(async () => {
    setLoading(true);
    // Load settlements for all labs (or a specific one)
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

  // Aggregate per billing lab
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
    };
  }).filter(s => s.pendingCount > 0 || s.paidPayout > 0 || s.totalGross > 0);

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

  const fmtDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleSettleLab = async (labId: string) => {
    const pendingIds = items
      .filter(i => (i.billing_lab_id || i.lab_partner_id) === labId && (i.status === 'pending' || i.status === 'approved'))
      .map(i => i.id);
    if (!pendingIds.length) return;

    setSettling(true);
    try {
      await fetch('/api/admin/lab-settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labId, itemIds: pendingIds, paymentReference: settleRef.trim() || null }),
      });
      await loadAll();
      setSettleRef('');
      setSelectedLab(null);
    } catch { /* ignore */ }
    setSettling(false);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-[#0e393d]/10 p-8 text-center text-sm text-[#0e393d]/40">
        Loading settlement data…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[#0e393d]/10 p-5 text-center">
          <p className="text-[10px] uppercase tracking-wider text-amber-600/70">Pending Payouts</p>
          <p className="text-2xl font-serif text-amber-700 mt-1">{totalPendingPayout.toFixed(2)}</p>
          <p className="text-[10px] text-[#0e393d]/40 mt-0.5">CHF · {globalPending.length} items</p>
        </div>
        <div className="bg-white rounded-xl border border-[#0e393d]/10 p-5 text-center">
          <p className="text-[10px] uppercase tracking-wider text-emerald-600/70">Paid Out</p>
          <p className="text-2xl font-serif text-emerald-700 mt-1">{totalPaidOut.toFixed(2)}</p>
          <p className="text-[10px] text-[#0e393d]/40 mt-0.5">CHF · {globalPaid.length} items</p>
        </div>
        <div className="bg-white rounded-xl border border-[#0e393d]/10 p-5 text-center">
          <p className="text-[10px] uppercase tracking-wider text-[#0e393d]/50">Total Revenue</p>
          <p className="text-2xl font-serif text-[#0e393d] mt-1">{totalGross.toFixed(2)}</p>
          <p className="text-[10px] text-[#0e393d]/40 mt-0.5">CHF gross</p>
        </div>
        <div className="bg-white rounded-xl border border-[#0e393d]/10 p-5 text-center">
          <p className="text-[10px] uppercase tracking-wider text-[#ceab84]">Evida Margin</p>
          <p className="text-2xl font-serif text-[#ceab84] mt-1">{totalEvidaRevenue.toFixed(2)}</p>
          <p className="text-[10px] text-[#0e393d]/40 mt-0.5">CHF net</p>
        </div>
      </div>

      {/* Per-lab breakdown */}
      <div className="bg-white rounded-xl border border-[#0e393d]/10 overflow-hidden">
        <div className="bg-[#fafaf8] px-5 py-3 border-b border-[#0e393d]/8 flex items-center justify-between">
          <h3 className="text-sm font-medium text-[#0e393d]">Settlement by Lab Organization</h3>
          <button onClick={loadAll} className="text-xs text-[#0e393d]/40 hover:text-[#0e393d]">Refresh</button>
        </div>

        {labSummaries.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#0e393d]/40">
            No settlements yet. Settlements are created when labs redeem vouchers.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-[#0e393d]/40 border-b border-[#0e393d]/5">
                <th className="text-left px-5 py-3 font-medium">Lab Organization</th>
                <th className="text-right px-4 py-3 font-medium">Pending</th>
                <th className="text-right px-4 py-3 font-medium">Paid</th>
                <th className="text-right px-4 py-3 font-medium">Gross</th>
                <th className="text-right px-4 py-3 font-medium">Evida Margin</th>
                <th className="text-center px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {labSummaries.map(s => {
                const isSelected = selectedLab === s.labId;
                return (
                  <tr key={s.labId} className="border-t border-[#0e393d]/5">
                    <td className="px-5 py-3">
                      <span className="font-medium text-[#0e393d]">{s.labName}</span>
                      {s.labCode && <span className="ml-2 text-[10px] text-[#0e393d]/30 font-mono">{s.labCode}</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {s.pendingCount > 0 ? (
                        <span className="font-semibold text-amber-700">{s.pendingPayout.toFixed(2)} <span className="text-[10px] font-normal">({s.pendingCount})</span></span>
                      ) : (
                        <span className="text-[#0e393d]/20">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-700">{s.paidPayout.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-[#0e393d]/60">{s.totalGross.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-[#ceab84]">{s.totalEvidaRevenue.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      {s.pendingCount > 0 && (
                        isSelected ? (
                          <div className="flex items-center gap-2 justify-center">
                            <input
                              className="w-36 rounded border border-[#0e393d]/15 px-2 py-1 text-xs"
                              value={settleRef}
                              onChange={e => setSettleRef(e.target.value)}
                              placeholder="Payment ref…"
                              onKeyDown={e => e.key === 'Enter' && handleSettleLab(s.labId)}
                            />
                            <button
                              onClick={() => handleSettleLab(s.labId)}
                              disabled={settling}
                              className="px-3 py-1 rounded bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 disabled:opacity-50 transition"
                            >
                              {settling ? '…' : 'Confirm'}
                            </button>
                            <button
                              onClick={() => { setSelectedLab(null); setSettleRef(''); }}
                              className="px-2 py-1 text-xs text-[#0e393d]/40 hover:text-[#0e393d]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedLab(s.labId)}
                            className="px-3 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100 transition"
                          >
                            Settle {s.pendingPayout.toFixed(2)} CHF
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent batches */}
      {batches.length > 0 && (
        <div className="bg-white rounded-xl border border-[#0e393d]/10 overflow-hidden">
          <div className="bg-[#fafaf8] px-5 py-3 border-b border-[#0e393d]/8">
            <h3 className="text-sm font-medium text-[#0e393d]">Settlement History</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-[#0e393d]/40 border-b border-[#0e393d]/5">
                <th className="text-left px-5 py-3 font-medium">Batch</th>
                <th className="text-left px-4 py-3 font-medium">Lab</th>
                <th className="text-left px-4 py-3 font-medium">Period</th>
                <th className="text-right px-4 py-3 font-medium">Lab Payout</th>
                <th className="text-right px-4 py-3 font-medium">Items</th>
                <th className="text-left px-4 py-3 font-medium">Paid</th>
                <th className="text-left px-4 py-3 font-medium">Reference</th>
              </tr>
            </thead>
            <tbody>
              {batches.sort((a, b) => b.paid_at?.localeCompare(a.paid_at ?? '') ?? 0).map(b => (
                <tr key={b.id} className="border-t border-[#0e393d]/5">
                  <td className="px-5 py-3 font-mono text-xs text-[#0e393d]/50">{b.batch_number}</td>
                  <td className="px-4 py-3">{labName(b.lab_partner_id)}</td>
                  <td className="px-4 py-3 text-[#0e393d]/60">{b.period_from} — {b.period_to}</td>
                  <td className="px-4 py-3 text-right font-medium text-emerald-700">{Number(b.total_lab_payout).toFixed(2)} CHF</td>
                  <td className="px-4 py-3 text-right text-[#0e393d]/50">{b.item_count}</td>
                  <td className="px-4 py-3 text-[#0e393d]/50">{fmtDate(b.paid_at)}</td>
                  <td className="px-4 py-3 text-[#0e393d]/40 text-xs">{b.payment_reference || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
