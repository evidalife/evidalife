'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Badge, FlagBadge, SectionHeading, Spinner, Toast, ToastContainer, fmtDate, locName, nextToastId } from './shared';

// ─── Types ────────────────────────────────────────────────────────────────────

type Review = {
  id: string;
  review_type: string;
  severity: string;
  message: string;
  original_value: string | null;
  suggested_value: string | null;
  is_resolved: boolean;
  created_at: string;
  lab_results: {
    id: string;
    value_numeric: number | null;
    unit: string | null;
    status_flag: string | null;
    source: string | null;
    measured_at: string | null;
    biomarkers: {
      name: Record<string, string> | string | null;
    } | null;
    profiles: {
      first_name: string | null;
      last_name: string | null;
      email: string | null;
    } | null;
  } | null;
};

type TypeFilter = 'all' | 'low_confidence' | 'plausibility_warning' | 'duplicate_detected' | 'unmapped_biomarker';
type SeverityFilter = 'all' | 'critical' | 'warning' | 'info';

type PendingReport = {
  id: string;
  title: string;
  test_date: string | null;
  status: string;
  created_at: string;
  profiles: { first_name: string | null; last_name: string | null; email: string | null } | null;
};

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  low_confidence:      'Low Confidence',
  plausibility_warning: 'Plausibility',
  duplicate_detected:  'Duplicate',
  unmapped_biomarker:  'Unmapped',
};

const TYPE_COLOR: Record<string, string> = {
  low_confidence:      'bg-amber-50 text-amber-700 ring-amber-600/20',
  plausibility_warning: 'bg-red-50 text-red-700 ring-red-600/20',
  duplicate_detected:  'bg-violet-50 text-violet-700 ring-violet-600/20',
  unmapped_biomarker:  'bg-gray-50 text-gray-600 ring-gray-500/20',
};

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, info: 2 };

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'bg-red-50 text-red-700 ring-red-600/20',
  warning:  'bg-amber-50 text-amber-700 ring-amber-600/20',
  info:     'bg-sky-50 text-sky-700 ring-sky-600/20',
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function ReviewQueueTab({ onCountChange }: { onCountChange?: (n: number) => void }) {
  const supabase = createClient();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [pendingReports, setPendingReports] = useState<PendingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [sortCol, setSortCol] = useState<'created_at' | 'severity'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [editMode, setEditMode] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((msg: string, type: Toast['type'] = 'success') => {
    const id = nextToastId();
    setToasts((p) => [...p, { id, message: msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 5000);
  }, []);

  const loadReviews = useCallback(async () => {
    setLoading(true);

    const [reviewsRes, pendingRes] = await Promise.all([
      supabase
        .from('lab_result_reviews')
        .select(`
          id, review_type, severity, message, original_value, suggested_value, is_resolved, created_at,
          lab_results:lab_result_id (
            id, value_numeric, unit, status_flag, source, measured_at,
            biomarkers:biomarker_definition_id ( name ),
            profiles:user_id ( first_name, last_name, email )
          )
        `)
        .eq('is_resolved', false)
        .order('created_at', { ascending: true })
        .limit(200),
      supabase
        .from('lab_reports')
        .select('id, title, test_date, status, created_at, profiles:user_id (first_name, last_name, email)')
        .in('status', ['ai_extracted', 'review_pending'])
        .is('archived_at', null)
        .order('created_at', { ascending: false }),
    ]);

    const items = (reviewsRes.data as unknown as Review[]) ?? [];
    const pending = (pendingRes.data as unknown as PendingReport[]) ?? [];
    setReviews(items);
    setPendingReports(pending);
    onCountChange?.(items.length + pending.length);
    setLoading(false);
  }, [supabase, onCountChange]);

  useEffect(() => { loadReviews(); }, []);

  const handleAction = async (reviewId: string, action: 'approve' | 'edit_approve' | 'reject') => {
    setActionLoading(reviewId + action);
    const body: any = { reviewId, action };
    if (action === 'edit_approve') {
      const val = editValues[reviewId];
      if (!val) { addToast('Enter a new value first', 'error'); setActionLoading(null); return; }
      body.newValue = val;
    }
    const res = await fetch('/api/admin/lab-results/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setActionLoading(null);
    setEditMode(null);
    if (!data.success) { addToast(data.error ?? 'Action failed', 'error'); return; }
    addToast(action === 'reject' ? 'Result rejected and removed' : 'Review resolved', 'success');
    loadReviews();
  };

  const filtered = reviews.filter((r) => {
    if (typeFilter !== 'all' && r.review_type !== typeFilter) return false;
    if (severityFilter !== 'all' && r.severity !== severityFilter) return false;
    return true;
  });

  const handleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
  };

  const sortedFiltered = useMemo(() => [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortCol === 'severity') cmp = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
    else cmp = a.created_at.localeCompare(b.created_at);
    return sortDir === 'asc' ? cmp : -cmp;
  }), [filtered, sortCol, sortDir]);

  // Stats
  const typeCounts = reviews.reduce((acc: Record<string, number>, r) => {
    acc[r.review_type] = (acc[r.review_type] || 0) + 1;
    return acc;
  }, {});

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} dismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Pending', value: reviews.length, cls: 'text-[#0e393d]' },
          { label: 'Low Confidence', value: typeCounts.low_confidence ?? 0, cls: 'text-amber-600' },
          { label: 'Plausibility', value: typeCounts.plausibility_warning ?? 0, cls: 'text-red-600' },
          { label: 'Duplicates', value: typeCounts.duplicate_detected ?? 0, cls: 'text-violet-600' },
        ].map(({ label, value, cls }) => (
          <div key={label} className="rounded-lg border border-[#0e393d]/8 bg-white px-4 py-3 text-center">
            <div className={`text-2xl font-bold ${cls}`}>{value}</div>
            <div className="text-xs text-[#1c2a2b]/50 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Pending reports awaiting review */}
      {pendingReports.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0e393d]/60 mb-2">
            Reports Awaiting Review ({pendingReports.length})
          </p>
          <div className="space-y-2">
            {pendingReports.map((r) => {
              const userName = r.profiles
                ? [r.profiles.first_name, r.profiles.last_name].filter(Boolean).join(' ') || r.profiles.email
                : '—';
              const statusCls = r.status === 'ai_extracted'
                ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-600/20'
                : 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20';
              const statusLabel = r.status === 'ai_extracted' ? '🤖 AI Extracted' : '⏳ Review Pending';
              return (
                <div key={r.id} className="rounded-xl border border-[#0e393d]/10 bg-white px-4 py-3 flex items-center gap-4 flex-wrap">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${statusCls}`}>
                    {statusLabel}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1c2a2b] truncate">{r.title}</p>
                    <p className="text-xs text-[#1c2a2b]/40">{userName} · {fmtDate(r.test_date ?? r.created_at)}</p>
                  </div>
                  <p className="text-xs text-[#1c2a2b]/40 shrink-0">Open the PDF Upload tab to review</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'low_confidence', 'plausibility_warning', 'duplicate_detected', 'unmapped_biomarker'] as TypeFilter[]).map((t) => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${typeFilter === t ? 'bg-[#0e393d] text-white' : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30'}`}>
            {t === 'all' ? `All (${reviews.length})` : `${TYPE_LABEL[t]} (${typeCounts[t] ?? 0})`}
          </button>
        ))}
        <span className="border-l border-[#0e393d]/10 mx-1" />
        {(['all', 'critical', 'warning', 'info'] as SeverityFilter[]).map((s) => (
          <button key={s} onClick={() => setSeverityFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${severityFilter === s ? 'bg-[#0e393d] text-white' : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30'}`}>
            {s === 'all' ? 'All severities' : s}
          </button>
        ))}
      </div>

      {/* Sort bar */}
      {!loading && filtered.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-[#1c2a2b]/50">
          <span className="mr-1">Sort:</span>
          {([
            { key: 'created_at', label: 'Date' },
            { key: 'severity',   label: 'Severity' },
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

      {/* Review list */}
      {loading ? (
        <div className="flex justify-center py-10"><Spinner size={6} /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-[#0e393d]/10 bg-[#fafaf8] py-12 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="font-medium text-[#0e393d]">Review queue is clear</p>
          <p className="text-xs text-[#1c2a2b]/40 mt-1">No pending reviews match the current filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedFiltered.map((review) => {
            const lr = review.lab_results;
            const bmName = locName(lr?.biomarkers?.name) || '—';
            const userName = lr?.profiles
              ? [lr.profiles.first_name, lr.profiles.last_name].filter(Boolean).join(' ') || lr.profiles.email
              : '—';
            const isEditing = editMode === review.id;
            const actionBusy = actionLoading?.startsWith(review.id);

            return (
              <div key={review.id} className={`rounded-xl border bg-white px-5 py-4 space-y-3 ${review.severity === 'critical' ? 'border-red-200' : 'border-[#0e393d]/10'}`}>
                {/* Header */}
                <div className="flex items-start gap-3 flex-wrap">
                  <Badge className={TYPE_COLOR[review.review_type] ?? 'bg-gray-50 text-gray-600 ring-gray-500/20'}>
                    {TYPE_LABEL[review.review_type] ?? review.review_type}
                  </Badge>
                  <Badge className={SEVERITY_COLOR[review.severity] ?? 'bg-gray-50 text-gray-600 ring-gray-500/20'}>
                    {review.severity}
                  </Badge>
                  <span className="text-xs text-[#1c2a2b]/40 mt-0.5">{fmtDate(review.created_at)}</span>
                </div>

                {/* Message */}
                <p className="text-sm text-[#1c2a2b]">{review.message}</p>

                {/* Lab result details */}
                {lr && (
                  <div className="rounded-lg bg-[#fafaf8] border border-[#0e393d]/6 px-4 py-3 flex items-center gap-6 flex-wrap">
                    <div>
                      <div className="text-[10px] text-[#1c2a2b]/40 uppercase tracking-wider mb-0.5">Biomarker</div>
                      <div className="text-xs font-medium text-[#1c2a2b]">{bmName}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#1c2a2b]/40 uppercase tracking-wider mb-0.5">Patient</div>
                      <div className="text-xs text-[#1c2a2b]">{userName}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#1c2a2b]/40 uppercase tracking-wider mb-0.5">Value</div>
                      <div className="text-xs font-medium text-[#0e393d]">{lr.value_numeric} {lr.unit}</div>
                    </div>
                    {review.original_value && (
                      <div>
                        <div className="text-[10px] text-[#1c2a2b]/40 uppercase tracking-wider mb-0.5">Original</div>
                        <div className="text-xs text-[#1c2a2b]">{review.original_value}</div>
                      </div>
                    )}
                    <FlagBadge flag={lr.status_flag} />
                    <div>
                      <div className="text-[10px] text-[#1c2a2b]/40 uppercase tracking-wider mb-0.5">Source</div>
                      <div className="text-xs text-[#1c2a2b]/60">{lr.source || 'manual'}</div>
                    </div>
                    {lr.measured_at && (
                      <div>
                        <div className="text-[10px] text-[#1c2a2b]/40 uppercase tracking-wider mb-0.5">Date</div>
                        <div className="text-xs text-[#1c2a2b]/60">{fmtDate(lr.measured_at)}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Edit & approve input */}
                {isEditing && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number" step="0.01"
                      placeholder="Corrected value"
                      value={editValues[review.id] ?? lr?.value_numeric ?? ''}
                      onChange={(e) => setEditValues((prev) => ({ ...prev, [review.id]: e.target.value }))}
                      className="rounded-lg border border-[#0e393d]/15 bg-white px-3 py-1.5 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    disabled={!!actionBusy}
                    onClick={() => handleAction(review.id, 'approve')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {actionLoading === review.id + 'approve' ? <Spinner size={3} /> : null}
                    Approve
                  </button>
                  <button
                    disabled={!!actionBusy}
                    onClick={() => setEditMode(isEditing ? null : review.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50 ${isEditing ? 'bg-[#0e393d] text-white' : 'bg-[#0e393d]/8 text-[#0e393d] hover:bg-[#0e393d]/15'}`}
                  >
                    {isEditing ? (
                      <span onClick={(e) => { e.stopPropagation(); handleAction(review.id, 'edit_approve'); }}>
                        Save & Approve
                      </span>
                    ) : 'Edit & Approve'}
                  </button>
                  <button
                    disabled={!!actionBusy}
                    onClick={() => handleAction(review.id, 'reject')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {actionLoading === review.id + 'reject' ? <Spinner size={3} /> : null}
                    Reject & Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
