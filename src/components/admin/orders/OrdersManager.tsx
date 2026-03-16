'use client';

import { useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus =
  | 'pending' | 'paid' | 'dispatched' | 'sample_received'
  | 'processing' | 'results_ready' | 'completed'
  | 'cancelled' | 'refunded';

type ShippingAddress = {
  name?: string;
  line1?: string;
  line2?: string | null;
  city?: string;
  postal_code?: string;
  country?: string;
};

type OrderItem = {
  id: string;
  quantity: number;
  unit_price: number;
  currency: string;
  products: { name: string; sku: string | null; image_url: string | null } | null;
};

type Order = {
  id: string;
  order_number: string;
  user_id: string;
  status: OrderStatus;
  currency: string;
  total_amount: number;
  stripe_payment_intent_id: string | null;
  stripe_session_id: string | null;
  shipping_address: ShippingAddress | null;
  notes: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  sample_received_at: string | null;
  results_ready_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  profiles: { email: string; full_name: string | null } | null;
  order_items: OrderItem[];
};

// ─── Status config ────────────────────────────────────────────────────────────

const ALL_STATUSES: OrderStatus[] = [
  'pending', 'paid', 'dispatched', 'sample_received',
  'processing', 'results_ready', 'completed', 'cancelled', 'refunded',
];

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending:         'Pending',
  paid:            'Paid',
  dispatched:      'Dispatched',
  sample_received: 'Sample received',
  processing:      'Processing',
  results_ready:   'Results ready',
  completed:       'Completed',
  cancelled:       'Cancelled',
  refunded:        'Refunded',
};

type BadgeVariant = 'gray' | 'sky' | 'violet' | 'indigo' | 'amber' | 'teal' | 'green' | 'red' | 'orange';

const STATUS_COLOR: Record<OrderStatus, BadgeVariant> = {
  pending:         'gray',
  paid:            'sky',
  dispatched:      'violet',
  sample_received: 'indigo',
  processing:      'amber',
  results_ready:   'teal',
  completed:       'green',
  cancelled:       'red',
  refunded:        'orange',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, currency: string) {
  const sym = currency === 'EUR' ? '€' : 'CHF';
  return `${sym} ${n.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string | null, opts?: { time?: boolean }) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (opts?.time) {
    return d.toLocaleString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function Badge({ variant, children }: { variant: BadgeVariant; children: React.ReactNode }) {
  const cls: Record<BadgeVariant, string> = {
    gray:   'bg-gray-50 text-gray-600 ring-gray-500/20',
    sky:    'bg-sky-50 text-sky-700 ring-sky-600/20',
    violet: 'bg-violet-50 text-violet-700 ring-violet-600/20',
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
    amber:  'bg-amber-50 text-amber-700 ring-amber-600/20',
    teal:   'bg-[#0e393d]/8 text-[#0e393d] ring-[#0e393d]/20',
    green:  'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    red:    'bg-red-50 text-red-700 ring-red-600/20',
    orange: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset whitespace-nowrap ${cls[variant]}`}>
      {children}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2 border-b border-[#0e393d]/6 last:border-0">
      <span className="w-36 shrink-0 text-xs text-[#1c2a2b]/40">{label}</span>
      <span className="text-xs text-[#1c2a2b] font-mono break-all">{value ?? '—'}</span>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ceab84] mb-3">{children}</p>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OrdersManager({ initialOrders }: { initialOrders: Order[] }) {
  const supabase = createClient();

  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  // Inline status update state (tracks which row is saving)
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // ── Refresh ──────────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        profiles ( email, full_name ),
        order_items (
          id, quantity, unit_price, currency,
          products ( name, sku, image_url )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(500);
    if (data) {
      setOrders(data);
      // Keep slide-over in sync
      if (selectedOrder) {
        const updated = data.find((o) => o.id === selectedOrder.id);
        if (updated) setSelectedOrder(updated);
      }
    }
  }, [supabase, selectedOrder]);

  // ── Status update ─────────────────────────────────────────────────────────────

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingId(orderId);
    const now = new Date().toISOString();
    const extra: Record<string, string | null> = {};
    if (newStatus === 'paid')            extra.paid_at = now;
    if (newStatus === 'dispatched')      extra.shipped_at = now;
    if (newStatus === 'sample_received') extra.sample_received_at = now;
    if (newStatus === 'results_ready')   extra.results_ready_at = now;
    if (newStatus === 'completed')       extra.completed_at = now;
    if (newStatus === 'cancelled')       extra.cancelled_at = now;

    await supabase
      .from('orders')
      .update({ status: newStatus, ...extra })
      .eq('id', orderId);

    await refresh();
    setUpdatingId(null);
  };

  // ── Client-side filtering ────────────────────────────────────────────────────

  const filtered = orders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (dateFrom && o.created_at < dateFrom) return false;
    if (dateTo   && o.created_at > dateTo + 'T23:59:59') return false;
    if (search) {
      const q = search.toLowerCase();
      const email = o.profiles?.email?.toLowerCase() ?? '';
      const num   = o.order_number?.toLowerCase() ?? '';
      if (!email.includes(q) && !num.includes(q)) return false;
    }
    return true;
  });

  // ── Stats strip ───────────────────────────────────────────────────────────────

  const stats = ALL_STATUSES.reduce((acc, s) => {
    acc[s] = orders.filter((o) => o.status === s).length;
    return acc;
  }, {} as Record<OrderStatus, number>);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-[#0e393d]">Orders</h1>
          <p className="mt-0.5 text-sm text-[#1c2a2b]/50">
            {orders.length} total · {stats.completed} completed · {stats.pending + stats.paid} open
          </p>
        </div>
      </div>

      {/* Status quick-filter pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => setStatusFilter('all')}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            statusFilter === 'all'
              ? 'bg-[#0e393d] text-white'
              : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30'
          }`}
        >
          All ({orders.length})
        </button>
        {ALL_STATUSES.filter((s) => stats[s] > 0 || statusFilter === s).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              statusFilter === s
                ? 'bg-[#0e393d] text-white'
                : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30'
            }`}
          >
            {STATUS_LABEL[s]} ({stats[s]})
          </button>
        ))}
      </div>

      {/* Search + date filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search order # or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition w-56"
        />
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#1c2a2b]/40">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#1c2a2b]/40">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
          />
        </div>
        {(dateFrom || dateTo || search || statusFilter !== 'all') && (
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); setSearch(''); setStatusFilter('all'); }}
            className="text-xs text-[#1c2a2b]/40 hover:text-[#1c2a2b] transition"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/3">
              {['Order #', 'Customer', 'Status', 'Total', 'Date', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0e393d]/6">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-[#1c2a2b]/40">
                  No orders match the current filters.
                </td>
              </tr>
            )}
            {filtered.map((order) => (
              <tr
                key={order.id}
                className="hover:bg-[#fafaf8] transition-colors cursor-pointer"
                onClick={() => setSelectedOrder(order)}
              >
                {/* Order # */}
                <td className="px-4 py-3">
                  <span className="font-mono text-[#0e393d] font-medium text-xs">
                    {order.order_number}
                  </span>
                </td>

                {/* Customer */}
                <td className="px-4 py-3">
                  <div className="text-[#1c2a2b] text-xs">{order.profiles?.email ?? <span className="text-[#1c2a2b]/30">—</span>}</div>
                  {order.profiles?.full_name && (
                    <div className="text-[10px] text-[#1c2a2b]/40 mt-0.5">{order.profiles.full_name}</div>
                  )}
                </td>

                {/* Status — dropdown stops row-click propagation */}
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_COLOR[order.status]}>{STATUS_LABEL[order.status]}</Badge>
                    <select
                      value={order.status}
                      disabled={updatingId === order.id}
                      onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                      className="text-[11px] rounded border border-[#0e393d]/15 bg-white px-1.5 py-0.5 text-[#1c2a2b]/60 focus:outline-none focus:ring-1 focus:ring-[#0e393d]/20 disabled:opacity-40 cursor-pointer"
                    >
                      {ALL_STATUSES.map((s) => (
                        <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                      ))}
                    </select>
                    {updatingId === order.id && (
                      <div className="h-3 w-3 animate-spin rounded-full border border-[#0e393d]/30 border-t-[#0e393d]" />
                    )}
                  </div>
                </td>

                {/* Total */}
                <td className="px-4 py-3 tabular-nums text-[#1c2a2b]/80 text-xs">
                  {fmt(order.total_amount, order.currency)}
                </td>

                {/* Date */}
                <td className="px-4 py-3 text-[#1c2a2b]/50 text-xs whitespace-nowrap">
                  {fmtDate(order.created_at)}
                </td>

                {/* View */}
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="px-3 py-1 rounded-md text-xs font-medium text-[#0e393d] bg-[#0e393d]/8 hover:bg-[#0e393d]/15 transition"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Results count */}
      {filtered.length !== orders.length && (
        <p className="mt-2 text-xs text-[#1c2a2b]/40">
          Showing {filtered.length} of {orders.length} orders
        </p>
      )}

      {/* ── Order detail slide-over ─────────────────────────────────────────── */}
      {selectedOrder && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]"
            onClick={() => setSelectedOrder(null)}
          />
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl">

            {/* Panel header */}
            <div className="flex items-start justify-between border-b border-[#0e393d]/10 px-6 py-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="font-serif text-lg text-[#0e393d]">{selectedOrder.order_number}</h2>
                  <Badge variant={STATUS_COLOR[selectedOrder.status]}>
                    {STATUS_LABEL[selectedOrder.status]}
                  </Badge>
                </div>
                <p className="text-xs text-[#1c2a2b]/40">
                  Created {fmtDate(selectedOrder.created_at, { time: true })}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-[#1c2a2b]/40 hover:text-[#1c2a2b] transition mt-0.5"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">

              {/* Customer */}
              <div>
                <SectionHeading>Customer</SectionHeading>
                <div className="rounded-lg border border-[#0e393d]/8 bg-[#fafaf8] px-4 py-3 divide-y divide-[#0e393d]/6">
                  <DetailRow label="Email" value={selectedOrder.profiles?.email} />
                  <DetailRow label="Name"  value={selectedOrder.profiles?.full_name} />
                  <DetailRow label="User ID" value={selectedOrder.user_id} />
                </div>
              </div>

              {/* Line items */}
              <div>
                <SectionHeading>Items</SectionHeading>
                <div className="rounded-lg border border-[#0e393d]/8 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[#0e393d]/3 border-b border-[#0e393d]/8">
                        <th className="px-4 py-2 text-left font-medium text-[#0e393d]/60">Product</th>
                        <th className="px-4 py-2 text-center font-medium text-[#0e393d]/60">Qty</th>
                        <th className="px-4 py-2 text-right font-medium text-[#0e393d]/60">Unit</th>
                        <th className="px-4 py-2 text-right font-medium text-[#0e393d]/60">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#0e393d]/6">
                      {(selectedOrder.order_items ?? []).length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-4 text-center text-[#1c2a2b]/30">No items</td>
                        </tr>
                      )}
                      {(selectedOrder.order_items ?? []).map((item) => (
                        <tr key={item.id} className="bg-white">
                          <td className="px-4 py-2.5">
                            <div className="font-medium text-[#1c2a2b]">{item.products?.name ?? 'Unknown product'}</div>
                            {item.products?.sku && (
                              <div className="font-mono text-[#1c2a2b]/40 mt-0.5">{item.products.sku}</div>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center text-[#1c2a2b]/70">{item.quantity}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-[#1c2a2b]/70">
                            {fmt(item.unit_price, item.currency)}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-medium text-[#0e393d]">
                            {fmt(item.unit_price * item.quantity, item.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-[#0e393d]/10 bg-[#0e393d]/3">
                        <td colSpan={3} className="px-4 py-2.5 text-right font-semibold text-[#0e393d]">Total</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-[#0e393d]">
                          {fmt(selectedOrder.total_amount, selectedOrder.currency)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Shipping address */}
              {selectedOrder.shipping_address && (
                <div>
                  <SectionHeading>Shipping address</SectionHeading>
                  <div className="rounded-lg border border-[#0e393d]/8 bg-[#fafaf8] px-4 py-3 text-xs text-[#1c2a2b] leading-relaxed">
                    {selectedOrder.shipping_address.name && (
                      <p className="font-medium">{selectedOrder.shipping_address.name}</p>
                    )}
                    {selectedOrder.shipping_address.line1 && <p>{selectedOrder.shipping_address.line1}</p>}
                    {selectedOrder.shipping_address.line2 && <p>{selectedOrder.shipping_address.line2}</p>}
                    {(selectedOrder.shipping_address.postal_code || selectedOrder.shipping_address.city) && (
                      <p>{[selectedOrder.shipping_address.postal_code, selectedOrder.shipping_address.city].filter(Boolean).join(' ')}</p>
                    )}
                    {selectedOrder.shipping_address.country && (
                      <p>{selectedOrder.shipping_address.country}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Payment / Stripe */}
              <div>
                <SectionHeading>Payment</SectionHeading>
                <div className="rounded-lg border border-[#0e393d]/8 bg-[#fafaf8] px-4 py-1 divide-y divide-[#0e393d]/6">
                  <DetailRow label="Currency"   value={selectedOrder.currency} />
                  <DetailRow label="Amount"     value={fmt(selectedOrder.total_amount, selectedOrder.currency)} />
                  <DetailRow label="Payment Intent" value={selectedOrder.stripe_payment_intent_id} />
                  <DetailRow label="Session ID"     value={selectedOrder.stripe_session_id} />
                </div>
              </div>

              {/* Timestamps */}
              <div>
                <SectionHeading>Timeline</SectionHeading>
                <div className="space-y-0 rounded-lg border border-[#0e393d]/8 bg-[#fafaf8] px-4 py-1 divide-y divide-[#0e393d]/6">
                  {([
                    ['Created',         selectedOrder.created_at],
                    ['Paid',            selectedOrder.paid_at],
                    ['Dispatched',      selectedOrder.shipped_at],
                    ['Sample received', selectedOrder.sample_received_at],
                    ['Results ready',   selectedOrder.results_ready_at],
                    ['Completed',       selectedOrder.completed_at],
                    ['Cancelled',       selectedOrder.cancelled_at],
                  ] as [string, string | null][]).map(([label, ts]) => (
                    <div key={label} className={`flex gap-3 py-2 ${!ts ? 'opacity-35' : ''}`}>
                      <span className="w-36 shrink-0 text-xs text-[#1c2a2b]/50">{label}</span>
                      <span className={`text-xs ${ts ? 'text-[#1c2a2b]' : 'text-[#1c2a2b]/30'}`}>
                        {ts ? fmtDate(ts, { time: true }) : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div>
                  <SectionHeading>Notes</SectionHeading>
                  <p className="rounded-lg border border-[#0e393d]/8 bg-[#fafaf8] px-4 py-3 text-xs text-[#1c2a2b] leading-relaxed">
                    {selectedOrder.notes}
                  </p>
                </div>
              )}

              {/* Internal IDs */}
              <div>
                <SectionHeading>Internal</SectionHeading>
                <div className="rounded-lg border border-[#0e393d]/8 bg-[#fafaf8] px-4 py-1 divide-y divide-[#0e393d]/6">
                  <DetailRow label="Order ID" value={selectedOrder.id} />
                </div>
              </div>

            </div>

            {/* Panel footer — quick status change */}
            <div className="border-t border-[#0e393d]/10 px-6 py-4">
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-[#1c2a2b]/60 shrink-0">Update status</label>
                <select
                  value={selectedOrder.status}
                  disabled={updatingId === selectedOrder.id}
                  onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value as OrderStatus)}
                  className="flex-1 rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm text-[#1c2a2b] focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition disabled:opacity-50 cursor-pointer"
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>
                {updatingId === selectedOrder.id && (
                  <div className="h-4 w-4 animate-spin rounded-full border border-[#0e393d]/30 border-t-[#0e393d]" />
                )}
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  );
}
