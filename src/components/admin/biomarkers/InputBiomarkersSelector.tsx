'use client';

import { useState, useRef, useEffect } from 'react';
import type { ItemDefinition } from './BiomarkersManager';

interface Props {
  allItems: ItemDefinition[];
  selected: string[];
  onChange: (slugs: string[]) => void;
}

export default function InputBiomarkersSelector({ allItems, selected, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = allItems.filter((item) => {
    if (selected.includes(item.slug ?? '')) return false;
    const q = query.toLowerCase();
    if (!q) return true;
    const short = (item.name_short?.en ?? '').toLowerCase();
    const en = (item.name?.en ?? '').toLowerCase();
    const slug = (item.slug ?? '').toLowerCase();
    return short.includes(q) || en.includes(q) || slug.includes(q);
  });

  function add(slug: string) {
    onChange([...selected, slug]);
    setQuery('');
  }

  function remove(slug: string) {
    onChange(selected.filter((s) => s !== slug));
  }

  function labelFor(slug: string) {
    const item = allItems.find((i) => i.slug === slug);
    if (!item) return slug;
    return item.name_short?.en || item.name?.en || slug;
  }

  return (
    <div className="flex flex-col gap-2" ref={wrapRef}>
      {/* Selected pills */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((slug) => (
            <span key={slug} className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-800">
              {labelFor(slug)}
              <button
                type="button"
                onClick={() => remove(slug)}
                className="ml-0.5 text-purple-500 hover:text-purple-800 transition"
                aria-label={`Remove ${slug}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search biomarkers to add…"
          className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
        />

        {open && (
          <div className="absolute z-20 mt-1 w-full rounded-lg border border-[#0e393d]/15 bg-white shadow-lg max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-[#1c2a2b]/40">
                {query ? 'No matching biomarkers.' : 'All measured biomarkers already added.'}
              </p>
            ) : (
              filtered.slice(0, 50).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { add(item.slug ?? ''); setOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#fafaf8] transition"
                >
                  <span className="font-medium text-[#0e393d]">
                    {item.name_short?.en || item.name?.en || item.slug}
                  </span>
                  {item.name?.en && item.name_short?.en && (
                    <span className="text-xs text-[#1c2a2b]/40 truncate">{item.name.en}</span>
                  )}
                  <span className="ml-auto font-mono text-[10px] text-[#1c2a2b]/30">{item.slug}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
