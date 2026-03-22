'use client';

import { useState, useMemo } from 'react';
import { Link } from '@/i18n/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ArticleCard = {
  id: string;
  slug: string | null;
  title: Record<string, string> | null;
  excerpt: Record<string, string> | null;
  featured_image_url: string | null;
  category: string | null;
  author_name: string | null;
  reading_time_min: number | null;
  published_at: string | null;
  is_featured: boolean | null;
  tags: string[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ['kitchen', 'health', 'fit', 'longevity', 'science', 'news'] as const;

const CAT_LABELS: Record<string, { de: string; en: string }> = {
  kitchen:   { de: 'Küche',       en: 'Kitchen' },
  health:    { de: 'Gesundheit',  en: 'Health' },
  fit:       { de: 'Fitness',     en: 'Fitness' },
  longevity: { de: 'Langlebigkeit', en: 'Longevity' },
  science:   { de: 'Wissenschaft', en: 'Science' },
  news:      { de: 'Neuigkeiten', en: 'News' },
};

const CAT_CLS: Record<string, string> = {
  kitchen:   'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
  health:    'bg-[#0e393d]/8 text-[#0e393d] ring-1 ring-[#0e393d]/20',
  fit:       'bg-sky-50 text-sky-700 ring-1 ring-sky-600/20',
  longevity: 'bg-[#ceab84]/15 text-[#8a6a3e] ring-1 ring-[#ceab84]/30',
  science:   'bg-violet-50 text-violet-700 ring-1 ring-violet-600/20',
  news:      'bg-gray-50 text-gray-600 ring-1 ring-gray-500/20',
};

const T = {
  de: {
    searchPlaceholder: 'Artikel suchen…',
    allCategories: 'Alle',
    featured: 'Empfohlen',
    readMore: 'Lesen',
    minutes: 'Min.',
    noResults: 'Keine Artikel gefunden.',
    noResultsHint: 'Versuche eine andere Suche oder Kategorie.',
    total: (n: number) => `${n} Artikel`,
    by: 'von',
  },
  en: {
    searchPlaceholder: 'Search articles…',
    allCategories: 'All',
    featured: 'Featured',
    readMore: 'Read',
    minutes: 'min',
    noResults: 'No articles found.',
    noResultsHint: 'Try a different search or category.',
    total: (n: number) => `${n} article${n !== 1 ? 's' : ''}`,
    by: 'by',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DATE_LOCALE: Record<string, string> = {
  de: 'de-DE', en: 'en-US', fr: 'fr-FR', es: 'es-ES', it: 'it-IT',
};

function formatDate(iso: string, lang: string): string {
  return new Date(iso).toLocaleDateString(DATE_LOCALE[lang] ?? 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BlogGrid({ articles, lang }: { articles: ArticleCard[]; lang: string }) {
  const t = (T as Record<string, typeof T.en>)[lang] ?? T.en;

  const [search, setSearch]   = useState('');
  const [catFilter, setCat]   = useState<string>('all');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return articles.filter((a) => {
      if (catFilter !== 'all' && a.category !== catFilter) return false;
      if (q) {
        const de = a.title?.de?.toLowerCase() ?? '';
        const en = a.title?.en?.toLowerCase() ?? '';
        if (!de.includes(q) && !en.includes(q)) return false;
      }
      return true;
    });
  }, [articles, search, catFilter]);

  const featured = filtered.filter((a) => a.is_featured);
  const rest     = filtered.filter((a) => !a.is_featured);

  return (
    <div>
      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="mb-8 space-y-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full max-w-md rounded-xl border border-[#0e393d]/15 bg-white px-4 py-2.5 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/35 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
        />

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCat('all')}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${catFilter === 'all' ? 'bg-[#0e393d] text-white' : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30'}`}
          >
            {t.allCategories}
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCat(cat)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${catFilter === cat ? 'bg-[#0e393d] text-white' : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30'}`}
            >
              {CAT_LABELS[cat]?.[lang as 'de' | 'en'] ?? CAT_LABELS[cat]?.en ?? cat}
            </button>
          ))}
        </div>

        <p className="text-xs text-[#1c2a2b]/40">{t.total(filtered.length)}</p>
      </div>

      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {filtered.length === 0 && (
        <div className="rounded-2xl border border-[#0e393d]/10 bg-white py-20 text-center">
          <p className="text-sm text-[#1c2a2b]/50">{t.noResults}</p>
          <p className="text-xs text-[#1c2a2b]/30 mt-1">{t.noResultsHint}</p>
        </div>
      )}

      {/* ── Featured (hero card) ───────────────────────────────────────────── */}
      {featured.length > 0 && (
        <div className="mb-8 space-y-4">
          {featured.map((article) => {
            const title   = article.title?.[lang] || article.title?.de || '';
            const excerpt = article.excerpt?.[lang] || article.excerpt?.de || '';
            const href    = `/blog/${article.slug ?? article.id}`;
            const catCls  = article.category ? CAT_CLS[article.category] : '';
            const catLabel = article.category ? (CAT_LABELS[article.category]?.[lang as 'de' | 'en'] ?? CAT_LABELS[article.category]?.en ?? article.category) : '';

            return (
              <article
                key={article.id}
                className="group grid sm:grid-cols-[1fr_auto] gap-0 rounded-2xl border border-[#0e393d]/10 bg-white overflow-hidden hover:border-[#0e393d]/25 hover:shadow-md transition-all duration-200"
              >
                <div className="flex flex-col p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ceab84]">★ {t.featured}</span>
                    {catLabel && (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${catCls}`}>{catLabel}</span>
                    )}
                  </div>
                  <Link href={href}>
                    <h2 className="font-serif text-2xl text-[#0e393d] leading-snug mb-2 group-hover:text-[#1a5055] transition-colors">
                      {title}
                    </h2>
                  </Link>
                  {excerpt && (
                    <p className="text-sm text-[#1c2a2b]/55 leading-relaxed line-clamp-2 mb-4">{excerpt}</p>
                  )}
                  <div className="mt-auto flex items-center gap-4 text-xs text-[#1c2a2b]/40">
                    {article.author_name && <span>{t.by} {article.author_name}</span>}
                    {article.published_at && <span>{formatDate(article.published_at, lang)}</span>}
                    {article.reading_time_min && <span>{article.reading_time_min} {t.minutes}</span>}
                  </div>
                </div>
                {article.featured_image_url && (
                  <Link href={href} className="block relative w-56 shrink-0 bg-[#0e393d]/6 overflow-hidden hidden sm:block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={article.featured_image_url.includes('/storage/v1/object/public/')
                        ? article.featured_image_url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + '?width=400&height=300&resize=cover'
                        : article.featured_image_url}
                      alt={title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* ── Grid ───────────────────────────────────────────────────────────── */}
      {rest.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((article) => {
            const title   = article.title?.[lang] || article.title?.de || '';
            const excerpt = article.excerpt?.[lang] || article.excerpt?.de || '';
            const href    = `/blog/${article.slug ?? article.id}`;
            const catCls  = article.category ? CAT_CLS[article.category] : '';
            const catLabel = article.category ? (CAT_LABELS[article.category]?.[lang as 'de' | 'en'] ?? CAT_LABELS[article.category]?.en ?? article.category) : '';

            return (
              <article
                key={article.id}
                className="group flex flex-col rounded-2xl border border-[#0e393d]/10 bg-white overflow-hidden hover:border-[#0e393d]/25 hover:shadow-md transition-all duration-200"
              >
                {/* Image */}
                <Link href={href} className="block relative h-44 bg-[#0e393d]/6 overflow-hidden shrink-0">
                  {article.featured_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={article.featured_image_url.includes('/storage/v1/object/public/')
                        ? article.featured_image_url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + '?width=400&height=300&resize=cover'
                        : article.featured_image_url}
                      alt={title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-[#0e393d]/20">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10 9 9 9 8 9"/>
                      </svg>
                    </div>
                  )}
                </Link>

                {/* Body */}
                <div className="flex flex-col flex-1 p-5">
                  {catLabel && (
                    <span className={`self-start mb-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${catCls}`}>
                      {catLabel}
                    </span>
                  )}

                  <Link href={href}>
                    <h2 className="font-serif text-lg text-[#0e393d] leading-snug mb-1.5 group-hover:text-[#1a5055] transition-colors line-clamp-2">
                      {title}
                    </h2>
                  </Link>

                  {excerpt && (
                    <p className="text-sm text-[#1c2a2b]/55 leading-relaxed line-clamp-3 mb-3">{excerpt}</p>
                  )}

                  {/* Tags */}
                  {article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {article.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded-full bg-[#0e393d]/6 px-2 py-0.5 text-[10px] font-medium text-[#0e393d]/60">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Meta */}
                  <div className="mt-auto flex items-center justify-between text-xs text-[#1c2a2b]/40">
                    <span>
                      {article.published_at ? formatDate(article.published_at, lang) : ''}
                    </span>
                    {article.reading_time_min && (
                      <span>{article.reading_time_min} {t.minutes}</span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
