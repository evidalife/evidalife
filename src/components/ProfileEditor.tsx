'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type CropperType from 'react-easy-crop';
const Cropper = dynamic(() => import('react-easy-crop').then((m) => m.default), { ssr: false }) as unknown as typeof CropperType;
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthProvider';

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'de' | 'en' | 'fr' | 'es' | 'it';

export type ProfileData = {
  id: string;
  email: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  sex: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  blood_type: string | null;
  activity_level: string | null;
  diet: string | null;
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

// ─── Static Data ──────────────────────────────────────────────────────────────

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const SEX_VALUES = ['male', 'female', 'other', 'prefer_not_to_say'] as const;
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
const ACTIVITY_LEVELS = ['sedentary', 'lightly_active', 'active', 'very_active'] as const;
const DIET_VALUES = ['omnivore', 'vegetarian', 'vegan', 'pescatarian', 'other'] as const;

type DialCountry = { code: string; flag: string; dialCode: string; name: string };

// Priority countries for DACH market first
const DIAL_COUNTRIES: DialCountry[] = [
  { code: 'CH', flag: '🇨🇭', dialCode: '+41',  name: 'Switzerland' },
  { code: 'DE', flag: '🇩🇪', dialCode: '+49',  name: 'Germany' },
  { code: 'AT', flag: '🇦🇹', dialCode: '+43',  name: 'Austria' },
  { code: 'FR', flag: '🇫🇷', dialCode: '+33',  name: 'France' },
  { code: 'IT', flag: '🇮🇹', dialCode: '+39',  name: 'Italy' },
  { code: 'ES', flag: '🇪🇸', dialCode: '+34',  name: 'Spain' },
  { code: 'GB', flag: '🇬🇧', dialCode: '+44',  name: 'United Kingdom' },
  { code: 'US', flag: '🇺🇸', dialCode: '+1',   name: 'United States' },
  { code: 'LI', flag: '🇱🇮', dialCode: '+423', name: 'Liechtenstein' },
  { code: 'LU', flag: '🇱🇺', dialCode: '+352', name: 'Luxembourg' },
  { code: 'BE', flag: '🇧🇪', dialCode: '+32',  name: 'Belgium' },
  { code: 'NL', flag: '🇳🇱', dialCode: '+31',  name: 'Netherlands' },
  { code: 'PT', flag: '🇵🇹', dialCode: '+351', name: 'Portugal' },
  { code: 'SE', flag: '🇸🇪', dialCode: '+46',  name: 'Sweden' },
  { code: 'NO', flag: '🇳🇴', dialCode: '+47',  name: 'Norway' },
  { code: 'DK', flag: '🇩🇰', dialCode: '+45',  name: 'Denmark' },
  { code: 'PL', flag: '🇵🇱', dialCode: '+48',  name: 'Poland' },
  { code: 'CZ', flag: '🇨🇿', dialCode: '+420', name: 'Czech Republic' },
  { code: 'GR', flag: '🇬🇷', dialCode: '+30',  name: 'Greece' },
  { code: 'CA', flag: '🇨🇦', dialCode: '+1',   name: 'Canada' },
  { code: 'AU', flag: '🇦🇺', dialCode: '+61',  name: 'Australia' },
  { code: 'NZ', flag: '🇳🇿', dialCode: '+64',  name: 'New Zealand' },
  { code: 'JP', flag: '🇯🇵', dialCode: '+81',  name: 'Japan' },
  { code: 'CN', flag: '🇨🇳', dialCode: '+86',  name: 'China' },
];

const EUROPEAN_COUNTRIES = [
  { code: 'CH', name: 'Switzerland' }, { code: 'DE', name: 'Germany' },
  { code: 'AT', name: 'Austria' },     { code: 'LI', name: 'Liechtenstein' },
  { code: 'FR', name: 'France' },      { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },       { code: 'GB', name: 'United Kingdom' },
  { code: 'NL', name: 'Netherlands' }, { code: 'BE', name: 'Belgium' },
  { code: 'LU', name: 'Luxembourg' },  { code: 'PT', name: 'Portugal' },
  { code: 'SE', name: 'Sweden' },      { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },     { code: 'FI', name: 'Finland' },
  { code: 'IE', name: 'Ireland' },     { code: 'PL', name: 'Poland' },
  { code: 'CZ', name: 'Czech Republic' }, { code: 'SK', name: 'Slovakia' },
  { code: 'HU', name: 'Hungary' },     { code: 'RO', name: 'Romania' },
  { code: 'GR', name: 'Greece' },      { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },      { code: 'AU', name: 'Australia' },
];

// ─── Phone helpers ────────────────────────────────────────────────────────────

function detectDialCountry(raw: string): DialCountry | undefined {
  const stripped = raw.replace(/\s|-/g, '');
  if (stripped.startsWith('+')) {
    return DIAL_COUNTRIES.find((c) => stripped.startsWith(c.dialCode));
  }
  if (stripped.startsWith('0041') || stripped.startsWith('0049') || stripped.startsWith('0043')) {
    const dc = '00' + stripped.slice(2, 4);
    return DIAL_COUNTRIES.find((c) => c.dialCode === '+' + stripped.slice(2, stripped.match(/^00\d{1,3}/)![0].length - 2 + 2));
  }
  // Swiss mobile prefixes (076, 077, 078, 079, 075)
  if (/^0(75|76|77|78|79)/.test(stripped)) return DIAL_COUNTRIES.find((c) => c.code === 'CH');
  return undefined;
}

function toE164(local: string, dialCode: string): string {
  const stripped = local.replace(/[\s\-().]/g, '');
  if (stripped.startsWith('+')) return stripped;
  if (stripped.startsWith('00')) return '+' + stripped.slice(2);
  // Swiss local: 079 → +4179
  if (/^0\d/.test(stripped)) return dialCode + stripped.slice(1);
  return dialCode + stripped;
}

function formatPhoneDisplay(e164: string): string {
  return e164; // keep E.164 as-is for display; browser/OS handles formatting
}

// ─── Date helpers (DD.MM.YYYY ↔ YYYY-MM-DD) ──────────────────────────────────

function isoToDisplay(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

function displayToIso(display: string): string {
  const stripped = display.replace(/[^0-9./-]/g, '');
  // Try DD.MM.YYYY or DD/MM/YYYY
  const match = stripped.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(stripped)) return stripped;
  return '';
}

// ─── Translations ─────────────────────────────────────────────────────────────

const T = {
  de: {
    avatar: 'Profilbild', changeAvatar: 'Bild ändern', removeAvatar: 'Bild entfernen',
    uploading: 'Wird hochgeladen…', avatarTooBig: 'Das Bild muss kleiner als 5 MB sein.',
    avatarWrongType: 'Bitte lade ein JPEG, PNG oder WebP Bild hoch.',
    avatarUploadFailed: 'Upload fehlgeschlagen. Bitte erneut versuchen.',
    cropTitle: 'Bild zuschneiden', cropSave: 'Speichern', cropCancel: 'Abbrechen', cropZoom: 'Zoom',
    personalInfo: 'Persönliche Informationen',
    displayName: 'Anzeigename', displayNameHint: 'Optionaler Spitzname, der im Header angezeigt wird.',
    firstName: 'Vorname', lastName: 'Nachname',
    email: 'E-Mail', emailHint: 'E-Mail-Adresse kann nicht geändert werden.',
    dateOfBirth: 'Geburtsdatum', dateOfBirthHint: 'Format: TT.MM.JJJJ',
    sex: 'Geschlecht',
    sexOptions: ['Männlich', 'Weiblich', 'Divers', 'Keine Angabe'] as string[],
    contact: 'Kontakt',
    phone: 'Telefon', phoneHint: 'Internationale Vorwahl wählen, dann Nummer eingeben. Gespeichert als E.164.',
    phoneCountry: 'Land',
    address: 'Adresse', streetAddress: 'Straße und Hausnummer',
    city: 'Stadt', postalCode: 'Postleitzahl', country: 'Land',
    health: 'Gesundheit',
    heightCm: 'Körpergröße (cm)', weightKg: 'Gewicht (kg)',
    bloodType: 'Blutgruppe', bloodTypeHint: 'Optional. Wird für medizinische Berichte verwendet.',
    activityLevel: 'Aktivitätsniveau',
    activityOptions: ['Sitzend', 'Leicht aktiv', 'Aktiv', 'Sehr aktiv'] as string[],
    diet: 'Ernährungsweise',
    dietOptions: ['Omnivor', 'Vegetarisch', 'Vegan', 'Pescetarisch', 'Andere'] as string[],
    preferences: 'Einstellungen', language: 'Sprache', langDe: 'Deutsch', langEn: 'English',
    account: 'Konto', memberSince: 'Mitglied seit', adminBadge: 'Admin',
    onboarding: 'Onboarding', onboardingDone: 'Abgeschlossen', onboardingPending: 'Ausstehend',
    save: 'Speichern', saving: 'Wird gespeichert…', saved: 'Gespeichert ✓', saveError: 'Fehler beim Speichern.',
    deleteSection: 'Konto löschen',
    deleteInfo: 'Wenn du dein Konto löschen möchtest, wende dich bitte an unseren Support.',
    deleteContact: 'Support kontaktieren',
  },
  en: {
    avatar: 'Profile picture', changeAvatar: 'Change photo', removeAvatar: 'Remove photo',
    uploading: 'Uploading…', avatarTooBig: 'Image must be smaller than 5 MB.',
    avatarWrongType: 'Please upload a JPEG, PNG, or WebP image.',
    avatarUploadFailed: 'Upload failed. Please try again.',
    cropTitle: 'Crop photo', cropSave: 'Save', cropCancel: 'Cancel', cropZoom: 'Zoom',
    personalInfo: 'Personal information',
    displayName: 'Display name', displayNameHint: 'Optional nickname shown in the header.',
    firstName: 'First name', lastName: 'Last name',
    email: 'Email', emailHint: 'Your email address cannot be changed.',
    dateOfBirth: 'Date of birth', dateOfBirthHint: 'Format: DD.MM.YYYY',
    sex: 'Sex / Gender',
    sexOptions: ['Male', 'Female', 'Other', 'Prefer not to say'] as string[],
    contact: 'Contact',
    phone: 'Phone number', phoneHint: 'Select country code, then enter your number. Stored as E.164.',
    phoneCountry: 'Country',
    address: 'Address', streetAddress: 'Street address',
    city: 'City', postalCode: 'Postal code', country: 'Country',
    health: 'Health',
    heightCm: 'Height (cm)', weightKg: 'Weight (kg)',
    bloodType: 'Blood type', bloodTypeHint: 'Optional. Used in medical reports.',
    activityLevel: 'Activity level',
    activityOptions: ['Sedentary', 'Lightly active', 'Active', 'Very active'] as string[],
    diet: 'Diet',
    dietOptions: ['Omnivore', 'Vegetarian', 'Vegan', 'Pescatarian', 'Other'] as string[],
    preferences: 'Preferences', language: 'Language', langDe: 'Deutsch', langEn: 'English',
    account: 'Account', memberSince: 'Member since', adminBadge: 'Admin',
    onboarding: 'Onboarding', onboardingDone: 'Completed', onboardingPending: 'Pending',
    save: 'Save changes', saving: 'Saving…', saved: 'Saved ✓', saveError: 'Failed to save.',
    deleteSection: 'Delete account',
    deleteInfo: 'If you want to delete your account, please contact our support team.',
    deleteContact: 'Contact support',
  },
  fr: {
    avatar: 'Photo de profil', changeAvatar: 'Changer la photo', removeAvatar: 'Supprimer la photo',
    uploading: 'Téléchargement…', avatarTooBig: "L'image doit être inférieure à 5 Mo.",
    avatarWrongType: 'Veuillez télécharger une image JPEG, PNG ou WebP.',
    avatarUploadFailed: 'Échec du téléchargement. Veuillez réessayer.',
    cropTitle: 'Recadrer la photo', cropSave: 'Enregistrer', cropCancel: 'Annuler', cropZoom: 'Zoom',
    personalInfo: 'Informations personnelles',
    displayName: "Nom d'affichage", displayNameHint: "Surnom optionnel affiché dans l'en-tête.",
    firstName: 'Prénom', lastName: 'Nom de famille',
    email: 'E-mail', emailHint: 'Votre adresse e-mail ne peut pas être modifiée.',
    dateOfBirth: 'Date de naissance', dateOfBirthHint: 'Format : JJ.MM.AAAA',
    sex: 'Sexe / Genre',
    sexOptions: ['Homme', 'Femme', 'Autre', 'Préfère ne pas dire'] as string[],
    contact: 'Contact',
    phone: 'Numéro de téléphone', phoneHint: 'Sélectionnez le code pays, puis entrez votre numéro.',
    phoneCountry: 'Pays',
    address: 'Adresse', streetAddress: 'Adresse postale',
    city: 'Ville', postalCode: 'Code postal', country: 'Pays',
    health: 'Santé',
    heightCm: 'Taille (cm)', weightKg: 'Poids (kg)',
    bloodType: 'Groupe sanguin', bloodTypeHint: 'Optionnel. Utilisé dans les rapports médicaux.',
    activityLevel: "Niveau d'activité",
    activityOptions: ['Sédentaire', 'Légèrement actif', 'Actif', 'Très actif'] as string[],
    diet: 'Alimentation',
    dietOptions: ['Omnivore', 'Végétarien', 'Végétalien', 'Pescatarien', 'Autre'] as string[],
    preferences: 'Préférences', language: 'Langue', langDe: 'Deutsch', langEn: 'English',
    account: 'Compte', memberSince: 'Membre depuis', adminBadge: 'Admin',
    onboarding: 'Onboarding', onboardingDone: 'Terminé', onboardingPending: 'En attente',
    save: 'Enregistrer les modifications', saving: 'Enregistrement…', saved: 'Enregistré ✓', saveError: "Échec de l'enregistrement.",
    deleteSection: 'Supprimer le compte',
    deleteInfo: 'Si vous souhaitez supprimer votre compte, veuillez contacter notre support.',
    deleteContact: 'Contacter le support',
  },
  es: {
    avatar: 'Foto de perfil', changeAvatar: 'Cambiar foto', removeAvatar: 'Eliminar foto',
    uploading: 'Subiendo…', avatarTooBig: 'La imagen debe ser menor de 5 MB.',
    avatarWrongType: 'Por favor sube una imagen JPEG, PNG o WebP.',
    avatarUploadFailed: 'Error al subir. Por favor inténtalo de nuevo.',
    cropTitle: 'Recortar foto', cropSave: 'Guardar', cropCancel: 'Cancelar', cropZoom: 'Zoom',
    personalInfo: 'Información personal',
    displayName: 'Nombre para mostrar', displayNameHint: 'Apodo opcional mostrado en el encabezado.',
    firstName: 'Nombre', lastName: 'Apellido',
    email: 'Correo electrónico', emailHint: 'Tu dirección de correo no puede cambiarse.',
    dateOfBirth: 'Fecha de nacimiento', dateOfBirthHint: 'Formato: DD.MM.AAAA',
    sex: 'Sexo / Género',
    sexOptions: ['Masculino', 'Femenino', 'Otro', 'Prefiero no decir'] as string[],
    contact: 'Contacto',
    phone: 'Número de teléfono', phoneHint: 'Selecciona el código de país y luego ingresa tu número.',
    phoneCountry: 'País',
    address: 'Dirección', streetAddress: 'Dirección postal',
    city: 'Ciudad', postalCode: 'Código postal', country: 'País',
    health: 'Salud',
    heightCm: 'Altura (cm)', weightKg: 'Peso (kg)',
    bloodType: 'Grupo sanguíneo', bloodTypeHint: 'Opcional. Se usa en informes médicos.',
    activityLevel: 'Nivel de actividad',
    activityOptions: ['Sedentario', 'Ligeramente activo', 'Activo', 'Muy activo'] as string[],
    diet: 'Dieta',
    dietOptions: ['Omnívoro', 'Vegetariano', 'Vegano', 'Pescatariano', 'Otro'] as string[],
    preferences: 'Preferencias', language: 'Idioma', langDe: 'Deutsch', langEn: 'English',
    account: 'Cuenta', memberSince: 'Miembro desde', adminBadge: 'Admin',
    onboarding: 'Incorporación', onboardingDone: 'Completado', onboardingPending: 'Pendiente',
    save: 'Guardar cambios', saving: 'Guardando…', saved: 'Guardado ✓', saveError: 'Error al guardar.',
    deleteSection: 'Eliminar cuenta',
    deleteInfo: 'Si deseas eliminar tu cuenta, por favor contacta a nuestro soporte.',
    deleteContact: 'Contactar soporte',
  },
  it: {
    avatar: 'Foto del profilo', changeAvatar: 'Cambia foto', removeAvatar: 'Rimuovi foto',
    uploading: 'Caricamento…', avatarTooBig: "L'immagine deve essere inferiore a 5 MB.",
    avatarWrongType: "Per favore carica un'immagine JPEG, PNG o WebP.",
    avatarUploadFailed: 'Caricamento fallito. Riprova.',
    cropTitle: 'Ritaglia foto', cropSave: 'Salva', cropCancel: 'Annulla', cropZoom: 'Zoom',
    personalInfo: 'Informazioni personali',
    displayName: 'Nome visualizzato', displayNameHint: "Soprannome opzionale mostrato nell'intestazione.",
    firstName: 'Nome', lastName: 'Cognome',
    email: 'E-mail', emailHint: 'Il tuo indirizzo e-mail non può essere modificato.',
    dateOfBirth: 'Data di nascita', dateOfBirthHint: 'Formato: GG.MM.AAAA',
    sex: 'Sesso / Genere',
    sexOptions: ['Maschio', 'Femmina', 'Altro', 'Preferisco non dirlo'] as string[],
    contact: 'Contatti',
    phone: 'Numero di telefono', phoneHint: 'Seleziona il prefisso, poi inserisci il numero.',
    phoneCountry: 'Paese',
    address: 'Indirizzo', streetAddress: 'Indirizzo postale',
    city: 'Città', postalCode: 'Codice postale', country: 'Paese',
    health: 'Salute',
    heightCm: 'Altezza (cm)', weightKg: 'Peso (kg)',
    bloodType: 'Gruppo sanguigno', bloodTypeHint: 'Opzionale. Usato nei report medici.',
    activityLevel: 'Livello di attività',
    activityOptions: ['Sedentario', 'Leggermente attivo', 'Attivo', 'Molto attivo'] as string[],
    diet: 'Alimentazione',
    dietOptions: ['Onnivoro', 'Vegetariano', 'Vegano', 'Pescatariano', 'Altro'] as string[],
    preferences: 'Preferenze', language: 'Lingua', langDe: 'Deutsch', langEn: 'English',
    account: 'Account', memberSince: 'Membro dal', adminBadge: 'Admin',
    onboarding: 'Onboarding', onboardingDone: 'Completato', onboardingPending: 'In attesa',
    save: 'Salva modifiche', saving: 'Salvataggio…', saved: 'Salvato ✓', saveError: 'Salvataggio fallito.',
    deleteSection: 'Elimina account',
    deleteInfo: 'Se vuoi eliminare il tuo account, contatta il nostro supporto.',
    deleteContact: 'Contatta il supporto',
  },
};

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

async function getCroppedImg(imageSrc: string, pixelCrop: { x: number; y: number; width: number; height: number }): Promise<Blob> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise<void>((resolve) => { image.onload = () => resolve(); });
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, 256, 256);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.9));
}

// ─── Phone Field ──────────────────────────────────────────────────────────────

function PhoneField({
  value, onChange, label, hint,
}: { value: string; onChange: (e164: string) => void; label: string; hint: string }) {
  // Parse the stored E.164 to detect country and local number
  const findCountry = (v: string): DialCountry => {
    const detected = detectDialCountry(v);
    return detected ?? DIAL_COUNTRIES[0];
  };

  const extractLocal = (v: string, dc: string): string => {
    if (!v) return '';
    const stripped = v.replace(/[\s\-().]/g, '');
    if (stripped.startsWith(dc)) return stripped.slice(dc.length);
    if (stripped.startsWith('+')) return stripped;
    if (stripped.startsWith('00')) return '+' + stripped.slice(2);
    return stripped;
  };

  const initCountry = findCountry(value);
  const [selectedCountry, setSelectedCountry] = useState(initCountry);
  const [localNumber, setLocalNumber] = useState(extractLocal(value, initCountry.dialCode));

  const handleCountryChange = (code: string) => {
    const c = DIAL_COUNTRIES.find((d) => d.code === code) ?? DIAL_COUNTRIES[0];
    setSelectedCountry(c);
    if (localNumber) {
      onChange(toE164(localNumber, c.dialCode));
    }
  };

  const handleNumberChange = (raw: string) => {
    setLocalNumber(raw);
    if (!raw.trim()) { onChange(''); return; }
    // Auto-detect country from raw input
    const detected = detectDialCountry(raw);
    if (detected && detected.code !== selectedCountry.code) {
      setSelectedCountry(detected);
    }
    onChange(toE164(raw, selectedCountry.dialCode));
  };

  return (
    <div>
      <FieldLabel text={label} hint={hint} />
      <div className="flex gap-2">
        <select
          value={selectedCountry.code}
          onChange={(e) => handleCountryChange(e.target.value)}
          className="rounded-xl border border-[#0e393d]/15 bg-white px-2 py-2.5 text-sm text-[#1c2a2b] focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition cursor-pointer w-24 shrink-0"
          title="Country code"
        >
          {DIAL_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.dialCode}
            </option>
          ))}
        </select>
        <input
          type="tel"
          value={localNumber}
          onChange={(e) => handleNumberChange(e.target.value)}
          placeholder={selectedCountry.code === 'CH' ? '79 123 45 67' : selectedCountry.code === 'DE' ? '151 12345678' : '…'}
          className={inputCls}
        />
      </div>
      {value && (
        <p className="mt-1 text-[10px] text-[#1c2a2b]/35 font-mono">{formatPhoneDisplay(value)}</p>
      )}
    </div>
  );
}

// ─── Birthday Field ───────────────────────────────────────────────────────────

function BirthdayField({
  value, onChange, label, hint,
}: { value: string; onChange: (iso: string) => void; label: string; hint: string }) {
  const [display, setDisplay] = useState(isoToDisplay(value));

  const handleChange = (raw: string) => {
    setDisplay(raw);
    const iso = displayToIso(raw);
    if (iso || raw === '') onChange(iso);
  };

  // Auto-insert dots
  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const v = (e.target as HTMLInputElement).value;
    if (e.key !== 'Backspace' && (v.length === 2 || v.length === 5)) {
      if (!v.endsWith('.')) setDisplay(v + '.');
    }
  };

  return (
    <div>
      <FieldLabel text={label} hint={hint} />
      <input
        type="text"
        value={display}
        onChange={(e) => handleChange(e.target.value)}
        onKeyUp={handleKeyUp}
        placeholder="TT.MM.JJJJ"
        maxLength={10}
        className={inputCls}
      />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileEditor({ profile, lang }: { profile: ProfileData; lang: Lang }) {
  const t = T[lang];
  const supabase = createClient();
  const { refreshProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  // Avatar state
  const [avatarUrl,   setAvatarUrl]   = useState(profile.avatar_url ?? '');
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImage,   setCropImage]   = useState<string | null>(null);
  const [crop,        setCrop]        = useState({ x: 0, y: 0 });
  const [zoom,        setZoom]        = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const onCropComplete = useCallback((_: unknown, croppedPixels: { x: number; y: number; width: number; height: number }) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  // Personal info
  const [displayName, setDisplayName] = useState(profile.display_name ?? '');
  const [firstName,   setFirstName]   = useState(profile.first_name ?? '');
  const [lastName,    setLastName]    = useState(profile.last_name ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(profile.date_of_birth ?? '');
  const [sex,         setSex]         = useState(profile.sex ?? '');

  // Contact
  const [phone,   setPhone]   = useState(profile.phone ?? '');

  // Address
  const [streetAddress, setStreetAddress] = useState(profile.street_address ?? '');
  const [city,          setCity]          = useState(profile.city ?? '');
  const [postalCode,    setPostalCode]    = useState(profile.postal_code ?? '');
  const [country,       setCountry]       = useState(profile.country ?? 'CH');

  // Health
  const [heightCm,      setHeightCm]      = useState(profile.height_cm != null ? String(profile.height_cm) : '');
  const [weightKg,      setWeightKg]      = useState(profile.weight_kg != null ? String(profile.weight_kg) : '');
  const [bloodType,     setBloodType]     = useState(profile.blood_type ?? '');
  const [activityLevel, setActivityLevel] = useState(profile.activity_level ?? '');
  const [diet,          setDiet]          = useState(profile.diet ?? '');

  // UI
  const [langPref,  setLangPref]  = useState<'de' | 'en'>(lang === 'de' ? 'de' : 'en');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    const stored = localStorage.getItem('evida-lang');
    if (stored === 'de' || stored === 'en') setLangPref(stored);
  }, []);

  // ── Avatar ──────────────────────────────────────────────────────────────────

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
    setAvatarBroken(false);
    setAvatarError('');
    e.target.value = '';
    if (!(ALLOWED_AVATAR_TYPES as readonly string[]).includes(file.type)) { setAvatarError(t.avatarWrongType); return; }
    if (file.size > MAX_AVATAR_SIZE) { setAvatarError(t.avatarTooBig); return; }
    const reader = new FileReader();
    reader.onload = () => { setCropImage(reader.result as string); setCrop({ x: 0, y: 0 }); setZoom(1); setCroppedAreaPixels(null); setCropModalOpen(true); };
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
    if (!res.ok) { setAvatarError(t.avatarUploadFailed); setUploading(false); return; }
    const { url: newUrl } = await res.json();
    await supabase.from('profiles').update({ avatar_url: newUrl }).eq('id', profile.id);
    if (oldUrl) await deleteAvatarFromStorage(oldUrl);
    setAvatarUrl(newUrl);
    setCropImage(null);
    setUploading(false);
    await refreshProfile();
  };

  const handleCropCancel = () => { setCropModalOpen(false); setCropImage(null); };

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
    const { error } = await supabase.from('profiles').update({
      display_name:   displayName.trim() || null,
      first_name:     firstName.trim()   || null,
      last_name:      lastName.trim()    || null,
      date_of_birth:  dateOfBirth        || null,
      sex:            sex                || null,
      phone:          phone.trim()       || null,
      height_cm:      heightCm  ? Number(heightCm)  : null,
      weight_kg:      weightKg  ? Number(weightKg)  : null,
      blood_type:     bloodType          || null,
      activity_level: activityLevel      || null,
      diet:           diet               || null,
      country:        country            || null,
      street_address: streetAddress.trim() || null,
      city:           city.trim()          || null,
      postal_code:    postalCode.trim()    || null,
    }).eq('id', profile.id);

    if (error) { setSaveState('error'); setTimeout(() => setSaveState('idle'), 3000); return; }
    localStorage.setItem('evida-lang', langPref);
    if (langPref !== lang) { window.location.href = `/${langPref}/profile`; return; }
    setSaveState('saved');
    setTimeout(() => setSaveState('idle'), 2500);
  };

  // ── Derived ─────────────────────────────────────────────────────────────────

  const showAvatar = !!avatarUrl && !avatarBroken;
  const initials = (firstName && lastName ? `${firstName[0]}${lastName[0]}` : firstName ? firstName[0] : displayName ? displayName[0] : profile.email[0] ?? '?').toUpperCase();
  const LOCALE_MAP: Record<Lang, string> = { de: 'de-DE', en: 'en-US', fr: 'fr-FR', es: 'es-ES', it: 'it-IT' };
  const memberSince = new Date(profile.created_at).toLocaleDateString(LOCALE_MAP[lang], { year: 'numeric', month: 'long' });

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Crop modal */}
      {cropModalOpen && cropImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="px-5 py-4 border-b border-[#0e393d]/10">
              <p className="text-sm font-semibold text-[#0e393d]">{t.cropTitle}</p>
            </div>
            <div className="relative w-full" style={{ height: 300 }}>
              <Cropper image={cropImage} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
            </div>
            <div className="px-5 pt-4 pb-2">
              <label className="block text-[11px] font-medium text-[#1c2a2b]/50 mb-1.5">{t.cropZoom}</label>
              <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full h-1.5 rounded-full appearance-none cursor-pointer" style={{ accentColor: '#0e393d' }} />
            </div>
            <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-[#0e393d]/10">
              <button type="button" onClick={handleCropCancel} className="rounded-xl border border-[#0e393d]/20 bg-white px-4 py-2 text-sm font-medium text-[#0e393d] hover:bg-[#0e393d]/5 transition">{t.cropCancel}</button>
              <button type="button" onClick={handleCropSave} className="rounded-xl bg-[#0e393d] px-4 py-2 text-sm font-medium text-white hover:bg-[#0e393d]/85 transition">{t.cropSave}</button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">

        {/* Avatar */}
        <Section title={t.avatar}>
          <div className="flex items-center gap-6">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#0e393d]/15 bg-[#0e393d]/8 flex items-center justify-center">
                {showAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl.includes('/storage/v1/object/public/') ? avatarUrl.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + '?width=96&height=96&resize=cover' : avatarUrl}
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
                  <svg className="w-5 h-5 text-white animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 rounded-xl border border-[#0e393d]/20 bg-white px-4 py-2 text-sm font-medium text-[#0e393d] hover:bg-[#0e393d]/5 hover:border-[#0e393d]/35 transition disabled:opacity-50">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  {uploading ? t.uploading : t.changeAvatar}
                </button>
                {avatarUrl && (
                  <button type="button" onClick={handleRemoveAvatar} disabled={uploading} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 hover:border-red-300 transition disabled:opacity-50">
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 10 10"><path d="M2 2l6 6M8 2l-6 6" strokeLinecap="round"/></svg>
                    {t.removeAvatar}
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarFileChange} />
              {avatarError ? <p className="text-[11px] text-red-500">{avatarError}</p> : <p className="text-[11px] text-[#1c2a2b]/35">JPG, PNG, WebP — max 5 MB</p>}
            </div>
          </div>
        </Section>

        {/* Personal info */}
        <Section title={t.personalInfo}>
          <div className="space-y-4">
            <div>
              <FieldLabel text={t.displayName} hint={t.displayNameHint} />
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Max" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel text={t.firstName} />
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder={t.firstName} className={inputCls} />
              </div>
              <div>
                <FieldLabel text={t.lastName} />
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder={t.lastName} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <BirthdayField value={dateOfBirth} onChange={setDateOfBirth} label={t.dateOfBirth} hint={t.dateOfBirthHint} />
              <div>
                <FieldLabel text={t.sex} />
                <select value={sex} onChange={(e) => setSex(e.target.value)} className={selectCls}>
                  <option value="">—</option>
                  {SEX_VALUES.map((v, i) => <option key={v} value={v}>{t.sexOptions[i]}</option>)}
                </select>
              </div>
            </div>
          </div>
        </Section>

        {/* Contact */}
        <Section title={t.contact}>
          <div className="space-y-4">
            <div>
              <FieldLabel text={t.email} />
              <input type="email" value={profile.email} disabled className={inputCls} />
              <p className="mt-1 text-[11px] text-[#1c2a2b]/35">{t.emailHint}</p>
            </div>
            <PhoneField value={phone} onChange={setPhone} label={t.phone} hint={t.phoneHint} />
            <div>
              <FieldLabel text={t.streetAddress} />
              <input type="text" value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} placeholder={lang === 'de' ? 'Musterstrasse 1' : '123 Main St'} className={inputCls} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <FieldLabel text={t.postalCode} />
                <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="8001" className={inputCls} />
              </div>
              <div className="col-span-2">
                <FieldLabel text={t.city} />
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Zurich" className={inputCls} />
              </div>
            </div>
            <div>
              <FieldLabel text={t.country} />
              <select value={country} onChange={(e) => setCountry(e.target.value)} className={selectCls}>
                <option value="">—</option>
                {EUROPEAN_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </Section>

        {/* Health */}
        <Section title={t.health}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel text={t.heightCm} />
                <input type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="170" min={50} max={250} className={inputCls} />
              </div>
              <div>
                <FieldLabel text={t.weightKg} />
                <input type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="70" min={20} max={300} step="0.1" className={inputCls} />
              </div>
            </div>
            <div>
              <FieldLabel text={t.bloodType} hint={t.bloodTypeHint} />
              <select value={bloodType} onChange={(e) => setBloodType(e.target.value)} className={selectCls}>
                <option value="">—</option>
                {BLOOD_TYPES.map((bt) => <option key={bt} value={bt}>{bt}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel text={t.activityLevel} />
                <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)} className={selectCls}>
                  <option value="">—</option>
                  {ACTIVITY_LEVELS.map((v, i) => <option key={v} value={v}>{t.activityOptions[i]}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel text={t.diet} />
                <select value={diet} onChange={(e) => setDiet(e.target.value)} className={selectCls}>
                  <option value="">—</option>
                  {DIET_VALUES.map((v, i) => <option key={v} value={v}>{t.dietOptions[i]}</option>)}
                </select>
              </div>
            </div>
          </div>
        </Section>

        {/* Preferences */}
        <Section title={t.preferences}>
          <div>
            <p className="text-xs font-medium text-[#0e393d]/70 mb-2">{t.language}</p>
            <div className="flex gap-2">
              {(['de', 'en'] as const).map((l) => (
                <button key={l} type="button" onClick={() => setLangPref(l)} className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${langPref === l ? 'border-[#0e393d] bg-[#0e393d] text-white' : 'border-[#0e393d]/15 bg-white text-[#1c2a2b]/60 hover:border-[#0e393d]/35 hover:text-[#1c2a2b]'}`}>
                  <span>{l === 'de' ? '🇩🇪' : '🇬🇧'}</span>
                  {l === 'de' ? t.langDe : t.langEn}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* Account info */}
        <Section title={t.account}>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#1c2a2b]/50">{t.memberSince}</span>
              <span className="font-medium text-[#1c2a2b]">{memberSince}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#1c2a2b]/50">{t.onboarding}</span>
              <span className={`inline-flex items-center gap-1 text-xs font-medium ${profile.onboarding_completed ? 'text-emerald-600' : 'text-[#1c2a2b]/40'}`}>
                {profile.onboarding_completed ? (<><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6.5l3 3 5-5.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>{t.onboardingDone}</>) : t.onboardingPending}
              </span>
            </div>
            {profile.is_admin && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#1c2a2b]/50">Role</span>
                <span className="inline-flex items-center rounded-full bg-[#0e393d] px-2.5 py-0.5 text-[10px] font-semibold text-white">{t.adminBadge}</span>
              </div>
            )}
          </div>
        </Section>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saveState === 'saving' || uploading} className={`inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition ${saveState === 'saved' ? 'bg-emerald-500 text-white' : saveState === 'error' ? 'bg-red-500 text-white' : 'bg-[#0e393d] text-white hover:bg-[#0e393d]/85 disabled:opacity-60'}`}>
            {saveState === 'saving' ? t.saving : saveState === 'saved' ? t.saved : saveState === 'error' ? t.saveError : t.save}
          </button>
        </div>

        {/* Delete account */}
        <section className="rounded-2xl border border-red-200/60 bg-red-50/40 p-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-red-500/70 mb-3">{t.deleteSection}</h2>
          <p className="text-sm text-[#1c2a2b]/60 mb-4">{t.deleteInfo}</p>
          <a href="mailto:support@evidalife.com" className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            {t.deleteContact}
          </a>
        </section>

      </form>
    </>
  );
}
