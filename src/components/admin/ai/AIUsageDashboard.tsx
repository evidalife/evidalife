'use client';

import { useEffect, useState, useCallback } from 'react';
import PageShell from '@/components/admin/PageShell';

// ── Types ────────────────────────────────────────────────────────────────────

type ElevenLabsBalance = {
  ok: boolean;
  characterCount?: number;
  characterLimit?: number;
  remaining?: number;
  tier?: string;
  nextReset?: string | null;
  error?: string;
};

type ProviderRow = {
  provider: string;
  call_count: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_characters: number;
  total_cost: number;
};

type EndpointRow = {
  endpoint: string;
  provider: string;
  call_count: number;
  total_cost: number;
};

type DailyRow = {
  day: string;
  provider: string;
  call_count: number;
  total_cost: number;
};

type TopUserRow = {
  user_id: string;
  call_count: number;
  total_cost: number;
  total_tokens: number;
};

type RecentCall = {
  id: string;
  user_id: string | null;
  provider: string;
  endpoint: string;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  characters: number;
  estimated_cost_usd: number;
  duration_ms: number | null;
  created_at: string;
};

type Totals = {
  total_calls: number;
  total_cost: number;
  total_tokens: number;
  total_characters: number;
};

type OpenAIBalance = {
  ok: boolean;
  totalGranted?: number;
  totalUsed?: number;
  remaining?: number;
  note?: string;
  error?: string;
};

type DeepgramBalance = {
  ok: boolean;
  remainingCredits?: number;
  note?: string;
  error?: string;
};

type UsageData = {
  balances: {
    anthropic: { ok: boolean };
    openai: OpenAIBalance;
    elevenlabs: ElevenLabsBalance;
    deepgram: DeepgramBalance;
  };
  byProvider: ProviderRow[];
  byEndpoint: EndpointRow[];
  daily: DailyRow[];
  topUsers: TopUserRow[];
  recent: RecentCall[];
  totals: Totals;
  period: { days: number; since: string };
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCost(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatChars(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function providerColor(p: string): string {
  switch (p) {
    case 'anthropic': return '#d97706';
    case 'elevenlabs': return '#7c3aed';
    case 'openai': return '#059669';
    case 'deepgram': return '#0ea5e9';
    default: return '#6b7280';
  }
}

function providerLabel(p: string): string {
  switch (p) {
    case 'anthropic': return 'Anthropic (Claude)';
    case 'elevenlabs': return 'ElevenLabs';
    case 'openai': return 'OpenAI';
    case 'deepgram': return 'Deepgram';
    default: return p;
  }
}

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 2) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(ms / 3_600_000);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(ms / 86_400_000);
  return `${d}d ago`;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AIUsageDashboard() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/ai-usage?days=${days}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <PageShell
      title="AI Usage"
      description="Monitor API credits, costs, and usage across all AI providers."
      action={
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="rounded-lg border border-[#0e393d]/[.12] px-3 py-1.5 text-[12px] text-[#0e393d] bg-[#fafaf8] outline-none focus:border-[#0e393d]/30 transition-colors"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0e393d] text-white text-[13px] font-medium hover:bg-[#0e393d]/90 disabled:opacity-40 transition-all"
          >
            {loading && (
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            Refresh
          </button>
        </div>
      }
    >
      {error && (
        <div className="mb-6 flex items-center gap-2 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="rounded-xl border border-[#0e393d]/10 bg-white p-12 text-center text-sm text-[#1c2a2b]/40">
          Loading AI usage data…
        </div>
      ) : data ? (
        <div className="space-y-6">

          {/* ── API Key Status + Credit Balances ────────────────────── */}
          <div className="bg-white rounded-xl border border-[#0e393d]/[.07] p-6">
            <h2 className="text-[13px] font-semibold text-[#0e393d] mb-4">API Provider Status</h2>
            <div className="grid grid-cols-4 gap-4">
              {/* Anthropic */}
              <StatusCard
                label="Anthropic (Claude)"
                note="Briefings, chat, email assist"
                color="#d97706"
                configured={data.balances.anthropic.ok}
                rechargeUrl="https://console.anthropic.com/settings/billing"
              />
              {/* ElevenLabs */}
              <ElevenLabsCard data={data.balances.elevenlabs} />
              {/* OpenAI */}
              <OpenAICard data={data.balances.openai} />
              {/* Deepgram */}
              <DeepgramCard data={data.balances.deepgram} />
            </div>
          </div>

          {/* ── Summary KPIs ───────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPI label="Total Calls" value={String(data.totals.total_calls)} />
            <KPI label="Est. Total Cost" value={formatCost(Number(data.totals.total_cost))} />
            <KPI label="Total Tokens" value={formatTokens(Number(data.totals.total_tokens))} />
            <KPI label="TTS Characters" value={formatChars(Number(data.totals.total_characters))} />
          </div>

          {/* ── Usage by Provider ──────────────────────────────────── */}
          {data.byProvider.length > 0 && (
            <div className="bg-white rounded-xl border border-[#0e393d]/[.07] p-6">
              <h2 className="text-[13px] font-semibold text-[#0e393d] mb-4">Usage by Provider <span className="font-normal text-[#1c2a2b]/35">({days}d)</span></h2>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-[#0e393d]/[.07]">
                      <th className="pb-2.5 text-left text-[10px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40">Provider</th>
                      <th className="pb-2.5 text-right text-[10px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40">Calls</th>
                      <th className="pb-2.5 text-right text-[10px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40">Input Tokens</th>
                      <th className="pb-2.5 text-right text-[10px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40">Output Tokens</th>
                      <th className="pb-2.5 text-right text-[10px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40">Characters</th>
                      <th className="pb-2.5 text-right text-[10px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40">Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byProvider.map(r => (
                      <tr key={r.provider} className="border-b border-[#0e393d]/[.04] hover:bg-[#0e393d]/[.015] transition-colors">
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: providerColor(r.provider) }} />
                            <span className="text-[#0e393d] font-medium">{providerLabel(r.provider)}</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-right text-[#1c2a2b]/60">{r.call_count}</td>
                        <td className="py-2.5 text-right text-[#1c2a2b]/60">{formatTokens(r.total_input_tokens)}</td>
                        <td className="py-2.5 text-right text-[#1c2a2b]/60">{formatTokens(r.total_output_tokens)}</td>
                        <td className="py-2.5 text-right text-[#1c2a2b]/60">{r.total_characters > 0 ? formatChars(r.total_characters) : '—'}</td>
                        <td className="py-2.5 text-right font-semibold text-[#0e393d]">{formatCost(Number(r.total_cost))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Usage by Endpoint ──────────────────────────────────── */}
          {data.byEndpoint.length > 0 && (
            <div className="bg-white rounded-xl border border-[#0e393d]/[.07] p-6">
              <h2 className="text-[13px] font-semibold text-[#0e393d] mb-4">Usage by Endpoint <span className="font-normal text-[#1c2a2b]/35">({days}d)</span></h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.byEndpoint.map(r => (
                  <div
                    key={`${r.endpoint}-${r.provider}`}
                    className="rounded-lg border border-[#0e393d]/[.07] p-3.5 hover:border-[#0e393d]/[.15] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[12px] font-medium text-[#0e393d] capitalize">{r.endpoint}</span>
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: providerColor(r.provider) + '12', color: providerColor(r.provider) }}
                      >
                        {r.provider}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#1c2a2b]/40">{r.call_count} calls · {formatCost(Number(r.total_cost))}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Daily Cost Chart ───────────────────────────────────── */}
          {data.daily.length > 0 && (
            <div className="bg-white rounded-xl border border-[#0e393d]/[.07] p-6">
              <h2 className="text-[13px] font-semibold text-[#0e393d] mb-4">Daily Cost <span className="font-normal text-[#1c2a2b]/35">({days}d)</span></h2>
              <DailyChart data={data.daily} />
            </div>
          )}

          {/* ── Top Users ──────────────────────────────────────────── */}
          {data.topUsers.length > 0 && (
            <div className="bg-white rounded-xl border border-[#0e393d]/[.07] p-6">
              <h2 className="text-[13px] font-semibold text-[#0e393d] mb-4">Top Users by Cost <span className="font-normal text-[#1c2a2b]/35">({days}d)</span></h2>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-[#0e393d]/[.07]">
                      <th className="pb-2.5 text-left text-[10px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40">User ID</th>
                      <th className="pb-2.5 text-right text-[10px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40">Calls</th>
                      <th className="pb-2.5 text-right text-[10px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40">Tokens</th>
                      <th className="pb-2.5 text-right text-[10px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40">Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topUsers.map((u, i) => (
                      <tr key={u.user_id} className="border-b border-[#0e393d]/[.04] hover:bg-[#0e393d]/[.015] transition-colors">
                        <td className="py-2.5 font-mono text-[11px] text-[#1c2a2b]/60">{u.user_id.slice(0, 8)}…</td>
                        <td className="py-2.5 text-right text-[#1c2a2b]/60">{u.call_count}</td>
                        <td className="py-2.5 text-right text-[#1c2a2b]/60">{formatTokens(Number(u.total_tokens))}</td>
                        <td className="py-2.5 text-right">
                          <span className="font-semibold text-[#0e393d]">{formatCost(Number(u.total_cost))}</span>
                          {i === 0 && Number(u.total_cost) > 1 && (
                            <span className="ml-2 text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">top spender</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Recent API Calls ───────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-[#0e393d]/[.07] p-6">
            <h2 className="text-[13px] font-semibold text-[#0e393d] mb-4">Recent API Calls</h2>
            {data.recent.length === 0 ? (
              <p className="text-[12px] text-[#1c2a2b]/35 py-8 text-center">No API calls logged yet. Usage will appear here as users interact with AI features.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-[#0e393d]/[.07]">
                      <th className="pb-2.5 text-left text-[10px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40">Time</th>
                      <th className="pb-2.5 text-left text-[10px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40">Provider</th>
                      <th className="pb-2.5 text-left text-[10px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40">Endpoint</th>
                      <th className="pb-2.5 text-left text-[10px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40">Model</th>
                      <th className="pb-2.5 text-right text-[10px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40">Tokens</th>
                      <th className="pb-2.5 text-right text-[10px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40">Chars</th>
                      <th className="pb-2.5 text-right text-[10px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40">Cost</th>
                      <th className="pb-2.5 text-right text-[10px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40">Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map(c => (
                      <tr key={c.id} className="border-b border-[#0e393d]/[.04] hover:bg-[#0e393d]/[.015] transition-colors">
                        <td className="py-2 text-[#1c2a2b]/40">{relTime(c.created_at)}</td>
                        <td className="py-2">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ background: providerColor(c.provider) }} />
                            <span className="text-[#1c2a2b]/60">{c.provider}</span>
                          </div>
                        </td>
                        <td className="py-2 text-[#0e393d] font-medium capitalize">{c.endpoint}</td>
                        <td className="py-2 font-mono text-[#1c2a2b]/40">{c.model ? c.model.replace('claude-', '').replace('-20251001', '') : '—'}</td>
                        <td className="py-2 text-right text-[#1c2a2b]/60">{c.input_tokens + c.output_tokens > 0 ? formatTokens(c.input_tokens + c.output_tokens) : '—'}</td>
                        <td className="py-2 text-right text-[#1c2a2b]/60">{c.characters > 0 ? formatChars(c.characters) : '—'}</td>
                        <td className="py-2 text-right font-semibold text-[#0e393d]">{formatCost(Number(c.estimated_cost_usd))}</td>
                        <td className="py-2 text-right text-[#1c2a2b]/40">{c.duration_ms ? `${c.duration_ms}ms` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      ) : null}
    </PageShell>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#0e393d]/[.07] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40 mb-1">{label}</p>
      <p className="text-xl font-serif text-[#0e393d]">{value}</p>
    </div>
  );
}

function StatusCard({ label, note, color, configured, rechargeUrl }: {
  label: string; note: string; color: string; configured: boolean; rechargeUrl?: string;
}) {
  return (
    <div className={`rounded-lg border p-4 ${configured ? 'border-[#0C9C6C]/20 bg-[#0C9C6C]/[.03]' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="text-[12px] font-semibold text-[#0e393d]">{label}</span>
      </div>
      <div className={`text-[10px] font-medium ${configured ? 'text-[#0C9C6C]' : 'text-amber-600'}`}>
        {configured ? 'Configured ✓' : 'Not set'}
      </div>
      <div className="text-[10px] text-[#1c2a2b]/35 mt-1">{note}</div>
      {configured && rechargeUrl && (
        <a href={rechargeUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-2 text-[10px] font-medium text-[#0e393d]/40 hover:text-[#0e393d] transition-colors">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Billing →
        </a>
      )}
    </div>
  );
}

function ElevenLabsCard({ data }: { data: ElevenLabsBalance }) {
  if (!data.ok) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-[#7c3aed]" />
          <span className="text-[12px] font-semibold text-[#0e393d]">ElevenLabs</span>
        </div>
        <div className="text-[10px] font-medium text-amber-600">
          {data.error === 'Not configured'
            ? 'Not set'
            : data.error?.includes('404')
              ? 'Invalid API key'
              : data.error ?? 'Error'}
        </div>
        <div className="text-[10px] text-[#1c2a2b]/35 mt-1">
          {data.error?.includes('404')
            ? 'Check ELEVENLABS_API_KEY in Vercel env vars'
            : 'Primary text-to-speech'}
        </div>
      </div>
    );
  }

  const used = data.characterCount ?? 0;
  const limit = data.characterLimit ?? 1;
  const pct = Math.round((used / limit) * 100);
  const isLow = pct > 80;

  return (
    <div className={`rounded-lg border p-4 ${isLow ? 'border-red-200 bg-red-50/50' : 'border-[#0C9C6C]/20 bg-[#0C9C6C]/[.03]'}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full bg-[#7c3aed]" />
        <span className="text-[12px] font-semibold text-[#0e393d]">ElevenLabs</span>
        {data.tier && <span className="text-[9px] font-medium bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full capitalize">{data.tier}</span>}
      </div>

      {/* Usage bar */}
      <div className="mb-1.5">
        <div className="flex justify-between text-[10px] text-[#1c2a2b]/40 mb-1">
          <span>{formatChars(used)} used</span>
          <span>{formatChars(data.remaining ?? 0)} remaining</span>
        </div>
        <div className="h-1.5 bg-[#0e393d]/[.06] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isLow ? 'bg-red-400' : 'bg-purple-400'}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between text-[10px]">
        <span className={`font-medium ${isLow ? 'text-red-600' : 'text-[#0C9C6C]'}`}>{pct}% used</span>
        {data.nextReset && (
          <span className="text-[#1c2a2b]/35">Resets {new Date(data.nextReset).toLocaleDateString('de-CH', { day: 'numeric', month: 'short' })}</span>
        )}
      </div>
      {isLow && (
        <div className="mt-2 flex items-center gap-2 text-[10px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Character limit almost reached — consider upgrading
        </div>
      )}
      <a href="https://elevenlabs.io/subscription" target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1 mt-2 text-[10px] font-medium text-purple-500/60 hover:text-purple-700 transition-colors">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        Manage subscription →
      </a>
    </div>
  );
}

function OpenAICard({ data }: { data: OpenAIBalance }) {
  if (!data.ok) {
    return (
      <StatusCard label="OpenAI" note="TTS + embeddings" color="#059669" configured={false} />
    );
  }

  const hasBalance = (data.remaining ?? 0) > 0 || (data.totalGranted ?? 0) > 0;

  return (
    <div className="rounded-lg border border-[#0C9C6C]/20 bg-[#0C9C6C]/[.03] p-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
        <span className="text-[12px] font-semibold text-[#0e393d]">OpenAI</span>
      </div>
      <div className="text-[10px] font-medium text-[#0C9C6C]">Configured ✓</div>
      {hasBalance ? (
        <div className="mt-1.5">
          <div className="flex justify-between text-[10px] text-[#1c2a2b]/40">
            <span>${(data.totalUsed ?? 0).toFixed(2)} used</span>
            <span>${(data.remaining ?? 0).toFixed(2)} remaining</span>
          </div>
        </div>
      ) : (
        <div className="text-[10px] text-[#1c2a2b]/35 mt-1">
          {data.note ?? 'TTS + embeddings'}
        </div>
      )}
      <a href="https://platform.openai.com/settings/organization/billing/overview" target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1 mt-2 text-[10px] font-medium text-emerald-500/60 hover:text-emerald-700 transition-colors">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        Billing →
      </a>
    </div>
  );
}

function DeepgramCard({ data }: { data: DeepgramBalance }) {
  if (!data.ok) {
    return (
      <StatusCard label="Deepgram" note="Cross-browser STT (Nova-2)" color="#0ea5e9" configured={false} />
    );
  }

  const hasBalance = (data.remainingCredits ?? 0) > 0;

  return (
    <div className="rounded-lg border border-[#0C9C6C]/20 bg-[#0C9C6C]/[.03] p-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-sky-500" />
        <span className="text-[12px] font-semibold text-[#0e393d]">Deepgram</span>
      </div>
      <div className="text-[10px] font-medium text-[#0C9C6C]">Configured ✓</div>
      {hasBalance ? (
        <div className="mt-1.5">
          <div className="text-[10px] text-[#1c2a2b]/40">
            ${(data.remainingCredits ?? 0).toFixed(2)} credit remaining
          </div>
        </div>
      ) : (
        <div className="text-[10px] text-[#1c2a2b]/35 mt-1">
          {data.note ?? 'Cross-browser STT (Nova-2)'}
        </div>
      )}
      <a href="https://console.deepgram.com/project/settings/billing" target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1 mt-2 text-[10px] font-medium text-sky-500/60 hover:text-sky-700 transition-colors">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        Billing →
      </a>
    </div>
  );
}

function DailyChart({ data }: { data: DailyRow[] }) {
  const byDay = new Map<string, { anthropic: number; elevenlabs: number; openai: number; deepgram: number; total: number }>();
  for (const r of data) {
    const d = r.day.slice(0, 10);
    const existing = byDay.get(d) ?? { anthropic: 0, elevenlabs: 0, openai: 0, deepgram: 0, total: 0 };
    const cost = Number(r.total_cost);
    const key = r.provider as keyof typeof existing;
    if (key in existing && key !== 'total') {
      existing[key] = (existing[key] ?? 0) + cost;
    }
    existing.total += cost;
    byDay.set(d, existing);
  }

  const entries = Array.from(byDay.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const maxCost = Math.max(...entries.map(([, v]) => v.total), 0.001);

  return (
    <div className="space-y-1">
      {entries.map(([day, costs]) => (
        <div key={day} className="flex items-center gap-3 text-[11px]">
          <span className="w-14 text-[#1c2a2b]/40 shrink-0">{new Date(day).toLocaleDateString('de-CH', { day: 'numeric', month: 'short' })}</span>
          <div className="flex-1 flex h-3.5 rounded overflow-hidden bg-[#0e393d]/[.03]">
            {costs.anthropic > 0 && (
              <div className="h-full bg-amber-400" style={{ width: `${(costs.anthropic / maxCost) * 100}%` }} title={`Anthropic: ${formatCost(costs.anthropic)}`} />
            )}
            {costs.elevenlabs > 0 && (
              <div className="h-full bg-purple-400" style={{ width: `${(costs.elevenlabs / maxCost) * 100}%` }} title={`ElevenLabs: ${formatCost(costs.elevenlabs)}`} />
            )}
            {costs.openai > 0 && (
              <div className="h-full bg-emerald-400" style={{ width: `${(costs.openai / maxCost) * 100}%` }} title={`OpenAI: ${formatCost(costs.openai)}`} />
            )}
            {costs.deepgram > 0 && (
              <div className="h-full bg-sky-400" style={{ width: `${(costs.deepgram / maxCost) * 100}%` }} title={`Deepgram: ${formatCost(costs.deepgram)}`} />
            )}
          </div>
          <span className="w-14 text-right text-[#0e393d] font-medium shrink-0">{formatCost(costs.total)}</span>
        </div>
      ))}
      {entries.length > 0 && (
        <div className="flex items-center gap-4 pt-3 text-[10px] text-[#1c2a2b]/35">
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-amber-400" />Anthropic</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-purple-400" />ElevenLabs</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />OpenAI</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-sky-400" />Deepgram</span>
        </div>
      )}
    </div>
  );
}
