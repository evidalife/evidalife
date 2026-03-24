'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus =
  | 'pending' | 'paid' | 'dispatched' | 'sample_received'
  | 'processing' | 'results_ready' | 'completed'
  | 'cancelled' | 'refunded';

type FulfilmentStatus =
  | 'pending' | 'paid' | 'voucher_sent' | 'sample_collected'
  | 'processing' | 'results_ready' | 'completed'
  | 'cancelled' | 'failed';

type ShippingAddress = {
  name?: string;
  line1?: string;
  line2?: string | null;
  city?: string;
  postal_code?: string;
  country?: string;
};

type LocalizedString = string | Record<string, string>;

function locName(field: LocalizedString | null | undefined): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field.de || field.en || '';
}

type OrderItem = {
  id: string;
  quantity: number;
  unit_price: number;
  currency: string;
  products: { name: LocalizedString; sku: string | null; image_url: string | null } | null;
};

type Order = {
  id: string;
  order_number: string;
  user_id: string;
  status: OrderStatus;
  fulfilment_status: FulfilmentStatus | null;
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

type StatusLogEntry = {
  id: string;
  from_status: string | null;
  to_status: string;
  trigger: string;
  notes: string | null;
  created_at: string;
  profiles: { first_name: string | null; last_name: string | null } | null;
};

type Voucher = {
  voucher_code: string;
  status: string;
  expires_at: string;
  lab_partners: { name: string } | null;
};

type TestItem = {
  id: string;
  status: string;
  result_value: number | null;
  result_unit: string | null;
  status_flag: string | null;
  product_item_definitions: { name: LocalizedString; biomarker_key: string } | null;
};

type ValidTransition = {
  to: FulfilmentStatus;
  trigger: string;
  willSendEmail: boolean;
  autoActions: string[];
};

// ─── Status config ────────────────────────────────────────────────────────────

const ALL_STATUSES: OrderStatus[] = [
  'pending', 'paid', 'dispatched', 'sample_received',
  'processing', 'results_ready', 'completed', 'cancelled', 'refunded',
];

const ALL_FULFILMENT_STATUSES: FulfilmentStatus[] = [
  'pending', 'paid', 'voucher_sent', 'sample_collected',
  'processing', 'results_ready', 'completed', 'cancelled', 'failed',
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

const FULFILMENT_LABEL: Record<FulfilmentStatus, string> = {
  pending:          'Pending',
  paid:             'Paid',
  voucher_sent:     'Voucher sent',
  sample_collected: 'Sample collected',
  processing:       'Processing',
  results_ready:    'Results ready',
  completed:        'Completed',
  cancelled:        'Cancelled',
  failed:           'Failed',
};

const TRIGGER_LABEL: Record<string, string> = {
  voucher_generated_and_emailed: 'Mark Voucher Sent',
  lab_confirms_collection:       'Mark Sample Collected',
  lab_starts_analysis:           'Start Analysis',
  lab_results_uploaded:          'Upload Results',
  user_views_results:            'Mark Completed',
  admin_cancels:                 'Cancel Order',
  user_cancels:                  'Cancel Order',
  stripe_payment_failed:         'Mark Failed',
};

const EMAIL_LABEL: Record<string, string> = {
  order_confirmation: 'order confirmation',
  voucher:            'voucher',
  processing:         'sample processing',
  results_ready:      'results ready',
};

type BadgeVariant = 'gray' | 'sky' | 'violet' | 'indigo' | 'amber' | 'teal' | 'green' | 'red' | 'orange' | 'gold';

const FULFILMENT_COLOR: Record<FulfilmentStatus, BadgeVariant> = {
  pending:          'gray',
  paid:             'gold',
  voucher_sent:     'sky',
  sample_collected: 'violet',
  processing:       'amber',
  results_ready:    'teal',
  completed:        'green',
  cancelled:        'red',
  failed:           'red',
};

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

const TEST_ITEM_FLAG_COLOR: Record<string, string> = {
  optimal:      'text-emerald-600 bg-emerald-50',
  normal:       'text-sky-600 bg-sky-50',
  borderline:   'text-amber-600 bg-amber-50',
  out_of_range: 'text-red-600 bg-red-50',
};

const TEST_ITEM_STATUS_COLOR: Record<string, string> = {
  pending:    'text-gray-500 bg-gray-50',
  collected:  'text-sky-600 bg-sky-50',
  processing: 'text-amber-600 bg-amber-50',
  completed:  'text-emerald-600 bg-emerald-50',
  failed:     'text-red-600 bg-red-50',
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
    gold:   'bg-[#CEAB84]/15 text-[#8a6a30] ring-[#CEAB84]/30',
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

function Spinner({ size = 4 }: { size?: number }) {
  return (
    <div className={`h-${size} w-${size} animate-spin rounded-full border border-[#0e393d]/30 border-t-[#0e393d] shrink-0`} />
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

type Toast = { id: number; message: string; type: 'success' | 'error' };

let toastId = 0;

function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg text-sm font-medium transition-all ${
            t.type === 'success' ? 'bg-[#0e393d] text-white' : 'bg-red-600 text-white'
          }`}
        >
          <span>{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="ml-2 opacity-60 hover:opacity-100 text-xs">✕</button>
        </div>
      ))}
    </div>
  );
}

// ─── Fulfilment panel sub-components ─────────────────────────────────────────

function FulfilmentTimeline({ orderId }: { orderId: string }) {
  const supabase = createClient();
  const [log, setLog] = useState<StatusLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('order_status_log')
      .select('id, from_status, to_status, trigger, notes, created_at, profiles(first_name, last_name)')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setLog((data as unknown as StatusLogEntry[]) ?? []);
        setLoading(false);
      });
  }, [orderId]);

  if (loading) return <div className="flex justify-center py-4"><Spinner /></div>;
  if (!log.length) return <p className="text-xs text-[#1c2a2b]/40 italic">No status transitions recorded yet.</p>;

  return (
    <div className="relative pl-4">
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[#0e393d]/10" />
      {log.map((entry) => {
        const color = FULFILMENT_COLOR[(entry.to_status as FulfilmentStatus)] ?? 'gray';
        return (
          <div key={entry.id} className="relative mb-4 last:mb-0">
            <div className="absolute -left-4 top-1 h-3 w-3 rounded-full border-2 border-white bg-[#0e393d]/20" />
            <div className="flex items-start gap-2 flex-wrap">
              <Badge variant={color}>{FULFILMENT_LABEL[entry.to_status as FulfilmentStatus] ?? entry.to_status}</Badge>
              <span className="text-[11px] text-[#1c2a2b]/40 mt-0.5">{fmtDate(entry.created_at, { time: true })}</span>
            </div>
            {entry.from_status && (
              <p className="text-[11px] text-[#1c2a2b]/40 mt-0.5">
                from {FULFILMENT_LABEL[entry.from_status as FulfilmentStatus] ?? entry.from_status}
                {' · '}
                <span className="font-mono">{entry.trigger}</span>
              </p>
            )}
            {entry.profiles && (
              <p className="text-[11px] text-[#1c2a2b]/40">
                by {[entry.profiles.first_name, entry.profiles.last_name].filter(Boolean).join(' ') || 'System'}
              </p>
            )}
            {entry.notes && (
              <p className="text-[11px] text-[#1c2a2b]/60 mt-1 italic">{entry.notes}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FulfilmentActions({
  orderId,
  currentStatus,
  onSuccess,
}: {
  orderId: string;
  currentStatus: FulfilmentStatus;
  onSuccess: (newStatus: FulfilmentStatus) => void;
}) {
  const [transitions, setTransitions] = useState<ValidTransition[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [confirmTrigger, setConfirmTrigger] = useState<ValidTransition | null>(null);

  useEffect(() => {
    fetch(`/api/admin/order-status?orderId=${orderId}`)
      .then((r) => r.json())
      .then((data) => {
        setTransitions(data.validTransitions ?? []);
        setLoading(false);
      });
  }, [orderId, currentStatus]);

  const handleTransition = async (transition: ValidTransition) => {
    setActionLoading(transition.trigger);
    const res = await fetch('/api/admin/order-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, trigger: transition.trigger, notes: notes || undefined }),
    });
    const data = await res.json();
    setActionLoading(null);
    setConfirmTrigger(null);
    setNotes('');
    if (data.success) {
      onSuccess(data.newStatus as FulfilmentStatus);
    }
  };

  if (loading) return <div className="flex justify-center py-3"><Spinner /></div>;
  if (!transitions.length) return <p className="text-xs text-[#1c2a2b]/40 italic">No actions available for current status.</p>;

  return (
    <div className="space-y-3">
      {confirmTrigger ? (
        <div className="rounded-lg border border-[#0e393d]/15 bg-[#fafaf8] p-4 space-y-3">
          <p className="text-xs font-medium text-[#0e393d]">
            Confirm: {TRIGGER_LABEL[confirmTrigger.trigger] ?? confirmTrigger.trigger}
            {' → '}
            <Badge variant={FULFILMENT_COLOR[confirmTrigger.to]}>{FULFILMENT_LABEL[confirmTrigger.to]}</Badge>
          </p>
          {confirmTrigger.willSendEmail && (
            <p className="text-[11px] text-[#0C9C6C] flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Will send <strong>{EMAIL_LABEL[confirmTrigger.willSendEmail ? 'yes' : ''] || 'an'} email</strong> to the customer
            </p>
          )}
          {confirmTrigger.autoActions?.length > 0 && (
            <p className="text-[11px] text-[#1c2a2b]/50">
              Auto-actions: {confirmTrigger.autoActions.join(', ')}
            </p>
          )}
          <textarea
            placeholder="Optional notes…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-xs text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 resize-none"
          />
          <div className="flex gap-2">
            <button
              disabled={!!actionLoading}
              onClick={() => handleTransition(confirmTrigger)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-[#0e393d] text-white hover:bg-[#0e393d]/85 transition disabled:opacity-50"
            >
              {actionLoading ? <Spinner size={3} /> : null}
              Confirm
            </button>
            <button
              onClick={() => { setConfirmTrigger(null); setNotes(''); }}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-[#1c2a2b]/60 bg-white ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {transitions.map((t) => (
            <button
              key={t.trigger}
              disabled={!!actionLoading}
              onClick={() => setConfirmTrigger(t)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-[#0e393d] bg-[#0e393d]/8 hover:bg-[#0e393d]/15 transition disabled:opacity-40 flex items-center gap-1.5"
            >
              {TRIGGER_LABEL[t.trigger] ?? t.trigger}
              {t.willSendEmail && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#0C9C6C]">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function VoucherCard({ orderId }: { orderId: string }) {
  const supabase = createClient();
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase
      .from('order_vouchers')
      .select('voucher_code, status, expires_at, lab_partners(name)')
      .eq('order_id', orderId)
      .maybeSingle()
      .then(({ data }) => {
        setVoucher(data as Voucher | null);
        setLoading(false);
      });
  }, [orderId]);

  if (loading) return <div className="flex justify-center py-3"><Spinner /></div>;
  if (!voucher) return <p className="text-xs text-[#1c2a2b]/40 italic">No voucher generated yet.</p>;

  const voucherBadge: BadgeVariant =
    voucher.status === 'active' ? 'green' :
    voucher.status === 'redeemed' ? 'teal' :
    voucher.status === 'expired' ? 'orange' : 'red';

  return (
    <div className="rounded-lg border border-[#0e393d]/10 bg-[#fafaf8] p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-[#0e393d] text-sm tracking-wider">{voucher.voucher_code}</span>
          <Badge variant={voucherBadge}>{voucher.status}</Badge>
        </div>
        <button
          onClick={() => { navigator.clipboard.writeText(voucher.voucher_code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="text-[11px] px-2 py-1 rounded bg-[#0e393d]/8 text-[#0e393d] hover:bg-[#0e393d]/15 transition"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="space-y-1">
        {voucher.lab_partners?.name && (
          <div className="flex gap-2 text-xs">
            <span className="w-24 text-[#1c2a2b]/40">Lab</span>
            <span className="text-[#1c2a2b]">{voucher.lab_partners.name}</span>
          </div>
        )}
        <div className="flex gap-2 text-xs">
          <span className="w-24 text-[#1c2a2b]/40">Expires</span>
          <span className="text-[#1c2a2b]">{fmtDate(voucher.expires_at)}</span>
        </div>
      </div>
    </div>
  );
}

function TestItemsChecklist({ orderId }: { orderId: string }) {
  const supabase = createClient();
  const [items, setItems] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('order_test_items')
      .select('id, status, result_value, result_unit, status_flag, product_item_definitions(name, biomarker_key)')
      .eq('order_id', orderId)
      .then(({ data }) => {
        setItems((data as unknown as TestItem[]) ?? []);
        setLoading(false);
      });
  }, [orderId]);

  if (loading) return <div className="flex justify-center py-3"><Spinner /></div>;
  if (!items.length) return <p className="text-xs text-[#1c2a2b]/40 italic">No test items yet — created after sample collection.</p>;

  const completed = items.filter((i) => i.status === 'completed').length;
  const pct = Math.round((completed / items.length) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#1c2a2b]/60">{completed} of {items.length} biomarkers completed</span>
        <span className="font-medium text-[#0e393d]">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-[#0e393d]/8 overflow-hidden">
        <div className="h-full rounded-full bg-[#0C9C6C] transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="rounded-lg border border-[#0e393d]/8 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#0e393d]/3 border-b border-[#0e393d]/8">
              <th className="px-3 py-2 text-left font-medium text-[#0e393d]/60">Biomarker</th>
              <th className="px-3 py-2 text-center font-medium text-[#0e393d]/60">Status</th>
              <th className="px-3 py-2 text-right font-medium text-[#0e393d]/60">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0e393d]/6">
            {items.map((item) => (
              <tr key={item.id} className="bg-white">
                <td className="px-3 py-2 text-[#1c2a2b]">
                  {locName(item.product_item_definitions?.name) || item.product_item_definitions?.biomarker_key || '—'}
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${TEST_ITEM_STATUS_COLOR[item.status] ?? 'text-gray-500 bg-gray-50'}`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  {item.result_value != null ? (
                    <span className="flex items-center justify-end gap-1.5">
                      <span className="tabular-nums font-medium text-[#1c2a2b]">
                        {item.result_value} {item.result_unit}
                      </span>
                      {item.status_flag && (
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${TEST_ITEM_FLAG_COLOR[item.status_flag] ?? ''}`}>
                          {item.status_flag.replace('_', ' ')}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-[#1c2a2b]/30">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OrdersManager({ initialOrders }: { initialOrders: Order[] }) {
  const supabase = createClient();

  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [fulfilmentFilter, setFulfilmentFilter] = useState<FulfilmentStatus | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  // Inline status update state (tracks which row is saving)
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Slide-over tab
  const [detailTab, setDetailTab] = useState<'details' | 'fulfilment'>('fulfilment');

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

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
    if (fulfilmentFilter !== 'all' && (o.fulfilment_status || 'pending') !== fulfilmentFilter) return false;
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

  const fulfilmentStats = ALL_FULFILMENT_STATUSES.reduce((acc, s) => {
    acc[s] = orders.filter((o) => (o.fulfilment_status || 'pending') === s).length;
    return acc;
  }, {} as Record<FulfilmentStatus, number>);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">
      <ToastContainer toasts={toasts} dismiss={dismissToast} />

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-[#0e393d]">Orders</h1>
          <p className="mt-0.5 text-sm text-[#1c2a2b]/50">
            {orders.length} total · {stats.completed} completed · {stats.pending + stats.paid} open
          </p>
        </div>
      </div>

      {/* Payment status filter pills */}
      <div className="flex flex-wrap gap-2 mb-3">
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

      {/* Fulfilment status filter pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84]/80 self-center mr-1">Fulfilment</span>
        <button
          onClick={() => setFulfilmentFilter('all')}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            fulfilmentFilter === 'all'
              ? 'bg-[#CEAB84] text-white'
              : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#CEAB84]/30 hover:ring-[#CEAB84]/50'
          }`}
        >
          All
        </button>
        {ALL_FULFILMENT_STATUSES.filter((s) => fulfilmentStats[s] > 0 || fulfilmentFilter === s).map((s) => (
          <button
            key={s}
            onClick={() => setFulfilmentFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              fulfilmentFilter === s
                ? 'bg-[#CEAB84] text-white'
                : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#CEAB84]/30 hover:ring-[#CEAB84]/50'
            }`}
          >
            {FULFILMENT_LABEL[s]} ({fulfilmentStats[s]})
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
        {(dateFrom || dateTo || search || statusFilter !== 'all' || fulfilmentFilter !== 'all') && (
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); setSearch(''); setStatusFilter('all'); setFulfilmentFilter('all'); }}
            className="text-xs text-[#1c2a2b]/40 hover:text-[#1c2a2b] transition"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[860px]">
          <thead>
            <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/3">
              {['Order #', 'Customer', 'Status', 'Fulfilment', 'Total', 'Date', 'Actions'].map((h) => (
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
                  No orders match the current filters.
                </td>
              </tr>
            )}
            {filtered.map((order) => {
              const fs = (order.fulfilment_status || 'pending') as FulfilmentStatus;
              return (
                <tr
                  key={order.id}
                  className="hover:bg-[#fafaf8] transition-colors cursor-pointer"
                  onClick={() => { setSelectedOrder(order); setDetailTab('fulfilment'); }}
                >
                  {/* Order # */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-[#0e393d] font-medium text-xs">{order.order_number}</span>
                  </td>

                  {/* Customer */}
                  <td className="px-4 py-3">
                    <div className="text-[#1c2a2b] text-xs">{order.profiles?.email ?? <span className="text-[#1c2a2b]/30">—</span>}</div>
                    {order.profiles?.full_name && (
                      <div className="text-[10px] text-[#1c2a2b]/40 mt-0.5">{order.profiles.full_name}</div>
                    )}
                  </td>

                  {/* Payment status dropdown */}
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
                      {updatingId === order.id && <Spinner size={3} />}
                    </div>
                  </td>

                  {/* Fulfilment status */}
                  <td className="px-4 py-3">
                    <Badge variant={FULFILMENT_COLOR[fs]}>{FULFILMENT_LABEL[fs]}</Badge>
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
                      onClick={() => { setSelectedOrder(order); setDetailTab('fulfilment'); }}
                      className="px-3 py-1 rounded-md text-xs font-medium text-[#0e393d] bg-[#0e393d]/8 hover:bg-[#0e393d]/15 transition"
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
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
                  {selectedOrder.fulfilment_status && (
                    <Badge variant={FULFILMENT_COLOR[selectedOrder.fulfilment_status]}>
                      {FULFILMENT_LABEL[selectedOrder.fulfilment_status]}
                    </Badge>
                  )}
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

            {/* Tabs */}
            <div className="flex border-b border-[#0e393d]/10 px-6">
              {(['fulfilment', 'details'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDetailTab(tab)}
                  className={`px-1 py-3 mr-6 text-xs font-medium border-b-2 transition capitalize ${
                    detailTab === tab
                      ? 'border-[#0e393d] text-[#0e393d]'
                      : 'border-transparent text-[#1c2a2b]/40 hover:text-[#1c2a2b]'
                  }`}
                >
                  {tab === 'fulfilment' ? 'Fulfilment' : 'Order Details'}
                </button>
              ))}
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">

              {/* ── FULFILMENT TAB ── */}
              {detailTab === 'fulfilment' && (
                <div className="space-y-7">

                  {/* Actions */}
                  <div>
                    <SectionHeading>Actions</SectionHeading>
                    <FulfilmentActions
                      orderId={selectedOrder.id}
                      currentStatus={(selectedOrder.fulfilment_status || 'pending') as FulfilmentStatus}
                      onSuccess={(newStatus) => {
                        setSelectedOrder((prev) => prev ? { ...prev, fulfilment_status: newStatus } : prev);
                        addToast(`Status updated to ${FULFILMENT_LABEL[newStatus]}`, 'success');
                        refresh();
                      }}
                    />
                  </div>

                  {/* Voucher */}
                  <div>
                    <SectionHeading>Voucher</SectionHeading>
                    <VoucherCard orderId={selectedOrder.id} />
                  </div>

                  {/* Test items */}
                  <div>
                    <SectionHeading>Test Items</SectionHeading>
                    <TestItemsChecklist orderId={selectedOrder.id} />
                  </div>

                  {/* Status timeline */}
                  <div>
                    <SectionHeading>Status History</SectionHeading>
                    <FulfilmentTimeline orderId={selectedOrder.id} />
                  </div>

                </div>
              )}

              {/* ── DETAILS TAB ── */}
              {detailTab === 'details' && (
                <div className="space-y-7">

                  {/* Customer */}
                  <div>
                    <SectionHeading>Customer</SectionHeading>
                    <div className="rounded-lg border border-[#0e393d]/8 bg-[#fafaf8] px-4 py-3 divide-y divide-[#0e393d]/6">
                      <DetailRow label="Email"   value={selectedOrder.profiles?.email} />
                      <DetailRow label="Name"    value={selectedOrder.profiles?.full_name} />
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
                                <div className="font-medium text-[#1c2a2b]">{locName(item.products?.name) || 'Unknown product'}</div>
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
                        {selectedOrder.shipping_address.country && <p>{selectedOrder.shipping_address.country}</p>}
                      </div>
                    </div>
                  )}

                  {/* Payment */}
                  <div>
                    <SectionHeading>Payment</SectionHeading>
                    <div className="rounded-lg border border-[#0e393d]/8 bg-[#fafaf8] px-4 py-1 divide-y divide-[#0e393d]/6">
                      <DetailRow label="Currency"       value={selectedOrder.currency} />
                      <DetailRow label="Amount"         value={fmt(selectedOrder.total_amount, selectedOrder.currency)} />
                      <DetailRow label="Payment Intent" value={selectedOrder.stripe_payment_intent_id} />
                      <DetailRow label="Session ID"     value={selectedOrder.stripe_session_id} />
                    </div>
                  </div>

                  {/* Timestamps */}
                  <div>
                    <SectionHeading>Timeline</SectionHeading>
                    <div className="rounded-lg border border-[#0e393d]/8 bg-[#fafaf8] px-4 py-1 divide-y divide-[#0e393d]/6">
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

                  {/* Internal */}
                  <div>
                    <SectionHeading>Internal</SectionHeading>
                    <div className="rounded-lg border border-[#0e393d]/8 bg-[#fafaf8] px-4 py-1 divide-y divide-[#0e393d]/6">
                      <DetailRow label="Order ID" value={selectedOrder.id} />
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Panel footer — quick status change */}
            {detailTab === 'details' && (
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
                  {updatingId === selectedOrder.id && <Spinner size={4} />}
                </div>
              </div>
            )}

          </div>
        </>
      )}

    </div>
  );
}
