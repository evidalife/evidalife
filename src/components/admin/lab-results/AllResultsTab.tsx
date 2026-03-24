'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Badge, FlagBadge, HE_DOMAIN_LABEL, Spinner, Toast, ToastContainer, fmtDate, locName, nextToastId } from './shared';

// ─── Types ────────────────────────────────────────────────────────────────────

type LabResult = {
  id: string;
  value_numeric: number | null;
  unit: string | null;
  status_flag: string | null;
  source: string | null;
  is_reviewed: boolean | null;
  measured_at: string | null;
  test_date: string | null;
  notes: string | null;
  biomarkers: {
    name: Record<string, string> | string | null;
    he_domain: string | null;
    ref_range_low: number | null;
    ref_range_high: number | null;
    optimal_range_low: number | null;
    optimal_range_high: number | null;
    unit: string | null;
  } | null;
  profiles: { first_name: string | null; last_name: string | null; email: string | null } | null;
  orders: { order_number: string | null } | null;
};

type SortKey = 'measured_at' | 'value_numeric' | 'status_flag';
type SourceFilter = 'all' | 'manual' | 'pdf_upload' | 'lab_api' | 'user_upload';
type FlagFilter = 'all' | 'optimal' | 'good' | 'moderate' | 'risk';
type DomainFilter = 'all' | string;
type ReviewedFilter = 'all' | 'reviewed' | 'pending';

// ─── Main component ───────────────────────────────────────────────────────────

export default function AllResultsTab() {
  const supabase = createClient();

  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [flagFilter, setFlagFilter] = useState<FlagFilter>('all');
  const [domainFilter, setDomainFilter] = useState<DomainFilter>('all');
  const [reviewedFilter, setReviewedFilter] = useState<ReviewedFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('measured_at');
  const [sortAsc, setSortAsc] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((msg: string, type: Toast['type'] = 'success') => {
    const id = nextToastId();
    setToasts((p) => [...p, { id, message: msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 5000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('lab_results')
      .select(`
        id, value_numeric, unit, status_flag, source, is_reviewed, measured_at, test_date, notes,
        biomarkers:biomarker_definition_id (
          name, he_domain, ref_range_low, ref_range_high, optimal_range_low, optimal_range_high, unit
        ),
        profiles:user_id ( first_name, last_name, email ),
        orders:order_id ( order_number )
      `)
      .is('deleted_at', null)
      .order(sortKey, { ascending: sortAsc })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (sourceFilter !== 'all') query = query.eq('source', sourceFilter);
    if (flagFilter !== 'all') query = query.eq('status_flag', flagFilter);
    if (reviewedFilter !== 'all') query = query.eq('is_reviewed', reviewedFilter === 'reviewed');
    if (dateFrom) query = query.gte('test_date', dateFrom);
    if (dateTo) query = query.lte('test_date', dateTo);

    const { data } = await query;
    let rows = (data as unknown as LabResult[]) ?? [];

    // Client-side filter: domain (joined field) and search
    if (domainFilter !== 'all') rows = rows.filter((r) => r.biomarkers?.he_domain === domainFilter);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => {
        const name = locName(r.biomarkers?.name).toLowerCase();
        const email = r.profiles?.email?.toLowerCase() ?? '';
        const fname = `${r.profiles?.first_name ?? ''} ${r.profiles?.last_name ?? ''}`.toLowerCase();
        const orderNum = r.orders?.order_number?.toLowerCase() ?? '';
        return name.includes(q) || email.includes(q) || fname.includes(q) || orderNum.includes(q);
      });
    }

    setResults(rows);
    setLoading(false);
  }, [supabase, page, sortKey, sortAsc, sourceFilter, flagFilter, domainFilter, reviewedFilter, dateFrom, dateTo, search]);

  useEffect(() => { load(); }, [load]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(false); }
    setPage(0);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };

  const toggleSelectAll = () => {
    if (selected.size === results.length) setSelected(new Set());
    else setSelected(new Set(results.map((r) => r.id)));
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} selected results?`)) return;
    setBulkLoading(true);
    await supabase.from('lab_results').update({ deleted_at: new Date().toISOString() }).in('id', Array.from(selected));
    setSelected(new Set());
    setBulkLoading(false);
    addToast(`${selected.size} results deleted`, 'success');
    load();
  };

  // Bulk mark reviewed
  const handleBulkReview = async () => {
    setBulkLoading(true);
    await supabase.from('lab_results').update({ is_reviewed: true }).in('id', Array.from(selected));
    setBulkLoading(false);
    setSelected(new Set());
    addToast('Marked as reviewed', 'success');
    load();
  };

  // CSV Export
  const handleExport = () => {
    const params = new URLSearchParams();
    if (sourceFilter !== 'all') params.set('source', sourceFilter);
    if (flagFilter !== 'all') params.set('status_flag', flagFilter);
    if (domainFilter !== 'all') params.set('domain', domainFilter);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    window.location.href = `/api/admin/lab-results/export?format=csv&${params.toString()}`;
  };

  const SortHeader = ({ label, col }: { label: string; col: SortKey }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider cursor-pointer hover:text-[#0e393d] select-none"
      onClick={() => toggleSort(col)}
    >
      {label}
      {sortKey === col ? (sortAsc ? ' ↑' : ' ↓') : ''}
    </th>
  );

  const DOMAIN_OPTIONS = ['all', 'heart_vessels', 'metabolism', 'inflammation', 'organ_function', 'nutrients', 'hormones', 'fitness', 'longevity'];

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <ToastContainer toasts={toasts} dismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />

      {/* Search + export */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search user, biomarker, order…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition w-64"
        />
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#1c2a2b]/40">From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#1c2a2b]/40">To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition" />
        </div>
        <button onClick={handleExport} className="ml-auto px-3 py-2 rounded-lg text-xs font-medium text-[#0e393d] bg-[#0e393d]/8 hover:bg-[#0e393d]/15 transition flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export CSV
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {/* Source */}
        {(['all', 'manual', 'pdf_upload', 'lab_api', 'user_upload'] as SourceFilter[]).map((s) => (
          <button key={s} onClick={() => { setSourceFilter(s); setPage(0); }}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${sourceFilter === s ? 'bg-[#0e393d] text-white' : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30'}`}>
            {s === 'all' ? 'All sources' : s.replace('_', ' ')}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {/* Flag */}
        {(['all', 'optimal', 'good', 'moderate', 'risk'] as FlagFilter[]).map((f) => (
          <button key={f} onClick={() => { setFlagFilter(f); setPage(0); }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${flagFilter === f ? 'bg-[#0e393d] text-white' : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30'}`}>
            {f === 'all' ? 'All flags' : f}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {/* Domain */}
        {DOMAIN_OPTIONS.map((d) => (
          <button key={d} onClick={() => { setDomainFilter(d); setPage(0); }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${domainFilter === d ? 'bg-[#CEAB84] text-white' : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#CEAB84]/30 hover:ring-[#CEAB84]/50'}`}>
            {d === 'all' ? 'All domains' : (HE_DOMAIN_LABEL[d] ?? d)}
          </button>
        ))}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-[#0e393d]/6 border border-[#0e393d]/15 px-4 py-2.5">
          <span className="text-xs font-medium text-[#0e393d]">{selected.size} selected</span>
          <button onClick={handleBulkReview} disabled={bulkLoading} className="text-xs px-3 py-1 rounded bg-[#0e393d] text-white hover:bg-[#0e393d]/85 transition disabled:opacity-50">Mark reviewed</button>
          <button onClick={handleBulkDelete} disabled={bulkLoading} className="text-xs px-3 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50 flex items-center gap-1">
            {bulkLoading && <Spinner size={3} />} Delete selected
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-[#1c2a2b]/40 hover:text-[#1c2a2b] ml-auto">Clear</button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/3">
              <th className="px-4 py-3 w-8">
                <input type="checkbox" checked={selected.size === results.length && results.length > 0} onChange={toggleSelectAll} className="rounded border-[#0e393d]/30 accent-[#0e393d]" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Biomarker</th>
              <SortHeader label="Value" col="value_numeric" />
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Domain</th>
              <SortHeader label="Flag" col="status_flag" />
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Source</th>
              <SortHeader label="Date" col="measured_at" />
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Order</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Reviewed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0e393d]/6">
            {loading && (
              <tr><td colSpan={10} className="px-4 py-10 text-center"><div className="inline-flex justify-center"><Spinner size={5} /></div></td></tr>
            )}
            {!loading && results.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-sm text-[#1c2a2b]/40">No results match the current filters.</td></tr>
            )}
            {!loading && results.map((r) => {
              const pid = r.biomarkers;
              const userName = [r.profiles?.first_name, r.profiles?.last_name].filter(Boolean).join(' ') || r.profiles?.email || '—';
              const bmName = locName(pid?.name) || '—';
              const isExpanded = expandedRow === r.id;

              return (
                <>
                  <tr key={r.id}
                    onClick={() => setExpandedRow(isExpanded ? null : r.id)}
                    className="hover:bg-[#fafaf8] transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} className="rounded border-[#0e393d]/30 accent-[#0e393d]" />
                    </td>
                    <td className="px-4 py-3 text-xs text-[#1c2a2b]">{userName}</td>
                    <td className="px-4 py-3 text-xs font-medium text-[#1c2a2b]">{bmName}</td>
                    <td className="px-4 py-3 text-xs tabular-nums text-[#0e393d] font-medium">{r.value_numeric} <span className="text-[#1c2a2b]/40 font-normal">{r.unit || pid?.unit}</span></td>
                    <td className="px-4 py-3 text-xs text-[#1c2a2b]/60">{HE_DOMAIN_LABEL[pid?.he_domain ?? ''] ?? '—'}</td>
                    <td className="px-4 py-3"><FlagBadge flag={r.status_flag} /></td>
                    <td className="px-4 py-3 text-xs text-[#1c2a2b]/50 capitalize">{r.source?.replace('_', ' ') || 'manual'}</td>
                    <td className="px-4 py-3 text-xs text-[#1c2a2b]/50 whitespace-nowrap">{fmtDate(r.test_date || r.measured_at)}</td>
                    <td className="px-4 py-3 text-xs font-mono text-[#1c2a2b]/50">{r.orders?.order_number || '—'}</td>
                    <td className="px-4 py-3">
                      {r.is_reviewed
                        ? <span className="text-[11px] text-emerald-600">✓ Reviewed</span>
                        : <Badge className="bg-amber-50 text-amber-700 ring-amber-600/20">Pending</Badge>
                      }
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={r.id + '-expanded'}>
                      <td colSpan={10} className="px-8 py-4 bg-[#fafaf8] border-b border-[#0e393d]/6">
                        <div className="flex flex-wrap gap-8">
                          {pid?.ref_range_low != null && (
                            <div>
                              <div className="text-[10px] text-[#1c2a2b]/40 uppercase tracking-wider mb-0.5">Reference Range</div>
                              <div className="text-xs text-[#1c2a2b]">{pid.ref_range_low} – {pid.ref_range_high ?? '—'} {pid.unit}</div>
                            </div>
                          )}
                          {pid?.optimal_range_low != null && (
                            <div>
                              <div className="text-[10px] text-[#1c2a2b]/40 uppercase tracking-wider mb-0.5">Optimal Range</div>
                              <div className="text-xs text-[#1c2a2b]">{pid.optimal_range_low} – {pid.optimal_range_high ?? '—'} {pid.unit}</div>
                            </div>
                          )}
                          {r.notes && (
                            <div>
                              <div className="text-[10px] text-[#1c2a2b]/40 uppercase tracking-wider mb-0.5">Notes</div>
                              <div className="text-xs text-[#1c2a2b]">{r.notes}</div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-[#1c2a2b]/50">
        <span>Page {page + 1}</span>
        <div className="flex gap-2">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
            className="px-3 py-1 rounded bg-white ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30 disabled:opacity-40 transition">
            ← Previous
          </button>
          <button onClick={() => setPage((p) => p + 1)} disabled={results.length < PAGE_SIZE}
            className="px-3 py-1 rounded bg-white ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30 disabled:opacity-40 transition">
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
