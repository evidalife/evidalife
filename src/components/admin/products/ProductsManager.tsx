'use client';

import { useCallback, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'de' | 'en';
type LangContent = { de: string; en: string };
type I18n = { de?: string; en?: string } | null;

export type Product = {
  id: string;
  name: I18n;
  sku: string | null;
  slug: string | null;
  description: I18n;
  short_description: I18n;
  price_chf: number | null;
  price_eur: number | null;
  tax_class: string | null;
  product_type: string | null;
  is_active: boolean | null;
  is_featured: boolean | null;
  image_url: string | null;
  metadata: { marker_count?: number } | null;
  deleted_at: string | null;
  created_at: string;
};

type FormState = {
  name: LangContent;
  sku: string;
  slug: string;
  description: LangContent;
  price_chf: string;
  price_eur: string;
  tax_class: string;
  product_type: string;
  marker_count: string;
  is_active: boolean;
  is_featured: boolean;
};

const EMPTY_FORM: FormState = {
  name: { de: '', en: '' },
  sku: '', slug: '',
  description: { de: '', en: '' },
  price_chf: '', price_eur: '',
  tax_class: 'standard', product_type: 'test_package',
  marker_count: '',
  is_active: true, is_featured: false,
};

const TAX_CLASSES = ['standard', 'reduced', 'zero'];
const PRODUCT_TYPES = ['test_package', 'addon_test', 'food', 'subscription'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function chf(n: number | null) {
  if (n == null) return '—';
  return `CHF ${n.toLocaleString('de-CH', { minimumFractionDigits: 0 })}`;
}

function StatusBadge({ product }: { product: Product }) {
  if (product.deleted_at) return <Badge color="red">Deleted</Badge>;
  if (!product.is_active) return <Badge color="gray">Inactive</Badge>;
  return <Badge color="green">Active</Badge>;
}

function Badge({ color, children }: { color: 'green' | 'gray' | 'red' | 'gold'; children: React.ReactNode }) {
  const cls = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    gray:  'bg-gray-50 text-gray-600 ring-gray-500/20',
    red:   'bg-red-50 text-red-700 ring-red-600/20',
    gold:  'bg-[#ceab84]/15 text-[#8a6a3e] ring-[#ceab84]/30',
  }[color];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${cls}`}>
      {children}
    </span>
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

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#0e393d]/70 mb-1">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-[#1c2a2b]/40">{hint}</p>}
    </div>
  );
}

const inputCls = 'w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition';
const selectCls = inputCls + ' cursor-pointer';

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProductsManager({ initialProducts }: { initialProducts: Product[] }) {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>('de');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Data refresh ────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setProducts(data);
  }, [supabase]);

  // ── Panel helpers ────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null);
    setLang('de');
    setForm(EMPTY_FORM);
    setImageFile(null);
    setImagePreview(null);
    setCurrentImageUrl(null);
    setError(null);
    setPanelOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setLang('de');
    setForm({
      name: { de: p.name?.de ?? '', en: p.name?.en ?? '' },
      sku: p.sku ?? '',
      slug: p.slug ?? '',
      description: { de: p.description?.de ?? '', en: p.description?.en ?? '' },
      price_chf: p.price_chf != null ? String(p.price_chf) : '',
      price_eur: p.price_eur != null ? String(p.price_eur) : '',
      tax_class: p.tax_class ?? 'standard',
      product_type: p.product_type ?? 'test_package',
      marker_count: p.metadata?.marker_count != null ? String(p.metadata.marker_count) : '',
      is_active: p.is_active ?? true,
      is_featured: p.is_featured ?? false,
    });
    setImageFile(null);
    setImagePreview(null);
    setCurrentImageUrl(p.image_url);
    setError(null);
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setError(null);
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setLangField = (field: 'name' | 'description', l: Lang, v: string) =>
    setForm((prev) => ({ ...prev, [field]: { ...prev[field], [l]: v } }));

  // ── Image picker ─────────────────────────────────────────────────────────────

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (productId: string): Promise<string | null> => {
    if (!imageFile) return currentImageUrl;
    const ext = imageFile.name.split('.').pop();
    const path = `${productId}/cover.${ext}`;
    const fd = new FormData();
    fd.append('file', imageFile);
    fd.append('bucket', 'product-images');
    fd.append('path', path);
    const res = await fetch('/api/upload-image', { method: 'POST', body: fd });
    const json = await res.json();
    if (!res.ok || !json.url) { console.error(json.error); return currentImageUrl; }
    return json.url as string;
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
      name: { de: form.name.de, en: form.name.en },
      sku: form.sku.trim() || null,
      slug: form.slug.trim() || null,
      description: { de: form.description.de, en: form.description.en },
      price_chf: form.price_chf ? Number(form.price_chf) : null,
      price_eur: form.price_eur ? Number(form.price_eur) : null,
      tax_class: form.tax_class || null,
      product_type: form.product_type || null,
      metadata: form.marker_count ? { marker_count: Number(form.marker_count) } : null,
      is_active: form.is_active,
      is_featured: form.is_featured,
    };

    try {
      let productId = editingId;

      if (editingId) {
        const { error } = await supabase.from('products').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('products').insert(payload).select('id').single();
        if (error) throw error;
        productId = data.id;
      }

      // Upload image after we have the product id
      const imageUrl = await uploadImage(productId!);
      if (imageUrl !== currentImageUrl) {
        await supabase.from('products').update({ image_url: imageUrl }).eq('id', productId!);
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

  // ── Delete / restore ─────────────────────────────────────────────────────────

  const handleDelete = async (p: Product) => {
    if (!confirm(`Delete "${p.name?.de || p.name?.en || p.sku || 'this product'}"? This is a soft-delete.`)) return;
    await supabase.from('products').update({ deleted_at: new Date().toISOString() }).eq('id', p.id);
    await refresh();
  };

  const handleRestore = async (p: Product) => {
    await supabase.from('products').update({ deleted_at: null }).eq('id', p.id);
    await refresh();
  };

  // ── Filtered list ────────────────────────────────────────────────────────────

  const filtered = products.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.name?.de?.toLowerCase().includes(q) ||
      p.name?.en?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.product_type?.toLowerCase().includes(q)
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-[#0e393d]">Products</h1>
          <p className="mt-0.5 text-sm text-[#1c2a2b]/50">
            {products.length} total · {products.filter(p => p.is_active && !p.deleted_at).length} active
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0e393d] text-white text-sm font-medium hover:bg-[#0e393d]/90 transition"
        >
          <span className="text-lg leading-none">+</span> New Product
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, SKU, type…"
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
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider w-12"></th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Name / SKU</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">CHF</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">EUR</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0e393d]/6">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-[#1c2a2b]/40">
                  No products found.
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr
                key={p.id}
                className={`hover:bg-[#fafaf8] transition-colors ${p.deleted_at ? 'opacity-50' : ''}`}
              >
                {/* Thumbnail */}
                <td className="px-4 py-3">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt="" className="w-9 h-9 rounded-lg object-cover border border-[#0e393d]/10" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-[#0e393d]/6 flex items-center justify-center text-[#0e393d]/30">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                  )}
                </td>

                {/* Name / SKU */}
                <td className="px-4 py-3">
                  <div className="font-medium text-[#0e393d]">{p.name?.de || p.name?.en || <span className="text-[#1c2a2b]/30">—</span>}</div>
                  {p.sku && <div className="text-xs text-[#1c2a2b]/40 font-mono mt-0.5">{p.sku}</div>}
                </td>

                {/* Type */}
                <td className="px-4 py-3">
                  <Badge color="gold">{p.product_type ?? '—'}</Badge>
                  {p.is_featured && <span className="ml-1.5"><Badge color="gold">★ featured</Badge></span>}
                </td>

                {/* Prices */}
                <td className="px-4 py-3 text-[#1c2a2b]/70 tabular-nums">{chf(p.price_chf)}</td>
                <td className="px-4 py-3 text-[#1c2a2b]/70 tabular-nums">
                  {p.price_eur != null ? `€${p.price_eur}` : '—'}
                </td>

                {/* Status */}
                <td className="px-4 py-3"><StatusBadge product={p} /></td>

                {/* Actions */}
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEdit(p)}
                      className="px-3 py-1 rounded-md text-xs font-medium text-[#0e393d] bg-[#0e393d]/8 hover:bg-[#0e393d]/15 transition"
                    >
                      Edit
                    </button>
                    {p.deleted_at ? (
                      <button
                        onClick={() => handleRestore(p)}
                        className="px-3 py-1 rounded-md text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition"
                      >
                        Restore
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDelete(p)}
                        className="px-3 py-1 rounded-md text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Slide-over panel ─────────────────────────────────────────────────── */}
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
                {editingId ? 'Edit Product' : 'New Product'}
              </h2>
              <div className="flex items-center gap-3">
                {/* Lang tabs */}
                <div className="flex rounded-lg border border-[#0e393d]/15 overflow-hidden text-xs">
                  {(['de', 'en'] as Lang[]).map((l) => (
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

              {/* Basic info */}
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ceab84]">Content — {lang.toUpperCase()}</p>

                <Field label={`Name (${lang.toUpperCase()}) *`}>
                  <input
                    className={inputCls}
                    value={form.name[lang]}
                    onChange={(e) => setLangField('name', lang, e.target.value)}
                    placeholder={lang === 'de' ? 'z.B. Longevity Pro' : 'e.g. Longevity Pro'}
                  />
                </Field>

                <Field label={`Description (${lang.toUpperCase()})`}>
                  <textarea
                    className={inputCls + ' resize-none'}
                    rows={3}
                    value={form.description[lang]}
                    onChange={(e) => setLangField('description', lang, e.target.value)}
                    placeholder={lang === 'de' ? 'Kurze Produktbeschreibung…' : 'Short product description…'}
                  />
                </Field>

                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ceab84] pt-2">Details</p>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="SKU">
                    <input
                      className={inputCls}
                      value={form.sku}
                      onChange={(e) => setField('sku', e.target.value)}
                      placeholder="EVD-PRO-001"
                    />
                  </Field>
                  <Field label="Slug">
                    <input
                      className={inputCls}
                      value={form.slug}
                      onChange={(e) => setField('slug', e.target.value)}
                      placeholder="longevity-pro"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Product Type">
                    <select
                      className={selectCls}
                      value={form.product_type}
                      onChange={(e) => setField('product_type', e.target.value)}
                    >
                      {PRODUCT_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Marker Count">
                    <input
                      type="number"
                      className={inputCls}
                      value={form.marker_count}
                      onChange={(e) => setField('marker_count', e.target.value)}
                      placeholder="23"
                      min={0}
                    />
                  </Field>
                </div>

              </div>

              {/* Pricing */}
              <div className="space-y-3 border-t border-[#0e393d]/8 pt-5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ceab84]">Pricing</p>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Price CHF">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#1c2a2b]/40">CHF</span>
                      <input
                        type="number"
                        className={inputCls + ' pl-11'}
                        value={form.price_chf}
                        onChange={(e) => setField('price_chf', e.target.value)}
                        placeholder="299"
                        min={0}
                        step={0.01}
                      />
                    </div>
                  </Field>
                  <Field label="Price EUR">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#1c2a2b]/40">€</span>
                      <input
                        type="number"
                        className={inputCls + ' pl-7'}
                        value={form.price_eur}
                        onChange={(e) => setField('price_eur', e.target.value)}
                        placeholder="279"
                        min={0}
                        step={0.01}
                      />
                    </div>
                  </Field>
                </div>

                <Field label="Tax Class">
                  <select
                    className={selectCls}
                    value={form.tax_class}
                    onChange={(e) => setField('tax_class', e.target.value)}
                  >
                    {TAX_CLASSES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Settings */}
              <div className="space-y-3 border-t border-[#0e393d]/8 pt-5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ceab84]">Settings</p>

                <div className="flex flex-col gap-3">
                  {([
                    ['is_active', 'Active', 'Visible to customers in the shop'],
                    ['is_featured', 'Featured', 'Highlighted as recommended'],
                  ] as [keyof FormState, string, string][]).map(([key, label, hint]) => (
                    <div key={key} className="flex items-center justify-between rounded-lg border border-[#0e393d]/10 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-[#1c2a2b]">{label}</p>
                        <p className="text-xs text-[#1c2a2b]/40">{hint}</p>
                      </div>
                      <Toggle
                        checked={form[key] as boolean}
                        onChange={(v) => setField(key, v)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Image */}
              <div className="space-y-3 border-t border-[#0e393d]/8 pt-5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ceab84]">Cover Image</p>

                {(imagePreview || currentImageUrl) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imagePreview ?? currentImageUrl!}
                    alt="Preview"
                    className="w-full h-40 object-cover rounded-xl border border-[#0e393d]/10"
                  />
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-lg border border-dashed border-[#0e393d]/20 py-4 text-sm text-[#0e393d]/50 hover:border-[#0e393d]/40 hover:text-[#0e393d]/70 hover:bg-[#0e393d]/3 transition"
                >
                  {imagePreview ? 'Replace image' : currentImageUrl ? 'Replace image' : 'Upload image'}
                  <span className="block text-xs mt-0.5 text-[#1c2a2b]/30">PNG, JPG, WebP · max 5 MB</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
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
                  {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  );
}
