'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import PageShell from '@/components/admin/PageShell';
import { ELEVENLABS_VOICES, OPENAI_VOICES, VOICE_ROLES } from '@/lib/voice/types';
import type { VoiceRole } from '@/lib/voice/types';

interface Setting {
  key: string;
  value: unknown;
  updated_at: string;
}

interface KeyStatus {
  anthropic: boolean;
  openai: boolean;
  elevenlabs: boolean;
  deepgram: boolean;
}


const BRIEFING_MODELS = [
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (recommended)' },
  { value: 'claude-opus-4-6', label: 'Claude Opus 4.6 (more detailed, slower)' },
];

const CHAT_MODELS = [
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (fast, cheap)' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (more nuanced)' },
];

const TTS_PROVIDERS = [
  { value: 'elevenlabs', label: 'ElevenLabs — natural, multilingual' },
  { value: 'openai', label: 'OpenAI TTS-1 — fast, reliable' },
  { value: 'browser', label: 'Browser SpeechSynthesis — free, lower quality' },
];

const STT_PROVIDERS = [
  { value: 'web_speech_api', label: 'Web Speech API (free — Chrome/Edge only)' },
  { value: 'deepgram', label: 'Deepgram Nova-2 (all browsers, higher accuracy)' },
];

function settingValue<T>(settings: Setting[], key: string, fallback: T): T {
  const s = settings.find(s => s.key === key);
  if (!s) return fallback;
  return (s.value as T) ?? fallback;
}

export default function AISettingsManager({
  initialSettings,
  initialKeyStatus,
}: {
  initialSettings: Setting[];
  initialKeyStatus: KeyStatus;
}) {
  const [settings, setSettings] = useState<Setting[]>(initialSettings);
  const [keyStatus] = useState<KeyStatus>(initialKeyStatus);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Derived state from settings
  const [briefingModel, setBriefingModel] = useState<string>(() =>
    settingValue(initialSettings, 'briefing_model', 'claude-sonnet-4-6')
  );
  const [chatModel, setChatModel] = useState<string>(() =>
    settingValue(initialSettings, 'chat_model', 'claude-haiku-4-5-20251001')
  );
  const [ttsProvider, setTtsProvider] = useState<string>(() =>
    settingValue(initialSettings, 'tts_provider', 'elevenlabs')
  );
  const [sttProvider, setSttProvider] = useState<string>(() =>
    settingValue(initialSettings, 'stt_provider', 'web_speech_api')
  );
  const [ttsBackupProvider, setTtsBackupProvider] = useState<string>(() =>
    settingValue(initialSettings, 'tts_backup_provider', 'openai')
  );
  // Per-role TTS provider assignments
  const defaultProvidersByRole: Record<string, { primary: string; backup: string }> = {
    briefing: { primary: 'elevenlabs', backup: 'openai' },
    coach:    { primary: 'openai',     backup: 'browser' },
    research: { primary: 'openai',     backup: 'browser' },
  };
  const [providersByRole, setProvidersByRole] = useState<Record<string, { primary: string; backup: string }>>(() =>
    settingValue(initialSettings, 'tts_providers_by_role', defaultProvidersByRole)
  );
  // Per-role voice assignments (ElevenLabs)
  const defaultRoleVoices = { briefing: '21m00Tcm4TlvDq8ikWAM', coach: 'EXAVITQu4vr4xnSDxMaL', research: 'onwK4e9ZLuTAKqWW03F9' };
  const [roleVoicesEL, setRoleVoicesEL] = useState<Record<string, string>>(() =>
    settingValue(initialSettings, 'voice_roles_elevenlabs', defaultRoleVoices)
  );
  // Per-role voice assignments (OpenAI)
  const defaultRoleVoicesOAI = { briefing: 'nova', coach: 'shimmer', research: 'echo' };
  const [roleVoicesOAI, setRoleVoicesOAI] = useState<Record<string, string>>(() =>
    settingValue(initialSettings, 'voice_roles_openai', defaultRoleVoicesOAI)
  );
  // Active role tab for voice selection
  const [activeVoiceRole, setActiveVoiceRole] = useState<VoiceRole>('briefing');
  // Audio preview
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState<string | null>(null);
  const [briefingEnabled, setBriefingEnabled] = useState<boolean>(() =>
    settingValue(initialSettings, 'briefing_enabled', true)
  );
  const [companionEnabled, setCompanionEnabled] = useState<boolean>(() =>
    settingValue(initialSettings, 'companion_enabled', true)
  );
  const [briefingPregenerate, setBriefingPregenerate] = useState<string>(() =>
    settingValue(initialSettings, 'briefing_pregenerate', 'off')
  );

  const markDirty = useCallback(() => setDirty(true), []);

  useEffect(() => { void settings; }, [settings]); // suppress unused warning

  const save = async () => {
    setSaving(true);
    setSaved(false);
    const res = await fetch('/api/admin/ai-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        briefing_model: briefingModel,
        chat_model: chatModel,
        tts_provider: ttsProvider,
        tts_backup_provider: ttsBackupProvider,
        tts_providers_by_role: providersByRole,
        stt_provider: sttProvider,
        voice_roles_elevenlabs: roleVoicesEL,
        voice_roles_openai: roleVoicesOAI,
        briefing_enabled: briefingEnabled,
        companion_enabled: companionEnabled,
        briefing_pregenerate: briefingPregenerate,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setDirty(false);
      setTimeout(() => setSaved(false), 3000);
    }
  };


  // Voice preview playback
  const playPreview = useCallback(async (voiceId: string, provider: 'elevenlabs' | 'openai') => {
    // Stop any playing preview
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }

    // If clicking same voice, just stop
    if (previewPlaying === `${provider}:${voiceId}`) {
      setPreviewPlaying(null);
      return;
    }

    setPreviewPlaying(`${provider}:${voiceId}`);

    try {
      // Generate a short TTS sample via our API
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Hello, I am your Evida health companion. How are you feeling today?',
          lang: 'en',
          // Pass specific voice override for preview
          _preview_voice: voiceId,
          _preview_provider: provider,
        }),
      });

      if (!res.ok) throw new Error('TTS failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      previewAudioRef.current = audio;

      audio.onended = () => {
        setPreviewPlaying(null);
        URL.revokeObjectURL(url);
        previewAudioRef.current = null;
      };

      await audio.play();
    } catch {
      setPreviewPlaying(null);
    }
  }, [previewPlaying]);

  // Cleanup preview on unmount
  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);

  return (
    <PageShell
      title="AI Settings"
      description="Configure AI models, TTS providers, voice roles, and feature flags."
      action={
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0e393d] text-white text-[13px] font-medium hover:bg-[#0e393d]/90 disabled:opacity-40 transition-all"
        >
          {saving ? (
            <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : saved ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : null}
          {saved ? 'Saved' : 'Save Changes'}
        </button>
      }
    >
      <div className="space-y-6">

        {/* API Key Status */}
        <div className="bg-white rounded-xl border border-[#0e393d]/[.07] p-6">
          <h2 className="text-[13px] font-semibold text-[#0e393d] mb-4">API Key Status</h2>
          <div className="grid grid-cols-4 gap-4">
            {[
              { key: 'anthropic', label: 'Anthropic (Claude)', note: 'Required for briefings and chat' },
              { key: 'elevenlabs', label: 'ElevenLabs TTS', note: 'Primary text-to-speech' },
              { key: 'openai', label: 'OpenAI', note: 'Fallback TTS + embeddings' },
              { key: 'deepgram', label: 'Deepgram', note: 'Cross-browser STT (optional)' },
            ].map(({ key, label, note }) => {
              const configured = keyStatus[key as keyof KeyStatus];
              return (
                <div key={key} className={`rounded-lg border p-4 ${configured ? 'border-[#0C9C6C]/20 bg-[#0C9C6C]/[.03]' : 'border-amber-200 bg-amber-50'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${configured ? 'bg-[#0C9C6C]' : 'bg-amber-400'}`} />
                    <span className="text-[12px] font-semibold text-[#0e393d]">{label}</span>
                  </div>
                  <div className={`text-[10px] font-medium ${configured ? 'text-[#0C9C6C]' : 'text-amber-600'}`}>
                    {configured ? 'Configured ✓' : 'Not set'}
                  </div>
                  <div className="text-[10px] text-[#1c2a2b]/35 mt-1">{note}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[10px] text-[#1c2a2b]/35">
              Keys are loaded from server environment variables. Set them in <code className="font-mono bg-[#0e393d]/[.06] px-1 py-0.5 rounded">.env.local</code> and Vercel project settings.
            </p>
            <a href="/en/admin/ai-usage" className="text-[10px] font-medium text-[#0e393d]/50 hover:text-[#0e393d] transition-colors flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              View AI Usage Dashboard →
            </a>
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="bg-white rounded-xl border border-[#0e393d]/[.07] p-6">
          <h2 className="text-[13px] font-semibold text-[#0e393d] mb-4">Feature Flags</h2>
          <div className="space-y-3">
            {[
              {
                key: 'briefing',
                label: 'AI Health Briefing',
                desc: 'Show the "Listen now" briefing player on the Health Engine dashboard',
                value: briefingEnabled,
                onChange: (v: boolean) => { setBriefingEnabled(v); markDirty(); },
              },
              {
                key: 'companion',
                label: 'AI Companion (Floating Coach)',
                desc: 'Show the floating WFPB coach bubble on all pages',
                value: companionEnabled,
                onChange: (v: boolean) => { setCompanionEnabled(v); markDirty(); },
              },
            ].map(({ key, label, desc, value, onChange }) => (
              <div key={key} className="flex items-center justify-between py-3 border-b border-[#0e393d]/[.05] last:border-0">
                <div>
                  <div className="text-[13px] font-medium text-[#0e393d]">{label}</div>
                  <div className="text-[11px] text-[#1c2a2b]/40">{desc}</div>
                </div>
                <button
                  onClick={() => onChange(!value)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-[#0C9C6C]' : 'bg-[#0e393d]/15'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${value ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            ))}

            {/* Briefing Pre-generation */}
            <div className="pt-3 border-t border-[#0e393d]/[.05]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-medium text-[#0e393d]">Pre-generate Briefing</div>
                  <div className="text-[11px] text-[#1c2a2b]/40">
                    Automatically generate narration text + cache TTS audio so the user&apos;s briefing is instant.
                  </div>
                </div>
                <select
                  value={briefingPregenerate}
                  onChange={e => { setBriefingPregenerate(e.target.value); markDirty(); }}
                  className="rounded-lg border border-[#0e393d]/[.12] px-3 py-1.5 text-[12px] text-[#0e393d] bg-[#fafaf8] outline-none focus:border-[#0e393d]/30 transition-colors"
                >
                  <option value="off">Off — on demand only</option>
                  <option value="on_confirm">Auto — after report confirmation</option>
                </select>
              </div>
              {briefingPregenerate === 'on_confirm' && (
                <div className="mt-2 flex items-start gap-2 text-[10px] text-[#0e393d]/50 bg-[#0e393d]/[.03] rounded-lg px-3 py-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>
                    When a lab report is confirmed in the admin review, the system will generate the full briefing
                    and pre-cache all slide audio in the background. Costs ~28k tokens + 12 TTS calls per briefing.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Model Selection */}
        <div className="bg-white rounded-xl border border-[#0e393d]/[.07] p-6">
          <h2 className="text-[13px] font-semibold text-[#0e393d] mb-4">AI Models</h2>
          <div className="space-y-4">
            {[
              { label: 'Briefing Model', desc: 'Used to generate the personalized audio briefing script', options: BRIEFING_MODELS, value: briefingModel, onChange: (v: string) => { setBriefingModel(v); markDirty(); } },
              { label: 'Chat Model', desc: 'Used for Q&A during briefing, coach chat, and daily check-ins', options: CHAT_MODELS, value: chatModel, onChange: (v: string) => { setChatModel(v); markDirty(); } },
            ].map(({ label, desc, options, value, onChange }) => (
              <div key={label}>
                <label className="block text-[12px] font-medium text-[#0e393d] mb-1">{label}</label>
                <p className="text-[11px] text-[#1c2a2b]/40 mb-2">{desc}</p>
                <select
                  value={value}
                  onChange={e => onChange(e.target.value)}
                  className="w-full rounded-lg border border-[#0e393d]/[.12] px-3 py-2 text-[12px] text-[#0e393d] bg-[#fafaf8] outline-none focus:border-[#0e393d]/30 transition-colors"
                >
                  {options.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Voice Configuration */}
        <div className="bg-white rounded-xl border border-[#0e393d]/[.07] p-6">
          <h2 className="text-[13px] font-semibold text-[#0e393d] mb-1">Voice Configuration</h2>
          <p className="text-[11px] text-[#1c2a2b]/40 mb-4">
            Configure speech-to-text input and text-to-speech output. Assign different voices to different AI roles.
          </p>

          <div className="space-y-5">
            {/* STT Provider */}
            <div>
              <label className="block text-[12px] font-medium text-[#0e393d] mb-1">Speech-to-Text (STT) Provider</label>
              <p className="text-[11px] text-[#1c2a2b]/40 mb-2">How voice input is transcribed. Deepgram works on all browsers including Safari (required for iOS app).</p>
              <select
                value={sttProvider}
                onChange={e => { setSttProvider(e.target.value); markDirty(); }}
                className="w-full rounded-lg border border-[#0e393d]/[.12] px-3 py-2 text-[12px] text-[#0e393d] bg-[#fafaf8] outline-none focus:border-[#0e393d]/30 transition-colors"
              >
                {STT_PROVIDERS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {sttProvider === 'deepgram' && !keyStatus.deepgram && (
                <div className="mt-2 flex items-start gap-2 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>Deepgram requires a <code className="font-mono bg-amber-100 px-1 rounded">DEEPGRAM_API_KEY</code> in your environment variables.</span>
                </div>
              )}
            </div>

            {/* TTS Provider — Per-Feature Configuration */}
            <div>
              <label className="block text-[12px] font-medium text-[#0e393d] mb-1">Text-to-Speech (TTS) Providers</label>
              <p className="text-[11px] text-[#1c2a2b]/40 mb-3">Each feature has its own primary + backup TTS provider. Primary is tried first; if it fails the backup kicks in. Browser SpeechSynthesis is always the last resort.</p>
              <div className="space-y-3">
                {VOICE_ROLES.map(role => {
                  const rp = providersByRole[role.key] ?? { primary: 'elevenlabs', backup: 'openai' };
                  return (
                    <div key={role.key} className="bg-[#0e393d]/[.02] rounded-xl border border-[#0e393d]/[.06] px-4 py-3">
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className="text-sm">{role.icon}</span>
                        <span className="text-[12px] font-medium text-[#0e393d]">{role.label}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40 mb-1">Primary</label>
                          <select
                            value={rp.primary}
                            onChange={e => {
                              const val = e.target.value;
                              setProvidersByRole(prev => {
                                const cur = prev[role.key] ?? { primary: 'elevenlabs', backup: 'openai' };
                                const backup = val === cur.backup ? (val === 'elevenlabs' ? 'openai' : 'elevenlabs') : cur.backup;
                                return { ...prev, [role.key]: { primary: val, backup } };
                              });
                              markDirty();
                            }}
                            className="w-full rounded-lg border border-[#0e393d]/[.12] px-2.5 py-1.5 text-[11px] text-[#0e393d] bg-white outline-none focus:border-[#0e393d]/30 transition-colors"
                          >
                            {TTS_PROVIDERS.filter(o => o.value !== 'browser').map(o => (
                              <option key={o.value} value={o.value}>{o.label.split(' — ')[0]}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40 mb-1">Backup</label>
                          <select
                            value={rp.backup}
                            onChange={e => {
                              const val = e.target.value;
                              setProvidersByRole(prev => {
                                const cur = prev[role.key] ?? { primary: 'elevenlabs', backup: 'openai' };
                                const primary = val === cur.primary && val !== 'browser' ? (val === 'elevenlabs' ? 'openai' : 'elevenlabs') : cur.primary;
                                return { ...prev, [role.key]: { primary, backup: val } };
                              });
                              markDirty();
                            }}
                            className="w-full rounded-lg border border-[#0e393d]/[.12] px-2.5 py-1.5 text-[11px] text-[#0e393d] bg-white outline-none focus:border-[#0e393d]/30 transition-colors"
                          >
                            {TTS_PROVIDERS.map(o => (
                              <option key={o.value} value={o.value} disabled={o.value === rp.primary}>{o.label.split(' — ')[0]}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="mt-1.5 text-[10px] text-[#1c2a2b]/30">
                        {TTS_PROVIDERS.find(p => p.value === rp.primary)?.label.split(' — ')[0]}
                        {' → '}
                        {TTS_PROVIDERS.find(p => p.value === rp.backup)?.label.split(' — ')[0]}
                        {rp.backup !== 'browser' && <>{' → '}Browser SpeechSynthesis</>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Voice Role Tabs */}
            <div>
              <label className="block text-[12px] font-medium text-[#0e393d] mb-1">Voice Assignments by Role</label>
              <p className="text-[11px] text-[#1c2a2b]/40 mb-3">Each AI feature can have its own voice personality. Select a role, then pick the voice for each TTS provider.</p>
              <div className="flex gap-1 mb-4">
                {VOICE_ROLES.map(role => (
                  <button
                    key={role.key}
                    onClick={() => setActiveVoiceRole(role.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${
                      activeVoiceRole === role.key
                        ? 'bg-[#0e393d] text-white shadow-sm'
                        : 'bg-[#0e393d]/[.04] text-[#0e393d]/60 hover:bg-[#0e393d]/[.08]'
                    }`}
                  >
                    <span>{role.icon}</span>
                    <span>{role.label}</span>
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-[#1c2a2b]/35 mb-4 bg-[#0e393d]/[.02] rounded-lg px-3 py-2">
                {VOICE_ROLES.find(r => r.key === activeVoiceRole)?.description}
              </div>
            </div>

            {/* ElevenLabs Voice Grid for selected role */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-[12px] font-medium text-[#0e393d]">ElevenLabs Voice</label>
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                  providersByRole[activeVoiceRole]?.primary === 'elevenlabs'
                    ? 'bg-[#0C9C6C]/10 text-[#0C9C6C]'
                    : providersByRole[activeVoiceRole]?.backup === 'elevenlabs'
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-[#0e393d]/[.06] text-[#0e393d]/40'
                }`}>
                  {providersByRole[activeVoiceRole]?.primary === 'elevenlabs' ? 'PRIMARY' : providersByRole[activeVoiceRole]?.backup === 'elevenlabs' ? 'BACKUP' : 'INACTIVE'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ELEVENLABS_VOICES.map(voice => {
                  const isSelected = roleVoicesEL[activeVoiceRole] === voice.id;
                  const isPlaying = previewPlaying === `elevenlabs:${voice.id}`;
                  return (
                    <div
                      key={voice.id}
                      className={`relative text-left rounded-lg border p-3 transition-all ${
                        isSelected
                          ? 'border-[#0e393d] bg-[#0e393d]/[.04] ring-1 ring-[#0e393d]/20'
                          : 'border-[#0e393d]/[.08] hover:border-[#0e393d]/20'
                      }`}
                    >
                      <button
                        onClick={() => { setRoleVoicesEL(prev => ({ ...prev, [activeVoiceRole]: voice.id })); markDirty(); }}
                        className="w-full text-left"
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[12px] font-semibold text-[#0e393d]">{voice.name}</span>
                          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                            voice.gender === 'female' ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'
                          }`}>
                            {voice.gender}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#1c2a2b]/40">{voice.description}</div>
                        <div className="text-[9px] text-[#1c2a2b]/25 mt-0.5">{voice.accent} · {voice.use_case}</div>
                      </button>
                      {/* Selected checkmark — bottom-right */}
                      {isSelected && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0C9C6C" strokeWidth="2.5" className="absolute bottom-2.5 right-2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                      {/* Preview button — top-right */}
                      <button
                        onClick={(e) => { e.stopPropagation(); playPreview(voice.id, 'elevenlabs'); }}
                        className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                          isPlaying
                            ? 'bg-[#0e393d] text-white'
                            : 'bg-[#0e393d]/[.06] text-[#0e393d]/40 hover:bg-[#0e393d]/[.12] hover:text-[#0e393d]/60'
                        }`}
                        title={isPlaying ? 'Stop preview' : 'Play preview'}
                      >
                        {isPlaying ? (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                        ) : (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* OpenAI Voice Grid for selected role */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-[12px] font-medium text-[#0e393d]">OpenAI TTS Voice</label>
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                  providersByRole[activeVoiceRole]?.primary === 'openai'
                    ? 'bg-[#0C9C6C]/10 text-[#0C9C6C]'
                    : providersByRole[activeVoiceRole]?.backup === 'openai'
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-[#0e393d]/[.06] text-[#0e393d]/40'
                }`}>
                  {providersByRole[activeVoiceRole]?.primary === 'openai' ? 'PRIMARY' : providersByRole[activeVoiceRole]?.backup === 'openai' ? 'BACKUP' : 'INACTIVE'}
                </span>
              </div>
              <p className="text-[11px] text-[#1c2a2b]/40 mb-2">
                {providersByRole[activeVoiceRole]?.primary === 'openai'
                  ? `Primary voice for ${VOICE_ROLES.find(r => r.key === activeVoiceRole)?.label ?? 'this role'}.`
                  : providersByRole[activeVoiceRole]?.backup === 'openai'
                    ? 'Used automatically if the primary provider fails.'
                    : 'Currently inactive. Set as primary or backup above to use.'}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {OPENAI_VOICES.map(voice => {
                  const isSelected = roleVoicesOAI[activeVoiceRole] === voice.value;
                  const isPlaying = previewPlaying === `openai:${voice.value}`;
                  return (
                    <div
                      key={voice.value}
                      className={`relative text-left rounded-lg border p-3 transition-all ${
                        isSelected
                          ? 'border-[#0e393d] bg-[#0e393d]/[.04] ring-1 ring-[#0e393d]/20'
                          : 'border-[#0e393d]/[.08] hover:border-[#0e393d]/20'
                      }`}
                    >
                      <button
                        onClick={() => { setRoleVoicesOAI(prev => ({ ...prev, [activeVoiceRole]: voice.value })); markDirty(); }}
                        className="w-full text-left"
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[12px] font-semibold text-[#0e393d]">{voice.name}</span>
                          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                            voice.gender === 'female' ? 'bg-pink-50 text-pink-600' :
                            voice.gender === 'male' ? 'bg-blue-50 text-blue-600' :
                            'bg-gray-50 text-gray-500'
                          }`}>
                            {voice.gender}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#1c2a2b]/40">{voice.description}</div>
                        <div className="text-[9px] text-[#1c2a2b]/25 mt-0.5">{voice.use_case}</div>
                      </button>
                      {/* Selected checkmark — bottom-right */}
                      {isSelected && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0C9C6C" strokeWidth="2.5" className="absolute bottom-2.5 right-2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                      {/* Preview button — top-right */}
                      <button
                        onClick={(e) => { e.stopPropagation(); playPreview(voice.value, 'openai'); }}
                        className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                          isPlaying
                            ? 'bg-[#0e393d] text-white'
                            : 'bg-[#0e393d]/[.06] text-[#0e393d]/40 hover:bg-[#0e393d]/[.12] hover:text-[#0e393d]/60'
                        }`}
                        title={isPlaying ? 'Stop preview' : 'Play preview'}
                      >
                        {isPlaying ? (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                        ) : (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Future: Claude Realtime Voice */}
            <div className="opacity-40">
              <label className="block text-[12px] font-medium text-[#0e393d] mb-1">
                Claude Realtime Voice
                <span className="ml-2 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[#0e393d]/10 text-[#0e393d]/50">COMING SOON</span>
              </label>
              <p className="text-[11px] text-[#1c2a2b]/40 mb-2">
                Native voice-to-voice with Claude — sub-300ms latency. Available when Anthropic ships the Realtime Voice API.
              </p>
              <select disabled className="w-full rounded-lg border border-[#0e393d]/[.12] px-3 py-2 text-[12px] text-[#0e393d]/30 bg-[#fafaf8] outline-none cursor-not-allowed">
                <option>Orchestrated Pipeline (Deepgram STT → Claude → TTS)</option>
                <option>Claude Realtime Voice (pending API release)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Health Engine Settings Link */}
        <div className="bg-white rounded-xl border border-[#0e393d]/[.07] p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[13px] font-semibold text-[#0e393d]">Health Engine Configuration</h2>
              <p className="text-[11px] text-[#1c2a2b]/40 mt-0.5">
                Domain weights, bio age scoring, biomarker registry, and presentation rules have moved to their own page.
              </p>
            </div>
            <a
              href="/en/admin/health-engine"
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#0e393d] border border-[#0e393d]/[.15] hover:border-[#0e393d]/30 px-4 py-2 rounded-lg transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
              Health Engine Settings
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </a>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-[#0e393d]/[.03] border border-[#0e393d]/[.07] rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0e393d" strokeWidth="1.5" className="mt-0.5 shrink-0 opacity-40">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div className="text-[11px] text-[#1c2a2b]/50 leading-relaxed">
              <strong className="text-[#0e393d]/70">EU MDR 2017/745 Compliance:</strong> All AI outputs are informational and educational only.
              The system prompt strictly prevents diagnosis, treatment recommendations, or clinical prognosis.
              Never remove the medical disclaimer from user-facing AI responses.
            </div>
          </div>
        </div>

      </div>
    </PageShell>
  );
}
