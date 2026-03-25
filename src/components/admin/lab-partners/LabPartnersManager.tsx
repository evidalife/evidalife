'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { setOptions as setGMapsOptions, importLibrary as importGMapsLibrary } from '@googlemaps/js-api-loader';
import { createClient } from '@/lib/supabase/client';
import { TEST_CATEGORIES } from '@/components/admin/lab-results/shared';

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'de' | 'en' | 'fr' | 'es' | 'it';
const LANGS: Lang[] = ['de', 'en', 'fr', 'es', 'it'];

export type LabPartner = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  canton: string | null;
  postal_code: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  iso_accreditation: string | null;
  is_active: boolean | null;
  description: Record<string, string> | null;
  test_categories: string[] | null;
  created_at: string;
};

type FormState = {
  name: string;
  address: string;
  city: string;
  canton: string;
  postal_code: string;
  country: string;
  latitude: string;
  longitude: string;
  phone: string;
  email: string;
  website: string;
  iso_accreditation: string;
  is_active: boolean;
  description: Record<Lang, string>;
  test_categories: string[];
};

const EMPTY_DESC: Record<Lang, string> = { de: '', en: '', fr: '', es: '', it: '' };

const EMPTY_FORM: FormState = {
  name: '',
  address: '',
  city: '',
  canton: '',
  postal_code: '',
  country: 'CH',
  latitude: '',
  longitude: '',
  phone: '',
  email: '',
  website: '',
  iso_accreditation: '',
  is_active: true,
  description: { ...EMPTY_DESC },
  test_categories: [],
};

// ─── Phone ────────────────────────────────────────────────────────────────────

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

function detectDialCountry(raw: string): DialCountry | undefined {
  const stripped = raw.replace(/\s|-/g, '');
  if (stripped.startsWith('+')) return DIAL_COUNTRIES.find((c) => stripped.startsWith(c.dialCode));
  if (/^0(75|76|77|78|79)/.test(stripped)) return DIAL_COUNTRIES.find((c) => c.code === 'CH');
  return undefined;
}

function toE164(local: string, dialCode: string): string {
  const s = local.replace(/[\s\-().]/g, '');
  if (s.startsWith('+')) return s;
  if (s.startsWith('00')) return '+' + s.slice(2);
  if (/^0\d/.test(s)) return dialCode + s.slice(1);
  return dialCode + s;
}

// ─── Shared primitives ────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition';

const readonlyCls =
  'w-full rounded-lg border border-[#0e393d]/8 bg-[#fafaf8] px-3 py-2 text-sm text-[#1c2a2b]/60 cursor-default select-none';

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#0e393d]/70 mb-1">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-[#1c2a2b]/40">{hint}</p>}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-[#0e393d]' : 'bg-gray-200'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
    </button>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ceab84]">{children}</p>;
}

function Badge({ color, children }: { color: 'green' | 'gray' | 'gold'; children: React.ReactNode }) {
  const cls = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    gray:  'bg-gray-50 text-gray-600 ring-gray-500/20',
    gold:  'bg-[#ceab84]/15 text-[#8a6a3e] ring-[#ceab84]/30',
  }[color];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${cls}`}>
      {children}
    </span>
  );
}

// ─── PhoneField ───────────────────────────────────────────────────────────────

function PhoneField({ value, onChange }: { value: string; onChange: (e164: string) => void }) {
  const findCountry = (v: string): DialCountry => detectDialCountry(v) ?? DIAL_COUNTRIES[0];
  const extractLocal = (v: string, dc: string): string => {
    if (!v) return '';
    const s = v.replace(/[\s\-().]/g, '');
    if (s.startsWith(dc)) return s.slice(dc.length);
    if (s.startsWith('+')) return s;
    if (s.startsWith('00')) return '+' + s.slice(2);
    return s;
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
    <div className="flex gap-2">
      <select
        value={selectedCountry.code}
        onChange={(e) => handleCountryChange(e.target.value)}
        className="rounded-lg border border-[#0e393d]/15 bg-white px-2 py-2 text-sm text-[#1c2a2b] focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition cursor-pointer w-28 shrink-0"
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
  );
}

// ─── AddressAutocomplete ──────────────────────────────────────────────────────

type PlaceData = {
  street: string; city: string; canton: string;
  postalCode: string; country: string;
  lat: number | null; lng: number | null;
};

function AddressAutocomplete({
  value, onChange, onPlaceSelect,
}: {
  value: string;
  onChange: (v: string) => void;
  onPlaceSelect: (data: PlaceData) => void;
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
        fields: ['address_components', 'geometry'],
      });

      listenerRef.current = autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace() as google.maps.places.PlaceResult;
        if (!place?.address_components) return;

        let streetNumber = '', route = '', city = '', canton = '', postalCode = '', country = '';
        for (const comp of place.address_components) {
          const t = comp.types;
          if (t.includes('street_number')) streetNumber = comp.long_name;
          if (t.includes('route')) route = comp.long_name;
          if (t.includes('locality') || t.includes('postal_town')) city = comp.long_name;
          if (t.includes('administrative_area_level_1')) canton = comp.short_name;
          if (t.includes('postal_code')) postalCode = comp.long_name;
          if (t.includes('country')) country = comp.short_name;
        }

        const street = [route, streetNumber].filter(Boolean).join(' ');
        const lat = place.geometry?.location?.lat() ?? null;
        const lng = place.geometry?.location?.lng() ?? null;

        onChange(street);
        onPlaceSelect({ street, city, canton, postalCode, country, lat, lng });
      });
    }).catch(() => {});

    return () => { listenerRef.current?.remove(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="text-[#0e393d]/30">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Bahnhofstrasse 12"
        autoComplete="off"
        className={`${inputCls} pl-9`}
      />
    </div>
  );
}

// ─── Description placeholders ─────────────────────────────────────────────────

const DESC_PLACEHOLDER: Record<Lang, string> = {
  de: 'Beschreibung des Laborpartners…',
  en: 'Description of lab partner…',
  fr: 'Description du partenaire de laboratoire…',
  es: 'Descripción del laboratorio asociado…',
  it: 'Descrizione del laboratorio partner…',
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function LabPartnersManager({ initialLabPartners }: { initialLabPartners: LabPartner[] }) {
  const supabase = createClient();
  const [partners, setPartners] = useState<LabPartner[]>(initialLabPartners);
  const [search, setSearch] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Description tab
  const [descLang, setDescLang] = useState<Lang>('de');

  // AI states
  const [translating, setTranslating] = useState(false);
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  // ── Data refresh ────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('lab_partners')
      .select('*')
      .order('name', { ascending: true });
    if (data) setPartners(data);
  }, [supabase]);

  // ── Panel helpers ────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDescLang('de');
    setError(null);
    setPanelOpen(true);
  };

  const openEdit = (p: LabPartner) => {
    setEditingId(p.id);
    const savedDesc = (p.description as Record<string, string> | null) ?? {};
    setForm({
      name: p.name ?? '',
      address: p.address ?? '',
      city: p.city ?? '',
      canton: p.canton ?? '',
      postal_code: p.postal_code ?? '',
      country: p.country ?? 'CH',
      latitude: p.latitude != null ? String(p.latitude) : '',
      longitude: p.longitude != null ? String(p.longitude) : '',
      phone: p.phone ?? '',
      email: p.email ?? '',
      website: p.website ?? '',
      iso_accreditation: p.iso_accreditation ?? '',
      is_active: p.is_active ?? true,
      description: {
        de: savedDesc.de ?? '',
        en: savedDesc.en ?? '',
        fr: savedDesc.fr ?? '',
        es: savedDesc.es ?? '',
        it: savedDesc.it ?? '',
      },
      test_categories: p.test_categories ?? [],
    });
    setDescLang('de');
    setError(null);
    setPanelOpen(true);
  };

  const closePanel = () => { setPanelOpen(false); setError(null); };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // ── Address select ───────────────────────────────────────────────────────────

  const handlePlaceSelect = (data: PlaceData) => {
    setForm((prev) => ({
      ...prev,
      address:     data.street || prev.address,
      city:        data.city || prev.city,
      canton:      data.canton || prev.canton,
      postal_code: data.postalCode || prev.postal_code,
      country:     data.country || prev.country,
      latitude:    data.lat != null ? String(data.lat) : prev.latitude,
      longitude:   data.lng != null ? String(data.lng) : prev.longitude,
    }));
  };

  // ── Test category toggle ─────────────────────────────────────────────────────

  const toggleCategory = (value: string) => {
    setForm((prev) => {
      const cats = prev.test_categories;
      return {
        ...prev,
        test_categories: cats.includes(value)
          ? cats.filter((c) => c !== value)
          : [...cats, value],
      };
    });
  };

  // ── AI Translate ─────────────────────────────────────────────────────────────

  const handleTranslate = async () => {
    const text = form.description[descLang];
    if (!text.trim()) return;
    setTranslating(true);
    try {
      const res = await fetch('/api/admin/translate-lab-partner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sourceLang: descLang }),
      });
      if (!res.ok) throw new Error('Translate failed');
      const result = await res.json();
      setForm((prev) => {
        const newDesc = { ...prev.description };
        for (const lang of LANGS) {
          if (!newDesc[lang] && result[lang]) newDesc[lang] = result[lang];
        }
        return { ...prev, description: newDesc };
      });
    } catch { /* silently ignore */ }
    finally { setTranslating(false); }
  };

  // ── AI Edit (proofread / rewrite) ────────────────────────────────────────────

  const handleAiEdit = async (action: 'proofread' | 'rewrite') => {
    const text = form.description[descLang];
    if (!text.trim()) return;
    setAiStatus('loading');
    try {
      const res = await fetch('/api/admin/rewrite-lab-partner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang: descLang, action }),
      });
      if (!res.ok) throw new Error('AI edit failed');
      const result = await res.json();
      setForm((prev) => ({
        ...prev,
        description: { ...prev.description, [descLang]: result.text ?? text },
      }));
      setAiStatus('done');
    } catch {
      setAiStatus('error');
    }
    setTimeout(() => setAiStatus('idle'), 2000);
  };

  // ── Save ──────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError(null);

    const descPayload = Object.fromEntries(
      Object.entries(form.description).filter(([, v]) => v.trim())
    );

    const payload = {
      name:              form.name.trim(),
      address:           form.address.trim() || null,
      city:              form.city.trim() || null,
      canton:            form.canton.trim() || null,
      postal_code:       form.postal_code.trim() || null,
      country:           form.country.trim() || null,
      latitude:          form.latitude ? Number(form.latitude) : null,
      longitude:         form.longitude ? Number(form.longitude) : null,
      phone:             form.phone.trim() || null,
      email:             form.email.trim() || null,
      website:           form.website.trim() || null,
      iso_accreditation: form.iso_accreditation.trim() || null,
      is_active:         form.is_active,
      description:       Object.keys(descPayload).length > 0 ? descPayload : null,
      test_categories:   form.test_categories.length > 0 ? form.test_categories : [],
    };

    try {
      if (editingId) {
        const { error: err } = await supabase.from('lab_partners').update(payload).eq('id', editingId);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('lab_partners').insert(payload);
        if (err) throw err;
      }
      await refresh();
      closePanel();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  // ── Deactivate ────────────────────────────────────────────────────────────────

  const handleDeactivate = async (p: LabPartner) => {
    await supabase.from('lab_partners').update({ is_active: false }).eq('id', p.id);
    await refresh();
  };

  // ── Filtered list ─────────────────────────────────────────────────────────────

  const filtered = partners.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name?.toLowerCase().includes(q) || p.city?.toLowerCase().includes(q);
  });

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-[#0e393d]">Lab Partners</h1>
          <p className="mt-0.5 text-sm text-[#1c2a2b]/50">
            {partners.length} total · {partners.filter((p) => p.is_active).length} active
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0e393d] text-white text-sm font-medium hover:bg-[#0e393d]/90 transition"
        >
          <span className="text-lg leading-none">+</span> New Partner
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name or city…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/3">
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">City / Canton</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Categories</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">ISO</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0e393d]/6">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-[#1c2a2b]/40">
                  No lab partners found.
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-[#fafaf8] transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-[#0e393d]">{p.name}</div>
                  {p.address && <div className="text-xs text-[#1c2a2b]/40 mt-0.5">{p.address}</div>}
                </td>
                <td className="px-4 py-3 text-[#1c2a2b]/70">
                  {[p.city, p.canton].filter(Boolean).join(', ') || '—'}
                </td>
                <td className="px-4 py-3">
                  {p.test_categories && p.test_categories.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {p.test_categories.map((cat) => {
                        const tc = TEST_CATEGORIES.find((t) => t.value === cat);
                        return tc ? (
                          <span key={cat} title={tc.label} className="text-base leading-none">{tc.icon}</span>
                        ) : null;
                      })}
                    </div>
                  ) : (
                    <span className="text-[#1c2a2b]/25 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {p.iso_accreditation ? (
                    <Badge color="gold">{p.iso_accreditation}</Badge>
                  ) : (
                    <span className="text-[#1c2a2b]/25 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {p.is_active ? <Badge color="green">Active</Badge> : <Badge color="gray">Inactive</Badge>}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEdit(p)}
                      className="px-3 py-1 rounded-md text-xs font-medium text-[#0e393d] bg-[#0e393d]/8 hover:bg-[#0e393d]/15 transition"
                    >
                      Edit
                    </button>
                    {p.is_active && (
                      <button
                        onClick={() => handleDeactivate(p)}
                        className="px-3 py-1 rounded-md text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 transition"
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Slide-over panel ──────────────────────────────────────────────────── */}
      {panelOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]" onClick={closePanel} />

          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-2xl">

            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-[#0e393d]/10 px-6 py-4">
              <h2 className="font-serif text-lg text-[#0e393d]">
                {editingId ? 'Edit Lab Partner' : 'New Lab Partner'}
              </h2>
              <button onClick={closePanel} className="text-[#1c2a2b]/40 hover:text-[#1c2a2b] transition">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* ── PARTNER ── */}
              <div className="space-y-3">
                <SectionHead>Partner</SectionHead>
                <Field label="Name *">
                  <input
                    className={inputCls}
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    placeholder="Zurich Clinical Lab AG"
                  />
                </Field>
              </div>

              {/* ── LOCATION ── */}
              <div className="space-y-3 border-t border-[#0e393d]/8 pt-5">
                <SectionHead>Location</SectionHead>

                <Field label="Address">
                  <AddressAutocomplete
                    value={form.address}
                    onChange={(v) => setField('address', v)}
                    onPlaceSelect={handlePlaceSelect}
                  />
                </Field>

                <div className="grid grid-cols-3 gap-3">
                  <Field label="City">
                    <input className={inputCls} value={form.city} onChange={(e) => setField('city', e.target.value)} placeholder="Zürich" />
                  </Field>
                  <Field label="Canton / State">
                    <input className={inputCls} value={form.canton} onChange={(e) => setField('canton', e.target.value)} placeholder="ZH" />
                  </Field>
                  <Field label="Postal Code">
                    <input className={inputCls} value={form.postal_code} onChange={(e) => setField('postal_code', e.target.value)} placeholder="8001" />
                  </Field>
                </div>

                <Field label="Country">
                  <input className={inputCls} value={form.country} onChange={(e) => setField('country', e.target.value)} placeholder="CH" />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Latitude" hint="Auto-filled from address">
                    <div className={readonlyCls}>{form.latitude || '—'}</div>
                  </Field>
                  <Field label="Longitude" hint="Auto-filled from address">
                    <div className={readonlyCls}>{form.longitude || '—'}</div>
                  </Field>
                </div>
              </div>

              {/* ── CONTACT ── */}
              <div className="space-y-3 border-t border-[#0e393d]/8 pt-5">
                <SectionHead>Contact</SectionHead>

                <Field label="Phone">
                  <PhoneField
                    value={form.phone}
                    onChange={(v) => setField('phone', v)}
                  />
                </Field>

                <Field label="Email">
                  <input type="email" className={inputCls} value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="lab@example.ch" />
                </Field>

                <Field label="Website">
                  <input type="url" className={inputCls} value={form.website} onChange={(e) => setField('website', e.target.value)} placeholder="https://example.ch" />
                </Field>
              </div>

              {/* ── DESCRIPTION ── */}
              <div className="space-y-3 border-t border-[#0e393d]/8 pt-5">
                <SectionHead>Description</SectionHead>

                {/* Lang tabs */}
                <div className="flex gap-1">
                  {LANGS.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setDescLang(lang)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide transition ${
                        descLang === lang
                          ? 'bg-[#0e393d] text-white'
                          : 'text-[#1c2a2b]/50 hover:bg-[#0e393d]/8'
                      }`}
                    >
                      {lang}
                      {form.description[lang] && (
                        <span className={`ml-1 inline-block w-1 h-1 rounded-full align-middle ${descLang === lang ? 'bg-[#ceab84]' : 'bg-[#ceab84]/60'}`} />
                      )}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={5}
                  value={form.description[descLang]}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: { ...prev.description, [descLang]: e.target.value } }))}
                  placeholder={DESC_PLACEHOLDER[descLang]}
                  className={inputCls}
                />

                {/* AI buttons */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleTranslate}
                    disabled={translating || !form.description[descLang].trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0e393d]/6 text-[#0e393d] hover:bg-[#0e393d]/12 disabled:opacity-40 transition"
                  >
                    {translating ? '…' : '🌐 Translate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAiEdit('proofread')}
                    disabled={aiStatus === 'loading' || !form.description[descLang].trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0e393d]/6 text-[#0e393d] hover:bg-[#0e393d]/12 disabled:opacity-40 transition"
                  >
                    {aiStatus === 'loading' ? '…' : '✏️ Proofread'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAiEdit('rewrite')}
                    disabled={aiStatus === 'loading' || !form.description[descLang].trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#ceab84]/15 text-[#8a6a3e] hover:bg-[#ceab84]/25 disabled:opacity-40 transition"
                  >
                    {aiStatus === 'loading' ? '…' : aiStatus === 'done' ? '✓ Done' : aiStatus === 'error' ? '✗ Error' : '🔄 Rewrite'}
                  </button>
                </div>
              </div>

              {/* ── TEST CATEGORIES ── */}
              <div className="space-y-3 border-t border-[#0e393d]/8 pt-5">
                <SectionHead>Test Categories</SectionHead>
                <div className="space-y-1">
                  {TEST_CATEGORIES.map((cat) => (
                    <label
                      key={cat.value}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-[#fafaf8] cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={form.test_categories.includes(cat.value)}
                        onChange={() => toggleCategory(cat.value)}
                        className="rounded border-[#0e393d]/20 text-[#0e393d] focus:ring-[#0e393d]/20"
                      />
                      <span className="text-base leading-none">{cat.icon}</span>
                      <span className="text-sm font-medium text-[#0e393d]">{cat.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* ── CERTIFICATION ── */}
              <div className="space-y-3 border-t border-[#0e393d]/8 pt-5">
                <SectionHead>Certification</SectionHead>
                <Field label="ISO Accreditation" hint='e.g. "ISO 15189"'>
                  <input
                    className={inputCls}
                    value={form.iso_accreditation}
                    onChange={(e) => setField('iso_accreditation', e.target.value)}
                    placeholder="ISO 15189"
                  />
                </Field>
              </div>

              {/* ── SETTINGS ── */}
              <div className="space-y-3 border-t border-[#0e393d]/8 pt-5">
                <SectionHead>Settings</SectionHead>
                <div className="flex items-center justify-between rounded-lg border border-[#0e393d]/10 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#1c2a2b]">Active</p>
                    <p className="text-xs text-[#1c2a2b]/40">Visible and bookable for users</p>
                  </div>
                  <Toggle checked={form.is_active} onChange={(v) => setField('is_active', v)} />
                </div>
              </div>

            </div>

            {/* Panel footer */}
            <div className="border-t border-[#0e393d]/10 px-6 py-4">
              {error && (
                <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={closePanel}
                  className="flex-1 rounded-lg border border-[#0e393d]/15 py-2.5 text-sm font-medium text-[#1c2a2b] hover:bg-[#fafaf8] transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-[#0e393d] py-2.5 text-sm font-medium text-white hover:bg-[#0e393d]/90 disabled:opacity-50 transition"
                >
                  {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Partner'}
                </button>
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  );
}
