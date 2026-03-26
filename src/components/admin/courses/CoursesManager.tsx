'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import CoverImageUploader from '@/components/shared/CoverImageUploader';
import GalleryUploader from '@/components/shared/GalleryUploader';

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'de' | 'en' | 'fr' | 'es' | 'it';
type I18n = Record<string, string> | null;

export type Course = {
  id: string;
  title: I18n;
  description: I18n;
  slug: string | null;
  image_url: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  lesson_count?: number;
};

type ArticleOption = {
  id: string;
  title: I18n;
  category: string | null;
};

type LessonRow = {
  _key: string;
  lesson_id?: string;
  article_id: string;
  article_title: string;
  is_free: boolean;
};

type FormState = {
  title: { de: string; en: string; fr: string; es: string; it: string };
  description: { de: string; en: string; fr: string; es: string; it: string };
  slug: string;
  sort_order: string;
  is_published: boolean;
};

const EMPTY_FORM: FormState = {
  title: { de: '', en: '', fr: '', es: '', it: '' },
  description: { de: '', en: '', fr: '', es: '', it: '' },
  slug: '',
  sort_order: '0',
  is_published: false,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'course';
}

let _k = 0;
const newKey = () => `_k${++_k}`;

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ published }: { published: boolean }) {
  return published
    ? <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset bg-emerald-50 text-emerald-700 ring-emerald-600/20">Published</span>
    : <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset bg-gray-50 text-gray-600 ring-gray-500/20">Draft</span>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#0e393d]/70 mb-1">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-[#1c2a2b]/40">{hint}</p>}
    </div>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ceab84]">{children}</p>;
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[#0e393d]/10 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-[#1c2a2b]">{label}</p>
        {hint && <p className="text-xs text-[#1c2a2b]/40">{hint}</p>}
      </div>
      <button type="button" onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? 'bg-[#0e393d]' : 'bg-gray-200'}`}>
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

const inputCls = 'w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition';

// ─── Main component ───────────────────────────────────────────────────────────

export default function CoursesManager({ initialCourses }: { initialCourses: Course[] }) {
  const supabase = createClient();

  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [search, setSearch] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>('de');
  const [translating, setTranslating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [allArticles, setAllArticles] = useState<ArticleOption[]>([]);
  const [articleSearch, setArticleSearch] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Refresh ──────────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('courses')
      .select('*, course_lessons(count)')
      .order('sort_order')
      .order('created_at', { ascending: false });
    if (data) {
      setCourses(data.map((c) => ({
        ...c,
        lesson_count: Array.isArray(c.course_lessons) ? c.course_lessons[0]?.count ?? 0 : 0,
      })));
    }
  }, [supabase]);

  // ── Load articles once ────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.from('articles').select('id, title, category').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setAllArticles(data); });
  }, [supabase]);

  // ── Panel helpers ─────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null);
    setLang('de');
    setForm(EMPTY_FORM);
    setLessons([]);
    setCoverImageUrl(null);
    setGalleryUrls([]);
    setArticleSearch('');
    setError(null);
    setPanelOpen(true);
  };

  const openEdit = async (c: Course) => {
    setEditingId(c.id);
    setLang('de');
    setForm({
      title: { de: c.title?.de ?? '', en: c.title?.en ?? '', fr: c.title?.fr ?? '', es: c.title?.es ?? '', it: c.title?.it ?? '' },
      description: { de: c.description?.de ?? '', en: c.description?.en ?? '', fr: c.description?.fr ?? '', es: c.description?.es ?? '', it: c.description?.it ?? '' },
      slug: c.slug ?? '',
      sort_order: String(c.sort_order),
      is_published: c.is_published,
    });
    setCoverImageUrl(c.image_url ?? null);
    setGalleryUrls((c as Record<string, unknown>).gallery_urls as string[] ?? []);
    setArticleSearch('');
    setError(null);

    // Load existing lessons
    const { data: rows } = await supabase
      .from('course_lessons')
      .select('id, article_id, sort_order, is_free, articles(title)')
      .eq('course_id', c.id)
      .order('sort_order');

    setLessons((rows ?? []).map((r) => ({
      _key: newKey(),
      lesson_id: r.id,
      article_id: r.article_id,
      article_title: (r.articles as { title?: I18n } | null)?.title?.de
        || (r.articles as { title?: I18n } | null)?.title?.en
        || r.article_id,
      is_free: r.is_free,
    })));

    setPanelOpen(true);
  };

  const closePanel = () => { setPanelOpen(false); setError(null); };

  const setLangField = (field: 'title' | 'description', l: Lang, v: string) =>
    setForm((f) => ({ ...f, [field]: { ...f[field], [l]: v } }));


  // ── Lesson management ─────────────────────────────────────────────────────────

  const addLesson = (article: ArticleOption) => {
    if (lessons.some((l) => l.article_id === article.id)) return;
    const title = article.title?.de || article.title?.en || article.id;
    setLessons((prev) => [...prev, { _key: newKey(), article_id: article.id, article_title: title, is_free: false }]);
    setArticleSearch('');
  };

  const removeLesson = (key: string) => setLessons((prev) => prev.filter((l) => l._key !== key));

  const moveLesson = (key: string, dir: -1 | 1) => {
    setLessons((prev) => {
      const arr = [...prev];
      const idx = arr.findIndex((l) => l._key === key);
      const next = idx + dir;
      if (next < 0 || next >= arr.length) return prev;
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  };

  const toggleLessonFree = (key: string) =>
    setLessons((prev) => prev.map((l) => l._key === key ? { ...l, is_free: !l.is_free } : l));

  // ── AI Translate ──────────────────────────────────────────────────────────────

  const handleTranslate = async () => {
    const srcTitle = form.title.en || form.title.de;
    if (!srcTitle) { alert('Enter an EN or DE title first.'); return; }
    setTranslating(true);
    try {
      const res = await fetch('/api/admin/translate-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title_en: form.title.en || form.title.de, description_en: form.description.en || form.description.de }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Translate failed');
      setForm((f) => ({
        ...f,
        title:       { ...f.title,       fr: f.title.fr       || json.title_fr       || '', es: f.title.es       || json.title_es       || '', it: f.title.it       || json.title_it       || '' },
        description: { ...f.description, fr: f.description.fr || json.description_fr || '', es: f.description.es || json.description_es || '', it: f.description.it || json.description_it || '' },
      }));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setTranslating(false);
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.title.de.trim() && !form.title.en.trim()) {
      setError('Title (DE or EN) is required.');
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const payload = {
        title: { de: form.title.de, en: form.title.en, fr: form.title.fr, es: form.title.es, it: form.title.it },
        description: { de: form.description.de, en: form.description.en, fr: form.description.fr, es: form.description.es, it: form.description.it },
        slug: form.slug.trim() || slugify(form.title.de || form.title.en),
        image_url: coverImageUrl,
        gallery_urls: galleryUrls,
        sort_order: form.sort_order ? Number(form.sort_order) : 0,
        is_published: form.is_published,
      };

      let courseId = editingId;

      if (editingId) {
        const { error: err } = await supabase.from('courses').update(payload).eq('id', editingId);
        if (err) throw err;
      } else {
        const { data, error: err } = await supabase.from('courses').insert(payload).select('id').single();
        if (err) throw err;
        courseId = data.id;
      }

      // Replace lessons
      await supabase.from('course_lessons').delete().eq('course_id', courseId!);
      if (lessons.length > 0) {
        const rows = lessons.map((l, idx) => ({
          course_id: courseId!,
          article_id: l.article_id,
          sort_order: idx,
          is_free: l.is_free,
        }));
        const { error: err } = await supabase.from('course_lessons').insert(rows);
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

  const handleDelete = async () => {
    if (!editingId) return;
    const title = form.title.de || form.title.en || 'this course';
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeleting(true);
    const { error: err } = await supabase.from('courses').delete().eq('id', editingId);
    setDeleting(false);
    if (err) { setError(err.message); return; }
    await refresh();
    closePanel();
  };

  // ── Filtered ──────────────────────────────────────────────────────────────────

  const filtered = courses.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.title?.de?.toLowerCase().includes(q) || c.title?.en?.toLowerCase().includes(q) || c.slug?.toLowerCase().includes(q);
  });

  const availableArticles = allArticles.filter((a) => {
    if (lessons.some((l) => l.article_id === a.id)) return false;
    if (!articleSearch) return true;
    const q = articleSearch.toLowerCase();
    return a.title?.de?.toLowerCase().includes(q) || a.title?.en?.toLowerCase().includes(q);
  });

  const [sortCol, setSortCol] = useState<'title' | 'lesson_count' | 'sort_order' | 'is_published'>('sort_order');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
  };

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortCol === 'title') cmp = (a.title?.en ?? a.title?.de ?? '').localeCompare(b.title?.en ?? b.title?.de ?? '');
    else if (sortCol === 'lesson_count') cmp = (a.lesson_count ?? 0) - (b.lesson_count ?? 0);
    else if (sortCol === 'sort_order') cmp = a.sort_order - b.sort_order;
    else cmp = (a.is_published ? 0 : 1) - (b.is_published ? 0 : 1);
    return sortDir === 'asc' ? cmp : -cmp;
  }), [filtered, sortCol, sortDir]);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-[#0e393d]">Courses</h1>
          <p className="mt-0.5 text-sm text-[#1c2a2b]/50">
            {courses.length} total · {courses.filter((c) => c.is_published).length} published
          </p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0e393d] text-white text-sm font-medium hover:bg-[#0e393d]/90 transition">
          <span className="text-lg leading-none">+</span> New Course
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input type="text" placeholder="Search by title or slug…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/3">
              <th className="px-4 py-3 w-12"></th>
              {([
                { key: 'title',        label: 'Title'   },
                { key: null,           label: 'Slug'    },
                { key: 'lesson_count', label: 'Lessons' },
                { key: 'sort_order',   label: 'Order'   },
                { key: 'is_published', label: 'Status'  },
                { key: null,           label: 'Actions' },
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
              <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-[#1c2a2b]/40">No courses found.</td></tr>
            )}
            {sorted.map((c) => (
              <tr key={c.id} className="hover:bg-[#fafaf8] transition-colors">
                <td className="px-4 py-3">
                  {c.image_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={c.image_url} alt="" className="w-9 h-9 rounded-lg object-cover border border-[#0e393d]/10" />
                    : <div className="w-9 h-9 rounded-lg bg-[#0e393d]/6 flex items-center justify-center text-[#0e393d]/30">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                      </div>
                  }
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-[#0e393d]">{c.title?.de || c.title?.en || <span className="text-[#1c2a2b]/30 italic">Untitled</span>}</div>
                  {c.title?.de && c.title?.en && <div className="text-xs text-[#1c2a2b]/40 mt-0.5">{c.title.en}</div>}
                </td>
                <td className="px-4 py-3 text-xs text-[#1c2a2b]/50 font-mono">{c.slug ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-[#1c2a2b]/60">{c.lesson_count ?? 0}</td>
                <td className="px-4 py-3 text-sm text-[#1c2a2b]/60">{c.sort_order}</td>
                <td className="px-4 py-3"><Badge published={c.is_published} /></td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(c)}
                    className="px-3 py-1 rounded-md text-xs font-medium text-[#0e393d] bg-[#0e393d]/8 hover:bg-[#0e393d]/15 transition">
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Slide-over panel ───────────────────────────────────────────────────── */}
      {panelOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]" onClick={closePanel} />
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-white shadow-2xl">

            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-[#0e393d]/10 px-6 py-4 shrink-0">
              <h2 className="font-serif text-lg text-[#0e393d]">{editingId ? 'Edit Course' : 'New Course'}</h2>
              <div className="flex items-center gap-3">
                {/* AI Translate */}
                <button
                  onClick={handleTranslate}
                  disabled={translating}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#ceab84]/40 text-[10px] font-medium text-[#8a6a3e] hover:bg-[#ceab84]/10 disabled:opacity-50 transition whitespace-nowrap"
                >
                  {translating ? '…' : '✦ AI Translate'}
                </button>
                <div className="flex rounded-lg border border-[#0e393d]/15 overflow-hidden text-xs">
                  {(['de', 'en', 'fr', 'es', 'it'] as Lang[]).map((l) => (
                    <button key={l} onClick={() => setLang(l)}
                      className={`px-3 py-1.5 font-medium transition ${lang === l ? 'bg-[#0e393d] text-white' : 'text-[#1c2a2b]/60 hover:bg-[#0e393d]/5'}`}>
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
                <button onClick={closePanel} className="text-[#1c2a2b]/40 hover:text-[#1c2a2b] transition">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
                </button>
              </div>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* Content */}
              <div className="space-y-3">
                <SectionHead>Content — {lang.toUpperCase()}</SectionHead>
                <Field label={`Title (${lang.toUpperCase()}) *`}>
                  <input className={inputCls} value={form.title[lang]}
                    onChange={(e) => setLangField('title', lang, e.target.value)}
                    placeholder={lang === 'de' ? 'z.B. Ernährung & Longevity' : 'e.g. Nutrition & Longevity'} />
                </Field>
                <Field label={`Description (${lang.toUpperCase()})`}>
                  <textarea className={inputCls + ' resize-none'} rows={3}
                    value={form.description[lang]}
                    onChange={(e) => setLangField('description', lang, e.target.value)}
                    placeholder={lang === 'de' ? 'Kurze Kursbeschreibung…' : 'Short course description…'} />
                </Field>
              </div>

              {/* Details */}
              <div className="space-y-3 border-t border-[#0e393d]/8 pt-5">
                <SectionHead>Details</SectionHead>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Slug" hint="Auto-generated if empty">
                    <input className={inputCls} value={form.slug}
                      onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                      placeholder="nutrition-longevity" />
                  </Field>
                  <Field label="Sort Order">
                    <input type="number" min={0} className={inputCls} value={form.sort_order}
                      onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                      placeholder="0" />
                  </Field>
                </div>
              </div>

              {/* Settings */}
              <div className="space-y-3 border-t border-[#0e393d]/8 pt-5">
                <SectionHead>Settings</SectionHead>
                <Toggle checked={form.is_published} onChange={(v) => setForm((f) => ({ ...f, is_published: v }))}
                  label="Published" hint="Visible to users on the courses page" />
              </div>

              {/* Image */}
              <div className="space-y-3 border-t border-[#0e393d]/8 pt-5">
                <SectionHead>Cover Image</SectionHead>
                <CoverImageUploader
                  currentUrl={coverImageUrl}
                  bucket="course-images"
                  aspect={16 / 9}
                  outputWidth={1200}
                  outputHeight={675}
                  hint="16:9 · max 5 MB"
                  onUrlChange={setCoverImageUrl}
                />
              </div>

              {/* Gallery */}
              <div className="space-y-3 border-t border-[#0e393d]/8 pt-5">
                <SectionHead>Gallery</SectionHead>
                <GalleryUploader
                  urls={galleryUrls}
                  bucket="course-images"
                  maxImages={10}
                  outputWidth={1200}
                  label=""
                  hint="Course preview images. Up to 10."
                  onUrlsChange={setGalleryUrls}
                />
              </div>

              {/* Lessons */}
              <div className="space-y-3 border-t border-[#0e393d]/8 pt-5">
                <div className="flex items-center justify-between">
                  <SectionHead>Lessons ({lessons.length})</SectionHead>
                </div>

                {/* Current lesson list */}
                {lessons.length > 0 && (
                  <ul className="space-y-1.5">
                    {lessons.map((lesson, idx) => (
                      <li key={lesson._key} className="flex items-center gap-2 rounded-lg border border-[#0e393d]/10 bg-[#fafaf8] px-3 py-2">
                        {/* Order badge */}
                        <span className="w-5 text-center text-[11px] text-[#1c2a2b]/30 shrink-0">{idx + 1}</span>
                        {/* Reorder */}
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button type="button" onClick={() => moveLesson(lesson._key, -1)} disabled={idx === 0}
                            className="flex h-4 w-4 items-center justify-center rounded text-[#1c2a2b]/30 hover:text-[#0e393d] disabled:opacity-20 transition">
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 7l3-4 3 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                          <button type="button" onClick={() => moveLesson(lesson._key, 1)} disabled={idx === lessons.length - 1}
                            className="flex h-4 w-4 items-center justify-center rounded text-[#1c2a2b]/30 hover:text-[#0e393d] disabled:opacity-20 transition">
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3l3 4 3-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                        </div>
                        {/* Title */}
                        <span className="flex-1 text-xs text-[#1c2a2b] truncate">{lesson.article_title}</span>
                        {/* Free toggle */}
                        <button type="button" onClick={() => toggleLessonFree(lesson._key)}
                          className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-medium transition ${lesson.is_free ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20' : 'bg-gray-50 text-gray-500 ring-1 ring-gray-300/60'}`}>
                          {lesson.is_free ? 'Free' : 'Paid'}
                        </button>
                        {/* Remove */}
                        <button type="button" onClick={() => removeLesson(lesson._key)}
                          className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-[#1c2a2b]/30 hover:text-red-500 hover:bg-red-50 transition">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Article search + add */}
                <div className="relative">
                  <input type="text" value={articleSearch} onChange={(e) => setArticleSearch(e.target.value)}
                    placeholder="Search articles to add as lessons…"
                    className={inputCls} />
                  {articleSearch && availableArticles.length > 0 && (
                    <ul className="absolute z-10 mt-1 w-full rounded-lg border border-[#0e393d]/15 bg-white shadow-lg max-h-48 overflow-y-auto">
                      {availableArticles.slice(0, 10).map((a) => (
                        <li key={a.id}>
                          <button type="button" onClick={() => addLesson(a)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-[#0e393d]/5 transition flex items-center gap-2">
                            <span className="flex-1 truncate text-[#1c2a2b]">{a.title?.de || a.title?.en || a.id}</span>
                            {a.category && <span className="text-[10px] text-[#1c2a2b]/40 shrink-0">{a.category}</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {articleSearch && availableArticles.length === 0 && (
                    <p className="mt-1 text-xs text-[#1c2a2b]/40 px-1">No matching articles found.</p>
                  )}
                </div>
              </div>

            </div>

            {/* Panel footer */}
            <div className="border-t border-[#0e393d]/10 px-6 py-4 shrink-0">
              {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
              <div className="flex gap-3">
                {editingId && (
                  <button onClick={handleDelete} disabled={deleting || saving}
                    className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition">
                    {deleting ? '…' : 'Delete'}
                  </button>
                )}
                <button onClick={closePanel}
                  className="flex-1 rounded-lg border border-[#0e393d]/15 py-2.5 text-sm font-medium text-[#1c2a2b] hover:bg-[#fafaf8] transition">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 rounded-lg bg-[#0e393d] py-2.5 text-sm font-medium text-white hover:bg-[#0e393d]/90 disabled:opacity-50 transition">
                  {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Course'}
                </button>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
