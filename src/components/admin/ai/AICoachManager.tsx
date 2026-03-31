'use client';

import { useState, useEffect, useCallback } from 'react';
import PageShell from '@/components/admin/PageShell';

interface BriefingRow {
  id: string;
  user_id: string;
  lang: string;
  model_used: string;
  tokens_used: number | null;
  duration_ms: number | null;
  created_at: string;
  user: { first_name: string | null; last_name: string | null; email: string } | null;
}

interface Stats {
  total: number;
  unique_users: number;
  avg_per_user: number;
  lang_counts: Record<string, number>;
}

const LANG_FLAGS: Record<string, string> = { en: '🇬🇧', de: '🇨🇭', fr: '🇫🇷', es: '🇪🇸', it: '🇮🇹' };

function fmt(iso: string) {
  return new Date(iso).toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'short' });
}

function fmtDuration(ms: number | null) {
  if (!ms) return '—';
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function AICoachManager() {
  const [briefings, setBriefings] = useState<BriefingRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/ai-briefings?limit=100');
    if (res.ok) {
      const data = await res.json();
      setBriefings(data.briefings ?? []);
      setStats(data.stats ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const deleteBriefing = async (id: string) => {
    if (!confirm('Delete this briefing log entry?')) return;
    setDeleting(id);
    await fetch('/api/admin/ai-briefings', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setBriefings(prev => prev.filter(b => b.id !== id));
    setDeleting(null);
  };

  return (
    <PageShell
      title="AI Health Coach"
      description="View generated briefings, usage stats, and feature status."
    >
      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Briefings', value: stats.total.toLocaleString() },
            { label: 'Unique Users', value: stats.unique_users.toLocaleString() },
            { label: 'Avg / User', value: stats.avg_per_user.toFixed(1) },
            {
              label: 'Languages',
              value: Object.entries(stats.lang_counts)
                .map(([l, n]) => `${LANG_FLAGS[l] ?? l} ${n}`)
                .join('  '),
            },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-[#0e393d]/[.07] p-5">
              <div className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#1c2a2b]/40 mb-1.5">{label}</div>
              <div className="text-xl font-semibold text-[#0e393d]">{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Briefing log table */}
      <div className="bg-white rounded-xl border border-[#0e393d]/[.07] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#0e393d]/[.06] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#0e393d]">Recent Briefings</h2>
          <button
            onClick={load}
            className="text-[11px] text-[#0e393d]/50 hover:text-[#0e393d] transition-colors flex items-center gap-1.5"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-[#1c2a2b]/40">Loading…</div>
        ) : briefings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0e393d" strokeWidth="1.2" opacity="0.2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <div className="text-sm text-[#1c2a2b]/40">No briefings generated yet</div>
          </div>
        ) : (
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[#0e393d]/[.05]">
                {['User', 'Lang', 'Model', 'Tokens', 'Duration', 'Date', ''].map(h => (
                  <th key={h} className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#1c2a2b]/35">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0e393d]/[.04]">
              {briefings.map(b => (
                <tr key={b.id} className="hover:bg-[#fafaf8] transition-colors">
                  <td className="px-5 py-3">
                    {b.user ? (
                      <div>
                        <div className="font-medium text-[#0e393d]">
                          {[b.user.first_name, b.user.last_name].filter(Boolean).join(' ') || '—'}
                        </div>
                        <div className="text-[10px] text-[#1c2a2b]/35">{b.user.email}</div>
                      </div>
                    ) : (
                      <span className="text-[#1c2a2b]/30">{b.user_id.slice(0, 8)}…</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-base">{LANG_FLAGS[b.lang] ?? b.lang}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-mono text-[10px] bg-[#0e393d]/[.05] px-2 py-0.5 rounded">
                      {b.model_used.replace('claude-', '').replace('-4-6', ' 4.6').replace('-4-5', ' 4.5')}
                    </span>
                  </td>
                  <td className="px-5 py-3 tabular-nums text-[#1c2a2b]/60">
                    {b.tokens_used?.toLocaleString() ?? '—'}
                  </td>
                  <td className="px-5 py-3 tabular-nums text-[#1c2a2b]/60">
                    {fmtDuration(b.duration_ms)}
                  </td>
                  <td className="px-5 py-3 text-[#1c2a2b]/40">{fmt(b.created_at)}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => deleteBriefing(b.id)}
                      disabled={deleting === b.id}
                      className="text-[#1c2a2b]/20 hover:text-red-400 transition-colors disabled:opacity-30"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4h6v2" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PageShell>
  );
}
