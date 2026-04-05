'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import PageShell from '@/components/admin/PageShell';
import VoiceConversation from '@/components/voice/VoiceConversation';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  StatCard,
  StatCardRow,
  inputCls,
  AdminBadge,
  AdminToggle,
} from '@/components/admin/shared/AdminUI';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  byFeature?: Record<string, { count: number; sources: string[] }>;
  userStats?: Record<string, {
    name: string; email: string; files: number;
    sources?: Record<string, number>;
    fileDetails?: Array<{ id: string; source: string; storage_path: string; lang: string; size_bytes: number | null; created_at: string; briefing_id: string | null }>;
  }>;
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

interface SystemVoiceBriefing {
  id: string;
  slug: string;
  title: string;
  page: string;
  voice_id: string;
  status: string;
  is_active: boolean;
  audio_url_en: string | null;
  audio_url_de: string | null;
  audio_url_fr: string | null;
  audio_url_es: string | null;
  audio_url_it: string | null;
  created_at: string;
}

const TABS = [
  { id: 'briefings', label: 'AI Generation', icon: '🎙️' },
  { id: 'journey', label: 'Journey Config', icon: '🗺️' },
  { id: 'voice', label: 'Voice Test', icon: '🎤' },
  { id: 'progress', label: 'User Progress', icon: '📊' },
] as const;

const LANG_FLAGS: Record<string, string> = { en: '🇬🇧', de: '🇨🇭', fr: '🇫🇷', es: '🇪🇸', it: '🇮🇹' };

const FEATURES = [
  { key: 'Health Briefing', icon: '🎙️', source: 'briefing', desc: 'AI health analysis narration' },
  { key: 'Research Voice', icon: '🔬', source: 'research', desc: 'Research article narration' },
  { key: 'Daily Check-in', icon: '🌅', source: 'voice_daily_checkin', desc: 'Morning check-in conversations' },
  { key: 'Voice Coaching', icon: '💬', source: 'voice_coaching', desc: 'Interactive coaching sessions' },
  { key: 'Open Conversation', icon: '🗣️', source: 'voice_freeform', desc: 'Free-form voice chats' },
] as const;

const SOURCE_TO_FEATURE: Record<string, string> = {
  briefing: 'Health Briefing',
  research: 'Research Voice',
  voice_daily_checkin: 'Daily Check-in',
  voice_coaching: 'Voice Coaching',
  voice_freeform: 'Open Conversation',
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'short' });
}

function fmtDuration(ms: number | null) {
  if (!ms) return '—';
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtSize(bytes: number): string {
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes > 0) return `${(bytes / 1024).toFixed(0)} KB`;
  return '0';
}

// ── Mini audio player for individual steps ──────────────────────────────────
function StepPlayer({ narration, lang }: { narration: string; lang: string }) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const play = useCallback(async () => {
    if (audioRef.current && blobUrlRef.current) {
      if (playing) { audioRef.current.pause(); setPlaying(false); }
      else { audioRef.current.play(); setPlaying(true); }
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: narration, lang, role: 'coach' }),
      });
      if (!res.ok) {
        if ('speechSynthesis' in window) {
          const utt = new SpeechSynthesisUtterance(narration);
          utt.lang = lang === 'de' ? 'de-DE' : lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : lang === 'it' ? 'it-IT' : 'en-US';
          utt.onend = () => setPlaying(false);
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utt);
          setPlaying(true);
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
    } catch { /* silent */ }
    setLoading(false);
  }, [narration, lang, playing]);

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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function AICoachManager() {
  const { confirm, ConfirmDialog: confirmDialog } = useConfirmDialog();
  const [activeTab, setActiveTab] = useState<'briefings' | 'journey' | 'voice' | 'progress'>('briefings');

  // Briefings & Cache state
  const [briefings, setBriefings] = useState<BriefingRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, BriefingStep[]>>({});
  const [loadingSteps, setLoadingSteps] = useState<string | null>(null);
  const [cacheStats, setCacheStats] = useState<TTSCacheStats | null>(null);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [purging, setPurging] = useState(false);
  const [purgingFeature, setPurgingFeature] = useState<string | null>(null);

  // Per-user expanded state
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [expandedFeatures, setExpandedFeatures] = useState<Record<string, boolean>>({});

  // System Voice Briefings state
  const [systemBriefings, setSystemBriefings] = useState<SystemVoiceBriefing[]>([]);

  // Journey Config state
  const [journeyConfig, setJourneyConfig] = useState<JourneyConfig | null>(null);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [journeySaving, setJourneySaving] = useState(false);
  const [journeyError, setJourneyError] = useState<string | null>(null);
  const [journeySaved, setJourneySaved] = useState(false);

  // User Progress state
  const [progressData, setProgressData] = useState<UserProgressRow[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);

  // ─── Data Loading ─────────────────────────────────────────────────────────

  const loadCacheStats = useCallback(async () => {
    setCacheLoading(true);
    try {
      const res = await fetch('/api/admin/tts-cache');
      if (res.ok) setCacheStats(await res.json());
    } catch { /* silent */ }
    setCacheLoading(false);
  }, []);

  const loadSystemBriefings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/voice-briefings');
      if (res.ok) {
        const data = await res.json();
        setSystemBriefings(data.briefings ?? []);
      }
    } catch { /* silent */ }
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
        // Settings come as array of {key, value} — find journey_config
        const settings: Array<{ key: string; value: unknown }> = data.settings ?? [];
        const raw = settings.find(s => s.key === 'journey_config')?.value as Record<string, unknown> | undefined;
        if (raw) {
          // DB stores nested format {phases: {tweaks: {unlock_streak: 7}, ...}} — flatten to component format
          const phases = raw.phases as Record<string, Record<string, unknown>> | undefined;
          setJourneyConfig({
            tweaks_unlock_streak: (phases?.tweaks?.unlock_streak as number) ?? 7,
            anti_aging_unlock_streak: (phases?.anti_aging?.unlock_streak as number) ?? 14,
            requires_biomarkers_for_anti_aging: (phases?.anti_aging?.requires_biomarkers as boolean) ?? true,
            daily_lesson_limit: (raw.daily_lesson_limit as number) ?? 1,
            morning_checkin_enabled: (raw.morning_checkin_enabled as boolean) ?? true,
            auto_unlock_enabled: (raw.auto_unlock_enabled as boolean) ?? true,
          });
        } else {
          setJourneyConfig(null);
        }
      } else {
        setJourneyError('Failed to load journey config');
      }
    } catch { setJourneyError('Error loading config'); }
    setJourneyLoading(false);
  }, []);

  const saveJourneyConfig = useCallback(async () => {
    if (!journeyConfig) return;
    setJourneySaving(true);
    try {
      // Convert flat component format back to nested DB format
      const dbValue = {
        phases: {
          daily_dozen: { name: 'Daily Dozen', framework: 'daily_dozen', unlock: 'immediate' },
          tweaks: { name: '21 Tweaks', framework: '21_tweaks', unlock_streak: journeyConfig.tweaks_unlock_streak, requires_phase: 'daily_dozen' },
          anti_aging: { name: 'Anti-Aging 8', framework: 'anti_aging', unlock_streak: journeyConfig.anti_aging_unlock_streak, requires_phase: 'tweaks', requires_biomarkers: journeyConfig.requires_biomarkers_for_anti_aging },
        },
        daily_lesson_limit: journeyConfig.daily_lesson_limit,
        morning_checkin_enabled: journeyConfig.morning_checkin_enabled,
        auto_unlock_enabled: journeyConfig.auto_unlock_enabled,
      };
      const res = await fetch('/api/admin/ai-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journey_config: dbValue }),
      });
      if (res.ok) { setJourneyError(null); setJourneySaved(true); setTimeout(() => setJourneySaved(false), 3000); }
      else { const data = await res.json(); setJourneyError(data.error || 'Failed to save'); }
    } catch { setJourneyError('Save failed'); }
    setJourneySaving(false);
  }, [journeyConfig]);

  const loadProgressData = useCallback(async () => {
    setProgressLoading(true);
    try {
      const res = await fetch('/api/admin/ai-coach-progress');
      if (res.ok) { const data = await res.json(); setProgressData(data.progress || []); }
    } catch { /* silent */ }
    setProgressLoading(false);
  }, []);

  useEffect(() => { load(); loadCacheStats(); loadSystemBriefings(); }, [load, loadCacheStats, loadSystemBriefings]);

  useEffect(() => {
    if (activeTab === 'journey' && !journeyConfig) loadJourneyConfig();
  }, [activeTab, journeyConfig, loadJourneyConfig]);

  useEffect(() => {
    if (activeTab === 'progress' && progressData.length === 0) loadProgressData();
  }, [activeTab, progressData, loadProgressData]);

  // ─── Actions ──────────────────────────────────────────────────────────────

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
      if (!res.ok || data.error) { alert(`Delete failed: ${data.error || res.statusText}`); return; }
      setBriefings(prev => prev.filter(b => b.id !== id));
    } catch { alert('Delete failed — check console'); }
    finally { setDeleting(null); }
  };

  const toggleExpand = async (id: string) => {
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
    } catch { /* silent */ }
    setLoadingSteps(null);
  };

  const purgeAll = async () => {
    if (!(await confirm({ title: 'Purge All TTS Cache', message: 'Delete all cached audio files? They will be re-generated on next playback.', variant: 'danger' }))) return;
    setPurging(true);
    try {
      const res = await fetch('/api/admin/tts-cache', { method: 'DELETE' });
      if (res.ok) loadCacheStats();
    } catch { /* silent */ }
    setPurging(false);
  };

  const purgeFeature = async (source: string, label: string, count: number) => {
    if (!(await confirm({ title: `Delete ${label}`, message: `Delete ${count} cached audio files for ${label}? They will be re-generated on next use.`, variant: 'danger' }))) return;
    setPurgingFeature(source);
    try {
      const res = await fetch('/api/admin/tts-cache', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
      });
      if (res.ok) loadCacheStats();
    } catch { /* silent */ }
    setPurgingFeature(null);
  };

  // ─── Derived data ─────────────────────────────────────────────────────────

  // Build per-user data combining briefings + cache stats
  const userEntries = Object.entries(cacheStats?.userStats ?? {}).map(([uid, u]) => ({
    userId: uid,
    name: u.name,
    email: u.email,
    totalFiles: u.files,
    sources: u.sources ?? {},
    fileDetails: u.fileDetails ?? [],
    briefings: briefings.filter(b => b.user_id === uid),
  }));

  // Also include users with briefings but no cache files
  const briefingUserIds = [...new Set(briefings.map(b => b.user_id))];
  for (const uid of briefingUserIds) {
    if (!userEntries.find(u => u.userId === uid)) {
      const b = briefings.find(x => x.user_id === uid)!;
      userEntries.push({
        userId: uid,
        name: b.user ? [b.user.first_name, b.user.last_name].filter(Boolean).join(' ') || '—' : uid.slice(0, 8),
        email: b.user?.email ?? '',
        totalFiles: 0,
        sources: {},
        fileDetails: [],
        briefings: briefings.filter(x => x.user_id === uid),
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

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
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
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

      {/* ═══ TAB: AI Generation ═══════════════════════════════════════════════ */}
      {activeTab === 'briefings' && (
        <>
          {/* ── Section 1: Global Overview ───────────────────────────────────── */}
          <StatCardRow>
            <StatCard
              value={stats?.total ?? 0}
              label="Total Briefings"
              variant="default"
              detail={stats ? `${stats.unique_users} user${stats.unique_users !== 1 ? 's' : ''}` : undefined}
            />
            <StatCard
              value={cacheStats?.totalFiles ?? 0}
              label="Cached Audio Files"
              variant={cacheStats && cacheStats.totalFiles > 0 ? 'emerald' : 'default'}
              detail={cacheStats ? fmtSize(cacheStats.totalSize) : undefined}
            />
            <StatCard
              value={cacheStats?.trackedFiles ?? 0}
              label="Tracked"
              variant="default"
              detail={(cacheStats?.orphanedFiles ?? 0) > 0 ? `${cacheStats!.orphanedFiles} untracked` : 'All tracked'}
            />
            <StatCard
              value={
                stats
                  ? Object.entries(stats.lang_counts).map(([l, n]) => `${LANG_FLAGS[l] ?? l} ${n}`).join('  ')
                  : '—'
              }
              label="Languages"
              variant="default"
            />
          </StatCardRow>

          {/* ── Section 2: TTS Cache Management ─────────────────────────────── */}
          <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden shadow-sm mb-6">
            <div className="px-5 py-4 border-b border-[#0e393d]/8 bg-[#0e393d]/[0.02] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[#0e393d]">TTS Audio Cache</h2>
                <p className="text-[10px] text-[#1c2a2b]/40 mt-0.5">Cached in Supabase Storage — never expires unless purged</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadCacheStats}
                  disabled={cacheLoading}
                  className="px-3 py-1.5 rounded-lg border border-[#0e393d]/10 text-xs text-[#0e393d]/40 hover:text-[#0e393d] hover:border-[#0e393d]/20 transition disabled:opacity-30"
                >
                  Refresh
                </button>
                <button
                  onClick={purgeAll}
                  disabled={purging || !cacheStats?.totalFiles}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200/60 transition disabled:opacity-30"
                >
                  {purging ? 'Purging…' : 'Purge All'}
                </button>
              </div>
            </div>

            {/* Feature cards grid */}
            <div className="px-5 py-4">
              {cacheLoading && !cacheStats ? (
                <div className="text-xs text-[#1c2a2b]/40 text-center py-4">Loading cache stats…</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {FEATURES.map(({ key, icon, source, desc }) => {
                    const feat = cacheStats?.byFeature?.[key];
                    const count = feat?.count ?? 0;
                    return (
                      <div
                        key={key}
                        className={`rounded-xl border px-4 py-3 transition ${
                          count > 0
                            ? 'border-[#0e393d]/10 bg-white'
                            : 'border-[#0e393d]/5 bg-[#fafaf8] opacity-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="text-lg leading-none">{icon}</div>
                          {count > 0 && (
                            <button
                              onClick={() => purgeFeature(source, key, count)}
                              disabled={purgingFeature === source}
                              className="p-1 rounded-md text-red-300 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-30"
                              title={`Delete ${key} cache`}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                              </svg>
                            </button>
                          )}
                        </div>
                        <div className="text-2xl font-semibold text-[#0e393d] mt-1">{count}</div>
                        <div className="text-[11px] text-[#1c2a2b]/50 mt-0.5">{key}</div>
                        <div className="text-[9px] text-[#1c2a2b]/25 mt-0.5">{desc}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Language breakdown */}
              {cacheStats && Object.keys(cacheStats.byLang).length > 0 && (
                <div className="flex gap-4 mt-4 pt-3 border-t border-[#0e393d]/5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[#0e393d]/30">By Language</span>
                  {Object.entries(cacheStats.byLang).map(([lang, { files, size }]) => (
                    <span key={lang} className="text-xs text-[#1c2a2b]/50">
                      {LANG_FLAGS[lang] ?? lang}
                      <span className="font-medium text-[#0e393d] ml-1">{files}</span>
                      <span className="text-[10px] text-[#1c2a2b]/25 ml-1">({fmtSize(size)})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Section 2b: System Voice Briefings ──────────────────────────── */}
          {systemBriefings.length > 0 && (
            <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden shadow-sm mb-6">
              <div className="px-5 py-4 border-b border-[#0e393d]/8 bg-[#0e393d]/[0.02] flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-[#0e393d]">System Voice Briefings</h2>
                  <p className="text-[10px] text-[#1c2a2b]/40 mt-0.5">ElevenLabs-generated voice messages for pages — managed in Site Settings</p>
                </div>
                <a
                  href="/en/admin/site-settings"
                  className="px-3 py-1.5 rounded-lg border border-[#0e393d]/10 text-xs text-[#0e393d]/40 hover:text-[#0e393d] hover:border-[#0e393d]/20 transition"
                >
                  Manage
                </a>
              </div>
              <div className="divide-y divide-[#0e393d]/5">
                {systemBriefings.map(vb => {
                  const audioLangs = (['en', 'de', 'fr', 'es', 'it'] as const).filter(
                    l => vb[`audio_url_${l}` as keyof SystemVoiceBriefing]
                  );
                  return (
                    <div key={vb.id} className="flex items-center gap-4 px-5 py-3">
                      <div className="text-lg leading-none">📢</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[#0e393d]">{vb.title}</div>
                        <div className="text-[10px] text-[#1c2a2b]/35">
                          Page: <span className="font-medium">{vb.page}</span>
                          <span className="mx-1.5">·</span>
                          Slug: <span className="font-mono">{vb.slug}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {audioLangs.map(l => (
                          <span key={l} className="text-[11px]">{LANG_FLAGS[l]}</span>
                        ))}
                      </div>
                      <span className="text-[10px] text-[#1c2a2b]/30">{audioLangs.length} audio files</span>
                      <AdminBadge color={vb.is_active ? 'green' : 'gray'}>
                        {vb.is_active ? 'Active' : 'Inactive'}
                      </AdminBadge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Section 3: Per-User Detail ───────────────────────────────────── */}
          <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden shadow-sm mb-6">
            <div className="px-5 py-4 border-b border-[#0e393d]/8 bg-[#0e393d]/[0.02]">
              <h2 className="text-sm font-semibold text-[#0e393d]">Users</h2>
              <p className="text-[10px] text-[#1c2a2b]/40 mt-0.5">Content generated per user — click to expand details</p>
            </div>

            {userEntries.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-[#1c2a2b]/30">No user data yet</div>
            ) : (
              <div className="divide-y divide-[#0e393d]/5">
                {userEntries.map(user => {
                  const isExpanded = expandedUser === user.userId;
                  return (
                    <div key={user.userId}>
                      <button
                        onClick={() => setExpandedUser(isExpanded ? null : user.userId)}
                        className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-[#fafaf8] transition text-left"
                      >
                        {/* User info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-[#0e393d] text-sm">{user.name}</div>
                          <div className="text-[10px] text-[#1c2a2b]/35 truncate">{user.email}</div>
                        </div>

                        {/* Feature mini-badges */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {FEATURES.map(({ key, icon, source }) => {
                            const count = user.sources[source] ?? 0;
                            return (
                              <div
                                key={key}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${
                                  count > 0
                                    ? 'bg-[#0e393d]/8 text-[#0e393d] font-medium'
                                    : 'bg-[#0e393d]/3 text-[#1c2a2b]/20'
                                }`}
                                title={key}
                              >
                                <span className="text-[10px] leading-none">{icon}</span>
                                {count}
                              </div>
                            );
                          })}
                        </div>

                        {/* Total & expand arrow */}
                        <div className="text-xs text-[#0e393d]/50 font-medium shrink-0 w-16 text-right">
                          {user.totalFiles} file{user.totalFiles !== 1 ? 's' : ''}
                        </div>
                        <div className="text-xs text-[#0e393d]/50 font-medium shrink-0 w-20 text-right">
                          {user.briefings.length} briefing{user.briefings.length !== 1 ? 's' : ''}
                        </div>
                        <svg
                          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                          className={`text-[#1c2a2b]/30 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>

                      {/* Expanded user detail */}
                      {isExpanded && (
                        <div className="bg-[#fafaf8] border-t border-[#0e393d]/5 px-5 py-4 space-y-4">
                          {/* Feature sections – each feature with file count header + expandable file list */}
                          {FEATURES.map(({ key, icon, source }) => {
                            const count = user.sources[source] ?? 0;
                            const featureFiles = user.fileDetails.filter(f => f.source === source);
                            const featureBriefings = source === 'briefing' ? user.briefings : [];
                            const hasContent = count > 0 || featureBriefings.length > 0;
                            const featureExpandKey = `${user.userId}:${source}`;
                            const isFeatureExpanded = expandedFeatures[featureExpandKey];

                            return (
                              <div key={key}>
                                <button
                                  onClick={() => {
                                    if (!hasContent) return;
                                    setExpandedFeatures(prev => ({ ...prev, [featureExpandKey]: !prev[featureExpandKey] }));
                                  }}
                                  className={`w-full flex items-center gap-2 rounded-lg border px-3 py-2.5 transition text-left ${
                                    hasContent
                                      ? 'border-[#0e393d]/10 bg-white hover:bg-[#0e393d]/[0.02] cursor-pointer'
                                      : 'border-[#0e393d]/5 bg-white/50 opacity-40 cursor-default'
                                  }`}
                                >
                                  <span className="text-base leading-none">{icon}</span>
                                  <span className="text-[11px] font-semibold text-[#0e393d]">{key}</span>
                                  <span className={`text-[11px] font-medium ml-1 ${count > 0 ? 'text-[#0e393d]' : 'text-[#1c2a2b]/25'}`}>
                                    {count} file{count !== 1 ? 's' : ''}
                                  </span>
                                  {source === 'briefing' && featureBriefings.length > 0 && (
                                    <span className="text-[10px] text-[#1c2a2b]/35">
                                      · {featureBriefings.length} briefing{featureBriefings.length !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                  {featureFiles.length > 0 && (
                                    <span className="text-[10px] text-[#1c2a2b]/25 ml-auto">
                                      {fmtSize(featureFiles.reduce((s, f) => s + (f.size_bytes ?? 0), 0))}
                                    </span>
                                  )}
                                  {hasContent && (
                                    <svg
                                      width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                      className={`text-[#1c2a2b]/25 transition-transform shrink-0 ${isFeatureExpanded ? 'rotate-180' : ''}`}
                                    >
                                      <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                  )}
                                </button>

                                {/* Expanded feature detail */}
                                {isFeatureExpanded && hasContent && (
                                  <div className="mt-1 space-y-1 pl-3">
                                    {/* ── Briefing entries (only for Health Briefing) ── */}
                                    {source === 'briefing' && featureBriefings.map(b => {
                                      const isBriefingExpanded = expandedId === b.id;
                                      const steps = expandedSteps[b.id];
                                      const isLoadingBriefingSteps = loadingSteps === b.id;
                                      return (
                                        <div key={b.id} className="rounded-lg border border-[#0e393d]/8 bg-white overflow-hidden">
                                          <div className="flex items-center">
                                            <button
                                              onClick={() => toggleExpand(b.id)}
                                              className="flex-1 flex items-center text-left px-3 py-2.5 gap-3 hover:bg-[#fafaf8] transition"
                                            >
                                              <span className="text-base shrink-0">{LANG_FLAGS[b.lang] ?? b.lang}</span>
                                              <span className="font-mono text-[10px] bg-[#0e393d]/5 px-2 py-0.5 rounded shrink-0">
                                                {b.model_used.replace('claude-', '').replace('-4-6', ' 4.6').replace('-4-5', ' 4.5')}
                                              </span>
                                              <span className="tabular-nums text-[11px] text-[#1c2a2b]/50 shrink-0">
                                                {b.tokens_used?.toLocaleString() ?? '—'} tokens
                                              </span>
                                              <span className="tabular-nums text-[11px] text-[#1c2a2b]/50 shrink-0">
                                                {fmtDuration(b.duration_ms)}
                                              </span>
                                              <span className="text-[11px] text-[#1c2a2b]/35 ml-auto shrink-0">{fmt(b.created_at)}</span>
                                              <svg
                                                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                                className={`text-[#1c2a2b]/25 transition-transform shrink-0 ${isBriefingExpanded ? 'rotate-180' : ''}`}
                                              >
                                                <polyline points="6 9 12 15 18 9" />
                                              </svg>
                                            </button>
                                            <button
                                              onClick={() => deleteBriefing(b.id)}
                                              disabled={deleting === b.id}
                                              className="p-2 text-red-300 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-30"
                                            >
                                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                              </svg>
                                            </button>
                                          </div>

                                          {/* Expanded briefing steps */}
                                          {isBriefingExpanded && (
                                            <div className="bg-[#fafaf8] border-t border-[#0e393d]/5 px-3 py-3">
                                              {isLoadingBriefingSteps ? (
                                                <div className="text-xs text-[#1c2a2b]/30 text-center py-3">Loading steps…</div>
                                              ) : steps && steps.length > 0 ? (
                                                <div className="space-y-2">
                                                  {steps.map((step, i) => (
                                                    <div key={step.id || i} className="bg-white rounded-lg border border-[#0e393d]/6 p-3">
                                                      <div className="flex items-center gap-2 mb-1">
                                                        <span className="w-5 h-5 rounded-full bg-[#0e393d]/8 text-[9px] font-bold text-[#0e393d] flex items-center justify-center shrink-0">
                                                          {i + 1}
                                                        </span>
                                                        <span className="text-[11px] font-semibold text-[#0e393d]">{step.title}</span>
                                                        <span className="text-[8px] text-[#1c2a2b]/25 font-mono ml-auto">{step.highlight || '—'}</span>
                                                        <StepPlayer narration={step.narration} lang={b.lang} />
                                                      </div>
                                                      <p className="text-[11px] text-[#1c2a2b]/50 leading-relaxed pl-7">
                                                        {step.narration}
                                                      </p>
                                                      {step.audioCacheKey && (
                                                        <div className="flex items-center gap-2 mt-1.5 pl-7">
                                                          {step.audioCached ? (
                                                            <span className="inline-flex items-center gap-1 text-[8px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                                                              <svg width="7" height="7" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                                                              cached
                                                            </span>
                                                          ) : (
                                                            <span className="text-[8px] text-[#1c2a2b]/20 bg-[#1c2a2b]/5 px-1.5 py-0.5 rounded-full">not cached</span>
                                                          )}
                                                          <span className="text-[8px] font-mono text-[#1c2a2b]/15 truncate" title={step.audioCacheKey}>
                                                            {step.audioCacheKey}
                                                          </span>
                                                        </div>
                                                      )}
                                                    </div>
                                                  ))}
                                                </div>
                                              ) : (
                                                <div className="text-xs text-[#1c2a2b]/25 text-center py-3">No steps data</div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}

                                    {/* ── Audio file entries (for non-briefing features, or briefing files not linked to a briefing row) ── */}
                                    {featureFiles
                                      .filter(f => source !== 'briefing' || !f.briefing_id)
                                      .map(f => (
                                        <div key={f.id} className="rounded-lg border border-[#0e393d]/8 bg-white overflow-hidden">
                                          <div className="flex items-center px-3 py-2.5 gap-3">
                                            <span className="text-base shrink-0">{LANG_FLAGS[f.lang] ?? f.lang}</span>
                                            <span className="inline-flex items-center gap-1 text-[8px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full shrink-0">
                                              <svg width="7" height="7" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                                              cached
                                            </span>
                                            <span className="text-[10px] text-[#1c2a2b]/30 tabular-nums shrink-0">
                                              {fmtSize(f.size_bytes ?? 0)}
                                            </span>
                                            <span className="text-[8px] font-mono text-[#1c2a2b]/15 truncate flex-1 min-w-0" title={f.storage_path}>
                                              {f.storage_path}
                                            </span>
                                            <span className="text-[11px] text-[#1c2a2b]/35 shrink-0">{fmt(f.created_at)}</span>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
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

      {/* ═══ TAB: Journey Config ════════════════════════════════════════════ */}
      {activeTab === 'journey' && (
        <div className="max-w-2xl">
          {journeyLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-[#1c2a2b]/40">Loading journey configuration…</div>
          ) : journeyConfig ? (
            <div className="space-y-6">
              {/* Journey explainer */}
              <div className="rounded-xl border border-[#0e393d]/10 bg-gradient-to-br from-white to-[#0e393d]/[0.02] px-5 py-4">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-[#ceab84] mb-2">How the Journey Works</h3>
                <p className="text-xs text-[#1c2a2b]/50 leading-relaxed">
                  Users progress through 3 phases of lifestyle lessons. They start with <strong className="text-[#0e393d]">Daily Dozen</strong> (Dr. Greger&apos;s 12 daily health recommendations). After maintaining a streak, they unlock <strong className="text-[#0e393d]">21 Tweaks</strong> (weight management optimizations). The final phase, <strong className="text-[#0e393d]">Anti-Aging 8</strong>, unlocks after a longer streak and optionally requires biomarker data. Each day, the AI coach assigns lessons up to the daily limit and tracks completion.
                </p>
              </div>

              {/* Config card */}
              <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-[#0e393d]/8 bg-[#0e393d]/[0.02] flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-[#0e393d]">Journey Configuration</h2>
                    <p className="text-[10px] text-[#1c2a2b]/40 mt-0.5">Configure unlock thresholds and daily limits</p>
                  </div>
                  <button
                    onClick={saveJourneyConfig}
                    disabled={journeySaving}
                    className={`px-5 py-2 rounded-xl text-sm font-medium shadow-sm transition ${
                      journeySaved
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#0e393d] text-white hover:bg-[#0e393d]/90 shadow-[#0e393d]/20'
                    } disabled:opacity-50`}
                  >
                    {journeySaving ? 'Saving…' : journeySaved ? 'Saved ✓' : 'Save'}
                  </button>
                </div>

                <div className="p-5 space-y-5">
                  {/* Phase unlock thresholds */}
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84] mb-3">Phase Unlock Thresholds</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-[#0e393d]/70 mb-1">21 Tweaks — Streak Days</label>
                        <input
                          type="number"
                          value={journeyConfig.tweaks_unlock_streak}
                          onChange={e => setJourneyConfig({ ...journeyConfig, tweaks_unlock_streak: parseInt(e.target.value) || 0 })}
                          className={inputCls}
                        />
                        <p className="mt-1 text-[10px] text-[#1c2a2b]/35">Days of Daily Dozen streak to unlock Tweaks</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#0e393d]/70 mb-1">Anti-Aging 8 — Streak Days</label>
                        <input
                          type="number"
                          value={journeyConfig.anti_aging_unlock_streak}
                          onChange={e => setJourneyConfig({ ...journeyConfig, anti_aging_unlock_streak: parseInt(e.target.value) || 0 })}
                          className={inputCls}
                        />
                        <p className="mt-1 text-[10px] text-[#1c2a2b]/35">Days of streak to unlock Anti-Aging phase</p>
                      </div>
                    </div>
                  </div>

                  {/* Daily limit */}
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84] mb-3">Daily Limits</div>
                    <div className="max-w-xs">
                      <label className="block text-xs font-medium text-[#0e393d]/70 mb-1">Max Lessons Per Day</label>
                      <input
                        type="number"
                        value={journeyConfig.daily_lesson_limit}
                        onChange={e => setJourneyConfig({ ...journeyConfig, daily_lesson_limit: parseInt(e.target.value) || 0 })}
                        className={inputCls}
                      />
                      <p className="mt-1 text-[10px] text-[#1c2a2b]/35">How many lessons the coach assigns each day</p>
                    </div>
                  </div>

                  {/* Toggles */}
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84] mb-3">Features</div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-lg border border-[#0e393d]/8 px-4 py-3">
                        <div>
                          <div className="text-sm text-[#0e393d]">Morning Check-In</div>
                          <div className="text-[10px] text-[#1c2a2b]/35">Daily voice check-in reminder for users</div>
                        </div>
                        <AdminToggle
                          checked={journeyConfig.morning_checkin_enabled}
                          onChange={v => setJourneyConfig({ ...journeyConfig, morning_checkin_enabled: v })}
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-[#0e393d]/8 px-4 py-3">
                        <div>
                          <div className="text-sm text-[#0e393d]">Auto-Unlock Phases</div>
                          <div className="text-[10px] text-[#1c2a2b]/35">Automatically unlock next phase when streak threshold is met</div>
                        </div>
                        <AdminToggle
                          checked={journeyConfig.auto_unlock_enabled}
                          onChange={v => setJourneyConfig({ ...journeyConfig, auto_unlock_enabled: v })}
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-[#0e393d]/8 px-4 py-3">
                        <div>
                          <div className="text-sm text-[#0e393d]">Require Biomarkers for Anti-Aging</div>
                          <div className="text-[10px] text-[#1c2a2b]/35">User must have lab results before unlocking Anti-Aging 8</div>
                        </div>
                        <AdminToggle
                          checked={journeyConfig.requires_biomarkers_for_anti_aging}
                          onChange={v => setJourneyConfig({ ...journeyConfig, requires_biomarkers_for_anti_aging: v })}
                        />
                      </div>
                    </div>
                  </div>

                  {journeyError && (
                    <div className="rounded-lg bg-red-50 border border-red-200/60 px-4 py-3 text-xs text-red-700">{journeyError}</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <div className="text-sm text-[#1c2a2b]/40">No journey configuration found</div>
              <button onClick={loadJourneyConfig} className="text-xs text-[#0e393d] hover:text-[#0e393d]/70 transition">Try loading again</button>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: Voice Test ═══════════════════════════════════════════════ */}
      {activeTab === 'voice' && (
        <div className="flex flex-col items-center gap-4">
          <div className="bg-white rounded-xl border border-[#0e393d]/[.07] p-6 w-full max-w-2xl">
            <p className="text-xs text-[#1c2a2b]/50 text-center mb-6">
              Test voice conversation modes here. Credits are not deducted for admin users.
            </p>
            <div className="flex justify-center">
              <VoiceConversation lang="en" />
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: User Progress ═══════════════════════════════════════════ */}
      {activeTab === 'progress' && (
        <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-[#0e393d]/8 bg-[#0e393d]/[0.02] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#0e393d]">User Lesson Progress</h2>
            <button
              onClick={loadProgressData}
              className="px-3 py-1.5 rounded-lg border border-[#0e393d]/10 text-xs text-[#0e393d]/40 hover:text-[#0e393d] hover:border-[#0e393d]/20 transition"
            >
              Refresh
            </button>
          </div>

          {progressLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-[#1c2a2b]/40">Loading…</div>
          ) : progressData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <div className="text-sm text-[#1c2a2b]/30">No lesson progress yet</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#0e393d]/[0.03] border-b border-[#0e393d]/8">
                  <tr>
                    {['User', 'Lesson', 'Framework', 'Status', 'Assigned By', 'Assigned', 'Completed'].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#0e393d]/50">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0e393d]/5">
                  {progressData.map(row => (
                    <tr key={row.id} className="hover:bg-[#fafaf8] transition-colors">
                      <td className="px-3 py-3 text-xs text-[#0e393d]">
                        {row.profiles ? (
                          <div>
                            <div className="font-medium">{[row.profiles.first_name, row.profiles.last_name].filter(Boolean).join(' ') || '—'}</div>
                            <div className="text-[10px] text-[#1c2a2b]/35">{row.profiles.email}</div>
                          </div>
                        ) : <span className="text-[#1c2a2b]/30">{row.user_id.slice(0, 8)}…</span>}
                      </td>
                      <td className="px-3 py-3 text-xs text-[#0e393d]">{row.lifestyle_lessons?.title_en || '—'}</td>
                      <td className="px-3 py-3 text-xs text-[#1c2a2b]/50">{row.lifestyle_lessons?.framework || '—'}</td>
                      <td className="px-3 py-3">
                        <AdminBadge color={row.status === 'completed' ? 'green' : row.status === 'in_progress' ? 'teal' : 'gray'}>
                          {row.status}
                        </AdminBadge>
                      </td>
                      <td className="px-3 py-3 text-xs text-[#1c2a2b]/50">{row.assigned_by || '—'}</td>
                      <td className="px-3 py-3 text-xs text-[#1c2a2b]/40 whitespace-nowrap">{fmt(row.assigned_at)}</td>
                      <td className="px-3 py-3 text-xs text-[#1c2a2b]/40 whitespace-nowrap">{row.completed_at ? fmt(row.completed_at) : '—'}</td>
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
