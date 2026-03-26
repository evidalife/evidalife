'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  urls: string[];
  bucket: string;
  maxImages?: number;
  outputWidth?: number;
  maxFileSizeMB?: number;
  label?: string;
  hint?: string;
  onUrlsChange: (urls: string[]) => void;
}

async function compressAndUpload(file: File, bucket: string, outputWidth: number): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, outputWidth / bitmap.width);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), 'image/webp', 0.85);
  });
  const base64 = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target!.result as string).split(',')[1]);
    reader.readAsDataURL(blob);
  });
  const res = await fetch('/api/upload-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64, filename: 'gallery.webp', bucket, contentType: 'image/webp' }),
  });
  if (!res.ok) throw new Error('Upload failed');
  const { url } = await res.json();
  return url as string;
}

async function deleteStorageUrl(url: string, bucket: string) {
  try {
    const bucketPrefix = `${bucket}/`;
    const idx = url.indexOf(bucketPrefix);
    if (idx === -1) return;
    const path = url.substring(idx + bucketPrefix.length);
    if (!path) return;
    const supabase = createClient();
    await supabase.storage.from(bucket).remove([path]);
  } catch (e) {
    console.error('[GalleryUploader] Delete failed:', e);
  }
}

type PendingEntry = { key: string; preview: string };

export default function GalleryUploader({
  urls,
  bucket,
  maxImages = 10,
  outputWidth = 1200,
  maxFileSizeMB = 5,
  label = 'Gallery',
  hint,
  onUrlsChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Local committed URLs — keeps concurrent uploads safe via functional setState
  const [committedUrls, setCommittedUrls] = useState<string[]>(urls);
  const [pending, setPending] = useState<PendingEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Sync from parent when a different record is loaded (urls array reference changes)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setCommittedUrls(urls); }, [JSON.stringify(urls)]);

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    setError(null);
    const toAdd = Array.from(files).slice(0, maxImages - committedUrls.length - pending.length);
    for (const file of toAdd) {
      if (file.size > maxFileSizeMB * 1024 * 1024) {
        setError(`Image must be under ${maxFileSizeMB} MB.`);
        continue;
      }
      const key = `_p${Date.now()}_${Math.random()}`;
      const preview = URL.createObjectURL(file);
      setPending((p) => [...p, { key, preview }]);
      try {
        const url = await compressAndUpload(file, bucket, outputWidth);
        setCommittedUrls((prev) => {
          const next = [...prev, url];
          onUrlsChange(next);
          return next;
        });
      } catch {
        setError('Upload failed. Please try again.');
      } finally {
        setPending((p) => p.filter((e) => e.key !== key));
      }
    }
  };

  const remove = async (url: string) => {
    await deleteStorageUrl(url, bucket);
    setCommittedUrls((prev) => {
      const next = prev.filter((u) => u !== url);
      onUrlsChange(next);
      return next;
    });
  };

  const move = (idx: number, dir: -1 | 1) => {
    setCommittedUrls((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      onUrlsChange(next);
      return next;
    });
  };

  const totalShown = committedUrls.length + pending.length;

  return (
    <div className="space-y-3">
      {label && (
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-[#0e393d] uppercase tracking-wider">{label}</p>
          <span className="text-[10px] text-[#1c2a2b]/40">{committedUrls.length} / {maxImages}</span>
        </div>
      )}
      {hint && <p className="text-xs text-[#1c2a2b]/45">{hint}</p>}

      <div className="grid grid-cols-3 gap-3">
        {/* Committed images */}
        {committedUrls.map((url, idx) => (
          <div key={url} className="relative rounded-lg overflow-hidden border border-[#0e393d]/12 bg-[#fafaf8] group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-24 object-cover" />

            {/* Index badge */}
            <span className="absolute top-1.5 left-1.5 bg-black/50 text-white text-[10px] rounded px-1.5 py-0.5 font-medium">
              {idx + 1}
            </span>

            {/* Reorder buttons */}
            <div className="absolute top-1.5 right-7 flex gap-1 opacity-0 group-hover:opacity-100 transition">
              {idx > 0 && (
                <button type="button" title="Move left" onClick={() => move(idx, -1)}
                  className="w-5 h-5 rounded bg-black/50 text-white hover:bg-black/70 flex items-center justify-center transition">
                  <svg width="8" height="8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 10 10">
                    <path d="M7 2L3 5l4 3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
              {idx < committedUrls.length - 1 && (
                <button type="button" title="Move right" onClick={() => move(idx, 1)}
                  className="w-5 h-5 rounded bg-black/50 text-white hover:bg-black/70 flex items-center justify-center transition">
                  <svg width="8" height="8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 10 10">
                    <path d="M3 2l4 3-4 3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>

            {/* Delete button */}
            <button type="button" title="Remove photo" onClick={() => remove(url)}
              className="absolute top-1.5 right-1.5 w-5 h-5 rounded bg-red-500/80 text-white hover:bg-red-600 flex items-center justify-center transition">
              <svg width="8" height="8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 10 10">
                <path d="M2 2l6 6M8 2l-6 6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}

        {/* Pending (uploading) placeholders */}
        {pending.map((p) => (
          <div key={p.key} className="relative rounded-lg overflow-hidden border border-[#0e393d]/12 bg-[#fafaf8]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.preview} alt="" className="w-full h-24 object-cover opacity-50" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-[#0e393d]/30 border-t-[#0e393d] rounded-full animate-spin" />
            </div>
          </div>
        ))}

        {/* Add slot */}
        {totalShown < maxImages && (
          <button type="button" onClick={() => inputRef.current?.click()}
            className="min-h-[6rem] rounded-lg border-2 border-dashed border-[#0e393d]/15 hover:border-[#0e393d]/30 hover:bg-[#0e393d]/3 flex flex-col items-center justify-center gap-1.5 transition text-[#1c2a2b]/30 hover:text-[#0e393d]/50">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            <span className="text-xs">{totalShown === 0 ? 'Add photos' : 'Add more'}</span>
            <span className="text-[10px] text-[#1c2a2b]/25">{maxImages - totalShown} remaining</span>
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
    </div>
  );
}
