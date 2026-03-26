'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import type { MapLab } from './LabMap';

const LabMap = dynamic(() => import('./LabMap'), { ssr: false });

// ── Category config (kept local to avoid importing the admin shared module here)
const TEST_CATEGORIES = [
  { value: 'biomarker',           label: 'Blood Markers',       icon: '🩸' },
  { value: 'clinical_assessment', label: 'Clinical Assessment', icon: '🏥' },
  { value: 'bio_age',             label: 'Epigenetic Clock',    icon: '🧬' },
  { value: 'genetic',             label: 'Genetic',             icon: '🔬' },
  { value: 'microbiome',          label: 'Microbiome',          icon: '🦠' },
  { value: 'wearable',            label: 'Wearable',            icon: '⌚' },
] as const;

type CategoryValue = typeof TEST_CATEGORIES[number]['value'];

// ── Lab type (same as server, passed as prop)
export interface PublicLab {
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
  website: string | null;
  iso_accreditation: string | null;
  test_categories: string[] | null;
  cover_image_url: string | null;
  description: Record<string, string> | null;
}

interface Props {
  labs: PublicLab[];
  lang: string;
  t: {
    searchPlaceholder: string;
    countryAll: string;
    noResults: string;
    mapLink: string;
    websiteLink: string;
    clearFilters: string;
  };
}

function IsoBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#ceab84]/15 px-2.5 py-0.5 text-[10px] font-semibold text-[#8a6a3e]">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      {value}
    </span>
  );
}

export default function PartnerLabsClient({ labs, lang, t }: Props) {
  const [query, setQuery] = useState('');
  const [activeCategories, setActiveCategories] = useState<Set<CategoryValue>>(new Set());
  const [country, setCountry] = useState<string>('all');

  // Unique countries
  const countries = useMemo(() => {
    const set = new Set(labs.map((l) => l.country).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [labs]);

  const toggleCategory = (cat: CategoryValue) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return labs.filter((lab) => {
      if (q && !lab.name.toLowerCase().includes(q) && !lab.city?.toLowerCase().includes(q) && !lab.canton?.toLowerCase().includes(q)) return false;
      if (country !== 'all' && lab.country !== country) return false;
      if (activeCategories.size > 0) {
        const cats = lab.test_categories ?? [];
        if (!Array.from(activeCategories).some((c) => cats.includes(c))) return false;
      }
      return true;
    });
  }, [labs, query, country, activeCategories]);

  // Only map-able labs (has coords) from filtered set
  const mapLabs: MapLab[] = filtered
    .filter((l): l is PublicLab & { latitude: number; longitude: number } => l.latitude != null && l.longitude != null)
    .map((l) => ({ id: l.id, name: l.name, latitude: l.latitude, longitude: l.longitude, address: l.address, city: l.city, test_categories: l.test_categories }));

  const hasFilters = query.trim() || activeCategories.size > 0 || country !== 'all';

  return (
    <>
      {/* Map */}
      {mapLabs.length > 0 && (
        <section className="w-full border-b border-[#0e393d]/10">
          <div style={{ height: '500px' }} className="w-full bg-[#e8efe9]">
            <LabMap labs={mapLabs} />
          </div>
        </section>
      )}

      {/* Search / filter + Lab cards */}
      <section className="w-full max-w-5xl mx-auto px-6 py-8">
        {/* Filter bar */}
        <div className="flex flex-col gap-4 mb-8 pb-6 border-b border-[#0e393d]/10">
          {/* Text search + country */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0e393d]/35" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-[#0e393d]/15 bg-[#fafaf8] text-sm text-[#1c2a2b] placeholder-[#1c2a2b]/35 focus:outline-none focus:border-[#0e393d]/40"
              />
            </div>
            {countries.length > 1 && (
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="px-3 py-2 rounded-lg border border-[#0e393d]/15 bg-[#fafaf8] text-sm text-[#1c2a2b] focus:outline-none focus:border-[#0e393d]/40"
              >
                <option value="all">{t.countryAll}</option>
                {countries.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap gap-2 items-center">
            {TEST_CATEGORIES.map((cat) => {
              const active = activeCategories.has(cat.value);
              return (
                <button
                  key={cat.value}
                  onClick={() => toggleCategory(cat.value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    active
                      ? 'bg-[#0e393d] text-white border-[#0e393d]'
                      : 'bg-white text-[#1c2a2b]/70 border-[#0e393d]/20 hover:border-[#0e393d]/40'
                  }`}
                >
                  <span>{cat.icon}</span>
                  {cat.label}
                </button>
              );
            })}
            {hasFilters && (
              <button
                onClick={() => { setQuery(''); setActiveCategories(new Set()); setCountry('all'); }}
                className="text-xs text-[#1c2a2b]/45 hover:text-[#0e393d] underline underline-offset-2 transition ml-1"
              >
                {t.clearFilters}
              </button>
            )}
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-[#1c2a2b]/40">{t.noResults}</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((lab) => {
              const locationParts = [
                lab.address,
                [lab.postal_code, lab.city].filter(Boolean).join(' '),
                lab.canton ? `(${lab.canton})` : null,
                lab.country && lab.country !== 'CH' ? lab.country : null,
              ].filter(Boolean);

              const mapsUrl = lab.latitude != null && lab.longitude != null
                ? `https://www.google.com/maps?q=${lab.latitude},${lab.longitude}`
                : null;

              const desc = lab.description?.[lang] ?? lab.description?.['de'] ?? lab.description?.['en'] ?? null;

              return (
                <div
                  key={lab.id}
                  className="rounded-2xl border border-[#0e393d]/10 bg-white overflow-hidden flex flex-col hover:border-[#0e393d]/25 hover:shadow-md transition-all duration-200"
                >
                  {/* Cover image */}
                  <div className="w-full aspect-video bg-gradient-to-br from-[#0e393d]/8 to-[#ceab84]/15 flex items-center justify-center overflow-hidden relative">
                    {lab.cover_image_url && (
                      <img
                        src={lab.cover_image_url}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0e393d" strokeWidth="1.25" opacity="0.3">
                      <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    {/* Name + ISO */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="font-serif text-base text-[#0e393d] leading-snug">{lab.name}</h3>
                      {lab.iso_accreditation && <IsoBadge value={lab.iso_accreditation} />}
                    </div>

                    {/* Location */}
                    {locationParts.length > 0 && (
                      <div className="flex items-start gap-2 mb-3">
                        <svg className="shrink-0 mt-0.5 text-[#0e393d]/35" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                        <div>
                          {locationParts.map((line, i) => (
                            <p key={i} className="text-xs text-[#1c2a2b]/55 leading-snug">{line}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    {desc && (
                      <p className="text-xs text-[#1c2a2b]/60 leading-relaxed mb-3 line-clamp-2">{desc}</p>
                    )}

                    {/* Category pills */}
                    {(lab.test_categories ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {(lab.test_categories ?? []).map((cat) => {
                          const catDef = TEST_CATEGORIES.find((c) => c.value === cat);
                          return (
                            <span key={cat} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0e393d]/06 text-[10px] font-medium text-[#0e393d]">
                              {catDef?.icon} {catDef?.label ?? cat}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Links */}
                    <div className="mt-auto flex flex-wrap gap-2">
                      {mapsUrl && (
                        <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#0e393d]/15 bg-[#fafaf8] px-2.5 py-1.5 text-[11px] font-medium text-[#0e393d] hover:border-[#0e393d]/30 transition">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                          </svg>
                          {t.mapLink}
                        </a>
                      )}
                      {lab.website && (
                        <a href={lab.website} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#0e393d]/15 bg-[#fafaf8] px-2.5 py-1.5 text-[11px] font-medium text-[#0e393d] hover:border-[#0e393d]/30 transition">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                            <polyline points="15 3 21 3 21 9"/>
                            <line x1="10" y1="14" x2="21" y2="3"/>
                          </svg>
                          {t.websiteLink}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
