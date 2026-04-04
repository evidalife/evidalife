'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import CoverImageUploader from '@/components/shared/CoverImageUploader';

/* ─── Types ────────────────────────────────────────────────────────────── */

interface SitePhoto {
  id: string;
  key: string;
  label: string;
  description: string | null;
  url: string;
  bucket: string;
  storage_path: string | null;
  photo_credit: string | null;
  width: number | null;
  height: number | null;
  file_size_kb: number | null;
  used_in: string | null;
  updated_at: string;
}

/* ─── Component ────────────────────────────────────────────────────────── */

export default function WebsitePhotosTab() {
  const supabase = createClient();
  const [photos, setPhotos] = useState<SitePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /* ── Load ────────────────────────────────────────────────────────────── */
  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('site_photos')
      .select('*')
      .order('key');
    if (data) setPhotos(data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { refresh(); }, [refresh]);

  /* ── Update photo URL ───────────────────────────────────────────────── */
  const handleUrlChange = async (photo: SitePhoto, newUrl: string | null) => {
    if (!newUrl) return;
    setSaving(true);

    // Extract storage path from URL
    const marker = `/website-photos/`;
    const idx = newUrl.indexOf(marker);
    const storagePath = idx !== -1 ? newUrl.slice(idx + marker.length) : null;

    await supabase
      .from('site_photos')
      .update({
        url: newUrl,
        storage_path: storagePath,
        updated_at: new Date().toISOString(),
      })
      .eq('id', photo.id);

    setSaving(false);
    setEditingId(null);
    refresh();
  };

  /* ── Update photo credit ────────────────────────────────────────────── */
  const handleCreditChange = async (photo: SitePhoto, credit: string) => {
    await supabase
      .from('site_photos')
      .update({ photo_credit: credit || null, updated_at: new Date().toISOString() })
      .eq('id', photo.id);
  };

  /* ── Group photos by used_in ────────────────────────────────────────── */
  const grouped = photos.reduce<Record<string, SitePhoto[]>>((acc, p) => {
    const group = p.used_in || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(p);
    return acc;
  }, {});

  /* ── Render ─────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="animate-pulse space-y-4 p-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-[#0e393d]/5 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Stats */}
      <div className="flex gap-4">
        <div className="rounded-xl border border-[#0e393d]/8 bg-gradient-to-br from-white to-[#0e393d]/[0.02] px-4 py-3">
          <div className="text-2xl font-semibold text-[#0e393d]">{photos.length}</div>
          <div className="text-xs text-[#1c2a2b]/50 mt-0.5">Total photos</div>
        </div>
        <div className="rounded-xl border border-[#0e393d]/8 bg-gradient-to-br from-white to-[#0e393d]/[0.02] px-4 py-3">
          <div className="text-2xl font-semibold text-[#0e393d]">{Object.keys(grouped).length}</div>
          <div className="text-xs text-[#1c2a2b]/50 mt-0.5">Pages</div>
        </div>
        <div className="rounded-xl border border-[#0e393d]/8 bg-gradient-to-br from-white to-[#0e393d]/[0.02] px-4 py-3">
          <div className="text-2xl font-semibold text-emerald-600">{photos.filter(p => p.url && !p.url.includes('unsplash.com')).length}</div>
          <div className="text-xs text-[#1c2a2b]/50 mt-0.5">Self-hosted</div>
        </div>
      </div>

      {saving && (
        <div className="text-xs text-[#0e393d]/50 animate-pulse">Saving…</div>
      )}

      {/* Photo groups */}
      {Object.entries(grouped).map(([group, groupPhotos]) => (
        <div key={group}>
          <h3 className="font-serif text-base text-[#0e393d] mb-4 flex items-center gap-2">
            <span className="text-[#0e393d]/30">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </span>
            {group}
            <span className="text-xs text-[#1c2a2b]/30 font-sans font-normal">{groupPhotos.length} photo{groupPhotos.length !== 1 ? 's' : ''}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupPhotos.map((photo) => (
              <div
                key={photo.id}
                className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden group"
              >
                {/* Photo preview */}
                <div className="relative aspect-video bg-[#0e393d]/5 overflow-hidden">
                  {photo.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo.url}
                      alt={photo.label}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0e393d" strokeWidth="1.25" opacity="0.2">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                    </div>
                  )}

                  {/* Hover overlay with edit button */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      type="button"
                      onClick={() => setEditingId(editingId === photo.id ? null : photo.id)}
                      className="px-3 py-1.5 rounded-lg bg-white/90 text-xs font-medium text-[#0e393d] hover:bg-white transition shadow-sm"
                    >
                      {editingId === photo.id ? 'Close' : 'Change photo'}
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[#0e393d]">{photo.label}</p>
                    <span className="text-[10px] font-mono text-[#1c2a2b]/30">{photo.key}</span>
                  </div>
                  {photo.description && (
                    <p className="text-xs text-[#1c2a2b]/45 mt-0.5">{photo.description}</p>
                  )}
                  {photo.photo_credit && (
                    <p className="text-[10px] text-[#1c2a2b]/30 mt-1 italic">{photo.photo_credit}</p>
                  )}
                </div>

                {/* Edit panel (expandable) */}
                {editingId === photo.id && (
                  <div className="border-t border-[#0e393d]/8 px-3 py-3">
                    <CoverImageUploader
                      bucket="website-photos"
                      crops={[
                        {
                          key: 'photo',
                          label: photo.label,
                          aspect: 16 / 9,
                          outputWidth: 1200,
                          outputHeight: 675,
                          url: photo.url,
                          onUrlChange: (url) => handleUrlChange(photo, url),
                        },
                      ]}
                      label="Replace Photo"
                      hint="Upload a new image or import from Unsplash"
                      photoCredit={photo.photo_credit}
                      onPhotoCreditChange={(credit) => handleCreditChange(photo, credit)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
