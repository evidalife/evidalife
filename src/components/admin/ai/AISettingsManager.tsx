'use client';

import { useState, useEffect, useCallback } from 'react';
import PageShell from '@/components/admin/PageShell';

interface Setting {
  key: string;
  value: unknown;
  updated_at: string;
}

interface KeyStatus {
  anthropic: boolean;
  openai: boolean;
  elevenlabs: boolean;
}

const DOMAIN_LABELS: Record<string, string> = {
  heart_vessels:    'Heart & Vessels',
  metabolism:       'Metabolism',
  inflammation:     'Inflammation',
  organ_function:   'Organ Function',
  nutrients:        'Nutrients',
  hormones:         'Hormones',
  epigenetics:      'Epigenetics',
  body_composition: 'Body Composition',
  fitness:          'Fitness',
};

const DOMAIN_ICONS: Record<string, string> = {
  heart_vessels: '❤️', metabolism: '⚡', inflammation: '🛡️',
  organ_function: '🫁', nutrients: '🥗', hormones: '🧬',
  epigenetics: '🧪', body_composition: '🏋️', fitness: '🏃',
};

const BRIEFING_MODELS = [
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (recommended)' },
  { value: 'claude-opus-4-6', label: 'Claude Opus 4.6 (more detailed, slower)' },
];

const CHAT_MODELS = [
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (fast, cheap)' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (more nuanced)' },
];

const TTS_PROVIDERS = [
  { value: 'elevenlabs', label: 'ElevenLabs (recommended — natural voice)' },
  { value: 'openai', label: 'OpenAI TTS-1-HD (fallback)' },
  { value: 'browser', label: 'Browser SpeechSynthesis (free, lower quality)' },
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
  const [briefingEnabled, setBriefingEnabled] = useState<boolean>(() =>
    settingValue(initialSettings, 'briefing_enabled', true)
  );
  const [companionEnabled, setCompanionEnabled] = useState<boolean>(() =>
    settingValue(initialSettings, 'companion_enabled', true)
  );
  const [domainWeights, setDomainWeights] = useState<Record<string, number>>(() =>
    settingValue(initialSettings, 'domain_weights', {
      heart_vessels: 0.18, metabolism: 0.16, inflammation: 0.14,
      organ_function: 0.13, nutrients: 0.10, hormones: 0.09,
      epigenetics: 0.10, body_composition: 0.05, fitness: 0.05,
    })
  );

  const totalWeight = Object.values(domainWeights).reduce((a, b) => a + b, 0);
  const weightOk = Math.abs(totalWeight - 1.0) < 0.001;

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
        briefing_enabled: briefingEnabled,
        companion_enabled: companionEnabled,
        domain_weights: domainWeights,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setDirty(false);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const updateWeight = (domain: string, val: number) => {
    setDomainWeights(prev => ({ ...prev, [domain]: Math.round(val * 100) / 100 }));
    markDirty();
  };

  const normalizeWeights = () => {
    const total = Object.values(domainWeights).reduce((a, b) => a + b, 0);
    if (total === 0) return;
    setDomainWeights(prev =>
      Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, Math.round((v / total) * 100) / 100]))
    );
    markDirty();
  };

  const resetWeights = () => {
    setDomainWeights({
      heart_vessels: 0.18, metabolism: 0.16, inflammation: 0.14,
      organ_function: 0.13, nutrients: 0.10, hormones: 0.09,
      epigenetics: 0.10, body_composition: 0.05, fitness: 0.05,
    });
    markDirty();
  };

  return (
    <PageShell
      title="AI Settings"
      description="Configure AI models, TTS providers, domain weights, and feature flags."
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
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: 'anthropic', label: 'Anthropic (Claude)', note: 'Required for briefings and chat' },
              { key: 'elevenlabs', label: 'ElevenLabs TTS', note: 'Primary text-to-speech' },
              { key: 'openai', label: 'OpenAI', note: 'Fallback TTS (tts-1-hd)' },
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
          <p className="mt-3 text-[10px] text-[#1c2a2b]/35">
            Keys are loaded from server environment variables. Set them in <code className="font-mono bg-[#0e393d]/[.06] px-1 py-0.5 rounded">.env.local</code> and Vercel project settings.
          </p>
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
          </div>
        </div>

        {/* Model Selection */}
        <div className="bg-white rounded-xl border border-[#0e393d]/[.07] p-6">
          <h2 className="text-[13px] font-semibold text-[#0e393d] mb-4">Model Selection</h2>
          <div className="space-y-4">
            {[
              { label: 'Briefing Model', desc: 'Used to generate the 5-step personalized audio briefing', options: BRIEFING_MODELS, value: briefingModel, onChange: (v: string) => { setBriefingModel(v); markDirty(); } },
              { label: 'Chat Model', desc: 'Used for Q&A during briefing and floating coach chat', options: CHAT_MODELS, value: chatModel, onChange: (v: string) => { setChatModel(v); markDirty(); } },
              { label: 'TTS Provider', desc: 'Text-to-speech service for audio briefing narration', options: TTS_PROVIDERS, value: ttsProvider, onChange: (v: string) => { setTtsProvider(v); markDirty(); } },
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

        {/* Domain Weights */}
        <div className="bg-white rounded-xl border border-[#0e393d]/[.07] p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-[13px] font-semibold text-[#0e393d]">Domain Weights</h2>
              <p className="text-[11px] text-[#1c2a2b]/40 mt-0.5">
                How much each health domain contributes to the Longevity Score. Must sum to 100%.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${weightOk ? 'bg-[#0C9C6C]/10 text-[#0C9C6C]' : 'bg-amber-100 text-amber-700'}`}>
                {(totalWeight * 100).toFixed(0)}% total
              </span>
              <button onClick={normalizeWeights} className="text-[11px] text-[#0e393d]/50 hover:text-[#0e393d] transition-colors border border-[#0e393d]/[.12] px-2.5 py-1 rounded-lg">
                Normalize
              </button>
              <button onClick={resetWeights} className="text-[11px] text-[#0e393d]/50 hover:text-[#0e393d] transition-colors border border-[#0e393d]/[.12] px-2.5 py-1 rounded-lg">
                Reset
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {Object.entries(domainWeights)
              .sort((a, b) => b[1] - a[1])
              .map(([domain, weight]) => (
                <div key={domain} className="flex items-center gap-4">
                  <div className="w-36 shrink-0">
                    <span className="mr-1.5 text-sm">{DOMAIN_ICONS[domain]}</span>
                    <span className="text-[12px] text-[#0e393d]">{DOMAIN_LABELS[domain] ?? domain}</span>
                  </div>
                  <div className="flex-1">
                    <input
                      type="range"
                      min={0}
                      max={50}
                      step={1}
                      value={Math.round(weight * 100)}
                      onChange={e => updateWeight(domain, parseInt(e.target.value) / 100)}
                      className="w-full h-1.5 appearance-none rounded-full bg-[#0e393d]/10 accent-[#0e393d]"
                    />
                  </div>
                  <div className="w-12 text-right">
                    <input
                      type="number"
                      min={0}
                      max={50}
                      step={1}
                      value={Math.round(weight * 100)}
                      onChange={e => updateWeight(domain, parseInt(e.target.value) / 100)}
                      className="w-full text-right text-[12px] font-semibold text-[#0e393d] border-b border-[#0e393d]/[.15] bg-transparent outline-none"
                    />
                  </div>
                  <span className="text-[11px] text-[#1c2a2b]/30 w-4">%</span>
                </div>
              ))}
          </div>

          {!weightOk && (
            <div className="mt-4 flex items-center gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Weights sum to {(totalWeight * 100).toFixed(0)}% — click Normalize to fix
            </div>
          )}
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
