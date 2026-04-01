'use client';

import { useEffect, useState, useCallback } from 'react';

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

type UsageData = {
  balances: {
    anthropic: { ok: boolean };
    openai: { ok: boolean };
    elevenlabs: ElevenLabsBalance;
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
    default: return '#6b7280';
  }
}

function providerLabel(p: string): string {
  switch (p) {
    case 'anthropic': return 'Anthropic (Claude)';
    case 'elevenlabs': return 'ElevenLabs';
    case 'openai': return 'OpenAI';
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
    <div className="max-w-7xl mx-auto space-y-8">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0e393d]">AI Usage Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor API credits, costs, and usage across all AI providers</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={fetchData}
            className="text-sm px-3 py-1.5 rounded-lg bg-[#0e393d] text-white hover:bg-[#0e393d]/90"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
      )}

      {loading && !data ? (
        <div className="text-center py-20 text-gray-400">Loading AI usage data...</div>
      ) : data ? (
        <>
          {/* ── Credit Balances ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ProviderCard
              name="Anthropic (Claude)"
              color="#d97706"
              configured={data.balances.anthropic.ok}
              detail={data.balances.anthropic.ok ? 'API key active' : 'Not configured'}
            />
            <ElevenLabsCard data={data.balances.elevenlabs} />
            <ProviderCard
              name="OpenAI"
              color="#059669"
              configured={data.balances.openai.ok}
              detail={data.balances.openai.ok ? 'API key active' : 'Not configured'}
            />
          </div>

          {/* ── Summary KPIs ───────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPI label="Total Calls" value={String(data.totals.total_calls)} sub="all time" />
            <KPI label="Est. Total Cost" value={formatCost(Number(data.totals.total_cost))} sub="all time" />
            <KPI label="Total Tokens" value={formatTokens(Number(data.totals.total_tokens))} sub="all time" />
            <KPI label="TTS Characters" value={formatChars(Number(data.totals.total_characters))} sub="all time" />
          </div>

          {/* ── Usage by Provider (period) ─────────────────────────── */}
          {data.byProvider.length > 0 && (
            <Section title={`Usage by Provider (${days}d)`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 font-medium">Provider</th>
                      <th className="pb-2 font-medium text-right">Calls</th>
                      <th className="pb-2 font-medium text-right">Input Tokens</th>
                      <th className="pb-2 font-medium text-right">Output Tokens</th>
                      <th className="pb-2 font-medium text-right">Characters</th>
                      <th className="pb-2 font-medium text-right">Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byProvider.map(r => (
                      <tr key={r.provider} className="border-b border-gray-50">
                        <td className="py-2">
                          <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: providerColor(r.provider) }} />
                          {providerLabel(r.provider)}
                        </td>
                        <td className="py-2 text-right">{r.call_count}</td>
                        <td className="py-2 text-right">{formatTokens(r.total_input_tokens)}</td>
                        <td className="py-2 text-right">{formatTokens(r.total_output_tokens)}</td>
                        <td className="py-2 text-right">{r.total_characters > 0 ? formatChars(r.total_characters) : '—'}</td>
                        <td className="py-2 text-right font-medium">{formatCost(Number(r.total_cost))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* ── Usage by Endpoint ──────────────────────────────────── */}
          {data.byEndpoint.length > 0 && (
            <Section title={`Usage by Endpoint (${days}d)`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.byEndpoint.map(r => (
                  <div key={`${r.endpoint}-${r.provider}`} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm capitalize">{r.endpoint}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: providerColor(r.provider) + '20', color: providerColor(r.provider) }}>
                        {r.provider}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">{r.call_count} calls · {formatCost(Number(r.total_cost))}</div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── Daily Usage Chart (simple bar vis) ─────────────────── */}
          {data.daily.length > 0 && (
            <Section title={`Daily Usage (${days}d)`}>
              <DailyChart data={data.daily} />
            </Section>
          )}

          {/* ── Top Users ──────────────────────────────────────────── */}
          {data.topUsers.length > 0 && (
            <Section title={`Top Users by Cost (${days}d)`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 font-medium">User ID</th>
                      <th className="pb-2 font-medium text-right">Calls</th>
                      <th className="pb-2 font-medium text-right">Tokens</th>
                      <th className="pb-2 font-medium text-right">Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topUsers.map((u, i) => (
                      <tr key={u.user_id} className="border-b border-gray-50">
                        <td className="py-2 font-mono text-xs">{u.user_id.slice(0, 8)}…</td>
                        <td className="py-2 text-right">{u.call_count}</td>
                        <td className="py-2 text-right">{formatTokens(Number(u.total_tokens))}</td>
                        <td className="py-2 text-right font-medium">
                          {formatCost(Number(u.total_cost))}
                          {i === 0 && Number(u.total_cost) > 1 && (
                            <span className="ml-2 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">top spender</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* ── Recent Calls ───────────────────────────────────────── */}
          <Section title="Recent API Calls">
            {data.recent.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No API calls logged yet. Usage will appear here as users interact with AI features.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 font-medium">Time</th>
                      <th className="pb-2 font-medium">Provider</th>
                      <th className="pb-2 font-medium">Endpoint</th>
                      <th className="pb-2 font-medium">Model</th>
                      <th className="pb-2 font-medium text-right">Tokens</th>
                      <th className="pb-2 font-medium text-right">Chars</th>
                      <th className="pb-2 font-medium text-right">Cost</th>
                      <th className="pb-2 font-medium text-right">Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map(c => (
                      <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-1.5 text-gray-500">{relTime(c.created_at)}</td>
                        <td className="py-1.5">
                          <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ background: providerColor(c.provider) }} />
                          {c.provider}
                        </td>
                        <td className="py-1.5 capitalize">{c.endpoint}</td>
                        <td className="py-1.5 font-mono text-gray-500">{c.model ? c.model.replace('claude-', '').replace('-20251001', '') : '—'}</td>
                        <td className="py-1.5 text-right">{c.input_tokens + c.output_tokens > 0 ? formatTokens(c.input_tokens + c.output_tokens) : '—'}</td>
                        <td className="py-1.5 text-right">{c.characters > 0 ? formatChars(c.characters) : '—'}</td>
                        <td className="py-1.5 text-right font-medium">{formatCost(Number(c.estimated_cost_usd))}</td>
                        <td className="py-1.5 text-right text-gray-500">{c.duration_ms ? `${c.duration_ms}ms` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </>
      ) : null}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5">
      <h2 className="text-base font-semibold text-[#0e393d] mb-4">{title}</h2>
      {children}
    </div>
  );
}

function KPI({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-[#0e393d]">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

function ProviderCard({ name, color, configured, detail }: {
  name: string; color: string; configured: boolean; detail: string;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-3 h-3 rounded-full" style={{ background: color }} />
        <h3 className="font-semibold text-[#0e393d]">{name}</h3>
      </div>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${configured ? 'bg-green-400' : 'bg-red-400'}`} />
        <span className="text-sm text-gray-600">{detail}</span>
      </div>
    </div>
  );
}

function ElevenLabsCard({ data }: { data: ElevenLabsBalance }) {
  if (!data.ok) {
    return <ProviderCard name="ElevenLabs" color="#7c3aed" configured={false} detail={data.error ?? 'Not configured'} />;
  }

  const used = data.characterCount ?? 0;
  const limit = data.characterLimit ?? 1;
  const pct = Math.round((used / limit) * 100);
  const isLow = pct > 80;

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-3 h-3 rounded-full bg-purple-500" />
        <h3 className="font-semibold text-[#0e393d]">ElevenLabs</h3>
        {data.tier && <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full capitalize">{data.tier}</span>}
      </div>

      {/* Character usage bar */}
      <div className="mt-2">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{formatChars(used)} used</span>
          <span>{formatChars(data.remaining ?? 0)} remaining</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isLow ? 'bg-red-400' : 'bg-purple-400'}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className={`font-medium ${isLow ? 'text-red-600' : 'text-gray-500'}`}>{pct}% used</span>
          {data.nextReset && (
            <span className="text-gray-400">Resets {new Date(data.nextReset).toLocaleDateString('de-CH', { day: 'numeric', month: 'short' })}</span>
          )}
        </div>
        {isLow && (
          <p className="text-xs text-red-600 mt-2 bg-red-50 rounded px-2 py-1">
            ⚠ Character limit almost reached — consider upgrading your plan
          </p>
        )}
      </div>
    </div>
  );
}

function DailyChart({ data }: { data: DailyRow[] }) {
  // Group by day, sum costs across providers
  const byDay = new Map<string, { anthropic: number; elevenlabs: number; openai: number; total: number }>();
  for (const r of data) {
    const d = r.day.slice(0, 10);
    const existing = byDay.get(d) ?? { anthropic: 0, elevenlabs: 0, openai: 0, total: 0 };
    const cost = Number(r.total_cost);
    existing[r.provider as 'anthropic' | 'elevenlabs' | 'openai'] = (existing[r.provider as 'anthropic' | 'elevenlabs' | 'openai'] ?? 0) + cost;
    existing.total += cost;
    byDay.set(d, existing);
  }

  const entries = Array.from(byDay.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const maxCost = Math.max(...entries.map(([, v]) => v.total), 0.001);

  return (
    <div className="space-y-1">
      {entries.map(([day, costs]) => (
        <div key={day} className="flex items-center gap-3 text-xs">
          <span className="w-16 text-gray-500 shrink-0">{new Date(day).toLocaleDateString('de-CH', { day: 'numeric', month: 'short' })}</span>
          <div className="flex-1 flex h-4 rounded overflow-hidden bg-gray-50">
            {costs.anthropic > 0 && (
              <div className="h-full bg-amber-400" style={{ width: `${(costs.anthropic / maxCost) * 100}%` }} title={`Anthropic: ${formatCost(costs.anthropic)}`} />
            )}
            {costs.elevenlabs > 0 && (
              <div className="h-full bg-purple-400" style={{ width: `${(costs.elevenlabs / maxCost) * 100}%` }} title={`ElevenLabs: ${formatCost(costs.elevenlabs)}`} />
            )}
            {costs.openai > 0 && (
              <div className="h-full bg-emerald-400" style={{ width: `${(costs.openai / maxCost) * 100}%` }} title={`OpenAI: ${formatCost(costs.openai)}`} />
            )}
          </div>
          <span className="w-16 text-right text-gray-600 font-medium shrink-0">{formatCost(costs.total)}</span>
        </div>
      ))}
      {entries.length > 0 && (
        <div className="flex items-center gap-4 pt-2 text-xs text-gray-400">
          <span><span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1" />Anthropic</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-purple-400 mr-1" />ElevenLabs</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1" />OpenAI</span>
        </div>
      )}
    </div>
  );
}
