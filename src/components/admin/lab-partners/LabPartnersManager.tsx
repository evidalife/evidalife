'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { setOptions as setGMapsOptions, importLibrary as importGMapsLibrary } from '@googlemaps/js-api-loader';
import { createClient } from '@/lib/supabase/client';
import { TEST_CATEGORIES } from '@/components/admin/lab-results/shared';
import PhoneField from '@/components/shared/PhoneField';

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'de' | 'en' | 'fr' | 'es' | 'it';
const LANGS: Lang[] = ['de', 'en', 'fr', 'es', 'it'];

export type LabPartner = {
  id: string;
  name: string;
  lab_type: string | null;
  lab_code: string | null;
  parent_lab_id: string | null;
  integration_tier: string | null;
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
  lab_type: 'evida_life' | 'partner';
  lab_code: string;
  parent_lab_id: string;
  integration_tier: string;
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
  lab_type: 'partner',
  lab_code: '',
  parent_lab_id: '',
  integration_tier: 'manual',
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
  const [expandedLabId, setExpandedLabId] = useState<string | null>(null);
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
      lab_type: (p.lab_type === 'evida_life' ? 'evida_life' : 'partner'),
      lab_code: p.lab_code ?? '',
      parent_lab_id: p.parent_lab_id ?? '',
      integration_tier: p.integration_tier ?? 'manual',
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

  const handleAddLocation = (parentId: string) => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, parent_lab_id: parentId });
    setDescLang('de');
    setError(null);
    setPanelOpen(true);
  };

  const closePanel = () => { setPanelOpen(false); setError(null); };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const suggestLabCode = useCallback((canton: string, parentLabId?: string): string => {
    if (!canton || canton.length < 2) return '';
    const cantonPrefix = canton.slice(0, 2).toUpperCase();
    if (parentLabId) {
      const parent = partners.find(p => p.id === parentLabId);
      const parentCode = parent?.lab_code ?? '';
      const base = parentCode + cantonPrefix;
      let seq = 1;
      while (partners.some(p => p.lab_code === `${base}${String(seq).padStart(2, '0')}`)) seq++;
      return `${base}${String(seq).padStart(2, '0')}`;
    }
    // Standalone / org: ZH01 pattern
    let seq = 1;
    while (partners.some(p => p.lab_code === `${cantonPrefix}${String(seq).padStart(2, '0')}`)) seq++;
    return `${cantonPrefix}${String(seq).padStart(2, '0')}`;
  }, [partners]);

  // ── Address select ───────────────────────────────────────────────────────────

  const handlePlaceSelect = (data: PlaceData) => {
    const incomingCanton = data.canton || '';
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
    if (incomingCanton && !form.lab_code) {
      const code = suggestLabCode(incomingCanton, form.parent_lab_id || undefined);
      if (code) setField('lab_code', code);
    }
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
    const desc = form.description as Record<string, string>;
    const sourceLang = LANGS.find((l) => desc[l]?.trim());
    if (!sourceLang) { setError('Write a description in at least one language first.'); return; }
    const sourceText = desc[sourceLang];
    const targetLangs = LANGS.filter((l) => l !== sourceLang && !desc[l]?.trim());
    if (targetLangs.length === 0) { setError('All languages already have descriptions.'); return; }
    setTranslating(true);
    try {
      const res = await fetch('/api/admin/translate-lab-partner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceText, sourceLang, targetLangs }),
      });
      if (!res.ok) throw new Error('Translate failed');
      const result = await res.json();
      setForm((prev) => {
        const newDesc = { ...prev.description };
        for (const lang of targetLangs) {
          if (result[lang]) newDesc[lang] = result[lang];
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
    if (!form.address.trim()) { setError('Address is required. Use the address search to find the lab location.'); return; }
    if (!form.city.trim()) { setError('City is required.'); return; }
    if (!form.country.trim()) { setError('Country is required.'); return; }
    const rawCode = form.lab_code.trim().toUpperCase();
    if (rawCode && !/^[A-Z0-9]{1,10}$/.test(rawCode)) {
      setError('Lab Code must be 1–10 uppercase alphanumeric characters (e.g. ZH01, LG1ZH01).');
      return;
    }
    if (rawCode && partners.some(p => p.lab_code === rawCode && p.id !== editingId)) {
      setError('This Lab Code is already in use. Each lab must have a unique code.');
      return;
    }
    setSaving(true);
    setError(null);

    const descPayload = Object.fromEntries(
      Object.entries(form.description).filter(([, v]) => v.trim())
    );

    const payload = {
      name:              form.name.trim(),
      lab_type:          form.lab_type,
      lab_code:          rawCode || null,
      parent_lab_id:     form.parent_lab_id || null,
      integration_tier:  form.parent_lab_id ? null : form.integration_tier,
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

  const [sortCol, setSortCol] = useState<'name' | 'city' | 'is_active'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
  };

  const filtered = partners.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name?.toLowerCase().includes(q) || p.city?.toLowerCase().includes(q);
  });

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortCol === 'name') cmp = (a.name ?? '').localeCompare(b.name ?? '');
    else if (sortCol === 'city') cmp = (a.city ?? '').localeCompare(b.city ?? '');
    else cmp = (a.is_active ? 0 : 1) - (b.is_active ? 0 : 1);
    return sortDir === 'asc' ? cmp : -cmp;
  }), [filtered, sortCol, sortDir]);

  // ── Grouped display (orgs first, children indented) ──────────────────────────

  const childrenByParent = useMemo(() => {
    const map = new Map<string, LabPartner[]>();
    for (const p of partners) {
      if (p.parent_lab_id) {
        if (!map.has(p.parent_lab_id)) map.set(p.parent_lab_id, []);
        map.get(p.parent_lab_id)!.push(p);
      }
    }
    return map;
  }, [partners]);

  const orgIds = useMemo(() => new Set(childrenByParent.keys()), [childrenByParent]);

  // Build display rows: each org followed immediately by its children
  const displayRows = useMemo(() => {
    const rows: Array<{ lab: LabPartner; isChild: boolean }> = [];
    for (const p of sorted) {
      if (p.parent_lab_id) continue; // children inserted inline below their parent
      rows.push({ lab: p, isChild: false });
      const children = childrenByParent.get(p.id) ?? [];
      for (const child of children) {
        rows.push({ lab: child, isChild: true });
      }
    }
    return rows;
  }, [sorted, childrenByParent]);

  const TIER_ICON: Record<string, string> = {
    manual:           '📋',
    voucher_callback: '🔔',
    full_api:         '⚡',
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-[#0e393d]">Labs</h1>
          <p className="mt-0.5 text-sm text-[#1c2a2b]/50">
            {partners.length} total · {partners.filter((p) => p.is_active).length} active
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0e393d] text-white text-sm font-medium hover:bg-[#0e393d]/90 transition"
        >
          <span className="text-lg leading-none">+</span> New Lab
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
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider cursor-pointer select-none hover:text-[#0e393d]" onClick={() => handleSort('name')}>
                Name{' '}{sortCol === 'name' && sortDir === 'asc' ? '▲' : sortCol === 'name' && sortDir === 'desc' ? '▼' : <span className="opacity-0">▲</span>}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Type / Code</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Structure</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider cursor-pointer select-none hover:text-[#0e393d]" onClick={() => handleSort('city')}>
                City / Canton{' '}{sortCol === 'city' && sortDir === 'asc' ? '▲' : sortCol === 'city' && sortDir === 'desc' ? '▼' : <span className="opacity-0">▲</span>}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Categories</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider cursor-pointer select-none hover:text-[#0e393d]" onClick={() => handleSort('is_active')}>
                Status{' '}{sortCol === 'is_active' && sortDir === 'asc' ? '▲' : sortCol === 'is_active' && sortDir === 'desc' ? '▼' : <span className="opacity-0">▲</span>}
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0e393d]/6">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-[#1c2a2b]/40">
                  No labs found.
                </td>
              </tr>
            )}
            {displayRows.map(({ lab: p, isChild }) => {
              const isExpanded = expandedLabId === p.id;
              const descText = (p.description as Record<string, string> | null);
              const expandedDesc = descText?.en || descText?.de || descText?.fr || descText?.es || descText?.it || null;
              const mapsUrl = p.latitude && p.longitude
                ? `https://www.google.com/maps?q=${p.latitude},${p.longitude}`
                : null;
              return (
                <React.Fragment key={p.id}>
                  <tr
                    className={`hover:bg-[#fafaf8] transition-colors cursor-pointer select-none${isChild ? ' bg-[#fafaf8]/60' : ''}${isExpanded ? ' bg-[#fafaf8]' : ''}`}
                    onClick={() => setExpandedLabId(isExpanded ? null : p.id)}
                  >
                    <td className="px-4 py-3">
                      <div className={`font-medium${isChild ? ' pl-5 text-[#0e393d]/70' : ' text-[#0e393d]'}`}>{isChild ? '↳ ' : ''}{p.name}</div>
                      {p.address && <div className={`text-xs text-[#1c2a2b]/40 mt-0.5${isChild ? ' pl-5' : ''}`}>{p.address}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {p.lab_type === 'evida_life'
                          ? <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-[#0C9C6C]/10 text-[#0C9C6C] ring-1 ring-[#0C9C6C]/20">🌿 Evida</span>
                          : <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-[#0e393d]/8 text-[#0e393d] ring-1 ring-[#0e393d]/15">🤝 Partner</span>
                        }
                        {p.lab_code && (
                          <span className="font-mono text-xs text-[#1c2a2b]/60 bg-[#0e393d]/5 px-1.5 py-0.5 rounded">{p.lab_code}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {orgIds.has(p.id) && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-sky-50 text-sky-700 ring-1 ring-sky-600/20">Org</span>
                        )}
                        {p.parent_lab_id && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-[#ceab84]/15 text-[#8a6a3e] ring-1 ring-[#ceab84]/30">Location</span>
                        )}
                        {!orgIds.has(p.id) && !p.parent_lab_id && (
                          <span className="text-[11px] text-[#1c2a2b]/30">Standalone</span>
                        )}
                        {!p.parent_lab_id && p.integration_tier && p.integration_tier !== 'manual' && (
                          <span className="text-xs" title={p.integration_tier}>{TIER_ICON[p.integration_tier] ?? ''}</span>
                        )}
                        {!p.parent_lab_id && p.integration_tier === 'manual' && (
                          <span className="text-xs opacity-40" title="manual">📋</span>
                        )}
                      </div>
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
                      {p.is_active ? <Badge color="green">Active</Badge> : <Badge color="gray">Inactive</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isChild && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAddLocation(p.id); }}
                            className="px-3 py-1 rounded-md text-xs font-medium text-[#CEAB84] bg-[#CEAB84]/10 hover:bg-[#CEAB84]/20 transition"
                          >
                            ＋ Location
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                          className="px-3 py-1 rounded-md text-xs font-medium text-[#0e393d] bg-[#0e393d]/8 hover:bg-[#0e393d]/15 transition"
                        >
                          Edit
                        </button>
                        {p.is_active && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeactivate(p); }}
                            className="px-3 py-1 rounded-md text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 transition"
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className={isChild ? 'bg-[#fafaf8]/80' : 'bg-[#fafaf8]'}>
                      <td colSpan={7} className="px-6 pb-4 pt-1">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm border-t border-[#0e393d]/6 pt-3">
                          {p.address && (
                            <div>
                              <span className="text-xs text-[#1c2a2b]/40 uppercase tracking-wide">Address</span>
                              <p className="text-[#1c2a2b]/80 mt-0.5">{[p.address, p.postal_code, p.city, p.canton, p.country].filter(Boolean).join(', ')}</p>
                            </div>
                          )}
                          {p.phone && (
                            <div>
                              <span className="text-xs text-[#1c2a2b]/40 uppercase tracking-wide">Phone</span>
                              <p className="mt-0.5">
                                <a href={`tel:${p.phone}`} className="text-[#0e393d] hover:underline" onClick={(e) => e.stopPropagation()}>{p.phone}</a>
                              </p>
                            </div>
                          )}
                          {p.email && (
                            <div>
                              <span className="text-xs text-[#1c2a2b]/40 uppercase tracking-wide">Email</span>
                              <p className="mt-0.5">
                                <a href={`mailto:${p.email}`} className="text-[#0e393d] hover:underline" onClick={(e) => e.stopPropagation()}>{p.email}</a>
                              </p>
                            </div>
                          )}
                          {p.website && (
                            <div>
                              <span className="text-xs text-[#1c2a2b]/40 uppercase tracking-wide">Website</span>
                              <p className="mt-0.5">
                                <a href={p.website.startsWith('http') ? p.website : `https://${p.website}`} target="_blank" rel="noopener noreferrer" className="text-[#0e393d] hover:underline" onClick={(e) => e.stopPropagation()}>{p.website}</a>
                              </p>
                            </div>
                          )}
                          {p.lab_code && (
                            <div>
                              <span className="text-xs text-[#1c2a2b]/40 uppercase tracking-wide">Lab Code</span>
                              <p className="font-mono text-[#1c2a2b]/70 mt-0.5">{p.lab_code}</p>
                            </div>
                          )}
                          {p.integration_tier && (
                            <div>
                              <span className="text-xs text-[#1c2a2b]/40 uppercase tracking-wide">Integration</span>
                              <p className="text-[#1c2a2b]/70 mt-0.5">{p.integration_tier}</p>
                            </div>
                          )}
                          {p.iso_accreditation && (
                            <div>
                              <span className="text-xs text-[#1c2a2b]/40 uppercase tracking-wide">ISO Accreditation</span>
                              <p className="text-[#1c2a2b]/70 mt-0.5">{p.iso_accreditation}</p>
                            </div>
                          )}
                          {mapsUrl && (
                            <div>
                              <span className="text-xs text-[#1c2a2b]/40 uppercase tracking-wide">Coordinates</span>
                              <p className="mt-0.5">
                                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-[#0e393d] hover:underline font-mono text-xs" onClick={(e) => e.stopPropagation()}>{p.latitude}, {p.longitude}</a>
                              </p>
                            </div>
                          )}
                          {expandedDesc && (
                            <div className="col-span-2">
                              <span className="text-xs text-[#1c2a2b]/40 uppercase tracking-wide">Description</span>
                              <p className="text-[#1c2a2b]/70 mt-0.5 leading-relaxed">{expandedDesc}</p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
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
              <div>
                <h2 className="font-serif text-lg text-[#0e393d]">
                  {editingId ? 'Edit Lab' : form.parent_lab_id ? 'New Location' : 'New Lab'}
                </h2>
                {form.parent_lab_id && (
                  <p className="text-xs text-[#1c2a2b]/40 mt-0.5">
                    Location of {partners.find((p) => p.id === form.parent_lab_id)?.name ?? 'parent organization'}
                  </p>
                )}
              </div>
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
                <SectionHead>Lab Identity</SectionHead>
                <Field label="Name *">
                  <input
                    className={inputCls}
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    placeholder="Zurich Clinical Lab AG"
                  />
                </Field>

                <Field label="Lab Type">
                  <div className="flex gap-2">
                    {([
                      { value: 'evida_life', label: '🌿 Evida Life Lab' },
                      { value: 'partner',    label: '🤝 Partner Lab' },
                    ] as const).map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setField('lab_type', value)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium ring-1 ring-inset transition ${
                          form.lab_type === value
                            ? 'bg-[#0e393d] text-white ring-[#0e393d]'
                            : 'bg-white text-[#1c2a2b]/60 ring-[#0e393d]/15 hover:ring-[#0e393d]/30'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Lab Code" hint="Short ID for report numbers — 1–10 chars, e.g. ZH01, LG1ZH01">
                  <input
                    className={inputCls}
                    value={form.lab_code}
                    onChange={(e) => setField('lab_code', e.target.value.toUpperCase())}
                    placeholder="ZH01"
                    maxLength={10}
                  />
                </Field>

                <Field label="Parent Organization" hint="Leave empty for standalone labs or parent organizations">
                  <select
                    className={inputCls}
                    value={form.parent_lab_id}
                    onChange={(e) => {
                      const newParentId = e.target.value;
                      setField('parent_lab_id', newParentId);
                      if (form.canton) {
                        const code = suggestLabCode(form.canton, newParentId || undefined);
                        if (code) setField('lab_code', code);
                      }
                    }}
                  >
                    <option value="">— Standalone / Parent org</option>
                    {partners
                      .filter(p => !p.parent_lab_id && p.id !== editingId)
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.name}{p.lab_code ? ` (${p.lab_code})` : ''}</option>
                      ))}
                  </select>
                </Field>

                {!form.parent_lab_id && (
                  <Field label="Integration Tier">
                    <div className="space-y-2">
                      {([
                        { value: 'manual',            label: '📋 Manual',            desc: 'No system integration. Admin uploads PDF manually.' },
                        { value: 'voucher_callback',  label: '🔔 Voucher Callback',  desc: 'Lab registers voucher via webhook.' },
                        { value: 'full_api',          label: '⚡ Full API',           desc: 'Lab pushes real-time status + results via API.' },
                      ] as const).map(({ value, label, desc }) => (
                        <label key={value} className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name="integration_tier"
                            value={value}
                            checked={form.integration_tier === value}
                            onChange={() => setField('integration_tier', value)}
                            className="mt-0.5 shrink-0"
                          />
                          <div>
                            <span className="text-xs font-medium text-[#0e393d]">{label}</span>
                            <p className="text-[11px] text-[#1c2a2b]/45">{desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </Field>
                )}
              </div>

              {/* ── LOCATION ── */}
              <div className="space-y-3 border-t border-[#0e393d]/8 pt-5">
                <SectionHead>Location</SectionHead>

                <Field label="Address *">
                  <AddressAutocomplete
                    value={form.address}
                    onChange={(v) => setField('address', v)}
                    onPlaceSelect={handlePlaceSelect}
                  />
                </Field>

                <div className="grid grid-cols-3 gap-3">
                  <Field label="City *">
                    <input className={inputCls} value={form.city} onChange={(e) => setField('city', e.target.value)} placeholder="Zürich" />
                  </Field>
                  <Field label="Canton / State">
                    <input
                      className={inputCls}
                      value={form.canton}
                      onChange={(e) => setField('canton', e.target.value)}
                      onBlur={(e) => {
                        if (!form.lab_code && e.target.value) {
                          const code = suggestLabCode(e.target.value, form.parent_lab_id || undefined);
                          if (code) setField('lab_code', code);
                        }
                      }}
                      placeholder="ZH"
                    />
                  </Field>
                  <Field label="Postal Code">
                    <input className={inputCls} value={form.postal_code} onChange={(e) => setField('postal_code', e.target.value)} placeholder="8001" />
                  </Field>
                </div>

                <Field label="Country *">
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
                  {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Lab'}
                </button>
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  );
}
