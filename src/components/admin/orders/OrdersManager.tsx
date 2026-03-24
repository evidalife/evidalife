'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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

type LocalizedString = string | Record<string, string>;

function locName(field: LocalizedString | null | undefined): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field.de || field.en || '';
}

type ShippingAddress = {
  name?: string; line1?: string; line2?: string | null;
  city?: string; postal_code?: string; country?: string;
};

type OrderItem = {
  id: string; quantity: number; unit_price: number; currency: string;
  products: { name: LocalizedString; sku: string | null; image_url: string | null } | null;
};

type Order = {
  id: string; order_number: string; user_id: string;
  status: OrderStatus; fulfilment_status: FulfilmentStatus | null;
  currency: string; total_amount: number;
  stripe_payment_intent_id: string | null; stripe_session_id: string | null;
  shipping_address: ShippingAddress | null;
  notes: string | null; internal_notes: string | null; customer_notes: string | null;
  tags: string[] | null; source: string | null;
  paid_at: string | null; shipped_at: string | null; sample_received_at: string | null;
  results_ready_at: string | null; completed_at: string | null; cancelled_at: string | null;
  created_at: string; updated_at: string;
  profiles: { email: string; first_name: string | null; last_name: string | null } | null;
  order_items: OrderItem[];
};

type StatusLogEntry = {
  id: string; from_status: string | null; to_status: string; trigger: string;
  notes: string | null; created_at: string;
  profiles: { first_name: string | null; last_name: string | null } | null;
};

type Voucher = {
  voucher_code: string; status: string; expires_at: string;
  lab_partners: { name: string } | null;
};

type TestItem = {
  id: string; status: string; result_value: number | null; result_unit: string | null;
  status_flag: string | null;
  product_item_definitions: { name: LocalizedString; biomarker_key: string } | null;
};

type ValidTransition = { to: FulfilmentStatus; trigger: string; willSendEmail: boolean; autoActions: string[] };

type OrderNote = {
  id: string; note_type: string; body: string; created_at: string;
  profiles: { first_name: string | null; last_name: string | null } | null;
};

type Refund = {
  id: string; amount: number; currency: string; reason: string | null;
  stripe_refund_id: string | null; status: string; created_at: string;
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
  pending: 'Pending', paid: 'Paid', dispatched: 'Dispatched',
  sample_received: 'Sample received', processing: 'Processing',
  results_ready: 'Results ready', completed: 'Completed',
  cancelled: 'Cancelled', refunded: 'Refunded',
};

const FULFILMENT_LABEL: Record<FulfilmentStatus, string> = {
  pending: 'Pending', paid: 'Paid', voucher_sent: 'Voucher sent',
  sample_collected: 'Sample collected', processing: 'Processing',
  results_ready: 'Results ready', completed: 'Completed',
  cancelled: 'Cancelled', failed: 'Failed',
};

const TRIGGER_LABEL: Record<string, string> = {
  voucher_generated_and_emailed: 'Mark Voucher Sent',
  lab_confirms_collection: 'Mark Sample Collected',
  lab_starts_analysis: 'Start Analysis',
  lab_results_uploaded: 'Upload Results',
  user_views_results: 'Mark Completed',
  admin_cancels: 'Cancel Order',
  user_cancels: 'Cancel Order',
  stripe_payment_failed: 'Mark Failed',
};

const EMAIL_LABEL: Record<string, string> = {
  order_confirmation: 'order confirmation',
  voucher: 'voucher',
  processing: 'sample processing',
  results_ready: 'results ready',
};

const RESEND_EMAIL_OPTIONS = [
  { value: 'order_confirmation', label: 'Order Confirmation' },
  { value: 'voucher', label: 'Voucher' },
  { value: 'processing', label: 'Processing Started' },
  { value: 'results_ready', label: 'Results Ready' },
];

type BadgeVariant = 'gray' | 'sky' | 'violet' | 'indigo' | 'amber' | 'teal' | 'green' | 'red' | 'orange' | 'gold';

const FULFILMENT_COLOR: Record<FulfilmentStatus, BadgeVariant> = {
  pending: 'gray', paid: 'gold', voucher_sent: 'sky', sample_collected: 'violet',
  processing: 'amber', results_ready: 'teal', completed: 'green',
  cancelled: 'red', failed: 'red',
};

const STATUS_COLOR: Record<OrderStatus, BadgeVariant> = {
  pending: 'gray', paid: 'sky', dispatched: 'violet', sample_received: 'indigo',
  processing: 'amber', results_ready: 'teal', completed: 'green',
  cancelled: 'red', refunded: 'orange',
};

const TEST_ITEM_FLAG_COLOR: Record<string, string> = {
  optimal: 'text-emerald-600 bg-emerald-50',
  normal: 'text-sky-600 bg-sky-50',
  borderline: 'text-amber-600 bg-amber-50',
  out_of_range: 'text-red-600 bg-red-50',
};

const TEST_ITEM_STATUS_COLOR: Record<string, string> = {
  pending: 'text-gray-500 bg-gray-50', collected: 'text-sky-600 bg-sky-50',
  processing: 'text-amber-600 bg-amber-50', completed: 'text-emerald-600 bg-emerald-50',
  failed: 'text-red-600 bg-red-50',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, currency: string) {
  const sym = currency === 'EUR' ? '€' : 'CHF';
  return `${sym} ${n.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string | null, opts?: { time?: boolean }) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (opts?.time) return d.toLocaleString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function Badge({ variant, children }: { variant: BadgeVariant; children: React.ReactNode }) {
  const cls: Record<BadgeVariant, string> = {
    gray: 'bg-gray-50 text-gray-600 ring-gray-500/20',
    sky: 'bg-sky-50 text-sky-700 ring-sky-600/20',
    violet: 'bg-violet-50 text-violet-700 ring-violet-600/20',
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
    amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    teal: 'bg-[#0e393d]/8 text-[#0e393d] ring-[#0e393d]/20',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    red: 'bg-red-50 text-red-700 ring-red-600/20',
    orange: 'bg-orange-50 text-orange-700 ring-orange-600/20',
    gold: 'bg-[#CEAB84]/15 text-[#8a6a30] ring-[#CEAB84]/30',
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
  return <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ceab84] mb-3">{children}</p>;
}

function Spinner({ size = 4 }: { size?: number }) {
  return <div className={`h-${size} w-${size} animate-spin rounded-full border border-[#0e393d]/30 border-t-[#0e393d] shrink-0`} />;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

type Toast = { id: number; message: string; type: 'success' | 'error' };
let toastId = 0;

function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className={`pointer-events-auto flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg text-sm font-medium ${t.type === 'success' ? 'bg-[#0e393d] text-white' : 'bg-red-600 text-white'}`}>
          <span>{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="ml-2 opacity-60 hover:opacity-100 text-xs">✕</button>
        </div>
      ))}
    </div>
  );
}

// ─── Fulfilment sub-components ────────────────────────────────────────────────

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
      .then(({ data }) => { setLog((data as unknown as StatusLogEntry[]) ?? []); setLoading(false); });
  }, [orderId]);

  if (loading) return <div className="flex justify-center py-4"><Spinner /></div>;
  if (!log.length) return <p className="text-xs text-[#1c2a2b]/40 italic">No status transitions recorded yet.</p>;

  return (
    <div className="relative pl-4">
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[#0e393d]/10" />
      {log.map((entry) => {
        const color = FULFILMENT_COLOR[entry.to_status as FulfilmentStatus] ?? 'gray';
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
                {' · '}<span className="font-mono">{entry.trigger}</span>
              </p>
            )}
            {entry.profiles && (
              <p className="text-[11px] text-[#1c2a2b]/40">
                by {[entry.profiles.first_name, entry.profiles.last_name].filter(Boolean).join(' ') || 'System'}
              </p>
            )}
            {entry.notes && <p className="text-[11px] text-[#1c2a2b]/60 mt-1 italic">{entry.notes}</p>}
          </div>
        );
      })}
    </div>
  );
}

function FulfilmentActions({ orderId, currentStatus, onSuccess }: {
  orderId: string; currentStatus: FulfilmentStatus;
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
      .then((data) => { setTransitions(data.validTransitions ?? []); setLoading(false); });
  }, [orderId, currentStatus]);

  const handleTransition = async (transition: ValidTransition) => {
    setActionLoading(transition.trigger);
    const res = await fetch('/api/admin/order-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, trigger: transition.trigger, notes: notes || undefined }),
    });
    const data = await res.json();
    setActionLoading(null); setConfirmTrigger(null); setNotes('');
    if (data.success) onSuccess(data.newStatus as FulfilmentStatus);
  };

  if (loading) return <div className="flex justify-center py-3"><Spinner /></div>;
  if (!transitions.length) return <p className="text-xs text-[#1c2a2b]/40 italic">No actions available for current status.</p>;

  return (
    <div className="space-y-3">
      {confirmTrigger ? (
        <div className="rounded-lg border border-[#0e393d]/15 bg-[#fafaf8] p-4 space-y-3">
          <p className="text-xs font-medium text-[#0e393d]">
            Confirm: {TRIGGER_LABEL[confirmTrigger.trigger] ?? confirmTrigger.trigger}
            {' → '}<Badge variant={FULFILMENT_COLOR[confirmTrigger.to]}>{FULFILMENT_LABEL[confirmTrigger.to]}</Badge>
          </p>
          {confirmTrigger.willSendEmail && (
            <p className="text-[11px] text-[#0C9C6C] flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Will send an email to the customer
            </p>
          )}
          {confirmTrigger.autoActions?.length > 0 && (
            <p className="text-[11px] text-[#1c2a2b]/50">Auto-actions: {confirmTrigger.autoActions.join(', ')}</p>
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
              {actionLoading ? <Spinner size={3} /> : null}Confirm
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
      .then(({ data }) => { setVoucher(data as Voucher | null); setLoading(false); });
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
          <div className="flex gap-2 text-xs"><span className="w-24 text-[#1c2a2b]/40">Lab</span><span>{voucher.lab_partners.name}</span></div>
        )}
        <div className="flex gap-2 text-xs"><span className="w-24 text-[#1c2a2b]/40">Expires</span><span>{fmtDate(voucher.expires_at)}</span></div>
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
      .then(({ data }) => { setItems((data as unknown as TestItem[]) ?? []); setLoading(false); });
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
                      <span className="tabular-nums font-medium text-[#1c2a2b]">{item.result_value} {item.result_unit}</span>
                      {item.status_flag && (
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${TEST_ITEM_FLAG_COLOR[item.status_flag] ?? ''}`}>
                          {item.status_flag.replace('_', ' ')}
                        </span>
                      )}
                    </span>
                  ) : <span className="text-[#1c2a2b]/30">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Notes panel ──────────────────────────────────────────────────────────────

function NotesPanel({ orderId, addToast }: { orderId: string; addToast: (msg: string, type: Toast['type']) => void }) {
  const [notes, setNotes] = useState<OrderNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/admin/order-notes?orderId=${orderId}`)
      .then((r) => r.json())
      .then((d) => { setNotes(d.notes ?? []); setLoading(false); });
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!body.trim()) return;
    setSaving(true);
    const res = await fetch('/api/admin/order-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, noteType: 'internal', body }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.note) {
      setBody('');
      setNotes((prev) => [data.note, ...prev]);
      addToast('Note added', 'success');
    } else {
      addToast(data.error ?? 'Failed to add note', 'error');
    }
  };

  const handleDelete = async (noteId: string) => {
    setDeletingId(noteId);
    await fetch(`/api/admin/order-notes?noteId=${noteId}`, { method: 'DELETE' });
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    setDeletingId(null);
  };

  return (
    <div className="space-y-4">
      {/* Add note */}
      <div className="space-y-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add an internal note…"
          rows={3}
          className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-xs text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 resize-none"
        />
        <button
          disabled={saving || !body.trim()}
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#0e393d] text-white hover:bg-[#0e393d]/85 transition disabled:opacity-50"
        >
          {saving ? <Spinner size={3} /> : null}Add Note
        </button>
      </div>

      {/* Notes list */}
      {loading ? (
        <div className="flex justify-center py-4"><Spinner /></div>
      ) : notes.length === 0 ? (
        <p className="text-xs text-[#1c2a2b]/40 italic">No notes yet.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="rounded-lg border border-[#0e393d]/8 bg-[#fafaf8] px-4 py-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-[11px] text-[#1c2a2b]/40">
                  {[note.profiles?.first_name, note.profiles?.last_name].filter(Boolean).join(' ') || 'Admin'}
                  {' · '}{fmtDate(note.created_at, { time: true })}
                </span>
                <button
                  onClick={() => handleDelete(note.id)}
                  disabled={deletingId === note.id}
                  className="text-[11px] text-red-400 hover:text-red-600 transition disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
              <p className="text-xs text-[#1c2a2b] leading-relaxed whitespace-pre-wrap">{note.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Refund modal ─────────────────────────────────────────────────────────────

function RefundModal({ order, onClose, addToast, onRefunded }: {
  order: Order; onClose: () => void;
  addToast: (msg: string, type: Toast['type']) => void;
  onRefunded: () => void;
}) {
  const [amount, setAmount] = useState(String(order.total_amount));
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loadingRefunds, setLoadingRefunds] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/refund-order?orderId=${order.id}`)
      .then((r) => r.json())
      .then((d) => { setRefunds(d.refunds ?? []); setLoadingRefunds(false); });
  }, [order.id]);

  const totalRefunded = refunds.reduce((sum, r) => sum + r.amount, 0);

  const handleRefund = async () => {
    const amtNum = parseFloat(amount);
    if (!amtNum || amtNum <= 0) { addToast('Invalid amount', 'error'); return; }
    setSaving(true);
    const res = await fetch('/api/admin/refund-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.id, amount: amtNum, reason }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.refund) {
      addToast(`Refund of ${fmt(amtNum, order.currency)} processed`, 'success');
      onRefunded();
      onClose();
    } else {
      addToast(data.error ?? 'Refund failed', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg text-[#0e393d]">Issue Refund</h3>
          <button onClick={onClose} className="text-[#1c2a2b]/40 hover:text-[#1c2a2b] transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="rounded-lg border border-[#0e393d]/8 bg-[#fafaf8] px-4 py-3 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-[#1c2a2b]/50">Order</span>
            <span className="font-mono text-[#0e393d]">{order.order_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#1c2a2b]/50">Order total</span>
            <span className="font-medium">{fmt(order.total_amount, order.currency)}</span>
          </div>
          {totalRefunded > 0 && (
            <div className="flex justify-between text-amber-600">
              <span>Already refunded</span>
              <span className="font-medium">{fmt(totalRefunded, order.currency)}</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[#1c2a2b]/60 mb-1">Amount ({order.currency})</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={order.total_amount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#1c2a2b]/60 mb-1">Reason (optional)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Duplicate order, customer request…"
              className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10"
            />
          </div>
        </div>

        {/* Past refunds */}
        {!loadingRefunds && refunds.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ceab84] mb-2">Past Refunds</p>
            <div className="space-y-1.5">
              {refunds.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-xs">
                  <span className="text-[#1c2a2b]/50">{fmtDate(r.created_at, { time: true })}</span>
                  <span className="font-medium text-[#1c2a2b]">{fmt(r.amount, r.currency)}</span>
                  <Badge variant={r.status === 'completed' ? 'green' : 'amber'}>{r.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            disabled={saving}
            onClick={handleRefund}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-50"
          >
            {saving ? <Spinner size={3} /> : null}Issue Refund
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-[#1c2a2b]/60 bg-white ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30 transition">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Customer context ─────────────────────────────────────────────────────────

function CustomerContext({ order }: { order: Order }) {
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('*').eq('id', order.user_id).single(),
      supabase.from('orders')
        .select('id, order_number, status, total_amount, currency, created_at')
        .eq('user_id', order.user_id)
        .order('created_at', { ascending: false })
        .limit(10),
    ]).then(([profileRes, ordersRes]) => {
      setProfile(profileRes.data);
      setOrderHistory(ordersRes.data ?? []);
      setLoading(false);
    });
  }, [order.user_id]);

  if (loading) return <div className="flex justify-center py-8"><Spinner /></div>;

  const totalSpend = orderHistory
    .filter((o) => o.status === 'paid' || o.status === 'completed' || o.status === 'results_ready')
    .reduce((sum, o) => sum + o.total_amount, 0);

  return (
    <div className="space-y-6">
      {/* Profile */}
      <div>
        <SectionHeading>Profile</SectionHeading>
        <div className="rounded-lg border border-[#0e393d]/8 bg-[#fafaf8] px-4 py-1 divide-y divide-[#0e393d]/6">
          <DetailRow label="Email" value={order.profiles?.email} />
          <DetailRow label="Name" value={[order.profiles?.first_name, order.profiles?.last_name].filter(Boolean).join(' ') || null} />
          <DetailRow label="User ID" value={order.user_id} />
          {profile?.created_at && <DetailRow label="Member since" value={fmtDate(profile.created_at)} />}
          {profile?.deleted_at && <DetailRow label="Deactivated" value={fmtDate(profile.deleted_at)} />}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Total orders', value: orderHistory.length },
          { label: 'Total spend', value: totalSpend > 0 ? fmt(totalSpend, order.currency) : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-[#0e393d]/8 bg-[#fafaf8] px-4 py-3 text-center">
            <div className="text-lg font-semibold text-[#0e393d]">{value}</div>
            <div className="text-[11px] text-[#1c2a2b]/40 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Order history */}
      <div>
        <SectionHeading>Order History</SectionHeading>
        {orderHistory.length === 0 ? (
          <p className="text-xs text-[#1c2a2b]/40 italic">No orders found.</p>
        ) : (
          <div className="rounded-lg border border-[#0e393d]/8 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#0e393d]/3 border-b border-[#0e393d]/8">
                  <th className="px-3 py-2 text-left font-medium text-[#0e393d]/60">Order #</th>
                  <th className="px-3 py-2 text-left font-medium text-[#0e393d]/60">Status</th>
                  <th className="px-3 py-2 text-right font-medium text-[#0e393d]/60">Total</th>
                  <th className="px-3 py-2 text-right font-medium text-[#0e393d]/60">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0e393d]/6">
                {orderHistory.map((o) => (
                  <tr key={o.id} className={`bg-white ${o.id === order.id ? 'ring-1 ring-inset ring-[#CEAB84]/40 bg-[#CEAB84]/5' : ''}`}>
                    <td className="px-3 py-2 font-mono text-[#0e393d]">{o.order_number}</td>
                    <td className="px-3 py-2"><Badge variant={STATUS_COLOR[o.status as OrderStatus]}>{STATUS_LABEL[o.status as OrderStatus]}</Badge></td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(o.total_amount, o.currency)}</td>
                    <td className="px-3 py-2 text-right text-[#1c2a2b]/50 whitespace-nowrap">{fmtDate(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── New Order panel ──────────────────────────────────────────────────────────

type ProductOption = { id: string; name: LocalizedString; price: number; currency: string; sku: string | null };
type LineItem = { productId: string; productName: string; quantity: number; price: number };

function NewOrderPanel({ onClose, onCreated, addToast }: {
  onClose: () => void;
  onCreated: () => void;
  addToast: (msg: string, type: Toast['type']) => void;
}) {
  const supabase = createClient();
  const [userSearch, setUserSearch] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    supabase
      .from('products')
      .select('id, name, price, currency, sku')
      .eq('is_active', true)
      .then(({ data }) => setProducts(data ?? []));
  }, []);

  const searchUsers = (q: string) => {
    setUserSearch(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setUsers([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearchingUsers(true);
      const { data } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .or(`email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
        .limit(8);
      setUsers(data ?? []);
      setSearchingUsers(false);
    }, 300);
  };

  const addProduct = (product: ProductOption) => {
    setLineItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) return prev.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { productId: product.id, productName: locName(product.name), quantity: 1, price: product.price }];
    });
  };

  const removeItem = (productId: string) => setLineItems((prev) => prev.filter((i) => i.productId !== productId));
  const updateQty = (productId: string, qty: number) => {
    if (qty < 1) { removeItem(productId); return; }
    setLineItems((prev) => prev.map((i) => i.productId === productId ? { ...i, quantity: qty } : i));
  };

  const total = lineItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const currency = products[0]?.currency ?? 'CHF';

  const handleCreate = async () => {
    if (!selectedUser || !lineItems.length) return;
    setSaving(true);
    const res = await fetch('/api/admin/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: selectedUser.id,
        items: lineItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        notes: notes || undefined,
        source: 'manual',
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.orderId) {
      addToast(`Order ${data.orderNumber} created`, 'success');
      onCreated();
      onClose();
    } else {
      addToast(data.error ?? 'Failed to create order', 'error');
    }
  };

  return (
    <>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#0e393d]/10 px-6 py-4">
          <h2 className="font-serif text-lg text-[#0e393d]">New Order</h2>
          <button onClick={onClose} className="text-[#1c2a2b]/40 hover:text-[#1c2a2b] transition">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Customer search */}
          <div>
            <SectionHeading>Customer</SectionHeading>
            {selectedUser ? (
              <div className="flex items-center justify-between rounded-lg border border-[#0C9C6C]/30 bg-[#0C9C6C]/5 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-[#1c2a2b]">
                    {[selectedUser.first_name, selectedUser.last_name].filter(Boolean).join(' ') || selectedUser.email}
                  </p>
                  <p className="text-xs text-[#1c2a2b]/50">{selectedUser.email}</p>
                </div>
                <button onClick={() => setSelectedUser(null)} className="text-xs text-[#1c2a2b]/40 hover:text-[#1c2a2b]">Change</button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by email or name…"
                  value={userSearch}
                  onChange={(e) => searchUsers(e.target.value)}
                  className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10"
                />
                {searchingUsers && <div className="absolute right-3 top-2.5"><Spinner size={4} /></div>}
                {users.length > 0 && (
                  <div className="absolute top-full mt-1 w-full rounded-lg border border-[#0e393d]/15 bg-white shadow-lg z-10 overflow-hidden">
                    {users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => { setSelectedUser(u); setUsers([]); setUserSearch(''); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#0e393d]/5 transition"
                      >
                        <div>
                          <p className="text-sm text-[#1c2a2b]">{u.email}</p>
                          {(u.first_name || u.last_name) && (
                            <p className="text-xs text-[#1c2a2b]/40">{[u.first_name, u.last_name].filter(Boolean).join(' ')}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Products */}
          <div>
            <SectionHeading>Products</SectionHeading>
            <div className="grid gap-2">
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addProduct(p)}
                  className="flex items-center justify-between rounded-lg border border-[#0e393d]/10 bg-[#fafaf8] px-4 py-2.5 text-left hover:bg-[#0e393d]/5 hover:border-[#0e393d]/20 transition"
                >
                  <div>
                    <p className="text-sm text-[#1c2a2b]">{locName(p.name)}</p>
                    {p.sku && <p className="text-[11px] font-mono text-[#1c2a2b]/40">{p.sku}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-[#0e393d]">{fmt(p.price, p.currency)}</p>
                    <p className="text-[11px] text-[#1c2a2b]/40">+ Add</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Line items */}
          {lineItems.length > 0 && (
            <div>
              <SectionHeading>Order Items</SectionHeading>
              <div className="rounded-lg border border-[#0e393d]/8 overflow-hidden">
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-[#0e393d]/6">
                    {lineItems.map((item) => (
                      <tr key={item.productId} className="bg-white">
                        <td className="px-3 py-2.5 text-[#1c2a2b]">{item.productName}</td>
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => updateQty(item.productId, item.quantity - 1)} className="w-5 h-5 rounded bg-[#0e393d]/8 text-[#0e393d] hover:bg-[#0e393d]/15 flex items-center justify-center text-xs leading-none">−</button>
                            <span className="tabular-nums w-5 text-center">{item.quantity}</span>
                            <button onClick={() => updateQty(item.productId, item.quantity + 1)} className="w-5 h-5 rounded bg-[#0e393d]/8 text-[#0e393d] hover:bg-[#0e393d]/15 flex items-center justify-center text-xs leading-none">+</button>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-medium text-[#0e393d]">
                          {fmt(item.price * item.quantity, currency)}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button onClick={() => removeItem(item.productId)} className="text-[11px] text-red-400 hover:text-red-600">Remove</button>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-[#0e393d]/3 border-t border-[#0e393d]/10">
                      <td colSpan={2} className="px-3 py-2.5 text-right font-semibold text-[#0e393d]">Total</td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-[#0e393d]">{fmt(total, currency)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <SectionHeading>Notes (optional)</SectionHeading>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes for this order…"
              rows={2}
              className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-xs text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#0e393d]/10 px-6 py-4 flex gap-3">
          <button
            disabled={saving || !selectedUser || lineItems.length === 0}
            onClick={handleCreate}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium bg-[#0e393d] text-white hover:bg-[#0e393d]/85 transition disabled:opacity-40"
          >
            {saving ? <Spinner size={3} /> : null}Create Order
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm font-medium text-[#1c2a2b]/60 bg-white ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30 transition">
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

export default function OrdersManager({ initialOrders }: { initialOrders: Order[] }) {
  const supabase = createClient();

  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailTab, setDetailTab] = useState<'fulfilment' | 'details' | 'notes' | 'customer'>('fulfilment');

  // Filters
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [fulfilmentFilter, setFulfilmentFilter] = useState<FulfilmentStatus | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Inline status update state
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Modals
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [showResendEmail, setShowResendEmail] = useState(false);
  const [resendTemplate, setResendTemplate] = useState('');
  const [resendingSending, setResendingSending] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  // ── Refresh ───────────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        profiles(email, first_name, last_name),
        order_items(id, quantity, unit_price, currency, products(name, sku, image_url))
      `)
      .order('created_at', { ascending: false })
      .limit(500);
    if (data) {
      setOrders(data as unknown as Order[]);
      if (selectedOrder) {
        const updated = (data as unknown as Order[]).find((o) => o.id === selectedOrder.id);
        if (updated) setSelectedOrder(updated);
      }
    }
  }, [supabase, selectedOrder]);

  // ── Status update ──────────────────────────────────────────────────────────────

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

    await supabase.from('orders').update({ status: newStatus, ...extra }).eq('id', orderId);
    await refresh();
    setUpdatingId(null);
  };

  // ── Filtering & pagination ────────────────────────────────────────────────────

  const filtered = orders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (fulfilmentFilter !== 'all' && (o.fulfilment_status || 'pending') !== fulfilmentFilter) return false;
    if (dateFrom && o.created_at < dateFrom) return false;
    if (dateTo   && o.created_at > dateTo + 'T23:59:59') return false;
    if (search) {
      const q = search.toLowerCase();
      const email = o.profiles?.email?.toLowerCase() ?? '';
      const num   = o.order_number?.toLowerCase() ?? '';
      const name  = [o.profiles?.first_name, o.profiles?.last_name].filter(Boolean).join(' ').toLowerCase();
      if (!email.includes(q) && !num.includes(q) && !name.includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => setPage(0), [statusFilter, fulfilmentFilter, dateFrom, dateTo, search]);

  // ── KPI stats ─────────────────────────────────────────────────────────────────

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const totalRevenue = orders.filter((o) => o.status !== 'cancelled' && o.status !== 'refunded').reduce((s, o) => s + o.total_amount, 0);
  const thisMonthRevenue = orders.filter((o) => o.created_at >= monthStart && o.status !== 'cancelled' && o.status !== 'refunded').reduce((s, o) => s + o.total_amount, 0);
  const paidOrders = orders.filter((o) => o.status !== 'pending' && o.status !== 'cancelled' && o.status !== 'refunded');
  const avgOrderValue = paidOrders.length ? totalRevenue / paidOrders.length : 0;
  const pendingFulfilment = orders.filter((o) => {
    const fs = o.fulfilment_status || 'pending';
    return fs !== 'completed' && fs !== 'cancelled' && fs !== 'failed' && o.status !== 'cancelled' && o.status !== 'refunded';
  }).length;
  const currency = orders[0]?.currency ?? 'CHF';

  // ── Stats strip ──────────────────────────────────────────────────────────────

  const stats = ALL_STATUSES.reduce((acc, s) => { acc[s] = orders.filter((o) => o.status === s).length; return acc; }, {} as Record<OrderStatus, number>);
  const fulfilmentStats = ALL_FULFILMENT_STATUSES.reduce((acc, s) => { acc[s] = orders.filter((o) => (o.fulfilment_status || 'pending') === s).length; return acc; }, {} as Record<FulfilmentStatus, number>);

  // ── Bulk actions ──────────────────────────────────────────────────────────────

  const toggleSelect = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleSelectAll = () => {
    if (selected.size === pageItems.length) setSelected(new Set());
    else setSelected(new Set(pageItems.map((o) => o.id)));
  };
  const clearSelection = () => setSelected(new Set());

  const bulkUpdateStatus = async (newStatus: OrderStatus) => {
    for (const id of Array.from(selected)) await handleStatusChange(id, newStatus);
    clearSelection();
    addToast(`Updated ${selected.size} order(s) to ${STATUS_LABEL[newStatus]}`, 'success');
  };

  // ── Resend email ──────────────────────────────────────────────────────────────

  const handleResendEmail = async () => {
    if (!selectedOrder || !resendTemplate) return;
    setResendingSending(true);
    const res = await fetch('/api/admin/resend-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: selectedOrder.id, template: resendTemplate }),
    });
    const data = await res.json();
    setResendingSending(false);
    setShowResendEmail(false);
    setResendTemplate('');
    if (data.success) addToast('Email sent', 'success');
    else addToast(data.error ?? 'Failed to send email', 'error');
  };

  // ── Export ────────────────────────────────────────────────────────────────────

  const exportUrl = () => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (fulfilmentFilter !== 'all') params.set('fulfilment_status', fulfilmentFilter);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    return `/api/admin/orders/export?${params.toString()}`;
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">
      <ToastContainer toasts={toasts} dismiss={dismissToast} />

      {/* ── KPI Dashboard ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Revenue', value: fmt(totalRevenue, currency), sub: `${orders.length} orders` },
          { label: 'This Month', value: fmt(thisMonthRevenue, currency), sub: `${orders.filter((o) => o.created_at >= monthStart).length} orders` },
          { label: 'Avg. Order Value', value: fmt(avgOrderValue, currency), sub: `${paidOrders.length} paid orders` },
          { label: 'Pending Fulfilment', value: String(pendingFulfilment), sub: 'active orders' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="rounded-xl border border-[#0e393d]/10 bg-white px-5 py-4">
            <p className="text-[11px] text-[#1c2a2b]/40 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-xl font-semibold text-[#0e393d] tabular-nums">{value}</p>
            <p className="text-[11px] text-[#1c2a2b]/40 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-serif text-2xl text-[#0e393d]">Orders</h1>
          <p className="mt-0.5 text-sm text-[#1c2a2b]/50">
            {orders.length} total · {stats.completed} completed · {stats.pending + stats.paid} open
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={exportUrl()}
            download
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#1c2a2b]/60 bg-white ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30 transition"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export CSV
          </a>
          <button
            onClick={() => setShowNewOrder(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#0e393d] text-white hover:bg-[#0e393d]/85 transition"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Order
          </button>
        </div>
      </div>

      {/* ── Payment status pills ─────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={() => setStatusFilter('all')}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${statusFilter === 'all' ? 'bg-[#0e393d] text-white' : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30'}`}
        >
          All ({orders.length})
        </button>
        {ALL_STATUSES.filter((s) => stats[s] > 0 || statusFilter === s).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${statusFilter === s ? 'bg-[#0e393d] text-white' : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30'}`}
          >
            {STATUS_LABEL[s]} ({stats[s]})
          </button>
        ))}
      </div>

      {/* ── Fulfilment pills ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-5">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84]/80 self-center mr-1">Fulfilment</span>
        <button
          onClick={() => setFulfilmentFilter('all')}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${fulfilmentFilter === 'all' ? 'bg-[#CEAB84] text-white' : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#CEAB84]/30 hover:ring-[#CEAB84]/50'}`}
        >
          All
        </button>
        {ALL_FULFILMENT_STATUSES.filter((s) => fulfilmentStats[s] > 0 || fulfilmentFilter === s).map((s) => (
          <button
            key={s}
            onClick={() => setFulfilmentFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${fulfilmentFilter === s ? 'bg-[#CEAB84] text-white' : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#CEAB84]/30 hover:ring-[#CEAB84]/50'}`}
          >
            {FULFILMENT_LABEL[s]} ({fulfilmentStats[s]})
          </button>
        ))}
      </div>

      {/* ── Search + date + bulk bar ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search order #, email, or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition w-60"
        />
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#1c2a2b]/40">From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#1c2a2b]/40">To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition" />
        </div>
        {(dateFrom || dateTo || search || statusFilter !== 'all' || fulfilmentFilter !== 'all') && (
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); setSearch(''); setStatusFilter('all'); setFulfilmentFilter('all'); }}
            className="text-xs text-[#1c2a2b]/40 hover:text-[#1c2a2b] transition"
          >
            Clear filters
          </button>
        )}

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="ml-auto flex items-center gap-2 rounded-lg border border-[#0e393d]/15 bg-white px-3 py-1.5">
            <span className="text-xs text-[#1c2a2b]/60">{selected.size} selected</span>
            <select
              onChange={(e) => { if (e.target.value) bulkUpdateStatus(e.target.value as OrderStatus); e.target.value = ''; }}
              defaultValue=""
              className="text-xs rounded border border-[#0e393d]/15 bg-white px-2 py-1 focus:outline-none"
            >
              <option value="" disabled>Set status…</option>
              {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
            <button onClick={clearSelection} className="text-xs text-[#1c2a2b]/40 hover:text-[#1c2a2b]">✕</button>
          </div>
        )}
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[920px]">
          <thead>
            <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/3">
              <th className="px-4 py-3 w-8">
                <input
                  type="checkbox"
                  checked={selected.size === pageItems.length && pageItems.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-[#0e393d]/20 text-[#0e393d] focus:ring-[#0e393d]/20"
                />
              </th>
              {['Order #', 'Customer', 'Status', 'Fulfilment', 'Products', 'Total', 'Date', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0e393d]/6">
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-[#1c2a2b]/40">
                  No orders match the current filters.
                </td>
              </tr>
            )}
            {pageItems.map((order) => {
              const fs = (order.fulfilment_status || 'pending') as FulfilmentStatus;
              const isSelected = selected.has(order.id);
              const products = (order.order_items ?? []).map((i) => locName(i.products?.name)).filter(Boolean).join(', ');
              const hasNotes = !!(order.internal_notes || order.notes);
              return (
                <tr
                  key={order.id}
                  className={`hover:bg-[#fafaf8] transition-colors cursor-pointer ${isSelected ? 'bg-[#0e393d]/3' : ''}`}
                  onClick={() => { setSelectedOrder(order); setDetailTab('fulfilment'); }}
                >
                  {/* Checkbox */}
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(order.id)}
                      className="rounded border-[#0e393d]/20 text-[#0e393d] focus:ring-[#0e393d]/20"
                    />
                  </td>

                  {/* Order # */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[#0e393d] font-medium text-xs">{order.order_number}</span>
                      {hasNotes && (
                        <span title="Has notes" className="text-[#CEAB84]">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                        </span>
                      )}
                      {order.source === 'manual' && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-[#CEAB84]/20 text-[#8a6a30] font-medium">Manual</span>
                      )}
                    </div>
                    {order.tags && order.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {order.tags.map((tag) => (
                          <span key={tag} className="text-[9px] px-1 py-0.5 rounded bg-[#0e393d]/8 text-[#0e393d]">{tag}</span>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* Customer */}
                  <td className="px-4 py-3">
                    <div className="text-[#1c2a2b] text-xs">{order.profiles?.email ?? <span className="text-[#1c2a2b]/30">—</span>}</div>
                    {(order.profiles?.first_name || order.profiles?.last_name) && (
                      <div className="text-[10px] text-[#1c2a2b]/40 mt-0.5">
                        {[order.profiles.first_name, order.profiles.last_name].filter(Boolean).join(' ')}
                      </div>
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
                        {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                      </select>
                      {updatingId === order.id && <Spinner size={3} />}
                    </div>
                  </td>

                  {/* Fulfilment status */}
                  <td className="px-4 py-3">
                    <Badge variant={FULFILMENT_COLOR[fs]}>{FULFILMENT_LABEL[fs]}</Badge>
                  </td>

                  {/* Products */}
                  <td className="px-4 py-3">
                    <span className="text-xs text-[#1c2a2b]/60 line-clamp-1 max-w-[140px]">{products || '—'}</span>
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

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 text-xs text-[#1c2a2b]/50">
          <span>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-md bg-white ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30 transition disabled:opacity-40"
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`w-7 h-7 rounded-md text-xs font-medium transition ${i === page ? 'bg-[#0e393d] text-white' : 'bg-white ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30'}`}
              >
                {i + 1}
              </button>
            ))}
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-md bg-white ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30 transition disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {filtered.length !== orders.length && totalPages <= 1 && (
        <p className="mt-2 text-xs text-[#1c2a2b]/40">Showing {filtered.length} of {orders.length} orders</p>
      )}

      {/* ── New Order panel ───────────────────────────────────────────────── */}
      {showNewOrder && (
        <div className="fixed inset-0 z-50">
          <NewOrderPanel
            onClose={() => setShowNewOrder(false)}
            onCreated={refresh}
            addToast={addToast}
          />
        </div>
      )}

      {/* ── Refund modal ──────────────────────────────────────────────────── */}
      {showRefund && selectedOrder && (
        <RefundModal
          order={selectedOrder}
          onClose={() => setShowRefund(false)}
          addToast={addToast}
          onRefunded={refresh}
        />
      )}

      {/* ── Resend email modal ────────────────────────────────────────────── */}
      {showResendEmail && selectedOrder && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={() => setShowResendEmail(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-serif text-lg text-[#0e393d]">Resend Email</h3>
            <div>
              <label className="block text-xs font-medium text-[#1c2a2b]/60 mb-2">Template</label>
              <div className="space-y-2">
                {RESEND_EMAIL_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="radio"
                      name="template"
                      value={opt.value}
                      checked={resendTemplate === opt.value}
                      onChange={(e) => setResendTemplate(e.target.value)}
                      className="text-[#0e393d] focus:ring-[#0e393d]/20"
                    />
                    <span className="text-sm text-[#1c2a2b] group-hover:text-[#0e393d]">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                disabled={resendingSending || !resendTemplate}
                onClick={handleResendEmail}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium bg-[#0e393d] text-white hover:bg-[#0e393d]/85 transition disabled:opacity-50"
              >
                {resendingSending ? <Spinner size={3} /> : null}Send Email
              </button>
              <button onClick={() => setShowResendEmail(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-[#1c2a2b]/60 bg-white ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Order detail slide-over ───────────────────────────────────────── */}
      {selectedOrder && !showNewOrder && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]" onClick={() => setSelectedOrder(null)} />
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl">

            {/* Panel header */}
            <div className="flex items-start justify-between border-b border-[#0e393d]/10 px-6 py-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="font-serif text-lg text-[#0e393d]">{selectedOrder.order_number}</h2>
                  <Badge variant={STATUS_COLOR[selectedOrder.status]}>{STATUS_LABEL[selectedOrder.status]}</Badge>
                  {selectedOrder.fulfilment_status && (
                    <Badge variant={FULFILMENT_COLOR[selectedOrder.fulfilment_status]}>{FULFILMENT_LABEL[selectedOrder.fulfilment_status]}</Badge>
                  )}
                </div>
                <p className="text-xs text-[#1c2a2b]/40">Created {fmtDate(selectedOrder.created_at, { time: true })}</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Quick actions */}
                <button
                  onClick={() => setShowRefund(true)}
                  title="Issue refund"
                  className="p-1.5 rounded-md text-[#1c2a2b]/40 hover:text-[#1c2a2b] hover:bg-[#0e393d]/5 transition"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path d="M3 9h18M3 9a9 9 0 1 0 18 0M3 9a9 9 0 0 1 18 0" />
                    <path d="M9 13l-2-2 2-2M15 13l2-2-2-2" />
                  </svg>
                </button>
                <button
                  onClick={() => setShowResendEmail(true)}
                  title="Resend email"
                  className="p-1.5 rounded-md text-[#1c2a2b]/40 hover:text-[#1c2a2b] hover:bg-[#0e393d]/5 transition"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(selectedOrder.order_number); addToast('Copied order #', 'success'); }}
                  title="Copy order number"
                  className="p-1.5 rounded-md text-[#1c2a2b]/40 hover:text-[#1c2a2b] hover:bg-[#0e393d]/5 transition"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
                <button onClick={() => setSelectedOrder(null)} className="p-1.5 text-[#1c2a2b]/40 hover:text-[#1c2a2b] transition">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#0e393d]/10 px-6 overflow-x-auto">
              {(['fulfilment', 'details', 'notes', 'customer'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDetailTab(tab)}
                  className={`px-1 py-3 mr-6 text-xs font-medium border-b-2 transition whitespace-nowrap capitalize ${
                    detailTab === tab ? 'border-[#0e393d] text-[#0e393d]' : 'border-transparent text-[#1c2a2b]/40 hover:text-[#1c2a2b]'
                  }`}
                >
                  {tab === 'fulfilment' ? 'Fulfilment' : tab === 'details' ? 'Order Details' : tab === 'notes' ? 'Notes' : 'Customer'}
                </button>
              ))}
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">

              {/* ── FULFILMENT TAB ── */}
              {detailTab === 'fulfilment' && (
                <div className="space-y-7">
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
                  <div>
                    <SectionHeading>Voucher</SectionHeading>
                    <VoucherCard orderId={selectedOrder.id} />
                  </div>
                  <div>
                    <SectionHeading>Test Items</SectionHeading>
                    <TestItemsChecklist orderId={selectedOrder.id} />
                  </div>
                  <div>
                    <SectionHeading>Status History</SectionHeading>
                    <FulfilmentTimeline orderId={selectedOrder.id} />
                  </div>
                </div>
              )}

              {/* ── DETAILS TAB ── */}
              {detailTab === 'details' && (
                <div className="space-y-7">
                  <div>
                    <SectionHeading>Customer</SectionHeading>
                    <div className="rounded-lg border border-[#0e393d]/8 bg-[#fafaf8] px-4 py-3 divide-y divide-[#0e393d]/6">
                      <DetailRow label="Email" value={selectedOrder.profiles?.email} />
                      <DetailRow label="Name" value={[selectedOrder.profiles?.first_name, selectedOrder.profiles?.last_name].filter(Boolean).join(' ') || null} />
                      <DetailRow label="User ID" value={selectedOrder.user_id} />
                    </div>
                  </div>

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
                            <tr><td colSpan={4} className="px-4 py-4 text-center text-[#1c2a2b]/30">No items</td></tr>
                          )}
                          {(selectedOrder.order_items ?? []).map((item) => (
                            <tr key={item.id} className="bg-white">
                              <td className="px-4 py-2.5">
                                <div className="font-medium text-[#1c2a2b]">{locName(item.products?.name) || 'Unknown product'}</div>
                                {item.products?.sku && <div className="font-mono text-[#1c2a2b]/40 mt-0.5">{item.products.sku}</div>}
                              </td>
                              <td className="px-4 py-2.5 text-center text-[#1c2a2b]/70">{item.quantity}</td>
                              <td className="px-4 py-2.5 text-right tabular-nums text-[#1c2a2b]/70">{fmt(item.unit_price, item.currency)}</td>
                              <td className="px-4 py-2.5 text-right tabular-nums font-medium text-[#0e393d]">{fmt(item.unit_price * item.quantity, item.currency)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-[#0e393d]/10 bg-[#0e393d]/3">
                            <td colSpan={3} className="px-4 py-2.5 text-right font-semibold text-[#0e393d]">Total</td>
                            <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-[#0e393d]">{fmt(selectedOrder.total_amount, selectedOrder.currency)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {selectedOrder.shipping_address && (
                    <div>
                      <SectionHeading>Shipping address</SectionHeading>
                      <div className="rounded-lg border border-[#0e393d]/8 bg-[#fafaf8] px-4 py-3 text-xs text-[#1c2a2b] leading-relaxed">
                        {selectedOrder.shipping_address.name && <p className="font-medium">{selectedOrder.shipping_address.name}</p>}
                        {selectedOrder.shipping_address.line1 && <p>{selectedOrder.shipping_address.line1}</p>}
                        {selectedOrder.shipping_address.line2 && <p>{selectedOrder.shipping_address.line2}</p>}
                        {(selectedOrder.shipping_address.postal_code || selectedOrder.shipping_address.city) && (
                          <p>{[selectedOrder.shipping_address.postal_code, selectedOrder.shipping_address.city].filter(Boolean).join(' ')}</p>
                        )}
                        {selectedOrder.shipping_address.country && <p>{selectedOrder.shipping_address.country}</p>}
                      </div>
                    </div>
                  )}

                  <div>
                    <SectionHeading>Payment</SectionHeading>
                    <div className="rounded-lg border border-[#0e393d]/8 bg-[#fafaf8] px-4 py-1 divide-y divide-[#0e393d]/6">
                      <DetailRow label="Currency"       value={selectedOrder.currency} />
                      <DetailRow label="Amount"         value={fmt(selectedOrder.total_amount, selectedOrder.currency)} />
                      <DetailRow label="Payment Intent" value={selectedOrder.stripe_payment_intent_id} />
                      <DetailRow label="Session ID"     value={selectedOrder.stripe_session_id} />
                      {selectedOrder.source && <DetailRow label="Source" value={selectedOrder.source} />}
                    </div>
                  </div>

                  <div>
                    <SectionHeading>Timeline</SectionHeading>
                    <div className="rounded-lg border border-[#0e393d]/8 bg-[#fafaf8] px-4 py-1 divide-y divide-[#0e393d]/6">
                      {([
                        ['Created', selectedOrder.created_at],
                        ['Paid', selectedOrder.paid_at],
                        ['Dispatched', selectedOrder.shipped_at],
                        ['Sample received', selectedOrder.sample_received_at],
                        ['Results ready', selectedOrder.results_ready_at],
                        ['Completed', selectedOrder.completed_at],
                        ['Cancelled', selectedOrder.cancelled_at],
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

                  <div>
                    <SectionHeading>Internal</SectionHeading>
                    <div className="rounded-lg border border-[#0e393d]/8 bg-[#fafaf8] px-4 py-1 divide-y divide-[#0e393d]/6">
                      <DetailRow label="Order ID" value={selectedOrder.id} />
                      {selectedOrder.internal_notes && <DetailRow label="Internal notes" value={selectedOrder.internal_notes} />}
                    </div>
                  </div>
                </div>
              )}

              {/* ── NOTES TAB ── */}
              {detailTab === 'notes' && (
                <NotesPanel orderId={selectedOrder.id} addToast={addToast} />
              )}

              {/* ── CUSTOMER TAB ── */}
              {detailTab === 'customer' && (
                <CustomerContext order={selectedOrder} />
              )}

            </div>

            {/* Panel footer — quick status change (details tab only) */}
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
                    {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
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
