'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Badge, FlagBadge, SectionHeading, Spinner, Toast, ToastContainer,
  SOURCE_ICON, SOURCE_LABEL,
  fmtDate, locName, nextToastId,
} from './shared';
import { computeStatusFlag } from '@/lib/lab-results/flagging';

// ─── Types ────────────────────────────────────────────────────────────────────

type Confidence = 'exact' | 'alias' | 'fuzzy' | 'unmatched';

type LabMetadata = {
  title: string;
  test_date: string;
  lab_address: string;
  lab_email: string;
  lab_phone: string;
};

type ExtractedRow = {
  extracted_name: string;
  value: number;
  unit: string;
  original_value: number | null;
  original_unit: string | null;
  was_converted: boolean;
  ref_low: number | null;
  ref_high: number | null;
  flagged: boolean;
  test_date: string | null;
  matched_id: string | null;
  matched_name: string | null;
  confidence: Confidence;
  include: boolean;
  db_biomarker: any | null;
};

type LabSource = 'evida_life' | 'partner_lab' | 'external_upload';

type LabOption = {
  id: string;
  name: string;
  lab_type: string | null;
  lab_code: string | null;
  parent_lab_id: string | null;
  city: string | null;
  postal_code: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  test_categories: string[] | null;
};

type PendingReport = {
  id: string;
  status: string;
  product_type: string | null;
  order_item_id: string | null;
  lab_id: string | null;
};

type OrderLookupResult = {
  id: string;
  order_number: string | null;
  created_at: string;
  profile: { id: string; first_name: string | null; last_name: string | null; email: string | null } | null;
  pendingReports: PendingReport[];
};

type UploadRecord = {
  id: string;
  user_id: string | null;
  file_name: string;
  file_url: string;
  extraction_status: string;
  results_created: number;
  created_at: string;
  extracted_data: ExtractedRow[] | null;
  draft_values: ExtractedRow[] | null;
  draft_metadata: any | null;
  lab_report_id: string | null;
  uploader: { first_name: string | null; last_name: string | null } | null;
  patient: { first_name: string | null; last_name: string | null; email: string | null } | null;
};

type AllBiomarker = { id: string; name: any; unit: string | null; he_domain: string | null; source: string | null; ref_range_low: number | null; ref_range_high: number | null };

// ─── Lab source options ───────────────────────────────────────────────────────

const LAB_SOURCE_OPTIONS: { value: LabSource; label: string }[] = [
  { value: 'evida_life',      label: '🌿 Evida Life' },
  { value: 'partner_lab',     label: '🔬 Partner Lab' },
  { value: 'external_upload', label: '📁 External' },
];

// ─── Unit-aware ref range selection ──────────────────────────────────────────
// Picks the correct ref range for flag comparison based on unit context:
// - If conversion was applied: value is in DB unit → use DB ranges
// - If not converted and units match: use DB ranges
// - If not converted and units differ: use PDF's own ref range
// This prevents false Out-of-Range flags for e.g. Harnsäure 310 mcmol/l vs DB range in mg/dL

function normUnit(u: string): string {
  return (u || '').toLowerCase().replace(/\s/g, '').replace(/[μµ]/g, 'u');
}

function effectiveRefRange(row: ExtractedRow): { low: number | null; high: number | null; useDbOptimal: boolean } {
  const dbBm = row.db_biomarker;
  if (!dbBm) return { low: row.ref_low, high: row.ref_high, useDbOptimal: false };
  if (row.was_converted) {
    return { low: dbBm.ref_range_low ?? null, high: dbBm.ref_range_high ?? null, useDbOptimal: true };
  }
  const pdfUnit = normUnit(row.unit);
  const dbUnit  = normUnit(dbBm.unit ?? '');
  if (!dbUnit || pdfUnit === dbUnit) {
    return { low: dbBm.ref_range_low ?? null, high: dbBm.ref_range_high ?? null, useDbOptimal: true };
  }
  // Units differ, no conversion → fall back to PDF's ref range; optimal ranges are in DB unit so skip them
  return { low: row.ref_low, high: row.ref_high, useDbOptimal: false };
}

// ─── Implausible value check ──────────────────────────────────────────────────

function isImplausibleRow(row: ExtractedRow): boolean {
  if (!row.db_biomarker) return false;
  const { low: refLow, high: refHigh } = effectiveRefRange(row);
  if (refHigh != null && row.value > refHigh * 10) return true;
  if (refLow  != null && refLow > 0 && row.value < refLow / 10) return true;
  return false;
}

// ─── Duplicate detection ──────────────────────────────────────────────────────

// Returns matched_id → [indices] for all biomarkers appearing 2+ times
function getDuplicateMap(rows: ExtractedRow[]): Map<string, number[]> {
  const map = new Map<string, number[]>();
  rows.forEach((row, idx) => {
    if (!row.matched_id) return;
    if (!map.has(row.matched_id)) map.set(row.matched_id, []);
    map.get(row.matched_id)!.push(idx);
  });
  for (const [key, indices] of map) {
    if (indices.length < 2) map.delete(key);
  }
  return map;
}

// Auto-deselect the converted duplicate; keep the canonical-unit row
function autoDeselectDuplicates(rows: ExtractedRow[]): ExtractedRow[] {
  const dupMap = getDuplicateMap(rows);
  if (dupMap.size === 0) return rows;
  const result = [...rows];
  for (const indices of dupMap.values()) {
    const keepIdx = indices.find((i) => !rows[i].was_converted) ?? indices[0];
    for (const i of indices) {
      if (i !== keepIdx) result[i] = { ...result[i], include: false };
    }
  }
  return result;
}

// ─── Report language detection ────────────────────────────────────────────────

function detectReportLanguage(extractedNames: string[]): string {
  const scores: Record<string, number> = { de: 0, en: 0, fr: 0, it: 0, es: 0 };

  for (const name of extractedNames) {
    const l = name.toLowerCase();
    if (['hämoglobin', 'hämatokrit', 'leukozyten', 'kalium', 'natrium', 'harnsäure', 'kreatinin', 'cholesterin', 'glukose', 'blut', 'thyreo', 'eisen'].some((w) => l.includes(w))) scores.de += 2;
    if (['hémoglobine', 'leucocytes', 'potassium', 'cholestérol', 'glycémie', 'créatinine', 'sodium', 'globule'].some((w) => l.includes(w))) scores.fr += 2;
    if (['emoglobina', 'leucociti', 'potassio', 'colesterolo', 'creatinina', 'glicemia', 'ematocrito', 'sodio'].some((w) => l.includes(w))) scores.it += 2;
    if (['hemoglobina', 'leucocitos', 'potasio', 'colesterol', 'creatinina', 'glucosa', 'sodio'].some((w) => l.includes(w))) scores.es += 2;
    if (['hemoglobin', 'white blood', 'potassium', 'cholesterol', 'glucose', 'creatinine', 'hematocrit', 'sodium', 'thyroid'].some((w) => l.includes(w))) scores.en += 1;
  }

  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'en';
}

// ─── Confidence badge ─────────────────────────────────────────────────────────

function ConfidenceBadge({ c }: { c: Confidence }) {
  const dot = c === 'exact' ? '🟢' : c === 'alias' ? '🟡' : c === 'fuzzy' ? '🟠' : '🔴';
  const label = c === 'exact' ? 'exact' : c === 'alias' ? 'alias' : c === 'fuzzy' ? 'fuzzy' : 'no match';
  const cls = c === 'exact'
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
    : c === 'alias'
    ? 'bg-[#CEAB84]/15 text-[#8a6a30] ring-[#CEAB84]/30'
    : c === 'fuzzy'
    ? 'bg-amber-50 text-amber-700 ring-amber-600/20'
    : 'bg-red-50 text-red-700 ring-red-600/20';
  return <Badge className={cls}>{dot} {label}</Badge>;
}

// ─── Source badge ─────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: string | null | undefined }) {
  if (!source) return <span className="text-[#1c2a2b]/25">—</span>;
  const icon = SOURCE_ICON[source] ?? '❓';
  return (
    <span title={source} className="text-base leading-none">{icon}</span>
  );
}

// ─── Lab label formatter ──────────────────────────────────────────────────────

function labLabel(lab: LabOption): string {
  const code = lab.lab_code ? ` (${lab.lab_code})` : '';
  const addrParts = [
    lab.address,
    [lab.postal_code, lab.city].filter(Boolean).join(' '),
  ].filter(Boolean);
  const location = addrParts.join(', ');
  return `${lab.name}${code}${location ? ` — ${location}` : ''}`;
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

type UserOption = { id: string; email: string | null; first_name: string | null; last_name: string | null };

export default function PdfUploadTab({ onSwitchToManual }: { onSwitchToManual?: () => void }) {
  const supabase = createClient();

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [extracting, setExtracting] = useState(false);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedRow[]>([]);
  const [allBiomarkers, setAllBiomarkers] = useState<AllBiomarker[]>([]);
  const [saving, setSaving] = useState(false);
  const [labMetadata, setLabMetadata] = useState<LabMetadata>({ title: '', test_date: '', lab_address: '', lab_email: '', lab_phone: '' });
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [loadingUploads, setLoadingUploads] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dragging, setDragging] = useState(false);
  // For re-analyze: track the user_id already stored on the upload record
  const [reanalyzingUserId, setReanalyzingUserId] = useState<string | null>(null);
  // New: lab report ID (from AI extraction draft), lab source, PDF signed URL
  const [labReportId, setLabReportId] = useState<string | null>(null);
  const [reportNumber, setReportNumber] = useState<string | null>(null);
  const [labSource, setLabSource] = useState<LabSource>('partner_lab');
  const [labs, setLabs] = useState<LabOption[]>([]);
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const [pdfSignedUrl, setPdfSignedUrl] = useState<string | null>(null);
  const [uploadSortCol, setUploadSortCol] = useState<'file_name' | 'created_at' | 'extraction_status' | 'results_created'>('created_at');
  const [uploadSortDir, setUploadSortDir] = useState<'asc' | 'desc'>('desc');

  // User assignment
  const [userSearch, setUserSearch] = useState('');
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const userSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Order lookup
  const [orderSearch, setOrderSearch] = useState('');
  const [orderResults, setOrderResults] = useState<OrderLookupResult[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderLookupResult | null>(null);
  const [searchingOrders, setSearchingOrders] = useState(false);
  const orderSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [openBmIdx, setOpenBmIdx] = useState<number | null>(null);
  const [bmSearchText, setBmSearchText] = useState('');

  // Report type selector (Feature 1) — null = All
  const [reportType, setReportType] = useState<string | null>(null);
  const [availableSources, setAvailableSources] = useState<string[]>([]);

  // Manual add rows in review screen (Feature 3)
  const [addingManualRow, setAddingManualRow] = useState(false);
  const [manualBmSearch, setManualBmSearch] = useState('');
  const [manualBmDropdownOpen, setManualBmDropdownOpen] = useState(false);
  const [manualBm, setManualBm] = useState<AllBiomarker | null>(null);
  const [manualValue, setManualValue] = useState('');
  const [manualUnit, setManualUnit] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Duplicate map for current extracted rows (matched_id → indices with 2+ rows)
  const dupMap = useMemo(() => getDuplicateMap(extracted), [extracted]);

  const handleUploadSort = (col: typeof uploadSortCol) => {
    if (uploadSortCol === col) setUploadSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setUploadSortCol(col); setUploadSortDir('asc'); }
  };

  const sortedUploads = useMemo(() => [...uploads].sort((a, b) => {
    let cmp = 0;
    if (uploadSortCol === 'file_name') cmp = a.file_name.localeCompare(b.file_name);
    else if (uploadSortCol === 'extraction_status') cmp = a.extraction_status.localeCompare(b.extraction_status);
    else if (uploadSortCol === 'results_created') cmp = (a.results_created ?? 0) - (b.results_created ?? 0);
    else cmp = a.created_at.localeCompare(b.created_at);
    return uploadSortDir === 'asc' ? cmp : -cmp;
  }), [uploads, uploadSortCol, uploadSortDir]);

  const addToast = useCallback((msg: string, type: Toast['type'] = 'success') => {
    const id = nextToastId();
    setToasts((p) => [...p, { id, message: msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 5000);
  }, []);

  // Load upload history
  const loadUploads = useCallback(async () => {
    setLoadingUploads(true);
    const { data } = await supabase
      .from('lab_pdf_uploads')
      .select('id, user_id, file_name, file_url, extraction_status, results_created, created_at, extracted_data, draft_values, draft_metadata, lab_report_id, uploader:profiles!uploaded_by(first_name, last_name), patient:profiles!user_id(first_name, last_name, email)')
      .order('created_at', { ascending: false })
      .limit(20);
    setUploads((data as unknown as UploadRecord[]) ?? []);
    setLoadingUploads(false);
  }, [supabase]);

  // Load all biomarker definitions and labs on mount
  useEffect(() => {
    loadUploads();
    supabase.from('biomarkers').select('id, name, unit, he_domain, source, ref_range_low, ref_range_high').eq('is_active', true)
      .then(({ data }) => {
        const bms = (data as AllBiomarker[]) ?? [];
        setAllBiomarkers(bms);
        const unique = [...new Set(bms.map((b) => b.source).filter(Boolean) as string[])].sort();
        setAvailableSources(unique);
      });
    supabase.from('lab_partners').select('id, name, lab_type, lab_code, parent_lab_id, city, postal_code, address, phone, email, test_categories')
      .eq('is_active', true).order('name')
      .then(({ data }) => setLabs((data as LabOption[]) ?? []));
  }, []);

  // ── User search ──────────────────────────────────────────────────────────────

  const searchUsers = (q: string) => {
    setUserSearch(q);
    if (userSearchTimer.current) clearTimeout(userSearchTimer.current);
    if (!q.trim()) { setUserOptions([]); return; }
    userSearchTimer.current = setTimeout(async () => {
      setSearchingUsers(true);
      const { data } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .or(`email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
        .limit(8);
      setUserOptions((data as UserOption[]) ?? []);
      setSearchingUsers(false);
    }, 300);
  };

  // ── Order lookup ─────────────────────────────────────────────────────────────

  const searchOrders = (q: string) => {
    setOrderSearch(q);
    if (orderSearchTimer.current) clearTimeout(orderSearchTimer.current);
    if (!q.trim()) { setOrderResults([]); return; }
    orderSearchTimer.current = setTimeout(async () => {
      setSearchingOrders(true);
      const orderMap = new Map<string, { id: string; order_number: string | null; created_at: string; user_id: string }>();

      // By order number
      const { data: byNum } = await supabase.from('orders')
        .select('id, order_number, created_at, user_id')
        .ilike('order_number', `%${q}%`).limit(5);
      (byNum ?? []).forEach((o) => orderMap.set(o.id, o));

      // By user email
      const { data: emailMatches } = await supabase.from('profiles')
        .select('id').ilike('email', `%${q}%`).limit(5);
      if (emailMatches?.length) {
        const { data: byUser } = await supabase.from('orders')
          .select('id, order_number, created_at, user_id')
          .in('user_id', emailMatches.map((p) => p.id)).limit(5);
        (byUser ?? []).forEach((o) => orderMap.set(o.id, o));
      }

      // By voucher code
      const { data: vouchers } = await supabase.from('order_vouchers')
        .select('order_id').ilike('code', `%${q}%`).limit(5);
      const vOrderIds = (vouchers ?? []).map((v) => v.order_id).filter(Boolean);
      if (vOrderIds.length) {
        const { data: byVoucher } = await supabase.from('orders')
          .select('id, order_number, created_at, user_id').in('id', vOrderIds).limit(5);
        (byVoucher ?? []).forEach((o) => orderMap.set(o.id, o));
      }

      if (orderMap.size === 0) { setOrderResults([]); setSearchingOrders(false); return; }

      const orderIds = [...orderMap.keys()];

      // Pending lab_reports for these orders
      const { data: reports } = await supabase.from('lab_reports')
        .select('id, order_id, status, product_type, order_item_id, lab_id')
        .in('order_id', orderIds)
        .not('status', 'in', '("confirmed","archived")');

      const reportsByOrder = new Map<string, PendingReport[]>();
      (reports ?? []).forEach((r) => {
        if (!r.order_id) return;
        if (!reportsByOrder.has(r.order_id)) reportsByOrder.set(r.order_id, []);
        reportsByOrder.get(r.order_id)!.push(r as PendingReport);
      });

      // Profiles
      const userIds = [...new Set([...orderMap.values()].map((o) => o.user_id).filter(Boolean))];
      const { data: profileData } = await supabase.from('profiles')
        .select('id, first_name, last_name, email').in('id', userIds);
      const profileById = new Map((profileData ?? []).map((p) => [p.id, p]));

      const results: OrderLookupResult[] = orderIds
        .filter((id) => (reportsByOrder.get(id) ?? []).length > 0)
        .map((id) => {
          const o = orderMap.get(id)!;
          return {
            id: o.id,
            order_number: o.order_number,
            created_at: o.created_at,
            profile: profileById.get(o.user_id) ?? null,
            pendingReports: reportsByOrder.get(id) ?? [],
          };
        });

      setOrderResults(results);
      setSearchingOrders(false);
    }, 350);
  };

  const handleSelectOrder = (order: OrderLookupResult) => {
    setSelectedOrder(order);
    setOrderResults([]);
    setOrderSearch('');
    // Auto-fill user
    if (order.profile) {
      setSelectedUser({
        id: order.profile.id,
        email: order.profile.email,
        first_name: order.profile.first_name,
        last_name: order.profile.last_name,
      });
    }
    // Auto-link report + lab if exactly one pending report
    if (order.pendingReports.length === 1) {
      const rpt = order.pendingReports[0];
      setLabReportId(rpt.id);
      if (rpt.lab_id) setSelectedLabId(rpt.lab_id);
    }
  };

  const handleClearOrder = () => {
    setSelectedOrder(null);
    setOrderSearch('');
    setOrderResults([]);
    setLabReportId(null);
  };

  // ── Upload flow ─────────────────────────────────────────────────────────────

  const handleFile = (f: File) => {
    if (f.size > 10 * 1024 * 1024) { addToast('File too large (max 10MB)', 'error'); return; }
    setFile(f);
    setExtracted([]);
    setUploadId(null);
    setReanalyzingUserId(null);
  };

  const handleUploadAndExtract = async () => {
    if (!file) return;
    if (!selectedUser) { addToast('Please assign this PDF to a user first', 'error'); return; }
    setUploading(true);
    setUploadProgress(20);

    // Get current admin user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { addToast('Not authenticated', 'error'); setUploading(false); return; }

    // Upload to storage — store path (not signed URL) so re-analyze always works
    const storagePath = `${user.id}/${Date.now()}-${file.name}`;
    const { error: storageError } = await supabase.storage
      .from('lab-pdfs')
      .upload(storagePath, file, { upsert: false });
    if (storageError) { addToast('Upload failed: ' + storageError.message, 'error'); setUploading(false); return; }

    setUploadProgress(50);

    // Create upload record — store the storage path in file_url
    const { data: uploadRecord } = await supabase.from('lab_pdf_uploads').insert({
      uploaded_by: user.id,
      user_id: selectedUser.id,
      file_name: file.name,
      file_url: storagePath,
      extraction_status: 'pending',
    }).select('id').single();

    if (!uploadRecord) { addToast('Failed to create upload record', 'error'); setUploading(false); return; }

    setUploadProgress(70);
    setUploading(false);
    setExtracting(true);
    setUploadId(uploadRecord.id);

    // Call AI extraction — pass storage path, lab source and selected lab
    const res = await fetch('/api/admin/parse-lab-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storagePath, uploadId: uploadRecord.id, labSource, labId: selectedLabId }),
    });
    const data = await res.json();
    setExtracting(false);

    if (!data.success) {
      addToast(data.error ?? 'Extraction failed', 'error');
      return;
    }

    // If a lab is selected, pre-fill lab contact details from the lab record
    const selectedLab = selectedLabId ? labs.find((l) => l.id === selectedLabId) : null;
    setExtracted(autoDeselectDuplicates(data.extracted ?? []));
    setLabMetadata({
      title:       data.metadata?.lab_name ?? file?.name.replace(/\.[^.]+$/, '') ?? '',
      test_date:   data.metadata?.test_date ?? '',
      lab_address: selectedLab?.address ?? data.metadata?.lab_address ?? '',
      lab_email:   selectedLab?.email   ?? data.metadata?.lab_email   ?? '',
      lab_phone:   selectedLab?.phone   ?? data.metadata?.lab_phone   ?? '',
    });
    setLabReportId(data.labReportId ?? null);
    setReportNumber(data.reportNumber ?? null);

    // Generate signed URL for PDF viewing in review screen
    const { data: signedData } = await supabase.storage.from('lab-pdfs').createSignedUrl(storagePath, 3600);
    setPdfSignedUrl(signedData?.signedUrl ?? null);

    loadUploads();
  };

  // ── Open review from saved draft ─────────────────────────────────────────────

  const handleOpenReview = async (upload: UploadRecord) => {
    if (!upload.draft_values?.length) return;
    const dm = upload.draft_metadata;
    setExtracted(autoDeselectDuplicates(upload.draft_values));
    setLabMetadata({
      title:       dm?.lab_name || upload.file_name.replace(/\.[^.]+$/, '') || '',
      test_date:   dm?.test_date || '',
      lab_address: dm?.lab_address || '',
      lab_email:   dm?.lab_email   || '',
      lab_phone:   dm?.lab_phone   || '',
    });
    setUploadId(upload.id);
    setLabReportId(upload.lab_report_id);
    setReanalyzingUserId(upload.user_id);

    if (upload.lab_report_id) {
      await supabase.from('lab_reports').update({ status: 'review_pending' }).eq('id', upload.lab_report_id);
      // Fetch the existing report number
      const { data: rpt } = await supabase.from('lab_reports').select('report_number').eq('id', upload.lab_report_id).single();
      setReportNumber(rpt?.report_number ?? null);
    }

    // Generate signed URL for PDF viewing
    let sp = upload.file_url;
    if (sp.startsWith('http')) {
      const match = sp.match(/lab-pdfs\/(.+?)(?:\?|$)/);
      sp = match?.[1] ?? '';
    }
    if (sp) {
      const { data } = await supabase.storage.from('lab-pdfs').createSignedUrl(sp, 3600);
      setPdfSignedUrl(data?.signedUrl ?? null);
    }
  };

  // ── Re-analyze existing upload ───────────────────────────────────────────────

  const handleReanalyze = async (upload: UploadRecord) => {
    if (!upload.file_url) { addToast('No file path for this upload', 'error'); return; }

    // Old records stored a signed URL instead of a storage path — extract the path
    let storagePath = upload.file_url;
    if (storagePath.startsWith('http')) {
      const match = storagePath.match(/lab-pdfs\/(.+?)(?:\?|$)/);
      storagePath = match?.[1] ?? '';
    }
    if (!storagePath) { addToast('Could not determine storage path. Please re-upload.', 'error'); return; }

    setExtracting(true);
    setUploadId(upload.id);
    setReanalyzingUserId(upload.user_id);
    setExtracted([]);

    const res = await fetch('/api/admin/parse-lab-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storagePath, uploadId: upload.id }),
    });
    const data = await res.json();
    setExtracting(false);

    if (!data.success) {
      addToast(data.error ?? 'Re-analysis failed', 'error');
      setUploadId(null);
      setReanalyzingUserId(null);
      return;
    }

    setExtracted(autoDeselectDuplicates(data.extracted ?? []));
    setLabMetadata({
      title:       data.metadata?.lab_name ?? '',
      test_date:   data.metadata?.test_date ?? '',
      lab_address: data.metadata?.lab_address ?? '',
      lab_email:   data.metadata?.lab_email ?? '',
      lab_phone:   data.metadata?.lab_phone ?? '',
    });
    setLabReportId(data.labReportId ?? null);
    setReportNumber(data.reportNumber ?? null);

    // Pre-fill lab details from selected lab if re-analyze selects a known lab
    const reLab = selectedLabId ? labs.find((l) => l.id === selectedLabId) : null;
    if (reLab) {
      setLabMetadata((m) => ({
        ...m,
        lab_address: reLab.address || m.lab_address,
        lab_email:   reLab.email   || m.lab_email,
        lab_phone:   reLab.phone   || m.lab_phone,
      }));
    }

    const { data: signedData } = await supabase.storage.from('lab-pdfs').createSignedUrl(storagePath, 3600);
    setPdfSignedUrl(signedData?.signedUrl ?? null);

    loadUploads();
  };

  // ── Delete upload ────────────────────────────────────────────────────────────

  const handleDeleteUpload = async (upload: UploadRecord) => {
    if (!confirm(`Delete "${upload.file_name}" and all its extracted data?`)) return;

    // Delete linked lab_results (by pdf_url matching file_url)
    await supabase.from('lab_results').delete().eq('pdf_url', upload.file_url);

    // Delete draft lab_report if still in ai_extracted/review_pending state
    if (upload.lab_report_id) {
      await supabase.from('lab_reports').delete()
        .eq('id', upload.lab_report_id)
        .in('status', ['ai_extracted', 'review_pending']);
    }

    // Delete file from storage — extract path from signed URL if needed
    let storagePath = upload.file_url ?? '';
    if (storagePath.startsWith('http')) {
      const match = storagePath.match(/lab-pdfs\/(.+?)(?:\?|$)/);
      storagePath = match?.[1] ?? '';
    }
    if (storagePath) {
      await supabase.storage.from('lab-pdfs').remove([storagePath]);
    }

    // Delete the upload record
    await supabase.from('lab_pdf_uploads').delete().eq('id', upload.id);

    addToast('Upload deleted', 'success');
    loadUploads();
  };

  // ── Toggle row include ──────────────────────────────────────────────────────

  const toggleRow = (idx: number) =>
    setExtracted((rows) => rows.map((r, i) => i === idx ? { ...r, include: !r.include } : r));

  const updateRow = (idx: number, key: keyof ExtractedRow, val: any) =>
    setExtracted((rows) => rows.map((r, i) => i === idx ? { ...r, [key]: val } : r));

  const toggleAll = (val: boolean) => setExtracted((rows) => rows.map((r) => ({ ...r, include: val })));

  // ── Save extracted results ──────────────────────────────────────────────────

  const handleSaveExtracted = async () => {
    const toSave = extracted.filter((r) => r.include && r.matched_id);
    if (!toSave.length) { addToast('No matched results selected', 'error'); return; }
    if (!labMetadata.title.trim()) { addToast('Report title is required', 'error'); return; }
    if (!labMetadata.test_date) { addToast('Test date is required', 'error'); return; }

    // Duplicate conflict check — block save if both duplicates of a biomarker are selected
    const dupConflicts: string[] = [];
    for (const indices of dupMap.values()) {
      const selectedCount = indices.filter((i) => extracted[i].include && extracted[i].matched_id).length;
      if (selectedCount > 1) dupConflicts.push(extracted[indices[0]].matched_name || extracted[indices[0]].extracted_name);
    }
    if (dupConflicts.length > 0) {
      addToast(`Duplicate conflict: ${dupConflicts.join(', ')}. Deselect one of each duplicate before saving.`, 'error');
      return;
    }

    // Implausibility check — block save if any selected row is >10x outside ref range
    const implausible = toSave.filter(isImplausibleRow);
    if (implausible.length > 0) {
      addToast(
        `${implausible.length} result(s) appear implausible (>10× outside reference range). Please correct or deselect them before saving.`,
        'error',
      );
      return;
    }

    setSaving(true);

    const userId = selectedUser?.id ?? reanalyzingUserId ?? null;

    const results = toSave.map((r) => {
      const def = r.db_biomarker;
      return {
        biomarkerDefinitionId: r.matched_id,
        userId,
        value: String(r.value),
        unit: r.unit,
        testDate: labMetadata.test_date || r.test_date,
        biomarkerName: r.matched_name || r.extracted_name,
        refRangeLow: def?.ref_range_low ?? r.ref_low,
        refRangeHigh: def?.ref_range_high ?? r.ref_high,
        optimalRangeLow: def?.optimal_range_low ?? null,
        optimalRangeHigh: def?.optimal_range_high ?? null,
        rangeType: def?.range_type ?? null,
        originalValue: r.original_value != null ? String(r.original_value) : null,
        originalUnit: r.original_unit ?? null,
      };
    });

    const labReport = userId ? {
      user_id:       userId,
      title:         labMetadata.title.trim(),
      test_date:     labMetadata.test_date,
      lab_address:   labMetadata.lab_address || null,
      lab_email:     labMetadata.lab_email   || null,
      lab_phone:     labMetadata.lab_phone   || null,
      report_source: labSource,
      lab_id:        selectedLabId || null,
    } : null;

    const res = await fetch('/api/admin/lab-results/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results, labReport, labReportId }),
    });
    const data = await res.json();
    setSaving(false);

    if (!data.success) { addToast(data.error ?? 'Save failed', 'error'); return; }

    // Update upload record result count
    if (uploadId) {
      await supabase.from('lab_pdf_uploads').update({ results_created: data.created, extraction_status: 'completed' }).eq('id', uploadId);
    }

    addToast(`${data.created} results saved from PDF`, 'success');
    setExtracted([]);
    setFile(null);
    setUploadId(null);
    setReanalyzingUserId(null);
    setLabReportId(null);
    setReportNumber(null);
    setPdfSignedUrl(null);
    setLabMetadata({ title: '', test_date: '', lab_address: '', lab_email: '', lab_phone: '' });
    loadUploads();
  };

  const handleBackFromReview = () => {
    setExtracted([]);
    setFile(null);
    setUploadId(null);
    setReanalyzingUserId(null);
    setLabReportId(null);
    setReportNumber(null);
    setPdfSignedUrl(null);
    setLabMetadata({ title: '', test_date: '', lab_address: '', lab_email: '', lab_phone: '' });
    setAddingManualRow(false);
    setManualBm(null);
    setManualValue('');
    setManualUnit('');
    setManualBmSearch('');
  };

  // ── Filtered biomarkers for epigenetic report type ────────────────────────────

  const filteredBiomarkers = useMemo(() => {
    if (!reportType) return allBiomarkers;
    return allBiomarkers.filter((b) => b.source === reportType);
  }, [allBiomarkers, reportType]);

  // ── Add manual row to review table ───────────────────────────────────────────

  const handleAddManualRow = () => {
    if (!manualBm || manualValue === '' || isNaN(parseFloat(manualValue))) return;
    const v = parseFloat(manualValue);
    const newRow: ExtractedRow = {
      extracted_name: locName(manualBm.name),
      value: v,
      unit: manualUnit || manualBm.unit || '',
      original_value: null,
      original_unit: null,
      was_converted: false,
      ref_low: manualBm.ref_range_low ?? null,
      ref_high: manualBm.ref_range_high ?? null,
      flagged: false,
      test_date: null,
      matched_id: manualBm.id,
      matched_name: locName(manualBm.name),
      confidence: 'exact',
      include: true,
      db_biomarker: manualBm,
    };
    setExtracted((rows) => [...rows, newRow]);
    setManualBm(null);
    setManualValue('');
    setManualUnit('');
    setManualBmSearch('');
    setAddingManualRow(false);
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} dismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />

      {extracting && (
        <div className="space-y-2">
          <div className="h-2 rounded-full bg-[#0e393d]/8 overflow-hidden">
            <div className="h-full rounded-full bg-[#0e393d] animate-pulse" style={{ width: '80%' }} />
          </div>
          <p className="text-xs text-[#1c2a2b]/50 text-center">
            Extracting results with AI… (this may take 20–30 seconds)
          </p>
        </div>
      )}

      {extracted.length === 0 && !extracting ? (
        <>
          {/* ── 1. Lab Source (always first) ───────────────────────────────── */}
          <div>
            <SectionHeading>Lab Source</SectionHeading>
            <div className="flex gap-2">
              {LAB_SOURCE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => {
                    setLabSource(value);
                    setSelectedLabId(null);
                    setSelectedOrder(null);
                    setOrderSearch('');
                    setOrderResults([]);
                    setSelectedUser(null);
                    setUserSearch('');
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    labSource === value
                      ? 'bg-[#0e393d] text-white'
                      : 'bg-white ring-1 ring-[#0e393d]/15 text-[#1c2a2b]/60 hover:ring-[#0e393d]/30'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── 2a. External: Assign to User ──────────────────────────────── */}
          {labSource === 'external_upload' && (
            <div>
              <SectionHeading>Assign to User <span className="text-red-400">*</span></SectionHeading>
              {selectedUser ? (
                <div className="flex items-center justify-between rounded-lg border border-[#0C9C6C]/30 bg-[#0C9C6C]/5 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#1c2a2b]">
                      {[selectedUser.first_name, selectedUser.last_name].filter(Boolean).join(' ') || selectedUser.email}
                    </p>
                    <p className="text-xs text-[#1c2a2b]/50">{selectedUser.email}</p>
                  </div>
                  <button onClick={() => { setSelectedUser(null); setUserSearch(''); }} className="text-xs text-[#1c2a2b]/40 hover:text-[#1c2a2b]">Change</button>
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
                  {searchingUsers && <div className="absolute right-3 top-2.5"><Spinner /></div>}
                  {userOptions.length > 0 && (
                    <div className="absolute top-full mt-1 w-full rounded-lg border border-[#0e393d]/15 bg-white shadow-lg z-10 overflow-hidden">
                      {userOptions.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => { setSelectedUser(u); setUserOptions([]); setUserSearch(''); }}
                          className="w-full flex items-start px-4 py-2.5 text-left hover:bg-[#0e393d]/5 transition"
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
          )}

          {/* ── 2b. Evida/Partner: Link to Order (required) ───────────────── */}
          {(labSource === 'evida_life' || labSource === 'partner_lab') && (
            <div>
              <SectionHeading>Link to Order <span className="text-red-400">*</span></SectionHeading>
              {selectedOrder ? (
                <div className="rounded-lg border border-[#0C9C6C]/30 bg-[#0C9C6C]/5 px-4 py-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-[#0e393d]">
                        Order #{selectedOrder.order_number ?? selectedOrder.id.slice(0, 8)}
                      </p>
                      {selectedOrder.profile && (
                        <p className="text-xs text-[#1c2a2b]/50">
                          {[selectedOrder.profile.first_name, selectedOrder.profile.last_name].filter(Boolean).join(' ') || selectedOrder.profile.email}
                          {' · '}{selectedOrder.profile.email}
                        </p>
                      )}
                    </div>
                    <button onClick={handleClearOrder} className="text-xs text-[#1c2a2b]/40 hover:text-[#1c2a2b] shrink-0">Change</button>
                  </div>
                  {selectedOrder.pendingReports.length > 1 && (
                    <div>
                      <p className="text-xs text-[#1c2a2b]/50 mb-1">Select which report to link:</p>
                      {selectedOrder.pendingReports.map((rpt) => (
                        <label key={rpt.id} className="flex items-center gap-2 text-xs py-1 cursor-pointer">
                          <input
                            type="radio"
                            name="linkedReport"
                            checked={labReportId === rpt.id}
                            onChange={() => {
                              setLabReportId(rpt.id);
                              if (rpt.lab_id) setSelectedLabId(rpt.lab_id);
                            }}
                          />
                          <span className="text-[#1c2a2b]/70">{rpt.product_type ?? 'Report'}</span>
                          <span className="text-[#1c2a2b]/40">({rpt.status})</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {selectedOrder.pendingReports.length === 1 && (
                    <p className="text-xs text-[#1c2a2b]/50">
                      Report: <span className="font-medium text-[#0e393d]">{selectedOrder.pendingReports[0].product_type ?? 'lab report'}</span>
                      {' '}({selectedOrder.pendingReports[0].status})
                    </p>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by order number, voucher code, or email…"
                    value={orderSearch}
                    onChange={(e) => searchOrders(e.target.value)}
                    className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10"
                  />
                  {searchingOrders && <div className="absolute right-3 top-2.5"><Spinner /></div>}
                  {orderResults.length > 0 && (
                    <div className="absolute top-full mt-1 w-full rounded-lg border border-[#0e393d]/15 bg-white shadow-lg z-10 overflow-hidden">
                      {orderResults.map((o) => (
                        <button
                          key={o.id}
                          onClick={() => handleSelectOrder(o)}
                          className="w-full flex items-start justify-between px-4 py-2.5 text-left hover:bg-[#0e393d]/5 transition gap-4"
                        >
                          <div>
                            <p className="text-sm text-[#1c2a2b] font-medium">Order #{o.order_number ?? o.id.slice(0, 8)}</p>
                            {o.profile && (
                              <p className="text-xs text-[#1c2a2b]/50">{o.profile.email}</p>
                            )}
                          </div>
                          <span className="text-xs text-[#1c2a2b]/40 shrink-0 mt-0.5">{o.pendingReports.length} pending</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {!searchingOrders && orderSearch.length > 1 && orderResults.length === 0 && (
                    <p className="mt-1.5 text-xs text-[#1c2a2b]/40">No orders with pending reports found.</p>
                  )}
                  <p className="mt-1.5 text-xs text-[#1c2a2b]/40">Search for the customer's order to link this report</p>
                </div>
              )}
            </div>
          )}

          {/* ── 3. Report Type ───────────────────────────────────────────── */}
          {availableSources.length > 0 && (
            <div>
              <SectionHeading>Report Type</SectionHeading>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setReportType(null)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    reportType === null
                      ? 'bg-[#0e393d] text-white'
                      : 'bg-white ring-1 ring-[#0e393d]/15 text-[#1c2a2b]/60 hover:ring-[#0e393d]/30'
                  }`}
                >
                  All
                </button>
                {availableSources.map((source) => (
                  <button
                    key={source}
                    onClick={() => {
                      if (source === 'clinical_assessment' && onSwitchToManual) {
                        onSwitchToManual();
                      } else {
                        setReportType(source);
                      }
                    }}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      reportType === source
                        ? 'bg-[#0e393d] text-white'
                        : 'bg-white ring-1 ring-[#0e393d]/15 text-[#1c2a2b]/60 hover:ring-[#0e393d]/30'
                    }`}
                  >
                    {SOURCE_ICON[source] ?? '🔬'} {SOURCE_LABEL[source] ?? source}
                  </button>
                ))}
              </div>
              {reportType && reportType !== 'biomarker' && (
                <p className="mt-1.5 text-xs text-[#1c2a2b]/50">
                  Showing only {SOURCE_LABEL[reportType] ?? reportType} markers
                </p>
              )}
            </div>
          )}

          {/* ── 4. Lab selector (Evida/Partner, shown after order selected) ── */}
          {(labSource === 'evida_life' || labSource === 'partner_lab') && selectedOrder && (
            <div>
              <SectionHeading>Select Lab</SectionHeading>
              <select
                value={selectedLabId ?? ''}
                onChange={(e) => setSelectedLabId(e.target.value || null)}
                className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
              >
                <option value="">Choose a lab…</option>
                {(() => {
                  const typeFilter = labSource === 'evida_life' ? 'evida_life' : 'partner';
                  const filtered = labs.filter((l) => l.lab_type === typeFilter);
                  const childrenByParent = new Map<string, LabOption[]>();
                  filtered.filter((l) => l.parent_lab_id).forEach((c) => {
                    if (!childrenByParent.has(c.parent_lab_id!)) childrenByParent.set(c.parent_lab_id!, []);
                    childrenByParent.get(c.parent_lab_id!)!.push(c);
                  });
                  return filtered.filter((l) => !l.parent_lab_id).flatMap((org) => {
                    const orgChildren = childrenByParent.get(org.id) ?? [];
                    const selectable = orgChildren.length === 0 || (org.test_categories?.length ?? 0) > 0;
                    const items = [];
                    if (selectable) {
                      items.push(<option key={org.id} value={org.id}>{labLabel(org)}</option>);
                    } else {
                      items.push(
                        <option key={`h-${org.id}`} value="" disabled style={{ color: '#888' }}>
                          — {org.name}{org.lab_code ? ` (${org.lab_code})` : ''}
                        </option>
                      );
                    }
                    orgChildren.forEach((child) => {
                      items.push(
                        <option key={child.id} value={child.id}>
                          {'  ↳ '}{labLabel(child)}
                        </option>
                      );
                    });
                    return items;
                  });
                })()}
              </select>
            </div>
          )}

          {/* ── 5. Drop zone ──────────────────────────────────────────────── */}
          {(() => {
            const uploadReady = labSource === 'external_upload' ? !!selectedUser : !!selectedOrder;
            return (
              <>
                <div
                  onDragOver={(e) => { if (!uploadReady) return; e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setDragging(false); if (!uploadReady) return; const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                  onClick={() => { if (uploadReady) fileInputRef.current?.click(); }}
                  className={`rounded-xl border-2 border-dashed p-12 text-center transition ${
                    !uploadReady
                      ? 'border-[#0e393d]/10 bg-[#0e393d]/2 opacity-50 cursor-not-allowed'
                      : dragging
                      ? 'cursor-pointer border-[#0e393d] bg-[#0e393d]/5'
                      : 'cursor-pointer border-[#0e393d]/20 hover:border-[#0e393d]/40 hover:bg-[#0e393d]/3'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    disabled={!uploadReady}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  />
                  <div className="text-4xl mb-3">📄</div>
                  {file ? (
                    <>
                      <p className="font-medium text-[#0e393d]">{file.name}</p>
                      <p className="text-xs text-[#1c2a2b]/40 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB · Click to change</p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-[#0e393d]">Drop a lab PDF or image here</p>
                      <p className="text-xs text-[#1c2a2b]/40 mt-1">
                        {!uploadReady
                          ? (labSource === 'external_upload' ? 'Select a user first' : 'Select an order first')
                          : 'PDF, JPG, PNG · Max 10MB'}
                      </p>
                    </>
                  )}
                </div>

                {file && uploadReady && (
                  <>
                    {uploading && (
                      <div className="space-y-2">
                        <div className="h-2 rounded-full bg-[#0e393d]/8 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#0e393d] transition-all duration-500"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-[#1c2a2b]/50 text-center">Uploading…</p>
                      </div>
                    )}
                    {!uploading && (
                      <button
                        onClick={handleUploadAndExtract}
                        className="w-full rounded-xl bg-[#0e393d] text-white py-3 font-medium text-sm hover:bg-[#0e393d]/85 transition"
                      >
                        Upload & Extract with AI
                      </button>
                    )}
                  </>
                )}
              </>
            );
          })()}

          {/* ── Upload history ──────────────────────────────────────────────── */}
          <div>
            <SectionHeading>Recent Uploads</SectionHeading>
            <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-x-auto">
              <table className="w-full text-sm min-w-[740px]">
                <thead>
                  <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/3">
                    {([
                      { key: 'file_name',         label: 'File' },
                      { key: null,                label: 'Assigned User' },
                      { key: null,                label: 'Admin' },
                      { key: 'created_at',        label: 'Date' },
                      { key: 'extraction_status', label: 'Status' },
                      { key: 'results_created',   label: 'Results' },
                      { key: null,                label: 'Actions' },
                    ] as { key: typeof uploadSortCol | null; label: string }[]).map(({ key, label }) => (
                      <th
                        key={label}
                        onClick={key ? () => handleUploadSort(key) : undefined}
                        className={`px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider${key ? ' cursor-pointer select-none hover:text-[#0e393d]' : ''}`}
                      >
                        {label}{key ? <>{' '}{uploadSortCol === key && uploadSortDir === 'asc' ? '▲' : uploadSortCol === key && uploadSortDir === 'desc' ? '▼' : <span className="opacity-0">▲</span>}</> : null}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0e393d]/6">
                  {loadingUploads ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center"><div className="inline-flex justify-center"><Spinner /></div></td></tr>
                  ) : uploads.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-[#1c2a2b]/40">No uploads yet.</td></tr>
                  ) : sortedUploads.map((u) => (
                    <tr key={u.id} className="hover:bg-[#fafaf8] transition-colors">
                      <td className="px-4 py-3 text-xs font-mono text-[#1c2a2b]">{u.file_name}</td>
                      <td className="px-4 py-3 text-xs text-[#1c2a2b]/70">
                        {u.patient
                          ? [u.patient.first_name, u.patient.last_name].filter(Boolean).join(' ') || u.patient.email || '—'
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#1c2a2b]/40">
                        {[u.uploader?.first_name, u.uploader?.last_name].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#1c2a2b]/50 whitespace-nowrap">{fmtDate(u.created_at)}</td>
                      <td className="px-4 py-3">
                        <Badge className={
                          u.extraction_status === 'completed'   ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                          : u.extraction_status === 'extracted'  ? 'bg-amber-50 text-amber-700 ring-amber-600/20'
                          : u.extraction_status === 'failed' || u.extraction_status === 'error' ? 'bg-red-50 text-red-700 ring-red-600/20'
                          : u.extraction_status === 'processing' ? 'bg-sky-50 text-sky-700 ring-sky-600/20'
                          : 'bg-gray-50 text-gray-600 ring-gray-500/20'
                        }>{u.extraction_status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#0e393d] font-medium">{u.results_created ?? 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-3">
                          {u.draft_values && u.draft_values.length > 0 && u.extraction_status === 'extracted' && (
                            <button
                              onClick={() => handleOpenReview(u)}
                              className="text-xs text-[#0e393d] hover:text-[#0e393d]/70 font-medium transition"
                            >
                              Review
                            </button>
                          )}
                          <button
                            onClick={() => handleReanalyze(u)}
                            className="text-xs text-[#ceab84] hover:text-[#b8965e] font-medium transition"
                          >
                            Re-analyze
                          </button>
                          <button
                            onClick={() => handleDeleteUpload(u)}
                            className="text-xs text-red-400 hover:text-red-600 font-medium transition"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : extracted.length > 0 ? (
        /* ── Review screen ──────────────────────────────────────────────────── */
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <SectionHeading>Review Extracted Results</SectionHeading>
              <div className="flex items-center gap-3 mt-1">
                {reportNumber && (
                  <span className="font-mono text-xs text-[#0e393d] bg-[#0e393d]/6 px-2 py-0.5 rounded">
                    {reportNumber}
                  </span>
                )}
                {reanalyzingUserId && (
                  <p className="text-xs text-[#1c2a2b]/50">Re-analysis — results will be saved to the original user</p>
                )}
              </div>
            </div>
            <div className="flex gap-2 items-center shrink-0">
              {pdfSignedUrl && (
                <a
                  href={pdfSignedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#0e393d] hover:underline font-medium"
                >
                  📄 Open PDF
                </a>
              )}
              <span className="text-[#1c2a2b]/30">·</span>
              <button onClick={() => toggleAll(true)} className="text-xs text-[#0e393d] hover:underline">Select all</button>
              <span className="text-[#1c2a2b]/30">·</span>
              <button onClick={() => toggleAll(false)} className="text-xs text-[#0e393d] hover:underline">Deselect all</button>
              <button onClick={handleBackFromReview} className="text-xs text-[#1c2a2b]/50 hover:text-[#1c2a2b]">← Back</button>
            </div>
          </div>

          {/* Selected lab info (read-only for known labs) */}
          {selectedLabId && labSource !== 'external_upload' && (() => {
            const lab = labs.find((l) => l.id === selectedLabId);
            if (!lab) return null;
            return (
              <div className="rounded-lg border border-[#0e393d]/10 bg-[#fafaf8] px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  {lab.lab_code && (
                    <span className="font-mono text-[11px] text-[#1c2a2b]/50 bg-[#0e393d]/5 px-1.5 py-0.5 rounded">{lab.lab_code}</span>
                  )}
                  <span className="text-sm font-medium text-[#0e393d]">{lab.name}</span>
                </div>
                {lab.address && <p className="text-xs text-[#1c2a2b]/50">{lab.address}{lab.city ? `, ${lab.city}` : ''}</p>}
                <div className="flex gap-4 mt-0.5">
                  {lab.phone && <p className="text-xs text-[#1c2a2b]/40">{lab.phone}</p>}
                  {lab.email && <p className="text-xs text-[#1c2a2b]/40">{lab.email}</p>}
                </div>
              </div>
            );
          })()}

          {/* Lab report metadata */}
          <div className="rounded-xl border border-[#0e393d]/10 bg-white p-4">
            <p className="text-xs font-medium text-[#0e393d]/70 uppercase tracking-wider mb-3">Lab Report Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs text-[#1c2a2b]/50 mb-1">Report Title <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={labMetadata.title}
                  onChange={(e) => setLabMetadata((m) => ({ ...m, title: e.target.value }))}
                  placeholder="e.g. Blood Panel – Synlab Jan 2025"
                  className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10"
                />
              </div>
              <div>
                <label className="block text-xs text-[#1c2a2b]/50 mb-1">Test Date <span className="text-red-400">*</span></label>
                <input
                  type="date"
                  value={labMetadata.test_date}
                  onChange={(e) => setLabMetadata((m) => ({ ...m, test_date: e.target.value }))}
                  className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10"
                />
              </div>
              <div>
                <label className="block text-xs text-[#1c2a2b]/50 mb-1">Lab Address</label>
                <input
                  type="text"
                  value={labMetadata.lab_address}
                  onChange={(e) => setLabMetadata((m) => ({ ...m, lab_address: e.target.value }))}
                  placeholder="Optional"
                  className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10"
                />
              </div>
              <div>
                <label className="block text-xs text-[#1c2a2b]/50 mb-1">Lab Email</label>
                <input
                  type="email"
                  value={labMetadata.lab_email}
                  onChange={(e) => setLabMetadata((m) => ({ ...m, lab_email: e.target.value }))}
                  placeholder="Optional"
                  className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10"
                />
              </div>
              <div>
                <label className="block text-xs text-[#1c2a2b]/50 mb-1">Lab Phone</label>
                <input
                  type="tel"
                  value={labMetadata.lab_phone}
                  onChange={(e) => setLabMetadata((m) => ({ ...m, lab_phone: e.target.value }))}
                  placeholder="Optional"
                  className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10"
                />
              </div>
            </div>
          </div>

          {/* Stats summary */}
          <div className="flex gap-4 text-xs text-[#1c2a2b]/60">
            <span>{extracted.length} extracted</span>
            <span className="text-emerald-600">{extracted.filter(r => r.confidence === 'exact').length} exact</span>
            <span className="text-[#8a6a30]">{extracted.filter(r => r.confidence === 'alias').length} alias</span>
            <span className="text-amber-600">{extracted.filter(r => r.confidence === 'fuzzy').length} fuzzy</span>
            <span className="text-red-500">{extracted.filter(r => r.confidence === 'unmatched').length} unmatched</span>
            <span className="text-[#0e393d]">{extracted.filter(r => r.was_converted).length} converted</span>
            {extracted.filter(r => r.include && isImplausibleRow(r)).length > 0 && (
              <span className="text-red-600 font-medium">
                ⚠ {extracted.filter(r => r.include && isImplausibleRow(r)).length} implausible
              </span>
            )}
          </div>

          {(() => {
            const reportLang = detectReportLanguage(extracted.map((r) => r.extracted_name));
            const locInLang = (name: any) => {
              if (!name) return '—';
              if (typeof name === 'string') return name;
              return name[reportLang] || name.en || name.de || Object.values(name)[0] || '—';
            };
            return (
          <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-x-auto">
              <div className="px-3 pt-2 pb-0 text-[11px] text-[#1c2a2b]/40">
                Detected report language: <span className="font-medium text-[#0e393d]/60 uppercase">{reportLang}</span>
              </div>
              <table className="w-full text-xs min-w-[1060px]">
                <thead>
                  <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/3">
                    <th className="px-3 py-2.5 text-left font-medium text-[#0e393d]/60 uppercase tracking-wider">Include</th>
                    <th className="px-3 py-2.5 text-left font-medium text-[#0e393d]/60 uppercase tracking-wider">Extracted Name</th>
                    <th className="px-3 py-2.5 text-left font-medium text-[#0e393d]/60 uppercase tracking-wider">Matched Biomarker</th>
                    <th className="px-3 py-2.5 text-left font-medium text-[#0e393d]/60 uppercase tracking-wider">Ref Range</th>
                    <th className="px-3 py-2.5 text-left font-medium text-[#0e393d]/60 uppercase tracking-wider">Confidence</th>
                    <th className="px-3 py-2.5 text-left font-medium text-[#0e393d]/60 uppercase tracking-wider">Value</th>
                    <th className="px-3 py-2.5 text-left font-medium text-[#0e393d]/60 uppercase tracking-wider">Unit / Conversion</th>
                    <th className="px-3 py-2.5 text-left font-medium text-[#0e393d]/60 uppercase tracking-wider">Type</th>
                    <th className="px-3 py-2.5 text-left font-medium text-[#0e393d]/60 uppercase tracking-wider">Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0e393d]/6">
                  {extracted.map((row, idx) => {
                    const { low: refLow, high: refHigh, useDbOptimal } = effectiveRefRange(row);
                    const refUnit = row.was_converted
                      ? (row.db_biomarker?.unit || row.unit || '')
                      : (row.unit || '');
                    const implausible = row.include && isImplausibleRow(row);

                    const flag = row.db_biomarker
                      ? computeStatusFlag(row.value, {
                          ref_range_low: refLow,
                          ref_range_high: refHigh,
                          optimal_range_low: useDbOptimal ? row.db_biomarker.optimal_range_low : null,
                          optimal_range_high: useDbOptimal ? row.db_biomarker.optimal_range_high : null,
                          range_type: row.db_biomarker.range_type,
                        })
                      : null;

                    return (
                      <tr
                        key={idx}
                        className={`${row.include ? '' : 'opacity-40'} ${implausible ? 'bg-red-50/60' : 'hover:bg-[#fafaf8]'} transition-colors`}
                      >
                        <td className="px-3 py-2.5 text-center">
                          <input type="checkbox" checked={row.include} onChange={() => toggleRow(idx)}
                            className="rounded border-[#0e393d]/30 accent-[#0e393d]" />
                        </td>
                        <td className="px-3 py-2.5 text-[#1c2a2b] max-w-[180px]">
                          <span title={row.extracted_name} className="block truncate">{row.extracted_name}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          {(() => {
                            const currentBm = row.matched_id ? allBiomarkers.find((b) => b.id === row.matched_id) : null;
                            const displayText = openBmIdx === idx ? bmSearchText : (currentBm ? locInLang(currentBm.name) : '');
                            const bmFiltered = (openBmIdx === idx && bmSearchText.trim()
                              ? filteredBiomarkers.filter((b) => locInLang(b.name).toLowerCase().includes(bmSearchText.toLowerCase()))
                              : filteredBiomarkers
                            ).slice(0, 30);
                            return (
                              <div className="relative">
                                <input
                                  type="text"
                                  value={displayText}
                                  placeholder="— Not mapped —"
                                  onFocus={() => { setOpenBmIdx(idx); setBmSearchText(''); }}
                                  onChange={(e) => { setOpenBmIdx(idx); setBmSearchText(e.target.value); }}
                                  onBlur={() => setTimeout(() => setOpenBmIdx(null), 150)}
                                  className="rounded border border-[#0e393d]/15 bg-white px-2 py-1 text-xs text-[#1c2a2b] focus:outline-none focus:ring-1 focus:ring-[#0e393d]/20 w-44"
                                />
                                {openBmIdx === idx && (
                                  <div className="absolute top-full mt-0.5 left-0 w-56 bg-white border border-[#0e393d]/15 rounded-lg shadow-lg z-30 max-h-52 overflow-y-auto">
                                    <button
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => {
                                        updateRow(idx, 'matched_id', null);
                                        updateRow(idx, 'matched_name', null);
                                        updateRow(idx, 'db_biomarker', null);
                                        updateRow(idx, 'confidence', 'unmatched');
                                        setOpenBmIdx(null);
                                      }}
                                      className="w-full text-left px-3 py-1.5 text-xs text-[#1c2a2b]/40 hover:bg-[#0e393d]/5"
                                    >
                                      — Not mapped —
                                    </button>
                                    {bmFiltered.map((b) => (
                                      <button
                                        key={b.id}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                          updateRow(idx, 'matched_id', b.id);
                                          updateRow(idx, 'matched_name', locInLang(b.name));
                                          updateRow(idx, 'db_biomarker', b);
                                          updateRow(idx, 'confidence', 'alias');
                                          setOpenBmIdx(null);
                                          setBmSearchText('');
                                        }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-[#1c2a2b] hover:bg-[#0e393d]/5"
                                      >
                                        {locInLang(b.name)}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-3 py-2.5 text-[#1c2a2b]/50 whitespace-nowrap">
                          {refLow != null || refHigh != null
                            ? `${refLow ?? '—'}–${refHigh ?? '—'} ${refUnit}`
                            : <span className="text-[#1c2a2b]/25">—</span>
                          }
                          {implausible && (
                            <span className="ml-1 text-red-500 font-medium" title="Value is >10× outside reference range">⚠</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            {row.matched_id && dupMap.has(row.matched_id) && (
                              <Badge className="bg-violet-50 text-violet-700 ring-violet-600/20">Dup</Badge>
                            )}
                            <ConfidenceBadge c={row.confidence} />
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="number" step="0.01"
                            value={row.value}
                            onChange={(e) => updateRow(idx, 'value', parseFloat(e.target.value))}
                            className={`w-20 rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 transition ${
                              implausible
                                ? 'border-red-300 bg-red-50 focus:ring-red-300'
                                : 'border-[#0e393d]/15 bg-white focus:ring-[#0e393d]/20'
                            }`}
                          />
                        </td>
                        <td className="px-3 py-2.5 text-xs text-[#1c2a2b]">
                          {row.was_converted ? (
                            <span>
                              <span className="text-[#1c2a2b]/40">{row.original_value} {row.original_unit}</span>
                              {' → '}
                              <span className="text-emerald-700 font-medium">{row.unit}</span>
                            </span>
                          ) : (
                            <span className="font-medium">{row.unit || '—'}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <SourceBadge source={row.db_biomarker?.source ?? null} />
                        </td>
                        <td className="px-3 py-2.5"><FlagBadge flag={flag} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            );
          })()}

          {/* ── Add marker manually (Feature 3) ──────────────────────── */}
          {addingManualRow ? (
            <div className="rounded-xl border border-[#0e393d]/15 bg-[#fafaf8] p-4 space-y-3">
              <p className="text-xs font-medium text-[#0e393d]/70 uppercase tracking-wider">Add Marker</p>
              <div className="flex gap-3 flex-wrap items-end">
                {/* Biomarker search */}
                <div className="flex-1 min-w-[200px] relative">
                  <label className="block text-xs text-[#1c2a2b]/50 mb-1">Biomarker</label>
                  <input
                    type="text"
                    placeholder="Search biomarker…"
                    value={manualBm ? locName(manualBm.name) : manualBmSearch}
                    onChange={(e) => { setManualBm(null); setManualBmSearch(e.target.value); setManualBmDropdownOpen(true); }}
                    onFocus={() => setManualBmDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setManualBmDropdownOpen(false), 150)}
                    className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10"
                  />
                  {manualBmDropdownOpen && !manualBm && (
                    <div className="absolute top-full mt-0.5 left-0 w-72 bg-white border border-[#0e393d]/15 rounded-lg shadow-lg z-30 max-h-52 overflow-y-auto">
                      {filteredBiomarkers
                        .filter((b) => !manualBmSearch.trim() || locName(b.name).toLowerCase().includes(manualBmSearch.toLowerCase()))
                        .slice(0, 30)
                        .map((b) => (
                          <button
                            key={b.id}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { setManualBm(b); setManualUnit(b.unit || ''); setManualBmDropdownOpen(false); }}
                            className="w-full text-left px-3 py-1.5 text-xs text-[#1c2a2b] hover:bg-[#0e393d]/5"
                          >
                            {locName(b.name)}
                            {b.unit && <span className="ml-1 text-[#1c2a2b]/40">{b.unit}</span>}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
                {/* Value */}
                <div className="w-28">
                  <label className="block text-xs text-[#1c2a2b]/50 mb-1">Value <span className="text-red-400">*</span></label>
                  <input
                    type="number" step="0.01"
                    placeholder="0.00"
                    value={manualValue}
                    onChange={(e) => setManualValue(e.target.value)}
                    className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10"
                  />
                </div>
                {/* Unit */}
                <div className="w-24">
                  <label className="block text-xs text-[#1c2a2b]/50 mb-1">Unit</label>
                  <input
                    type="text"
                    placeholder="e.g. mg/dL"
                    value={manualUnit}
                    onChange={(e) => setManualUnit(e.target.value)}
                    className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10"
                  />
                </div>
                {/* Actions */}
                <div className="flex gap-2 pb-0.5">
                  <button
                    onClick={handleAddManualRow}
                    disabled={!manualBm || !manualValue}
                    className="rounded-lg bg-[#0e393d] text-white px-4 py-2 text-xs font-medium hover:bg-[#0e393d]/85 transition disabled:opacity-40"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => { setAddingManualRow(false); setManualBm(null); setManualValue(''); setManualUnit(''); setManualBmSearch(''); }}
                    className="rounded-lg border border-[#0e393d]/15 text-[#1c2a2b]/60 px-4 py-2 text-xs font-medium hover:border-[#0e393d]/30 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingManualRow(true)}
              className="flex items-center gap-1.5 text-xs text-[#0e393d] hover:text-[#0e393d]/70 font-medium transition"
            >
              <span className="text-base leading-none">+</span> Add marker not found in PDF
            </button>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSaveExtracted}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-[#0e393d] text-white px-6 py-2.5 font-medium text-sm hover:bg-[#0e393d]/85 transition disabled:opacity-50"
            >
              {saving && <Spinner size={3} />}
              {saving ? 'Saving…' : `Save ${extracted.filter((r) => r.include && r.matched_id).length} Selected Results`}
            </button>
            <button
              onClick={handleBackFromReview}
              className="rounded-xl border border-[#0e393d]/15 text-[#1c2a2b]/60 px-6 py-2.5 font-medium text-sm hover:text-[#1c2a2b] hover:border-[#0e393d]/30 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
