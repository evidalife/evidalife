'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { setOptions as setGMapsOptions, importLibrary as importGMapsLibrary } from '@googlemaps/js-api-loader';
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

const DIAL_COUNTRIES: DialCountry[] = [
  // DACH first
  { code: 'CH', flag: '🇨🇭', dialCode: '+41',  name: 'Switzerland' },
  { code: 'DE', flag: '🇩🇪', dialCode: '+49',  name: 'Germany' },
  { code: 'AT', flag: '🇦🇹', dialCode: '+43',  name: 'Austria' },
  // Alphabetical
  { code: 'AF', flag: '🇦🇫', dialCode: '+93',  name: 'Afghanistan' },
  { code: 'AL', flag: '🇦🇱', dialCode: '+355', name: 'Albania' },
  { code: 'DZ', flag: '🇩🇿', dialCode: '+213', name: 'Algeria' },
  { code: 'AD', flag: '🇦🇩', dialCode: '+376', name: 'Andorra' },
  { code: 'AO', flag: '🇦🇴', dialCode: '+244', name: 'Angola' },
  { code: 'AR', flag: '🇦🇷', dialCode: '+54',  name: 'Argentina' },
  { code: 'AM', flag: '🇦🇲', dialCode: '+374', name: 'Armenia' },
  { code: 'AU', flag: '🇦🇺', dialCode: '+61',  name: 'Australia' },
  { code: 'AZ', flag: '🇦🇿', dialCode: '+994', name: 'Azerbaijan' },
  { code: 'BH', flag: '🇧🇭', dialCode: '+973', name: 'Bahrain' },
  { code: 'BD', flag: '🇧🇩', dialCode: '+880', name: 'Bangladesh' },
  { code: 'BY', flag: '🇧🇾', dialCode: '+375', name: 'Belarus' },
  { code: 'BE', flag: '🇧🇪', dialCode: '+32',  name: 'Belgium' },
  { code: 'BZ', flag: '🇧🇿', dialCode: '+501', name: 'Belize' },
  { code: 'BJ', flag: '🇧🇯', dialCode: '+229', name: 'Benin' },
  { code: 'BT', flag: '🇧🇹', dialCode: '+975', name: 'Bhutan' },
  { code: 'BO', flag: '🇧🇴', dialCode: '+591', name: 'Bolivia' },
  { code: 'BA', flag: '🇧🇦', dialCode: '+387', name: 'Bosnia' },
  { code: 'BW', flag: '🇧🇼', dialCode: '+267', name: 'Botswana' },
  { code: 'BR', flag: '🇧🇷', dialCode: '+55',  name: 'Brazil' },
  { code: 'BN', flag: '🇧🇳', dialCode: '+673', name: 'Brunei' },
  { code: 'BG', flag: '🇧🇬', dialCode: '+359', name: 'Bulgaria' },
  { code: 'BF', flag: '🇧🇫', dialCode: '+226', name: 'Burkina Faso' },
  { code: 'BI', flag: '🇧🇮', dialCode: '+257', name: 'Burundi' },
  { code: 'KH', flag: '🇰🇭', dialCode: '+855', name: 'Cambodia' },
  { code: 'CM', flag: '🇨🇲', dialCode: '+237', name: 'Cameroon' },
  { code: 'CA', flag: '🇨🇦', dialCode: '+1',   name: 'Canada' },
  { code: 'CV', flag: '🇨🇻', dialCode: '+238', name: 'Cape Verde' },
  { code: 'CF', flag: '🇨🇫', dialCode: '+236', name: 'Central African Republic' },
  { code: 'TD', flag: '🇹🇩', dialCode: '+235', name: 'Chad' },
  { code: 'CL', flag: '🇨🇱', dialCode: '+56',  name: 'Chile' },
  { code: 'CN', flag: '🇨🇳', dialCode: '+86',  name: 'China' },
  { code: 'CO', flag: '🇨🇴', dialCode: '+57',  name: 'Colombia' },
  { code: 'KM', flag: '🇰🇲', dialCode: '+269', name: 'Comoros' },
  { code: 'CG', flag: '🇨🇬', dialCode: '+242', name: 'Congo' },
  { code: 'CR', flag: '🇨🇷', dialCode: '+506', name: 'Costa Rica' },
  { code: 'HR', flag: '🇭🇷', dialCode: '+385', name: 'Croatia' },
  { code: 'CU', flag: '🇨🇺', dialCode: '+53',  name: 'Cuba' },
  { code: 'CY', flag: '🇨🇾', dialCode: '+357', name: 'Cyprus' },
  { code: 'CZ', flag: '🇨🇿', dialCode: '+420', name: 'Czech Republic' },
  { code: 'DK', flag: '🇩🇰', dialCode: '+45',  name: 'Denmark' },
  { code: 'DJ', flag: '🇩🇯', dialCode: '+253', name: 'Djibouti' },
  { code: 'DO', flag: '🇩🇴', dialCode: '+1',   name: 'Dominican Republic' },
  { code: 'EC', flag: '🇪🇨', dialCode: '+593', name: 'Ecuador' },
  { code: 'EG', flag: '🇪🇬', dialCode: '+20',  name: 'Egypt' },
  { code: 'SV', flag: '🇸🇻', dialCode: '+503', name: 'El Salvador' },
  { code: 'GQ', flag: '🇬🇶', dialCode: '+240', name: 'Equatorial Guinea' },
  { code: 'ER', flag: '🇪🇷', dialCode: '+291', name: 'Eritrea' },
  { code: 'EE', flag: '🇪🇪', dialCode: '+372', name: 'Estonia' },
  { code: 'ET', flag: '🇪🇹', dialCode: '+251', name: 'Ethiopia' },
  { code: 'FI', flag: '🇫🇮', dialCode: '+358', name: 'Finland' },
  { code: 'FR', flag: '🇫🇷', dialCode: '+33',  name: 'France' },
  { code: 'GA', flag: '🇬🇦', dialCode: '+241', name: 'Gabon' },
  { code: 'GM', flag: '🇬🇲', dialCode: '+220', name: 'Gambia' },
  { code: 'GE', flag: '🇬🇪', dialCode: '+995', name: 'Georgia' },
  { code: 'GH', flag: '🇬🇭', dialCode: '+233', name: 'Ghana' },
  { code: 'GR', flag: '🇬🇷', dialCode: '+30',  name: 'Greece' },
  { code: 'GT', flag: '🇬🇹', dialCode: '+502', name: 'Guatemala' },
  { code: 'GN', flag: '🇬🇳', dialCode: '+224', name: 'Guinea' },
  { code: 'GY', flag: '🇬🇾', dialCode: '+592', name: 'Guyana' },
  { code: 'HT', flag: '🇭🇹', dialCode: '+509', name: 'Haiti' },
  { code: 'HN', flag: '🇭🇳', dialCode: '+504', name: 'Honduras' },
  { code: 'HK', flag: '🇭🇰', dialCode: '+852', name: 'Hong Kong' },
  { code: 'HU', flag: '🇭🇺', dialCode: '+36',  name: 'Hungary' },
  { code: 'IS', flag: '🇮🇸', dialCode: '+354', name: 'Iceland' },
  { code: 'IN', flag: '🇮🇳', dialCode: '+91',  name: 'India' },
  { code: 'ID', flag: '🇮🇩', dialCode: '+62',  name: 'Indonesia' },
  { code: 'IR', flag: '🇮🇷', dialCode: '+98',  name: 'Iran' },
  { code: 'IQ', flag: '🇮🇶', dialCode: '+964', name: 'Iraq' },
  { code: 'IE', flag: '🇮🇪', dialCode: '+353', name: 'Ireland' },
  { code: 'IL', flag: '🇮🇱', dialCode: '+972', name: 'Israel' },
  { code: 'IT', flag: '🇮🇹', dialCode: '+39',  name: 'Italy' },
  { code: 'JM', flag: '🇯🇲', dialCode: '+1',   name: 'Jamaica' },
  { code: 'JP', flag: '🇯🇵', dialCode: '+81',  name: 'Japan' },
  { code: 'JO', flag: '🇯🇴', dialCode: '+962', name: 'Jordan' },
  { code: 'KZ', flag: '🇰🇿', dialCode: '+7',   name: 'Kazakhstan' },
  { code: 'KE', flag: '🇰🇪', dialCode: '+254', name: 'Kenya' },
  { code: 'KW', flag: '🇰🇼', dialCode: '+965', name: 'Kuwait' },
  { code: 'KG', flag: '🇰🇬', dialCode: '+996', name: 'Kyrgyzstan' },
  { code: 'LA', flag: '🇱🇦', dialCode: '+856', name: 'Laos' },
  { code: 'LV', flag: '🇱🇻', dialCode: '+371', name: 'Latvia' },
  { code: 'LB', flag: '🇱🇧', dialCode: '+961', name: 'Lebanon' },
  { code: 'LI', flag: '🇱🇮', dialCode: '+423', name: 'Liechtenstein' },
  { code: 'LT', flag: '🇱🇹', dialCode: '+370', name: 'Lithuania' },
  { code: 'LU', flag: '🇱🇺', dialCode: '+352', name: 'Luxembourg' },
  { code: 'MO', flag: '🇲🇴', dialCode: '+853', name: 'Macau' },
  { code: 'MG', flag: '🇲🇬', dialCode: '+261', name: 'Madagascar' },
  { code: 'MW', flag: '🇲🇼', dialCode: '+265', name: 'Malawi' },
  { code: 'MY', flag: '🇲🇾', dialCode: '+60',  name: 'Malaysia' },
  { code: 'MV', flag: '🇲🇻', dialCode: '+960', name: 'Maldives' },
  { code: 'ML', flag: '🇲🇱', dialCode: '+223', name: 'Mali' },
  { code: 'MT', flag: '🇲🇹', dialCode: '+356', name: 'Malta' },
  { code: 'MR', flag: '🇲🇷', dialCode: '+222', name: 'Mauritania' },
  { code: 'MU', flag: '🇲🇺', dialCode: '+230', name: 'Mauritius' },
  { code: 'MX', flag: '🇲🇽', dialCode: '+52',  name: 'Mexico' },
  { code: 'MD', flag: '🇲🇩', dialCode: '+373', name: 'Moldova' },
  { code: 'MC', flag: '🇲🇨', dialCode: '+377', name: 'Monaco' },
  { code: 'MN', flag: '🇲🇳', dialCode: '+976', name: 'Mongolia' },
  { code: 'ME', flag: '🇲🇪', dialCode: '+382', name: 'Montenegro' },
  { code: 'MA', flag: '🇲🇦', dialCode: '+212', name: 'Morocco' },
  { code: 'MZ', flag: '🇲🇿', dialCode: '+258', name: 'Mozambique' },
  { code: 'MM', flag: '🇲🇲', dialCode: '+95',  name: 'Myanmar' },
  { code: 'NA', flag: '🇳🇦', dialCode: '+264', name: 'Namibia' },
  { code: 'NP', flag: '🇳🇵', dialCode: '+977', name: 'Nepal' },
  { code: 'NL', flag: '🇳🇱', dialCode: '+31',  name: 'Netherlands' },
  { code: 'NZ', flag: '🇳🇿', dialCode: '+64',  name: 'New Zealand' },
  { code: 'NI', flag: '🇳🇮', dialCode: '+505', name: 'Nicaragua' },
  { code: 'NE', flag: '🇳🇪', dialCode: '+227', name: 'Niger' },
  { code: 'NG', flag: '🇳🇬', dialCode: '+234', name: 'Nigeria' },
  { code: 'KP', flag: '🇰🇵', dialCode: '+850', name: 'North Korea' },
  { code: 'MK', flag: '🇲🇰', dialCode: '+389', name: 'North Macedonia' },
  { code: 'NO', flag: '🇳🇴', dialCode: '+47',  name: 'Norway' },
  { code: 'OM', flag: '🇴🇲', dialCode: '+968', name: 'Oman' },
  { code: 'PK', flag: '🇵🇰', dialCode: '+92',  name: 'Pakistan' },
  { code: 'PS', flag: '🇵🇸', dialCode: '+970', name: 'Palestine' },
  { code: 'PA', flag: '🇵🇦', dialCode: '+507', name: 'Panama' },
  { code: 'PG', flag: '🇵🇬', dialCode: '+675', name: 'Papua New Guinea' },
  { code: 'PY', flag: '🇵🇾', dialCode: '+595', name: 'Paraguay' },
  { code: 'PE', flag: '🇵🇪', dialCode: '+51',  name: 'Peru' },
  { code: 'PH', flag: '🇵🇭', dialCode: '+63',  name: 'Philippines' },
  { code: 'PL', flag: '🇵🇱', dialCode: '+48',  name: 'Poland' },
  { code: 'PT', flag: '🇵🇹', dialCode: '+351', name: 'Portugal' },
  { code: 'QA', flag: '🇶🇦', dialCode: '+974', name: 'Qatar' },
  { code: 'RO', flag: '🇷🇴', dialCode: '+40',  name: 'Romania' },
  { code: 'RU', flag: '🇷🇺', dialCode: '+7',   name: 'Russia' },
  { code: 'RW', flag: '🇷🇼', dialCode: '+250', name: 'Rwanda' },
  { code: 'SA', flag: '🇸🇦', dialCode: '+966', name: 'Saudi Arabia' },
  { code: 'SN', flag: '🇸🇳', dialCode: '+221', name: 'Senegal' },
  { code: 'RS', flag: '🇷🇸', dialCode: '+381', name: 'Serbia' },
  { code: 'SG', flag: '🇸🇬', dialCode: '+65',  name: 'Singapore' },
  { code: 'SK', flag: '🇸🇰', dialCode: '+421', name: 'Slovakia' },
  { code: 'SI', flag: '🇸🇮', dialCode: '+386', name: 'Slovenia' },
  { code: 'SO', flag: '🇸🇴', dialCode: '+252', name: 'Somalia' },
  { code: 'ZA', flag: '🇿🇦', dialCode: '+27',  name: 'South Africa' },
  { code: 'KR', flag: '🇰🇷', dialCode: '+82',  name: 'South Korea' },
  { code: 'SS', flag: '🇸🇸', dialCode: '+211', name: 'South Sudan' },
  { code: 'ES', flag: '🇪🇸', dialCode: '+34',  name: 'Spain' },
  { code: 'LK', flag: '🇱🇰', dialCode: '+94',  name: 'Sri Lanka' },
  { code: 'SD', flag: '🇸🇩', dialCode: '+249', name: 'Sudan' },
  { code: 'SR', flag: '🇸🇷', dialCode: '+597', name: 'Suriname' },
  { code: 'SE', flag: '🇸🇪', dialCode: '+46',  name: 'Sweden' },
  { code: 'SY', flag: '🇸🇾', dialCode: '+963', name: 'Syria' },
  { code: 'TW', flag: '🇹🇼', dialCode: '+886', name: 'Taiwan' },
  { code: 'TJ', flag: '🇹🇯', dialCode: '+992', name: 'Tajikistan' },
  { code: 'TZ', flag: '🇹🇿', dialCode: '+255', name: 'Tanzania' },
  { code: 'TH', flag: '🇹🇭', dialCode: '+66',  name: 'Thailand' },
  { code: 'TG', flag: '🇹🇬', dialCode: '+228', name: 'Togo' },
  { code: 'TT', flag: '🇹🇹', dialCode: '+1',   name: 'Trinidad & Tobago' },
  { code: 'TN', flag: '🇹🇳', dialCode: '+216', name: 'Tunisia' },
  { code: 'TR', flag: '🇹🇷', dialCode: '+90',  name: 'Turkey' },
  { code: 'TM', flag: '🇹🇲', dialCode: '+993', name: 'Turkmenistan' },
  { code: 'UG', flag: '🇺🇬', dialCode: '+256', name: 'Uganda' },
  { code: 'UA', flag: '🇺🇦', dialCode: '+380', name: 'Ukraine' },
  { code: 'AE', flag: '🇦🇪', dialCode: '+971', name: 'UAE' },
  { code: 'GB', flag: '🇬🇧', dialCode: '+44',  name: 'United Kingdom' },
  { code: 'US', flag: '🇺🇸', dialCode: '+1',   name: 'United States' },
  { code: 'UY', flag: '🇺🇾', dialCode: '+598', name: 'Uruguay' },
  { code: 'UZ', flag: '🇺🇿', dialCode: '+998', name: 'Uzbekistan' },
  { code: 'VE', flag: '🇻🇪', dialCode: '+58',  name: 'Venezuela' },
  { code: 'VN', flag: '🇻🇳', dialCode: '+84',  name: 'Vietnam' },
  { code: 'YE', flag: '🇾🇪', dialCode: '+967', name: 'Yemen' },
  { code: 'ZM', flag: '🇿🇲', dialCode: '+260', name: 'Zambia' },
  { code: 'ZW', flag: '🇿🇼', dialCode: '+263', name: 'Zimbabwe' },
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
  if (/^0(75|76|77|78|79)/.test(stripped)) return DIAL_COUNTRIES.find((c) => c.code === 'CH');
  return undefined;
}

function toE164(local: string, dialCode: string): string {
  const stripped = local.replace(/[\s\-().]/g, '');
  if (stripped.startsWith('+')) return stripped;
  if (stripped.startsWith('00')) return '+' + stripped.slice(2);
  if (/^0\d/.test(stripped)) return dialCode + stripped.slice(1);
  return dialCode + stripped;
}

function formatPhoneDisplay(e164: string): string {
  return e164;
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
  const match = stripped.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(stripped)) return stripped;
  return '';
}

// ─── Translations ─────────────────────────────────────────────────────────────

const T = {
  de: {
    avatar: 'Profilbild', changeAvatar: 'Bild ändern', removeAvatar: 'Entfernen',
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
    address: 'Adresse', streetAddress: 'Straße und Hausnummer', streetPlaceholder: 'Musterstrasse 1',
    city: 'Stadt', postalCode: 'Postleitzahl', country: 'Land',
    health: 'Gesundheit',
    heightCm: 'Körpergröße (cm)', weightKg: 'Gewicht (kg)',
    bloodType: 'Blutgruppe', bloodTypeHint: 'Optional. Wird für medizinische Berichte verwendet.',
    activityLevel: 'Aktivitätsniveau',
    activityOptions: ['Sitzend', 'Leicht aktiv', 'Aktiv', 'Sehr aktiv'] as string[],
    diet: 'Ernährungsweise',
    dietOptions: ['Omnivor', 'Vegetarisch', 'Vegan', 'Pescetarisch', 'Andere'] as string[],
    account: 'Konto', memberSince: 'Mitglied seit', adminBadge: 'Admin',
    onboarding: 'Onboarding', onboardingDone: 'Abgeschlossen', onboardingPending: 'Ausstehend',
    changeEmail: 'E-Mail ändern', changeEmailNew: 'Neue E-Mail-Adresse', changeEmailSave: 'Bestätigung senden',
    changeEmailSent: 'Bestätigungs-E-Mail gesendet. Bitte überprüfe dein Postfach.',
    changeEmailError: 'E-Mail konnte nicht geändert werden.',
    changePassword: 'Passwort ändern',
    passwordResetSent: 'Passwort-Reset-E-Mail wurde gesendet.',
    passwordResetError: 'Fehler beim Senden der Reset-E-Mail.',
    useInvoiceAddress: 'Abweichende Rechnungsadresse verwenden',
    invoiceAddress: 'Rechnungsadresse',
    save: 'Speichern', saving: 'Wird gespeichert…', saved: 'Gespeichert ✓', saveError: 'Fehler beim Speichern.',
    unsavedChanges: 'Ungespeicherte Änderungen',
    deleteSection: 'Konto löschen',
    deleteInfo: 'Wenn du dein Konto löschen möchtest, wende dich bitte an unseren Support.',
    deleteContact: 'Support kontaktieren',
  },
  en: {
    avatar: 'Profile picture', changeAvatar: 'Change photo', removeAvatar: 'Remove',
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
    address: 'Address', streetAddress: 'Street address', streetPlaceholder: '123 Main St',
    city: 'City', postalCode: 'Postal code', country: 'Country',
    health: 'Health',
    heightCm: 'Height (cm)', weightKg: 'Weight (kg)',
    bloodType: 'Blood type', bloodTypeHint: 'Optional. Used in medical reports.',
    activityLevel: 'Activity level',
    activityOptions: ['Sedentary', 'Lightly active', 'Active', 'Very active'] as string[],
    diet: 'Diet',
    dietOptions: ['Omnivore', 'Vegetarian', 'Vegan', 'Pescatarian', 'Other'] as string[],
    account: 'Account', memberSince: 'Member since', adminBadge: 'Admin',
    onboarding: 'Onboarding', onboardingDone: 'Completed', onboardingPending: 'Pending',
    changeEmail: 'Change email', changeEmailNew: 'New email address', changeEmailSave: 'Send verification',
    changeEmailSent: 'Verification email sent. Check your inbox.',
    changeEmailError: 'Could not update email.',
    changePassword: 'Change password',
    passwordResetSent: 'Password reset email sent.',
    passwordResetError: 'Failed to send reset email.',
    useInvoiceAddress: 'Use a different invoice address',
    invoiceAddress: 'Invoice address',
    save: 'Save changes', saving: 'Saving…', saved: 'Saved ✓', saveError: 'Failed to save.',
    unsavedChanges: 'Unsaved changes',
    deleteSection: 'Delete account',
    deleteInfo: 'If you want to delete your account, please contact our support team.',
    deleteContact: 'Contact support',
  },
  fr: {
    avatar: 'Photo de profil', changeAvatar: 'Changer', removeAvatar: 'Supprimer',
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
    address: 'Adresse', streetAddress: 'Adresse postale', streetPlaceholder: '1 rue de la Paix',
    city: 'Ville', postalCode: 'Code postal', country: 'Pays',
    health: 'Santé',
    heightCm: 'Taille (cm)', weightKg: 'Poids (kg)',
    bloodType: 'Groupe sanguin', bloodTypeHint: 'Optionnel. Utilisé dans les rapports médicaux.',
    activityLevel: "Niveau d'activité",
    activityOptions: ['Sédentaire', 'Légèrement actif', 'Actif', 'Très actif'] as string[],
    diet: 'Alimentation',
    dietOptions: ['Omnivore', 'Végétarien', 'Végétalien', 'Pescatarien', 'Autre'] as string[],
    account: 'Compte', memberSince: 'Membre depuis', adminBadge: 'Admin',
    onboarding: 'Onboarding', onboardingDone: 'Terminé', onboardingPending: 'En attente',
    changeEmail: "Modifier l'e-mail", changeEmailNew: 'Nouvelle adresse e-mail', changeEmailSave: 'Envoyer la vérification',
    changeEmailSent: "E-mail de vérification envoyé. Consultez votre boîte.",
    changeEmailError: "Impossible de modifier l'e-mail.",
    changePassword: 'Changer le mot de passe',
    passwordResetSent: 'E-mail de réinitialisation envoyé.',
    passwordResetError: "Échec de l'envoi de l'e-mail.",
    useInvoiceAddress: 'Utiliser une adresse de facturation différente',
    invoiceAddress: 'Adresse de facturation',
    save: 'Enregistrer les modifications', saving: 'Enregistrement…', saved: 'Enregistré ✓', saveError: "Échec de l'enregistrement.",
    unsavedChanges: 'Modifications non enregistrées',
    deleteSection: 'Supprimer le compte',
    deleteInfo: 'Si vous souhaitez supprimer votre compte, veuillez contacter notre support.',
    deleteContact: 'Contacter le support',
  },
  es: {
    avatar: 'Foto de perfil', changeAvatar: 'Cambiar', removeAvatar: 'Eliminar',
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
    address: 'Dirección', streetAddress: 'Dirección postal', streetPlaceholder: 'Calle Mayor 1',
    city: 'Ciudad', postalCode: 'Código postal', country: 'País',
    health: 'Salud',
    heightCm: 'Altura (cm)', weightKg: 'Peso (kg)',
    bloodType: 'Grupo sanguíneo', bloodTypeHint: 'Opcional. Se usa en informes médicos.',
    activityLevel: 'Nivel de actividad',
    activityOptions: ['Sedentario', 'Ligeramente activo', 'Activo', 'Muy activo'] as string[],
    diet: 'Dieta',
    dietOptions: ['Omnívoro', 'Vegetariano', 'Vegano', 'Pescatariano', 'Otro'] as string[],
    account: 'Cuenta', memberSince: 'Miembro desde', adminBadge: 'Admin',
    onboarding: 'Incorporación', onboardingDone: 'Completado', onboardingPending: 'Pendiente',
    changeEmail: 'Cambiar correo', changeEmailNew: 'Nuevo correo electrónico', changeEmailSave: 'Enviar verificación',
    changeEmailSent: 'Correo de verificación enviado. Revisa tu bandeja.',
    changeEmailError: 'No se pudo actualizar el correo.',
    changePassword: 'Cambiar contraseña',
    passwordResetSent: 'Correo de restablecimiento enviado.',
    passwordResetError: 'Error al enviar el correo.',
    useInvoiceAddress: 'Usar una dirección de facturación diferente',
    invoiceAddress: 'Dirección de facturación',
    save: 'Guardar cambios', saving: 'Guardando…', saved: 'Guardado ✓', saveError: 'Error al guardar.',
    unsavedChanges: 'Cambios sin guardar',
    deleteSection: 'Eliminar cuenta',
    deleteInfo: 'Si deseas eliminar tu cuenta, por favor contacta a nuestro soporte.',
    deleteContact: 'Contactar soporte',
  },
  it: {
    avatar: 'Foto del profilo', changeAvatar: 'Cambia', removeAvatar: 'Rimuovi',
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
    address: 'Indirizzo', streetAddress: 'Indirizzo postale', streetPlaceholder: 'Via Roma 1',
    city: 'Città', postalCode: 'Codice postale', country: 'Paese',
    health: 'Salute',
    heightCm: 'Altezza (cm)', weightKg: 'Peso (kg)',
    bloodType: 'Gruppo sanguigno', bloodTypeHint: 'Opzionale. Usato nei report medici.',
    activityLevel: 'Livello di attività',
    activityOptions: ['Sedentario', 'Leggermente attivo', 'Attivo', 'Molto attivo'] as string[],
    diet: 'Alimentazione',
    dietOptions: ['Onnivoro', 'Vegetariano', 'Vegano', 'Pescatariano', 'Altro'] as string[],
    account: 'Account', memberSince: 'Membro dal', adminBadge: 'Admin',
    onboarding: 'Onboarding', onboardingDone: 'Completato', onboardingPending: 'In attesa',
    changeEmail: 'Cambia e-mail', changeEmailNew: 'Nuovo indirizzo e-mail', changeEmailSave: 'Invia verifica',
    changeEmailSent: 'E-mail di verifica inviata. Controlla la tua casella.',
    changeEmailError: "Impossibile aggiornare l'e-mail.",
    changePassword: 'Cambia password',
    passwordResetSent: 'E-mail di reset inviata.',
    passwordResetError: "Invio dell'e-mail fallito.",
    useInvoiceAddress: 'Usa un indirizzo di fatturazione diverso',
    invoiceAddress: 'Indirizzo di fatturazione',
    save: 'Salva modifiche', saving: 'Salvataggio…', saved: 'Salvato ✓', saveError: 'Salvataggio fallito.',
    unsavedChanges: 'Modifiche non salvate',
    deleteSection: 'Elimina account',
    deleteInfo: 'Se vuoi eliminare il tuo account, contatta il nostro supporto.',
    deleteContact: 'Contatta il supporto',
  },
};

// ─── Primitives ───────────────────────────────────────────────────────────────

const inputCls = 'w-full rounded-xl border border-[#0e393d]/15 bg-white px-4 py-3 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/35 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition-colors disabled:bg-[#0e393d]/4 disabled:text-[#1c2a2b]/40 disabled:cursor-not-allowed';
const selectCls = inputCls + ' cursor-pointer appearance-none';

function FieldLabel({ text, hint }: { text: string; hint?: string }) {
  return (
    <div className="mb-1.5">
      <span className="block text-xs font-medium text-[#0e393d]/70">{text}</span>
      {hint && <span className="block text-[11px] text-[#1c2a2b]/35 mt-0.5">{hint}</span>}
    </div>
  );
}

function Section({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#0e393d]/10 border-l-2 border-l-[#ceab84] bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#ceab84] mb-5">
        {icon && <span className="opacity-80">{icon}</span>}
        {title}
      </h2>
      {children}
    </section>
  );
}

// ─── Section icons ────────────────────────────────────────────────────────────

const IconCamera = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);
const IconUser = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconMail = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);
const IconHeart = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);
const IconShield = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

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
    if (localNumber) onChange(toE164(localNumber, c.dialCode));
  };

  const handleNumberChange = (raw: string) => {
    setLocalNumber(raw);
    if (!raw.trim()) { onChange(''); return; }
    const detected = detectDialCountry(raw);
    if (detected && detected.code !== selectedCountry.code) setSelectedCountry(detected);
    onChange(toE164(raw, selectedCountry.dialCode));
  };

  return (
    <div>
      <FieldLabel text={label} hint={hint} />
      <div className="flex gap-2">
        <select
          value={selectedCountry.code}
          onChange={(e) => handleCountryChange(e.target.value)}
          className="rounded-xl border border-[#0e393d]/15 bg-white px-2 py-3 text-sm text-[#1c2a2b] focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition-colors cursor-pointer w-28 shrink-0"
          title="Country code"
        >
          {DIAL_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.flag} {c.dialCode} {c.name}</option>
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
        placeholder="DD.MM.YYYY"
        maxLength={10}
        className={inputCls}
      />
    </div>
  );
}

// ─── Address Autocomplete ─────────────────────────────────────────────────────

type AddressData = { street: string; city: string; postalCode: string; country: string };

function AddressAutocomplete({
  value, onChange, onAddressSelect, label, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onAddressSelect: (data: AddressData) => void;
  label: string;
  placeholder: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listenerRef = useRef<google.maps.MapsEventListener | null>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    setGMapsOptions({ key: apiKey, v: 'weekly' });

    importGMapsLibrary('places').then((placesLib) => {
      if (!inputRef.current) return;
      const { Autocomplete } = placesLib as google.maps.PlacesLibrary;
      const autocomplete = new Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: {
          country: ['ch', 'de', 'at', 'fr', 'it', 'es', 'gb', 'nl', 'be', 'lu', 'pt', 'se', 'no', 'dk', 'fi', 'ie', 'pl', 'cz', 'sk', 'hu', 'ro', 'gr'],
        },
        fields: ['address_components'],
      });

      listenerRef.current = autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place?.address_components) return;

        let streetNumber = '', route = '', city = '', postalCode = '', countryCode = '';
        for (const comp of place.address_components) {
          const t = comp.types;
          if (t.includes('street_number')) streetNumber = comp.long_name;
          if (t.includes('route')) route = comp.long_name;
          if (t.includes('locality') || t.includes('postal_town')) city = comp.long_name;
          if (t.includes('postal_code')) postalCode = comp.long_name;
          if (t.includes('country')) countryCode = comp.short_name;
        }

        const street = [route, streetNumber].filter(Boolean).join(' ');
        onChange(street);
        onAddressSelect({ street, city, postalCode, country: countryCode });
      });
    }).catch(() => {
      // Maps API failed to load — field degrades gracefully to plain input
    });

    return () => {
      listenerRef.current?.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <FieldLabel text={label} />
      <div className="relative">
        <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0e393d" strokeWidth="1.75" className="opacity-35">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-xl border border-[#0e393d]/15 bg-white pl-10 pr-4 py-3 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/35 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition-colors"
        />
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileEditor({ profile, lang }: { profile: ProfileData; lang: Lang }) {
  const t = T[lang];
  const supabase = createClient();
  const { refreshProfile, user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const isOAuthUser = user?.app_metadata?.provider === 'google' || (user?.app_metadata?.providers ?? []).includes('google');

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
  const [phone, setPhone] = useState(profile.phone ?? '');

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
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isDirty,   setIsDirty]   = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Change email
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  // Invoice address
  const [showInvoiceAddress, setShowInvoiceAddress] = useState(false);
  const [invoiceStreet, setInvoiceStreet] = useState('');
  const [invoiceCity, setInvoiceCity] = useState('');
  const [invoicePostalCode, setInvoicePostalCode] = useState('');
  const [invoiceCountry, setInvoiceCountry] = useState('');

  const dirty = () => setIsDirty(true);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

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

  // ── Address autocomplete callback ────────────────────────────────────────────

  const handleAddressSelect = (data: AddressData) => {
    setStreetAddress(data.street);
    if (data.city) setCity(data.city);
    if (data.postalCode) setPostalCode(data.postalCode);
    if (data.country) {
      const match = EUROPEAN_COUNTRIES.find((c) => c.code === data.country);
      if (match) setCountry(match.code);
    }
    setIsDirty(true);
  };

  // ── Change email ─────────────────────────────────────────────────────────────

  const handleChangeEmail = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) return;
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    if (error) {
      showToast(t.changeEmailError, 'error');
    } else {
      showToast(t.changeEmailSent, 'success');
      setShowEmailChange(false);
      setNewEmail('');
    }
  };

  // ── Reset password ────────────────────────────────────────────────────────────

  const handleResetPassword = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      showToast(t.passwordResetError, 'error');
    } else {
      showToast(t.passwordResetSent, 'success');
    }
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
      country:        country            || null,
      street_address: streetAddress.trim() || null,
      city:           city.trim()          || null,
      postal_code:    postalCode.trim()    || null,
    }).eq('id', profile.id);

    if (error) { setSaveState('error'); setTimeout(() => setSaveState('idle'), 3000); return; }
    setSaveState('saved');
    setIsDirty(false);
    setTimeout(() => setSaveState('idle'), 2500);
  };

  // ── Derived ─────────────────────────────────────────────────────────────────

  const showAvatar = !!avatarUrl && !avatarBroken;
  const initials = (
    firstName && lastName ? `${firstName[0]}${lastName[0]}`
    : firstName ? firstName[0]
    : displayName ? displayName[0]
    : profile.email[0] ?? '?'
  ).toUpperCase();
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

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.type === 'success'
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
          }
          {toast.message}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5 pb-24">

        {/* ── Profile Picture ── */}
        <Section title={t.avatar} icon={<IconCamera />}>
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-[#ceab84]/30 bg-[#0e393d]/8 flex items-center justify-center">
                {showAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl.includes('/storage/v1/object/public/') ? avatarUrl.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + '?width=192&height=192&resize=cover' : avatarUrl}
                    alt={firstName || 'Avatar'}
                    className="w-full h-full object-cover"
                    onError={() => setAvatarBroken(true)}
                  />
                ) : (
                  <span className="font-serif text-2xl font-semibold text-[#0e393d]/60">{initials}</span>
                )}
              </div>
              {uploading && (
                <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 rounded-xl border border-[#0e393d]/20 bg-white px-4 py-2 text-sm font-medium text-[#0e393d] hover:bg-[#0e393d]/5 hover:border-[#0e393d]/35 transition disabled:opacity-50">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
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
            {avatarError
              ? <p className="text-[11px] text-red-500">{avatarError}</p>
              : <p className="text-[11px] text-[#1c2a2b]/35">JPG, PNG, WebP — max 5 MB</p>
            }
          </div>
        </Section>

        {/* ── Personal Information ── */}
        <Section title={t.personalInfo} icon={<IconUser />}>
          <div className="space-y-4">
            <div>
              <FieldLabel text={t.displayName} hint={t.displayNameHint} />
              <input type="text" value={displayName} onChange={(e) => { setDisplayName(e.target.value); dirty(); }} placeholder="e.g. Max" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel text={t.firstName} />
                <input type="text" value={firstName} onChange={(e) => { setFirstName(e.target.value); dirty(); }} placeholder={t.firstName} className={inputCls} />
              </div>
              <div>
                <FieldLabel text={t.lastName} />
                <input type="text" value={lastName} onChange={(e) => { setLastName(e.target.value); dirty(); }} placeholder={t.lastName} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <BirthdayField value={dateOfBirth} onChange={(v) => { setDateOfBirth(v); dirty(); }} label={t.dateOfBirth} hint={t.dateOfBirthHint} />
              <div>
                <FieldLabel text={t.sex} />
                <select value={sex} onChange={(e) => { setSex(e.target.value); dirty(); }} className={selectCls}>
                  <option value="">—</option>
                  {SEX_VALUES.map((v, i) => <option key={v} value={v}>{t.sexOptions[i]}</option>)}
                </select>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Contact ── */}
        <Section title={t.contact} icon={<IconMail />}>
          <div className="space-y-4">
            <div>
              <FieldLabel text={t.email} />
              <input type="email" value={profile.email} disabled className={inputCls} />
              <p className="mt-1 text-[11px] text-[#1c2a2b]/35">{t.emailHint}</p>
            </div>
            <PhoneField value={phone} onChange={(v) => { setPhone(v); dirty(); }} label={t.phone} hint={t.phoneHint} />
            <AddressAutocomplete
              value={streetAddress}
              onChange={(v) => { setStreetAddress(v); dirty(); }}
              onAddressSelect={handleAddressSelect}
              label={t.streetAddress}
              placeholder={t.streetPlaceholder}
            />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <FieldLabel text={t.postalCode} />
                <input type="text" value={postalCode} onChange={(e) => { setPostalCode(e.target.value); dirty(); }} placeholder="8001" className={inputCls} />
              </div>
              <div className="col-span-2">
                <FieldLabel text={t.city} />
                <input type="text" value={city} onChange={(e) => { setCity(e.target.value); dirty(); }} placeholder="Zurich" className={inputCls} />
              </div>
            </div>
            <div>
              <FieldLabel text={t.country} />
              <select value={country} onChange={(e) => { setCountry(e.target.value); dirty(); }} className={selectCls}>
                <option value="">—</option>
                {EUROPEAN_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>

            {/* Invoice address toggle */}
            <label className="flex items-center gap-3 cursor-pointer pt-1">
              <button
                type="button"
                onClick={() => setShowInvoiceAddress((v) => !v)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none shrink-0 ${showInvoiceAddress ? 'bg-[#0e393d]' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${showInvoiceAddress ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-sm text-[#1c2a2b]/60">{t.useInvoiceAddress}</span>
            </label>

            {showInvoiceAddress && (
              <div className="space-y-4 pl-3 border-l-2 border-[#ceab84]/30">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ceab84]">{t.invoiceAddress}</p>
                <div>
                  <FieldLabel text={t.streetAddress} />
                  <input type="text" value={invoiceStreet} onChange={(e) => setInvoiceStreet(e.target.value)} placeholder={t.streetPlaceholder} className={inputCls} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <FieldLabel text={t.postalCode} />
                    <input type="text" value={invoicePostalCode} onChange={(e) => setInvoicePostalCode(e.target.value)} placeholder="8001" className={inputCls} />
                  </div>
                  <div className="col-span-2">
                    <FieldLabel text={t.city} />
                    <input type="text" value={invoiceCity} onChange={(e) => setInvoiceCity(e.target.value)} placeholder="Zurich" className={inputCls} />
                  </div>
                </div>
                <div>
                  <FieldLabel text={t.country} />
                  <select value={invoiceCountry} onChange={(e) => setInvoiceCountry(e.target.value)} className={selectCls}>
                    <option value="">—</option>
                    {EUROPEAN_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* ── Health ── */}
        <Section title={t.health} icon={<IconHeart />}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel text={t.heightCm} />
                <input type="number" value={heightCm} onChange={(e) => { setHeightCm(e.target.value); dirty(); }} placeholder="170" min={50} max={250} className={inputCls} />
              </div>
              <div>
                <FieldLabel text={t.weightKg} />
                <input type="number" value={weightKg} onChange={(e) => { setWeightKg(e.target.value); dirty(); }} placeholder="70" min={20} max={300} step="0.1" className={inputCls} />
              </div>
            </div>
            <div className="w-1/2">
              <FieldLabel text={t.bloodType} hint={t.bloodTypeHint} />
              <select value={bloodType} onChange={(e) => { setBloodType(e.target.value); dirty(); }} className={selectCls}>
                <option value="">—</option>
                {BLOOD_TYPES.map((bt) => <option key={bt} value={bt}>{bt}</option>)}
              </select>
            </div>
          </div>
        </Section>

        {/* ── Account ── */}
        <Section title={t.account} icon={<IconShield />}>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#1c2a2b]/50">{t.memberSince}</span>
              <span className="font-medium text-[#1c2a2b]">{memberSince}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#1c2a2b]/50">{t.onboarding}</span>
              {profile.onboarding_completed ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6.5l3 3 5-5.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {t.onboardingDone}
                </span>
              ) : (
                <span className="text-xs text-[#1c2a2b]/40">{t.onboardingPending}</span>
              )}
            </div>
            {profile.is_admin && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#1c2a2b]/50">Role</span>
                <span className="inline-flex items-center rounded-full bg-[#0e393d] px-2.5 py-0.5 text-[10px] font-semibold text-white">{t.adminBadge}</span>
              </div>
            )}
            <div className="flex flex-col gap-2 pt-1 border-t border-[#0e393d]/6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#1c2a2b]/50">{t.changeEmail}</span>
                <button
                  type="button"
                  onClick={() => setShowEmailChange((v) => !v)}
                  className="text-xs font-medium text-[#0e393d]/60 hover:text-[#0e393d] transition-colors"
                >→</button>
              </div>
              {showEmailChange && (
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder={t.changeEmailNew}
                    className="flex-1 rounded-xl border border-[#0e393d]/15 bg-white px-3 py-2 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/35 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition-colors"
                    onKeyDown={(e) => e.key === 'Enter' && handleChangeEmail()}
                  />
                  <button
                    type="button"
                    onClick={handleChangeEmail}
                    disabled={!newEmail.includes('@')}
                    className="rounded-xl bg-[#0e393d] px-3 py-2 text-xs font-medium text-white hover:bg-[#0e393d]/85 disabled:opacity-40 transition"
                  >
                    {t.changeEmailSave}
                  </button>
                </div>
              )}
            </div>
            {!isOAuthUser && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#1c2a2b]/50">{t.changePassword}</span>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-xs font-medium text-[#0e393d]/60 hover:text-[#0e393d] transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="inline mr-1 -mt-0.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  →
                </button>
              </div>
            )}
          </div>
        </Section>

        {/* ── Delete account ── */}
        <section className="rounded-2xl border border-[#0e393d]/8 bg-white p-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#1c2a2b]/35 mb-3">{t.deleteSection}</h2>
          <p className="text-sm text-[#1c2a2b]/50 mb-4">{t.deleteInfo}</p>
          <a href="mailto:support@evidalife.com" className="inline-flex items-center gap-1.5 rounded-xl border border-[#0e393d]/15 bg-white px-4 py-2 text-sm font-medium text-[#1c2a2b]/60 hover:bg-[#0e393d]/5 hover:text-[#1c2a2b] transition">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            {t.deleteContact}
          </a>
        </section>

      </form>

      {/* ── Sticky Save Bar ── */}
      <div className={`fixed bottom-0 inset-x-0 z-40 transition-all duration-300 ${isDirty || saveState !== 'idle' ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
        <div className="bg-white/90 backdrop-blur-md border-t border-[#0e393d]/10 shadow-lg">
          <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            <p className="text-xs text-[#1c2a2b]/50">
              {saveState === 'saved' ? t.saved : saveState === 'error' ? t.saveError : t.unsavedChanges}
            </p>
            <button
              type="submit"
              form=""
              onClick={(e) => { e.preventDefault(); handleSave(e as unknown as React.FormEvent); }}
              disabled={saveState === 'saving' || uploading}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold transition-all ${
                saveState === 'saved' ? 'bg-emerald-500 text-white'
                : saveState === 'error' ? 'bg-red-500 text-white'
                : 'bg-[#0e393d] text-white hover:bg-[#0e393d]/85 disabled:opacity-60'
              }`}
            >
              {saveState === 'saving' ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                  {t.saving}
                </>
              ) : saveState === 'saved' ? t.saved : saveState === 'error' ? t.saveError : t.save}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
