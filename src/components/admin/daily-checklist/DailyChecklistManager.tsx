'use client';

import { useCallback, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  AdminPageHeader,
  AdminPrimaryButton,
  AdminSearchField,
  AdminTable,
  AdminTableHead,
  AdminTh,
  AdminTableFooter,
  AdminEmptyRow,
  AdminBadge,
  AdminPanel,
  AdminPanelFooter,
  AdminField,
  AdminToggle,
  StatCard,
  StatCardRow,
  inputCls,
  selectCls,
} from '../shared/AdminUI';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChecklistItemRow = {
  id: string;
  framework: 'daily_dozen' | '21_tweaks' | 'anti_aging';
  category: string;
  name_en: string;
  name_de: string | null;
  name_fr: string | null;
  name_es: string | null;
  name_it: string | null;
  description_en: string | null;
  description_de: string | null;
  description_fr: string | null;
  description_es: string | null;
  description_it: string | null;
  target_servings: number;
  unit: string | null;
  biomarker_tags: string[];
  linked_lesson_ids: string[];
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DDCategoryRow = {
  id: string;
  slug: string;
  name: { de?: string; en?: string; fr?: string; es?: string; it?: string };
  icon: string;
  target_servings: number;
  sort_order: number;
  details: Record<string, unknown> | null;
  created_at: string;
};

type FormData = Omit<ChecklistItemRow, 'id' | 'created_at' | 'updated_at' | 'linked_lesson_ids'>;
type TabId = 'daily_dozen' | '21_tweaks' | 'anti_aging';

const EDITABLE_FRAMEWORKS = [
  { value: '21_tweaks' as const, label: '21 Tweaks', color: 'purple' as const },
  { value: 'anti_aging' as const, label: 'Anti-Aging', color: 'gold' as const },
];

const ALL_FRAMEWORKS = [
  { value: 'daily_dozen' as const, label: 'Daily Dozen', color: 'green' as const },
  ...EDITABLE_FRAMEWORKS,
];

const UNITS = ['servings', 'times', 'cups', 'minutes', 'tablespoons'] as const;

const EMPTY_FORM: FormData = {
  framework: '21_tweaks',
  category: '',
  name_en: '',
  name_de: null,
  name_fr: null,
  name_es: null,
  name_it: null,
  description_en: null,
  description_de: null,
  description_fr: null,
  description_es: null,
  description_it: null,
  target_servings: 1,
  unit: 'servings',
  biomarker_tags: [],
  icon: null,
  sort_order: 0,
  is_active: true,
};

function fwColor(fw: string): 'green' | 'purple' | 'gold' {
  const map: Record<string, 'green' | 'purple' | 'gold'> = { daily_dozen: 'green', '21_tweaks': 'purple', anti_aging: 'gold' };
  return map[fw] ?? 'green';
}

function fwLabel(fw: string): string {
  return ALL_FRAMEWORKS.find(f => f.value === fw)?.label ?? fw;
}

// ─── Language support ────────────────────────────────────────────────────────

type Lang = 'en' | 'de' | 'fr' | 'es' | 'it';
const ALL_LANGS: Lang[] = ['en', 'de', 'fr', 'es', 'it'];
const LANG_LABELS: Record<Lang, string> = { en: 'EN', de: 'DE', fr: 'FR', es: 'ES', it: 'IT' };

const LANG_PLACEHOLDERS: Record<Lang, { name: string; description: string }> = {
  en: { name: 'e.g. Preload Water', description: 'What to do…' },
  de: { name: 'z.B. Wasser vor dem Essen', description: 'Deutsche Beschreibung…' },
  fr: { name: 'ex. Eau avant les repas', description: 'Description en français…' },
  es: { name: 'ej. Agua antes de comer', description: 'Descripción en español…' },
  it: { name: 'es. Acqua prima dei pasti', description: 'Descrizione in italiano…' },
};

function nameField(l: Lang): keyof FormData { return `name_${l}` as keyof FormData; }
function descField(l: Lang): keyof FormData { return `description_${l}` as keyof FormData; }

// ─── Component ────────────────────────────────────────────────────────────────

export default function DailyChecklistManager({
  initialItems,
  dailyDozenCategories,
}: {
  initialItems: ChecklistItemRow[];
  dailyDozenCategories: DDCategoryRow[];
}) {
  const supabase = createClient();
  const [items, setItems] = useState<ChecklistItemRow[]>(initialItems);
  const [activeTab, setActiveTab] = useState<TabId>('daily_dozen');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null | 'new'>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>('en');
  const [translateStatus, setTranslateStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [rewriteStatus, setRewriteStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const [sortCol, setSortCol] = useState<'name' | 'category' | 'sort_order'>('sort_order');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const handleSort = (col: string) => {
    const c = col as typeof sortCol;
    if (sortCol === c) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(c); setSortDir('asc'); }
  };

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('daily_checklist_items')
      .select('*')
      .order('framework')
      .order('sort_order');
    if (data) setItems(data);
  }, [supabase]);

  // Filter items by active tab
  const tabItems = items.filter(i => i.framework === activeTab);
  const filtered = tabItems.filter(item => {
    if (!search) return true;
    const q = search.toLowerCase();
    return item.name_en.toLowerCase().includes(q) || (item.name_de ?? '').toLowerCase().includes(q) || (item.name_fr ?? '').toLowerCase().includes(q) || (item.name_es ?? '').toLowerCase().includes(q) || (item.name_it ?? '').toLowerCase().includes(q) || item.category.includes(q);
  });

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortCol === 'name') cmp = a.name_en.localeCompare(b.name_en);
    else if (sortCol === 'category') cmp = a.category.localeCompare(b.category);
    else cmp = a.sort_order - b.sort_order;
    return sortDir === 'asc' ? cmp : -cmp;
  }), [filtered, sortCol, sortDir]);

  // DD categories filtered by search
  const filteredDD = dailyDozenCategories.filter(cat => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (cat.name.en ?? '').toLowerCase().includes(q) || (cat.name.de ?? '').toLowerCase().includes(q) || cat.slug.includes(q);
  });

  // Stats
  const tweaksCount = items.filter(i => i.framework === '21_tweaks').length;
  const antiAgingCount = items.filter(i => i.framework === 'anti_aging').length;
  const ddCount = dailyDozenCategories.length;
  const totalCount = ddCount + tweaksCount + antiAgingCount;

  const openNew = () => {
    setForm({ ...EMPTY_FORM, framework: activeTab === 'daily_dozen' ? '21_tweaks' : activeTab });
    setEditingId('new');
    setError(null);
  };

  const openEdit = (item: ChecklistItemRow) => {
    setForm({
      framework: item.framework,
      category: item.category,
      name_en: item.name_en,
      name_de: item.name_de,
      name_fr: item.name_fr,
      name_es: item.name_es,
      name_it: item.name_it,
      description_en: item.description_en,
      description_de: item.description_de,
      description_fr: item.description_fr,
      description_es: item.description_es,
      description_it: item.description_it,
      target_servings: item.target_servings,
      unit: item.unit,
      biomarker_tags: item.biomarker_tags ?? [],
      icon: item.icon,
      sort_order: item.sort_order,
      is_active: item.is_active,
    });
    setEditingId(item.id);
    setError(null);
  };

  // Translate to all languages
  const handleTranslate = async () => {
    const name = form[nameField(lang)] as string;
    const description = form[descField(lang)] as string;
    if (!name && !description) return;
    setTranslateStatus('loading');
    try {
      const fields: Record<string, string> = {};
      if (name?.trim()) fields.name = name;
      if (description?.trim()) fields.description = description;
      const res = await fetch('/api/admin/translate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields,
          source_language: lang,
          context: 'Daily health checklist item for a WFPB (whole-food plant-based) lifestyle app. Keep translations short and actionable.',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Translation failed');
      const t = json.translations as Record<string, { name?: string; description?: string }>;
      const targets = ALL_LANGS.filter(l => l !== lang);
      setForm(f => {
        const updates: Record<string, string | null> = {};
        targets.forEach(l => {
          if (t[l]?.name) updates[`name_${l}`] = t[l].name!;
          if (t[l]?.description) updates[`description_${l}`] = t[l].description!;
        });
        return { ...f, ...updates };
      });
      setTranslateStatus('done');
    } catch {
      setTranslateStatus('error');
    }
  };

  // Rewrite & Proofread current language
  const handleRewrite = async () => {
    const name = (form[nameField(lang)] as string)?.trim();
    const description = (form[descField(lang)] as string)?.trim();
    if (!name && !description) return;
    setRewriteStatus('loading');
    try {
      const fields: Record<string, string> = {};
      if (name) fields.name = name;
      if (description) fields.description = description;
      const res = await fetch('/api/admin/rewrite-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields,
          language: lang,
          context: 'Daily health checklist item for a WFPB lifestyle app. Keep it short and actionable.',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Rewrite failed');
      setForm(f => ({
        ...f,
        ...(json.name ? { [nameField(lang)]: json.name } : {}),
        ...(json.description ? { [descField(lang)]: json.description } : {}),
      }));
      setRewriteStatus('done');
    } catch {
      setRewriteStatus('error');
    }
  };

  const handleSave = async () => {
    setError(null);
    if (!form.name_en.trim()) { setError('Name (EN) is required'); return; }
    if (!form.category.trim()) { setError('Category is required'); return; }

    setSaving(true);
    try {
      const payload = {
        framework: form.framework,
        category: form.category.trim(),
        name_en: form.name_en.trim(),
        name_de: form.name_de?.trim() || null,
        name_fr: form.name_fr?.trim() || null,
        name_es: form.name_es?.trim() || null,
        name_it: form.name_it?.trim() || null,
        description_en: form.description_en?.trim() || null,
        description_de: form.description_de?.trim() || null,
        description_fr: form.description_fr?.trim() || null,
        description_es: form.description_es?.trim() || null,
        description_it: form.description_it?.trim() || null,
        target_servings: form.target_servings,
        unit: form.unit,
        biomarker_tags: form.biomarker_tags,
        icon: form.icon?.trim() || null,
        sort_order: form.sort_order,
        is_active: form.is_active,
      };

      if (editingId === 'new') {
        const { error: insertErr } = await supabase.from('daily_checklist_items').insert(payload);
        if (insertErr) throw insertErr;
      } else {
        const { error: updateErr } = await supabase.from('daily_checklist_items').update(payload).eq('id', editingId);
        if (updateErr) throw updateErr;
      }
      await refresh();
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('daily_checklist_items').update({ is_active: !current }).eq('id', id);
    await refresh();
  };

  return (
    <div className="p-8">
      <AdminPageHeader
        title="Daily Checklist"
        subtitle={`${totalCount} items across 3 frameworks · DD ${ddCount} + Tweaks ${tweaksCount} + Anti-Aging ${antiAgingCount}`}
        action={activeTab !== 'daily_dozen' ? <AdminPrimaryButton onClick={openNew} label="New Item" /> : undefined}
      />

      {/* Stats */}
      <StatCardRow>
        <StatCard value={totalCount} label="Total Items" />
        <StatCard value={ddCount} label="Daily Dozen" detail="Managed via Daily Dozen categories table" variant="emerald" />
        <StatCard value={tweaksCount} label="21 Tweaks" detail="How Not to Diet" variant="purple" />
        <StatCard value={antiAgingCount} label="Anti-Aging 8" detail="How Not to Age" variant="gold" />
      </StatCardRow>

      {/* Framework Tabs */}
      <div className="border-b border-[#0e393d]/8 mb-4">
        <div className="flex gap-1">
          {ALL_FRAMEWORKS.map(fw => {
            const count = fw.value === 'daily_dozen' ? ddCount : items.filter(i => i.framework === fw.value).length;
            const isActive = activeTab === fw.value;
            return (
              <button
                key={fw.value}
                onClick={() => { setActiveTab(fw.value); setSearch(''); }}
                className={`relative px-4 py-2.5 text-sm font-medium transition-colors rounded-t-lg ${
                  isActive
                    ? 'text-[#0e393d] bg-white'
                    : 'text-[#0e393d]/45 hover:text-[#0e393d]/70 hover:bg-[#0e393d]/[0.03]'
                }`}
              >
                {fw.label}
                <span className={`ml-1.5 text-xs ${isActive ? 'text-[#0e393d]/60' : 'text-[#0e393d]/30'}`}>({count})</span>
                {isActive && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#0e393d] rounded-full" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <AdminSearchField value={search} onChange={setSearch} placeholder="Search items…" />
      </div>

      {/* ─── Daily Dozen Tab (read-only from daily_dozen_categories) ──── */}
      {activeTab === 'daily_dozen' && (
        <>
          <div className="mb-3 px-3 py-2 rounded-lg bg-emerald-50/50 border border-emerald-200/40 text-xs text-emerald-700">
            Daily Dozen categories are managed in the <strong>daily_dozen_categories</strong> table with rich multilingual data, serving sizes, and food lists.
            They are linked to recipes via ingredients. Edit individual categories in the database or via the Biomarkers Manager.
          </div>
          <AdminTable>
            <AdminTableHead>
              <AdminTh label="#" className="w-12" />
              <AdminTh label="" className="w-10" />
              <AdminTh label="Name (EN)" />
              <AdminTh label="Name (DE)" />
              <AdminTh label="Slug" className="w-32" />
              <AdminTh label="Target" className="w-24" />
              <AdminTh label="Languages" className="w-24" />
            </AdminTableHead>
            <tbody>
              {filteredDD.length === 0 ? (
                <AdminEmptyRow colSpan={7} message="No categories found" />
              ) : (
                filteredDD.map(cat => (
                  <tr key={cat.id} className="border-b border-[#0e393d]/5 hover:bg-[#fafaf8] transition">
                    <td className="px-3 py-3 text-xs text-[#1c2a2b]/40 font-mono">{cat.sort_order}</td>
                    <td className="px-2 py-3 text-center text-lg">{cat.icon}</td>
                    <td className="px-3 py-3 text-sm font-medium text-[#0e393d]">{cat.name.en ?? '—'}</td>
                    <td className="px-3 py-3 text-sm text-[#1c2a2b]/60">{cat.name.de ?? '—'}</td>
                    <td className="px-3 py-3 text-xs text-[#1c2a2b]/40 font-mono">{cat.slug}</td>
                    <td className="px-3 py-3 text-xs text-[#1c2a2b]/60">{cat.target_servings} servings</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        {Object.keys(cat.name).map(lang => (
                          <span key={lang} className="text-[9px] bg-[#0e393d]/5 text-[#0e393d]/60 px-1.5 py-0.5 rounded uppercase">{lang}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </AdminTable>
          <AdminTableFooter showing={filteredDD.length} total={ddCount} />
        </>
      )}

      {/* ─── 21 Tweaks / Anti-Aging Tabs (editable) ──────────────────── */}
      {activeTab !== 'daily_dozen' && (
        <>
          <AdminTable>
            <AdminTableHead>
              <AdminTh label="#" sortKey="sort_order" active={sortCol === 'sort_order'} direction={sortDir} onSort={handleSort} className="w-12" />
              <AdminTh label="" className="w-10" />
              <AdminTh label="Name" sortKey="name" active={sortCol === 'name'} direction={sortDir} onSort={handleSort} />
              <AdminTh label="Category" sortKey="category" active={sortCol === 'category'} direction={sortDir} onSort={handleSort} className="w-36" />
              <AdminTh label="Target" className="w-24" />
              <AdminTh label="Biomarker Tags" className="w-40" />
              <AdminTh label="Active" className="w-16" />
            </AdminTableHead>
            <tbody>
              {sorted.length === 0 ? (
                <AdminEmptyRow colSpan={7} message={`No ${fwLabel(activeTab)} items found`} />
              ) : (
                sorted.map(item => (
                  <tr
                    key={item.id}
                    onClick={() => openEdit(item)}
                    className="border-b border-[#0e393d]/5 hover:bg-[#fafaf8] cursor-pointer transition"
                  >
                    <td className="px-3 py-3 text-xs text-[#1c2a2b]/40 font-mono">{item.sort_order}</td>
                    <td className="px-2 py-3 text-center text-lg">{item.icon ?? '—'}</td>
                    <td className="px-3 py-3">
                      <div className="text-sm font-medium text-[#0e393d]">{item.name_en}</div>
                      {item.name_de && <div className="text-xs text-[#1c2a2b]/40 mt-0.5">{item.name_de}</div>}
                    </td>
                    <td className="px-3 py-3 text-xs text-[#1c2a2b]/60">{item.category.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-3 text-xs text-[#1c2a2b]/60">
                      {item.target_servings} {item.unit}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(item.biomarker_tags ?? []).slice(0, 3).map(t => (
                          <span key={t} className="text-[9px] bg-[#0e393d]/5 text-[#0e393d]/60 px-1.5 py-0.5 rounded">{t}</span>
                        ))}
                        {(item.biomarker_tags ?? []).length > 3 && (
                          <span className="text-[9px] text-[#1c2a2b]/30">+{item.biomarker_tags.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                      <AdminToggle checked={item.is_active} onChange={() => toggleActive(item.id, item.is_active)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </AdminTable>

          <AdminTableFooter
            showing={sorted.length}
            total={tabItems.length}
            hasFilters={search !== ''}
            onClearFilters={() => setSearch('')}
          />
        </>
      )}

      {/* ─── Edit / New Panel (Tweaks + Anti-Aging only) ─────────────── */}
      <AdminPanel
        open={editingId !== null}
        onClose={() => { setEditingId(null); setLang('en'); setTranslateStatus('idle'); }}
        title={editingId === 'new' ? 'New Checklist Item' : 'Edit Checklist Item'}
        subtitle={editingId !== 'new' ? editingId ?? undefined : undefined}
        headerRight={
          <div className="flex rounded-lg border border-[#0e393d]/15 overflow-hidden text-xs">
            {ALL_LANGS.map(l => (
              <button key={l} onClick={() => setLang(l)} className={`px-2.5 py-1.5 font-medium transition ${lang === l ? 'bg-[#0e393d] text-white' : 'text-[#1c2a2b]/60 hover:bg-[#0e393d]/5'}`}>
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>
        }
        footer={
          <AdminPanelFooter
            error={error}
            saving={saving}
            onCancel={() => setEditingId(null)}
            onSave={handleSave}
            saveLabel={editingId === 'new' ? 'Create Item' : 'Save Changes'}
          />
        }
      >
        <div className="px-6 py-5 space-y-5">
          {/* Icon + Name (language-aware) */}
          <div className="grid grid-cols-[80px_1fr] gap-4">
            <AdminField label="Icon">
              <input className={`${inputCls} text-center text-2xl`} value={form.icon ?? ''} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="🫗" />
            </AdminField>
            <AdminField label={`Name (${lang.toUpperCase()}) ${lang === 'en' ? '*' : ''}`}>
              <input className={inputCls} value={(form[nameField(lang)] as string) ?? ''} onChange={e => setForm(f => ({ ...f, [nameField(lang)]: e.target.value }))} placeholder={LANG_PLACEHOLDERS[lang].name} />
            </AdminField>
          </div>

          {/* Description (language-aware) */}
          <AdminField label={`Description (${lang.toUpperCase()})`}>
            <textarea className={`${inputCls} h-16 resize-none`} value={(form[descField(lang)] as string) ?? ''} onChange={e => setForm(f => ({ ...f, [descField(lang)]: e.target.value }))} placeholder={LANG_PLACEHOLDERS[lang].description} />
          </AdminField>

          {/* AI action buttons */}
          <div className="flex justify-end gap-2 flex-wrap">
            {/* Rewrite & Proofread */}
            <button
              type="button"
              onClick={() => { setRewriteStatus('idle'); handleRewrite(); }}
              disabled={rewriteStatus === 'loading' || (!(form[nameField(lang)] as string)?.trim() && !(form[descField(lang)] as string)?.trim())}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                rewriteStatus === 'done'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : rewriteStatus === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              {rewriteStatus === 'loading' && (
                <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              )}
              {rewriteStatus === 'loading' ? 'Rewriting…' : rewriteStatus === 'done' ? '✓ Rewritten' : rewriteStatus === 'error' ? 'Rewrite failed — retry' : '✦ Rewrite & Proofread'}
            </button>
            {/* Translate to all */}
            <button
              type="button"
              onClick={() => { setTranslateStatus('idle'); handleTranslate(); }}
              disabled={translateStatus === 'loading' || (!(form[nameField(lang)] as string)?.trim() && !(form[descField(lang)] as string)?.trim())}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                translateStatus === 'done'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : translateStatus === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100'
              }`}
            >
              {translateStatus === 'loading' && (
                <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              )}
              {translateStatus === 'loading' ? 'Translating…' : translateStatus === 'done' ? '✓ All languages ready' : translateStatus === 'error' ? 'Translation failed — retry' : '✨ Translate to all'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <AdminField label="Framework *">
              <select className={selectCls} value={form.framework} onChange={e => setForm(f => ({ ...f, framework: e.target.value as FormData['framework'] }))}>
                {EDITABLE_FRAMEWORKS.map(fw => <option key={fw.value} value={fw.value}>{fw.label}</option>)}
              </select>
            </AdminField>
            <AdminField label="Category *">
              <input className={inputCls} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. preload_water" />
            </AdminField>
            <AdminField label="Sort Order">
              <input type="number" className={inputCls} value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
            </AdminField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <AdminField label="Target">
              <input type="number" className={inputCls} min={1} value={form.target_servings} onChange={e => setForm(f => ({ ...f, target_servings: parseInt(e.target.value) || 1 }))} />
            </AdminField>
            <AdminField label="Unit">
              <select className={selectCls} value={form.unit ?? 'servings'} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </AdminField>
          </div>

          {/* Biomarker Tags */}
          <AdminField label="Biomarker Tags">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.biomarker_tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0e393d]/8 text-[#0e393d] text-xs">
                  {tag}
                  <button onClick={() => setForm(f => ({ ...f, biomarker_tags: f.biomarker_tags.filter(t => t !== tag) }))} className="text-[#0e393d]/40 hover:text-red-500">×</button>
                </span>
              ))}
            </div>
            <input
              className={inputCls}
              placeholder="Press Enter to add…"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const val = (e.target as HTMLInputElement).value.trim().toLowerCase();
                  if (val && !form.biomarker_tags.includes(val)) {
                    setForm(f => ({ ...f, biomarker_tags: [...f.biomarker_tags, val] }));
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
            />
          </AdminField>

          {/* Active toggle */}
          <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-[#fafaf8] border border-[#0e393d]/8">
            <div>
              <div className="text-sm font-medium text-[#0e393d]">Active</div>
              <div className="text-xs text-[#1c2a2b]/40">Show this item in the daily checklist</div>
            </div>
            <AdminToggle checked={form.is_active} onChange={v => setForm(f => ({ ...f, is_active: v }))} />
          </div>
        </div>
      </AdminPanel>
    </div>
  );
}
