'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import SimpleCropModal from '@/components/admin/shared/SimpleCropModal';

interface Props {
  currentUrl: string | null;
  bucket: string;
  aspect: number;
  outputWidth: number;
  outputHeight: number;
  maxFileSizeMB?: number;
  label?: string;
  hint?: string;
  onUrlChange: (url: string | null) => void;
}

async function deleteFromStorage(url: string | null, bucket: string) {
  if (!url) return;
  try {
    const bucketPrefix = `${bucket}/`;
    const idx = url.indexOf(bucketPrefix);
    if (idx === -1) return;
    const path = url.substring(idx + bucketPrefix.length);
    if (!path) return;
    const supabase = createClient();
    await supabase.storage.from(bucket).remove([path]);
  } catch (e) {
    console.error(`Failed to delete from ${bucket}:`, e);
  }
}

export default function CoverImageUploader({
  currentUrl,
  bucket,
  aspect,
  outputWidth,
  outputHeight,
  maxFileSizeMB = 5,
  label = 'Cover Image',
  hint,
  onUrlChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setCropImageUrl(ev.target?.result as string);
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropConfirm = async (blob: Blob) => {
    setCropOpen(false);
    setCropImageUrl(null);
    setUploading(true);
    setError(null);
    try {
      // Delete old image before uploading replacement
      await deleteFromStorage(currentUrl, bucket);

      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target!.result as string);
        reader.readAsDataURL(blob);
      });
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, filename: 'cover.jpg', bucket, contentType: 'image/jpeg' }),
      });
      if (!res.ok) throw new Error('Upload failed.');
      const { url } = await res.json();
      onUrlChange(url as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    await deleteFromStorage(currentUrl, bucket);
    onUrlChange(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <p className="text-xs font-semibold text-[#0e393d] uppercase tracking-wider">{label}</p>
        {uploading && <span className="text-[10px] text-[#1c2a2b]/40 animate-pulse">Uploading…</span>}
      </div>
      {hint && <p className="text-xs text-[#1c2a2b]/45">{hint}</p>}

      <div className="flex items-start gap-4">
        {/* Preview thumbnail */}
        <div className="w-32 shrink-0 aspect-video rounded-lg overflow-hidden border border-[#0e393d]/12 bg-[#fafaf8] flex items-center justify-center relative">
          {currentUrl ? (
            <img src={currentUrl} alt="" className="w-full h-full object-cover" />
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
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="text-xs font-medium text-[#0e393d] border border-[#0e393d]/20 rounded-lg px-3 py-1.5 hover:border-[#0e393d]/40 disabled:opacity-50 transition"
          >
            {currentUrl ? 'Change image' : 'Upload image'}
          </button>
          {currentUrl && (
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

      {cropOpen && cropImageUrl && (
        <SimpleCropModal
          imageUrl={cropImageUrl}
          aspect={aspect}
          outputWidth={outputWidth}
          outputHeight={outputHeight}
          title={`Crop ${label}`}
          onConfirm={handleCropConfirm}
          onClose={() => { setCropOpen(false); setCropImageUrl(null); }}
        />
      )}
    </div>
  );
}
