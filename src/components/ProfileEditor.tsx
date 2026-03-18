'use client';

import { useRef, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'de' | 'en';

export type ProfileData = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean | null;
  is_admin: boolean | null;
  created_at: string;
};

// ─── Copy ─────────────────────────────────────────────────────────────────────

const T = {
  de: {
    avatar:              'Profilbild',
    changeAvatar:        'Bild ändern',
    uploading:           'Wird hochgeladen…',
    personalInfo:        'Persönliche Informationen',
    fullName:            'Vollständiger Name',
    fullNamePlaceholder: 'Dein Name',
    email:               'E-Mail',
    emailHint:           'E-Mail-Adresse kann nicht geändert werden.',
    preferences:         'Einstellungen',
    language:            'Sprache',
    langDe:              'Deutsch',
    langEn:              'English',
    account:             'Konto',
    memberSince:         'Mitglied seit',
    adminBadge:          'Admin',
    onboarding:          'Onboarding',
    onboardingDone:      'Abgeschlossen',
    onboardingPending:   'Ausstehend',
    save:                'Speichern',
    saving:              'Wird gespeichert…',
    saved:               'Gespeichert ✓',
    saveError:           'Fehler beim Speichern.',
    deleteSection:       'Konto löschen',
    deleteInfo:          'Wenn du dein Konto löschen möchtest, wende dich bitte an unseren Support.',
    deleteContact:       'Support kontaktieren',
  },
  en: {
    avatar:              'Profile picture',
    changeAvatar:        'Change photo',
    uploading:           'Uploading…',
    personalInfo:        'Personal information',
    fullName:            'Full name',
    fullNamePlaceholder: 'Your name',
    email:               'Email',
    emailHint:           'Your email address cannot be changed.',
    preferences:         'Preferences',
    language:            'Language',
    langDe:              'Deutsch',
    langEn:              'English',
    account:             'Account',
    memberSince:         'Member since',
    adminBadge:          'Admin',
    onboarding:          'Onboarding',
    onboardingDone:      'Completed',
    onboardingPending:   'Pending',
    save:                'Save changes',
    saving:              'Saving…',
    saved:               'Saved ✓',
    saveError:           'Failed to save.',
    deleteSection:       'Delete account',
    deleteInfo:          'If you want to delete your account, please contact our support team.',
    deleteContact:       'Contact support',
  },
};

const inputCls = 'w-full rounded-xl border border-[#0e393d]/15 bg-white px-4 py-2.5 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/35 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition disabled:bg-[#0e393d]/4 disabled:text-[#1c2a2b]/40 disabled:cursor-not-allowed';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#0e393d]/10 bg-white p-6">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-[#ceab84] mb-5">{title}</h2>
      {children}
    </section>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileEditor({ profile, lang }: { profile: ProfileData; lang: Lang }) {
  const t = T[lang];
  const supabase = createClient();
  const fileRef  = useRef<HTMLInputElement>(null);

  const [fullName,    setFullName]    = useState(profile.full_name ?? '');
  const [avatarUrl,   setAvatarUrl]   = useState(profile.avatar_url ?? '');
  const [avatarFile,  setAvatarFile]  = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading,   setUploading]   = useState(false);
  const [langPref,    setLangPref]    = useState<'de' | 'en'>(lang);
  const [saveState,   setSaveState]   = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Read language from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('evida-lang');
    if (stored === 'de' || stored === 'en') setLangPref(stored);
  }, []);

  // ── Avatar selection ───────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  // ── Upload avatar via /api/upload-image ────────────────────────────────────

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return avatarUrl || null;
    setUploading(true);

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(avatarFile);
    });

    const res  = await fetch('/api/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64,
        filename: avatarFile.name,
        bucket: 'user-avatars',
        contentType: avatarFile.type,
      }),
    });

    setUploading(false);
    if (!res.ok) return avatarUrl || null;
    const json = await res.json();
    return (json.url as string) ?? (avatarUrl || null);
  };

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveState('saving');

    const newAvatarUrl = await uploadAvatar();
    if (newAvatarUrl) setAvatarUrl(newAvatarUrl);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name:  fullName.trim() || null,
        avatar_url: newAvatarUrl,
      })
      .eq('id', profile.id);

    if (error) {
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 3000);
      return;
    }

    // Persist language preference
    localStorage.setItem('evida-lang', langPref);
    // Trigger page language switch if changed
    if (langPref !== lang) {
      window.location.href = `/${langPref}/profile`;
      return;
    }

    setAvatarFile(null);
    setAvatarPreview(null);
    setSaveState('saved');
    setTimeout(() => setSaveState('idle'), 2500);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const displayAvatar = avatarPreview ?? avatarUrl;
  const initials = (profile.full_name ?? profile.email)
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');

  const memberSince = new Date(profile.created_at).toLocaleDateString(
    lang === 'de' ? 'de-DE' : 'en-US',
    { year: 'numeric', month: 'long' }
  );

  return (
    <form onSubmit={handleSave} className="space-y-5">

      {/* ── Avatar ─────────────────────────────────────────────────────────── */}
      <Section title={t.avatar}>
        <div className="flex items-center gap-6">
          {/* Avatar circle */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#0e393d]/15 bg-[#0e393d]/8 flex items-center justify-center">
              {displayAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displayAvatar} alt={fullName || 'Avatar'} className="w-full h-full object-cover" />
              ) : (
                <span className="font-serif text-xl text-[#0e393d]/50">{initials}</span>
              )}
            </div>
            {uploading && (
              <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-white animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                </svg>
              </div>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-xl border border-[#0e393d]/20 bg-white px-4 py-2 text-sm font-medium text-[#0e393d] hover:bg-[#0e393d]/5 hover:border-[#0e393d]/35 transition disabled:opacity-50"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {uploading ? t.uploading : t.changeAvatar}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <p className="mt-1.5 text-[11px] text-[#1c2a2b]/35">JPG, PNG, GIF — max 5 MB</p>
          </div>
        </div>
      </Section>

      {/* ── Personal info ──────────────────────────────────────────────────── */}
      <Section title={t.personalInfo}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#0e393d]/70 mb-1.5">{t.fullName}</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t.fullNamePlaceholder}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#0e393d]/70 mb-1.5">{t.email}</label>
            <input
              type="email"
              value={profile.email}
              disabled
              className={inputCls}
            />
            <p className="mt-1 text-[11px] text-[#1c2a2b]/35">{t.emailHint}</p>
          </div>
        </div>
      </Section>

      {/* ── Preferences ────────────────────────────────────────────────────── */}
      <Section title={t.preferences}>
        <div>
          <p className="text-xs font-medium text-[#0e393d]/70 mb-2">{t.language}</p>
          <div className="flex gap-2">
            {(['de', 'en'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLangPref(l)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  langPref === l
                    ? 'border-[#0e393d] bg-[#0e393d] text-white'
                    : 'border-[#0e393d]/15 bg-white text-[#1c2a2b]/60 hover:border-[#0e393d]/35 hover:text-[#1c2a2b]'
                }`}
              >
                <span>{l === 'de' ? '🇩🇪' : '🇬🇧'}</span>
                {l === 'de' ? t.langDe : t.langEn}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Account info ───────────────────────────────────────────────────── */}
      <Section title={t.account}>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#1c2a2b]/50">{t.memberSince}</span>
            <span className="font-medium text-[#1c2a2b]">{memberSince}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#1c2a2b]/50">{t.onboarding}</span>
            <span className={`inline-flex items-center gap-1 text-xs font-medium ${profile.onboarding_completed ? 'text-emerald-600' : 'text-[#1c2a2b]/40'}`}>
              {profile.onboarding_completed ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6.5l3 3 5-5.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {t.onboardingDone}
                </>
              ) : t.onboardingPending}
            </span>
          </div>
          {profile.is_admin && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#1c2a2b]/50">Role</span>
              <span className="inline-flex items-center rounded-full bg-[#0e393d] px-2.5 py-0.5 text-[10px] font-semibold text-white">
                {t.adminBadge}
              </span>
            </div>
          )}
        </div>
      </Section>

      {/* ── Save button ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saveState === 'saving' || uploading}
          className={`inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition ${
            saveState === 'saved'
              ? 'bg-emerald-500 text-white'
              : saveState === 'error'
              ? 'bg-red-500 text-white'
              : 'bg-[#0e393d] text-white hover:bg-[#0e393d]/85 disabled:opacity-60'
          }`}
        >
          {saveState === 'saving' ? t.saving
           : saveState === 'saved' ? t.saved
           : saveState === 'error' ? t.saveError
           : t.save}
        </button>
      </div>

      {/* ── Delete account ─────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-red-200/60 bg-red-50/40 p-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-red-500/70 mb-3">{t.deleteSection}</h2>
        <p className="text-sm text-[#1c2a2b]/60 mb-4">{t.deleteInfo}</p>
        <a
          href="mailto:support@evidalife.com"
          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          {t.deleteContact}
        </a>
      </section>

    </form>
  );
}
