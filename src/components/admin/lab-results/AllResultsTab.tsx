'use client';

import { useCallback, useEffect, useState } from 'react';
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

type SourceFilter = 'all' | 'admin_import' | 'self_reported' | 'archived';

// ─── Source label helper ──────────────────────────────────────────────────────

function sourceBadge(source: string) {
  if (source === 'admin_import') {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-[#0C9C6C]/10 text-[#0C9C6C] ring-1 ring-[#0C9C6C]/20 whitespace-nowrap">
        🌿 Evida Life
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-[#CEAB84]/15 text-[#7a5e20] ring-1 ring-[#CEAB84]/30 whitespace-nowrap">
      📝 Self-Reported
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
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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
        id, title, test_date, source, report_number, archived_at, created_at,
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
      if (sourceFilter === 'admin_import') {
        query = query.eq('source', 'admin_import');
      } else if (sourceFilter === 'self_reported') {
        query = query.in('source', ['pdf_upload', 'manual_entry']);
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
  }, [supabase, sourceFilter, search, dateFrom, dateTo]);

  useEffect(() => { loadReports(); }, [loadReports]);

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
    { id: 'all',          label: 'All' },
    { id: 'admin_import', label: '🌿 Evida Life' },
    { id: 'self_reported',label: '📝 Self-Reported' },
    { id: 'archived',     label: '📦 Archived' },
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

      {/* Source filter pills */}
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
            {orphanCount} orphan results (no report)
          </span>
        )}
      </div>

      {/* Report cards */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner size={5} /></div>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border border-[#0e393d]/10 bg-white px-6 py-10 text-center text-sm text-[#1c2a2b]/40">
          No reports match the current filters.
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
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
                          : sourceBadge(report.source)
                        }
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
