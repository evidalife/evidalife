'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import CoverImageUploader from '@/components/shared/CoverImageUploader';
import GalleryUploader from '@/components/shared/GalleryUploader';
import type { ParsedProduct } from '@/app/api/admin/parse-product/route';
import { PRODUCT_TYPES } from '@/components/admin/lab-results/shared';

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'de' | 'en' | 'fr' | 'es' | 'it';
type LangContent = { de: string; en: string; fr: string; es: string; it: string };
type I18n = Record<string, string> | null;

type ItemDefinition = {
  id: string;
  name: Record<string, string> | null;
  item_type: string | null;
  sort_order: number | null;
};

export type Product = {
  id: string;
  name: I18n;
  sku: string | null;
  slug: string | null;
  description: I18n;
  short_description: I18n;
  price_chf: number | null;
  price_eur: number | null;
  compare_at_price_chf: number | null;
  compare_at_price_eur: number | null;
  stripe_product_id: string | null;
  stripe_price_id_chf: string | null;
  stripe_price_id_eur: string | null;
  tax_class: string | null;
  product_type: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  is_featured: boolean | null;
  image_url: string | null;
  gallery_urls: string[] | null;
  metadata: { marker_count?: number } | null;
  deleted_at: string | null;
  created_at: string;
};

type FormState = {
  name: LangContent;
  sku: string;
  slug: string;
  short_description: LangContent;
  description: LangContent;
  price_chf: string;
  price_eur: string;
  compare_at_price_chf: string;
  compare_at_price_eur: string;
  tax_class: string;
  product_type: string;
  marker_count: string;
  sort_order: string;
  is_active: boolean;
  is_featured: boolean;
};

const EMPTY_FORM: FormState = {
  name: { de: '', en: '', fr: '', es: '', it: '' },
  sku: '', slug: '',
  short_description: { de: '', en: '', fr: '', es: '', it: '' },
  description: { de: '', en: '', fr: '', es: '', it: '' },
  price_chf: '', price_eur: '',
  compare_at_price_chf: '', compare_at_price_eur: '',
  tax_class: 'standard', product_type: 'blood_test',
  marker_count: '', sort_order: '',
  is_active: true, is_featured: false,
};

const TAX_CLASSES = ['standard', 'reduced', 'zero'];

type LocalizedString = string | Record<string, string> | null | undefined;

function locName(field: LocalizedString): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return (field as Record<string, string>).en || (field as Record<string, string>).de || '';
}

function slugify(text: string): string {
  return text.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'product';
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

const inputCls = 'w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition';
const selectCls = inputCls + ' cursor-pointer';

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
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-4.5' : 'translate-x-0.5'
      }`} />
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

function SectionBlock({
  title, open, onToggle, badge, children,
}: {
  title: string; open: boolean; onToggle: () => void; badge?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="border-t border-[#0e393d]/8 pt-5">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between mb-3 group">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#ceab84]">{title}</span>
          {badge}
        </div>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
          className={`text-[#0e393d]/30 group-hover:text-[#0e393d]/60 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#0e393d]/8 px-2 py-0.5 text-[10px] font-medium text-[#0e393d]/60">
      {children}
    </span>
  );
}

// ─── Markdown toolbar ─────────────────────────────────────────────────────────

function MarkdownToolbar({ taRef, value, onChange }: {
  taRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (v: string) => void;
}) {
  const insert = (before: string, after = '', defaultText = '') => {
    const ta = taRef.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const sel = value.slice(s, e) || defaultText;
    const next = value.slice(0, s) + before + sel + after + value.slice(e);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const cur = s + before.length + sel.length + after.length;
      ta.setSelectionRange(cur, cur);
    });
  };

  const btns = [
    { label: 'B',       title: 'Bold',          fn: () => insert('**', '**', 'bold') },
    { label: 'I',       title: 'Italic',         fn: () => insert('*', '*', 'italic') },
    { label: '## H',    title: 'Heading',        fn: () => insert('\n## ', '', 'Heading') },
    { label: '– List',  title: 'Bullet list',    fn: () => insert('\n- ', '', 'Item') },
    { label: '1. Num',  title: 'Numbered list',  fn: () => insert('\n1. ', '', 'Item') },
    { label: '> Tip',   title: 'Tip block',      fn: () => insert('\n> ', '', 'Tip') },
    { label: '---',     title: 'Divider',        fn: () => insert('\n\n---\n\n') },
  ];

  return (
    <div className="flex flex-wrap gap-1 px-2 py-1.5 border-b border-[#0e393d]/8 bg-[#fafaf8]">
      {btns.map((b) => (
        <button key={b.label} type="button" title={b.title}
          onMouseDown={(e) => { e.preventDefault(); b.fn(); }}
          className="rounded px-1.5 py-0.5 text-[11px] font-medium text-[#1c2a2b]/60 hover:bg-[#0e393d]/8 hover:text-[#0e393d] transition select-none"
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}

// ─── Quick Import components ──────────────────────────────────────────────────

function ParsedProductCard({
  result, onApply, onDiscard,
}: { result: ParsedProduct; onApply: () => void; onDiscard: () => void }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40">
      <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-200/60">
        <div className="flex items-center gap-2">
          <span className="text-sm">✓</span>
          <span className="text-sm font-medium text-emerald-800">Product parsed successfully</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onDiscard}
            className="rounded-lg border border-[#0e393d]/15 px-3 py-1.5 text-xs font-medium text-[#1c2a2b] hover:bg-[#fafaf8] transition">
            Discard
          </button>
          <button type="button" onClick={onApply}
            className="rounded-lg bg-[#0e393d] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0e393d]/90 transition">
            Apply to form
          </button>
        </div>
      </div>
      <div className="px-4 py-3 space-y-1.5 text-xs">
        {([
          ['Name',        result.name_en],
          ['Short desc',  result.short_description_en ? result.short_description_en.slice(0, 100) + (result.short_description_en.length > 100 ? '…' : '') : '—'],
          ['Description', result.description_en ? result.description_en.slice(0, 120) + (result.description_en.length > 120 ? '…' : '') : '—'],
          ['Price',       result.suggested_price_chf != null ? `CHF ${result.suggested_price_chf}` : '—'],
          ['Type',        result.suggested_product_type ?? '—'],
          ['Markers',     result.marker_count != null ? String(result.marker_count) : '—'],
        ] as [string, string][]).map(([label, value]) => (
          <div key={label} className="flex gap-2">
            <span className="w-24 shrink-0 font-medium text-[#1c2a2b]/50">{label}</span>
            <span className="text-[#1c2a2b]/80 break-words flex-1">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AI button ────────────────────────────────────────────────────────────────

function AiBtn({
  onClick, disabled, status, idle, loading: loadingLabel, done,
  color = 'amber',
}: {
  onClick: () => void;
  disabled: boolean;
  status: 'idle' | 'loading' | 'done' | 'error';
  idle: string;
  loading: string;
  done: string;
  color?: 'amber' | 'sky' | 'violet';
}) {
  const colors = {
    amber: { base: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100', done: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    sky:   { base: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100', done: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    violet:{ base: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100', done: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  }[color];
  const cls = status === 'done' ? colors.done : colors.base;
  return (
    <button type="button" onClick={onClick} disabled={disabled || status === 'loading'}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${cls}`}
    >
      {status === 'loading' && (
        <svg className="animate-spin h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      )}
      {status === 'loading' ? loadingLabel : status === 'done' ? done : idle}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProductsManager({ initialProducts }: { initialProducts: Product[] }) {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>('de');
  const [translating, setTranslating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  // AI statuses
  const [rewriteStatus, setRewriteStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [styleStatus, setStyleStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  // Quick Import
  const [quickImportOpen, setQuickImportOpen] = useState(false);
  const [quickImportText, setQuickImportText] = useState('');
  const [quickImportParsing, setQuickImportParsing] = useState(false);
  const [quickImportError, setQuickImportError] = useState<string | null>(null);
  const [quickImportResult, setQuickImportResult] = useState<ParsedProduct | null>(null);

  // Gallery
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);

  // Biomarker counts per product
  const [biomarkerCounts, setBiomarkerCounts] = useState<Record<string, number>>({});

  // Test items
  const [allDefinitions, setAllDefinitions] = useState<ItemDefinition[]>([]);
  const [includedItemIds, setIncludedItemIds] = useState<Set<string>>(new Set());
  const [itemsSearch, setItemsSearch] = useState('');
  const [itemsOpen, setItemsOpen] = useState(true);

  // Section collapse state
  const [openSections, setOpenSections] = useState({
    content: true, details: true, pricing: true, settings: true,
    testItems: true, gallery: false, cover: true,
  });
  const toggleSection = (k: keyof typeof openSections) =>
    setOpenSections((prev) => ({ ...prev, [k]: !prev[k] }));

  // ── Data refresh ─────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setProducts(data);
  }, [supabase]);

  // Load biomarker counts per product once on mount
  useEffect(() => {
    supabase
      .from('product_biomarkers')
      .select('product_id')
      .then(({ data }) => {
        if (!data) return;
        const counts: Record<string, number> = {};
        for (const { product_id } of data as { product_id: string }[]) {
          counts[product_id] = (counts[product_id] ?? 0) + 1;
        }
        setBiomarkerCounts(counts);
      });
  }, [supabase]);

  // Load all definitions once on mount
  useEffect(() => {
    supabase
      .from('biomarkers')
      .select('id, name, item_type, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => { if (data) setAllDefinitions(data); });
  }, [supabase]);

  // Re-load included items when editingId changes
  useEffect(() => {
    if (!editingId) { setIncludedItemIds(new Set()); return; }
    supabase
      .from('product_biomarkers')
      .select('biomarker_id')
      .eq('product_id', editingId)
      .then(({ data }) => {
        setIncludedItemIds(new Set(data?.map((r) => r.biomarker_id) ?? []));
      });
  }, [editingId, supabase]);

  // ── Panel helpers ─────────────────────────────────────────────────────────────

  const deleteImage = async (url: string | null) => {
    if (!url) return;
    const res = await fetch('/api/delete-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, bucket: 'product-images' }),
    });
    if (!res.ok) console.error('Delete failed:', await res.text());
  };

  const resetPanel = () => {
    setCoverImageUrl(null);
    setError(null);
    setGalleryUrls([]);
    setQuickImportOpen(false);
    setQuickImportText('');
    setQuickImportResult(null);
    setQuickImportError(null);
    setRewriteStatus('idle');
    setStyleStatus('idle');
    setItemsSearch('');
    setItemsOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    setLang('de');
    setForm(EMPTY_FORM);
    resetPanel();
    setQuickImportOpen(true); // open for new products
    setOpenSections({ content: true, details: true, pricing: true, settings: true, testItems: true, gallery: false, cover: true });
    setPanelOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setLang('de');
    setForm({
      name: { de: p.name?.de ?? '', en: p.name?.en ?? '', fr: p.name?.fr ?? '', es: p.name?.es ?? '', it: p.name?.it ?? '' },
      sku: p.sku ?? '',
      slug: p.slug ?? '',
      short_description: { de: p.short_description?.de ?? '', en: p.short_description?.en ?? '', fr: p.short_description?.fr ?? '', es: p.short_description?.es ?? '', it: p.short_description?.it ?? '' },
      description: { de: p.description?.de ?? '', en: p.description?.en ?? '', fr: p.description?.fr ?? '', es: p.description?.es ?? '', it: p.description?.it ?? '' },
      price_chf: p.price_chf != null ? String(p.price_chf) : '',
      price_eur: p.price_eur != null ? String(p.price_eur) : '',
      compare_at_price_chf: p.compare_at_price_chf != null ? String(p.compare_at_price_chf) : '',
      compare_at_price_eur: p.compare_at_price_eur != null ? String(p.compare_at_price_eur) : '',
      tax_class: p.tax_class ?? 'standard',
      product_type: p.product_type ?? 'blood_test',
      marker_count: p.metadata?.marker_count != null ? String(p.metadata.marker_count) : '',
      sort_order: p.sort_order != null ? String(p.sort_order) : '',
      is_active: p.is_active ?? true,
      is_featured: p.is_featured ?? false,
    });
    const isTest = ['blood_test', 'clinical_test', 'epigenetic_test', 'genetic_test', 'microbiome_test', 'addon_test'].includes(p.product_type ?? '');
    const existingGallery = p.gallery_urls ?? [];
    resetPanel();
    setGalleryUrls(existingGallery);
    setCoverImageUrl(p.image_url ?? null);
    setOpenSections({ content: true, details: true, pricing: true, settings: true, testItems: isTest, gallery: existingGallery.length > 0, cover: true });
    setEditingId(p.id);   // keep after resetPanel clears it
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setError(null);
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setLangField = (field: 'name' | 'short_description' | 'description', l: Lang, v: string) =>
    setForm((prev) => ({ ...prev, [field]: { ...prev[field], [l]: v } }));

  // ── AI Translate ──────────────────────────────────────────────────────────────

  const handleTranslate = async () => {
    const srcName = form.name.en || form.name.de;
    if (!srcName) { alert('Enter an EN or DE name first.'); return; }
    setTranslating(true);
    try {
      const res = await fetch('/api/admin/translate-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name_en: form.name.en || form.name.de,
          short_description_en: form.short_description.en || form.short_description.de,
          description_en: form.description.en || form.description.de,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Translate failed');
      setForm((f) => ({
        ...f,
        name:              { ...f.name,              fr: f.name.fr              || json.name_fr              || '', es: f.name.es              || json.name_es              || '', it: f.name.it              || json.name_it              || '' },
        short_description: { ...f.short_description, fr: f.short_description.fr || json.short_description_fr || '', es: f.short_description.es || json.short_description_es || '', it: f.short_description.it || json.short_description_it || '' },
        description:       { ...f.description,       fr: f.description.fr       || json.description_fr       || '', es: f.description.es       || json.description_es       || '', it: f.description.it       || json.description_it       || '' },
      }));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setTranslating(false);
    }
  };

  // ── AI Rewrite ────────────────────────────────────────────────────────────────

  const handleRewrite = async () => {
    const name = form.name[lang];
    const short = form.short_description[lang];
    const desc = form.description[lang];
    if (!name && !short && !desc) return;
    setRewriteStatus('loading');
    try {
      const res = await fetch('/api/admin/rewrite-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, short_description: short, description: desc, language: lang }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Rewrite failed');
      setForm((f) => ({
        ...f,
        name:              { ...f.name,              [lang]: json.name              ?? f.name[lang] },
        short_description: { ...f.short_description, [lang]: json.short_description ?? f.short_description[lang] },
        description:       { ...f.description,       [lang]: json.description       ?? f.description[lang] },
      }));
      setRewriteStatus('done');
    } catch {
      setRewriteStatus('error');
    }
  };

  // ── AI Style ──────────────────────────────────────────────────────────────────

  const handleStyle = async () => {
    const desc = form.description[lang];
    if (!desc) return;
    setStyleStatus('loading');
    try {
      const res = await fetch('/api/admin/style-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: desc, language: lang }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Style failed');
      if (json.description) {
        setForm((f) => ({ ...f, description: { ...f.description, [lang]: json.description } }));
      }
      setStyleStatus('done');
    } catch {
      setStyleStatus('error');
    }
  };

  // ── Quick Import ──────────────────────────────────────────────────────────────

  const handleQuickImport = async (text: string) => {
    if (!text.trim()) return;
    setQuickImportParsing(true);
    setQuickImportError(null);
    setQuickImportResult(null);
    try {
      const res = await fetch('/api/admin/parse-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Parse failed');
      setQuickImportResult(json as ParsedProduct);
    } catch (e: unknown) {
      setQuickImportError(e instanceof Error ? e.message : String(e));
    } finally {
      setQuickImportParsing(false);
    }
  };

  const handleApplyParsed = (result: ParsedProduct) => {
    setForm((f) => ({
      ...f,
      name:              { ...f.name,              en: result.name_en || f.name.en },
      short_description: { ...f.short_description, en: result.short_description_en || f.short_description.en },
      description:       { ...f.description,       en: result.description_en || f.description.en },
      price_chf:         result.suggested_price_chf != null ? String(result.suggested_price_chf) : f.price_chf,
      product_type:      result.suggested_product_type ?? f.product_type,
      marker_count:      result.marker_count != null ? String(result.marker_count) : f.marker_count,
    }));
    setQuickImportResult(null);
    setQuickImportOpen(false);
    setLang('en');
    setOpenSections((prev) => ({ ...prev, content: true, details: true, pricing: true }));
  };

  // ── Test items toggle ─────────────────────────────────────────────────────────

  const handleToggleItem = async (definitionId: string, checked: boolean) => {
    setIncludedItemIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(definitionId); else next.delete(definitionId);
      return next;
    });
    if (checked) {
      await supabase.from('product_biomarkers').insert({
        product_id: editingId!,
        biomarker_id: definitionId,
        quantity: 1,
        sort_order: 0,
      });
    } else {
      await supabase.from('product_biomarkers')
        .delete()
        .eq('product_id', editingId!)
        .eq('biomarker_id', definitionId);
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.name.de.trim() && !form.name.en.trim()) {
      setError('Name (DE or EN) is required.');
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      name: { de: form.name.de, en: form.name.en, fr: form.name.fr, es: form.name.es, it: form.name.it },
      sku: form.sku.trim() || null,
      slug: form.slug.trim() || slugify(form.name.de || form.name.en),
      short_description: { de: form.short_description.de, en: form.short_description.en, fr: form.short_description.fr, es: form.short_description.es, it: form.short_description.it },
      description: { de: form.description.de, en: form.description.en, fr: form.description.fr, es: form.description.es, it: form.description.it },
      price_chf: form.price_chf ? Number(form.price_chf) : null,
      price_eur: form.price_eur ? Number(form.price_eur) : null,
      compare_at_price_chf: form.compare_at_price_chf ? Number(form.compare_at_price_chf) : null,
      compare_at_price_eur: form.compare_at_price_eur ? Number(form.compare_at_price_eur) : null,
      tax_class: form.tax_class || null,
      product_type: form.product_type || null,
      metadata: form.marker_count ? { marker_count: Number(form.marker_count) } : null,
      sort_order: form.sort_order ? Number(form.sort_order) : null,
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

      // Update cover image URL (already uploaded by CoverImageUploader)
      await supabase.from('products').update({ image_url: coverImageUrl }).eq('id', productId!);

      // Save gallery (images already uploaded by GalleryUploader)
      await supabase.from('products').update({ gallery_urls: galleryUrls }).eq('id', productId!);

      await refresh();
      closePanel();
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setError(typeof e === 'object' && e && 'message' in e ? (e as any).message : String(e));
    } finally {
      setSaving(false);
    }
  };

  // ── Delete / restore ──────────────────────────────────────────────────────────

  const handleDelete = async (p: Product) => {
    if (!confirm(`Delete "${p.name?.de || p.name?.en || p.sku || 'this product'}"? This is a soft-delete.`)) return;
    if (p.image_url) await deleteImage(p.image_url);
    await supabase.from('products').update({ deleted_at: new Date().toISOString(), image_url: null }).eq('id', p.id);
    await refresh();
  };

  const handleRestore = async (p: Product) => {
    await supabase.from('products').update({ deleted_at: null }).eq('id', p.id);
    await refresh();
  };

  // ── Filtered list ─────────────────────────────────────────────────────────────

  const [sortCol, setSortCol] = useState<'name' | 'product_type' | 'price_chf' | 'is_active'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
  };

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

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortCol === 'name') cmp = (locName(a.name)).localeCompare(locName(b.name));
    else if (sortCol === 'product_type') cmp = (a.product_type ?? '').localeCompare(b.product_type ?? '');
    else if (sortCol === 'price_chf') cmp = (a.price_chf ?? 0) - (b.price_chf ?? 0);
    else cmp = (a.is_active ? 0 : 1) - (b.is_active ? 0 : 1);
    return sortDir === 'asc' ? cmp : -cmp;
  }), [filtered, sortCol, sortDir]);

  const isTestType = ['blood_test', 'clinical_test', 'epigenetic_test', 'genetic_test', 'microbiome_test', 'addon_test'].includes(form.product_type);

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
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0e393d] text-white text-sm font-medium hover:bg-[#0e393d]/90 transition">
          <span className="text-lg leading-none">+</span> New Product
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input type="text" placeholder="Search by name, SKU, type…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/3">
              <th className="px-4 py-3 w-16"></th>
              {([
                { key: 'name',         label: 'Name / SKU' },
                { key: 'product_type', label: 'Type'       },
                { key: null,           label: 'Biomarkers' },
                { key: 'price_chf',    label: 'CHF'        },
                { key: null,           label: 'EUR'        },
                { key: null,           label: 'Stripe'     },
                { key: 'is_active',    label: 'Status'     },
                { key: null,           label: 'Actions'    },
              ] as { key: typeof sortCol | null; label: string }[]).map(({ key, label }) => (
                <th
                  key={label}
                  onClick={key ? () => handleSort(key) : undefined}
                  className={`px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider${key ? ' cursor-pointer select-none hover:text-[#0e393d]' : ''}`}
                >
                  {label}{key ? <>{' '}{sortCol === key && sortDir === 'asc' ? '▲' : sortCol === key && sortDir === 'desc' ? '▼' : <span className="opacity-0">▲</span>}</> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0e393d]/6">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-[#1c2a2b]/40">No products found.</td>
              </tr>
            )}
            {sorted.map((p) => (
              <tr key={p.id} onClick={() => openEdit(p)} className={`cursor-pointer hover:bg-[#fafaf8] transition-colors ${p.deleted_at ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt="" className="w-9 h-9 min-w-[36px] rounded-lg object-cover border border-[#0e393d]/10" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-[#0e393d]/6 flex items-center justify-center text-[#0e393d]/30">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-[#0e393d]">{p.name?.en || p.name?.de || <span className="text-[#1c2a2b]/30">—</span>}</div>
                  {p.name?.de && p.name?.en && p.name.de !== p.name.en && (
                    <div className="text-xs text-[#1c2a2b]/35 mt-0.5">{p.name.de}</div>
                  )}
                  {p.sku && <div className="text-xs text-[#1c2a2b]/40 font-mono mt-0.5">{p.sku}</div>}
                </td>
                <td className="px-4 py-3">
                  <Badge color="gold">{p.product_type ?? '—'}</Badge>
                  {p.is_featured && <span className="ml-1.5"><Badge color="gold">★</Badge></span>}
                </td>
                <td className="px-4 py-3">
                  {biomarkerCounts[p.id]
                    ? <span className="tabular-nums text-sm font-medium text-[#0e393d]">{biomarkerCounts[p.id]}</span>
                    : <span className="text-[#1c2a2b]/25">—</span>
                  }
                </td>
                <td className="px-4 py-3 text-[#1c2a2b]/70 tabular-nums">{chf(p.price_chf)}</td>
                <td className="px-4 py-3 text-[#1c2a2b]/70 tabular-nums">{p.price_eur != null ? `€${p.price_eur}` : '—'}</td>
                <td className="px-4 py-3">
                  {p.stripe_product_id
                    ? <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" title={p.stripe_product_id} />
                    : <span className="inline-block w-2 h-2 rounded-full bg-red-300" title="No Stripe product ID" />
                  }
                </td>
                <td className="px-4 py-3"><StatusBadge product={p} /></td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(p)}
                      className="px-3 py-1 rounded-md text-xs font-medium text-[#0e393d] bg-[#0e393d]/8 hover:bg-[#0e393d]/15 transition">
                      Edit
                    </button>
                    {p.deleted_at ? (
                      <button onClick={() => handleRestore(p)}
                        className="px-3 py-1 rounded-md text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition">
                        Restore
                      </button>
                    ) : (
                      <button onClick={() => handleDelete(p)}
                        className="px-3 py-1 rounded-md text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition">
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

      {/* ── Slide-over panel ──────────────────────────────────────────────────── */}
      {panelOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]" onClick={closePanel} />

          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-3xl flex-col bg-white shadow-2xl">

            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-[#0e393d]/10 px-6 py-4 shrink-0">
              <h2 className="font-serif text-lg text-[#0e393d]">
                {editingId ? 'Edit Product' : 'New Product'}
              </h2>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {/* Lang tabs */}
                <div className="flex rounded-lg border border-[#0e393d]/15 overflow-hidden text-xs">
                  {(['de', 'en', 'es', 'fr', 'it'] as Lang[]).map((l) => (
                    <button key={l} onClick={() => setLang(l)}
                      className={`px-2.5 py-1.5 font-medium transition ${lang === l ? 'bg-[#0e393d] text-white' : 'text-[#1c2a2b]/60 hover:bg-[#0e393d]/5'}`}>
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
                <button onClick={closePanel} className="text-[#1c2a2b]/40 hover:text-[#1c2a2b] transition ml-1">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">

              {/* ── Quick Import ─────────────────────────────────────────── */}
              <div className="mb-5">
                <button type="button" onClick={() => setQuickImportOpen((v) => !v)}
                  className="flex w-full items-center justify-between group">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-[#ceab84]">Quick Import</span>
                    <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-600">AI-powered</span>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
                    className={`text-[#0e393d]/30 group-hover:text-[#0e393d]/60 transition-transform ${quickImportOpen ? 'rotate-180' : ''}`}>
                    <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {quickImportOpen && (
                  <div className="mt-3 space-y-3">
                    {!quickImportResult && !quickImportParsing && (
                      <div
                        className="rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/40 p-4 space-y-3"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); const t = e.dataTransfer.getData('text'); if (t) { handleQuickImport(t); } }}
                      >
                        <div className="flex flex-col items-center gap-2 py-1 text-center">
                          <span className="text-2xl">📋</span>
                          <p className="text-sm font-medium text-violet-800">Paste product info from any source</p>
                          <p className="text-xs text-violet-500">Product page, PDF, spec sheet, or any text</p>
                          <button
                            type="button"
                            disabled={quickImportParsing}
                            onClick={async () => {
                              try {
                                const t = await navigator.clipboard.readText();
                                if (t) handleQuickImport(t);
                              } catch { /* permission denied */ }
                            }}
                            className="mt-1 flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition"
                          >
                            📋 Paste from clipboard
                          </button>
                        </div>
                        <div className="relative">
                          <span className="absolute inset-x-0 top-0 flex justify-center -translate-y-1/2">
                            <span className="bg-violet-50 px-2 text-[10px] text-violet-400">or type / paste below</span>
                          </span>
                          <textarea
                            value={quickImportText}
                            onChange={(e) => setQuickImportText(e.target.value)}
                            onPaste={(e) => { const t = e.clipboardData.getData('text'); if (t) { e.preventDefault(); handleQuickImport(t); } }}
                            rows={4}
                            placeholder="Paste product text here…"
                            className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200 transition resize-none mt-2"
                          />
                          {quickImportText.trim() && (
                            <div className="flex justify-end mt-1">
                              <button type="button" onClick={() => { handleQuickImport(quickImportText); setQuickImportText(''); }}
                                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 transition">
                                Parse with AI
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {quickImportParsing && (
                      <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-4">
                        <svg className="animate-spin h-4 w-4 text-violet-500 shrink-0" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        <p className="text-sm text-violet-700">Parsing product with AI…</p>
                      </div>
                    )}
                    {quickImportError && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {quickImportError}
                        <button type="button" onClick={() => setQuickImportError(null)} className="ml-2 text-xs underline">Dismiss</button>
                      </div>
                    )}
                    {quickImportResult && (
                      <ParsedProductCard
                        result={quickImportResult}
                        onApply={() => handleApplyParsed(quickImportResult)}
                        onDiscard={() => setQuickImportResult(null)}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* ── Content ──────────────────────────────────────────────── */}
              <SectionBlock title={`Content — ${lang.toUpperCase()}`} open={openSections.content} onToggle={() => toggleSection('content')}>
                <div className="space-y-4">
                  <Field label={`Name (${lang.toUpperCase()}) *`}>
                    <input className={inputCls} value={form.name[lang]}
                      onChange={(e) => setLangField('name', lang, e.target.value)}
                      placeholder={lang === 'de' ? 'z.B. Longevity Pro' : 'e.g. Longevity Pro'}
                    />
                  </Field>

                  <Field label={`Short Description (${lang.toUpperCase()})`} hint="Card subtitle — 1 sentence">
                    <textarea className={inputCls + ' resize-none'} rows={2}
                      value={form.short_description[lang]}
                      onChange={(e) => setLangField('short_description', lang, e.target.value)}
                      placeholder={lang === 'de' ? 'Ein Satz für die Produktkarte…' : 'One sentence for the product card…'}
                    />
                  </Field>

                  <Field label={`Description (${lang.toUpperCase()})`} hint="Markdown supported">
                    <div className="rounded-lg border border-[#0e393d]/15 overflow-hidden focus-within:border-[#0e393d]/40 focus-within:ring-2 focus-within:ring-[#0e393d]/10 transition">
                      <MarkdownToolbar taRef={descRef} value={form.description[lang]}
                        onChange={(v) => setLangField('description', lang, v)} />
                      <textarea
                        ref={descRef}
                        className="w-full bg-white px-3 py-2 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 focus:outline-none resize-y"
                        rows={5}
                        value={form.description[lang]}
                        onChange={(e) => setLangField('description', lang, e.target.value)}
                        placeholder={lang === 'de' ? 'Ausführliche Produktbeschreibung…' : 'Full product description…'}
                      />
                    </div>
                    <div className="flex justify-end gap-2 mt-1.5 flex-wrap">
                      <AiBtn onClick={() => { setRewriteStatus('idle'); handleRewrite(); }}
                        disabled={!form.name[lang] && !form.description[lang]}
                        status={rewriteStatus} idle="✦ Rewrite & Proofread" loading="Rewriting…" done="✓ Rewritten" color="amber" />
                      <AiBtn onClick={() => { setStyleStatus('idle'); handleStyle(); }}
                        disabled={!form.description[lang]}
                        status={styleStatus} idle="✦ AI Style" loading="Styling…" done="✓ Styled" color="sky" />
                      <button onClick={handleTranslate} disabled={translating}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#ceab84]/40 text-[10px] font-medium text-[#8a6a3e] hover:bg-[#ceab84]/10 disabled:opacity-50 transition whitespace-nowrap">
                        {translating ? '…' : '✦ AI Translate all'}
                      </button>
                    </div>
                  </Field>
                </div>
              </SectionBlock>

              {/* ── Details ──────────────────────────────────────────────── */}
              <SectionBlock title="Details" open={openSections.details} onToggle={() => toggleSection('details')}>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="SKU">
                      <input className={inputCls} value={form.sku} onChange={(e) => setField('sku', e.target.value)} placeholder="EVD-PRO-001" />
                    </Field>
                    <Field label="Slug">
                      <input className={inputCls} value={form.slug} onChange={(e) => setField('slug', e.target.value)} placeholder="longevity-pro" />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Product Type">
                      <select className={selectCls} value={form.product_type} onChange={(e) => setField('product_type', e.target.value)}>
                        {PRODUCT_TYPES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </Field>
                    <Field label="Marker Count">
                      <input type="number" className={inputCls} value={form.marker_count}
                        onChange={(e) => setField('marker_count', e.target.value)} placeholder="23" min={0} />
                    </Field>
                  </div>
                </div>
              </SectionBlock>

              {/* ── Pricing ──────────────────────────────────────────────── */}
              <SectionBlock title="Pricing" open={openSections.pricing} onToggle={() => toggleSection('pricing')}>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Price CHF">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#1c2a2b]/40">CHF</span>
                        <input type="number" className={inputCls + ' pl-11'} value={form.price_chf}
                          onChange={(e) => setField('price_chf', e.target.value)} placeholder="299" min={0} step={0.01} />
                      </div>
                    </Field>
                    <Field label="Price EUR">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#1c2a2b]/40">€</span>
                        <input type="number" className={inputCls + ' pl-7'} value={form.price_eur}
                          onChange={(e) => setField('price_eur', e.target.value)} placeholder="279" min={0} step={0.01} />
                      </div>
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Compare-at CHF" hint="Strikethrough price">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#1c2a2b]/40">CHF</span>
                        <input type="number" className={inputCls + ' pl-11'} value={form.compare_at_price_chf}
                          onChange={(e) => setField('compare_at_price_chf', e.target.value)} placeholder="399" min={0} step={0.01} />
                      </div>
                    </Field>
                    <Field label="Compare-at EUR" hint="Strikethrough price">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#1c2a2b]/40">€</span>
                        <input type="number" className={inputCls + ' pl-7'} value={form.compare_at_price_eur}
                          onChange={(e) => setField('compare_at_price_eur', e.target.value)} placeholder="379" min={0} step={0.01} />
                      </div>
                    </Field>
                  </div>
                  <Field label="Tax Class">
                    <select className={selectCls} value={form.tax_class} onChange={(e) => setField('tax_class', e.target.value)}>
                      {TAX_CLASSES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                  {editingId && (() => {
                    const p = products.find((x) => x.id === editingId);
                    if (!p?.stripe_product_id && !p?.stripe_price_id_chf) return null;
                    return (
                      <div className="rounded-lg bg-[#0e393d]/4 px-3 py-2.5 space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#0e393d]/50">Stripe IDs (read-only)</p>
                        {p.stripe_product_id && (
                          <p className="text-[11px] font-mono text-[#1c2a2b]/60 break-all">Product: {p.stripe_product_id}</p>
                        )}
                        {p.stripe_price_id_chf && (
                          <p className="text-[11px] font-mono text-[#1c2a2b]/60 break-all">Price CHF: {p.stripe_price_id_chf}</p>
                        )}
                        {p.stripe_price_id_eur && (
                          <p className="text-[11px] font-mono text-[#1c2a2b]/60 break-all">Price EUR: {p.stripe_price_id_eur}</p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </SectionBlock>

              {/* ── Settings ─────────────────────────────────────────────── */}
              <SectionBlock title="Settings" open={openSections.settings} onToggle={() => toggleSection('settings')}>
                <div className="space-y-3">
                  <Field label="Sort Order" hint="Lower numbers appear first">
                    <input type="number" className={inputCls} value={form.sort_order}
                      onChange={(e) => setField('sort_order', e.target.value)} placeholder="10" min={0} step={1} />
                  </Field>
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
                        <Toggle checked={form[key] as boolean} onChange={(v) => setField(key, v)} />
                      </div>
                    ))}
                  </div>
                </div>
              </SectionBlock>

              {/* ── Included Test Items ───────────────────────────────────── */}
              {isTestType && (
                <SectionBlock
                  title="Included Test Items"
                  open={openSections.testItems}
                  onToggle={() => toggleSection('testItems')}
                  badge={editingId ? <SectionBadge>{includedItemIds.size} / {allDefinitions.length}</SectionBadge> : undefined}
                >
                  {!editingId ? (
                    <p className="rounded-lg bg-[#0e393d]/5 px-4 py-3 text-sm text-[#1c2a2b]/50">
                      Save the product first to manage included test items.
                    </p>
                  ) : (
                    <>
                      <input type="text" placeholder="Search items…"
                        value={itemsSearch} onChange={(e) => setItemsSearch(e.target.value)}
                        className={inputCls + ' mb-3'} />
                      <div className="max-h-64 overflow-y-auto rounded-lg border border-[#0e393d]/10 divide-y divide-[#0e393d]/6">
                        {(() => {
                          const filteredDefs = allDefinitions.filter((d) => {
                            if (!itemsSearch) return true;
                            const q = itemsSearch.toLowerCase();
                            const n = d.name?.en || d.name?.de || '';
                            return n.toLowerCase().includes(q) || d.item_type?.toLowerCase().includes(q);
                          });
                          if (filteredDefs.length === 0) {
                            return <p className="px-4 py-6 text-center text-sm text-[#1c2a2b]/30">No items match.</p>;
                          }
                          return filteredDefs.map((d) => {
                            const checked = includedItemIds.has(d.id);
                            const label = d.name?.en || d.name?.de || d.id;
                            return (
                              <label key={d.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[#0e393d]/3 transition">
                                <input type="checkbox" checked={checked}
                                  onChange={(e) => handleToggleItem(d.id, e.target.checked)}
                                  className="rounded border-[#0e393d]/30 text-[#0e393d] focus:ring-[#0e393d]/20" />
                                <span className="flex-1 text-sm text-[#1c2a2b]">{label}</span>
                                {d.item_type && (
                                  <span className="text-[10px] text-[#1c2a2b]/35 font-mono shrink-0">{d.item_type}</span>
                                )}
                              </label>
                            );
                          });
                        })()}
                      </div>
                    </>
                  )}
                </SectionBlock>
              )}

              {/* ── Gallery ──────────────────────────────────────────────── */}
              <SectionBlock
                title="Photo Gallery"
                open={openSections.gallery}
                onToggle={() => toggleSection('gallery')}
                badge={<SectionBadge>{galleryUrls.length} / 10</SectionBadge>}
              >
                <GalleryUploader
                  urls={galleryUrls}
                  bucket="product-images"
                  maxImages={10}
                  outputWidth={1200}
                  label=""
                  hint="Additional product photos. Up to 10 images."
                  onUrlsChange={setGalleryUrls}
                />
              </SectionBlock>

              {/* ── Cover Image ───────────────────────────────────────────── */}
              <SectionBlock title="Cover Image" open={openSections.cover} onToggle={() => toggleSection('cover')}>
                <CoverImageUploader
                  currentUrl={coverImageUrl}
                  bucket="product-images"
                  aspect={1}
                  outputWidth={800}
                  outputHeight={800}
                  hint="1:1 square · max 5 MB"
                  onUrlChange={setCoverImageUrl}
                />
              </SectionBlock>

            </div>

            {/* Panel footer */}
            <div className="border-t border-[#0e393d]/10 px-6 py-4 shrink-0">
              {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
              <div className="flex gap-3">
                <button onClick={closePanel}
                  className="flex-1 rounded-lg border border-[#0e393d]/15 py-2.5 text-sm font-medium text-[#1c2a2b] hover:bg-[#fafaf8] transition">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 rounded-lg bg-[#0e393d] py-2.5 text-sm font-medium text-white hover:bg-[#0e393d]/90 disabled:opacity-50 transition">
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
