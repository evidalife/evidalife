'use client';

import { useState } from 'react';
import { parsePhoneNumber, AsYouType, type CountryCode } from 'libphonenumber-js';

// ─── Country data ──────────────────────────────────────────────────────────────

export type DialCountry = { code: string; flag: string; dialCode: string; name: string };

export const DIAL_COUNTRIES: DialCountry[] = [
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

// ─── Helpers ───────────────────────────────────────────────────────────────────

function safeParsePhone(input: string) {
  try { return parsePhoneNumber(input); }
  catch { return null; }
}

function initFromE164(e164: string): { code: string; national: string } {
  if (!e164) return { code: 'CH', national: '' };
  const parsed = safeParsePhone(e164);
  if (parsed?.country) return { code: parsed.country, national: parsed.formatNational() };
  // Fallback: match by dialCode prefix
  for (const dc of DIAL_COUNTRIES) {
    if (e164.startsWith(dc.dialCode)) {
      return { code: dc.code, national: e164.slice(dc.dialCode.length).replace(/^\s+/, '') };
    }
  }
  return { code: 'CH', national: e164 };
}

// ─── Component ─────────────────────────────────────────────────────────────────

type Props = {
  value: string;
  onChange: (e164: string) => void;
  label?: string;
  hint?: string;
  /** 'default' = admin compact (rounded-lg, py-2), 'profile' = larger (rounded-xl, py-3) */
  variant?: 'default' | 'profile';
};

export default function PhoneField({ value, onChange, label, hint, variant = 'default' }: Props) {
  const init = initFromE164(value);
  const [countryCode, setCountryCode] = useState(init.code);
  const [localNumber, setLocalNumber] = useState(init.national);

  const selectedCountry = DIAL_COUNTRIES.find(c => c.code === countryCode) ?? DIAL_COUNTRIES[0];

  const handleInput = (raw: string) => {
    const stripped = raw.replace(/\s/g, '');

    // International paste: detect country and reformat
    if (stripped.startsWith('+') || stripped.startsWith('00')) {
      const intl = stripped.startsWith('00') ? '+' + stripped.slice(2) : stripped;
      const parsed = safeParsePhone(intl);
      if (parsed?.country) {
        setCountryCode(parsed.country);
        setLocalNumber(parsed.formatNational());
        onChange(parsed.format('E.164'));
        return;
      }
    }

    // Strip redundant country code prefix (e.g. user typed "+41" before national digits)
    let national = raw;
    if (stripped.startsWith(selectedCountry.dialCode)) {
      national = stripped.slice(selectedCountry.dialCode.length);
    }

    // Format as you type with AsYouType
    const formatter = new AsYouType(countryCode as CountryCode);
    const displayed = formatter.input(national);
    setLocalNumber(displayed);

    const num = formatter.getNumber();
    if (num) onChange(num.format('E.164'));
    else if (!national.trim()) onChange('');
  };

  const handleCountryChange = (newCode: string) => {
    setCountryCode(newCode);
    const digits = localNumber.replace(/\D/g, '');
    if (digits) {
      const formatter = new AsYouType(newCode as CountryCode);
      const displayed = formatter.input(digits);
      setLocalNumber(displayed);
      const num = formatter.getNumber();
      if (num) onChange(num.format('E.164'));
    } else {
      onChange('');
    }
  };

  const isCompact = variant === 'default';
  const selectorCls = `flex items-center gap-1.5 border border-[#0e393d]/15 bg-white text-sm pointer-events-none select-none ${isCompact ? 'rounded-lg px-2.5 py-2' : 'rounded-xl px-2.5 py-3'}`;
  const inputCls = `w-full border border-[#0e393d]/15 bg-white text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition ${isCompact ? 'rounded-lg px-3 py-2' : 'rounded-xl px-4 py-3'}`;

  const placeholder = countryCode === 'CH' ? '44 404 20 80'
    : countryCode === 'DE' ? '30 1234 5678'
    : countryCode === 'AT' ? '1 234 5678'
    : '…';

  return (
    <div>
      {label && <label className="block text-xs font-medium text-[#0e393d]/70 mb-1">{label}</label>}
      <div className="flex gap-2">
        {/* Country selector */}
        <div className="relative shrink-0">
          <div className={selectorCls}>
            <span>{selectedCountry.flag}</span>
            <span className="text-[#1c2a2b]">{selectedCountry.dialCode}</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#1c2a2b]/35 ml-0.5">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
          <select
            value={countryCode}
            onChange={(e) => handleCountryChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            title={selectedCountry.name}
          >
            {DIAL_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.flag} {c.dialCode} {c.name}</option>
            ))}
          </select>
        </div>
        {/* National number input */}
        <input
          type="tel"
          value={localNumber}
          onChange={(e) => handleInput(e.target.value)}
          placeholder={placeholder}
          className={inputCls}
        />
      </div>
      {value && (
        <p className="mt-1 text-[10px] text-[#1c2a2b]/35 font-mono">{value}</p>
      )}
      {hint && <p className="mt-1 text-[11px] text-[#1c2a2b]/40">{hint}</p>}
    </div>
  );
}
