'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AdminTable,
  AdminTableHead,
  AdminTh,
  AdminEmptyRow,
  AdminBadge,
  StatCard,
  StatCardRow,
} from '@/components/admin/shared/AdminUI';

// ─── Types ────────────────────────────────────────────────────────────────────

type Order = {
  id: string;
  order_number: string;
  status: string;
  fulfilment_status: string;
  total_amount: string;
  currency: string;
  email: string;
  created_at: string;
};

type PreviewRow = {
  step: number;
  table_name: string;
  rows_affected: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusColor(s: string): 'green' | 'amber' | 'gray' | 'red' | 'teal' {
  switch (s) {
    case 'paid': return 'green';
    case 'pending': return 'amber';
    case 'cancelled': case 'refunded': return 'red';
    default: return 'gray';
  }
}

function fulfilmentColor(s: string): 'green' | 'amber' | 'gray' | 'teal' | 'purple' | 'sky' {
  switch (s) {
    case 'completed': return 'green';
    case 'results_ready': return 'teal';
    case 'processing': return 'sky';
    case 'sample_collected': return 'purple';
    case 'voucher_sent': return 'amber';
    case 'pending': return 'gray';
    default: return 'gray';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DevToolsTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // ─── Load Data ──────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch with a far-future date to get all orders
      const res = await fetch('/api/admin/dev-tools?before=2099-01-01T00:00:00Z');
      const data = await res.json();
      setOrders(data.orders ?? []);
      setPreview(data.preview ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ─── Actions ────────────────────────────────────────────────────────────

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const selectAll = () => {
    if (selected.size === orders.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(orders.map(o => o.id)));
    }
  };

  const handleDelete = async () => {
    if (selected.size === 0) return;
    const count = selected.size;
    if (!confirm(`Delete ${count} order${count > 1 ? 's' : ''} and ALL related data?\n\nThis includes: order items, vouchers, invoices, lab settlements, lab reports, lab results, test items, status logs, and notes.\n\nThis action cannot be undone.`)) return;

    setDeleting(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/dev-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_specific_orders',
          orderIds: [...selected],
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(`✓ ${data.message}`);
        setSelected(new Set());
        await load();
      } else {
        setResult(`✗ ${data.error}`);
      }
    } catch (err) {
      setResult(`✗ ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    setDeleting(false);
  };

  const handleCleanupAll = async () => {
    if (!confirm('Delete ALL orders and related data?\n\nThis will remove every order, voucher, invoice, settlement, lab report, and lab result linked to any order.\n\nThis action cannot be undone.')) return;

    setDeleting(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/dev-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cleanup_orders',
          before: '2099-01-01T00:00:00Z',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(`✓ ${data.message}`);
        setSelected(new Set());
        await load();
      } else {
        setResult(`✗ ${data.error}`);
      }
    } catch (err) {
      setResult(`✗ ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    setDeleting(false);
  };

  // ─── Loading ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="rounded-xl border border-[#0e393d]/10 bg-white p-12 text-center text-sm text-[#1c2a2b]/40">
        Loading…
      </div>
    );
  }

  // ─── Compute totals from preview ────────────────────────────────────────

  const totalRows = preview.reduce((s, r) => s + Number(r.rows_affected), 0);

  return (
    <div className="space-y-6">
      {/* Warning banner */}
      <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 px-5 py-4">
        <div className="flex items-start gap-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600 mt-0.5 shrink-0">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-amber-800">Test Data Cleanup</h3>
            <p className="text-xs text-amber-700/70 mt-1">
              Use these tools to remove test orders and all related data (vouchers, invoices, settlements, lab reports, results).
              Deletion follows the correct dependency chain so no orphan data remains.
              This is irreversible.
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <StatCardRow>
        <StatCard value={orders.length} label="Orders" detail="In database" />
        <StatCard
          value={totalRows}
          label="Total Related Rows"
          variant={totalRows > 0 ? 'amber' : 'emerald'}
          detail="Across all tables"
        />
        <StatCard
          value={selected.size}
          label="Selected"
          variant={selected.size > 0 ? 'amber' : 'default'}
          detail="For deletion"
        />
      </StatCardRow>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleDelete}
          disabled={selected.size === 0 || deleting}
          className="px-5 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-30 bg-red-600 text-white hover:bg-red-700 shadow-sm"
        >
          {deleting ? 'Deleting…' : `Delete Selected (${selected.size})`}
        </button>
        <button
          onClick={handleCleanupAll}
          disabled={orders.length === 0 || deleting}
          className="px-5 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-30 border border-red-300 text-red-600 hover:bg-red-50"
        >
          Delete All Orders
        </button>
        <button
          onClick={load}
          disabled={deleting}
          className="px-3.5 py-2.5 rounded-xl text-sm text-[#0e393d]/40 hover:text-[#0e393d] border border-[#0e393d]/10 hover:border-[#0e393d]/20 transition"
        >
          Refresh
        </button>
      </div>

      {/* Result message */}
      {result && (
        <div className={`rounded-lg px-4 py-3 text-sm font-medium ${
          result.startsWith('✓')
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
            : 'bg-red-50 text-red-700 border border-red-200/60'
        }`}>
          {result}
        </div>
      )}

      {/* Orders table */}
      <AdminTable>
        <AdminTableHead>
          <th className="px-3 py-3 w-10">
            <input
              type="checkbox"
              checked={selected.size === orders.length && orders.length > 0}
              onChange={selectAll}
              className="rounded border-[#0e393d]/30 text-[#0e393d] focus:ring-[#0e393d]/20"
            />
          </th>
          <AdminTh label="Order #" />
          <AdminTh label="Status" />
          <AdminTh label="Fulfilment" />
          <AdminTh label="Amount" className="text-right" />
          <AdminTh label="Email" />
          <AdminTh label="Created" />
        </AdminTableHead>
        <tbody className="divide-y divide-[#0e393d]/5">
          {orders.map(o => (
            <tr
              key={o.id}
              className={`transition-colors ${selected.has(o.id) ? 'bg-red-50/50' : 'hover:bg-[#fafaf8]'}`}
            >
              <td className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={selected.has(o.id)}
                  onChange={() => toggleSelect(o.id)}
                  className="rounded border-[#0e393d]/30 text-[#0e393d] focus:ring-[#0e393d]/20"
                />
              </td>
              <td className="px-3 py-3 font-mono text-xs text-[#0e393d]">{o.order_number}</td>
              <td className="px-3 py-3"><AdminBadge color={statusColor(o.status)}>{o.status}</AdminBadge></td>
              <td className="px-3 py-3"><AdminBadge color={fulfilmentColor(o.fulfilment_status)}>{o.fulfilment_status}</AdminBadge></td>
              <td className="px-3 py-3 text-right font-medium text-[#0e393d]">{Number(o.total_amount).toFixed(2)} {o.currency}</td>
              <td className="px-3 py-3 text-xs text-[#0e393d]/50">{o.email}</td>
              <td className="px-3 py-3 text-xs text-[#0e393d]/40">{fmtDate(o.created_at)}</td>
            </tr>
          ))}
          {orders.length === 0 && (
            <AdminEmptyRow colSpan={7} message="No orders in database" hint="Place a test order to see it here" />
          )}
        </tbody>
      </AdminTable>

      {/* Dependency preview table */}
      {preview.length > 0 && preview.some(r => r.rows_affected > 0) && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-widest text-[#0e393d]/30 mb-3">
            Deletion Dependency Chain (what would be deleted)
          </h4>
          <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/[0.03]">
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#0e393d]/50">Step</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#0e393d]/50">Table</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-[#0e393d]/50">Rows</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0e393d]/5">
                {preview.filter(r => r.rows_affected > 0).map(r => (
                  <tr key={r.step}>
                    <td className="px-3 py-2 text-[#0e393d]/30 text-xs">{r.step}</td>
                    <td className="px-3 py-2 text-[#0e393d] text-xs font-mono">{r.table_name}</td>
                    <td className="px-3 py-2 text-right font-semibold text-amber-700">{r.rows_affected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
