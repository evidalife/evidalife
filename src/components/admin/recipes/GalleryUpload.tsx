'use client';

import { useRef } from 'react';

export type GalleryItem = {
  _key: string;
  url: string | null;   // null = not yet uploaded
  order: number;
  _file?: File;         // pending upload
  _preview?: string;    // blob URL for preview
};

interface Props {
  items: GalleryItem[];
  onChange: (items: GalleryItem[]) => void;
  maxPhotos?: number;
}


export default function GalleryUpload({ items, onChange, maxPhotos = 10 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = maxPhotos - items.length;
    const toAdd = Array.from(files).slice(0, remaining);
    const newItems: GalleryItem[] = toAdd.map((file, i) => ({
      _key: `_g${Date.now()}_${i}`,
      url: null,
      order: items.length + i,
      _file: file,
      _preview: URL.createObjectURL(file),
    }));
    onChange([...items, ...newItems]);
  };

  const remove = (key: string) => {
    onChange(
      items
        .filter((it) => it._key !== key)
        .map((it, i) => ({ ...it, order: i }))
    );
  };

  const move = (key: string, dir: -1 | 1) => {
    const idx = items.findIndex((it) => it._key === key);
    if (idx < 0) return;
    const next = idx + dir;
    if (next < 0 || next >= items.length) return;
    const updated = [...items];
    [updated[idx], updated[next]] = [updated[next], updated[idx]];
    onChange(updated.map((it, i) => ({ ...it, order: i })));
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {items.map((item, idx) => (
          <div
            key={item._key}
            className="relative rounded-lg overflow-hidden border border-[#0e393d]/12 bg-[#fafaf8] group"
          >
            {/* Thumbnail */}
            {item._preview || item.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item._preview ?? item.url!}
                alt=""
                className="w-full h-24 object-cover"
              />
            ) : (
              <div className="w-full h-24 flex items-center justify-center text-[#1c2a2b]/20">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </div>
            )}

            {/* Index badge */}
            <span className="absolute top-1.5 left-1.5 bg-black/50 text-white text-[10px] rounded px-1.5 py-0.5 font-medium">
              {idx + 1}
            </span>

            {/* Move buttons — visible on hover */}
            <div className="absolute top-1.5 right-7 flex gap-1 opacity-0 group-hover:opacity-100 transition">
              {idx > 0 && (
                <button
                  type="button"
                  title="Move left"
                  onClick={() => move(item._key, -1)}
                  className="w-5 h-5 rounded bg-black/50 text-white hover:bg-black/70 flex items-center justify-center transition"
                >
                  <svg width="8" height="8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 10 10">
                    <path d="M7 2L3 5l4 3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
              {idx < items.length - 1 && (
                <button
                  type="button"
                  title="Move right"
                  onClick={() => move(item._key, 1)}
                  className="w-5 h-5 rounded bg-black/50 text-white hover:bg-black/70 flex items-center justify-center transition"
                >
                  <svg width="8" height="8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 10 10">
                    <path d="M3 2l4 3-4 3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>

            {/* Delete button — always visible */}
            <button
              type="button"
              title="Remove photo"
              onClick={() => remove(item._key)}
              className="absolute top-1.5 right-1.5 w-5 h-5 rounded bg-red-500/80 text-white hover:bg-red-600 flex items-center justify-center transition"
            >
              <svg width="8" height="8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 10 10">
                <path d="M2 2l6 6M8 2l-6 6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}

        {/* Add slot */}
        {items.length < maxPhotos && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="min-h-[6rem] rounded-lg border-2 border-dashed border-[#0e393d]/15 hover:border-[#0e393d]/30 hover:bg-[#0e393d]/3 flex flex-col items-center justify-center gap-1.5 transition text-[#1c2a2b]/30 hover:text-[#0e393d]/50"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            <span className="text-xs">{items.length === 0 ? 'Add photos' : 'Add more'}</span>
            <span className="text-[10px] text-[#1c2a2b]/25">{maxPhotos - items.length} remaining</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
      />
    </div>
  );
}
