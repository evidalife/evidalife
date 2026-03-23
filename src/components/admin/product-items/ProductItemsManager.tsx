'use client';

import { useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'de' | 'en' | 'fr' | 'es' | 'it';
type LangContent = { de: string; en: string; fr: string; es: string; it: string };

export type ItemDefinition = {
  id: string;
  slug: string | null;
  name: Record<string, string> | null;
  item_type: string | null;
  is_active: boolean | null;
  sort_order: number | null;
};

type FormState = {
  name: LangContent;
  item_type: string;
  sort_order: string;
  is_active: boolean;
};

const EMPTY_FORM: FormState = {
  name: { de: '', en: '', fr: '', es: '', it: '' },
  item_type: 'biomarker',
  sort_order: '',
  is_active: true,
};

const ITEM_TYPES = [
  'biomarker',
  'vitalcheck_measurement',
  'vo2max_test',
  'dexa_scan',
  'biological_age_test',
  'coaching_hour',
  'food_item',
  'genetic_test',
];

function slugify(text: string): string {
  return text.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'item';
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

const inputCls = 'w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition';
const selectCls = inputCls + ' cursor-pointer';

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

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#ceab84]/15 px-2 py-0.5 text-[11px] font-medium text-[#8a6a3e] ring-1 ring-inset ring-[#ceab84]/30">
      {children}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProductItemsManager({ initialItems }: { initialItems: ItemDefinition[] }) {
  const supabase = createClient();
  const [items, setItems] = useState<ItemDefinition[]>(initialItems);
  const [search, setSearch] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>('de');
  const [translating, setTranslating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Refresh ──────────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('product_item_definitions')
      .select('id, slug, name, item_type, is_active, sort_order')
      .order('sort_order', { ascending: true });
    if (data) setItems(data as ItemDefinition[]);
  }, [supabase]);

  // ── Panel helpers ────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null);
    setLang('de');
    setForm(EMPTY_FORM);
    setError(null);
    setPanelOpen(true);
  };

  const openEdit = (item: ItemDefinition) => {
    setEditingId(item.id);
    setLang('de');
    setForm({
      name: {
        de: item.name?.de ?? '',
        en: item.name?.en ?? '',
        fr: item.name?.fr ?? '',
        es: item.name?.es ?? '',
        it: item.name?.it ?? '',
      },
      item_type: item.item_type ?? 'biomarker',
      sort_order: item.sort_order != null ? String(item.sort_order) : '',
      is_active: item.is_active ?? true,
    });
    setError(null);
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setError(null);
  };

  const setLangField = (l: Lang, v: string) =>
    setForm((prev) => ({ ...prev, name: { ...prev.name, [l]: v } }));

  // ── AI Translate ──────────────────────────────────────────────────────────────

  const handleTranslate = async () => {
    const srcName = form.name.en || form.name.de;
    if (!srcName) { alert('Enter a DE or EN name first.'); return; }
    setTranslating(true);
    try {
      const res = await fetch('/api/admin/translate-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name_en: srcName }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Translate failed');
      setForm((f) => ({
        ...f,
        name: {
          ...f.name,
          fr: f.name.fr || json.name_fr || '',
          es: f.name.es || json.name_es || '',
          it: f.name.it || json.name_it || '',
        },
      }));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setTranslating(false);
    }
  };

  // ── Duplicate detection ───────────────────────────────────────────────────────

  const isDuplicate = (): boolean => {
    const candidates = editingId ? items.filter((i) => i.id !== editingId) : items;
    const names = [form.name.de, form.name.en, form.name.fr, form.name.es, form.name.it]
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean);
    return candidates.some((item) =>
      Object.values(item.name ?? {}).some((v) =>
        names.includes((v as string).toLowerCase())
      )
    );
  };

  // ── Save ─────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.name.de.trim() && !form.name.en.trim()) {
      setError('Name (DE or EN) is required.');
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      name: { de: form.name.de, en: form.name.en, fr: form.name.fr, es: form.name.es, it: form.name.it },
      item_type: form.item_type || null,
      sort_order: form.sort_order ? Number(form.sort_order) : null,
      is_active: form.is_active,
    };

    try {
      if (editingId) {
        const { error: err } = await supabase
          .from('product_item_definitions')
          .update(payload)
          .eq('id', editingId);
        if (err) throw err;
      } else {
        const slug = slugify(form.name.en || form.name.de);
        const { error: err } = await supabase
          .from('product_item_definitions')
          .insert({ ...payload, slug });
        if (err) throw err;
      }
      await refresh();
      closePanel();
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setError(typeof e === 'object' && e && 'message' in e ? (e as any).message : String(e));
    } finally {
      setSaving(false);
    }
  };

  // ── Filtered list ────────────────────────────────────────────────────────────

  const filtered = items.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.name?.de?.toLowerCase().includes(q) ||
      item.name?.en?.toLowerCase().includes(q) ||
      item.item_type?.toLowerCase().includes(q) ||
      item.slug?.toLowerCase().includes(q)
    );
  });

  const dupWarning = panelOpen && isDuplicate();

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-[#0e393d]">Product Item Definitions</h1>
          <p className="mt-0.5 text-sm text-[#1c2a2b]/50">
            {items.length} total · {items.filter((i) => i.is_active).length} active
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0e393d] text-white text-sm font-medium hover:bg-[#0e393d]/90 transition"
        >
          <span className="text-lg leading-none">+</span> New Item
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, type, slug…"
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
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Sort</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0e393d]/6">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-[#1c2a2b]/40">
                  No items found.
                </td>
              </tr>
            )}
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-[#fafaf8] transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-[#0e393d]">
                    {item.name?.de || item.name?.en || <span className="text-[#1c2a2b]/30">—</span>}
                  </div>
                  {item.name?.en && item.name?.de && (
                    <div className="text-xs text-[#1c2a2b]/40 mt-0.5">{item.name.en}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {item.item_type ? <Badge>{item.item_type}</Badge> : <span className="text-[#1c2a2b]/30">—</span>}
                </td>
                <td className="px-4 py-3 text-[#1c2a2b]/40 tabular-nums">{item.sort_order ?? '—'}</td>
                <td className="px-4 py-3">
                  {item.is_active ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-inset ring-gray-500/20">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => openEdit(item)}
                    className="px-3 py-1 rounded-md text-xs font-medium text-[#0e393d] bg-[#0e393d]/8 hover:bg-[#0e393d]/15 transition"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Slide-over panel ─────────────────────────────────────────────────── */}
      {panelOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]" onClick={closePanel} />

          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl">

            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-[#0e393d]/10 px-6 py-4">
              <h2 className="font-serif text-lg text-[#0e393d]">
                {editingId ? 'Edit Item' : 'New Item'}
              </h2>
              <div className="flex items-center gap-3">
                {/* AI Translate */}
                <button
                  onClick={handleTranslate}
                  disabled={translating}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#ceab84]/40 text-[10px] font-medium text-[#8a6a3e] hover:bg-[#ceab84]/10 disabled:opacity-50 transition whitespace-nowrap"
                >
                  {translating ? '…' : '✦ AI Translate'}
                </button>
                {/* Lang tabs */}
                <div className="flex rounded-lg border border-[#0e393d]/15 overflow-hidden text-xs">
                  {(['de', 'en', 'fr', 'es', 'it'] as Lang[]).map((l) => (
                    <button
                      key={l}
                      onClick={() => setLang(l)}
                      className={`px-3 py-1.5 font-medium transition ${lang === l ? 'bg-[#0e393d] text-white' : 'text-[#1c2a2b]/60 hover:bg-[#0e393d]/5'}`}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
                <button onClick={closePanel} className="text-[#1c2a2b]/40 hover:text-[#1c2a2b] transition">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Name */}
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ceab84]">
                  Name — {lang.toUpperCase()}
                </p>

                <Field label={`Name (${lang.toUpperCase()}) *`}>
                  <input
                    className={inputCls}
                    value={form.name[lang]}
                    onChange={(e) => setLangField(lang, e.target.value)}
                    placeholder={lang === 'de' ? 'z.B. Hämoglobin' : 'e.g. Haemoglobin'}
                    autoFocus
                  />
                </Field>

                {dupWarning && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                    ⚠ An item with this name already exists.
                  </p>
                )}
              </div>

              {/* Details */}
              <div className="space-y-3 border-t border-[#0e393d]/8 pt-5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ceab84]">Details</p>

                <Field label="Item Type">
                  <select
                    className={selectCls}
                    value={form.item_type}
                    onChange={(e) => setForm((f) => ({ ...f, item_type: e.target.value }))}
                  >
                    {ITEM_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Sort Order" hint="Lower numbers appear first">
                  <input
                    type="number"
                    className={inputCls}
                    value={form.sort_order}
                    onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                    placeholder="10"
                    min={0}
                    step={1}
                  />
                </Field>
              </div>

              {/* Settings */}
              <div className="space-y-3 border-t border-[#0e393d]/8 pt-5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ceab84]">Settings</p>

                <div className="flex items-center justify-between rounded-lg border border-[#0e393d]/10 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#1c2a2b]">Active</p>
                    <p className="text-xs text-[#1c2a2b]/40">Shown in product editors and detail pages</p>
                  </div>
                  <Toggle
                    checked={form.is_active}
                    onChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                  />
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
                  {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  );
}
