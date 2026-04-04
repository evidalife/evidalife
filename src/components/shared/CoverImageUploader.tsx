'use client';

import { useRef, useState, useCallback } from 'react';
import SimpleCropModal from '@/components/admin/shared/SimpleCropModal';

/* ─── Types ────────────────────────────────────────────────────────────── */

export interface CropOutput {
  /** Unique key for this crop, e.g. "cover" or "thumbnail" */
  key: string;
  /** Display label, e.g. "Cover (16:9)" */
  label: string;
  /** Aspect ratio number, e.g. 16/9 */
  aspect: number;
  /** Output width in pixels */
  outputWidth: number;
  /** Output height in pixels */
  outputHeight: number;
  /** Current URL (controlled) */
  url: string | null;
  /** Called when this crop's URL changes */
  onUrlChange: (url: string | null) => void;
}

interface Props {
  /** Storage bucket name */
  bucket: string;
  /** One or more crop outputs from a single source image */
  crops: CropOutput[];
  /** Max upload file size in MB (default 5) */
  maxFileSizeMB?: number;
  /** Section label (default "Cover Image") */
  label?: string;
  /** Hint text */
  hint?: string;
  /** Optional photo credit / attribution */
  photoCredit?: string | null;
  /** Called when credit text changes */
  onPhotoCreditChange?: (v: string) => void;
}

/* ─── Helpers ──────────────────────────────────────────────────────────── */

async function deleteFromStorage(url: string | null, bucket: string) {
  if (!url) return;
  try {
    const res = await fetch('/api/delete-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, bucket }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: res.statusText }));
      console.error(`[CoverImageUploader] Delete failed (${bucket}):`, error);
    }
  } catch (e) {
    console.error(`[CoverImageUploader] Delete request failed (${bucket}):`, e);
  }
}

async function uploadBlob(blob: Blob, bucket: string): Promise<string> {
  const reader = new FileReader();
  const base64 = await new Promise<string>((resolve) => {
    reader.onload = (e) => resolve((e.target!.result as string).split(',')[1]);
    reader.readAsDataURL(blob);
  });
  const res = await fetch('/api/upload-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64, filename: 'cover.jpg', bucket, contentType: 'image/jpeg' }),
  });
  if (!res.ok) throw new Error('Upload failed.');
  const { url } = await res.json();
  return url as string;
}

/** Try to extract Unsplash photo credit from a URL */
function extractUnsplashCredit(url: string): string | null {
  // Unsplash URLs: https://unsplash.com/photos/{id} or https://images.unsplash.com/photo-...
  // We can't get the photographer name from the image URL alone,
  // but the Unsplash API route will handle that
  try {
    const u = new URL(url);
    if (u.hostname === 'unsplash.com' && u.pathname.startsWith('/photos/')) {
      return null; // Will be fetched via API
    }
  } catch { /* ignore */ }
  return null;
}

/* ─── Component ────────────────────────────────────────────────────────── */

export default function CoverImageUploader({
  bucket,
  crops,
  maxFileSizeMB = 5,
  label = 'Cover Image',
  hint,
  photoCredit,
  onPhotoCreditChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const [activeCropKey, setActiveCropKey] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unsplashInput, setUnsplashInput] = useState('');
  const [importingUnsplash, setImportingUnsplash] = useState(false);

  // When we have a single crop, show a simpler UI
  const isSingleCrop = crops.length === 1;

  // Primary crop is the first one (shown as main preview)
  const primaryCrop = crops[0];
  const primaryUrl = primaryCrop?.url;

  /* ── File selection → open first crop ────────────────────────────── */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxFileSizeMB * 1024 * 1024) {
      setError(`Image must be under ${maxFileSizeMB} MB.`);
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setSourceImageUrl(dataUrl);
      // Open crop modal for first crop
      setActiveCropKey(crops[0].key);
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  /* ── Unsplash URL import ─────────────────────────────────────────── */
  const handleUnsplashImport = useCallback(async () => {
    const url = unsplashInput.trim();
    if (!url) return;

    // Validate it looks like an Unsplash URL or other image URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError('Please enter a valid URL starting with https://');
      return;
    }

    setImportingUnsplash(true);
    setError(null);

    try {
      // Call our API to download and process the Unsplash image
      const res = await fetch('/api/import-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Import failed');
      }

      const data = await res.json();

      // Set source image for cropping
      setSourceImageUrl(data.dataUrl);

      // Auto-fill credit if available
      if (data.credit && onPhotoCreditChange) {
        onPhotoCreditChange(data.credit);
      }

      // Open crop for first crop output
      setActiveCropKey(crops[0].key);
      setCropOpen(true);
      setUnsplashInput('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImportingUnsplash(false);
    }
  }, [unsplashInput, crops, onPhotoCreditChange]);

  /* ── Crop confirmed → upload ─────────────────────────────────────── */
  const handleCropConfirm = async (blob: Blob) => {
    setCropOpen(false);
    setUploading(true);
    setError(null);

    const currentCrop = crops.find((c) => c.key === activeCropKey);
    if (!currentCrop) { setUploading(false); return; }

    try {
      // Delete old image for this crop
      await deleteFromStorage(currentCrop.url, bucket);

      // Upload new cropped image
      const newUrl = await uploadBlob(blob, bucket);
      currentCrop.onUrlChange(newUrl);

      // If there are more crops to process after initial upload, open next
      if (sourceImageUrl) {
        const currentIdx = crops.findIndex((c) => c.key === activeCropKey);
        const nextCrop = crops[currentIdx + 1];
        if (nextCrop && !nextCrop.url) {
          // Auto-open next crop if it doesn't have an image yet
          setActiveCropKey(nextCrop.key);
          setCropOpen(true);
        } else {
          setSourceImageUrl(null);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  /* ── Re-crop existing image ──────────────────────────────────────── */
  const handleReCrop = (cropKey: string) => {
    const crop = crops.find((c) => c.key === cropKey);
    if (!crop) return;

    // Use the existing uploaded image as source for re-cropping
    if (crop.url) {
      setSourceImageUrl(crop.url);
    } else if (primaryUrl) {
      // Fall back to primary crop as source
      setSourceImageUrl(primaryUrl);
    }

    setActiveCropKey(cropKey);
    setCropOpen(true);
  };

  /* ── Remove all images ───────────────────────────────────────────── */
  const handleRemove = async () => {
    for (const crop of crops) {
      await deleteFromStorage(crop.url, bucket);
      crop.onUrlChange(null);
    }
    if (onPhotoCreditChange) onPhotoCreditChange('');
  };

  /* ── Active crop config for modal ────────────────────────────────── */
  const activeCrop = crops.find((c) => c.key === activeCropKey);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <p className="text-xs font-semibold text-[#0e393d] uppercase tracking-wider">{label}</p>
        {(uploading || importingUnsplash) && (
          <span className="text-[10px] text-[#1c2a2b]/40 animate-pulse">
            {importingUnsplash ? 'Importing…' : 'Uploading…'}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-[#1c2a2b]/45">{hint}</p>}

      {/* Main preview + upload controls */}
      <div className="flex items-start gap-4">
        {/* Primary preview thumbnail */}
        <div className="w-32 shrink-0 aspect-video rounded-lg overflow-hidden border border-[#0e393d]/12 bg-[#fafaf8] flex items-center justify-center relative group">
          {primaryUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={primaryUrl} alt="" className="w-full h-full object-cover" />
              {/* Re-crop overlay button */}
              <button
                type="button"
                onClick={() => handleReCrop(primaryCrop.key)}
                className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                title="Edit crop"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5Z" />
                </svg>
              </button>
            </>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0e393d" strokeWidth="1.25" opacity="0.25">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-[#0e393d]/30 border-t-[#0e393d] rounded-full animate-spin" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            disabled={uploading || importingUnsplash}
            onClick={() => inputRef.current?.click()}
            className="text-xs font-medium text-[#0e393d] border border-[#0e393d]/20 rounded-lg px-3 py-1.5 hover:border-[#0e393d]/40 disabled:opacity-50 transition"
          >
            {primaryUrl ? 'Change image' : 'Upload image'}
          </button>
          {primaryUrl && (
            <button
              type="button"
              disabled={uploading}
              onClick={handleRemove}
              className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 transition text-left"
            >
              Remove
            </button>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>

      {/* Additional crop previews (when multiple crops) */}
      {!isSingleCrop && (
        <div className="flex flex-wrap gap-3 pt-1">
          {crops.slice(1).map((crop) => (
            <div key={crop.key} className="space-y-1">
              <p className="text-[10px] text-[#1c2a2b]/50 uppercase tracking-wider">{crop.label}</p>
              <div className="w-24 aspect-[4/3] rounded-lg overflow-hidden border border-[#0e393d]/12 bg-[#fafaf8] flex items-center justify-center relative group">
                {crop.url ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={crop.url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleReCrop(crop.key)}
                      className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                      title="Edit crop"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5Z" />
                      </svg>
                    </button>
                  </>
                ) : primaryUrl ? (
                  <button
                    type="button"
                    onClick={() => handleReCrop(crop.key)}
                    className="text-[10px] text-[#0e393d]/40 hover:text-[#0e393d] transition p-1 text-center"
                  >
                    Crop {crop.label}
                  </button>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0e393d" strokeWidth="1.25" opacity="0.2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Unsplash / URL import */}
      <div className="flex gap-2">
        <input
          type="text"
          value={unsplashInput}
          onChange={(e) => setUnsplashInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleUnsplashImport(); } }}
          placeholder="Import from URL — paste Unsplash or image link"
          className="flex-1 rounded-lg border border-[#0e393d]/15 bg-white px-3 py-1.5 text-xs text-[#1c2a2b] placeholder:text-[#1c2a2b]/25 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
        />
        <button
          type="button"
          disabled={!unsplashInput.trim() || importingUnsplash || uploading}
          onClick={handleUnsplashImport}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0e393d] text-white hover:bg-[#0e393d]/90 disabled:opacity-40 transition shrink-0"
        >
          {importingUnsplash ? (
            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Import'
          )}
        </button>
      </div>

      {/* Photo credit / attribution */}
      {onPhotoCreditChange && (
        <input
          type="text"
          value={photoCredit ?? ''}
          onChange={(e) => onPhotoCreditChange(e.target.value)}
          placeholder="Photo credit — e.g. Photo by John Doe on Unsplash"
          className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-1.5 text-xs text-[#1c2a2b] placeholder:text-[#1c2a2b]/25 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
        />
      )}

      {/* Crop modal */}
      {cropOpen && sourceImageUrl && activeCrop && (
        <SimpleCropModal
          imageUrl={sourceImageUrl}
          aspect={activeCrop.aspect}
          outputWidth={activeCrop.outputWidth}
          outputHeight={activeCrop.outputHeight}
          title={`Crop ${activeCrop.label}`}
          onConfirm={handleCropConfirm}
          onClose={() => { setCropOpen(false); setSourceImageUrl(null); setActiveCropKey(null); }}
        />
      )}
    </div>
  );
}
