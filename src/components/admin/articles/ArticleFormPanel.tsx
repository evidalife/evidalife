'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import CoverImageUploader from '@/components/shared/CoverImageUploader';
import GalleryUploader from '@/components/shared/GalleryUploader';
import MarkdownToolbar from '@/components/shared/MarkdownToolbar';
import {
  AdminSectionBlock,
  AdminField,
  inputCls,
  selectCls,
} from '@/components/admin/shared/AdminUI';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ['kitchen', 'health', 'fit', 'longevity', 'science', 'news'] as const;

function slugify(text: string): string {
  return text.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'article';
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'de' | 'en' | 'fr' | 'es' | 'it';

type LangContent = { de: string; en: string; fr: string; es: string; it: string };

type ArticleForm = {
  title:           LangContent;
  slug:            string;
  excerpt:         LangContent;
  content:         LangContent;
  seo_title:       LangContent;
  seo_description: LangContent;
  author_name:     string;
  category:        string;
  reading_time_min: string;
  published_at:    string;
  is_published:    boolean;
  is_featured:     boolean;
  photo_credit:    string;
  tags:            string[];
};

const EMPTY_FORM: ArticleForm = {
  title:           { de: '', en: '', fr: '', es: '', it: '' },
  slug:            '',
  excerpt:         { de: '', en: '', fr: '', es: '', it: '' },
  content:         { de: '', en: '', fr: '', es: '', it: '' },
  seo_title:       { de: '', en: '', fr: '', es: '', it: '' },
  seo_description: { de: '', en: '', fr: '', es: '', it: '' },
  author_name:     '',
  category:        'health',
  reading_time_min: '',
  published_at:    '',
  is_published:    false,
  is_featured:     false,
  photo_credit:    '',
  tags:            [],
};

// ─── AI Button Component ──────────────────────────────────────────────────────

function AiBtn({
  onClick,
  disabled,
  status,
  idle,
  loading,
  done,
  color = 'amber',
}: {
  onClick: () => void;
  disabled?: boolean;
  status: 'idle' | 'loading' | 'done';
  idle: string;
  loading: string;
  done: string;
  color?: 'amber' | 'sky' | 'violet';
}) {
  const cls = {
    amber: 'border-amber-200 text-amber-700 bg-amber-50',
    sky: 'border-sky-200 text-sky-700 bg-sky-50',
    violet: 'border-violet-200 text-violet-700 bg-violet-50',
  };
  const doneCls = 'border-emerald-200 text-emerald-700 bg-emerald-50';
  return (
    <button
      onClick={onClick}
      disabled={disabled || status === 'loading'}
      className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-medium disabled:opacity-50 transition whitespace-nowrap ${
        status === 'done' ? doneCls : cls[color]
      }`}
    >
      {status === 'loading' ? loading : status === 'done' ? done : idle}
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface Props {
  articleId: string | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}

export default function ArticleFormPanel({
  articleId,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const supabase = createClient();
  const { confirm, ConfirmDialog: confirmDialog } = useConfirmDialog();
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [lang, setLang] = useState<Lang>('en');
  const [form, setForm] = useState<ArticleForm>(EMPTY_FORM);
  const [tagInput, setTagInput] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [photoCredit, setPhotoCredit] = useState('');
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(!!articleId);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rewriteStatus, setRewriteStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [translateStatus, setTranslateStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [seoStatus, setSeoStatus] = useState<'idle' | 'loading' | 'done'>('idle');

  // Collapsible section state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    content: true, seo: false, metadata: false, tags: false, image: true, gallery: false, settings: false,
  });
  const toggleSection = (key: string) => setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  // ── Load ──────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!articleId) {
      setForm(EMPTY_FORM);
      setLoading(false);
      return;
    }
    setLoading(true);

    Promise.all([
      supabase.from('articles').select('*').eq('id', articleId).single(),
      supabase.from('article_tags').select('tag').eq('article_id', articleId),
    ]).then(([{ data: a }, { data: tags }]) => {
      if (!a) {
        setLoading(false);
        return;
      }
      setCoverImageUrl(a.featured_image_url ?? null);
      setPhotoCredit(a.photo_credit ?? '');
      setGalleryUrls((a as Record<string, unknown>).gallery_urls as string[]);

      const pa = a.published_at
        ? new Date(a.published_at).toISOString().slice(0, 16)
        : '';

      setForm({
        title: {
          de: a.title?.de ?? '',
          en: a.title?.en ?? '',
          fr: a.title?.fr ?? '',
          es: a.title?.es ?? '',
          it: a.title?.it ?? '',
        },
        slug: a.slug ?? '',
        excerpt: {
          de: a.excerpt?.de ?? '',
          en: a.excerpt?.en ?? '',
          fr: a.excerpt?.fr ?? '',
          es: a.excerpt?.es ?? '',
          it: a.excerpt?.it ?? '',
        },
        content: {
          de: a.content?.de ?? '',
          en: a.content?.en ?? '',
          fr: a.content?.fr ?? '',
          es: a.content?.es ?? '',
          it: a.content?.it ?? '',
        },
        seo_title: {
          de: a.seo_title?.de ?? '',
          en: a.seo_title?.en ?? '',
          fr: a.seo_title?.fr ?? '',
          es: a.seo_title?.es ?? '',
          it: a.seo_title?.it ?? '',
        },
        seo_description: {
          de: a.seo_description?.de ?? '',
          en: a.seo_description?.en ?? '',
          fr: a.seo_description?.fr ?? '',
          es: a.seo_description?.es ?? '',
          it: a.seo_description?.it ?? '',
        },
        author_name: a.author_name ?? '',
        category: a.category ?? 'health',
        reading_time_min: a.reading_time_min != null ? String(a.reading_time_min) : '',
        published_at: pa,
        is_published: a.is_published ?? false,
        is_featured: a.is_featured ?? false,
        photo_credit: a.photo_credit ?? '',
        tags: (tags ?? []).map((t) => t.tag).filter(Boolean),
      });
      setLoading(false);
    });
  }, [articleId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ───────────────────────────────────────────────────────────────────

  const setLF = (
    field: keyof Pick<
      ArticleForm,
      'title' | 'excerpt' | 'content' | 'seo_title' | 'seo_description'
    >,
    l: Lang,
    v: string
  ) => setForm((f) => ({ ...f, [field]: { ...f[field], [l]: v } }));

  const setF = <K extends keyof ArticleForm>(k: K, v: ArticleForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // ── Tags ──────────────────────────────────────────────────────────────────────

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, '-');
    if (!tag || form.tags.includes(tag)) return;
    setForm((f) => ({ ...f, tags: [...f.tags, tag] }));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
      setTagInput('');
    }
    if (e.key === 'Backspace' && !tagInput && form.tags.length > 0) {
      setForm((f) => ({ ...f, tags: f.tags.slice(0, -1) }));
    }
  };

  const removeTag = (tag: string) =>
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));

  // ── AI: Rewrite & Proofread ───────────────────────────────────────────────────

  const handleRewrite = async () => {
    const src = form.title[lang] || form.title.en || form.title.de;
    if (!src) {
      alert(`Enter a title for ${lang.toUpperCase()} first.`);
      return;
    }
    setRewriteStatus('loading');
    try {
      const res = await fetch('/api/admin/rewrite-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            title: form.title[lang],
            excerpt: form.excerpt[lang],
            content: form.content[lang],
          },
          language: lang,
          context: 'Blog article for a health and longevity platform',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Rewrite failed');
      setLF('title', lang, json.title ?? form.title[lang]);
      setLF('excerpt', lang, json.excerpt ?? form.excerpt[lang]);
      setLF('content', lang, json.content ?? form.content[lang]);
      setRewriteStatus('done');
      setTimeout(() => setRewriteStatus('idle'), 2000);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
      setRewriteStatus('idle');
    }
  };

  // ── AI: Translate to all ──────────────────────────────────────────────────────

  const handleTranslateAll = async () => {
    const src = form.title[lang] || form.title.en || form.title.de;
    if (!src) {
      alert(`Enter a title for ${lang.toUpperCase()} first.`);
      return;
    }
    setTranslateStatus('loading');
    try {
      const res = await fetch('/api/admin/translate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            title: form.title[lang],
            excerpt: form.excerpt[lang],
            content: form.content[lang],
            seo_title: form.seo_title[lang],
            seo_description: form.seo_description[lang],
          },
          source_language: lang,
          context: 'Blog article',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Translate failed');

      // Update all languages from response
      const translations = json.translations || {};
      setForm((f) => ({
        ...f,
        title: {
          de: translations.de?.title ?? f.title.de,
          en: translations.en?.title ?? f.title.en,
          fr: translations.fr?.title ?? f.title.fr,
          es: translations.es?.title ?? f.title.es,
          it: translations.it?.title ?? f.title.it,
        },
        excerpt: {
          de: translations.de?.excerpt ?? f.excerpt.de,
          en: translations.en?.excerpt ?? f.excerpt.en,
          fr: translations.fr?.excerpt ?? f.excerpt.fr,
          es: translations.es?.excerpt ?? f.excerpt.es,
          it: translations.it?.excerpt ?? f.excerpt.it,
        },
        content: {
          de: translations.de?.content ?? f.content.de,
          en: translations.en?.content ?? f.content.en,
          fr: translations.fr?.content ?? f.content.fr,
          es: translations.es?.content ?? f.content.es,
          it: translations.it?.content ?? f.content.it,
        },
        seo_title: {
          de: translations.de?.seo_title ?? f.seo_title.de,
          en: translations.en?.seo_title ?? f.seo_title.en,
          fr: translations.fr?.seo_title ?? f.seo_title.fr,
          es: translations.es?.seo_title ?? f.seo_title.es,
          it: translations.it?.seo_title ?? f.seo_title.it,
        },
        seo_description: {
          de: translations.de?.seo_description ?? f.seo_description.de,
          en: translations.en?.seo_description ?? f.seo_description.en,
          fr: translations.fr?.seo_description ?? f.seo_description.fr,
          es: translations.es?.seo_description ?? f.seo_description.es,
          it: translations.it?.seo_description ?? f.seo_description.it,
        },
      }));
      setTranslateStatus('done');
      setTimeout(() => setTranslateStatus('idle'), 2000);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
      setTranslateStatus('idle');
    }
  };

  // ── AI: SEO Autofill ──────────────────────────────────────────────────────────

  const handleSeoAutofill = async () => {
    if (!form.title[lang].trim()) {
      alert(`Enter a title for ${lang.toUpperCase()} first.`);
      return;
    }
    setSeoStatus('loading');
    try {
      const res = await fetch('/api/admin/seo-autofill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title[lang],
          excerpt: form.excerpt[lang],
          content: form.content[lang],
          language: lang,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'SEO autofill failed');
      setLF('seo_title', lang, json.seo_title ?? form.seo_title[lang]);
      setLF('seo_description', lang, json.seo_description ?? form.seo_description[lang]);
      setSeoStatus('done');
      setTimeout(() => setSeoStatus('idle'), 2000);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
      setSeoStatus('idle');
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
        title: {
          de: form.title.de,
          en: form.title.en,
          fr: form.title.fr,
          es: form.title.es,
          it: form.title.it,
        },
        slug: form.slug.trim() || slugify(form.title.de || form.title.en),
        excerpt: {
          de: form.excerpt.de,
          en: form.excerpt.en,
          fr: form.excerpt.fr,
          es: form.excerpt.es,
          it: form.excerpt.it,
        },
        content: {
          de: form.content.de,
          en: form.content.en,
          fr: form.content.fr,
          es: form.content.es,
          it: form.content.it,
        },
        seo_title: {
          de: form.seo_title.de,
          en: form.seo_title.en,
          fr: form.seo_title.fr,
          es: form.seo_title.es,
          it: form.seo_title.it,
        },
        seo_description: {
          de: form.seo_description.de,
          en: form.seo_description.en,
          fr: form.seo_description.fr,
          es: form.seo_description.es,
          it: form.seo_description.it,
        },
        author_name: form.author_name.trim() || null,
        category: form.category || null,
        reading_time_min: form.reading_time_min ? Number(form.reading_time_min) : null,
        published_at: form.published_at ? new Date(form.published_at).toISOString() : null,
        is_published: form.is_published,
        is_featured: form.is_featured,
        photo_credit: photoCredit.trim() || null,
      };

      // 1. Upsert article
      const fullPayload = {
        ...payload,
        featured_image_url: coverImageUrl,
        gallery_urls: galleryUrls,
      };
      let id = articleId;
      if (id) {
        const { error } = await supabase.from('articles').update(fullPayload).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('articles')
          .insert(fullPayload)
          .select('id')
          .single();
        if (error) throw error;
        id = data.id;
      }

      // 2. Replace tags
      await supabase.from('article_tags').delete().eq('article_id', id!);
      if (form.tags.length > 0) {
        const { error } = await supabase
          .from('article_tags')
          .insert(form.tags.map((tag) => ({ article_id: id!, tag })));
        if (error) throw error;
      }

      onSaved();
    } catch (e: unknown) {
      setError(
        typeof e === 'object' && e && 'message' in e
          ? (e as Record<string, unknown>).message as string
          : String(e)
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!articleId) return;
    const title = form.title.de || form.title.en || 'this article';
    if (
      !(await confirm({
        title: 'Delete Article',
        message: `Delete "${title}"? This cannot be undone.`,
        variant: 'danger',
      }))
    )
      return;
    setDeleting(true);
    // Clean up storage image before deleting the DB row
    if (coverImageUrl) {
      const path = coverImageUrl.split('/storage/v1/object/public/')[1];
      if (path) {
        const [bucket, ...rest] = path.split('/');
        await supabase.storage.from(bucket).remove([rest.join('/')]);
      }
    }
    const { error } = await supabase.from('articles').delete().eq('id', articleId);
    setDeleting(false);
    if (error) {
      setError(error.message);
      return;
    }
    (onDeleted ?? onSaved)();
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      {confirmDialog}
      <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-white shadow-2xl rounded-l-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#0e393d]/10 px-6 py-4 shrink-0">
          <h2 className="font-serif text-lg text-[#0e393d]">
            {articleId ? 'Edit Article' : 'New Article'}
          </h2>
          <div className="flex items-center gap-2">
            {/* AI buttons */}
            <AiBtn onClick={handleRewrite} status={rewriteStatus} idle="✦ Rewrite" loading="Rewriting…" done="✓ Done" color="amber" />
            <AiBtn onClick={handleTranslateAll} status={translateStatus} idle="Translate all" loading="Translating…" done="✓ Done" color="violet" />
            <AiBtn onClick={handleSeoAutofill} status={seoStatus} idle="SEO Autofill" loading="Filling…" done="✓ Done" color="sky" />
            {/* Language switcher */}
            <div className="flex rounded-lg border border-[#0e393d]/15 overflow-hidden text-xs ml-1">
              {(['en', 'de', 'fr', 'es', 'it'] as Lang[]).map((l) => (
                <button key={l} onClick={() => setLang(l)}
                  className={`px-3 py-1.5 font-medium transition ${lang === l ? 'bg-[#0e393d] text-white' : 'text-[#1c2a2b]/60 hover:bg-[#0e393d]/5'}`}
                >{l.toUpperCase()}</button>
              ))}
            </div>
            <button onClick={onClose} className="ml-1 p-1.5 rounded-lg text-[#1c2a2b]/40 hover:text-[#1c2a2b] hover:bg-[#0e393d]/5 transition">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-[#1c2a2b]/40">Loading…</div>
        ) : (
          <div className="flex-1 overflow-y-auto">

            {/* Content Section */}
            <AdminSectionBlock title="CONTENT" open={openSections.content} onToggle={() => toggleSection('content')}>
              <div className="space-y-4">
                <AdminField label={`Title (${lang.toUpperCase()}) *`}>
                  <input className={inputCls} value={form.title[lang]} onChange={(e) => setLF('title', lang, e.target.value)}
                    placeholder={lang === 'de' ? 'z.B. Warum Hülsenfrüchte leben verlängern' : 'e.g. Why legumes extend your life'} />
                </AdminField>
                <AdminField label={`Excerpt (${lang.toUpperCase()})`} hint="Short summary shown in listings and cards">
                  <textarea className={inputCls + ' resize-none'} rows={2} value={form.excerpt[lang]}
                    onChange={(e) => setLF('excerpt', lang, e.target.value)}
                    placeholder={lang === 'de' ? 'Kurze Zusammenfassung…' : 'Short summary…'} />
                </AdminField>
                <AdminField label={`Content (${lang.toUpperCase()})`} hint="Markdown supported — headings, bold, lists, links, photos, recipe embeds">
                  <div className="rounded-lg border border-[#0e393d]/15 overflow-hidden focus-within:border-[#0e393d]/40 focus-within:ring-2 focus-within:ring-[#0e393d]/10 transition">
                    <MarkdownToolbar
                      textareaRef={contentTextareaRef}
                      value={form.content[lang]}
                      onChange={(v) => setLF('content', lang, v)}
                      showPhoto
                      showLink
                      showRecipe
                    />
                    <textarea ref={contentTextareaRef}
                      className="w-full bg-white px-3 py-2 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 focus:outline-none resize-y font-mono text-xs leading-relaxed"
                      rows={14}
                      value={form.content[lang]} onChange={(e) => setLF('content', lang, e.target.value)}
                      placeholder={lang === 'de' ? '## Einleitung\n\nHülsenfrüchte sind…' : '## Introduction\n\nLegumes are…'} />
                  </div>
                </AdminField>
              </div>
            </AdminSectionBlock>

            {/* SEO Section */}
            <AdminSectionBlock title="SEO" open={openSections.seo} onToggle={() => toggleSection('seo')}>
              <div className="space-y-4">
                <AdminField label={`SEO Title (${lang.toUpperCase()})`} hint="Recommended ≤60 chars">
                  <div className="relative">
                    <input className={inputCls} value={form.seo_title[lang]} onChange={(e) => setLF('seo_title', lang, e.target.value)}
                      placeholder={lang === 'de' ? 'SEO-Titel…' : 'SEO title…'} maxLength={80} />
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] ${form.seo_title[lang].length > 60 ? 'text-amber-500' : 'text-[#1c2a2b]/30'}`}>
                      {form.seo_title[lang].length}/60
                    </span>
                  </div>
                </AdminField>
                <AdminField label={`SEO Description (${lang.toUpperCase()})`} hint="Recommended ≤160 chars">
                  <div className="relative">
                    <textarea className={inputCls + ' resize-none pr-14'} rows={2} value={form.seo_description[lang]}
                      onChange={(e) => setLF('seo_description', lang, e.target.value)}
                      placeholder={lang === 'de' ? 'Meta-Beschreibung…' : 'Meta description…'} maxLength={200} />
                    <span className={`absolute right-3 top-2 text-[10px] ${form.seo_description[lang].length > 160 ? 'text-amber-500' : 'text-[#1c2a2b]/30'}`}>
                      {form.seo_description[lang].length}/160
                    </span>
                  </div>
                </AdminField>
                <AdminField label="Slug">
                  <input className={inputCls} value={form.slug} onChange={(e) => setF('slug', e.target.value)} placeholder="auto-generated from title" />
                </AdminField>
              </div>
            </AdminSectionBlock>

            {/* Metadata Section */}
            <AdminSectionBlock title="METADATA" open={openSections.metadata} onToggle={() => toggleSection('metadata')}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <AdminField label="Author name">
                    <input className={inputCls} value={form.author_name} onChange={(e) => setF('author_name', e.target.value)} placeholder="Evida Life" />
                  </AdminField>
                  <AdminField label="Category">
                    <select className={selectCls + ' capitalize'} value={form.category} onChange={(e) => setF('category', e.target.value)}>
                      {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
                    </select>
                  </AdminField>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <AdminField label="Reading time (min)">
                    <input type="number" min={1} className={inputCls} value={form.reading_time_min} onChange={(e) => setF('reading_time_min', e.target.value)} placeholder="5" />
                  </AdminField>
                  <AdminField label="Publish date / time" hint="Leave blank to publish without a date">
                    <input type="datetime-local" className={inputCls} value={form.published_at} onChange={(e) => setF('published_at', e.target.value)} />
                  </AdminField>
                </div>
              </div>
            </AdminSectionBlock>

            {/* Tags Section */}
            <AdminSectionBlock title="TAGS" open={openSections.tags} onToggle={() => toggleSection('tags')}>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                  {form.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-[#0e393d]/8 px-2.5 py-1 text-xs font-medium text-[#0e393d]">
                      #{tag}
                      <button type="button" onClick={() => removeTag(tag)} className="text-[#0e393d]/50 hover:text-[#0e393d] transition leading-none" aria-label={`Remove ${tag}`}>×</button>
                    </span>
                  ))}
                </div>
                <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown}
                  onBlur={() => { if (tagInput.trim()) { addTag(tagInput); setTagInput(''); } }}
                  placeholder="Type a tag and press Enter or comma…" className={inputCls} />
                <p className="text-[11px] text-[#1c2a2b]/40">Tags are auto-lowercased and hyphenated. Backspace removes the last tag.</p>
              </div>
            </AdminSectionBlock>

            {/* Featured Image Section */}
            <AdminSectionBlock title="FEATURED IMAGE" open={openSections.image} onToggle={() => toggleSection('image')}>
              <CoverImageUploader
                bucket="article-images"
                crops={[
                  { key: 'cover', label: 'Cover (16:9)', aspect: 16 / 9, outputWidth: 1200, outputHeight: 675, url: coverImageUrl, onUrlChange: setCoverImageUrl },
                ]}
                hint="16:9 · max 5 MB"
                photoCredit={photoCredit}
                onPhotoCreditChange={setPhotoCredit}
              />
            </AdminSectionBlock>

            {/* Gallery Section */}
            <AdminSectionBlock title="GALLERY" open={openSections.gallery} onToggle={() => toggleSection('gallery')}>
              <GalleryUploader urls={galleryUrls} bucket="article-images" maxImages={10} outputWidth={1200}
                label="" hint="Additional article images. Up to 10." onUrlsChange={setGalleryUrls} />
            </AdminSectionBlock>

            {/* Settings Section */}
            <AdminSectionBlock title="SETTINGS" open={openSections.settings} onToggle={() => toggleSection('settings')}>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-[#0e393d]/10 px-4 py-3">
                  <div><p className="text-sm font-medium text-[#1c2a2b]">Published</p><p className="text-xs text-[#1c2a2b]/40">Visible to readers on the platform</p></div>
                  <button type="button" onClick={() => setF('is_published', !form.is_published)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.is_published ? 'bg-[#0e393d]' : 'bg-gray-200'}`}>
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${form.is_published ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-[#0e393d]/10 px-4 py-3">
                  <div><p className="text-sm font-medium text-[#1c2a2b]">Featured</p><p className="text-xs text-[#1c2a2b]/40">Highlighted on the homepage and article list</p></div>
                  <button type="button" onClick={() => setF('is_featured', !form.is_featured)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.is_featured ? 'bg-[#0e393d]' : 'bg-gray-200'}`}>
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${form.is_featured ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>
            </AdminSectionBlock>

          </div>
        )}

        {/* Footer */}
        <div className="border-t border-[#0e393d]/10 px-6 py-4 shrink-0">
          {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          <div className="flex gap-3">
            {articleId && (
              <button onClick={handleDelete} disabled={deleting || saving}
                className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition">
                {deleting ? '…' : 'Delete'}
              </button>
            )}
            <button onClick={onClose} className="flex-1 rounded-lg border border-[#0e393d]/15 py-2.5 text-sm font-medium text-[#1c2a2b] hover:bg-[#fafaf8] transition">Cancel</button>
            <button onClick={handleSave} disabled={saving || loading}
              className="flex-1 rounded-lg bg-[#0e393d] py-2.5 text-sm font-medium text-white hover:bg-[#0e393d]/90 disabled:opacity-50 transition">
              {saving ? 'Saving…' : articleId ? 'Save Changes' : 'Create Article'}
            </button>
          </div>
        </div>

      </div>
    </>
  );
}
