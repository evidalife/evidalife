'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FlagBadge, HE_DOMAIN_LABEL, Spinner, Toast, ToastContainer, fmtDate, locName, nextToastId } from './shared';
import { displayReportId } from '@/lib/lab-results/report-number';

// ─── Open PDF in new tab via signed URL ──────────────────────────────────────

async function openPdfInNewTab(fileUrl: string, supabase: ReturnType<typeof createClient>) {
  let storagePath = fileUrl;
  if (storagePath.startsWith('http')) {
    const match = storagePath.match(/lab-pdfs\/(.+?)(?:\?|$)/);
    storagePath = match?.[1] ?? '';
  }
  if (!storagePath) return;
  const { data } = await supabase.storage.from('lab-pdfs').createSignedUrl(storagePath, 3600);
  if (data?.signedUrl) {
    window.open(data.signedUrl, '_blank', 'noopener');
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportSource = 'admin_import' | 'pdf_upload' | 'manual_entry';

type LabResultSummary = {
  id: string;
  value_numeric: number | null;
  unit: string | null;
  status_flag: string | null;
  test_date: string | null;
  biomarkers: {
    name: Record<string, string> | string | null;
    he_domain: string | null;
    ref_range_low: number | null;
    ref_range_high: number | null;
    optimal_range_low: number | null;
    optimal_range_high: number | null;
    unit: string | null;
  } | null;
};

type LabReport = {
  id: string;
  title: string;
  test_date: string | null;
  source: string;
  status: string | null;
  report_source: string | null;
  report_number: string | null;
  archived_at: string | null;
  created_at: string;
  lab_address: string | null;
  lab_email: string | null;
  lab_phone: string | null;
  profiles: { id: string; first_name: string | null; last_name: string | null; email: string | null } | null;
  results_count: number;
  lab_results?: LabResultSummary[];
  pdf_file_url: string | null;
  pdf_file_name: string | null;
};

type SourceFilter = 'all' | 'evida_life' | 'partner_lab' | 'external' | 'archived';
type StatusFilter = 'all' | 'pending' | 'confirmed';

// ─── Source label helper ──────────────────────────────────────────────────────

function sourceBadge(source: string, reportSource: string | null) {
  const label = reportSource === 'evida_life'
    ? '🌿 Evida Life'
    : reportSource === 'partner_lab'
    ? '🔬 Partner Lab'
    : reportSource === 'external_upload'
    ? '📁 External'
    : source === 'admin_import'
    ? '🌿 Evida Life'
    : '📝 Self-Reported';

  const cls = reportSource === 'evida_life' || source === 'admin_import'
    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
    : reportSource === 'partner_lab'
    ? 'bg-[#ceab84]/10 text-[#8a6a3e] ring-1 ring-[#ceab84]/25'
    : reportSource === 'external_upload'
    ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-600/20'
    : 'bg-gray-100 text-gray-600 ring-1 ring-gray-300/40';

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

function reportStatusBadge(status: string | null) {
  const map: Record<string, { label: string; cls: string }> = {
    awaiting_sample:  { label: '⏳ Awaiting',     cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20' },
    sample_collected: { label: '🧪 Collected',    cls: 'bg-sky-50 text-sky-700 ring-1 ring-sky-600/20' },
    processing:       { label: '🔬 Processing',   cls: 'bg-sky-50 text-sky-700 ring-1 ring-sky-600/20' },
    results_received: { label: '📨 Received',     cls: 'bg-violet-50 text-violet-700 ring-1 ring-violet-600/20' },
    ai_extracted:     { label: '🤖 AI Extracted', cls: 'bg-violet-50 text-violet-700 ring-1 ring-violet-600/20' },
    review_pending:   { label: '⏳ Pending',      cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20' },
    confirmed:        { label: '✅ Confirmed',    cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20' },
    archived:         { label: '📦 Archived',     cls: 'bg-gray-100 text-gray-500 ring-1 ring-gray-300/50' },
  };
  const { label, cls } = map[status ?? ''] ?? { label: status ?? '—', cls: 'bg-gray-100 text-gray-500 ring-1 ring-gray-300/50' };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

// ─── Results grouped by domain ────────────────────────────────────────────────

const HE_DOMAIN_ORDER = [
  'heart_vessels', 'metabolism', 'hormones', 'inflammation',
  'nutrients', 'organ_function', 'longevity', 'fitness',
];

function ReportResults({ results }: { results: LabResultSummary[] }) {
  const byDomain: Record<string, LabResultSummary[]> = {};
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
          <div className="px-5 py-1.5 bg-[#0e393d]/[0.03]">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ceab84]">
              {HE_DOMAIN_LABEL[domain] ?? domain}
            </span>
          </div>
          <div className="divide-y divide-[#0e393d]/5">
            {byDomain[domain].map((r) => {
              const def = r.biomarkers;
              const name = locName(def?.name) || '—';
              return (
                <div key={r.id} className="px-5 py-2 flex items-center gap-3 hover:bg-[#fafaf8] transition-colors">
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-medium text-[#1c2a2b]">{name}</span>
                    {(def?.ref_range_low != null || def?.ref_range_high != null) && (
                      <span className="ml-2 text-[10px] text-[#1c2a2b]/30 font-mono">
                        {def?.ref_range_low ?? '—'}–{def?.ref_range_high ?? '—'} {def?.unit}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="tabular-nums text-[13px] font-semibold text-[#0e393d]">
                      {r.value_numeric}{' '}
                      <span className="font-normal text-[#1c2a2b]/40 text-[11px]">{r.unit || def?.unit || ''}</span>
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function AllResultsTab() {
  const supabase = createClient();

  const [reports, setReports] = useState<LabReport[]>([]);
  const [orphanCount, setOrphanCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedResults, setExpandedResults] = useState<Record<string, LabResultSummary[]>>({});
  const [loadingResults, setLoadingResults] = useState<string | null>(null);

  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortCol, setSortCol] = useState<'title' | 'user' | 'test_date' | 'results_count'>('test_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((msg: string, type: Toast['type'] = 'success') => {
    const id = nextToastId();
    setToasts((p) => [...p, { id, message: msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 5000);
  }, []);

  const loadReports = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from('lab_reports')
      .select(`
        id, title, test_date, source, status, report_source, report_number, archived_at, created_at,
        lab_address, lab_email, lab_phone,
        profiles:user_id (id, first_name, last_name, email),
        lab_results(count),
        lab_pdf_uploads(file_url, file_name)
      `)
      .order('created_at', { ascending: false });

    if (sourceFilter === 'archived') {
      query = query.not('archived_at', 'is', null);
    } else {
      query = query.is('archived_at', null).is('deleted_at', null);
      if (sourceFilter === 'evida_life') {
        query = query.or("report_source.eq.evida_life,and(report_source.is.null,source.eq.admin_import)");
      } else if (sourceFilter === 'partner_lab') {
        query = query.eq('report_source', 'partner_lab');
      } else if (sourceFilter === 'external') {
        query = query.or("report_source.eq.external_upload,and(report_source.is.null,source.in.(pdf_upload,manual_entry))");
      }
    }

    if (sourceFilter !== 'archived') {
      if (statusFilter === 'pending') {
        query = query.in('status', ['ai_extracted', 'review_pending']);
      } else if (statusFilter === 'confirmed') {
        query = query.eq('status', 'confirmed');
      }
    }

    const { data } = await query;
    const raw = (data ?? []) as any[];

    let rows: LabReport[] = raw.map((r) => {
      const pdfUpload = Array.isArray(r.lab_pdf_uploads) ? r.lab_pdf_uploads[0] ?? null : r.lab_pdf_uploads;
      return {
        ...r,
        profiles: Array.isArray(r.profiles) ? r.profiles[0] ?? null : r.profiles,
        results_count: Array.isArray(r.lab_results) ? (r.lab_results[0]?.count ?? 0) : 0,
        pdf_file_url: pdfUpload?.file_url ?? null,
        pdf_file_name: pdfUpload?.file_name ?? null,
      };
    });

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => {
        const user = [r.profiles?.first_name, r.profiles?.last_name].filter(Boolean).join(' ').toLowerCase();
        const email = r.profiles?.email?.toLowerCase() ?? '';
        const title = r.title.toLowerCase();
        const num = r.report_number?.toLowerCase() ?? '';
        const addr = r.lab_address?.toLowerCase() ?? '';
        return user.includes(q) || email.includes(q) || title.includes(q) || num.includes(q) || addr.includes(q);
      });
    }

    if (dateFrom) rows = rows.filter((r) => r.test_date && r.test_date >= dateFrom);
    if (dateTo)   rows = rows.filter((r) => r.test_date && r.test_date <= dateTo);

    setReports(rows);

    const { count } = await supabase
      .from('lab_results')
      .select('id', { count: 'exact', head: true })
      .is('lab_report_id', null)
      .is('deleted_at', null);
    setOrphanCount(count ?? 0);

    setLoading(false);
  }, [supabase, sourceFilter, statusFilter, search, dateFrom, dateTo]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const handleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
  };

  const sortedReports = useMemo(() => [...reports].sort((a, b) => {
    let cmp = 0;
    if (sortCol === 'title') cmp = a.title.localeCompare(b.title);
    else if (sortCol === 'user') {
      const an = [a.profiles?.first_name, a.profiles?.last_name].filter(Boolean).join(' ') || a.profiles?.email || '';
      const bn = [b.profiles?.first_name, b.profiles?.last_name].filter(Boolean).join(' ') || b.profiles?.email || '';
      cmp = an.localeCompare(bn);
    } else if (sortCol === 'results_count') cmp = (a.results_count ?? 0) - (b.results_count ?? 0);
    else cmp = (a.test_date ?? '').localeCompare(b.test_date ?? '');
    return sortDir === 'asc' ? cmp : -cmp;
  }), [reports, sortCol, sortDir]);

  // ── Expand: lazy-load results ─────────────────────────────────────────────────

  const toggleExpand = async (reportId: string) => {
    if (expandedId === reportId) { setExpandedId(null); return; }
    setExpandedId(reportId);
    if (expandedResults[reportId]) return;

    setLoadingResults(reportId);
    const { data } = await supabase
      .from('lab_results')
      .select(`
        id, value_numeric, unit, status_flag, test_date,
        biomarkers:biomarker_definition_id(name, he_domain, ref_range_low, ref_range_high, optimal_range_low, optimal_range_high, unit)
      `)
      .eq('lab_report_id', reportId)
      .is('deleted_at', null)
      .order('test_date', { ascending: false });

    setExpandedResults((prev) => ({ ...prev, [reportId]: (data as unknown as LabResultSummary[]) ?? [] }));
    setLoadingResults(null);
  };

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleArchive = async (report: LabReport) => {
    setActionLoading(report.id);
    const { error } = await supabase
      .from('lab_reports')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', report.id);
    setActionLoading(null);
    if (error) { addToast('Archive failed: ' + error.message, 'error'); return; }
    addToast(`"${report.title}" archived`, 'success');
    loadReports();
  };

  const handleReactivate = async (report: LabReport) => {
    setActionLoading(report.id);
    const { error } = await supabase
      .from('lab_reports')
      .update({ archived_at: null })
      .eq('id', report.id);
    setActionLoading(null);
    if (error) { addToast('Reactivate failed: ' + error.message, 'error'); return; }
    addToast(`"${report.title}" reactivated`, 'success');
    loadReports();
  };

  const handlePermanentDelete = async (report: LabReport) => {
    const hasPdf = !!report.pdf_file_url;
    const pdfName = report.pdf_file_name || 'linked PDF';
    const msg = [
      `Permanently delete "${report.title}"${report.report_number ? ` (${report.report_number})` : ''}?`,
      '',
      'This will delete:',
      `• The report record`,
      `• All ${report.results_count} lab results`,
      ...(hasPdf ? [`• The stored PDF file (${pdfName})`] : []),
      '',
      'This cannot be undone.',
    ].join('\n');
    if (!confirm(msg)) return;

    setActionLoading(report.id);

    // Delete all linked lab_results
    await supabase.from('lab_results').delete().eq('lab_report_id', report.id);

    // If a PDF is linked, delete the file from storage and the upload record
    if (hasPdf && report.pdf_file_url) {
      let storagePath = report.pdf_file_url;
      if (storagePath.startsWith('http')) {
        const match = storagePath.match(/lab-pdfs\/(.+?)(?:\?|$)/);
        storagePath = match?.[1] ?? '';
      }
      if (storagePath) {
        await supabase.storage.from('lab-pdfs').remove([storagePath]);
      }
      // Also clean up the lab_pdf_uploads record
      await supabase.from('lab_pdf_uploads').delete().eq('file_url', report.pdf_file_url);
    }

    // Delete the report record
    const { error } = await supabase.from('lab_reports').delete().eq('id', report.id);
    setActionLoading(null);

    if (error) { addToast('Delete failed: ' + error.message, 'error'); return; }
    addToast(`"${report.title}" permanently deleted${hasPdf ? ' (PDF removed)' : ''}`, 'success');
    loadReports();
  };

  // ── Computed stats ──────────────────────────────────────────────────────────

  const totalReports = reports.length;
  const confirmedCount = reports.filter(r => r.status === 'confirmed').length;
  const pendingCount = reports.filter(r => r.status && ['ai_extracted', 'review_pending', 'awaiting_sample', 'sample_collected', 'processing', 'results_received'].includes(r.status)).length;
  const totalResults = reports.reduce((sum, r) => sum + (r.results_count ?? 0), 0);

  // ─────────────────────────────────────────────────────────────────────────────

  const FILTER_PILLS: { id: SourceFilter; label: string }[] = [
    { id: 'all',        label: 'All' },
    { id: 'evida_life', label: '🌿 Evida' },
    { id: 'partner_lab',label: '🤝 Partner' },
    { id: 'external',   label: '📁 External' },
    { id: 'archived',   label: '📦 Archived' },
  ];

  const STATUS_PILLS: { id: StatusFilter; label: string }[] = [
    { id: 'all',       label: 'All' },
    { id: 'pending',   label: '⏳ Pending' },
    { id: 'confirmed', label: '✅ Confirmed' },
  ];

  return (
    <div className="p-8">
      <ToastContainer toasts={toasts} dismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-[#0e393d]">All Lab Reports</h1>
          <p className="text-sm text-[#1c2a2b]/40 mt-1">Browse, search, and manage all lab reports and results</p>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl bg-gradient-to-br from-[#0e393d] to-[#154347] p-4 text-white">
          <div className="text-2xl font-bold">{totalReports}</div>
          <div className="text-xs text-white/60 mt-0.5">Total Reports</div>
          <div className="text-[10px] text-white/40 mt-1">{totalResults} biomarker results</div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 p-4 text-white">
          <div className="text-2xl font-bold">{pendingCount}</div>
          <div className="text-xs text-white/70 mt-0.5">In Pipeline</div>
          <div className="text-[10px] text-white/50 mt-1">awaiting / processing / review</div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 text-white">
          <div className="text-2xl font-bold">{confirmedCount}</div>
          <div className="text-xs text-white/70 mt-0.5">Confirmed</div>
          <div className="text-[10px] text-white/50 mt-1">published to users</div>
        </div>
        <div className={`rounded-xl p-4 ${orphanCount > 0 ? 'bg-gradient-to-br from-red-500 to-red-600 text-white' : 'bg-gradient-to-br from-[#ceab84] to-[#b8976e] text-white'}`}>
          <div className="text-2xl font-bold">{orphanCount}</div>
          <div className="text-xs text-white/70 mt-0.5">{orphanCount > 0 ? 'Orphan Results' : 'Data Quality'}</div>
          <div className="text-[10px] text-white/50 mt-1">{orphanCount > 0 ? 'results without report' : 'no orphan results'}</div>
        </div>
      </div>

      {/* ── Filters bar ── */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1c2a2b]/25 pointer-events-none">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-[#0e393d]/12 bg-white pl-9 pr-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 w-56 transition"
          />
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-[#0e393d]/10" />

        {/* Source pills */}
        <div className="flex gap-1.5">
          {FILTER_PILLS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setSourceFilter(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                sourceFilter === id
                  ? 'bg-[#0e393d] text-white shadow-sm'
                  : 'bg-[#0e393d]/5 text-[#0e393d]/60 hover:bg-[#0e393d]/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-[#0e393d]/10" />

        {/* Status pills */}
        {sourceFilter !== 'archived' && (
          <div className="flex gap-1.5">
            {STATUS_PILLS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setStatusFilter(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  statusFilter === id
                    ? 'bg-[#ceab84] text-white shadow-sm'
                    : 'bg-[#ceab84]/10 text-[#ceab84]/70 hover:bg-[#ceab84]/20'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="w-px h-6 bg-[#0e393d]/10" />

        {/* Date range */}
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-[#0e393d]/12 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0e393d]/8 transition" />
          <span className="text-[#1c2a2b]/30 text-xs">–</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-[#0e393d]/12 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0e393d]/8 transition" />
        </div>
      </div>

      {/* ── Table ── */}
      <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/[0.03]">
              {([
                { key: 'title' as const,         label: 'Report' },
                { key: 'user' as const,          label: 'User' },
                { key: 'test_date' as const,     label: 'Date' },
                { key: 'results_count' as const, label: 'Results' },
              ]).map(({ key, label }) => {
                const active = sortCol === key;
                return (
                  <th key={key} className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort(key)}
                      className={`flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider transition hover:text-[#0e393d] ${active ? 'text-[#0e393d]' : 'text-[#0e393d]/50'}`}
                    >
                      {label}
                      <span className="text-[10px] leading-none">
                        {active && sortDir === 'asc' ? '▲' : active && sortDir === 'desc' ? '▼' : <span className="opacity-0">▲</span>}
                      </span>
                    </button>
                  </th>
                );
              })}
              <th className="px-4 py-3 text-left">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0e393d]/50">Source</span>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0e393d]/50">Status</span>
              </th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0e393d]/5">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-16 text-center">
                <Spinner size={5} />
              </td></tr>
            ) : sortedReports.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-16 text-center">
                <div className="text-[#1c2a2b]/30 text-sm">No reports found</div>
                <p className="text-xs text-[#1c2a2b]/20 mt-1">Try adjusting your search or filters</p>
              </td></tr>
            ) : sortedReports.map((report) => {
              const isExpanded = expandedId === report.id;
              const isArchived = !!report.archived_at;
              const isLoading = actionLoading === report.id;
              const userName = [report.profiles?.first_name, report.profiles?.last_name].filter(Boolean).join(' ') || '—';
              const userEmail = report.profiles?.email;

              return (
                <tr key={report.id} className={`group transition-colors ${isArchived ? 'bg-gray-50/50' : 'hover:bg-[#fafaf8]'}`}>
                  {/* Report */}
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <button onClick={() => toggleExpand(report.id)} className="text-left flex-1 min-w-0">
                        <div className="font-medium text-[#0e393d] text-[13px]">{report.title}</div>
                        {report.report_number && (
                          <div className="font-mono text-[9px] text-[#0e393d]/35 mt-px">{displayReportId(report)}</div>
                        )}
                        {report.lab_address && (
                          <div className="text-[10px] text-[#1c2a2b]/30 mt-px">📍 {report.lab_address}</div>
                        )}
                      </button>
                      {report.pdf_file_url && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openPdfInNewTab(report.pdf_file_url!, supabase); }}
                          className="shrink-0 mt-0.5 p-1 rounded-md hover:bg-[#0e393d]/5 transition-colors group/pdf"
                          title={report.pdf_file_name ? `Open ${report.pdf_file_name}` : 'Open PDF'}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#0e393d]/30 group-hover/pdf:text-[#0e393d]/70 transition-colors">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                  {/* User */}
                  <td className="px-4 py-3">
                    <div className="text-[13px] text-[#1c2a2b]/80">{userName}</div>
                    {userEmail && <div className="text-[10px] text-[#1c2a2b]/35 font-mono">{userEmail}</div>}
                  </td>
                  {/* Date */}
                  <td className="px-4 py-3">
                    <span className="text-[12px] text-[#1c2a2b]/60 tabular-nums">{fmtDate(report.test_date)}</span>
                  </td>
                  {/* Results count */}
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#0e393d]/6 text-xs font-semibold text-[#0e393d]/70 tabular-nums">
                      {report.results_count}
                    </span>
                  </td>
                  {/* Source */}
                  <td className="px-4 py-3">
                    {isArchived
                      ? <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500 ring-1 ring-gray-300/50">📦 Archived</span>
                      : sourceBadge(report.source, report.report_source)}
                  </td>
                  {/* Status */}
                  <td className="px-4 py-3">
                    {reportStatusBadge(report.status)}
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      {isLoading ? (
                        <Spinner size={3} />
                      ) : isArchived ? (
                        <>
                          <button onClick={() => handleReactivate(report)} className="opacity-0 group-hover:opacity-100 text-[10px] text-emerald-600 hover:text-emerald-700 font-medium transition px-1.5 py-0.5 rounded hover:bg-emerald-50">
                            Restore
                          </button>
                          <button onClick={() => handlePermanentDelete(report)} className="opacity-0 group-hover:opacity-100 text-[10px] text-red-500 hover:text-red-700 font-medium transition px-1.5 py-0.5 rounded hover:bg-red-50">
                            Delete
                          </button>
                        </>
                      ) : (
                        <button onClick={() => handleArchive(report)} className="opacity-0 group-hover:opacity-100 text-[10px] text-[#1c2a2b]/40 hover:text-[#1c2a2b]/70 font-medium transition px-1.5 py-0.5 rounded hover:bg-[#0e393d]/5">
                          Archive
                        </button>
                      )}
                      <button onClick={() => toggleExpand(report.id)} className="p-1 rounded-lg hover:bg-[#0e393d]/5 transition">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                          className={`text-[#1c2a2b]/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Expanded results panel — rendered outside the table row for proper layout */}
        {expandedId && (
          <div className="border-t border-[#0e393d]/8">
            {loadingResults === expandedId ? (
              <div className="flex justify-center py-6"><Spinner size={4} /></div>
            ) : (expandedResults[expandedId]?.length ?? 0) > 0 ? (
              <ReportResults results={expandedResults[expandedId]!} />
            ) : (
              <p className="px-5 py-4 text-sm text-[#1c2a2b]/40 text-center">No results in this report.</p>
            )}
            {(() => {
              const report = reports.find(r => r.id === expandedId);
              if (!report || (!report.lab_address && !report.lab_email && !report.lab_phone)) return null;
              return (
                <div className="border-t border-[#0e393d]/6 px-5 py-3 flex flex-wrap gap-4 text-xs text-[#1c2a2b]/45">
                  {report.lab_address && <span>📍 {report.lab_address}</span>}
                  {report.lab_email   && <span>✉️ {report.lab_email}</span>}
                  {report.lab_phone   && <span>📞 {report.lab_phone}</span>}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* ── Table footer ── */}
      <div className="flex items-center justify-between mt-3 text-xs text-[#1c2a2b]/40 px-1">
        <span>Showing {sortedReports.length} of {totalReports} reports</span>
        {(search || sourceFilter !== 'all' || statusFilter !== 'all' || dateFrom || dateTo) && (
          <button onClick={() => { setSearch(''); setSourceFilter('all'); setStatusFilter('all'); setDateFrom(''); setDateTo(''); }}
            className="text-[#0e393d]/60 hover:text-[#0e393d] underline underline-offset-2 transition">
            Clear all filters
          </button>
        )}
      </div>
    </div>
  );
}
