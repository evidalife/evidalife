'use client';

import { useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import CoverImageUploader from '@/components/shared/CoverImageUploader';
import GalleryUploader from '@/components/shared/GalleryUploader';
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

export type LessonRow = {
  id: string;
  slug: string;
  title_en: string;
  title_de: string | null;
  title_fr: string | null;
  title_es: string | null;
  title_it: string | null;
  caption_en: string;
  caption_de: string | null;
  caption_fr: string | null;
  caption_es: string | null;
  caption_it: string | null;
  framework: 'foundation' | 'daily_dozen' | '21_tweaks' | 'anti_aging';
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  photo_url: string | null;
  photo_alt_en: string | null;
  photo_alt_de: string | null;
  photo_alt_fr: string | null;
  photo_alt_es: string | null;
  photo_alt_it: string | null;
  image_gallery: string[];
  video_url: string | null;
  biomarker_tags: string[];
  daily_dozen_categories: string[];
  related_lesson_ids: string[];
  sort_order: number;
  phase: number;
  is_published: boolean;
  estimated_minutes: number | null;
  tags: string[];
  created_at: string;
  updated_at: string;
};

type FormData = Omit<LessonRow, 'id' | 'created_at' | 'updated_at' | 'related_lesson_ids'>;

const FRAMEWORKS = [
  { value: 'foundation', label: 'Foundation', color: 'teal' as const },
  { value: 'daily_dozen', label: 'Daily Dozen', color: 'green' as const },
  { value: '21_tweaks', label: '21 Tweaks', color: 'purple' as const },
  { value: 'anti_aging', label: 'Anti-Aging', color: 'gold' as const },
] as const;

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;

const CATEGORIES: Record<string, string[]> = {
  foundation: ['pantry_essentials', 'kitchen_equipment', 'meal_prep_basics', 'shopping_guide', 'wfpb_principles', 'broccoli_sprouts', 'batch_cooking', 'reading_labels', 'herbs_spices', 'daily_habits'],
  daily_dozen: ['beans', 'berries', 'other_fruits', 'cruciferous', 'greens', 'other_vegetables', 'flaxseeds', 'nuts', 'spices', 'whole_grains', 'beverages', 'exercise'],
  '21_tweaks': ['preload_water', 'negative_calories', 'vinegar', 'undistracted_meals', 'twenty_minute_rule', 'black_cumin', 'garlic_powder', 'ginger_ground', 'nutritional_yeast', 'cumin', 'green_tea', 'meal_timing', 'time_restricted_eating', 'black_pepper', 'sleep', 'trendelenburg', 'walk_after_meal', 'daily_weigh_in', 'cold_exposure', 'deflour_diet', 'exercise'],
  anti_aging: ['autophagy', 'glycation', 'inflammation', 'oxidation', 'telomeres', 'igf1', 'mtor', 'senescence'],
};

const DAILY_DOZEN_CATS = ['beans', 'berries', 'other_fruits', 'cruciferous', 'greens', 'other_vegetables', 'flaxseeds', 'nuts', 'spices', 'whole_grains', 'beverages', 'exercise'];

const EMPTY_FORM: FormData = {
  slug: '',
  title_en: '',
  title_de: null,
  title_fr: null,
  title_es: null,
  title_it: null,
  caption_en: '',
  caption_de: null,
  caption_fr: null,
  caption_es: null,
  caption_it: null,
  framework: 'foundation',
  category: 'pantry_essentials',
  difficulty: 'beginner',
  photo_url: null,
  photo_alt_en: null,
  photo_alt_de: null,
  photo_alt_fr: null,
  photo_alt_es: null,
  photo_alt_it: null,
  image_gallery: [],
  video_url: null,
  biomarker_tags: [],
  daily_dozen_categories: [],
  sort_order: 0,
  phase: 1,
  is_published: false,
  estimated_minutes: 5,
  tags: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function fwColor(fw: string): 'teal' | 'green' | 'purple' | 'gold' {
  const map: Record<string, 'teal' | 'green' | 'purple' | 'gold'> = {
    foundation: 'teal',
    daily_dozen: 'green',
    '21_tweaks': 'purple',
    anti_aging: 'gold',
  };
  return map[fw] ?? 'teal';
}

function fwLabel(fw: string): string {
  return FRAMEWORKS.find(f => f.value === fw)?.label ?? fw;
}

function catLabel(cat: string): string {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Language support ────────────────────────────────────────────────────────

type Lang = 'en' | 'de' | 'fr' | 'es' | 'it';
const ALL_LANGS: Lang[] = ['en', 'de', 'fr', 'es', 'it'];
const LANG_LABELS: Record<Lang, string> = { en: 'EN', de: 'DE', fr: 'FR', es: 'ES', it: 'IT' };

const LANG_PLACEHOLDERS: Record<Lang, { title: string; caption: string }> = {
  en: { title: 'e.g. Stock Your WFPB Pantry', caption: 'Short description…' },
  de: { title: 'z.B. WFPB Vorrat anlegen', caption: 'Kurze Beschreibung…' },
  fr: { title: 'ex. Garnir son garde-manger', caption: 'Courte description…' },
  es: { title: 'ej. Surtir tu despensa', caption: 'Breve descripción…' },
  it: { title: 'es. Rifornire la dispensa', caption: 'Breve descrizione…' },
};

/** Get the title/caption field name for a given language */
function titleField(l: Lang): keyof FormData { return `title_${l}` as keyof FormData; }
function captionField(l: Lang): keyof FormData { return `caption_${l}` as keyof FormData; }
function altField(l: Lang): keyof FormData { return `photo_alt_${l}` as keyof FormData; }

// ─── Component ────────────────────────────────────────────────────────────────

export default function LifestyleLessonsManager({ initialLessons }: { initialLessons: LessonRow[] }) {
  const supabase = createClient();
  const [lessons, setLessons] = useState<LessonRow[]>(initialLessons);
  const [search, setSearch] = useState('');
  const [fwFilter, setFwFilter] = useState<string>('all');
  const [pubFilter, setPubFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [editingId, setEditingId] = useState<string | null | 'new'>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>('en');
  const [translateStatus, setTranslateStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [rewriteStatus, setRewriteStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  // Sort
  const [sortCol, setSortCol] = useState<'title' | 'framework' | 'category' | 'sort_order' | 'created_at'>('sort_order');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const handleSort = (col: string) => {
    const c = col as typeof sortCol;
    if (sortCol === c) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(c); setSortDir('asc'); }
  };

  // Refresh
  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('lifestyle_lessons')
      .select('*')
      .order('sort_order');
    if (data) setLessons(data);
  }, [supabase]);

  // Filters
  const filtered = lessons.filter(l => {
    if (pubFilter === 'published' && !l.is_published) return false;
    if (pubFilter === 'draft' && l.is_published) return false;
    if (fwFilter !== 'all' && l.framework !== fwFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!l.title_en.toLowerCase().includes(q) && !(l.title_de ?? '').toLowerCase().includes(q) && !l.slug.includes(q)) return false;
    }
    return true;
  });

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortCol === 'title') cmp = a.title_en.localeCompare(b.title_en);
    else if (sortCol === 'framework') cmp = a.framework.localeCompare(b.framework);
    else if (sortCol === 'category') cmp = a.category.localeCompare(b.category);
    else if (sortCol === 'sort_order') cmp = a.sort_order - b.sort_order;
    else cmp = a.created_at.localeCompare(b.created_at);
    return sortDir === 'asc' ? cmp : -cmp;
  }), [filtered, sortCol, sortDir]);

  // Stats
  const published = lessons.filter(l => l.is_published).length;
  const byFw = FRAMEWORKS.map(fw => ({ ...fw, count: lessons.filter(l => l.framework === fw.value).length }));

  // Open editor
  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditingId('new');
    setError(null);
  };

  const openEdit = (lesson: LessonRow) => {
    setForm({
      slug: lesson.slug,
      title_en: lesson.title_en,
      title_de: lesson.title_de,
      title_fr: lesson.title_fr,
      title_es: lesson.title_es,
      title_it: lesson.title_it,
      caption_en: lesson.caption_en,
      caption_de: lesson.caption_de,
      caption_fr: lesson.caption_fr,
      caption_es: lesson.caption_es,
      caption_it: lesson.caption_it,
      framework: lesson.framework,
      category: lesson.category,
      difficulty: lesson.difficulty,
      photo_url: lesson.photo_url,
      photo_alt_en: lesson.photo_alt_en,
      photo_alt_de: lesson.photo_alt_de,
      photo_alt_fr: lesson.photo_alt_fr,
      photo_alt_es: lesson.photo_alt_es,
      photo_alt_it: lesson.photo_alt_it,
      image_gallery: lesson.image_gallery ?? [],
      video_url: lesson.video_url,
      biomarker_tags: lesson.biomarker_tags ?? [],
      daily_dozen_categories: lesson.daily_dozen_categories ?? [],
      sort_order: lesson.sort_order,
      phase: lesson.phase,
      is_published: lesson.is_published,
      estimated_minutes: lesson.estimated_minutes,
      tags: lesson.tags ?? [],
    });
    setEditingId(lesson.id);
    setError(null);
  };

  // Translate to all languages
  const handleTranslate = async () => {
    const title = form[titleField(lang)] as string;
    const caption = form[captionField(lang)] as string;
    if (!title && !caption) return;
    setTranslateStatus('loading');
    try {
      const res = await fetch('/api/admin/translate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: { title, caption },
          source_language: lang,
          context: 'WFPB (whole-food plant-based) lifestyle lesson for a health app',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Translation failed');
      const t = json.translations as Record<string, { title: string; caption: string }>;
      const targets = ALL_LANGS.filter(l => l !== lang);
      setForm(f => {
        const updates: Record<string, string | null> = {};
        targets.forEach(l => {
          if (t[l]?.title) updates[`title_${l}`] = t[l].title;
          if (t[l]?.caption) updates[`caption_${l}`] = t[l].caption;
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
    const title = (form[titleField(lang)] as string)?.trim();
    const caption = (form[captionField(lang)] as string)?.trim();
    if (!title && !caption) return;
    setRewriteStatus('loading');
    try {
      const fields: Record<string, string> = {};
      if (title) fields.title = title;
      if (caption) fields.caption = caption;
      const res = await fetch('/api/admin/rewrite-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields,
          language: lang,
          context: 'WFPB (whole-food plant-based) lifestyle lesson for a health app. Keep it concise and motivating.',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Rewrite failed');
      setForm(f => ({
        ...f,
        ...(json.title ? { [titleField(lang)]: json.title } : {}),
        ...(json.caption ? { [captionField(lang)]: json.caption } : {}),
      }));
      setRewriteStatus('done');
    } catch {
      setRewriteStatus('error');
    }
  };

  // Save
  const handleSave = async () => {
    setError(null);
    if (!form.title_en.trim()) { setError('Title (EN) is required'); return; }
    if (!form.caption_en.trim()) { setError('Caption (EN) is required'); return; }
    if (!form.slug.trim()) { setError('Slug is required'); return; }

    setSaving(true);
    try {
      const payload = {
        slug: form.slug.trim(),
        title_en: form.title_en.trim(),
        title_de: form.title_de?.trim() || null,
        title_fr: form.title_fr?.trim() || null,
        title_es: form.title_es?.trim() || null,
        title_it: form.title_it?.trim() || null,
        caption_en: form.caption_en.trim(),
        caption_de: form.caption_de?.trim() || null,
        caption_fr: form.caption_fr?.trim() || null,
        caption_es: form.caption_es?.trim() || null,
        caption_it: form.caption_it?.trim() || null,
        framework: form.framework,
        category: form.category,
        difficulty: form.difficulty,
        photo_url: form.photo_url,
        photo_alt_en: form.photo_alt_en?.trim() || null,
        photo_alt_de: form.photo_alt_de?.trim() || null,
        photo_alt_fr: form.photo_alt_fr?.trim() || null,
        photo_alt_es: form.photo_alt_es?.trim() || null,
        photo_alt_it: form.photo_alt_it?.trim() || null,
        image_gallery: form.image_gallery,
        video_url: form.video_url?.trim() || null,
        biomarker_tags: form.biomarker_tags,
        daily_dozen_categories: form.daily_dozen_categories,
        sort_order: form.sort_order,
        phase: form.phase,
        is_published: form.is_published,
        estimated_minutes: form.estimated_minutes,
        tags: form.tags,
      };

      if (editingId === 'new') {
        const { error: insertErr } = await supabase.from('lifestyle_lessons').insert(payload);
        if (insertErr) throw insertErr;
      } else {
        const { error: updateErr } = await supabase.from('lifestyle_lessons').update(payload).eq('id', editingId);
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

  // Toggle publish inline
  const togglePublish = async (id: string, current: boolean) => {
    await supabase.from('lifestyle_lessons').update({ is_published: !current }).eq('id', id);
    await refresh();
  };

  // Delete lesson
  const handleDelete = async (lesson: LessonRow) => {
    if (!confirm(`Delete "${lesson.title_en}"?`)) return;
    try {
      if (lesson.photo_url) {
        await fetch('/api/delete-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: lesson.photo_url, bucket: 'lifestyle-photos' }),
        }).catch(() => {});
      }
      const { error } = await supabase.from('lifestyle_lessons').delete().eq('id', lesson.id);
      if (error) throw error;
      await refresh();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // Multi-select toggle helper
  const toggleArrayItem = (arr: string[], item: string): string[] =>
    arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];

  // (auto-slug is handled inline in the title input onChange)

  return (
    <div className="p-8">
      {/* Header */}
      <AdminPageHeader
        title="Lifestyle Lessons"
        subtitle={`${lessons.length} total · ${published} published`}
        action={<AdminPrimaryButton onClick={openNew} label="New Lesson" />}
      />

      {/* Stats */}
      <StatCardRow>
        <StatCard value={lessons.length} label="Total Lessons" />
        <StatCard value={published} label="Published" variant="emerald" />
        {byFw.map(fw => (
          <StatCard key={fw.value} value={fw.count} label={fw.label} variant={fw.color === 'teal' ? 'default' : fw.color === 'green' ? 'emerald' : fw.color === 'purple' ? 'purple' : 'gold'} />
        ))}
      </StatCardRow>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <AdminSearchField value={search} onChange={setSearch} placeholder="Search lessons…" />
        <select className={`${selectCls} w-40`} value={fwFilter} onChange={e => setFwFilter(e.target.value)}>
          <option value="all">All Frameworks</option>
          {FRAMEWORKS.map(fw => (
            <option key={fw.value} value={fw.value}>{fw.label}</option>
          ))}
        </select>
        <select className={`${selectCls} w-32`} value={pubFilter} onChange={e => setPubFilter(e.target.value as typeof pubFilter)}>
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {/* Table */}
      <AdminTable>
        <AdminTableHead>
          <AdminTh label="#" sortKey="sort_order" active={sortCol === 'sort_order'} direction={sortDir} onSort={handleSort} className="w-12" />
          <AdminTh label="" className="w-14" />
          <AdminTh label="Title" sortKey="title" active={sortCol === 'title'} direction={sortDir} onSort={handleSort} />
          <AdminTh label="Framework" sortKey="framework" active={sortCol === 'framework'} direction={sortDir} onSort={handleSort} className="w-28" />
          <AdminTh label="Category" sortKey="category" active={sortCol === 'category'} direction={sortDir} onSort={handleSort} className="w-40" />
          <AdminTh label="Difficulty" className="w-24" />
          <AdminTh label="Tags" className="w-32" />
          <AdminTh label="Status" className="w-20" />
        </AdminTableHead>
        <tbody>
          {sorted.length === 0 ? (
            <AdminEmptyRow colSpan={8} message="No lessons yet" hint="Create your first lifestyle lesson" />
          ) : (
            sorted.map((lesson) => (
              <tr
                key={lesson.id}
                onClick={() => openEdit(lesson)}
                className="border-b border-[#0e393d]/5 hover:bg-[#fafaf8] cursor-pointer group transition"
              >
                <td className="px-3 py-3 text-xs text-[#1c2a2b]/40 font-mono">{lesson.sort_order}</td>
                <td className="px-2 py-2">
                  {lesson.photo_url ? (
                    <Image src={lesson.photo_url} alt={lesson.title_en} width={40} height={40} className="rounded-lg object-cover w-10 h-10" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[#0e393d]/5 flex items-center justify-center text-[#0e393d]/20">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                    </div>
                  )}
                </td>
                <td className="px-3 py-3">
                  <div className="text-sm font-medium text-[#0e393d]">{lesson.title_en}</div>
                  {lesson.title_de && <div className="text-xs text-[#1c2a2b]/40 mt-0.5">{lesson.title_de}</div>}
                  <div className="text-[10px] text-[#1c2a2b]/30 font-mono mt-0.5">{lesson.slug}</div>
                </td>
                <td className="px-3 py-3">
                  <AdminBadge color={fwColor(lesson.framework)}>{fwLabel(lesson.framework)}</AdminBadge>
                </td>
                <td className="px-3 py-3 text-xs text-[#1c2a2b]/60">{catLabel(lesson.category)}</td>
                <td className="px-3 py-3">
                  <span className={`text-xs ${lesson.difficulty === 'beginner' ? 'text-emerald-600' : lesson.difficulty === 'intermediate' ? 'text-amber-600' : 'text-red-600'}`}>
                    {lesson.difficulty}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(lesson.biomarker_tags ?? []).slice(0, 3).map(t => (
                      <span key={t} className="text-[9px] bg-[#0e393d]/5 text-[#0e393d]/60 px-1.5 py-0.5 rounded">{t}</span>
                    ))}
                    {(lesson.biomarker_tags ?? []).length > 3 && (
                      <span className="text-[9px] text-[#1c2a2b]/30">+{lesson.biomarker_tags.length - 3}</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2">
                    <AdminToggle checked={lesson.is_published} onChange={() => togglePublish(lesson.id, lesson.is_published)} />
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => openEdit(lesson)}
                        className="p-1.5 rounded-lg text-[#0e393d]/50 hover:text-[#0e393d] hover:bg-[#0e393d]/8 transition">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5Z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(lesson)}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </AdminTable>

      <AdminTableFooter
        showing={sorted.length}
        total={lessons.length}
        hasFilters={search !== '' || fwFilter !== 'all' || pubFilter !== 'all'}
        onClearFilters={() => { setSearch(''); setFwFilter('all'); setPubFilter('all'); }}
      />

      {/* ─── Edit / New Panel ──────────────────────────────────────────── */}
      <AdminPanel
        open={editingId !== null}
        onClose={() => { setEditingId(null); setLang('en'); setTranslateStatus('idle'); }}
        title={editingId === 'new' ? 'New Lifestyle Lesson' : 'Edit Lesson'}
        subtitle={editingId !== 'new' ? editingId ?? undefined : undefined}
        width="max-w-2xl"
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
            saveLabel={editingId === 'new' ? 'Create Lesson' : 'Save Changes'}
          />
        }
      >
        <div className="px-6 py-5 space-y-5">
          {/* Cover Photo — shared component with crop & zoom */}
          <CoverImageUploader
            bucket="lifestyle-photos"
            crops={[
              { key: 'cover', label: 'Cover (16:9)', aspect: 16 / 9, outputWidth: 1200, outputHeight: 675, url: form.photo_url, onUrlChange: (url) => setForm(f => ({ ...f, photo_url: url })) },
            ]}
            label="Cover Photo"
            hint="16:9 · Cropped & compressed on upload"
          />
          <AdminField label={`Alt text (${lang.toUpperCase()})`}>
            <input className={inputCls} placeholder={`Alt text (${lang.toUpperCase()})`} value={(form[altField(lang)] as string) ?? ''} onChange={e => setForm(f => ({ ...f, [altField(lang)]: e.target.value }))} />
          </AdminField>

          {/* Step-by-step gallery */}
          <GalleryUploader
            urls={form.image_gallery}
            bucket="lifestyle-photos"
            maxImages={10}
            outputWidth={1200}
            label="Step-by-Step Gallery"
            hint="Up to 10 photos for step-by-step instructions (e.g. growing sprouts, meal prep)"
            onUrlsChange={(urls) => setForm(f => ({ ...f, image_gallery: urls }))}
          />

          {/* Content — language-aware */}
          <div className="space-y-4">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#ceab84]">Content — {lang.toUpperCase()}</span>

            <AdminField label={`Title (${lang.toUpperCase()}) ${lang === 'en' ? '*' : ''}`}>
              <input
                className={inputCls}
                value={(form[titleField(lang)] as string) ?? ''}
                onChange={e => {
                  const val = e.target.value;
                  setForm(f => ({ ...f, [titleField(lang)]: val }));
                  if (lang === 'en') setForm(f => ({ ...f, slug: slugify(val) }));
                }}
                placeholder={LANG_PLACEHOLDERS[lang].title}
              />
            </AdminField>

            <AdminField label={`Caption (${lang.toUpperCase()}) ${lang === 'en' ? '*' : ''}`}>
              <textarea
                className={`${inputCls} h-20 resize-none`}
                value={(form[captionField(lang)] as string) ?? ''}
                onChange={e => setForm(f => ({ ...f, [captionField(lang)]: e.target.value }))}
                placeholder={LANG_PLACEHOLDERS[lang].caption}
              />
            </AdminField>

            {/* AI action buttons */}
            <div className="flex justify-end gap-2 flex-wrap">
              {/* Rewrite & Proofread */}
              <button
                type="button"
                onClick={() => { setRewriteStatus('idle'); handleRewrite(); }}
                disabled={rewriteStatus === 'loading' || (!(form[titleField(lang)] as string)?.trim() && !(form[captionField(lang)] as string)?.trim())}
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
                disabled={translateStatus === 'loading' || (!(form[titleField(lang)] as string)?.trim() && !(form[captionField(lang)] as string)?.trim())}
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
          </div>

          <AdminField label="Slug *" hint="URL-safe identifier — auto-generated from title">
            <input className={`${inputCls} font-mono text-xs`} value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
          </AdminField>

          {/* Framework + Category + Difficulty */}
          <div className="grid grid-cols-3 gap-4">
            <AdminField label="Framework *">
              <select className={selectCls} value={form.framework} onChange={e => {
                const fw = e.target.value as FormData['framework'];
                const cats = CATEGORIES[fw] ?? [];
                setForm(f => ({ ...f, framework: fw, category: cats[0] ?? '' }));
              }}>
                {FRAMEWORKS.map(fw => <option key={fw.value} value={fw.value}>{fw.label}</option>)}
              </select>
            </AdminField>
            <AdminField label="Category *">
              <select className={selectCls} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {(CATEGORIES[form.framework] ?? []).map(c => (
                  <option key={c} value={c}>{catLabel(c)}</option>
                ))}
              </select>
            </AdminField>
            <AdminField label="Difficulty">
              <select className={selectCls} value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value as FormData['difficulty'] }))}>
                {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
              </select>
            </AdminField>
          </div>

          {/* Phase + Sort Order + Estimated Minutes */}
          <div className="grid grid-cols-3 gap-4">
            <AdminField label="Phase" hint="1=Foundation, 2=DD, 3=Tweaks, 4=Anti-Aging">
              <input type="number" className={inputCls} min={1} max={4} value={form.phase} onChange={e => setForm(f => ({ ...f, phase: parseInt(e.target.value) || 1 }))} />
            </AdminField>
            <AdminField label="Sort Order">
              <input type="number" className={inputCls} value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
            </AdminField>
            <AdminField label="Est. Minutes">
              <input type="number" className={inputCls} min={1} value={form.estimated_minutes ?? 5} onChange={e => setForm(f => ({ ...f, estimated_minutes: parseInt(e.target.value) || 5 }))} />
            </AdminField>
          </div>

          {/* Video URL */}
          <AdminField label="Video URL (optional)">
            <input className={inputCls} placeholder="https://youtube.com/…" value={form.video_url ?? ''} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))} />
          </AdminField>

          {/* Daily Dozen Categories */}
          <AdminField label="Daily Dozen Categories" hint="Which Daily Dozen categories does this lesson relate to?">
            <div className="flex flex-wrap gap-2">
              {DAILY_DOZEN_CATS.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, daily_dozen_categories: toggleArrayItem(f.daily_dozen_categories, cat) }))}
                  className={`px-2.5 py-1 rounded-lg text-xs transition ${
                    form.daily_dozen_categories.includes(cat)
                      ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300'
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {catLabel(cat)}
                </button>
              ))}
            </div>
          </AdminField>

          {/* Biomarker Tags */}
          <AdminField label="Biomarker Tags" hint="Type biomarker slugs separated by Enter">
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
              placeholder="e.g. hba1c, ldl, crp — press Enter to add"
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

          {/* General Tags */}
          <AdminField label="Tags" hint="General tags for search/filtering">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">
                  {tag}
                  <button onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))} className="text-gray-400 hover:text-red-500">×</button>
                </span>
              ))}
            </div>
            <input
              className={inputCls}
              placeholder="e.g. beginner, essential, pantry — press Enter"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const val = (e.target as HTMLInputElement).value.trim().toLowerCase();
                  if (val && !form.tags.includes(val)) {
                    setForm(f => ({ ...f, tags: [...f.tags, val] }));
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
            />
          </AdminField>

          {/* Published toggle */}
          <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-[#fafaf8] border border-[#0e393d]/8">
            <div>
              <div className="text-sm font-medium text-[#0e393d]">Published</div>
              <div className="text-xs text-[#1c2a2b]/40">Make this lesson visible to users</div>
            </div>
            <AdminToggle checked={form.is_published} onChange={v => setForm(f => ({ ...f, is_published: v }))} />
          </div>
        </div>
      </AdminPanel>
    </div>
  );
}
