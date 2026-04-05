'use client';

import { useState, useEffect, useRef } from 'react';
import { inputCls } from '@/components/admin/shared/AdminUI';

/* ─── Types ───────────────────────────────────────────────────────────────── */

interface VoiceBriefing {
  id: string;
  slug: string;
  title: string;
  page: string;
  voice_id: string;
  script_en: string;
  script_de: string;
  script_fr: string;
  script_es: string;
  script_it: string;
  audio_url_en: string | null;
  audio_url_de: string | null;
  audio_url_fr: string | null;
  audio_url_es: string | null;
  audio_url_it: string | null;
  status: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = (typeof LANGS)[number];

const LANG_LABELS: Record<Lang, string> = {
  en: 'English', de: 'Deutsch', fr: 'Français', es: 'Español', it: 'Italiano',
};

const VOICES = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', desc: 'Calm, warm (F, American)' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', desc: 'Soft, friendly (F, American)' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', desc: 'Warm, elegant (F, Swedish)' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', desc: 'Warm, clear (F, British)' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', desc: 'Articulate, confident (M, American)' },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', desc: 'Friendly, young (M, American)' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', desc: 'Deep, authoritative (M, British)' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', desc: 'Warm, mature (M, British)' },
];

const PAGE_OPTIONS = ['home', 'about', 'science', 'biomarkers', 'daily-dozen', 'shop', 'research'];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  generating: 'bg-amber-100 text-amber-700',
  ready: 'bg-emerald-100 text-emerald-700',
  error: 'bg-red-100 text-red-700',
};

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function VoiceBriefingsTab() {
  const [briefings, setBriefings] = useState<VoiceBriefing[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<VoiceBriefing>>({});
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);
  const [scriptTab, setScriptTab] = useState<Lang>('en');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingLang, setPlayingLang] = useState<Lang | null>(null);

  /* ── Fetch ──────────────────────────────────────────────────────────────── */
  const fetchBriefings = async () => {
    const res = await fetch('/api/admin/voice-briefings');
    const data = await res.json();
    setBriefings(data.briefings ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchBriefings(); }, []);

  /* ── Open edit ──────────────────────────────────────────────────────────── */
  const openEdit = (b: VoiceBriefing) => {
    setEditId(b.id);
    setForm({ ...b });
    setScriptTab('en');
    setGenResult(null);
    stopAudio();
  };

  const openCreate = () => {
    setEditId('new');
    setForm({
      slug: '', title: '', page: 'home', voice_id: '21m00Tcm4TlvDq8ikWAM',
      script_en: '', script_de: '', script_fr: '', script_es: '', script_it: '',
      is_active: true, sort_order: briefings.length,
    });
    setScriptTab('en');
    setGenResult(null);
  };

  const closeEdit = () => { setEditId(null); setForm({}); stopAudio(); };

  /* ── Save ───────────────────────────────────────────────────────────────── */
  const handleSave = async () => {
    setSaving(true);
    const payload = editId === 'new'
      ? { slug: form.slug, title: form.title, page: form.page, voice_id: form.voice_id,
          script_en: form.script_en, script_de: form.script_de, script_fr: form.script_fr,
          script_es: form.script_es, script_it: form.script_it,
          is_active: form.is_active, sort_order: form.sort_order }
      : { id: editId, slug: form.slug, title: form.title, page: form.page, voice_id: form.voice_id,
          script_en: form.script_en, script_de: form.script_de, script_fr: form.script_fr,
          script_es: form.script_es, script_it: form.script_it,
          is_active: form.is_active, sort_order: form.sort_order };

    const res = await fetch('/api/admin/voice-briefings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      if (editId === 'new' && data.briefing) {
        setEditId(data.briefing.id);
        setForm(prev => ({ ...prev, id: data.briefing.id }));
      }
      await fetchBriefings();
    }
    setSaving(false);
  };

  /* ── Translate ──────────────────────────────────────────────────────────── */
  const handleTranslate = async () => {
    const targetId = editId === 'new' ? form.id : editId;
    if (!targetId || targetId === 'new') {
      setGenResult('Save the briefing first before translating.');
      return;
    }
    setTranslating(true);
    setGenResult(null);
    const res = await fetch('/api/admin/voice-briefings/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: targetId, source_lang: 'en' }),
    });
    const data = await res.json();
    if (data.success) {
      setGenResult('Translations complete! Scripts updated for all languages.');
      await fetchBriefings();
      // Reload form with new translations
      const updated = (await (await fetch('/api/admin/voice-briefings')).json()).briefings;
      const b = updated?.find((x: VoiceBriefing) => x.id === targetId);
      if (b) setForm({ ...b });
    } else {
      setGenResult(`Translation error: ${data.error || 'Unknown error'}`);
    }
    setTranslating(false);
  };

  /* ── Generate Audio ─────────────────────────────────────────────────────── */
  const handleGenerateAudio = async () => {
    const targetId = editId === 'new' ? form.id : editId;
    if (!targetId || targetId === 'new') {
      setGenResult('Save the briefing first before generating audio.');
      return;
    }
    setGenerating(true);
    setGenResult('Generating audio for all languages… This may take a minute.');
    const res = await fetch('/api/admin/voice-briefings/generate-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: targetId }),
    });
    const data = await res.json();
    if (data.success) {
      setGenResult('Audio generated for all languages! Status: Ready');
    } else {
      const details = data.results
        ? Object.entries(data.results)
            .filter(([, v]) => !(v as { success: boolean }).success)
            .map(([k, v]) => `${k}: ${(v as { error: string }).error}`)
            .join(', ')
        : data.error;
      setGenResult(`Some audio failed: ${details}`);
    }
    await fetchBriefings();
    const updated = (await (await fetch('/api/admin/voice-briefings')).json()).briefings;
    const b = updated?.find((x: VoiceBriefing) => x.id === targetId);
    if (b) setForm({ ...b });
    setGenerating(false);
  };

  /* ── Delete ─────────────────────────────────────────────────────────────── */
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this voice briefing and all its audio files?')) return;
    await fetch('/api/admin/voice-briefings', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (editId === id) closeEdit();
    await fetchBriefings();
  };

  /* ── Audio preview ──────────────────────────────────────────────────────── */
  const stopAudio = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlayingLang(null);
  };

  const playPreview = (lang: Lang) => {
    const url = form[`audio_url_${lang}` as keyof typeof form] as string | null;
    if (!url) return;
    stopAudio();
    const a = new Audio(url);
    a.onended = () => setPlayingLang(null);
    a.play();
    audioRef.current = a;
    setPlayingLang(lang);
  };

  /* ── Render ─────────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-[#0e393d]/5 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-lg text-[#0e393d]">Voice Briefings</h2>
          <p className="text-xs text-[#1c2a2b]/40 mt-0.5">
            Create voice messages for different pages. Translate with AI, generate audio with ElevenLabs.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-[#0e393d] text-white hover:bg-[#0e393d]/90 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New briefing
        </button>
      </div>

      {/* List */}
      {briefings.length === 0 && !editId && (
        <div className="rounded-2xl border border-dashed border-[#0e393d]/15 p-12 text-center">
          <p className="text-[#1c2a2b]/40 text-sm">No voice briefings yet. Create one to get started.</p>
        </div>
      )}

      {briefings.map(b => (
        <div
          key={b.id}
          className={`rounded-2xl border bg-white p-5 transition-all cursor-pointer hover:shadow-sm ${
            editId === b.id ? 'border-[#0e393d]/30 shadow-md' : 'border-[#0e393d]/8'
          }`}
          onClick={() => editId !== b.id && openEdit(b)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Voice icon */}
              <div className="w-10 h-10 rounded-xl bg-[#0e393d]/5 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0e393d" strokeWidth="1.75" strokeLinecap="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-[#0e393d] text-sm">{b.title || b.slug}</h3>
                <p className="text-xs text-[#1c2a2b]/40">
                  Page: {b.page} · Voice: {VOICES.find(v => v.id === b.voice_id)?.name ?? 'Custom'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Audio indicator dots */}
              <div className="flex gap-1">
                {LANGS.map(l => (
                  <div
                    key={l}
                    className={`w-2 h-2 rounded-full ${
                      b[`audio_url_${l}` as keyof VoiceBriefing] ? 'bg-emerald-400' : 'bg-gray-200'
                    }`}
                    title={`${LANG_LABELS[l]}: ${b[`audio_url_${l}` as keyof VoiceBriefing] ? 'Audio ready' : 'No audio'}`}
                  />
                ))}
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[b.status] ?? STATUS_COLORS.draft}`}>
                {b.status}
              </span>
              {b.is_active && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#ceab84]/20 text-[#8a6a3e]">Active</span>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Edit panel */}
      {editId && (
        <div className="rounded-2xl border border-[#0e393d]/15 bg-white p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg text-[#0e393d]">
              {editId === 'new' ? 'New Voice Briefing' : 'Edit Voice Briefing'}
            </h3>
            <button onClick={closeEdit} className="text-[#1c2a2b]/30 hover:text-[#1c2a2b]/60 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Basic fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#1c2a2b]/45 mb-1.5">Title</label>
              <input className={inputCls} value={form.title ?? ''} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Homepage Hero Introduction" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#1c2a2b]/45 mb-1.5">Slug</label>
              <input className={inputCls} value={form.slug ?? ''} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} placeholder="hero-intro" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#1c2a2b]/45 mb-1.5">Page</label>
              <select className={inputCls} value={form.page ?? 'home'} onChange={e => setForm(p => ({ ...p, page: e.target.value }))}>
                {PAGE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#1c2a2b]/45 mb-1.5">Voice</label>
              <select className={inputCls} value={form.voice_id ?? ''} onChange={e => setForm(p => ({ ...p, voice_id: e.target.value }))}>
                {VOICES.map(v => <option key={v.id} value={v.id}>{v.name} — {v.desc}</option>)}
              </select>
            </div>
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              className={`relative w-10 h-5 rounded-full transition-colors ${form.is_active ? 'bg-[#0e393d]' : 'bg-gray-200'}`}
              onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'left-5' : 'left-0.5'}`} />
            </div>
            <span className="text-sm text-[#0e393d]">Active on website</span>
          </label>

          {/* Script editor with language tabs */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[#1c2a2b]/45 mb-2">
              Voice Script
            </label>
            <div className="flex gap-1 mb-2">
              {LANGS.map(l => (
                <button
                  key={l}
                  onClick={() => setScriptTab(l)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    scriptTab === l
                      ? 'bg-[#0e393d] text-white'
                      : 'text-[#0e393d]/50 hover:bg-[#0e393d]/5'
                  }`}
                >
                  {l.toUpperCase()}
                  {form[`script_${l}` as keyof typeof form] ? '' : ' ○'}
                </button>
              ))}
            </div>
            <textarea
              className={`${inputCls} !min-h-[180px] resize-y font-light text-sm leading-relaxed`}
              value={(form[`script_${scriptTab}` as keyof typeof form] as string) ?? ''}
              onChange={e => setForm(p => ({ ...p, [`script_${scriptTab}`]: e.target.value }))}
              placeholder={`Write or paste the ${LANG_LABELS[scriptTab]} voice-over script here…`}
            />
            <p className="text-xs text-[#1c2a2b]/30 mt-1">
              {((form[`script_${scriptTab}` as keyof typeof form] as string) ?? '').length} characters
            </p>
          </div>

          {/* Audio preview per language */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[#1c2a2b]/45 mb-2">
              Audio Files
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {LANGS.map(l => {
                const url = form[`audio_url_${l}` as keyof typeof form] as string | null;
                return (
                  <div key={l} className={`rounded-xl border p-3 text-center ${url ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-100 bg-gray-50/50'}`}>
                    <span className="text-xs font-medium text-[#0e393d]/60 block mb-1">{l.toUpperCase()}</span>
                    {url ? (
                      <button
                        onClick={() => playingLang === l ? stopAudio() : playPreview(l)}
                        className="text-xs font-medium text-emerald-700 hover:text-emerald-900 transition-colors"
                      >
                        {playingLang === l ? '■ Stop' : '▶ Play'}
                      </button>
                    ) : (
                      <span className="text-[10px] text-gray-400">No audio</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            {/* Save */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-[#0e393d] text-white hover:bg-[#0e393d]/90 disabled:opacity-50 transition-colors"
            >
              {saving && <Spinner />}
              {saving ? 'Saving…' : 'Save'}
            </button>

            {/* Translate */}
            <button
              onClick={handleTranslate}
              disabled={translating || editId === 'new'}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              title="Translate English script to all other languages using AI"
            >
              {translating && <Spinner />}
              {translating ? 'Translating…' : 'AI Translate (EN → All)'}
            </button>

            {/* Generate Audio */}
            <button
              onClick={handleGenerateAudio}
              disabled={generating || editId === 'new'}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-[#ceab84] text-[#0e393d] hover:bg-[#dfc4a4] disabled:opacity-50 transition-colors"
              title="Generate audio for all languages using ElevenLabs"
            >
              {generating && <Spinner />}
              {generating ? 'Generating…' : 'Generate Audio (ElevenLabs)'}
            </button>

            {/* Delete */}
            {editId !== 'new' && (
              <button
                onClick={() => editId && handleDelete(editId)}
                className="ml-auto px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            )}
          </div>

          {/* Result feedback */}
          {genResult && (
            <div className={`rounded-xl px-4 py-3 text-sm ${
              genResult.includes('error') || genResult.includes('failed') || genResult.includes('Save the')
                ? 'bg-red-50 text-red-700'
                : genResult.includes('Generating')
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-emerald-50 text-emerald-700'
            }`}>
              {genResult}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
