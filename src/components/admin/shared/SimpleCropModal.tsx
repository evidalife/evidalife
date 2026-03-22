'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import type CropperType from 'react-easy-crop';

const Cropper = dynamic(() => import('react-easy-crop').then((m) => m.default), { ssr: false }) as unknown as typeof CropperType;

interface CropArea { x: number; y: number; width: number; height: number }

interface Props {
  imageUrl: string;
  aspect: number;        // e.g. 16/9 or 1
  outputWidth: number;   // pixels of final output
  outputHeight: number;
  title?: string;
  onConfirm: (blob: Blob, sizeKb: number) => void;
  onClose: () => void;
}

export default function SimpleCropModal({ imageUrl, aspect, outputWidth, outputHeight, title = 'Crop Image', onConfirm, onClose }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixelCrop, setPixelCrop] = useState<CropArea | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onCropComplete = useCallback((_: unknown, pixels: CropArea) => {
    setPixelCrop(pixels);
  }, []);

  useEffect(() => {
    if (!pixelCrop) return;
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(async () => {
      const image = new Image();
      image.src = imageUrl;
      await new Promise<void>((resolve) => { image.onload = () => resolve(); });
      const canvas = document.createElement('canvas');
      const previewW = Math.round(outputWidth / 2);
      const previewH = Math.round(outputHeight / 2);
      canvas.width = previewW;
      canvas.height = previewH;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, previewW, previewH);
      setPreview(canvas.toDataURL('image/webp', 0.7));
    }, 150);
    return () => { if (previewTimerRef.current) clearTimeout(previewTimerRef.current); };
  }, [imageUrl, pixelCrop, outputWidth, outputHeight]);

  const handleConfirm = async () => {
    if (!pixelCrop) return;
    const image = new Image();
    image.src = imageUrl;
    await new Promise<void>((resolve) => { image.onload = () => resolve(); });
    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, outputWidth, outputHeight);
    canvas.toBlob((blob) => {
      if (!blob) return;
      onConfirm(blob, Math.round(blob.size / 1024));
    }, 'image/jpeg', 0.85);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-[#0e393d]/10 shadow-2xl w-full max-w-xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#0e393d]/10 px-5 py-4">
            <h3 className="font-serif text-base text-[#0e393d]">{title}</h3>
            <button onClick={onClose} className="text-[#1c2a2b]/40 hover:text-[#1c2a2b] transition">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
            </button>
          </div>

          {/* Cropper */}
          <div className="relative h-72 bg-[#0e393d]/5">
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          {/* Zoom */}
          <div className="px-5 py-3 border-b border-[#0e393d]/8 flex items-center gap-3">
            <span className="text-xs text-[#1c2a2b]/40 w-12 shrink-0">Zoom</span>
            <input
              type="range" min={1} max={3} step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-[#0e393d]"
            />
            <span className="text-xs text-[#1c2a2b]/40 w-10 text-right shrink-0">{zoom.toFixed(2)}×</span>
          </div>

          {/* Preview + Actions */}
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Preview" className="h-14 rounded-lg border border-[#0e393d]/10 object-cover" />
              )}
              <span className="text-[11px] text-[#1c2a2b]/40">{outputWidth}×{outputHeight}px · JPEG</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm text-[#0e393d] bg-[#0e393d]/8 hover:bg-[#0e393d]/15 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-[#0e393d] text-white hover:bg-[#0e393d]/90 transition"
              >
                Apply crop
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
