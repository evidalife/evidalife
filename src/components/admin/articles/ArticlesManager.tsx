'use client';

import { useCallback, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import ArticleFormPanel from './ArticleFormPanel';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ArticleListItem = {
  id: string;
  title: { de?: string; en?: string } | null;
  category: string | null;
  author_name: string | null;
  reading_time_min: number | null;
  is_published: boolean | null;
  is_featured: boolean | null;
  featured_image_url: string | null;
  published_at: string | null;
  created_at: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ['kitchen', 'health', 'fit', 'longevity', 'science', 'news'] as const;

const CATEGORY_BADGE_COLOR: Record<string, string> = {
  kitchen:   'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  health:    'bg-teal-50 text-teal-700 ring-teal-600/20',
  fit:       'bg-sky-50 text-sky-700 ring-sky-600/20',
  longevity: 'bg-[#ceab84]/15 text-[#8a6a3e] ring-[#ceab84]/30',
  science:   'bg-purple-50 text-purple-700 ring-purple-600/20',
  news:      'bg-gray-50 text-gray-600 ring-gray-500/20',
};

function Badge({ cls, children }: { cls: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${cls}`}>
      {children}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ArticlesManager({ initialArticles }: { initialArticles: ArticleListItem[] }) {
  const supabase = createClient();
  const [articles, setArticles] = useState<ArticleListItem[]>(initialArticles);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<'published' | 'draft' | 'all'>('all');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null | 'new'>(null);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('articles')
      .select('id, title, category, author_name, reading_time_min, is_published, is_featured, featured_image_url, published_at, created_at')
      .order('created_at', { ascending: false });
    if (data) setArticles(data);
  }, [supabase]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this article?')) return;
    // Clean up storage image
    const article = articles.find(a => a.id === id);
    if (article?.featured_image_url) {
      await fetch('/api/delete-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: article.featured_image_url, bucket: 'article-images' }),
      }).catch(() => {});
    }
    await supabase.from('articles').delete().eq('id', id);
    refresh();
  }, [supabase, refresh, articles]);

  // ─── Counts ──────────────────────────────────────────────────────
  const publishedCount = articles.filter(a => a.is_published).length;
  const draftCount = articles.filter(a => !a.is_published).length;
  const featuredCount = articles.filter(a => a.is_featured).length;

  // ─── Filtering ───────────────────────────────────────────────────
  const filtered = articles.filter((a) => {
    if (statusTab === 'published' && !a.is_published) return false;
    if (statusTab === 'draft' && a.is_published) return false;
    if (catFilter !== 'all' && a.category !== catFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const de = a.title?.de?.toLowerCase() ?? '';
      const en = a.title?.en?.toLowerCase() ?? '';
      if (!de.includes(q) && !en.includes(q)) return false;
    }
    return true;
  });

  // ─── Sorting ─────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState<'title' | 'category' | 'author_name' | 'published_at' | 'reading_time_min'>('published_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
  };

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortCol === 'title') cmp = (a.title?.en ?? a.title?.de ?? '').localeCompare(b.title?.en ?? b.title?.de ?? '');
    else if (sortCol === 'category') cmp = (a.category ?? '').localeCompare(b.category ?? '');
    else if (sortCol === 'author_name') cmp = (a.author_name ?? '').localeCompare(b.author_name ?? '');
    else if (sortCol === 'reading_time_min') cmp = (a.reading_time_min ?? 0) - (b.reading_time_min ?? 0);
    else cmp = (a.published_at ?? '').localeCompare(b.published_at ?? '');
    return sortDir === 'asc' ? cmp : -cmp;
  }), [filtered, sortCol, sortDir]);

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#0e393d]">Articles</h1>
          <p className="text-xs text-[#1c2a2b]/40 mt-0.5">{articles.length} total · {publishedCount} published</p>
        </div>
        <button
          onClick={() => setEditingId('new')}
          className="flex items-center gap-1.5 rounded-xl bg-[#0e393d] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0e393d]/90"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Article
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-[#0e393d]/8 bg-gradient-to-br from-white to-[#0e393d]/[0.02] px-4 py-3">
          <div className="text-2xl font-semibold text-[#0e393d]">{articles.length}</div>
          <div className="text-xs text-[#1c2a2b]/50 mt-0.5">Total articles</div>
        </div>
        <div className="rounded-xl border border-emerald-200/60 bg-gradient-to-br from-white to-emerald-50/30 px-4 py-3">
          <div className="text-2xl font-semibold text-emerald-700">{publishedCount}</div>
          <div className="text-xs text-emerald-600/60 mt-0.5">Published</div>
        </div>
        <div className="rounded-xl border border-[#0e393d]/8 bg-gradient-to-br from-white to-[#0e393d]/[0.02] px-4 py-3">
          <div className="text-2xl font-semibold text-[#0e393d]">{draftCount}</div>
          <div className="text-xs text-[#1c2a2b]/50 mt-0.5">Drafts</div>
        </div>
        <div className="rounded-xl border border-[#ceab84]/30 bg-gradient-to-br from-white to-[#ceab84]/[0.04] px-4 py-3">
          <div className="text-2xl font-semibold text-[#8a6a3e]">{featuredCount}</div>
          <div className="text-xs text-[#8a6a3e]/60 mt-0.5">Featured</div>
        </div>
      </div>

      {/* Status tabs + Search */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex rounded-lg border border-[#0e393d]/10 overflow-hidden bg-white">
          {([
            { key: 'published' as const, label: 'Published', count: publishedCount },
            { key: 'draft' as const, label: 'Draft', count: draftCount },
            { key: 'all' as const, label: 'All', count: articles.length },
          ]).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setStatusTab(key)}
              className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${
                statusTab === key
                  ? 'bg-[#0e393d] text-white'
                  : 'text-[#1c2a2b]/50 hover:text-[#0e393d] hover:bg-[#0e393d]/5'
              }`}
            >
              {label}
              <span className={`ml-1.5 tabular-nums ${statusTab === key ? 'text-white/60' : 'text-[#1c2a2b]/30'}`}>{count}</span>
            </button>
          ))}
        </div>
        <div className="relative w-64">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1c2a2b]/30 pointer-events-none">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input type="text" placeholder="Search by title…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[#0e393d]/12 bg-white pl-9 pr-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/30 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/8 transition"
          />
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        <button
          onClick={() => setCatFilter('all')}
          className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
            catFilter === 'all'
              ? 'bg-[#0e393d] text-white'
              : 'bg-white text-[#1c2a2b]/50 ring-1 ring-[#0e393d]/10 hover:ring-[#0e393d]/25'
          }`}
        >
          All
        </button>
        {CATEGORIES.map((c) => {
          const count = articles.filter(a => a.category === c).length;
          return (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className={`rounded-full px-3 py-1 text-[11px] font-medium capitalize transition ${
                catFilter === c
                  ? 'bg-[#0e393d] text-white'
                  : 'bg-white text-[#1c2a2b]/50 ring-1 ring-[#0e393d]/10 hover:ring-[#0e393d]/25'
              }`}
            >
              {c}
              <span className={`ml-1 tabular-nums ${catFilter === c ? 'text-white/60' : 'text-[#1c2a2b]/25'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/[0.03]">
              <th className="px-3 py-3 w-14" />
              {([
                { key: 'title' as const,            label: 'Title' },
                { key: 'category' as const,         label: 'Category' },
                { key: 'author_name' as const,      label: 'Author' },
                { key: 'reading_time_min' as const,  label: 'Read' },
                { key: 'published_at' as const,     label: 'Published' },
              ]).map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className="px-3 py-3 text-left text-[11px] font-semibold text-[#0e393d]/50 uppercase tracking-wider cursor-pointer select-none hover:text-[#0e393d]"
                >
                  {label}{' '}
                  {sortCol === key && sortDir === 'asc' ? '▲' : sortCol === key && sortDir === 'desc' ? '▼' : <span className="opacity-0">▲</span>}
                </th>
              ))}
              <th className="px-3 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0e393d]/5">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <div className="text-[#1c2a2b]/30 text-sm">No articles found</div>
                  <p className="text-xs text-[#1c2a2b]/20 mt-1">Try adjusting your filters or search</p>
                </td>
              </tr>
            )}
            {sorted.map((a) => (
              <tr key={a.id} className="cursor-pointer hover:bg-[#fafaf8] transition-colors group" onClick={() => setEditingId(a.id)}>
                {/* Thumbnail */}
                <td className="px-3 py-3">
                  {a.featured_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.featured_image_url} alt="" className="w-9 h-9 min-w-[36px] rounded-lg object-cover border border-[#0e393d]/10" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-[#0e393d]/6 flex items-center justify-center text-[#0e393d]/25">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                  )}
                </td>
                {/* Title */}
                <td className="px-3 py-3 max-w-xs">
                  <div className="font-medium text-[#0e393d] leading-snug truncate">
                    {a.title?.en || a.title?.de || <span className="text-[#1c2a2b]/30 italic">Untitled</span>}
                  </div>
                  {a.title?.en && a.title?.de && (
                    <div className="text-[11px] text-[#1c2a2b]/35 mt-0.5 truncate">{a.title.de}</div>
                  )}
                  {a.is_featured && (
                    <Badge cls="bg-[#ceab84]/15 text-[#8a6a3e] ring-[#ceab84]/30 mt-1">★ featured</Badge>
                  )}
                </td>
                {/* Category */}
                <td className="px-3 py-3">
                  {a.category && (
                    <Badge cls={CATEGORY_BADGE_COLOR[a.category] ?? 'bg-gray-50 text-gray-600 ring-gray-500/20'}>
                      {a.category}
                    </Badge>
                  )}
                </td>
                {/* Author */}
                <td className="px-3 py-3 text-xs text-[#1c2a2b]/60">{a.author_name ?? '—'}</td>
                {/* Reading time */}
                <td className="px-3 py-3 text-xs text-[#1c2a2b]/60 whitespace-nowrap">
                  {a.reading_time_min != null ? `${a.reading_time_min} min` : '—'}
                </td>
                {/* Status / date */}
                <td className="px-3 py-3">
                  {a.is_published ? (
                    <div>
                      <Badge cls="bg-emerald-50 text-emerald-700 ring-emerald-600/20">Published</Badge>
                      {a.published_at && (
                        <div className="text-[10px] text-[#1c2a2b]/35 mt-0.5">
                          {new Date(a.published_at).toLocaleDateString('en-GB')}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Badge cls="bg-gray-50 text-gray-600 ring-gray-500/20">Draft</Badge>
                  )}
                </td>
                {/* Actions (hover icons) */}
                <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => setEditingId(a.id)}
                      className="p-1.5 rounded-lg text-[#0e393d]/50 hover:text-[#0e393d] hover:bg-[#0e393d]/8 transition">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5Z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(a.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between text-xs text-[#1c2a2b]/40 px-1">
        <span>Showing {sorted.length} of {articles.length} articles</span>
        {(search || statusTab !== 'all' || catFilter !== 'all') && (
          <button
            onClick={() => { setSearch(''); setStatusTab('all'); setCatFilter('all'); }}
            className="text-[#0e393d] hover:text-[#0e393d]/70 font-medium transition"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Edit Panel */}
      {editingId !== null && (
        <ArticleFormPanel
          articleId={editingId === 'new' ? null : editingId}
          onClose={() => setEditingId(null)}
          onSaved={() => { refresh(); setEditingId(null); }}
          onDeleted={() => { refresh(); setEditingId(null); }}
        />
      )}
    </div>
  );
}
