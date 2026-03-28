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

const CAT_COLOR: Record<string, string> = {
  kitchen:   'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  health:    'bg-[#0e393d]/8 text-[#0e393d] ring-[#0e393d]/20',
  fit:       'bg-sky-50 text-sky-700 ring-sky-600/20',
  longevity: 'bg-[#ceab84]/15 text-[#8a6a3e] ring-[#ceab84]/30',
  science:   'bg-violet-50 text-violet-700 ring-violet-600/20',
  news:      'bg-gray-50 text-gray-600 ring-gray-500/20',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ArticlesManager({ initialArticles }: { initialArticles: ArticleListItem[] }) {
  const supabase = createClient();
  const [articles, setArticles] = useState<ArticleListItem[]>(initialArticles);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [pubFilter, setPubFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [editingId, setEditingId] = useState<string | null | 'new'>(null);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('articles')
      .select('id, title, category, author_name, reading_time_min, is_published, is_featured, featured_image_url, published_at, created_at')
      .order('created_at', { ascending: false });
    if (data) setArticles(data);
  }, [supabase]);

  const filtered = articles.filter((a) => {
    if (pubFilter === 'published' && !a.is_published) return false;
    if (pubFilter === 'draft' && a.is_published) return false;
    if (catFilter !== 'all' && a.category !== catFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const de = a.title?.de?.toLowerCase() ?? '';
      const en = a.title?.en?.toLowerCase() ?? '';
      if (!de.includes(q) && !en.includes(q)) return false;
    }
    return true;
  });

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

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-[#0e393d]">Articles</h1>
          <p className="text-sm text-[#1c2a2b]/40 mt-1">
            {articles.length} total · {articles.filter(a => a.is_published).length} published
          </p>
        </div>
        <button
          onClick={() => setEditingId('new')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0e393d] text-white text-sm font-medium hover:bg-[#0e393d]/90 transition shadow-sm shadow-[#0e393d]/20"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> New Article
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative w-52">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1c2a2b]/40 pointer-events-none"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            type="text"
            placeholder="Search by title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[#0e393d]/12 bg-white px-3 py-2 pl-9 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
          />
        </div>

        {/* Pub filter */}
        <div className="flex rounded-lg border border-[#0e393d]/15 overflow-hidden text-xs">
          {(['all', 'published', 'draft'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setPubFilter(f)}
              className={`px-3 py-2 font-medium transition capitalize ${pubFilter === f ? 'bg-[#0e393d] text-white' : 'text-[#1c2a2b]/60 hover:bg-[#0e393d]/5'}`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setCatFilter('all')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${catFilter === 'all' ? 'bg-[#0e393d] text-white' : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30'}`}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition capitalize ${catFilter === c ? 'bg-[#0e393d] text-white' : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/[0.03]">
              {([
                { key: null,               label: ''          },
                { key: 'title',            label: 'Title'     },
                { key: 'category',         label: 'Category'  },
                { key: 'author_name',      label: 'Author'    },
                { key: 'reading_time_min', label: 'Read'      },
                { key: 'published_at',     label: 'Published' },
                { key: null,               label: ''          },
              ] as { key: typeof sortCol | null; label: string }[]).map(({ key, label }, i) => (
                <th
                  key={i}
                  onClick={key ? () => handleSort(key) : undefined}
                  className={`px-4 py-3 text-left text-[11px] font-semibold text-[#0e393d]/50 uppercase tracking-wider${key ? ' cursor-pointer select-none hover:text-[#0e393d]' : ''}`}
                >
                  {label}{key ? <>{' '}{sortCol === key && sortDir === 'asc' ? '▲' : sortCol === key && sortDir === 'desc' ? '▼' : <span className="opacity-0">▲</span>}</> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0e393d]/5">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center"><div className="text-sm text-[#1c2a2b]/40">No articles found.</div></td>
              </tr>
            )}
            {sorted.map((a) => (
              <tr key={a.id} className="hover:bg-[#fafaf8] transition-colors">
                {/* Thumb */}
                <td className="px-4 py-3 w-12">
                  {a.featured_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.featured_image_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-[#0e393d]/10" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[#0e393d]/6 flex items-center justify-center text-[#0e393d]/25">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                      </svg>
                    </div>
                  )}
                </td>
                {/* Title */}
                <td className="px-4 py-3 max-w-xs">
                  <div className="font-medium text-[#0e393d] leading-snug truncate">
                    {a.title?.de || a.title?.en || <span className="text-[#1c2a2b]/30 italic">Untitled</span>}
                  </div>
                  {a.title?.de && a.title?.en && (
                    <div className="text-xs text-[#1c2a2b]/40 mt-0.5 truncate">{a.title.en}</div>
                  )}
                  {a.is_featured && (
                    <span className="inline-flex items-center rounded-full bg-[#ceab84]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#8a6a3e] ring-1 ring-inset ring-[#ceab84]/30 mt-1">★ featured</span>
                  )}
                </td>
                {/* Category */}
                <td className="px-4 py-3">
                  {a.category && (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset capitalize ${CAT_COLOR[a.category] ?? 'bg-gray-50 text-gray-600 ring-gray-500/20'}`}>
                      {a.category}
                    </span>
                  )}
                </td>
                {/* Author */}
                <td className="px-4 py-3 text-xs text-[#1c2a2b]/60">{a.author_name ?? '—'}</td>
                {/* Reading time */}
                <td className="px-4 py-3 text-xs text-[#1c2a2b]/60 whitespace-nowrap">
                  {a.reading_time_min != null ? `${a.reading_time_min} min` : '—'}
                </td>
                {/* Status / date */}
                <td className="px-4 py-3">
                  {a.is_published ? (
                    <div>
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset bg-emerald-50 text-emerald-700 ring-emerald-600/20">Published</span>
                      {a.published_at && (
                        <div className="text-[10px] text-[#1c2a2b]/40 mt-0.5">
                          {new Date(a.published_at).toLocaleDateString('de-CH')}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset bg-gray-50 text-gray-600 ring-gray-500/20">Draft</span>
                  )}
                </td>
                {/* Edit */}
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setEditingId(a.id)}
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
