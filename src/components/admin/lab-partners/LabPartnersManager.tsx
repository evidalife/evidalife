'use client';

import { useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

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
};

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
};

// ─── Shared primitives ────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition';

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#0e393d]/70 mb-1">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-[#1c2a2b]/40">{hint}</p>}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
        checked ? 'bg-[#0e393d]' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4.5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ceab84]">
      {children}
    </p>
  );
}

function Badge({
  color,
  children,
}: {
  color: 'green' | 'gray' | 'gold';
  children: React.ReactNode;
}) {
  const cls = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    gray: 'bg-gray-50 text-gray-600 ring-gray-500/20',
    gold: 'bg-[#ceab84]/15 text-[#8a6a3e] ring-[#ceab84]/30',
  }[color];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${cls}`}
    >
      {children}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LabPartnersManager({
  initialLabPartners,
}: {
  initialLabPartners: LabPartner[];
}) {
  const supabase = createClient();
  const [partners, setPartners] = useState<LabPartner[]>(initialLabPartners);
  const [search, setSearch] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
    setPanelOpen(true);
  };

  const openEdit = (p: LabPartner) => {
    setEditingId(p.id);
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
    });
    setError(null);
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setError(null);
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // ── Save ──────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      canton: form.canton.trim() || null,
      postal_code: form.postal_code.trim() || null,
      country: form.country.trim() || null,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      website: form.website.trim() || null,
      iso_accreditation: form.iso_accreditation.trim() || null,
      is_active: form.is_active,
    };

    try {
      if (editingId) {
        const { error: err } = await supabase
          .from('lab_partners')
          .update(payload)
          .eq('id', editingId);
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

  // ── Deactivate (soft delete) ─────────────────────────────────────────────────

  const handleDeactivate = async (p: LabPartner) => {
    await supabase.from('lab_partners').update({ is_active: false }).eq('id', p.id);
    await refresh();
  };

  // ── Filtered list ────────────────────────────────────────────────────────────

  const filtered = partners.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q)
    );
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
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">
                City / Canton
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">
                Country
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">
                ISO
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">
                Actions
              </th>
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
                {/* Name */}
                <td className="px-4 py-3">
                  <div className="font-medium text-[#0e393d]">{p.name}</div>
                  {p.address && (
                    <div className="text-xs text-[#1c2a2b]/40 mt-0.5">{p.address}</div>
                  )}
                </td>

                {/* City / Canton */}
                <td className="px-4 py-3 text-[#1c2a2b]/70">
                  {[p.city, p.canton].filter(Boolean).join(', ') || '—'}
                </td>

                {/* Country */}
                <td className="px-4 py-3 text-[#1c2a2b]/70">
                  {p.country ?? '—'}
                </td>

                {/* ISO badge */}
                <td className="px-4 py-3">
                  {p.iso_accreditation ? (
                    <Badge color="gold">{p.iso_accreditation}</Badge>
                  ) : (
                    <span className="text-[#1c2a2b]/25 text-xs">—</span>
                  )}
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  {p.is_active ? (
                    <Badge color="green">Active</Badge>
                  ) : (
                    <Badge color="gray">Inactive</Badge>
                  )}
                </td>

                {/* Actions */}
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
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]"
            onClick={closePanel}
          />

          {/* Panel */}
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-2xl">

            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-[#0e393d]/10 px-6 py-4">
              <h2 className="font-serif text-lg text-[#0e393d]">
                {editingId ? 'Edit Lab Partner' : 'New Lab Partner'}
              </h2>
              <button
                onClick={closePanel}
                className="text-[#1c2a2b]/40 hover:text-[#1c2a2b] transition"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                >
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Name */}
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

              {/* Location */}
              <div className="space-y-3 border-t border-[#0e393d]/8 pt-5">
                <SectionHead>Location</SectionHead>

                <Field label="Address">
                  <input
                    className={inputCls}
                    value={form.address}
                    onChange={(e) => setField('address', e.target.value)}
                    placeholder="Bahnhofstrasse 12"
                  />
                </Field>

                <div className="grid grid-cols-3 gap-3">
                  <Field label="City">
                    <input
                      className={inputCls}
                      value={form.city}
                      onChange={(e) => setField('city', e.target.value)}
                      placeholder="Zürich"
                    />
                  </Field>
                  <Field label="Canton">
                    <input
                      className={inputCls}
                      value={form.canton}
                      onChange={(e) => setField('canton', e.target.value)}
                      placeholder="ZH"
                    />
                  </Field>
                  <Field label="Postal Code">
                    <input
                      className={inputCls}
                      value={form.postal_code}
                      onChange={(e) => setField('postal_code', e.target.value)}
                      placeholder="8001"
                    />
                  </Field>
                </div>

                <Field label="Country">
                  <input
                    className={inputCls}
                    value={form.country}
                    onChange={(e) => setField('country', e.target.value)}
                    placeholder="CH"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Latitude" hint="Used for map display">
                    <input
                      type="number"
                      className={inputCls}
                      value={form.latitude}
                      onChange={(e) => setField('latitude', e.target.value)}
                      placeholder="47.376887"
                      step={0.000001}
                    />
                  </Field>
                  <Field label="Longitude" hint="Used for map display">
                    <input
                      type="number"
                      className={inputCls}
                      value={form.longitude}
                      onChange={(e) => setField('longitude', e.target.value)}
                      placeholder="8.541694"
                      step={0.000001}
                    />
                  </Field>
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-3 border-t border-[#0e393d]/8 pt-5">
                <SectionHead>Contact</SectionHead>

                <Field label="Phone">
                  <input
                    className={inputCls}
                    value={form.phone}
                    onChange={(e) => setField('phone', e.target.value)}
                    placeholder="+41 44 123 45 67"
                  />
                </Field>

                <Field label="Email">
                  <input
                    type="email"
                    className={inputCls}
                    value={form.email}
                    onChange={(e) => setField('email', e.target.value)}
                    placeholder="lab@example.ch"
                  />
                </Field>

                <Field label="Website">
                  <input
                    type="url"
                    className={inputCls}
                    value={form.website}
                    onChange={(e) => setField('website', e.target.value)}
                    placeholder="https://example.ch"
                  />
                </Field>
              </div>

              {/* Certification */}
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

              {/* Settings */}
              <div className="space-y-3 border-t border-[#0e393d]/8 pt-5">
                <SectionHead>Settings</SectionHead>

                <div className="flex items-center justify-between rounded-lg border border-[#0e393d]/10 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#1c2a2b]">Active</p>
                    <p className="text-xs text-[#1c2a2b]/40">
                      Visible and bookable for users
                    </p>
                  </div>
                  <Toggle
                    checked={form.is_active}
                    onChange={(v) => setField('is_active', v)}
                  />
                </div>
              </div>

            </div>

            {/* Panel footer */}
            <div className="border-t border-[#0e393d]/10 px-6 py-4">
              {error && (
                <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </p>
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
