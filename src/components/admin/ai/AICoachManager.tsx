'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import PageShell from '@/components/admin/PageShell';
import VoiceConversation from '@/components/voice/VoiceConversation';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';

interface BriefingStep {
  id: string;
  title: string;
  narration: string;
  highlight: string;
  audioCacheKey?: string | null;
  audioCached?: boolean;
}

interface TTSCacheStats {
  totalFiles: number;
  totalSize: number;
  byLang: Record<string, { files: number; size: number }>;
  trackedFiles?: number;
  linkedFiles?: number;
  orphanedFiles?: number;
  briefingCount?: number;
  bySource?: Record<string, number>;
  userStats?: Record<string, { name: string; email: string; files: number; sources?: Record<string, number> }>;
}

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

interface JourneyConfig {
  tweaks_unlock_streak: number;
  anti_aging_unlock_streak: number;
  requires_biomarkers_for_anti_aging: boolean;
  daily_lesson_limit: number;
  morning_checkin_enabled: boolean;
  auto_unlock_enabled: boolean;
}

interface UserProgressRow {
  id: string;
  user_id: string;
  lesson_id: string;
  status: string;
  assigned_by: string | null;
  assigned_at: string;
  completed_at: string | null;
  profiles: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
  lifestyle_lessons: {
    id: string;
    title_en: string;
    framework: string;
  } | null;
}

const TABS = [
  { id: 'briefings', label: 'Briefings & Cache', icon: '🎙️' },
  { id: 'journey', label: 'Journey Config', icon: '🗺️' },
  { id: 'voice', label: 'Voice Test', icon: '🎤' },
  { id: 'progress', label: 'User Progress', icon: '📊' },
] as const;

const LANG_FLAGS: Record<string, string> = { en: '🇬🇧', de: '🇨🇭', fr: '🇫🇷', es: '🇪🇸', it: '🇮🇹' };

function fmt(iso: string) {
  return new Date(iso).toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'short' });
}

function fmtDuration(ms: number | null) {
  if (!ms) return '—';
  return `${(ms / 1000).toFixed(1)}s`;
}

// ── Mini audio player for individual steps ──────────────────────────────────
function StepPlayer({ narration, lang }: { narration: string; lang: string }) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const play = useCallback(async () => {
    // If already have audio, just toggle play/pause
    if (audioRef.current && blobUrlRef.current) {
      if (playing) {
        audioRef.current.pause();
        setPlaying(false);
      } else {
        audioRef.current.play();
        setPlaying(true);
      }
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: narration, lang }),
      });
      if (!res.ok) {
        // Fallback to browser speech
        if ('speechSynthesis' in window) {
          const utt = new SpeechSynthesisUtterance(narration);
          utt.lang = lang === 'de' ? 'de-DE' : lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : lang === 'it' ? 'it-IT' : 'en-US';
          utt.onend = () => setPlaying(false);
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utt);
          setPlaying(true);
          setLoading(false);
          return;
        }
        setLoading(false);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.addEventListener('ended', () => setPlaying(false));
      audio.play();
      setPlaying(true);
    } catch {
      // silent fail
    }
    setLoading(false);
  }, [narration, lang, playing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  return (
    <button
      onClick={play}
      disabled={loading}
      className="p-1 rounded-md hover:bg-[#0e393d]/5 text-[#0e393d]/40 hover:text-[#0e393d] transition disabled:opacity-30"
      title={playing ? 'Pause' : 'Play step'}
    >
      {loading ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
          <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="8" />
        </svg>
      ) : playing ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      )}
    </button>
  );
}

export default function AICoachManager() {
  const { confirm, ConfirmDialog: confirmDialog } = useConfirmDialog();

  // Tab management
  const [activeTab, setActiveTab] = useState<'briefings' | 'journey' | 'voice' | 'progress'>('briefings');

  // Briefings & Cache state
  const [briefings, setBriefings] = useState<BriefingRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Expanded briefing state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, BriefingStep[]>>({});
  const [loadingSteps, setLoadingSteps] = useState<string | null>(null);

  // TTS cache state
  const [cacheStats, setCacheStats] = useState<TTSCacheStats | null>(null);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [purging, setPurging] = useState(false);

  // Journey Config state
  const [journeyConfig, setJourneyConfig] = useState<JourneyConfig | null>(null);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [journeySaving, setJourneySaving] = useState(false);
  const [journeyError, setJourneyError] = useState<string | null>(null);

  // User Progress state
  const [progressData, setProgressData] = useState<UserProgressRow[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);

  const loadCacheStats = useCallback(async () => {
    setCacheLoading(true);
    try {
      const res = await fetch('/api/admin/tts-cache');
      if (res.ok) setCacheStats(await res.json());
    } catch { /* silent */ }
    setCacheLoading(false);
  }, []);

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

  const loadJourneyConfig = useCallback(async () => {
    setJourneyLoading(true);
    setJourneyError(null);
    try {
      const res = await fetch('/api/admin/ai-settings');
      if (res.ok) {
        const data = await res.json();
        setJourneyConfig(data.journey_config || null);
      } else {
        setJourneyError('Failed to load journey config');
      }
    } catch (err) {
      console.error('[loadJourneyConfig] error:', err);
      setJourneyError('Error loading config');
    }
    setJourneyLoading(false);
  }, []);

  const saveJourneyConfig = useCallback(async () => {
    if (!journeyConfig) return;
    setJourneySaving(true);
    try {
      const res = await fetch('/api/admin/ai-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'journey_config', value: journeyConfig }),
      });
      if (res.ok) {
        setJourneyError(null);
      } else {
        const data = await res.json();
        setJourneyError(data.error || 'Failed to save');
      }
    } catch (err) {
      console.error('[saveJourneyConfig] error:', err);
      setJourneyError('Save failed');
    }
    setJourneySaving(false);
  }, [journeyConfig]);

  const loadProgressData = useCallback(async () => {
    setProgressLoading(true);
    try {
      const res = await fetch('/api/admin/ai-coach-progress');
      if (res.ok) {
        const data = await res.json();
        setProgressData(data.progress || []);
      }
    } catch (err) {
      console.error('[loadProgressData] error:', err);
    }
    setProgressLoading(false);
  }, []);

  useEffect(() => {
    load();
    loadCacheStats();
  }, [load, loadCacheStats]);

  // Load journey config and progress when tabs are activated
  useEffect(() => {
    if (activeTab === 'journey' && !journeyConfig) {
      loadJourneyConfig();
    }
  }, [activeTab, journeyConfig, loadJourneyConfig]);

  useEffect(() => {
    if (activeTab === 'progress' && progressData.length === 0) {
      loadProgressData();
    }
  }, [activeTab, progressData, loadProgressData]);

  const deleteBriefing = async (id: string) => {
    if (!(await confirm({ title: 'Delete Briefing', message: 'Delete this briefing log entry?', variant: 'danger' }))) return;
    setDeleting(id);
    try {
      const res = await fetch('/api/admin/ai-briefings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        console.error('[deleteBriefing] failed:', data.error);
        alert(`Delete failed: ${data.error || res.statusText}`);
        return;
      }
      setBriefings(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error('[deleteBriefing] error:', err);
      alert('Delete failed — check console');
    } finally {
      setDeleting(null);
    }
  };

  const toggleExpand = async (id: string, lang: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (expandedSteps[id]) return;

    setLoadingSteps(id);
    try {
      const res = await fetch('/api/admin/ai-briefings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        const data = await res.json();
        setExpandedSteps(prev => ({ ...prev, [id]: data.steps ?? [] }));
      }
    } catch {
      // silent
    }
    setLoadingSteps(null);
  };

  return (
    <PageShell
      title="AI Coach"
      description="Manage briefings, journey configuration, voice testing, and user progress."
    >
      {/* Tab Navigation */}
      <div className="mb-8 border-b border-[#0e393d]/[.07]">
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-[12px] font-semibold uppercase tracking-[.08em] transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-[#0e393d] text-[#0e393d]'
                  : 'border-transparent text-[#1c2a2b]/40 hover:text-[#1c2a2b]/60'
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB: Briefings & Cache */}
      {activeTab === 'briefings' && (
        <>
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

      {/* TTS Audio Cache */}
      <div className="bg-white rounded-xl border border-[#0e393d]/[.07] overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-[#0e393d]/[.06] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#0e393d]">TTS Audio Cache</h2>
            <p className="text-[10px] text-[#1c2a2b]/40 mt-0.5">Cached audio files in Supabase Storage — never expires unless purged.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadCacheStats}
              disabled={cacheLoading}
              className="text-[11px] text-[#0e393d]/50 hover:text-[#0e393d] transition-colors flex items-center gap-1.5 disabled:opacity-30"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              Refresh
            </button>
            <button
              onClick={async () => {
                if (!(await confirm({ title: 'Purge TTS Cache', message: 'Delete all cached audio files? They will be re-generated on next playback.', variant: 'danger' }))) return;
                setPurging(true);
                try {
                  const res = await fetch('/api/admin/tts-cache', { method: 'DELETE' });
                  if (res.ok) {
                    const data = await res.json();
                    console.log(`Purged ${data.deleted} files`);
                    loadCacheStats();
                  }
                } catch { /* silent */ }
                setPurging(false);
              }}
              disabled={purging || !cacheStats?.totalFiles}
              className="text-[11px] text-red-400 hover:text-red-600 transition-colors flex items-center gap-1.5 disabled:opacity-30"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
              </svg>
              {purging ? 'Purging…' : 'Purge All'}
            </button>
          </div>
        </div>
        <div className="px-6 py-5">
          {cacheLoading && !cacheStats ? (
            <div className="text-[12px] text-[#1c2a2b]/40 text-center py-4">Loading cache stats…</div>
          ) : cacheStats ? (
            <div className="flex items-start gap-8">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#1c2a2b]/40 mb-1">Total Files</div>
                <div className="text-xl font-semibold text-[#0e393d]">{cacheStats.totalFiles}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#1c2a2b]/40 mb-1">Total Size</div>
                <div className="text-xl font-semibold text-[#0e393d]">
                  {cacheStats.totalSize > 1024 * 1024
                    ? `${(cacheStats.totalSize / (1024 * 1024)).toFixed(1)} MB`
                    : cacheStats.totalSize > 0
                    ? `${(cacheStats.totalSize / 1024).toFixed(0)} KB`
                    : '0'}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#1c2a2b]/40 mb-1">Tracked</div>
                <div className="text-xl font-semibold text-emerald-600">{cacheStats.trackedFiles ?? '—'}</div>
              </div>
              {(cacheStats.orphanedFiles ?? 0) > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#1c2a2b]/40 mb-1">Untracked</div>
                  <div className="text-xl font-semibold text-amber-500">{cacheStats.orphanedFiles}</div>
                </div>
              )}
              {cacheStats.bySource && Object.keys(cacheStats.bySource).length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#1c2a2b]/40 mb-1">By Source</div>
                  <div className="flex gap-3">
                    {Object.entries(cacheStats.bySource).map(([source, count]) => (
                      <div key={source} className="text-[12px] text-[#1c2a2b]/60">
                        <span className="font-medium text-[#0e393d]">{count}</span>
                        <span className="ml-1">{source}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {Object.keys(cacheStats.byLang).length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#1c2a2b]/40 mb-1">By Language</div>
                  <div className="flex gap-3">
                    {Object.entries(cacheStats.byLang).map(([lang, { files, size }]) => (
                      <div key={lang} className="text-[12px] text-[#1c2a2b]/60">
                        <span className="mr-1">{LANG_FLAGS[lang] ?? lang}</span>
                        <span className="font-medium text-[#0e393d]">{files}</span>
                        <span className="text-[10px] text-[#1c2a2b]/30 ml-1">
                          ({size > 1024 * 1024
                            ? `${(size / (1024 * 1024)).toFixed(1)}MB`
                            : `${(size / 1024).toFixed(0)}KB`})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {cacheStats.userStats && Object.keys(cacheStats.userStats).length > 0 && (
                <div className="basis-full mt-3 pt-3 border-t border-[#0e393d]/[.06]">
                  <div className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#1c2a2b]/40 mb-2">Per User</div>
                  <div className="space-y-1">
                    {Object.entries(cacheStats.userStats).map(([uid, { name, email, files, sources }]) => (
                      <div key={uid} className="flex items-center gap-3 text-[12px]">
                        <span className="font-medium text-[#0e393d]">{name}</span>
                        <span className="text-[#1c2a2b]/30">{email}</span>
                        <span className="ml-auto font-medium text-[#0e393d]">{files} files</span>
                        {sources && Object.keys(sources).length > 0 && (
                          <span className="text-[10px] text-[#1c2a2b]/40">
                            ({Object.entries(sources).map(([s, c]) => `${c} ${s}`).join(', ')})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-[12px] text-[#1c2a2b]/30 text-center py-4">No cache data</div>
          )}
        </div>
      </div>

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
          <div className="divide-y divide-[#0e393d]/[.04]">
            {briefings.map(b => {
              const isExpanded = expandedId === b.id;
              const steps = expandedSteps[b.id];
              const isLoadingSteps = loadingSteps === b.id;
              return (
                <div key={b.id}>
                  <div className="flex items-center hover:bg-[#fafaf8] transition-colors">
                    <button onClick={() => toggleExpand(b.id, b.lang)} className="flex-1 flex items-center text-left px-5 py-3 gap-5">
                      <div className="min-w-0 flex-1">
                        {b.user ? (
                          <div>
                            <span className="font-medium text-[12px] text-[#0e393d]">
                              {[b.user.first_name, b.user.last_name].filter(Boolean).join(' ') || '—'}
                            </span>
                            <span className="text-[10px] text-[#1c2a2b]/35 ml-2">{b.user.email}</span>
                          </div>
                        ) : (
                          <span className="text-[12px] text-[#1c2a2b]/30">{b.user_id.slice(0, 8)}…</span>
                        )}
                      </div>
                      <span className="text-base shrink-0">{LANG_FLAGS[b.lang] ?? b.lang}</span>
                      <span className="font-mono text-[10px] bg-[#0e393d]/[.05] px-2 py-0.5 rounded shrink-0">
                        {b.model_used.replace('claude-', '').replace('-4-6', ' 4.6').replace('-4-5', ' 4.5')}
                      </span>
                      <span className="tabular-nums text-[12px] text-[#1c2a2b]/60 shrink-0 w-14 text-right">
                        {b.tokens_used?.toLocaleString() ?? '—'}
                      </span>
                      <span className="tabular-nums text-[12px] text-[#1c2a2b]/60 shrink-0 w-12 text-right">
                        {fmtDuration(b.duration_ms)}
                      </span>
                      <span className="text-[12px] text-[#1c2a2b]/40 shrink-0 w-32 text-right">{fmt(b.created_at)}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        className={`text-[#1c2a2b]/30 transition-transform shrink-0 ml-2 ${isExpanded ? 'rotate-180' : ''}`}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteBriefing(b.id)}
                      disabled={deleting === b.id}
                      className="px-3 py-3 text-[#1c2a2b]/20 hover:text-red-400 transition-colors disabled:opacity-30"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4h6v2" />
                      </svg>
                    </button>
                  </div>

                  {/* Expanded steps */}
                  {isExpanded && (
                    <div className="bg-[#fafaf8] border-t border-[#0e393d]/6 px-5 py-4">
                      {isLoadingSteps ? (
                        <div className="flex justify-center py-4 text-[12px] text-[#1c2a2b]/40">Loading steps…</div>
                      ) : steps && steps.length > 0 ? (
                        <div className="space-y-3">
                          <div className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#ceab84] mb-2">
                            Briefing Steps ({steps.length})
                          </div>
                          {steps.map((step, i) => (
                            <div key={step.id || i} className="bg-white rounded-lg border border-[#0e393d]/8 p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="w-6 h-6 rounded-full bg-[#0e393d]/8 text-[10px] font-bold text-[#0e393d] flex items-center justify-center">
                                  {i + 1}
                                </span>
                                <span className="text-[12px] font-semibold text-[#0e393d]">{step.title}</span>
                                <span className="text-[9px] text-[#1c2a2b]/30 font-mono ml-auto">highlight: {step.highlight || '—'}</span>
                                <StepPlayer narration={step.narration} lang={b.lang} />
                              </div>
                              <p className="text-[12px] text-[#1c2a2b]/60 leading-relaxed pl-8">
                                {step.narration}
                              </p>
                              {step.audioCacheKey && (
                                <div className="flex items-center gap-2 mt-2 pl-8">
                                  {step.audioCached ? (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-medium text-[#0C9C6C] bg-[#0C9C6C]/8 px-2 py-0.5 rounded-full">
                                      <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                                      cached
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-medium text-[#1c2a2b]/30 bg-[#1c2a2b]/5 px-2 py-0.5 rounded-full">
                                      not cached
                                    </span>
                                  )}
                                  <span className="text-[9px] font-mono text-[#1c2a2b]/20" title={step.audioCacheKey}>
                                    {step.audioCacheKey}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[12px] text-[#1c2a2b]/30 text-center py-4">No steps data stored for this briefing</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
        </>
      )}

      {/* TAB: Journey Config */}
      {activeTab === 'journey' && (
        <div className="max-w-2xl">
          {journeyLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-[#1c2a2b]/40">Loading journey configuration…</div>
          ) : journeyConfig ? (
            <div className="bg-white rounded-xl border border-[#0e393d]/[.07] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#0e393d]/[.06]">
                <h2 className="text-sm font-semibold text-[#0e393d]">Journey Configuration</h2>
                <p className="text-[10px] text-[#1c2a2b]/40 mt-0.5">Configure the progressive journey system parameters.</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[.1em] text-[#1c2a2b]/40 mb-2">
                      Tweaks Unlock Streak
                    </label>
                    <input
                      type="number"
                      value={journeyConfig.tweaks_unlock_streak}
                      onChange={e => setJourneyConfig({ ...journeyConfig, tweaks_unlock_streak: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-sm border border-[#0e393d]/[.1] rounded-lg focus:outline-none focus:border-[#0e393d]/30"
                    />
                    <p className="text-[10px] text-[#1c2a2b]/30 mt-1">Days of streak required</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[.1em] text-[#1c2a2b]/40 mb-2">
                      Anti-Aging Unlock Streak
                    </label>
                    <input
                      type="number"
                      value={journeyConfig.anti_aging_unlock_streak}
                      onChange={e => setJourneyConfig({ ...journeyConfig, anti_aging_unlock_streak: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-sm border border-[#0e393d]/[.1] rounded-lg focus:outline-none focus:border-[#0e393d]/30"
                    />
                    <p className="text-[10px] text-[#1c2a2b]/30 mt-1">Days of streak required</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[.1em] text-[#1c2a2b]/40 mb-2">
                      Daily Lesson Limit
                    </label>
                    <input
                      type="number"
                      value={journeyConfig.daily_lesson_limit}
                      onChange={e => setJourneyConfig({ ...journeyConfig, daily_lesson_limit: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-sm border border-[#0e393d]/[.1] rounded-lg focus:outline-none focus:border-[#0e393d]/30"
                    />
                    <p className="text-[10px] text-[#1c2a2b]/30 mt-1">Max lessons per day</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={journeyConfig.requires_biomarkers_for_anti_aging}
                      onChange={e => setJourneyConfig({ ...journeyConfig, requires_biomarkers_for_anti_aging: e.target.checked })}
                      className="w-4 h-4 accent-[#0e393d]"
                    />
                    <span className="text-[12px] text-[#0e393d]">Requires Biomarkers for Anti-Aging</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={journeyConfig.morning_checkin_enabled}
                      onChange={e => setJourneyConfig({ ...journeyConfig, morning_checkin_enabled: e.target.checked })}
                      className="w-4 h-4 accent-[#0e393d]"
                    />
                    <span className="text-[12px] text-[#0e393d]">Morning Check-In Enabled</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={journeyConfig.auto_unlock_enabled}
                      onChange={e => setJourneyConfig({ ...journeyConfig, auto_unlock_enabled: e.target.checked })}
                      className="w-4 h-4 accent-[#0e393d]"
                    />
                    <span className="text-[12px] text-[#0e393d]">Auto-Unlock Enabled</span>
                  </label>
                </div>

                {journeyError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-[12px] text-red-700">{journeyError}</p>
                  </div>
                )}

                <button
                  onClick={saveJourneyConfig}
                  disabled={journeySaving}
                  className="w-full px-4 py-2.5 bg-[#0e393d] text-white text-[12px] font-semibold rounded-lg hover:bg-[#0e393d]/90 transition-colors disabled:opacity-50"
                >
                  {journeySaving ? 'Saving…' : 'Save Configuration'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <div className="text-sm text-[#1c2a2b]/40">No journey configuration found</div>
              <button
                onClick={loadJourneyConfig}
                className="text-[12px] text-[#0e393d] hover:text-[#0e393d]/70 transition-colors"
              >
                Try loading again
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB: Voice Test */}
      {activeTab === 'voice' && (
        <div className="flex flex-col items-center gap-4">
          <div className="bg-white rounded-xl border border-[#0e393d]/[.07] p-6 w-full max-w-2xl">
            <p className="text-[12px] text-[#1c2a2b]/60 text-center mb-6">
              Test voice conversation modes here. Credits are not deducted for admin users.
            </p>
            <div className="flex justify-center">
              <VoiceConversation lang="en" />
            </div>
          </div>
        </div>
      )}

      {/* TAB: User Progress */}
      {activeTab === 'progress' && (
        <div className="bg-white rounded-xl border border-[#0e393d]/[.07] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#0e393d]/[.06] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#0e393d]">User Lesson Progress</h2>
            <button
              onClick={loadProgressData}
              className="text-[11px] text-[#0e393d]/50 hover:text-[#0e393d] transition-colors flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              Refresh
            </button>
          </div>

          {progressLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-[#1c2a2b]/40">Loading…</div>
          ) : progressData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0e393d" strokeWidth="1.2" opacity="0.2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <div className="text-sm text-[#1c2a2b]/40">No lesson progress yet</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#fafaf8] border-b border-[#0e393d]/[.06]">
                  <tr>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40">
                      Lesson
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40">
                      Framework
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40">
                      Assigned By
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40">
                      Assigned
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40">
                      Completed
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0e393d]/[.04]">
                  {progressData.map(row => (
                    <tr key={row.id} className="hover:bg-[#fafaf8] transition-colors">
                      <td className="px-6 py-3 text-[12px] text-[#0e393d]">
                        {row.profiles ? (
                          <div>
                            <div className="font-medium">
                              {[row.profiles.first_name, row.profiles.last_name].filter(Boolean).join(' ') || '—'}
                            </div>
                            <div className="text-[10px] text-[#1c2a2b]/40">{row.profiles.email}</div>
                          </div>
                        ) : (
                          <span className="text-[#1c2a2b]/30">{row.user_id.slice(0, 8)}…</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-[12px] text-[#0e393d]">
                        {row.lifestyle_lessons?.title_en || '—'}
                      </td>
                      <td className="px-6 py-3 text-[12px] text-[#1c2a2b]/60">
                        {row.lifestyle_lessons?.framework || '—'}
                      </td>
                      <td className="px-6 py-3 text-[12px]">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                          row.status === 'completed' ? 'bg-[#0C9C6C]/10 text-[#0C9C6C]' :
                          row.status === 'in_progress' ? 'bg-[#0e393d]/10 text-[#0e393d]' :
                          'bg-[#1c2a2b]/5 text-[#1c2a2b]/60'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-[12px] text-[#1c2a2b]/60">
                        {row.assigned_by || '—'}
                      </td>
                      <td className="px-6 py-3 text-[12px] text-[#1c2a2b]/60 whitespace-nowrap">
                        {fmt(row.assigned_at)}
                      </td>
                      <td className="px-6 py-3 text-[12px] text-[#1c2a2b]/60 whitespace-nowrap">
                        {row.completed_at ? fmt(row.completed_at) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {confirmDialog}
    </PageShell>
  );
}
