'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Badge, FlagBadge, HE_DOMAIN_LABEL, Spinner, Toast, ToastContainer, fmtDate, locName, nextToastId } from './shared';

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
  // Loaded lazily when expanded
  lab_results?: LabResultSummary[];
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

  const cls = (source === 'admin_import' || reportSource === 'evida_life' || reportSource === 'partner_lab' || reportSource === 'external_upload')
    ? 'bg-[#0C9C6C]/10 text-[#0C9C6C] ring-1 ring-[#0C9C6C]/20'
    : 'bg-[#CEAB84]/15 text-[#7a5e20] ring-1 ring-[#CEAB84]/30';

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

function reportStatusBadge(status: string | null) {
  if (!status || status === 'confirmed') return null;
  const map: Record<string, { label: string; cls: string }> = {
    ai_extracted:   { label: '🤖 AI Extracted',   cls: 'bg-violet-50 text-violet-700 ring-1 ring-violet-600/20' },
    review_pending: { label: '⏳ Review Pending', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20' },
    archived:       { label: '📦 Archived',        cls: 'bg-gray-100 text-gray-500 ring-1 ring-gray-300/50' },
  };
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-500 ring-1 ring-gray-300/50' };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${cls}`}>
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
          <div className="px-5 py-1.5 bg-[#0e393d]/3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ceab84]/80">
              {HE_DOMAIN_LABEL[domain] ?? domain}
            </span>
          </div>
          <div className="divide-y divide-[#0e393d]/5">
            {byDomain[domain].map((r) => {
              const def = r.biomarkers;
              const name = locName(def?.name) || '—';
              return (
                <div key={r.id} className="px-5 py-2.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-[#1c2a2b]">{name}</span>
                    {(def?.ref_range_low != null || def?.ref_range_high != null) && (
                      <span className="ml-2 text-[11px] text-[#1c2a2b]/35">
                        Ref: {def?.ref_range_low ?? '—'}–{def?.ref_range_high ?? '—'} {def?.unit}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="tabular-nums text-sm font-semibold text-[#0e393d]">
                      {r.value_numeric}{' '}
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
        lab_results(count)
      `)
      .order('created_at', { ascending: false });

    // Apply source filter
    if (sourceFilter === 'archived') {
      query = query.not('archived_at', 'is', null);
    } else {
      query = query.is('archived_at', null).is('deleted_at', null);
      if (sourceFilter === 'evida_life') {
        // New reports: report_source = 'evida_life'; legacy: source = 'admin_import' with no report_source
        query = query.or("report_source.eq.evida_life,and(report_source.is.null,source.eq.admin_import)");
      } else if (sourceFilter === 'partner_lab') {
        query = query.eq('report_source', 'partner_lab');
      } else if (sourceFilter === 'external') {
        // New external + legacy self-reported
        query = query.or("report_source.eq.external_upload,and(report_source.is.null,source.in.(pdf_upload,manual_entry))");
      }
    }

    // Apply status filter
    if (sourceFilter !== 'archived') {
      if (statusFilter === 'pending') {
        query = query.in('status', ['ai_extracted', 'review_pending']);
      } else if (statusFilter === 'confirmed') {
        query = query.eq('status', 'confirmed');
      }
    }

    const { data } = await query;
    const raw = (data ?? []) as any[];

    let rows: LabReport[] = raw.map((r) => ({
      ...r,
      profiles: Array.isArray(r.profiles) ? r.profiles[0] ?? null : r.profiles,
      results_count: Array.isArray(r.lab_results) ? (r.lab_results[0]?.count ?? 0) : 0,
    }));

    // Client-side search
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

    // Count orphan results
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
    if (expandedResults[reportId]) return; // already loaded

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

  // ── Archive ───────────────────────────────────────────────────────────────────

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

  // ── Reactivate ────────────────────────────────────────────────────────────────

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

  // ── Permanent delete (archived only) ─────────────────────────────────────────

  const handlePermanentDelete = async (report: LabReport) => {
    const msg = `Permanently delete "${report.title}"${report.report_number ? ` (${report.report_number})` : ''}?\n\nThis will delete:\n• The report record\n• All ${report.results_count} lab results\n\nThis cannot be undone.`;
    if (!confirm(msg)) return;

    setActionLoading(report.id);

    // Hard-delete results
    await supabase.from('lab_results').delete().eq('lab_report_id', report.id);

    // Hard-delete report
    const { error } = await supabase.from('lab_reports').delete().eq('id', report.id);
    setActionLoading(null);

    if (error) { addToast('Delete failed: ' + error.message, 'error'); return; }
    addToast(`"${report.title}" permanently deleted`, 'success');
    loadReports();
  };

  // ─────────────────────────────────────────────────────────────────────────────

  const FILTER_PILLS: { id: SourceFilter; label: string }[] = [
    { id: 'all',        label: 'All' },
    { id: 'evida_life', label: '🌿 Evida Life' },
    { id: 'partner_lab',label: '🤝 Partner Lab' },
    { id: 'external',   label: '📁 External' },
    { id: 'archived',   label: '📦 Archived' },
  ];

  const STATUS_PILLS: { id: StatusFilter; label: string }[] = [
    { id: 'all',       label: 'All statuses' },
    { id: 'pending',   label: '⏳ Pending Review' },
    { id: 'confirmed', label: '✅ Confirmed' },
  ];

  return (
    <div className="space-y-4">
      <ToastContainer toasts={toasts} dismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />

      {/* Search + dates */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search user, report number, lab name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 w-64 transition"
        />
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#1c2a2b]/40">From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#1c2a2b]/40">To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition" />
        </div>
      </div>

      {/* Source + status filter pills */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {FILTER_PILLS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setSourceFilter(id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                sourceFilter === id
                  ? 'bg-[#0e393d] text-white'
                  : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30'
              }`}
            >
              {label}
            </button>
          ))}
          {orphanCount > 0 && (
            <span className="rounded-full px-3 py-1 text-xs text-[#1c2a2b]/40 ring-1 ring-[#0e393d]/10">
              {orphanCount} orphan results
            </span>
          )}
        </div>
        {sourceFilter !== 'archived' && (
          <div className="flex flex-wrap gap-2">
            {STATUS_PILLS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setStatusFilter(id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  statusFilter === id
                    ? 'bg-[#ceab84]/80 text-white'
                    : 'bg-white text-[#1c2a2b]/50 ring-1 ring-[#0e393d]/10 hover:ring-[#0e393d]/20'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sort bar */}
      {!loading && reports.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-[#1c2a2b]/50">
          <span className="mr-1">Sort:</span>
          {([
            { key: 'test_date',     label: 'Date' },
            { key: 'title',         label: 'Title' },
            { key: 'user',          label: 'User' },
            { key: 'results_count', label: 'Results' },
          ] as { key: typeof sortCol; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleSort(key)}
              className={`px-2 py-1 rounded transition ${sortCol === key ? 'font-medium text-[#0e393d]' : 'hover:text-[#0e393d]/70'}`}
            >
              {label}{sortCol === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
            </button>
          ))}
        </div>
      )}

      {/* Report cards */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner size={5} /></div>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border border-[#0e393d]/10 bg-white px-6 py-10 text-center text-sm text-[#1c2a2b]/40">
          No reports match the current filters.
        </div>
      ) : (
        <div className="space-y-3">
          {sortedReports.map((report) => {
            const isExpanded = expandedId === report.id;
            const isArchived = !!report.archived_at;
            const isLoading = actionLoading === report.id;
            const userName = [report.profiles?.first_name, report.profiles?.last_name].filter(Boolean).join(' ')
              || report.profiles?.email || '—';

            return (
              <div key={report.id} className={`rounded-xl border overflow-hidden transition ${
                isArchived ? 'border-gray-200 bg-gray-50/50' : 'border-[#0e393d]/10 bg-white'
              }`}>
                {/* Card header */}
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: title + meta */}
                    <button
                      onClick={() => toggleExpand(report.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {isArchived
                          ? <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-gray-100 text-gray-500 ring-1 ring-gray-300/50">📦 Archived</span>
                          : sourceBadge(report.source, report.report_source)
                        }
                        {!isArchived && reportStatusBadge(report.status)}
                        <span className="font-semibold text-[#0e393d] text-sm">{report.title}</span>
                        {report.report_number && (
                          <span className="font-mono text-[11px] text-[#1c2a2b]/40">{report.report_number}</span>
                        )}
                      </div>
                      <p className="text-xs text-[#1c2a2b]/50">
                        {report.lab_address ? `${report.lab_address} · ` : ''}
                        {fmtDate(report.test_date)} · {userName} · {report.results_count} biomarkers
                      </p>
                    </button>

                    {/* Right: actions + chevron */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isLoading ? (
                        <Spinner size={4} />
                      ) : isArchived ? (
                        <>
                          <button
                            onClick={() => handleReactivate(report)}
                            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium transition"
                          >
                            Reactivate
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(report)}
                            className="text-xs text-red-500 hover:text-red-700 font-medium transition"
                          >
                            Delete permanently
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleArchive(report)}
                          className="text-xs text-[#1c2a2b]/40 hover:text-[#1c2a2b]/70 font-medium transition"
                        >
                          Archive
                        </button>
                      )}
                      <button onClick={() => toggleExpand(report.id)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
                          className={`text-[#1c2a2b]/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded results */}
                {isExpanded && (
                  <div className="border-t border-[#0e393d]/8">
                    {loadingResults === report.id ? (
                      <div className="flex justify-center py-6"><Spinner size={4} /></div>
                    ) : (expandedResults[report.id]?.length ?? 0) > 0 ? (
                      <ReportResults results={expandedResults[report.id]!} />
                    ) : (
                      <p className="px-5 py-4 text-sm text-[#1c2a2b]/40 text-center">No results in this report.</p>
                    )}

                    {/* Lab contact info */}
                    {(report.lab_address || report.lab_email || report.lab_phone) && (
                      <div className="border-t border-[#0e393d]/6 px-5 py-3 flex flex-wrap gap-4 text-xs text-[#1c2a2b]/50">
                        {report.lab_address && <span>📍 {report.lab_address}</span>}
                        {report.lab_email   && <span>✉️ {report.lab_email}</span>}
                        {report.lab_phone   && <span>📞 {report.lab_phone}</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
