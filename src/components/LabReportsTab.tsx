'use client';

// src/components/LabReportsTab.tsx
// User-facing lab reports: list, PDF upload, manual entry, edit, delete.

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { displayReportId } from '@/lib/lab-results/report-number';

// ── Types ─────────────────────────────────────────────────────────────────────

type Lang = 'de' | 'en' | 'fr' | 'es' | 'it';
type Mode = 'list' | 'choose' | 'pdf' | 'pdf-review' | 'manual' | 'edit';

type LabResultRow = {
  id: string;
  value_numeric: number | null;
  unit: string | null;
  status_flag: string | null;
  test_date: string | null;
  source: string | null;
  deleted_at: string | null;
  biomarker_definition_id: string | null;
  biomarkers: {
    name: any;
    unit: string | null;
    he_domain: string | null;
    ref_range_low: number | null;
    ref_range_high: number | null;
    optimal_range_low: number | null;
    optimal_range_high: number | null;
  } | null;
};

type LabReport = {
  id: string;
  title: string;
  test_date: string | null;
  source: string;
  status: string | null;
  order_id: string | null;
  order_item_id: string | null;
  report_number: string | null;
  lab_address: string | null;
  lab_email: string | null;
  lab_phone: string | null;
  created_at: string;
  lab_results: LabResultRow[];
  voucher_code?: string | null;
};

type FormMeta = {
  title: string;
  test_date: string;
  lab_address: string;
  lab_email: string;
  lab_phone: string;
};

type FormRow = {
  rowId: string;
  biomarker_id: string;
  biomarker_name: string;
  canonical_unit: string;
  alt_units: string[];
  value: string;
  unit: string;
};

type BiomarkerOption = {
  id: string;
  slug: string;
  name: any;
  unit: string | null;
};

type ExtractedRow = {
  extracted_name: string;
  value: number;
  unit: string;
  matched_id: string | null;
  matched_name: string | null;
  confidence: 'exact' | 'alias' | 'fuzzy' | 'unmatched';
  was_converted: boolean;
  original_value: number | null;
  original_unit: string | null;
  include: boolean;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const HE_DOMAIN_LABEL: Record<string, string> = {
  heart_vessels: 'Heart & Vessels', metabolism: 'Metabolism',
  hormones: 'Hormones', inflammation: 'Inflammation',
  nutrients: 'Nutrients', organ_function: 'Organ Function',
  longevity: 'Longevity', fitness: 'Fitness',
};

const HE_DOMAIN_ORDER = [
  'heart_vessels', 'metabolism', 'hormones', 'inflammation',
  'nutrients', 'organ_function', 'longevity', 'fitness',
];

const PRIVACY_NOTICE: Record<string, string> = {
  de: 'Dein Laborbericht wird nur zur Analyse hochgeladen. Nach der Erkennung der Werte wird die Datei unwiderruflich gelöscht. Wir speichern nur die erkannten Laborwerte, nicht das Dokument selbst.',
  en: 'Your lab report is uploaded for analysis only. After extracting the values, the file will be permanently deleted. We only store the recognized lab values, not the document itself.',
  fr: 'Votre rapport de laboratoire est téléchargé uniquement pour analyse. Après extraction des valeurs, le fichier sera définitivement supprimé. Nous ne conservons que les valeurs de laboratoire reconnues.',
  es: 'Tu informe de laboratorio se sube solo para análisis. Después de extraer los valores, el archivo se eliminará permanentemente. Solo almacenamos los valores de laboratorio reconocidos.',
  it: "Il tuo referto di laboratorio viene caricato solo per l'analisi. Dopo l'estrazione dei valori, il file verrà eliminato definitivamente. Conserviamo solo i valori di laboratorio riconosciuti.",
};

const SAVE_CONFIRM: Record<string, string> = {
  de: '✅ Werte gespeichert. Datei wurde gelöscht.',
  en: '✅ Values saved. File has been deleted.',
  fr: '✅ Valeurs enregistrées. Fichier supprimé.',
  es: '✅ Valores guardados. Archivo eliminado.',
  it: '✅ Valori salvati. File eliminato.',
};

const FLAG_STYLE: Record<string, string> = {
  optimal:  'bg-[#0C9C6C]/12 text-[#0C9C6C]',
  good:     'bg-[#C4A96A]/15 text-[#7a5e20]',
  moderate: 'bg-[#ef9f27]/15 text-[#a05e00]',
  risk:     'bg-[#E24B4A]/12 text-[#E24B4A]',
};

const FLAG_LABEL: Record<string, string> = {
  optimal: 'Optimal', good: 'Good', moderate: 'Borderline', risk: 'Risk',
};

// ── Pending report constants ───────────────────────────────────────────────────

const PENDING_STATUSES = new Set([
  'awaiting_sample', 'sample_collected', 'processing',
  'results_received', 'ai_extracted', 'review_pending',
]);

const PENDING_STEP: Record<string, number> = {
  awaiting_sample: 1, sample_collected: 2,
  processing: 3, results_received: 3, ai_extracted: 3, review_pending: 4,
};

const PENDING_STATUS_LABEL: Record<string, Record<Lang, string>> = {
  awaiting_sample:  { de: 'Probe ausstehend', en: 'Awaiting sample', fr: 'En attente de prélèvement', es: 'Muestra pendiente', it: 'Campione in attesa' },
  sample_collected: { de: 'Probe eingegangen', en: 'Sample collected', fr: 'Échantillon reçu', es: 'Muestra recogida', it: 'Campione raccolto' },
  processing:       { de: 'In Analyse', en: 'Processing', fr: "En cours d'analyse", es: 'En análisis', it: 'In analisi' },
  results_received: { de: 'Ergebnisse eingegangen', en: 'Results received', fr: 'Résultats reçus', es: 'Resultados recibidos', it: 'Risultati ricevuti' },
  ai_extracted:     { de: 'KI-Auswertung', en: 'AI extracted', fr: 'Extraction IA', es: 'Extracción IA', it: 'Estratto IA' },
  review_pending:   { de: 'Wird überprüft', en: 'Under review', fr: 'En cours de vérification', es: 'En revisión', it: 'In revisione' },
};

const PENDING_STATUS_COLOR: Record<string, string> = {
  awaiting_sample:  'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
  sample_collected: 'bg-sky-50 text-sky-700 ring-1 ring-sky-600/20',
  processing:       'bg-violet-50 text-violet-700 ring-1 ring-violet-600/20',
  results_received: 'bg-violet-50 text-violet-700 ring-1 ring-violet-600/20',
  ai_extracted:     'bg-violet-50 text-violet-700 ring-1 ring-violet-600/20',
  review_pending:   'bg-teal-50 text-teal-700 ring-1 ring-teal-600/20',
};

const PENDING_T: Record<string, Record<Lang, string>> = {
  step:               { de: 'Schritt', en: 'Step', fr: 'Étape', es: 'Paso', it: 'Passo' },
  biomarkersPending:  { de: 'Biomarker ausstehend', en: 'biomarkers pending', fr: 'biomarqueurs en attente', es: 'biomarcadores pendientes', it: 'biomarcatori in attesa' },
  pending:            { de: 'ausstehend', en: 'pending', fr: 'en attente', es: 'pendiente', it: 'in attesa' },
  more:               { de: 'weitere', en: 'more', fr: 'de plus', es: 'más', it: 'altri' },
  visitAnyLab:        { de: 'Besuchen Sie eine unserer Partnerstandorte mit Ihrem Gutscheincode', en: 'Visit any of our partner locations with your voucher code', fr: "Rendez-vous dans l'un de nos sites partenaires avec votre code", es: 'Visite cualquiera de nuestras ubicaciones asociadas con su código', it: 'Visita uno dei nostri centri partner con il tuo codice' },
  voucherCode:        { de: 'Gutscheincode', en: 'Voucher code', fr: 'Code bon', es: 'Código vale', it: 'Codice voucher' },
  inProgressTitle:    { de: 'Laufende Analysen', en: 'In Progress', fr: 'En cours', es: 'En curso', it: 'In corso' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function locName(f: any, lang: Lang = 'en'): string {
  if (!f) return '';
  if (typeof f === 'string') return f;
  return f[lang] || f.en || f.de || (Object.values(f)[0] as string) || '';
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

let _rowId = 0;
function newRowId() { return String(++_rowId); }
function emptyRow(): FormRow {
  return { rowId: newRowId(), biomarker_id: '', biomarker_name: '', canonical_unit: '', alt_units: [], value: '', unit: '' };
}
function emptyMeta(): FormMeta {
  return { title: '', test_date: '', lab_address: '', lab_email: '', lab_phone: '' };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Spinner() {
  return <div className="h-4 w-4 animate-spin rounded-full border border-[#0e393d]/20 border-t-[#0e393d]" />;
}

function FlagBadge({ flag }: { flag: string | null }) {
  if (!flag) return null;
  const cls = FLAG_STYLE[flag] ?? 'bg-gray-50 text-gray-600';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${cls}`}>
      {FLAG_LABEL[flag] ?? flag}
    </span>
  );
}

function SourceBadge({ source }: { source: string | null }) {
  if (source === 'admin_import') {
    return <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-[#ceab84]/20 text-[#7a5e20] whitespace-nowrap">Admin</span>;
  }
  if (source === 'pdf_upload') {
    return <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-[#0e393d]/8 text-[#0e393d]/60 whitespace-nowrap">PDF</span>;
  }
  if (source === 'manual_entry') {
    return <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-600 whitespace-nowrap">Manual</span>;
  }
  return null;
}

// ── Results grouped by domain ─────────────────────────────────────────────────

function ResultsDisplay({ results, lang }: { results: LabResultRow[]; lang: Lang }) {
  const byDomain: Record<string, LabResultRow[]> = {};
  for (const r of results) {
    const domain = r.biomarkers?.he_domain ?? 'other';
    if (!byDomain[domain]) byDomain[domain] = [];
    byDomain[domain].push(r);
  }
  const presentDomains = [...HE_DOMAIN_ORDER, ...Object.keys(byDomain).filter((d) => !HE_DOMAIN_ORDER.includes(d))]
    .filter((d) => byDomain[d]?.length);

  return (
    <div className="divide-y divide-[#0e393d]/6">
      {presentDomains.map((domain) => (
        <div key={domain}>
          <div className="px-4 py-1.5 bg-[#0e393d]/3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ceab84]/80">
              {HE_DOMAIN_LABEL[domain] ?? domain}
            </span>
          </div>
          <div className="divide-y divide-[#0e393d]/5">
            {byDomain[domain].map((r) => {
              const def = r.biomarkers;
              const name = def ? locName(def.name, lang) : '—';
              return (
                <div key={r.id} className="px-4 py-2.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-[#1c2a2b]">{name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="tabular-nums text-sm font-semibold text-[#0e393d]">
                      {r.value_numeric ?? '—'}{' '}
                      <span className="font-normal text-[#1c2a2b]/50 text-xs">{r.unit || def?.unit || ''}</span>
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
  );
}

// ── Metadata form (shared between pdf-review and manual/edit) ─────────────────

function MetaFields({ meta, onChange }: {
  meta: FormMeta;
  onChange: (updates: Partial<FormMeta>) => void;
}) {
  const inp = 'w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10';
  return (
    <div className="rounded-xl border border-[#0e393d]/10 bg-white p-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs text-[#1c2a2b]/50 mb-1">Report Title <span className="text-red-400">*</span></label>
          <input type="text" value={meta.title} placeholder="e.g. Blood Panel – Synlab Jan 2025"
            onChange={(e) => onChange({ title: e.target.value })} className={inp} />
        </div>
        <div>
          <label className="block text-xs text-[#1c2a2b]/50 mb-1">Test Date <span className="text-red-400">*</span></label>
          <input type="date" value={meta.test_date}
            onChange={(e) => onChange({ test_date: e.target.value })} className={inp} />
        </div>
        <div>
          <label className="block text-xs text-[#1c2a2b]/50 mb-1">Lab Address</label>
          <input type="text" value={meta.lab_address} placeholder="Optional"
            onChange={(e) => onChange({ lab_address: e.target.value })} className={inp} />
        </div>
        <div>
          <label className="block text-xs text-[#1c2a2b]/50 mb-1">Lab Email</label>
          <input type="email" value={meta.lab_email} placeholder="Optional"
            onChange={(e) => onChange({ lab_email: e.target.value })} className={inp} />
        </div>
        <div>
          <label className="block text-xs text-[#1c2a2b]/50 mb-1">Lab Phone</label>
          <input type="tel" value={meta.lab_phone} placeholder="Optional"
            onChange={(e) => onChange({ lab_phone: e.target.value })} className={inp} />
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LabReportsTab({ lang, userId }: { lang: Lang; userId?: string }) {
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>('list');
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<LabReport[]>([]);
  const [orphanResults, setOrphanResults] = useState<LabResultRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Biomarkers — loaded once when form opens
  const [allBiomarkers, setAllBiomarkers] = useState<BiomarkerOption[]>([]);

  // PDF flow
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfStoragePath, setPdfStoragePath] = useState<string | null>(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfExtracting, setPdfExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedRow[]>([]);
  const [pdfMeta, setPdfMeta] = useState<FormMeta>(emptyMeta());
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual / edit form
  const [editReportId, setEditReportId] = useState<string | null>(null);
  const [formMeta, setFormMeta] = useState<FormMeta>(emptyMeta());
  const [formRows, setFormRows] = useState<FormRow[]>([emptyRow()]);
  const [rowSearch, setRowSearch] = useState<Record<string, string>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // ── Load data ────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    // If no userId provided, get the current user's id
    let uid = userId;
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser();
      uid = user?.id;
    }
    const [reportsRes, orphanRes] = await Promise.all([
      supabase
        .from('lab_reports')
        .select(`
          id, title, test_date, source, status, order_id, order_item_id, report_number, lab_address, lab_email, lab_phone, created_at,
          lab_results(
            id, value_numeric, unit, status_flag, test_date, source, deleted_at, biomarker_definition_id,
            biomarkers:biomarker_definition_id(name, unit, he_domain, ref_range_low, ref_range_high, optimal_range_low, optimal_range_high)
          )
        `)
        .eq('user_id', uid!)
        .is('deleted_at', null)
        .neq('status', 'archived')
        .order('created_at', { ascending: false }),
      supabase
        .from('lab_results')
        .select(`
          id, value_numeric, unit, status_flag, test_date, source, deleted_at, biomarker_definition_id,
          biomarkers:biomarker_definition_id(name, unit, he_domain, ref_range_low, ref_range_high, optimal_range_low, optimal_range_high)
        `)
        .eq('user_id', uid!)
        .is('lab_report_id', null)
        .is('deleted_at', null)
        .order('test_date', { ascending: false }),
    ]);

    const rawReports = (reportsRes.data ?? []) as any[];
    const cleanReports: LabReport[] = rawReports.map((rp) => ({
      ...rp,
      lab_results: (rp.lab_results ?? []).filter((r: any) => r.deleted_at == null),
    }));

    // Attach voucher codes to pending reports
    const pendingOrderIds = [...new Set(
      cleanReports
        .filter((r) => r.order_id && r.status && PENDING_STATUSES.has(r.status))
        .map((r) => r.order_id!),
    )];

    if (pendingOrderIds.length) {
      const { data: vouchers } = await supabase
        .from('order_vouchers')
        .select('order_id, order_item_id, voucher_code')
        .in('order_id', pendingOrderIds);

      const byOrderItem = new Map(
        (vouchers ?? []).filter((v: any) => v.order_item_id).map((v: any) => [v.order_item_id, v.voucher_code]),
      );
      const byOrder = new Map((vouchers ?? []).map((v: any) => [v.order_id, v.voucher_code]));

      for (const r of cleanReports) {
        if (r.order_id && r.status && PENDING_STATUSES.has(r.status)) {
          r.voucher_code = (r.order_item_id && byOrderItem.get(r.order_item_id)) || byOrder.get(r.order_id) || null;
        }
      }
    }

    setReports(cleanReports);
    setOrphanResults((orphanRes.data as unknown as LabResultRow[]) ?? []);
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => { loadData(); }, [loadData]);

  const ensureBiomarkers = async () => {
    if (allBiomarkers.length > 0) return;
    const { data } = await supabase
      .from('biomarkers')
      .select('id, slug, name, unit')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    setAllBiomarkers((data as BiomarkerOption[]) ?? []);
  };

  // ── Navigation ────────────────────────────────────────────────────────────────

  const backToList = () => {
    setMode('list');
    setPdfFile(null);
    setPdfStoragePath(null);
    setExtracted([]);
    setPdfMeta(emptyMeta());
    setEditReportId(null);
    setFormMeta(emptyMeta());
    setFormRows([emptyRow()]);
    setRowSearch({});
  };

  const openManual = async () => {
    await ensureBiomarkers();
    setEditReportId(null);
    setFormMeta(emptyMeta());
    setFormRows([emptyRow()]);
    setRowSearch({});
    setMode('manual');
  };

  const openEdit = async (report: LabReport) => {
    await ensureBiomarkers();
    setEditReportId(report.id);
    setFormMeta({
      title: report.title,
      test_date: report.test_date ?? '',
      lab_address: report.lab_address ?? '',
      lab_email: report.lab_email ?? '',
      lab_phone: report.lab_phone ?? '',
    });
    const rows: FormRow[] = report.lab_results.map((r) => ({
      rowId: newRowId(),
      biomarker_id: r.biomarker_definition_id ?? '',
      biomarker_name: r.biomarkers ? locName(r.biomarkers.name, lang) : '—',
      canonical_unit: r.biomarkers?.unit ?? '',
      alt_units: [],
      value: r.value_numeric != null ? String(r.value_numeric) : '',
      unit: r.unit ?? r.biomarkers?.unit ?? '',
    }));
    setFormRows(rows.length > 0 ? rows : [emptyRow()]);
    setRowSearch({});
    setMode('edit');
  };

  // ── Delete report ─────────────────────────────────────────────────────────────

  const DELETE_CONFIRM: Record<string, string> = {
    de: 'Bist du sicher? Dieser Bericht und alle zugehörigen Werte werden unwiderruflich gelöscht. Dies kann nicht rückgängig gemacht werden.',
    en: 'Are you sure? This report and all associated values will be permanently deleted. This cannot be undone.',
    fr: 'Êtes-vous sûr ? Ce rapport et toutes les valeurs associées seront définitivement supprimés.',
    es: '¿Estás seguro? Este informe y todos los valores asociados se eliminarán permanentemente.',
    it: 'Sei sicuro? Questo rapporto e tutti i valori associati verranno eliminati definitivamente.',
  };

  const handleDelete = async (report: LabReport) => {
    if (!confirm(DELETE_CONFIRM[lang] ?? DELETE_CONFIRM.en)) return;
    const res = await fetch('/api/lab-results/delete-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId: report.id }),
    });
    if (res.ok) loadData();
  };

  // ── PDF upload + extract ──────────────────────────────────────────────────────

  const handlePdfFile = (f: File) => {
    if (f.size > 10 * 1024 * 1024) { alert('File too large (max 10MB)'); return; }
    setPdfFile(f);
  };

  const handleExtract = async () => {
    if (!pdfFile) return;
    setPdfUploading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert('Not authenticated'); setPdfUploading(false); return; }

    const storagePath = `${user.id}/${Date.now()}-${pdfFile.name}`;
    const { error: uploadError } = await supabase.storage
      .from('lab-pdfs')
      .upload(storagePath, pdfFile, { upsert: false });

    if (uploadError) { alert('Upload failed: ' + uploadError.message); setPdfUploading(false); return; }

    setPdfStoragePath(storagePath);
    setPdfUploading(false);
    setPdfExtracting(true);

    const res = await fetch('/api/lab-results/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storagePath }),
    });
    const data = await res.json();
    setPdfExtracting(false);

    if (!data.success) {
      alert(data.error ?? 'Extraction failed');
      await supabase.storage.from('lab-pdfs').remove([storagePath]);
      setPdfStoragePath(null);
      return;
    }

    setExtracted(
      (data.extracted ?? []).map((r: any) => ({ ...r, include: r.matched_id != null }))
    );
    setPdfMeta({
      title:       data.metadata?.lab_name ?? pdfFile.name.replace(/\.[^.]+$/, ''),
      test_date:   data.metadata?.test_date ?? '',
      lab_address: data.metadata?.lab_address ?? '',
      lab_email:   data.metadata?.lab_email ?? '',
      lab_phone:   data.metadata?.lab_phone ?? '',
    });
    setMode('pdf-review');
  };

  // ── Save PDF report ───────────────────────────────────────────────────────────

  const handleSavePdf = async () => {
    const toSave = extracted.filter((r) => r.include && r.matched_id);
    if (!toSave.length) { alert('No matched results to save'); return; }
    if (!pdfMeta.title.trim()) { alert('Report title is required'); return; }
    if (!pdfMeta.test_date) { alert('Test date is required'); return; }
    setSaving(true);

    const res = await fetch('/api/lab-results/save-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:       pdfMeta.title.trim(),
        test_date:   pdfMeta.test_date,
        source:      'pdf_upload',
        lab_address: pdfMeta.lab_address || null,
        lab_email:   pdfMeta.lab_email   || null,
        lab_phone:   pdfMeta.lab_phone   || null,
        storagePath: pdfStoragePath,
        results:     toSave.map((r) => ({ biomarker_id: r.matched_id, value: r.value, unit: r.unit })),
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!data.success) { alert(data.error ?? 'Save failed'); return; }
    const msg = SAVE_CONFIRM[lang] ?? SAVE_CONFIRM.en;
    backToList();
    loadData();
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 5000);
  };

  // ── Save manual / edit report ──────────────────────────────────────────────

  const handleSaveForm = async () => {
    const validRows = formRows.filter((r) => r.biomarker_id && r.value);
    if (!validRows.length) { alert('Add at least one result'); return; }
    if (!formMeta.title.trim()) { alert('Title is required'); return; }
    if (!formMeta.test_date) { alert('Test date is required'); return; }
    setSaving(true);

    const payload = {
      title:       formMeta.title.trim(),
      test_date:   formMeta.test_date,
      lab_address: formMeta.lab_address || null,
      lab_email:   formMeta.lab_email   || null,
      lab_phone:   formMeta.lab_phone   || null,
      results:     validRows.map((r) => ({
        biomarker_id: r.biomarker_id,
        value:        parseFloat(r.value),
        unit:         r.unit || r.canonical_unit,
      })),
    };

    const url = editReportId ? '/api/lab-results/update-report' : '/api/lab-results/save-report';
    const body = editReportId
      ? { ...payload, reportId: editReportId }
      : { ...payload, source: 'manual_entry' };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);

    if (!data.success) { alert(data.error ?? 'Save failed'); return; }
    backToList();
    loadData();
  };

  // ── Form row helpers ──────────────────────────────────────────────────────────

  const updateRow = (rowId: string, updates: Partial<FormRow>) =>
    setFormRows((rows) => rows.map((r) => r.rowId === rowId ? { ...r, ...updates } : r));

  const removeRow = (rowId: string) =>
    setFormRows((rows) => rows.filter((r) => r.rowId !== rowId));

  const selectBiomarker = async (rowId: string, bm: BiomarkerOption) => {
    const { data: convs } = await supabase
      .from('biomarker_unit_conversions')
      .select('alt_unit')
      .eq('biomarker_id', bm.id);
    updateRow(rowId, {
      biomarker_id:   bm.id,
      biomarker_name: locName(bm.name, lang),
      canonical_unit: bm.unit ?? '',
      alt_units:      (convs ?? []).map((c: any) => c.alt_unit),
      unit:           bm.unit ?? '',
    });
    setRowSearch((s) => ({ ...s, [rowId]: '' }));
    setOpenDropdown(null);
  };

  const filteredFor = (rowId: string) => {
    const q = (rowSearch[rowId] ?? '').toLowerCase();
    if (!q) return [];
    return allBiomarkers.filter((bm) => {
      const names = bm.name
        ? Object.values(bm.name as Record<string, string>).join(' ').toLowerCase()
        : '';
      return names.includes(q) || bm.slug.includes(q);
    }).slice(0, 8);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Renders
  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  // ── Choose ────────────────────────────────────────────────────────────────────

  if (mode === 'choose') return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#0e393d]">Add Lab Results</h2>
        <button onClick={backToList} className="text-sm text-[#1c2a2b]/40 hover:text-[#1c2a2b]">← Back</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => setMode('pdf')}
          className="flex flex-col items-center gap-3 rounded-2xl border-2 border-[#0e393d]/15 bg-white p-8 hover:border-[#0e393d]/40 hover:bg-[#0e393d]/3 transition text-center"
        >
          <div className="text-4xl">📄</div>
          <div>
            <p className="font-semibold text-[#0e393d] mb-1">Upload PDF</p>
            <p className="text-xs text-[#1c2a2b]/50">AI extracts your values automatically</p>
          </div>
        </button>
        <button
          onClick={openManual}
          className="flex flex-col items-center gap-3 rounded-2xl border-2 border-[#0e393d]/15 bg-white p-8 hover:border-[#0e393d]/40 hover:bg-[#0e393d]/3 transition text-center"
        >
          <div className="text-4xl">✏️</div>
          <div>
            <p className="font-semibold text-[#0e393d] mb-1">Enter Manually</p>
            <p className="text-xs text-[#1c2a2b]/50">Type in values from your lab report</p>
          </div>
        </button>
      </div>
    </div>
  );

  // ── PDF upload ────────────────────────────────────────────────────────────────

  if (mode === 'pdf') return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#0e393d]">Upload Lab PDF</h2>
        <button onClick={() => setMode('choose')} className="text-sm text-[#1c2a2b]/40 hover:text-[#1c2a2b]">← Back</button>
      </div>

      {(pdfUploading || pdfExtracting) ? (
        <div className="space-y-2 py-4">
          <div className="h-2 rounded-full bg-[#0e393d]/8 overflow-hidden">
            <div className="h-full rounded-full bg-[#0e393d] animate-pulse" style={{ width: '75%' }} />
          </div>
          <p className="text-xs text-[#1c2a2b]/50 text-center">
            {pdfUploading ? 'Uploading…' : 'Extracting with AI… (20–30 s)'}
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3 rounded-xl bg-[#0e393d]/4 border border-[#0e393d]/10 px-4 py-3">
            <span className="text-base mt-0.5">🔒</span>
            <p className="text-xs text-[#1c2a2b]/60 leading-relaxed">
              {PRIVACY_NOTICE[lang] ?? PRIVACY_NOTICE.en}
            </p>
          </div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handlePdfFile(f); }}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition ${
              dragging ? 'border-[#0e393d] bg-[#0e393d]/5' : 'border-[#0e393d]/20 hover:border-[#0e393d]/40'
            }`}
          >
            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePdfFile(f); }} />
            <div className="text-4xl mb-3">📄</div>
            {pdfFile ? (
              <>
                <p className="font-medium text-[#0e393d]">{pdfFile.name}</p>
                <p className="text-xs text-[#1c2a2b]/40 mt-1">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB · Click to change</p>
              </>
            ) : (
              <>
                <p className="font-medium text-[#0e393d]">Drop your lab PDF here</p>
                <p className="text-xs text-[#1c2a2b]/40 mt-1">PDF, JPG, PNG · Max 10 MB</p>
              </>
            )}
          </div>
          {pdfFile && (
            <button onClick={handleExtract}
              className="w-full rounded-xl bg-[#0e393d] text-white py-3 font-medium text-sm hover:bg-[#0e393d]/85 transition">
              Extract with AI
            </button>
          )}
        </>
      )}
    </div>
  );

  // ── PDF review ────────────────────────────────────────────────────────────────

  if (mode === 'pdf-review') {
    const includedCount = extracted.filter((r) => r.include && r.matched_id).length;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#0e393d]">Review & Save</h2>
          <button onClick={backToList} className="text-sm text-[#1c2a2b]/40 hover:text-[#1c2a2b]">← Cancel</button>
        </div>

        <MetaFields meta={pdfMeta} onChange={(u) => setPdfMeta((m) => ({ ...m, ...u }))} />

        <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-[#0e393d]/8">
            <span className="text-xs text-[#0e393d]/60">
              {extracted.length} extracted · {extracted.filter((r) => r.matched_id).length} matched
            </span>
            <div className="flex gap-3 text-xs">
              <button
                onClick={() => setExtracted((rows) => rows.map((r) => ({ ...r, include: r.matched_id != null })))}
                className="text-[#0e393d] hover:underline"
              >
                Select matched
              </button>
              <button
                onClick={() => setExtracted((rows) => rows.map((r) => ({ ...r, include: false })))}
                className="text-[#1c2a2b]/40 hover:underline"
              >
                Deselect all
              </button>
            </div>
          </div>
          <div className="divide-y divide-[#0e393d]/6">
            {extracted.map((row, idx) => (
              <div key={idx} className={`px-4 py-2.5 flex items-center gap-3 ${row.include ? '' : 'opacity-40'}`}>
                <input
                  type="checkbox"
                  checked={row.include}
                  disabled={!row.matched_id}
                  onChange={() => setExtracted((rows) => rows.map((r, i) => i === idx ? { ...r, include: !r.include } : r))}
                  className="rounded border-[#0e393d]/30 accent-[#0e393d] shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#1c2a2b] font-medium truncate">
                    {row.matched_name ?? row.extracted_name}
                  </p>
                  {!row.matched_id && (
                    <p className="text-[10px] text-red-400">Not matched — "{row.extracted_name}"</p>
                  )}
                </div>
                <div className="text-sm tabular-nums text-[#0e393d] font-semibold shrink-0">
                  {row.value}
                  {row.was_converted
                    ? <span className="ml-1 text-xs font-normal text-[#1c2a2b]/40">{row.original_unit} → {row.unit}</span>
                    : <span className="ml-1 text-xs font-normal text-[#1c2a2b]/50">{row.unit}</span>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={handleSavePdf} disabled={saving || includedCount === 0}
            className="flex items-center gap-2 rounded-xl bg-[#0e393d] text-white px-6 py-2.5 font-medium text-sm hover:bg-[#0e393d]/85 transition disabled:opacity-50">
            {saving && <Spinner />}
            {saving ? 'Saving…' : `Save ${includedCount} Results`}
          </button>
          <button onClick={backToList}
            className="rounded-xl border border-[#0e393d]/15 text-[#1c2a2b]/60 px-6 py-2.5 font-medium text-sm hover:text-[#1c2a2b] transition">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Manual / Edit form ────────────────────────────────────────────────────────

  if (mode === 'manual' || mode === 'edit') {
    const isEdit = mode === 'edit';
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#0e393d]">
            {isEdit ? 'Edit Lab Report' : 'New Lab Report'}
          </h2>
          <button onClick={backToList} className="text-sm text-[#1c2a2b]/40 hover:text-[#1c2a2b]">← Cancel</button>
        </div>

        <MetaFields meta={formMeta} onChange={(u) => setFormMeta((m) => ({ ...m, ...u }))} />

        {/* Result rows */}
        <div className="space-y-2">
          {formRows.map((row) => {
            const options = filteredFor(row.rowId);
            const showDropdown = openDropdown === row.rowId && options.length > 0;
            return (
              <div key={row.rowId} className="rounded-xl border border-[#0e393d]/10 bg-white p-3 flex gap-2 items-start">
                {/* Biomarker search */}
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={row.biomarker_id ? row.biomarker_name : (rowSearch[row.rowId] ?? '')}
                    onChange={(e) => {
                      if (row.biomarker_id) {
                        updateRow(row.rowId, { biomarker_id: '', biomarker_name: '', canonical_unit: '', alt_units: [], unit: '' });
                      }
                      setRowSearch((s) => ({ ...s, [row.rowId]: e.target.value }));
                      setOpenDropdown(row.rowId);
                    }}
                    onFocus={() => { if (!row.biomarker_id) setOpenDropdown(row.rowId); }}
                    onBlur={() => setTimeout(() => setOpenDropdown(null), 150)}
                    placeholder="Search biomarker…"
                    className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10"
                  />
                  {showDropdown && (
                    <div className="absolute top-full mt-1 w-full rounded-lg border border-[#0e393d]/15 bg-white shadow-lg z-20 overflow-hidden">
                      {options.map((bm) => (
                        <button
                          key={bm.id}
                          onMouseDown={(e) => { e.preventDefault(); selectBiomarker(row.rowId, bm); }}
                          className="w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-[#0e393d]/5 transition"
                        >
                          <span className="text-[#1c2a2b]">{locName(bm.name, lang)}</span>
                          <span className="text-xs text-[#1c2a2b]/40 ml-2 shrink-0">{bm.unit}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Value */}
                <input
                  type="number"
                  value={row.value}
                  onChange={(e) => updateRow(row.rowId, { value: e.target.value })}
                  placeholder="Value"
                  className="w-24 rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10"
                />
                {/* Unit — only show once a biomarker is selected */}
                {row.biomarker_id && (
                  row.alt_units.length > 0 ? (
                    <select
                      value={row.unit}
                      onChange={(e) => updateRow(row.rowId, { unit: e.target.value })}
                      className="w-28 rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10"
                    >
                      <option value={row.canonical_unit}>{row.canonical_unit}</option>
                      {row.alt_units.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={row.unit}
                      readOnly
                      className="w-20 rounded-lg border border-[#0e393d]/10 bg-[#0e393d]/3 px-3 py-2 text-sm text-[#1c2a2b]/60 cursor-default"
                    />
                  )
                )}
                {/* Unit conversion notice */}
                {row.unit && row.canonical_unit && row.unit !== row.canonical_unit && (
                  <span className="text-[11px] text-amber-700 bg-amber-50 rounded px-2 py-2 whitespace-nowrap shrink-0">
                    → {row.canonical_unit}
                  </span>
                )}
                {/* Remove row */}
                {formRows.length > 1 && (
                  <button onClick={() => removeRow(row.rowId)}
                    className="p-2 text-[#1c2a2b]/25 hover:text-red-500 transition mt-0.5 shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={() => setFormRows((rows) => [...rows, emptyRow()])}
          className="w-full rounded-xl border-2 border-dashed border-[#0e393d]/15 py-2.5 text-sm text-[#0e393d]/50 hover:border-[#0e393d]/30 hover:text-[#0e393d]/70 transition"
        >
          + Add Another Biomarker
        </button>

        <div className="flex gap-3">
          <button onClick={handleSaveForm} disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-[#0e393d] text-white px-6 py-2.5 font-medium text-sm hover:bg-[#0e393d]/85 transition disabled:opacity-50">
            {saving && <Spinner />}
            {saving ? 'Saving…' : isEdit ? 'Update Report' : 'Save Report'}
          </button>
          <button onClick={backToList}
            className="rounded-xl border border-[#0e393d]/15 text-[#1c2a2b]/60 px-6 py-2.5 font-medium text-sm hover:text-[#1c2a2b] transition">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── List ──────────────────────────────────────────────────────────────────────

  const pendingReports = reports.filter((r) => r.status && PENDING_STATUSES.has(r.status));
  const confirmedReports = reports.filter((r) => !r.status || !PENDING_STATUSES.has(r.status));
  const isEmpty = reports.length === 0 && orphanResults.length === 0;
  const pt = (key: string) => PENDING_T[key]?.[lang] ?? PENDING_T[key]?.en ?? key;

  return (
    <div className="space-y-4">
      {successToast && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
          {successToast}
        </div>
      )}
      <div className="flex items-center justify-between">
        <span />
        <button
          onClick={() => setMode('choose')}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#0e393d] text-white px-4 py-2 text-xs font-medium hover:bg-[#0e393d]/85 transition"
        >
          + Add Lab Results
        </button>
      </div>

      {isEmpty && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🧬</div>
          <p className="font-medium text-[#0e393d] mb-2">No lab results yet</p>
          <p className="text-sm text-[#1c2a2b]/50">Upload a lab PDF or enter values manually</p>
        </div>
      )}

      {/* ── Pending reports ─────────────────────────────────────────────── */}
      {pendingReports.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ceab84]">
            {pt('inProgressTitle')}
          </p>
          {pendingReports.map((report) => {
            const step = PENDING_STEP[report.status!] ?? 1;
            const totalSteps = 4;
            const statusLabel = PENDING_STATUS_LABEL[report.status!]?.[lang] ?? report.status ?? '';
            const colorCls = PENDING_STATUS_COLOR[report.status!] ?? 'bg-gray-100 text-gray-600';
            const biomarkerCount = report.lab_results?.length ?? 0;
            const previewResults = report.lab_results?.slice(0, 5) ?? [];

            return (
              <div key={report.id} className="rounded-xl border border-[#0e393d]/10 bg-white p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-mono text-[11px] text-[#1c2a2b]/35">{displayReportId(report)}</span>
                    {report.title && (
                      <h3 className="font-serif text-base text-[#0e393d] mt-0.5 leading-tight">{report.title}</h3>
                    )}
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium shrink-0 ${colorCls}`}>
                    {statusLabel}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-[#1c2a2b]/40">
                    <span>{pt('step')} {step} / {totalSteps}</span>
                    <span>{biomarkerCount} {pt('biomarkersPending')}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#0e393d]/8 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#ceab84] transition-all"
                      style={{ width: `${(step / totalSteps) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Voucher code */}
                {report.voucher_code && (
                  <div className="flex items-center gap-2 rounded-lg bg-[#0e393d]/4 border border-[#0e393d]/8 px-3 py-2">
                    <span className="text-xs text-[#1c2a2b]/50">{pt('voucherCode')}:</span>
                    <span className="font-mono text-sm font-semibold text-[#0e393d] tracking-wide">{report.voucher_code}</span>
                  </div>
                )}

                {/* Greyed-out biomarker list */}
                {previewResults.length > 0 && (
                  <div className="divide-y divide-[#0e393d]/5">
                    {previewResults.map((r) => (
                      <div key={r.id} className="py-1.5 flex items-center justify-between">
                        <span className="text-xs text-[#1c2a2b]/30">
                          {r.biomarkers ? locName(r.biomarkers.name, lang) : '—'}
                        </span>
                        <span className="text-xs text-[#1c2a2b]/20 tabular-nums">— {pt('pending')}</span>
                      </div>
                    ))}
                    {biomarkerCount > 5 && (
                      <div className="py-1.5 text-xs text-[#1c2a2b]/20 italic">
                        + {biomarkerCount - 5} {pt('more')}
                      </div>
                    )}
                  </div>
                )}

                {/* Visit lab hint */}
                {report.status === 'awaiting_sample' && (
                  <p className="text-xs text-[#ceab84] font-medium">{pt('visitAnyLab')}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Confirmed reports ────────────────────────────────────────────── */}
      {confirmedReports.map((report) => {
        const isExpanded = expandedId === report.id;
        const isEditable = report.source !== 'admin_import';
        return (
          <div key={report.id} className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden">
            <button
              onClick={() => setExpandedId(isExpanded ? null : report.id)}
              className="w-full text-left px-5 py-4 hover:bg-[#fafaf8] transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-[#0e393d] text-sm">{report.title}</span>
                    {report.report_number && (
                      <span className="font-mono text-[11px] text-[#1c2a2b]/40">{report.report_number}</span>
                    )}
                    <SourceBadge source={report.source} />
                    {!isEditable && (
                      <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-400">
                        Read-only
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#1c2a2b]/40">
                    {fmtDate(report.test_date ?? report.created_at)} · {report.lab_results.length} biomarkers
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {isEditable && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(report); }}
                        className="text-xs text-[#ceab84] hover:text-[#b8965e] font-medium transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(report); }}
                        className="text-xs text-red-400 hover:text-red-600 font-medium transition"
                      >
                        Delete
                      </button>
                    </>
                  )}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
                    className={`text-[#1c2a2b]/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-[#0e393d]/8">
                {report.lab_results.length > 0
                  ? <ResultsDisplay results={report.lab_results} lang={lang} />
                  : <p className="px-5 py-4 text-sm text-[#1c2a2b]/40 text-center">No results in this report.</p>
                }
              </div>
            )}
          </div>
        );
      })}

      {/* Orphan results from before the reports system */}
      {orphanResults.length > 0 && (
        <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden">
          <button
            onClick={() => setExpandedId(expandedId === '__orphans__' ? null : '__orphans__')}
            className="w-full text-left px-5 py-4 hover:bg-[#fafaf8] transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-[#0e393d]/70 text-sm">Previous Results</span>
                <p className="text-xs text-[#1c2a2b]/40 mt-0.5">{orphanResults.length} biomarkers · Read-only</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
                className={`text-[#1c2a2b]/30 transition-transform ${expandedId === '__orphans__' ? 'rotate-180' : ''}`}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </button>
          {expandedId === '__orphans__' && (
            <div className="border-t border-[#0e393d]/8">
              <ResultsDisplay results={orphanResults} lang={lang} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
