'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type CropperType from 'react-easy-crop';
const Cropper = dynamic(() => import('react-easy-crop').then((m) => m.default), { ssr: false }) as unknown as typeof CropperType;
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthProvider';

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'de' | 'en';

export type ProfileData = {
  id: string;
  email: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  sex: string | null;
  height_cm: number | null;
  phone: string | null;
  country: string | null;
  street_address: string | null;
  city: string | null;
  postal_code: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean | null;
  is_admin: boolean | null;
  created_at: string;
};

// ─── Copy ─────────────────────────────────────────────────────────────────────

const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const T = {
  de: {
    avatar:              'Profilbild',
    changeAvatar:        'Bild ändern',
    removeAvatar:        'Bild entfernen',
    uploading:           'Wird hochgeladen…',
    avatarTooBig:        'Das Bild muss kleiner als 5 MB sein.',
    avatarWrongType:     'Bitte lade ein JPEG, PNG oder WebP Bild hoch.',
    avatarUploadFailed:  'Upload fehlgeschlagen. Bitte erneut versuchen.',
    cropTitle:           'Bild zuschneiden',
    cropSave:            'Speichern',
    cropCancel:          'Abbrechen',
    cropZoom:            'Zoom',
    personalInfo:        'Persönliche Informationen',
    displayName:         'Anzeigename',
    displayNameHint:     'Optionaler Spitzname, der im Header angezeigt wird.',
    firstName:           'Vorname',
    lastName:            'Nachname',
    email:               'E-Mail',
    emailHint:           'E-Mail-Adresse kann nicht geändert werden.',
    dateOfBirth:         'Geburtsdatum',
    sex:                 'Geschlecht',
    sexOptions:          ['Männlich', 'Weiblich', 'Divers', 'Keine Angabe'] as string[],
    phone:               'Telefon',
    heightCm:            'Körpergröße (cm)',
    address:             'Adresse',
    streetAddress:       'Straße und Hausnummer',
    city:                'Stadt',
    postalCode:          'Postleitzahl',
    country:             'Land',
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
    removeAvatar:        'Remove photo',
    uploading:           'Uploading…',
    avatarTooBig:        'Image must be smaller than 5 MB.',
    avatarWrongType:     'Please upload a JPEG, PNG, or WebP image.',
    avatarUploadFailed:  'Upload failed. Please try again.',
    cropTitle:           'Crop photo',
    cropSave:            'Save',
    cropCancel:          'Cancel',
    cropZoom:            'Zoom',
    personalInfo:        'Personal information',
    displayName:         'Display name',
    displayNameHint:     'Optional nickname shown in the header.',
    firstName:           'First name',
    lastName:            'Last name',
    email:               'Email',
    emailHint:           'Your email address cannot be changed.',
    dateOfBirth:         'Date of birth',
    sex:                 'Sex / Gender',
    sexOptions:          ['Male', 'Female', 'Other', 'Prefer not to say'] as string[],
    phone:               'Phone',
    heightCm:            'Height (cm)',
    address:             'Address',
    streetAddress:       'Street address',
    city:                'City',
    postalCode:          'Postal code',
    country:             'Country',
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

const SEX_VALUES = ['male', 'female', 'other', 'prefer_not_to_say'] as const;

const EUROPEAN_COUNTRIES = [
  { code: 'CH', name: 'Switzerland' },
  { code: 'DE', name: 'Germany' },
  { code: 'AT', name: 'Austria' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'ES', name: 'Spain' },
  { code: 'PT', name: 'Portugal' },
  { code: 'IE', name: 'Ireland' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'PL', name: 'Poland' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'HU', name: 'Hungary' },
  { code: 'RO', name: 'Romania' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'HR', name: 'Croatia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'EE', name: 'Estonia' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'GR', name: 'Greece' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'MT', name: 'Malta' },
];

// ─── Primitives ───────────────────────────────────────────────────────────────

const inputCls = 'w-full rounded-xl border border-[#0e393d]/15 bg-white px-4 py-2.5 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/35 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition disabled:bg-[#0e393d]/4 disabled:text-[#1c2a2b]/40 disabled:cursor-not-allowed';
const selectCls = inputCls + ' cursor-pointer';

function FieldLabel({ text, hint }: { text: string; hint?: string }) {
  return (
    <div className="mb-1.5">
      <span className="block text-xs font-medium text-[#0e393d]/70">{text}</span>
      {hint && <span className="block text-[11px] text-[#1c2a2b]/35 mt-0.5">{hint}</span>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#0e393d]/10 bg-white p-6">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-[#ceab84] mb-5">{title}</h2>
      {children}
    </section>
  );
}

// ─── Crop helper ──────────────────────────────────────────────────────────────

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
): Promise<Blob> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise<void>((resolve) => { image.onload = () => resolve(); });
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, 256, 256);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.9));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileEditor({ profile, lang }: { profile: ProfileData; lang: Lang }) {
  const t = T[lang];
  const supabase = createClient();
  const { refreshProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  // Avatar state
  const [avatarUrl,    setAvatarUrl]    = useState(profile.avatar_url ?? '');
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [avatarError,  setAvatarError]  = useState('');

  // Crop modal state
  const [cropModalOpen,      setCropModalOpen]      = useState(false);
  const [cropImage,          setCropImage]          = useState<string | null>(null);
  const [crop,               setCrop]               = useState({ x: 0, y: 0 });
  const [zoom,               setZoom]               = useState(1);
  const [croppedAreaPixels,  setCroppedAreaPixels]  = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const onCropComplete = useCallback((_: unknown, croppedPixels: { x: number; y: number; width: number; height: number }) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  // Personal info state
  const [displayName, setDisplayName] = useState(profile.display_name ?? '');
  const [firstName,   setFirstName]   = useState(profile.first_name ?? '');
  const [lastName,    setLastName]    = useState(profile.last_name ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(profile.date_of_birth ?? '');
  const [sex,         setSex]         = useState(profile.sex ?? '');
  const [phone,       setPhone]       = useState(profile.phone ?? '');
  const [heightCm,    setHeightCm]    = useState(profile.height_cm != null ? String(profile.height_cm) : '');

  // Address state
  const [streetAddress, setStreetAddress] = useState(profile.street_address ?? '');
  const [city,          setCity]          = useState(profile.city ?? '');
  const [postalCode,    setPostalCode]    = useState(profile.postal_code ?? '');
  const [country,       setCountry]       = useState(profile.country ?? '');

  // UI state
  const [langPref,   setLangPref]   = useState<'de' | 'en'>(lang);
  const [saveState,  setSaveState]  = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    const stored = localStorage.getItem('evida-lang');
    if (stored === 'de' || stored === 'en') setLangPref(stored);
  }, []);

  // ── Avatar (immediate — no deferred delete) ─────────────────────────────────

  const deleteAvatarFromStorage = async (url: string) => {
    await fetch('/api/delete-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, bucket: 'user-avatars' }),
    });
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset state
    setAvatarBroken(false);
    setAvatarError('');
    // Reset input so the same file can be re-selected after an error
    e.target.value = '';

    // Validate type
    if (!(ALLOWED_AVATAR_TYPES as readonly string[]).includes(file.type)) {
      setAvatarError(t.avatarWrongType);
      return;
    }

    // Validate size
    if (file.size > MAX_AVATAR_SIZE) {
      setAvatarError(t.avatarTooBig);
      return;
    }

    // Open crop modal
    const reader = new FileReader();
    reader.onload = () => {
      setCropImage(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropSave = async () => {
    if (!cropImage || !croppedAreaPixels) return;
    setCropModalOpen(false);
    setUploading(true);
    const oldUrl = avatarUrl || null;

    const blob = await getCroppedImg(cropImage, croppedAreaPixels);
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(blob);
    });

    const res = await fetch('/api/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64, filename: 'avatar.jpg', bucket: 'user-avatars', contentType: 'image/jpeg' }),
    });

    if (!res.ok) {
      setAvatarError(t.avatarUploadFailed);
      setUploading(false);
      return;
    }
    const { url: newUrl } = await res.json();

    await supabase.from('profiles').update({ avatar_url: newUrl }).eq('id', profile.id);
    if (oldUrl) await deleteAvatarFromStorage(oldUrl);

    setAvatarUrl(newUrl);
    setCropImage(null);
    setUploading(false);
    await refreshProfile();
  };

  const handleCropCancel = () => {
    setCropModalOpen(false);
    setCropImage(null);
  };

  const handleRemoveAvatar = async () => {
    const oldUrl = avatarUrl || null;
    setAvatarUrl('');
    setAvatarBroken(false);
    if (oldUrl) await deleteAvatarFromStorage(oldUrl);
    await supabase.from('profiles').update({ avatar_url: null }).eq('id', profile.id);
    await refreshProfile();
  };

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveState('saving');

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name:   displayName.trim()    || null,
        first_name:     firstName.trim()      || null,
        last_name:      lastName.trim()       || null,
        date_of_birth:  dateOfBirth           || null,
        sex:            sex                   || null,
        height_cm:      heightCm ? Number(heightCm) : null,
        phone:          phone.trim()          || null,
        country:        country               || null,
        street_address: streetAddress.trim()  || null,
        city:           city.trim()           || null,
        postal_code:    postalCode.trim()     || null,
      })
      .eq('id', profile.id);

    if (error) {
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 3000);
      return;
    }

    localStorage.setItem('evida-lang', langPref);
    if (langPref !== lang) {
      window.location.href = `/${langPref}/profile`;
      return;
    }

    setSaveState('saved');
    setTimeout(() => setSaveState('idle'), 2500);
  };

  // ── Derived ─────────────────────────────────────────────────────────────────

  const showAvatar = !!avatarUrl && !avatarBroken;
  const initials = (
    firstName && lastName ? `${firstName[0]}${lastName[0]}` :
    firstName             ? firstName[0] :
    displayName           ? displayName[0] :
    profile.email[0]      ?? '?'
  ).toUpperCase();

  const memberSince = new Date(profile.created_at).toLocaleDateString(
    lang === 'de' ? 'de-DE' : 'en-US',
    { year: 'numeric', month: 'long' }
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Crop modal ─────────────────────────────────────────────────────── */}
      {cropModalOpen && cropImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#0e393d]/10">
              <p className="text-sm font-semibold text-[#0e393d]">{t.cropTitle}</p>
            </div>

            {/* Crop area */}
            <div className="relative w-full" style={{ height: 300 }}>
              <Cropper
                image={cropImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            {/* Zoom slider */}
            <div className="px-5 pt-4 pb-2">
              <label className="block text-[11px] font-medium text-[#1c2a2b]/50 mb-1.5">{t.cropZoom}</label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: '#0e393d' }}
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-[#0e393d]/10">
              <button
                type="button"
                onClick={handleCropCancel}
                aria-label={t.cropCancel}
                className="rounded-xl border border-[#0e393d]/20 bg-white px-4 py-2 text-sm font-medium text-[#0e393d] hover:bg-[#0e393d]/5 transition"
              >
                {t.cropCancel}
              </button>
              <button
                type="button"
                onClick={handleCropSave}
                aria-label={t.cropSave}
                className="rounded-xl bg-[#0e393d] px-4 py-2 text-sm font-medium text-white hover:bg-[#0e393d]/85 transition"
              >
                {t.cropSave}
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">

        {/* ── Avatar ─────────────────────────────────────────────────────────── */}
        <Section title={t.avatar}>
          <div className="flex items-center gap-6">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#0e393d]/15 bg-[#0e393d]/8 flex items-center justify-center">
                {showAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl.includes('/storage/v1/object/public/')
                      ? avatarUrl.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + '?width=96&height=96&resize=cover'
                      : avatarUrl}
                    alt={firstName || 'Avatar'}
                    className="w-full h-full object-cover"
                    onError={() => setAvatarBroken(true)}
                  />
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

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  aria-label={t.changeAvatar}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#0e393d]/20 bg-white px-4 py-2 text-sm font-medium text-[#0e393d] hover:bg-[#0e393d]/5 hover:border-[#0e393d]/35 transition disabled:opacity-50"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  {uploading ? t.uploading : t.changeAvatar}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={uploading}
                    aria-label={t.removeAvatar}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 hover:border-red-300 transition disabled:opacity-50"
                  >
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 10 10">
                      <path d="M2 2l6 6M8 2l-6 6" strokeLinecap="round"/>
                    </svg>
                    {t.removeAvatar}
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarFileChange} />
              {avatarError
                ? <p className="text-[11px] text-red-500">{avatarError}</p>
                : <p className="text-[11px] text-[#1c2a2b]/35">JPG, PNG, WebP — max 5 MB</p>
              }
            </div>
          </div>
        </Section>

        {/* ── Personal info ──────────────────────────────────────────────────── */}
        <Section title={t.personalInfo}>
          <div className="space-y-4">

            {/* Display name */}
            <div>
              <FieldLabel text={t.displayName} hint={t.displayNameHint} />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={lang === 'de' ? 'z.B. Max' : 'e.g. Max'}
                className={inputCls}
              />
            </div>

            {/* First + Last name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel text={t.firstName} />
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={lang === 'de' ? 'Vorname' : 'First name'}
                  className={inputCls}
                />
              </div>
              <div>
                <FieldLabel text={t.lastName} />
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={lang === 'de' ? 'Nachname' : 'Last name'}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Email (read-only) */}
            <div>
              <FieldLabel text={t.email} />
              <input type="email" value={profile.email} disabled className={inputCls} />
              <p className="mt-1 text-[11px] text-[#1c2a2b]/35">{t.emailHint}</p>
            </div>

            {/* Date of birth + Sex */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel text={t.dateOfBirth} />
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <FieldLabel text={t.sex} />
                <select value={sex} onChange={(e) => setSex(e.target.value)} className={selectCls}>
                  <option value="">—</option>
                  {SEX_VALUES.map((v, i) => (
                    <option key={v} value={v}>{t.sexOptions[i]}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Phone + Height */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel text={t.phone} />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+41 79 000 00 00"
                  className={inputCls}
                />
              </div>
              <div>
                <FieldLabel text={t.heightCm} />
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="170"
                  min={50}
                  max={250}
                  className={inputCls}
                />
              </div>
            </div>

          </div>
        </Section>

        {/* ── Address ────────────────────────────────────────────────────────── */}
        <Section title={t.address}>
          <div className="space-y-4">

            <div>
              <FieldLabel text={t.streetAddress} />
              <input
                type="text"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder={lang === 'de' ? 'Musterstrasse 1' : '123 Main St'}
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel text={t.postalCode} />
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="8001"
                  className={inputCls}
                />
              </div>
              <div>
                <FieldLabel text={t.city} />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={lang === 'de' ? 'Zürich' : 'Zurich'}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <FieldLabel text={t.country} />
              <select value={country} onChange={(e) => setCountry(e.target.value)} className={selectCls}>
                <option value="">—</option>
                {EUROPEAN_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
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
            aria-label={t.save}
            className={`inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition ${
              saveState === 'saved'
                ? 'bg-emerald-500 text-white'
                : saveState === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-[#0e393d] text-white hover:bg-[#0e393d]/85 disabled:opacity-60'
            }`}
          >
            {saveState === 'saving' ? t.saving
             : saveState === 'saved'  ? t.saved
             : saveState === 'error'  ? t.saveError
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
    </>
  );
}
