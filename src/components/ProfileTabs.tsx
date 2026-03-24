'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import ProfileEditor, { type ProfileData } from './ProfileEditor';

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'de' | 'en' | 'fr' | 'es' | 'it';
type Tab = 'profile' | 'orders' | 'results' | 'invoices';

type LocalizedString = string | Record<string, string>;

function locName(f: LocalizedString | null | undefined, lang: Lang = 'en'): string {
  if (!f) return '';
  if (typeof f === 'string') return f;
  return f[lang] || f.en || f.de || '';
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtCurrency(n: number, currency: string): string {
  const sym = currency === 'EUR' ? '€' : 'CHF';
  return `${sym} ${n.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Translations ─────────────────────────────────────────────────────────────

const T = {
  de: {
    tabs: { profile: 'Profil', orders: 'Bestellungen', results: 'Laborwerte', invoices: 'Rechnungen' },
    orders: {
      empty: 'Noch keine Bestellungen.',
      emptySub: 'Testen Sie sich — Ihre Bestellhistorie erscheint hier.',
      shop: 'Zum Shop',
      invoice: 'Rechnung (PDF)',
      dashboard: 'Gesundheits-Dashboard',
      voucher: 'Gutschein-Code',
    },
    results: {
      empty: 'Noch keine Laborwerte vorhanden.',
      emptySub: 'Lassen Sie sich testen, um Ihre Biomarker-Daten hier zu sehen.',
      shop: 'Jetzt testen lassen',
      resultsFrom: 'Ergebnisse vom',
      ref: 'Ref',
      opt: 'Opt',
    },
    invoices: {
      empty: 'Noch keine Rechnungen vorhanden.',
      download: 'PDF herunterladen',
      number: 'Rechnungsnr.',
      date: 'Datum',
      amount: 'Betrag',
      status: 'Status',
    },
    loading: 'Wird geladen…',
  },
  en: {
    tabs: { profile: 'Profile', orders: 'My Orders', results: 'My Results', invoices: 'My Invoices' },
    orders: {
      empty: 'No orders yet.',
      emptySub: 'Get tested — your order history will appear here.',
      shop: 'Go to Shop',
      invoice: 'Invoice (PDF)',
      dashboard: 'Health Dashboard',
      voucher: 'Voucher Code',
    },
    results: {
      empty: 'No lab results yet.',
      emptySub: 'Get tested to see your biomarker data here.',
      shop: 'Get Tested',
      resultsFrom: 'Results from',
      ref: 'Ref',
      opt: 'Opt',
    },
    invoices: {
      empty: 'No invoices yet.',
      download: 'Download PDF',
      number: 'Invoice #',
      date: 'Date',
      amount: 'Amount',
      status: 'Status',
    },
    loading: 'Loading…',
  },
  fr: {
    tabs: { profile: 'Profil', orders: 'Commandes', results: 'Résultats', invoices: 'Factures' },
    orders: { empty: 'Aucune commande.', emptySub: '', shop: 'Boutique', invoice: 'Facture (PDF)', dashboard: 'Tableau de santé', voucher: 'Code bon' },
    results: { empty: 'Aucun résultat.', emptySub: '', shop: 'Se faire tester', resultsFrom: 'Résultats du', ref: 'Réf', opt: 'Opt' },
    invoices: { empty: 'Aucune facture.', download: 'Télécharger PDF', number: 'N° facture', date: 'Date', amount: 'Montant', status: 'Statut' },
    loading: 'Chargement…',
  },
  es: {
    tabs: { profile: 'Perfil', orders: 'Pedidos', results: 'Resultados', invoices: 'Facturas' },
    orders: { empty: 'Sin pedidos.', emptySub: '', shop: 'Tienda', invoice: 'Factura (PDF)', dashboard: 'Panel de salud', voucher: 'Código bono' },
    results: { empty: 'Sin resultados.', emptySub: '', shop: 'Hacerse el test', resultsFrom: 'Resultados del', ref: 'Ref', opt: 'Opt' },
    invoices: { empty: 'Sin facturas.', download: 'Descargar PDF', number: 'N.º factura', date: 'Fecha', amount: 'Importe', status: 'Estado' },
    loading: 'Cargando…',
  },
  it: {
    tabs: { profile: 'Profilo', orders: 'Ordini', results: 'Risultati', invoices: 'Fatture' },
    orders: { empty: 'Nessun ordine.', emptySub: '', shop: 'Negozio', invoice: 'Fattura (PDF)', dashboard: 'Dashboard salute', voucher: 'Codice voucher' },
    results: { empty: 'Nessun risultato.', emptySub: '', shop: 'Effettua il test', resultsFrom: 'Risultati del', ref: 'Rif', opt: 'Opt' },
    invoices: { empty: 'Nessuna fattura.', download: 'Scarica PDF', number: 'N. fattura', date: 'Data', amount: 'Importo', status: 'Stato' },
    loading: 'Caricamento…',
  },
};

// ─── Status badge ─────────────────────────────────────────────────────────────

const FULFILMENT_LABEL: Record<string, string> = {
  pending: 'Pending', paid: 'Paid', voucher_sent: 'Voucher sent',
  sample_collected: 'Sample collected', processing: 'Processing',
  results_ready: 'Results ready', completed: 'Completed',
  cancelled: 'Cancelled', failed: 'Failed',
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: 'Pending', paid: 'Paid', dispatched: 'Dispatched',
  sample_received: 'Sample received', processing: 'Processing',
  results_ready: 'Results ready', completed: 'Completed',
  cancelled: 'Cancelled', refunded: 'Refunded',
};

function StatusBadge({ status, type }: { status: string; type: 'order' | 'fulfilment' | 'invoice' }) {
  const greenStatuses = ['paid', 'completed', 'results_ready'];
  const redStatuses = ['cancelled', 'failed', 'refunded', 'overdue'];
  const amberStatuses = ['processing', 'sample_collected', 'sample_received', 'voucher_sent', 'dispatched'];

  const cls = redStatuses.includes(status)
    ? 'bg-red-50 text-red-700 ring-red-600/20'
    : greenStatuses.includes(status)
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
      : amberStatuses.includes(status)
        ? 'bg-amber-50 text-amber-700 ring-amber-600/20'
        : 'bg-gray-50 text-gray-600 ring-gray-500/20';

  const label = type === 'fulfilment'
    ? FULFILMENT_LABEL[status] ?? status
    : type === 'order'
      ? ORDER_STATUS_LABEL[status] ?? status
      : status;

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

const FLAG_STYLE: Record<string, string> = {
  optimal:      'bg-[#0C9C6C]/12 text-[#0C9C6C]',
  good:         'bg-[#C4A96A]/15 text-[#7a5e20]',
  moderate:     'bg-[#ef9f27]/15 text-[#a05e00]',
  risk:         'bg-[#E24B4A]/12 text-[#E24B4A]',
};

const FLAG_LABEL: Record<string, string> = {
  optimal: 'Optimal', good: 'Good', moderate: 'Borderline', risk: 'Risk',
};

function FlagBadge({ flag }: { flag: string | null }) {
  if (!flag) return null;
  const cls = FLAG_STYLE[flag] ?? 'bg-gray-50 text-gray-600';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${cls}`}>
      {FLAG_LABEL[flag] ?? flag}
    </span>
  );
}

function Spinner() {
  return <div className="h-5 w-5 animate-spin rounded-full border border-[#0e393d]/20 border-t-[#0e393d]" />;
}

// ─── HE domain labels ─────────────────────────────────────────────────────────

const HE_DOMAIN_LABEL: Record<string, string> = {
  heart_vessels: 'Heart & Vessels', metabolism: 'Metabolism',
  hormones: 'Hormones', inflammation: 'Inflammation',
  nutrients: 'Nutrients', organ_function: 'Organ Function',
  longevity: 'Longevity', fitness: 'Fitness',
};

const HE_DOMAIN_ORDER = ['heart_vessels', 'metabolism', 'hormones', 'inflammation', 'nutrients', 'organ_function', 'longevity', 'fitness'];

// ─── My Orders tab ────────────────────────────────────────────────────────────

type OrderItem = { id: string; quantity: number; unit_price: number; currency: string; products: { name: LocalizedString } | null };
type Voucher = { voucher_code: string; status: string } | null;
type UserOrder = {
  id: string; order_number: string; status: string; fulfilment_status: string | null;
  total_amount: number; currency: string; created_at: string;
  order_items: OrderItem[];
};

function MyOrdersTab({ t, lang }: { t: typeof T['en']; lang: Lang }) {
  const supabase = createClient();
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [vouchers, setVouchers] = useState<Record<string, Voucher>>({});

  useEffect(() => {
    supabase
      .from('orders')
      .select('id, order_number, status, fulfilment_status, total_amount, currency, created_at, order_items(id, quantity, unit_price, currency, products(name))')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOrders((data as unknown as UserOrder[]) ?? []);
        setLoading(false);
      });
  }, []);

  const toggleExpand = async (orderId: string) => {
    const next = expandedId === orderId ? null : orderId;
    setExpandedId(next);
    if (next && !(orderId in vouchers)) {
      const { data } = await supabase.from('order_vouchers')
        .select('voucher_code, status')
        .eq('order_id', orderId)
        .maybeSingle();
      setVouchers((v) => ({ ...v, [orderId]: data as Voucher }));
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  if (!orders.length) return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">📦</div>
      <p className="font-medium text-[#0e393d] mb-2">{t.orders.empty}</p>
      <p className="text-sm text-[#1c2a2b]/50 mb-6">{t.orders.emptySub}</p>
      <a href="/shop" className="inline-block rounded-full bg-[#0e393d] text-white px-6 py-2.5 text-sm font-medium hover:bg-[#0e393d]/85 transition">
        {t.orders.shop}
      </a>
    </div>
  );

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const isExpanded = expandedId === order.id;
        const fs = order.fulfilment_status as string | null;
        const showDashboard = fs === 'results_ready' || fs === 'completed';
        const productNames = order.order_items.map((i) => locName(i.products?.name, lang)).filter(Boolean).join(', ');

        return (
          <div key={order.id} className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden">
            <button
              onClick={() => toggleExpand(order.id)}
              className="w-full text-left px-5 py-4 hover:bg-[#fafaf8] transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap mb-1">
                    <span className="font-mono font-semibold text-[#0e393d] text-sm">{order.order_number}</span>
                    <StatusBadge status={order.status} type="order" />
                    {fs && <StatusBadge status={fs} type="fulfilment" />}
                  </div>
                  {productNames && <p className="text-xs text-[#1c2a2b]/50 truncate">{productNames}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-[#0e393d] text-sm tabular-nums">{fmtCurrency(order.total_amount, order.currency)}</p>
                  <p className="text-xs text-[#1c2a2b]/40 mt-0.5">{fmtDate(order.created_at)}</p>
                </div>
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
                  className={`shrink-0 text-[#1c2a2b]/30 transition-transform mt-0.5 ${isExpanded ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-[#0e393d]/8 px-5 py-4 bg-[#fafaf8] space-y-4">
                {/* Line items */}
                <div>
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-[#0e393d]/6">
                      {order.order_items.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2 text-[#1c2a2b]">{locName(item.products?.name, lang) || '—'}</td>
                          <td className="py-2 text-center text-[#1c2a2b]/50">× {item.quantity}</td>
                          <td className="py-2 text-right tabular-nums font-medium text-[#0e393d]">
                            {fmtCurrency(item.unit_price * item.quantity, item.currency)}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t border-[#0e393d]/10">
                        <td colSpan={2} className="py-2 font-semibold text-[#0e393d]">Total</td>
                        <td className="py-2 text-right tabular-nums font-semibold text-[#0e393d]">{fmtCurrency(order.total_amount, order.currency)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Voucher */}
                {vouchers[order.id]?.voucher_code && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[#1c2a2b]/50">{t.orders.voucher}:</span>
                    <span className="font-mono font-bold text-[#0e393d] tracking-wider">{vouchers[order.id]!.voucher_code}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`/api/invoices/${order.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#0e393d]/15 px-3 py-1.5 text-xs font-medium text-[#0e393d] hover:bg-[#0e393d]/5 transition"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    {t.orders.invoice}
                  </a>
                  {showDashboard && (
                    <a
                      href="/health"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#0e393d] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0e393d]/85 transition"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                      </svg>
                      {t.orders.dashboard}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── My Results tab ───────────────────────────────────────────────────────────

type LabResult = {
  id: string; value_numeric: number; unit: string | null; status_flag: string | null;
  test_date: string | null; measured_at: string;
  product_item_definitions: {
    name: LocalizedString; unit: string | null; he_domain: string | null;
    ref_range_low: number | null; ref_range_high: number | null;
    optimal_range_low: number | null; optimal_range_high: number | null;
  } | null;
};

function MyResultsTab({ t, lang }: { t: typeof T['en']; lang: Lang }) {
  const supabase = createClient();
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('lab_results')
      .select(`
        id, value_numeric, unit, status_flag, test_date, measured_at,
        product_item_definitions:biomarker_definition_id (
          name, unit, he_domain, ref_range_low, ref_range_high, optimal_range_low, optimal_range_high
        )
      `)
      .is('deleted_at', null)
      .order('test_date', { ascending: false })
      .order('measured_at', { ascending: false })
      .then(({ data }) => {
        setResults((data as unknown as LabResult[]) ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  if (!results.length) return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">🧬</div>
      <p className="font-medium text-[#0e393d] mb-2">{t.results.empty}</p>
      <p className="text-sm text-[#1c2a2b]/50 mb-6">{t.results.emptySub}</p>
      <a href="/shop" className="inline-block rounded-full bg-[#0e393d] text-white px-6 py-2.5 text-sm font-medium hover:bg-[#0e393d]/85 transition">
        {t.results.shop}
      </a>
    </div>
  );

  // Group by test_date
  const byDate: Record<string, LabResult[]> = {};
  for (const r of results) {
    const key = r.test_date ?? r.measured_at.slice(0, 10);
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(r);
  }

  // Build previous values map for trend arrows (keyed by biomarker def id)
  const prevValues: Record<string, number> = {};
  const dates = Object.keys(byDate).sort().reverse();

  return (
    <div className="space-y-6">
      {dates.map((date, dateIdx) => {
        const dateResults = byDate[date];

        // Group by HE domain
        const byDomain: Record<string, LabResult[]> = {};
        for (const r of dateResults) {
          const domain = r.product_item_definitions?.he_domain ?? 'other';
          if (!byDomain[domain]) byDomain[domain] = [];
          byDomain[domain].push(r);
        }
        const domainOrder = [...HE_DOMAIN_ORDER, ...Object.keys(byDomain).filter((d) => !HE_DOMAIN_ORDER.includes(d))];
        const presentDomains = domainOrder.filter((d) => byDomain[d]?.length);

        // Collect prev values from older dates
        const olderResults = dates.slice(dateIdx + 1).flatMap((d) => byDate[d]);
        for (const r of olderResults) {
          if (r.product_item_definitions && !(r.id in prevValues)) {
            prevValues[r.id] = r.value_numeric;
          }
        }

        return (
          <div key={date}>
            <h3 className="text-sm font-semibold text-[#0e393d] mb-3 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#ceab84]">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {t.results.resultsFrom} {fmtDate(date)}
              <span className="text-[11px] font-normal text-[#1c2a2b]/40">({dateResults.length} biomarkers)</span>
            </h3>

            <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden">
              {presentDomains.map((domain, di) => (
                <div key={domain}>
                  {di > 0 && <div className="border-t border-[#0e393d]/6" />}
                  <div className="px-4 py-2 bg-[#0e393d]/3">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ceab84]/80">
                      {HE_DOMAIN_LABEL[domain] ?? domain}
                    </span>
                  </div>
                  <div className="divide-y divide-[#0e393d]/5">
                    {byDomain[domain].map((r) => {
                      const def = r.product_item_definitions;
                      const name = def ? locName(def.name, lang) : '—';
                      const prevMatch = olderResults.find((pr) =>
                        pr.product_item_definitions &&
                        locName(pr.product_item_definitions.name, lang) === name
                      );
                      const trend = prevMatch
                        ? r.value_numeric > prevMatch.value_numeric ? '↑'
                        : r.value_numeric < prevMatch.value_numeric ? '↓'
                        : '→'
                        : null;
                      const trendColor = trend === '↑' ? 'text-emerald-600' : trend === '↓' ? 'text-red-500' : 'text-[#1c2a2b]/40';

                      const refText = (() => {
                        const parts: string[] = [];
                        if (def?.ref_range_low != null || def?.ref_range_high != null) {
                          parts.push(`${t.results.ref}: ${def?.ref_range_low ?? '—'}–${def?.ref_range_high ?? '—'}`);
                        }
                        if (def?.optimal_range_low != null || def?.optimal_range_high != null) {
                          parts.push(`${t.results.opt}: ${def?.optimal_range_low ?? '—'}–${def?.optimal_range_high ?? '—'}`);
                        }
                        return parts.join(' · ');
                      })();

                      return (
                        <div key={r.id} className="px-4 py-3 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-[#1c2a2b]">{name}</span>
                              {trend && <span className={`text-xs font-semibold ${trendColor}`}>{trend}</span>}
                            </div>
                            {refText && <p className="text-[11px] text-[#1c2a2b]/35 mt-0.5">{refText}</p>}
                          </div>
                          <div className="text-right shrink-0 flex items-center gap-2">
                            <span className="tabular-nums text-sm font-semibold text-[#0e393d]">
                              {r.value_numeric} <span className="font-normal text-[#1c2a2b]/50 text-xs">{r.unit || def?.unit || ''}</span>
                            </span>
                            <FlagBadge flag={r.status_flag} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── My Invoices tab ──────────────────────────────────────────────────────────

type Invoice = {
  id: string; invoice_number: string; status: string; total_amount: number;
  currency: string; issued_at: string | null; order_id: string;
};

function MyInvoicesTab({ t }: { t: typeof T['en'] }) {
  const supabase = createClient();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('invoices')
      .select('id, invoice_number, status, total_amount, currency, issued_at, order_id')
      .order('issued_at', { ascending: false })
      .then(({ data }) => {
        setInvoices((data as Invoice[]) ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  if (!invoices.length) return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">🧾</div>
      <p className="font-medium text-[#0e393d]">{t.invoices.empty}</p>
    </div>
  );

  return (
    <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/3">
            {[t.invoices.number, t.invoices.date, t.invoices.amount, t.invoices.status, ''].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#0e393d]/6">
          {invoices.map((inv) => (
            <tr key={inv.id} className="hover:bg-[#fafaf8] transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-[#0e393d] font-medium">{inv.invoice_number}</td>
              <td className="px-4 py-3 text-xs text-[#1c2a2b]/60 whitespace-nowrap">{fmtDate(inv.issued_at)}</td>
              <td className="px-4 py-3 text-xs tabular-nums font-medium text-[#1c2a2b]">{fmtCurrency(inv.total_amount, inv.currency)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={inv.status} type="invoice" />
              </td>
              <td className="px-4 py-3 text-right">
                <a
                  href={`/api/invoices/${inv.order_id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#0e393d]/15 px-2.5 py-1 text-xs font-medium text-[#0e393d] hover:bg-[#0e393d]/5 transition"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  {t.invoices.download}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── ProfileTabs (main export) ────────────────────────────────────────────────

export default function ProfileTabs({ profile, lang }: { profile: ProfileData; lang: Lang }) {
  const [tab, setTab] = useState<Tab>('profile');
  const t = T[lang] ?? T.en;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'profile',  label: t.tabs.profile },
    { id: 'orders',   label: t.tabs.orders },
    { id: 'results',  label: t.tabs.results },
    { id: 'invoices', label: t.tabs.invoices },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-[#0e393d]/10 mb-8">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-1 py-3 mr-8 text-sm font-medium border-b-2 transition ${
              tab === id
                ? 'border-[#0e393d] text-[#0e393d]'
                : 'border-transparent text-[#1c2a2b]/40 hover:text-[#1c2a2b]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'profile'  && <ProfileEditor profile={profile} lang={lang} />}
      {tab === 'orders'   && <MyOrdersTab t={t} lang={lang} />}
      {tab === 'results'  && <MyResultsTab t={t} lang={lang} />}
      {tab === 'invoices' && <MyInvoicesTab t={t} />}
    </div>
  );
}
