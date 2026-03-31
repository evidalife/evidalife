'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import ProfileEditor, { type ProfileData } from './ProfileEditor';
import LabReportsTab from './LabReportsTab';

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
      addResult: '+ Wert erfassen',
      addResultTitle: 'Eigenen Wert erfassen',
      biomarker: 'Biomarker',
      value: 'Wert',
      unit: 'Einheit',
      date: 'Datum',
      save: 'Speichern',
      cancel: 'Abbrechen',
      delete: 'Löschen',
      searchBiomarker: 'Biomarker suchen…',
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
      addResult: '+ Add Result',
      addResultTitle: 'Add a Result',
      biomarker: 'Biomarker',
      value: 'Value',
      unit: 'Unit',
      date: 'Date',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      searchBiomarker: 'Search biomarker…',
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
    results: { empty: 'Aucun résultat.', emptySub: '', shop: 'Se faire tester', resultsFrom: 'Résultats du', ref: 'Réf', opt: 'Opt', addResult: '+ Ajouter', addResultTitle: 'Ajouter un résultat', biomarker: 'Biomarqueur', value: 'Valeur', unit: 'Unité', date: 'Date', save: 'Enregistrer', cancel: 'Annuler', delete: 'Supprimer', searchBiomarker: 'Rechercher…' },
    invoices: { empty: 'Aucune facture.', download: 'Télécharger PDF', number: 'N° facture', date: 'Date', amount: 'Montant', status: 'Statut' },
    loading: 'Chargement…',
  },
  es: {
    tabs: { profile: 'Perfil', orders: 'Pedidos', results: 'Resultados', invoices: 'Facturas' },
    orders: { empty: 'Sin pedidos.', emptySub: '', shop: 'Tienda', invoice: 'Factura (PDF)', dashboard: 'Panel de salud', voucher: 'Código bono' },
    results: { empty: 'Sin resultados.', emptySub: '', shop: 'Hacerse el test', resultsFrom: 'Resultados del', ref: 'Ref', opt: 'Opt', addResult: '+ Añadir', addResultTitle: 'Añadir resultado', biomarker: 'Biomarcador', value: 'Valor', unit: 'Unidad', date: 'Fecha', save: 'Guardar', cancel: 'Cancelar', delete: 'Eliminar', searchBiomarker: 'Buscar…' },
    invoices: { empty: 'Sin facturas.', download: 'Descargar PDF', number: 'N.º factura', date: 'Fecha', amount: 'Importe', status: 'Estado' },
    loading: 'Cargando…',
  },
  it: {
    tabs: { profile: 'Profilo', orders: 'Ordini', results: 'Risultati', invoices: 'Fatture' },
    orders: { empty: 'Nessun ordine.', emptySub: '', shop: 'Negozio', invoice: 'Fattura (PDF)', dashboard: 'Dashboard salute', voucher: 'Codice voucher' },
    results: { empty: 'Nessun risultato.', emptySub: '', shop: 'Effettua il test', resultsFrom: 'Risultati del', ref: 'Rif', opt: 'Opt', addResult: '+ Aggiungi', addResultTitle: 'Aggiungi risultato', biomarker: 'Biomarcatore', value: 'Valore', unit: 'Unità', date: 'Data', save: 'Salva', cancel: 'Annulla', delete: 'Elimina', searchBiomarker: 'Cerca…' },
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

const HE_DOMAIN_ORDER = ['heart_vessels', 'metabolism', 'hormones', 'inflammation', 'nutrients', 'organ_function', 'body_composition', 'fitness', 'epigenetics'];

const HE_DOMAIN_ICON: Record<string, string> = {
  heart_vessels: '❤️', metabolism: '⚡', hormones: '🧬', inflammation: '🛡️',
  nutrients: '🥗', organ_function: '🫁', body_composition: '🏋️', fitness: '🏃', epigenetics: '🧪',
};

function statusColorPT(flag: string | null): string {
  return flag === 'optimal' ? '#0C9C6C' : flag === 'good' ? '#5ba37a' : flag === 'moderate' ? '#C4A96A' : flag === 'risk' ? '#E06B5B' : '#999';
}

function scoreFromFlag(flag: string | null): number {
  return flag === 'optimal' ? 95 : flag === 'good' ? 82 : flag === 'moderate' ? 65 : flag === 'risk' ? 40 : 0;
}

function fmtRange(lo: number | null, hi: number | null): string {
  if (lo != null && hi != null) return `${lo}–${hi}`;
  if (hi != null) return `< ${hi}`;
  if (lo != null) return `> ${lo}`;
  return '—';
}

function MiniRangeBarPT({ value, refLow, refHigh, optLow, optHigh, status }: {
  value: number; refLow: number | null; refHigh: number | null;
  optLow: number | null; optHigh: number | null; status: string | null;
}) {
  const lo = (refLow ?? 0) * 0.7;
  const hi = (refHigh ?? value * 2) * 1.3;
  const range = hi - lo || 1;
  const pct = Math.max(2, Math.min(98, ((value - lo) / range) * 100));
  const oL = optLow != null ? Math.max(0, ((optLow - lo) / range) * 100) : 0;
  const oW = optLow != null && optHigh != null ? Math.max(4, ((optHigh - optLow) / range) * 100) : 0;
  const clr = statusColorPT(status);
  return (
    <div className="relative h-[6px] rounded-full bg-[#0e393d]/[.06] overflow-hidden">
      {oW > 0 && <div className="absolute top-0 h-full rounded-full bg-[#0C9C6C]/[.10]" style={{ left: `${oL}%`, width: `${oW}%` }} />}
      <div className="absolute top-[1px] w-[4px] h-[4px] rounded-full" style={{ left: `${pct}%`, transform: 'translateX(-50%)', background: clr }} />
    </div>
  );
}

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
  test_date: string | null; measured_at: string; source: string | null;
  biomarker_definition_id: string | null;
  biomarkers: {
    name: LocalizedString; unit: string | null; he_domain: string | null;
    ref_range_low: number | null; ref_range_high: number | null;
    optimal_range_low: number | null; optimal_range_high: number | null;
  } | null;
};

type BiomarkerOption = {
  id: string; slug: string; unit: string | null;
  name: Record<string, string> | null;
};

function SourceBadge({ source }: { source: string | null }) {
  if (!source || source === 'pdf_upload' || source === 'manual') {
    return (
      <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-[#0e393d]/8 text-[#0e393d]/60 whitespace-nowrap">
        Lab
      </span>
    );
  }
  if (source === 'self_report') {
    return (
      <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-[#ceab84]/20 text-[#7a5e20] whitespace-nowrap">
        Self
      </span>
    );
  }
  return null;
}

function MyResultsTab({ t, lang }: { t: typeof T['en']; lang: Lang }) {
  const supabase = createClient();
  const { confirm, ConfirmDialog: confirmDialog } = useConfirmDialog();
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProfileReports, setExpandedProfileReports] = useState<Set<string>>(() => new Set());
  const [showForm, setShowForm] = useState(false);
  const [biomarkers, setBiomarkers] = useState<BiomarkerOption[]>([]);
  const [search, setSearch] = useState('');
  const [selectedBm, setSelectedBm] = useState<BiomarkerOption | null>(null);
  const [formValue, setFormValue] = useState('');
  const [formUnit, setFormUnit] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [bmAltUnits, setBmAltUnits] = useState<string[]>([]);

  const loadResults = () => {
    supabase
      .from('lab_results')
      .select(`
        id, value_numeric, unit, status_flag, test_date, measured_at, source, biomarker_definition_id,
        biomarkers:biomarker_definition_id (
          name, unit, he_domain, ref_range_low, ref_range_high, optimal_range_low, optimal_range_high
        )
      `)
      .is('deleted_at', null)
      .order('test_date', { ascending: false })
      .order('measured_at', { ascending: false })
      .then(({ data }) => {
        const loaded = (data as unknown as LabResult[]) ?? [];
        setResults(loaded);
        // Auto-expand newest report
        if (loaded.length > 0) {
          const newest = loaded.reduce((a, b) => ((b.test_date ?? b.measured_at) > (a.test_date ?? a.measured_at) ? b : a));
          const newestDate = newest.test_date ?? newest.measured_at.slice(0, 10);
          setExpandedProfileReports(new Set([newestDate]));
        }
        setLoading(false);
      });
  };

  useEffect(() => { loadResults(); }, []);

  useEffect(() => {
    if (!showForm || biomarkers.length > 0) return;
    supabase
      .from('biomarkers')
      .select('id, slug, name, unit')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => setBiomarkers((data as unknown as BiomarkerOption[]) ?? []));
  }, [showForm]);

  const filteredBiomarkers = search.trim().length < 1 ? [] : biomarkers.filter((bm) => {
    const q = search.toLowerCase();
    const n = bm.name ? Object.values(bm.name).join(' ').toLowerCase() : '';
    return n.includes(q) || bm.slug.includes(q);
  }).slice(0, 8);

  const handleSave = async () => {
    if (!selectedBm || !formValue || !formDate) return;
    setSaving(true);
    const res = await fetch('/api/lab-results/self-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        biomarker_id: selectedBm.id,
        value: parseFloat(formValue),
        unit: formUnit || selectedBm.unit || '',
        test_date: formDate,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!data.success) {
      console.error('[self-report] save failed:', data.error);
      return;
    }
    setShowForm(false);
    setSelectedBm(null);
    setSearch('');
    setBmAltUnits([]);
    setFormValue('');
    setFormUnit('');
    setFormDate(new Date().toISOString().slice(0, 10));
    loadResults();
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: t.results.delete, message: t.results.delete + '?', variant: 'danger' }))) return;
    await supabase.from('lab_results').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    setResults((prev) => prev.filter((r) => r.id !== id));
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="space-y-6">
      {confirmDialog}
      {/* Header with + Add Result */}
      <div className="flex items-center justify-between">
        <span />
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#0e393d] text-white px-4 py-2 text-xs font-medium hover:bg-[#0e393d]/85 transition"
        >
          {t.results.addResult}
        </button>
      </div>

      {/* Self-report form */}
      {showForm && (
        <div className="rounded-xl border border-[#0e393d]/15 bg-white p-4 space-y-3">
          <p className="text-sm font-semibold text-[#0e393d]">{t.results.addResultTitle}</p>

          {/* Biomarker search */}
          <div className="relative">
            <input
              type="text"
              value={selectedBm ? locName(selectedBm.name, lang) : search}
              onChange={(e) => { setSearch(e.target.value); setSelectedBm(null); }}
              placeholder={t.results.searchBiomarker}
              className="w-full rounded-lg border border-[#0e393d]/20 px-3 py-2 text-sm text-[#1c2a2b] placeholder-[#1c2a2b]/35 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/20"
            />
            {filteredBiomarkers.length > 0 && !selectedBm && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-[#0e393d]/12 bg-white shadow-lg overflow-hidden">
                {filteredBiomarkers.map((bm) => (
                  <button
                    key={bm.id}
                    onClick={async () => {
                      setSelectedBm(bm);
                      setSearch('');
                      setFormUnit(bm.unit ?? '');
                      // Load alt units for this biomarker
                      const { data: convs } = await supabase
                        .from('biomarker_unit_conversions')
                        .select('alt_unit')
                        .eq('biomarker_id', bm.id);
                      setBmAltUnits((convs ?? []).map((c: any) => c.alt_unit));
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-[#0e393d]/5 transition flex items-center justify-between"
                  >
                    <span>{locName(bm.name, lang)}</span>
                    <span className="text-[11px] text-[#1c2a2b]/40">{bm.unit}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedBm && (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-[#1c2a2b]/50 mb-1">{t.results.value}</label>
                <input
                  type="number"
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  className="w-full rounded-lg border border-[#0e393d]/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0e393d]/20"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#1c2a2b]/50 mb-1">{t.results.unit}</label>
                {bmAltUnits.length > 0 ? (
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full rounded-lg border border-[#0e393d]/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0e393d]/20 bg-white"
                  >
                    <option value={selectedBm.unit ?? ''}>{selectedBm.unit}</option>
                    {bmAltUnits.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full rounded-lg border border-[#0e393d]/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0e393d]/20"
                  />
                )}
                {formUnit && selectedBm.unit && formUnit !== selectedBm.unit && (
                  <p className="mt-1 text-[11px] text-amber-700 bg-amber-50 rounded px-2 py-1">
                    Will be converted to {selectedBm.unit} on save
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[11px] text-[#1c2a2b]/50 mb-1">{t.results.date}</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full rounded-lg border border-[#0e393d]/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0e393d]/20"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowForm(false); setSelectedBm(null); setSearch(''); }}
              className="rounded-full border border-[#0e393d]/20 px-4 py-1.5 text-xs font-medium text-[#0e393d]/60 hover:bg-[#0e393d]/5 transition"
            >
              {t.results.cancel}
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedBm || !formValue || saving}
              className="rounded-full bg-[#0e393d] text-white px-4 py-1.5 text-xs font-medium hover:bg-[#0e393d]/85 transition disabled:opacity-40"
            >
              {saving ? '…' : t.results.save}
            </button>
          </div>
        </div>
      )}

      {!results.length && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🧬</div>
          <p className="font-medium text-[#0e393d] mb-2">{t.results.empty}</p>
          <p className="text-sm text-[#1c2a2b]/50 mb-6">{t.results.emptySub}</p>
          <a href="/shop" className="inline-block rounded-full bg-[#0e393d] text-white px-6 py-2.5 text-sm font-medium hover:bg-[#0e393d]/85 transition">
            {t.results.shop}
          </a>
        </div>
      )}

      {/* Group by test_date — HE-style collapsible reports */}
      {(() => {
        const byDate: Record<string, LabResult[]> = {};
        for (const r of results) {
          const key = r.test_date ?? r.measured_at.slice(0, 10);
          if (!byDate[key]) byDate[key] = [];
          byDate[key].push(r);
        }
        const dates = Object.keys(byDate).sort().reverse();

        return (
          <div className="space-y-6">
            {dates.map((date) => {
              const dateResults = byDate[date];
              const byDomain: Record<string, LabResult[]> = {};
              for (const r of dateResults) {
                const domain = r.biomarkers?.he_domain ?? 'other';
                if (!byDomain[domain]) byDomain[domain] = [];
                byDomain[domain].push(r);
              }
              const domainOrder = [...HE_DOMAIN_ORDER, ...Object.keys(byDomain).filter((d) => !HE_DOMAIN_ORDER.includes(d))];
              const presentDomains = domainOrder.filter((d) => byDomain[d]?.length);

              const isExp = expandedProfileReports.has(date);
              const toggleExp = () => {
                setExpandedProfileReports(prev => {
                  const next = new Set(prev);
                  if (next.has(date)) next.delete(date); else next.add(date);
                  return next;
                });
              };

              return (
                <div key={date} className="bg-white rounded-xl border border-[#1c2a2b]/[.06] overflow-hidden shadow-sm">
                  {/* Report header */}
                  <div
                    className="bg-[#0e393d] px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-[#0e393d]/95 transition-colors"
                    onClick={toggleExp}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-white/[.08] flex items-center justify-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {t.results.resultsFrom} {fmtDate(date)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-[10px] text-white/30">{dateResults.length} biomarkers</div>
                      <span className={`text-white/30 text-xs transition-transform duration-200 ${isExp ? 'rotate-180' : ''}`}>▼</span>
                    </div>
                  </div>

                  {/* Expanded domain sections */}
                  {isExp && presentDomains.map((domain, di) => (
                    <div key={domain}>
                      <div className="px-5 py-2.5 bg-[#0e393d]/[.03] border-b border-[#0e393d]/[.06] flex items-center gap-4">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-sm">{HE_DOMAIN_ICON[domain] ?? '📊'}</span>
                          <span className="text-[10px] font-semibold tracking-[.1em] uppercase text-[#ceab84]">
                            {HE_DOMAIN_LABEL[domain] ?? domain}
                          </span>
                        </div>
                        {di === 0 && (
                          <>
                            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#1c2a2b]/25 shrink-0 w-24 text-right">Value</span>
                            <span className="hidden sm:block text-[9px] font-semibold uppercase tracking-wider text-[#1c2a2b]/25 shrink-0 w-16 text-right">Ref</span>
                            <span className="hidden sm:block text-[9px] font-semibold uppercase tracking-wider text-[#0C9C6C]/30 shrink-0 w-16 text-right">Optimal</span>
                            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#1c2a2b]/25 shrink-0 w-28 text-right">Range / Score</span>
                          </>
                        )}
                      </div>

                      <div className="divide-y divide-[#0e393d]/[.04]">
                        {byDomain[domain].map((r) => {
                          const def = r.biomarkers;
                          const name = def ? locName(def.name, lang) : '—';
                          const flag = r.status_flag;
                          const clr = statusColorPT(flag);
                          const score = scoreFromFlag(flag);
                          const isSelfReport = r.source === 'self_report';

                          return (
                            <div key={r.id} className="px-5 py-2.5 flex items-center gap-4 hover:bg-[#0e393d]/[.01] transition-colors">
                              {/* Status dot + name + badge */}
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: clr }} />
                                <span className="text-[12px] font-medium text-[#0e393d] truncate flex items-center gap-1.5">
                                  {name}
                                  <SourceBadge source={r.source} />
                                  <FlagBadge flag={flag} />
                                </span>
                                {isSelfReport && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                                    title={t.results.delete}
                                    className="ml-1 p-1 rounded text-[#1c2a2b]/20 hover:text-red-500 hover:bg-red-50 transition shrink-0"
                                  >
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                                      <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                                    </svg>
                                  </button>
                                )}
                              </div>

                              {/* Value + unit */}
                              <div className="text-right shrink-0 w-24">
                                <span className="text-[13px] font-semibold tabular-nums" style={{ color: clr }}>
                                  {r.value_numeric.toLocaleString('de-CH', { maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-[10px] text-[#1c2a2b]/30 ml-1">{r.unit || def?.unit || ''}</span>
                              </div>

                              {/* Reference range */}
                              <div className="hidden sm:block text-[10px] text-[#1c2a2b]/35 shrink-0 w-16 text-right tabular-nums">
                                {fmtRange(def?.ref_range_low ?? null, def?.ref_range_high ?? null)}
                              </div>

                              {/* Optimal range */}
                              <div className="hidden sm:block text-[10px] text-[#0C9C6C]/50 font-medium shrink-0 w-16 text-right tabular-nums">
                                {fmtRange(def?.optimal_range_low ?? null, def?.optimal_range_high ?? null)}
                              </div>

                              {/* Mini range bar + score */}
                              <div className="flex items-center gap-2 shrink-0 w-28">
                                <div className="w-16">
                                  {(def?.ref_range_low != null || def?.ref_range_high != null) && (
                                    <MiniRangeBarPT value={r.value_numeric} refLow={def?.ref_range_low ?? null} refHigh={def?.ref_range_high ?? null}
                                      optLow={def?.optimal_range_low ?? null} optHigh={def?.optimal_range_high ?? null} status={flag} />
                                  )}
                                </div>
                                <span className="text-[11px] font-bold tabular-nums w-8 text-right" style={{ color: clr }}>
                                  {score > 0 ? score : '—'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        );
      })()}
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

const TAB_ICONS: Record<Tab, React.ReactNode> = {
  profile: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  orders: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  ),
  results: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11m0 0H5m4 0h10m0-11v11m0 0h-4"/>
      <path d="M3 9h18"/>
    </svg>
  ),
  invoices: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
};

export default function ProfileTabs({ profile, lang, initialTab }: { profile: ProfileData; lang: Lang; initialTab?: string }) {
  const VALID_TABS: Tab[] = ['profile', 'orders', 'results', 'invoices'];
  const [tab, setTab] = useState<Tab>(() =>
    VALID_TABS.includes(initialTab as Tab) ? (initialTab as Tab) : 'profile'
  );

  // Sync when the URL ?tab= param changes via client-side navigation
  useEffect(() => {
    if (initialTab && VALID_TABS.includes(initialTab as Tab)) {
      setTab(initialTab as Tab);
    } else if (!initialTab) {
      setTab('profile');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab]);
  const t = T[lang] ?? T.en;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'profile',  label: t.tabs.profile },
    { id: 'orders',   label: t.tabs.orders },
    { id: 'results',  label: t.tabs.results },
    { id: 'invoices', label: t.tabs.invoices },
  ];

  return (
    <div>
      {/* Tab bar — horizontally scrollable on mobile */}
      <div className="overflow-x-auto -mx-6 px-6 scrollbar-none">
        <div className="flex border-b border-[#0e393d]/10 mb-8 min-w-max">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-1 py-3 mr-7 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                tab === id
                  ? 'border-[#0e393d] text-[#0e393d]'
                  : 'border-transparent text-[#1c2a2b]/40 hover:text-[#1c2a2b]'
              }`}
            >
              {TAB_ICONS[id]}
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'profile'  && <ProfileEditor profile={profile} lang={lang} />}
      {tab === 'orders'   && <MyOrdersTab t={t} lang={lang} />}
      {tab === 'results'  && <LabReportsTab lang={lang} userId={profile.id} />}
      {tab === 'invoices' && <MyInvoicesTab t={t} />}
    </div>
  );
}
