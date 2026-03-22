'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type CropperType from 'react-easy-crop';
const Cropper = dynamic(() => import('react-easy-crop').then((m) => m.default), { ssr: false }) as unknown as typeof CropperType;
import { createClient } from '@/lib/supabase/client';
import GalleryUpload, { type GalleryItem } from './GalleryUpload';

// ─── Constants ────────────────────────────────────────────────────────────────

const GOAL_TAGS = [
  { key: 'weight_loss',          label: 'Weight Loss' },
  { key: 'heart_health',         label: 'Heart Health' },
  { key: 'anti_inflammation',    label: 'Anti-Inflammation' },
  { key: 'longevity',            label: 'Longevity' },
  { key: 'gut_health',           label: 'Gut Health' },
  { key: 'energy',               label: 'Energy' },
  { key: 'immune',               label: 'Immune Support' },
  { key: 'bone_health',          label: 'Bone Health' },
  { key: 'brain_health',         label: 'Brain Health' },
  { key: 'diabetes_prevention',  label: 'Diabetes Prevention' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'de' | 'en';
type LangContent = { de: string; en: string };

type IngredientOption = {
  id: string;
  name: { de?: string; en?: string };
  slug: string;
  default_unit_id: string | null;
  kcal_per_100g: number | null;
  protein_per_100g: number | null;
  fat_per_100g: number | null;
  carbs_per_100g: number | null;
  fiber_per_100g: number | null;
};

type UnitOption = {
  id: string;
  code: string;
  name: { de?: string; en?: string };
  abbreviation: { de?: string; en?: string };
  sort_order: number;
};

type DailyDozenCategoryOption = {
  id: string;
  slug: string;
  name: { de?: string; en?: string };
  icon: string | null;
};

type PrepNoteOption = {
  id: string;
  name: { de?: string; en?: string };
  slug: string;
};

type CourseTypeOption = {
  id: string;
  name: { de?: string; en?: string };
  slug: string;
  sort_order: number;
};

type MealTypeOption = {
  id: string;
  name: { de?: string; en?: string };
  slug: string;
  sort_order: number;
};

type IngredientRow = {
  _key: string;
  ingredient_id: string | null;
  ingredient_name: { de: string; en: string };
  amount: string;
  unit_id: string | null;
  unit: string;
  note_id: string | null;
  note_display: string;
  notes: { de: string; en: string } | null;
  is_optional: boolean;
  /** null = ingredient row; string (incl. '') = section header row */
  section_header: string | null;
};

type NutritionForm = {
  calories: string;
  protein_g: string;
  fat_g: string;
  carbs_g: string;
  fiber_g: string;
};

type RecipeForm = {
  title: LangContent;
  slug: string;
  description: LangContent;
  instructions: LangContent;
  prep_time_min: string;
  cook_time_min: string;
  servings: string;
  difficulty: string;
  course_type_id: string;
  meal_type_ids: string[];
  nutrition: NutritionForm;
  is_published: boolean;
  is_featured: boolean;
  ingredients: IngredientRow[];
  goals: string[];
};

// ─── Defaults ─────────────────────────────────────────────────────────────────

const EMPTY_INGREDIENT: Omit<IngredientRow, '_key'> = {
  ingredient_id: null,
  ingredient_name: { de: '', en: '' },
  amount: '',
  unit_id: null,
  unit: '',
  note_id: null,
  note_display: '',
  notes: null,
  is_optional: false,
  section_header: null,
};

const EMPTY_FORM: RecipeForm = {
  title:        { de: '', en: '' },
  slug: '',
  description:  { de: '', en: '' },
  instructions: { de: '', en: '' },
  prep_time_min: '', cook_time_min: '', servings: '',
  difficulty: 'easy',
  course_type_id: '',
  meal_type_ids: [],
  nutrition: { calories: '', protein_g: '', fat_g: '', carbs_g: '', fiber_g: '' },
  is_published: false, is_featured: false,
  ingredients: [], goals: [],
};

let _keyCounter = 0;
const newKey = () => `_k${++_keyCounter}`;

function slugify(text: string): string {
  return text.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'recipe';
}

function ingredientSlugify(text: string): string {
  return text.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'ingredient';
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

const inputCls = 'w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#0e393d]/70 mb-1">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-[#1c2a2b]/40">{hint}</p>}
    </div>
  );
}


function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[#0e393d]/10 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-[#1c2a2b]">{label}</p>
        {hint && <p className="text-xs text-[#1c2a2b]/40">{hint}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-[#0e393d]' : 'bg-gray-200'}`}
      >
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

function IconBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} title={title}
      className="flex items-center justify-center w-7 h-7 rounded-md text-[#1c2a2b]/40 hover:text-[#0e393d] hover:bg-[#0e393d]/8 transition"
    >{children}</button>
  );
}

function SectionBlock({
  title, open, onToggle, badge, children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-[#0e393d]/8 pt-5">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between mb-3 group"
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#ceab84]">{title}</span>
          {badge && <span>{badge}</span>}
        </div>
        <svg
          width="14" height="14" viewBox="0 0 14 14" fill="none"
          className={`text-[#0e393d]/30 group-hover:text-[#0e393d]/60 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#0e393d]/8 px-2 py-0.5 text-[10px] font-medium text-[#0e393d]/60">
      {children}
    </span>
  );
}

// ─── Cover Image Crop Types + Helpers ─────────────────────────────────────────

type CropArea = { x: number; y: number; width: number; height: number };
type CropData = { x: number; y: number; width: number; height: number; zoom: number };

async function compressImage(file: File, maxWidth = 1200, quality = 0.85): Promise<{ blob: Blob; sizeKb: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const mimeType = file.type === 'image/png' ? 'image/png' : 'image/webp';
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve({ blob: blob!, sizeKb: Math.round(blob!.size / 1024) });
    }, mimeType, quality);
  });
}

async function getCroppedCanvas(
  imageSrc: string,
  pixelCrop: CropArea,
  outputWidth: number,
  outputHeight: number,
): Promise<HTMLCanvasElement> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise<void>((resolve) => { image.onload = () => resolve(); });
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, outputWidth, outputHeight);
  return canvas;
}

// ─── Cover Crop Modal ─────────────────────────────────────────────────────────

interface CoverCropModalProps {
  imageUrl: string;
  initialDetail: CropData | null;
  initialGrid: CropData | null;
  onConfirm: (detail: CropData, grid: CropData) => void;
  onClose: () => void;
}

function CoverCropModal({ imageUrl, initialDetail, initialGrid, onConfirm, onClose }: CoverCropModalProps) {
  const [activeTab, setActiveTab] = useState<'detail' | 'grid'>('detail');

  const [detailCrop, setDetailCrop] = useState(initialDetail ? { x: initialDetail.x, y: initialDetail.y } : { x: 0, y: 0 });
  const [detailZoom, setDetailZoom] = useState(initialDetail?.zoom ?? 1);
  const [detailPixels, setDetailPixels] = useState<CropArea | null>(null);

  const [gridCrop, setGridCrop] = useState(initialGrid ? { x: initialGrid.x, y: initialGrid.y } : { x: 0, y: 0 });
  const [gridZoom, setGridZoom] = useState(initialGrid?.zoom ?? 1);
  const [gridPixels, setGridPixels] = useState<CropArea | null>(null);

  const [detailPreview, setDetailPreview] = useState<string | null>(null);
  const [gridPreview, setGridPreview] = useState<string | null>(null);

  const onDetailCropComplete = useCallback((_: unknown, pixels: CropArea) => {
    setDetailPixels(pixels);
  }, []);

  const onGridCropComplete = useCallback((_: unknown, pixels: CropArea) => {
    setGridPixels(pixels);
  }, []);

  // Render previews when pixel crops change
  useEffect(() => {
    if (!detailPixels) return;
    getCroppedCanvas(imageUrl, detailPixels, 480, 270).then((c) => setDetailPreview(c.toDataURL('image/webp', 0.7)));
  }, [imageUrl, detailPixels]);

  useEffect(() => {
    if (!gridPixels) return;
    getCroppedCanvas(imageUrl, gridPixels, 400, 300).then((c) => setGridPreview(c.toDataURL('image/webp', 0.7)));
  }, [imageUrl, gridPixels]);

  const handleConfirm = () => {
    const detail: CropData = { x: detailCrop.x, y: detailCrop.y, width: detailPixels?.width ?? 0, height: detailPixels?.height ?? 0, zoom: detailZoom };
    const grid: CropData = { x: gridCrop.x, y: gridCrop.y, width: gridPixels?.width ?? 0, height: gridPixels?.height ?? 0, zoom: gridZoom };
    onConfirm(detail, grid);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-[#0e393d]/10 shadow-2xl w-full max-w-xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#0e393d]/10 px-5 py-4">
            <h3 className="font-serif text-base text-[#0e393d]">Crop Cover Image</h3>
            <button onClick={onClose} className="text-[#1c2a2b]/40 hover:text-[#1c2a2b] transition">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#0e393d]/10 px-5">
            {(['detail', 'grid'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-xs font-medium transition border-b-2 -mb-px ${
                  activeTab === tab
                    ? 'border-[#0e393d] text-[#0e393d]'
                    : 'border-transparent text-[#1c2a2b]/50 hover:text-[#1c2a2b]'
                }`}
              >
                {tab === 'detail' ? 'Detail 16:9' : 'Grid 4:3'}
              </button>
            ))}
          </div>

          {/* Crop area */}
          <div className="relative bg-black" style={{ height: 280 }}>
            {activeTab === 'detail' && (
              <Cropper
                image={imageUrl}
                crop={detailCrop}
                zoom={detailZoom}
                aspect={16 / 9}
                onCropChange={setDetailCrop}
                onZoomChange={setDetailZoom}
                onCropComplete={onDetailCropComplete}
              />
            )}
            {activeTab === 'grid' && (
              <Cropper
                image={imageUrl}
                crop={gridCrop}
                zoom={gridZoom}
                aspect={4 / 3}
                onCropChange={setGridCrop}
                onZoomChange={setGridZoom}
                onCropComplete={onGridCropComplete}
              />
            )}
          </div>

          {/* Zoom slider */}
          <div className="flex items-center gap-3 px-5 py-3 border-t border-[#0e393d]/8">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="text-[#1c2a2b]/40 shrink-0"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/><path d="M11 8v6M8 11h6"/></svg>
            <input
              type="range" min={1} max={3} step={0.05}
              value={activeTab === 'detail' ? detailZoom : gridZoom}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (activeTab === 'detail') setDetailZoom(v);
                else setGridZoom(v);
              }}
              className="flex-1 accent-[#0e393d]"
            />
            <span className="text-[11px] text-[#1c2a2b]/40 w-8 text-right">
              {(activeTab === 'detail' ? detailZoom : gridZoom).toFixed(1)}×
            </span>
          </div>

          {/* Previews */}
          <div className="flex gap-4 px-5 pb-4">
            <div className="flex-1">
              <p className="text-[10px] text-[#1c2a2b]/40 mb-1">Detail page (16:9)</p>
              <div className="rounded-lg overflow-hidden bg-[#f5f4f0] border border-[#0e393d]/8" style={{ aspectRatio: '16/9' }}>
                {detailPreview
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={detailPreview} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-[10px] text-[#1c2a2b]/20">preview</div>
                }
              </div>
            </div>
            <div className="w-32 shrink-0">
              <p className="text-[10px] text-[#1c2a2b]/40 mb-1">Grid card (4:3)</p>
              <div className="rounded-lg overflow-hidden bg-[#f5f4f0] border border-[#0e393d]/8" style={{ aspectRatio: '4/3' }}>
                {gridPreview
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={gridPreview} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-[10px] text-[#1c2a2b]/20">preview</div>
                }
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 border-t border-[#0e393d]/10 px-5 py-4">
            <button onClick={onClose} className="flex-1 rounded-lg border border-[#0e393d]/15 py-2 text-sm font-medium text-[#1c2a2b] hover:bg-[#fafaf8] transition">
              Cancel
            </button>
            <button onClick={handleConfirm} className="flex-1 rounded-lg bg-[#0e393d] py-2 text-sm font-medium text-white hover:bg-[#0e393d]/90 transition">
              Apply crop
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Ingredient Combobox ──────────────────────────────────────────────────────

interface IngredientComboboxProps {
  value: string | null;
  displayValue: string;
  ingredientOptions: IngredientOption[];
  onSelect: (ing: IngredientOption) => void;
  onOpenQuickAdd: () => void;
}

function IngredientCombobox({ value, displayValue, ingredientOptions, onSelect, onOpenQuickAdd }: IngredientComboboxProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState(displayValue);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setInputVal(displayValue); }, [displayValue]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setInputVal(displayValue);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [displayValue]);

  const filtered = query.length > 0
    ? ingredientOptions.filter((ing) => {
        const q = query.toLowerCase();
        return ing.name?.de?.toLowerCase().includes(q) || ing.name?.en?.toLowerCase().includes(q);
      }).slice(0, 30)
    : ingredientOptions.slice(0, 30);

  return (
    <div ref={containerRef} className="relative flex-1">
      <input
        value={inputVal}
        onFocus={() => { setQuery(''); setOpen(true); }}
        onChange={(e) => { setQuery(e.target.value); setInputVal(e.target.value); setOpen(true); }}
        placeholder="Search ingredient…"
        className="w-full rounded-md border border-[#0e393d]/12 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#0e393d]/20"
      />
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-64 bg-white rounded-lg border border-[#0e393d]/15 shadow-lg overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && <div className="px-3 py-2 text-xs text-[#1c2a2b]/40">No results</div>}
            {filtered.map((ing) => (
              <button
                key={ing.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(ing);
                  const label = [ing.name?.de, ing.name?.en].filter(Boolean).join(' / ');
                  setInputVal(label);
                  setQuery('');
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[#0e393d]/5 transition ${value === ing.id ? 'bg-[#0e393d]/8 font-medium' : ''}`}
              >
                <span className="text-[#0e393d]">{ing.name?.de}</span>
                {ing.name?.en && <span className="text-[#1c2a2b]/40"> / {ing.name.en}</span>}
              </button>
            ))}
          </div>
          <div className="border-t border-[#0e393d]/8 px-3 py-1.5">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setOpen(false); onOpenQuickAdd(); }}
              className="text-xs text-[#ceab84] hover:text-[#8a6a3e] font-medium transition"
            >
              + New ingredient
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Prep Notes Combobox ──────────────────────────────────────────────────────

interface PrepNotesComboboxProps {
  value: string | null;
  displayValue: string;
  noteOptions: PrepNoteOption[];
  onSelect: (note: PrepNoteOption) => void;
  onClear: () => void;
  onOpenQuickAdd: () => void;
}

function PrepNotesCombobox({ value, displayValue, noteOptions, onSelect, onClear, onOpenQuickAdd }: PrepNotesComboboxProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState(displayValue);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setInputVal(displayValue); }, [displayValue]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setInputVal(displayValue);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [displayValue]);

  const filtered = query.length > 0
    ? noteOptions.filter((n) => {
        const q = query.toLowerCase();
        return n.name?.de?.toLowerCase().includes(q) || n.name?.en?.toLowerCase().includes(q);
      }).slice(0, 20)
    : noteOptions.slice(0, 20);

  return (
    <div ref={containerRef} className="relative w-36 shrink-0">
      <div className="flex items-center rounded-md border border-[#0e393d]/12 bg-white overflow-hidden">
        <input
          value={inputVal}
          onFocus={() => { setQuery(''); setOpen(true); }}
          onChange={(e) => { setQuery(e.target.value); setInputVal(e.target.value); setOpen(true); }}
          placeholder="Notes…"
          className="flex-1 min-w-0 px-2 py-1 text-xs focus:outline-none bg-transparent"
        />
        {value && (
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onClear(); setInputVal(''); setQuery(''); }}
            className="px-1.5 text-[#1c2a2b]/30 hover:text-[#1c2a2b]/60 transition text-base leading-none"
            title="Clear note"
          >×</button>
        )}
      </div>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-52 bg-white rounded-lg border border-[#0e393d]/15 shadow-lg overflow-hidden">
          <div className="max-h-40 overflow-y-auto">
            {filtered.length === 0 && <div className="px-3 py-2 text-xs text-[#1c2a2b]/40">No results</div>}
            {filtered.map((note) => (
              <button
                key={note.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(note);
                  const label = [note.name?.de, note.name?.en].filter(Boolean).join(' / ');
                  setInputVal(label);
                  setQuery('');
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[#0e393d]/5 transition ${value === note.id ? 'bg-[#0e393d]/8 font-medium' : ''}`}
              >
                <span className="text-[#0e393d]">{note.name?.de}</span>
                {note.name?.en && <span className="text-[#1c2a2b]/40"> / {note.name.en}</span>}
              </button>
            ))}
          </div>
          <div className="border-t border-[#0e393d]/8 px-3 py-1.5">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setOpen(false); onOpenQuickAdd(); }}
              className="text-xs text-[#ceab84] hover:text-[#8a6a3e] font-medium transition"
            >
              + New note
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Markdown Toolbar ─────────────────────────────────────────────────────────

function MarkdownToolbar({ taRef, value, onChange }: {
  taRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (v: string) => void;
}) {
  const insert = (before: string, after = '', defaultText = '') => {
    const ta = taRef.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const sel = value.slice(s, e) || defaultText;
    const next = value.slice(0, s) + before + sel + after + value.slice(e);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const cur = s + before.length + sel.length + after.length;
      ta.setSelectionRange(cur, cur);
    });
  };

  const btns: { label: string; title: string; fn: () => void }[] = [
    { label: 'B',       title: 'Bold',          fn: () => insert('**', '**', 'bold') },
    { label: 'I',       title: 'Italic',         fn: () => insert('*', '*', 'italic') },
    { label: '## H',    title: 'Heading',        fn: () => insert('\n## ', '', 'Heading') },
    { label: '– List',  title: 'Bullet list',    fn: () => insert('\n- ', '', 'Item') },
    { label: '1. Num',  title: 'Numbered list',  fn: () => insert('\n1. ', '', 'Item') },
    { label: '> Quote', title: 'Blockquote',     fn: () => insert('\n> ', '', 'Quote') },
    { label: '---',     title: 'Divider',        fn: () => insert('\n\n---\n\n') },
    {
      label: '📷 Photo',
      title: 'Insert photo reference',
      fn: () => {
        const matches = value.match(/!\[photo:\d+\]/g);
        const n = (matches ? matches.length : 0) + 1;
        insert(`![photo:${n}]`);
      },
    },
  ];

  return (
    <div className="flex flex-wrap gap-1 mb-1.5">
      {btns.map((b) => (
        <button
          key={b.label}
          type="button"
          title={b.title}
          onMouseDown={(e) => { e.preventDefault(); b.fn(); }}
          className="rounded px-1.5 py-0.5 text-[11px] font-medium text-[#1c2a2b]/60 bg-[#0e393d]/5 hover:bg-[#0e393d]/12 hover:text-[#0e393d] transition select-none"
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}

// ─── Quick-Add Ingredient Modal ───────────────────────────────────────────────

interface QuickAddIngredientModalProps {
  units: UnitOption[];
  categories: DailyDozenCategoryOption[];
  onSaved: (ing: IngredientOption) => void;
  onClose: () => void;
}

function QuickAddIngredientModal({ units, categories, onSaved, onClose }: QuickAddIngredientModalProps) {
  const supabase = createClient();
  const [nameDe, setNameDe] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [defaultUnitId, setDefaultUnitId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!nameDe.trim()) { setError('Name (DE) is required.'); return; }
    if (!nameEn.trim()) { setError('Name (EN) is required.'); return; }
    setSaving(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('ingredients')
      .insert({
        name: { de: nameDe.trim(), en: nameEn.trim() },
        slug: ingredientSlugify(nameDe),
        default_unit_id: defaultUnitId || null,
        daily_dozen_category_id: categoryId || null,
        is_common: false,
      })
      .select('id, name, slug, default_unit_id')
      .single();
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved({ id: data.id, name: data.name, slug: data.slug, default_unit_id: data.default_unit_id, kcal_per_100g: null, protein_per_100g: null, fat_per_100g: null, carbs_per_100g: null, fiber_per_100g: null });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[60]" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-[#0e393d]/10 shadow-2xl w-full max-w-sm">
          <div className="flex items-center justify-between border-b border-[#0e393d]/10 px-5 py-4">
            <h3 className="font-serif text-base text-[#0e393d]">Quick-Add Ingredient</h3>
            <button onClick={onClose} className="text-[#1c2a2b]/40 hover:text-[#1c2a2b] transition">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
            </button>
          </div>
          <div className="px-5 py-4 space-y-3">
            <Field label="Name DE *">
              <input className={inputCls} value={nameDe} onChange={(e) => setNameDe(e.target.value)} placeholder="z.B. Spinat" autoFocus />
            </Field>
            <Field label="Name EN *">
              <input className={inputCls} value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="e.g. Spinach" />
            </Field>
            <Field label="Default Unit">
              <select className={inputCls + ' cursor-pointer'} value={defaultUnitId} onChange={(e) => setDefaultUnitId(e.target.value)}>
                <option value="">— No default unit</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.abbreviation?.de ?? u.code} — {u.name?.de ?? u.code}</option>
                ))}
              </select>
            </Field>
            <Field label="Daily Dozen Category">
              <select className={inputCls + ' cursor-pointer'} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">— None</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.icon ? `${cat.icon} ` : ''}{cat.name?.de ?? cat.slug}</option>
                ))}
              </select>
            </Field>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          </div>
          <div className="flex gap-3 border-t border-[#0e393d]/10 px-5 py-4">
            <button onClick={onClose} className="flex-1 rounded-lg border border-[#0e393d]/15 py-2 text-sm font-medium text-[#1c2a2b] hover:bg-[#fafaf8] transition">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 rounded-lg bg-[#0e393d] py-2 text-sm font-medium text-white hover:bg-[#0e393d]/90 disabled:opacity-50 transition">
              {saving ? 'Saving…' : 'Create & Select'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Quick-Add Preparation Note Modal ────────────────────────────────────────

interface QuickAddNoteModalProps {
  onSaved: (note: PrepNoteOption) => void;
  onClose: () => void;
}

function QuickAddNoteModal({ onSaved, onClose }: QuickAddNoteModalProps) {
  const supabase = createClient();
  const [nameDe, setNameDe] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!nameDe.trim() && !nameEn.trim()) { setError('At least one name is required.'); return; }
    setSaving(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('preparation_notes')
      .insert({
        name: { de: nameDe.trim(), en: nameEn.trim() },
        slug: slugify(nameDe || nameEn),
        is_common: false,
      })
      .select('id, name, slug')
      .single();
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved({ id: data.id, name: data.name, slug: data.slug });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[60]" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-[#0e393d]/10 shadow-2xl w-full max-w-xs">
          <div className="flex items-center justify-between border-b border-[#0e393d]/10 px-5 py-4">
            <h3 className="font-serif text-base text-[#0e393d]">New Preparation Note</h3>
            <button onClick={onClose} className="text-[#1c2a2b]/40 hover:text-[#1c2a2b] transition">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
            </button>
          </div>
          <div className="px-5 py-4 space-y-3">
            <Field label="Name DE">
              <input className={inputCls} value={nameDe} onChange={(e) => setNameDe(e.target.value)} placeholder="z.B. zerdrückt" autoFocus />
            </Field>
            <Field label="Name EN">
              <input className={inputCls} value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="e.g. crushed" />
            </Field>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          </div>
          <div className="flex gap-3 border-t border-[#0e393d]/10 px-5 py-4">
            <button onClick={onClose} className="flex-1 rounded-lg border border-[#0e393d]/15 py-2 text-sm font-medium text-[#1c2a2b] hover:bg-[#fafaf8] transition">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 rounded-lg bg-[#0e393d] py-2 text-sm font-medium text-white hover:bg-[#0e393d]/90 disabled:opacity-50 transition">
              {saving ? 'Saving…' : 'Create & Select'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  recipeId: string | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}

export default function RecipeFormPanel({ recipeId, onClose, onSaved, onDeleted }: Props) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const instructionRef = useRef<HTMLTextAreaElement>(null);

  const [lang, setLang] = useState<Lang>('en');
  const [form, setForm] = useState<RecipeForm>(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [imageCompressedKb, setImageCompressedKb] = useState<number | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropDetail, setCropDetail] = useState<CropData | null>(null);
  const [cropGrid, setCropGrid] = useState<CropData | null>(null);
  const [loading, setLoading] = useState(!!recipeId);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reference data
  const [ingredientOptions, setIngredientOptions] = useState<IngredientOption[]>([]);
  const [unitOptions, setUnitOptions] = useState<UnitOption[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<DailyDozenCategoryOption[]>([]);
  const [prepNoteOptions, setPrepNoteOptions] = useState<PrepNoteOption[]>([]);
  const [courseTypeOptions, setCourseTypeOptions] = useState<CourseTypeOption[]>([]);
  const [mealTypeOptions, setMealTypeOptions] = useState<MealTypeOption[]>([]);

  // Modals
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddTargetKey, setQuickAddTargetKey] = useState<string | null>(null);
  const [quickAddNoteOpen, setQuickAddNoteOpen] = useState(false);
  const [quickAddNoteTargetKey, setQuickAddNoteTargetKey] = useState<string | null>(null);

  // Gallery
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);

  // Nutrition auto-calc mode
  const [nutritionAutoMode, setNutritionAutoMode] = useState(true);

  // Goal validation
  const [goalLimitWarning, setGoalLimitWarning] = useState(false);

  // Save validation
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Pending storage deletes — only executed after a successful DB save
  const pendingDeleteRef = useRef<string | null>(null);
  const originalGalleryUrlsRef = useRef<Set<string>>(new Set());

  // Collapsible sections — new recipe defaults: all key sections open; edit: all open except quick import
  type SectionKey = 'content' | 'basics' | 'ingredients' | 'nutrition' | 'goals' | 'cover' | 'gallery' | 'settings';
  const newRecipeDefaults: Record<SectionKey, boolean> = {
    content: true, basics: true, ingredients: true,
    nutrition: false, goals: false, cover: false, gallery: false, settings: false,
  };
  const editRecipeDefaults: Record<SectionKey, boolean> = {
    content: true, basics: true, ingredients: true,
    nutrition: true, goals: true, cover: true, gallery: true, settings: true,
  };
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>(
    recipeId ? editRecipeDefaults : newRecipeDefaults
  );
  const toggleSection = (key: SectionKey) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // ── Load reference data ───────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      supabase.from('ingredients').select('id, name, slug, default_unit_id, kcal_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, fiber_per_100g').order('name->de'),
      supabase.from('measurement_units').select('id, code, name, abbreviation, sort_order').order('sort_order'),
      supabase.from('daily_dozen_categories').select('id, slug, name, icon').order('sort_order'),
      supabase.from('preparation_notes').select('id, name, slug').order('slug'),
      supabase.from('recipe_course_types').select('id, name, slug, sort_order').order('sort_order'),
      supabase.from('recipe_meal_types').select('id, name, slug, sort_order').order('sort_order'),
    ]).then(([{ data: ings }, { data: units }, { data: cats }, { data: notes }, { data: courseTypes }, { data: mealTypes }]) => {
      if (ings) setIngredientOptions(ings as IngredientOption[]);
      if (units) setUnitOptions(units as UnitOption[]);
      if (cats) setCategoryOptions(cats as DailyDozenCategoryOption[]);
      if (notes) setPrepNoteOptions(notes as PrepNoteOption[]);
      if (courseTypes) setCourseTypeOptions(courseTypes as CourseTypeOption[]);
      if (mealTypes) setMealTypeOptions(mealTypes as MealTypeOption[]);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load existing recipe ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!recipeId) { setForm(EMPTY_FORM); setGalleryItems([]); setImageFile(null); setImagePreview(null); setCurrentImageUrl(null); setImageRemoved(false); pendingDeleteRef.current = null; originalGalleryUrlsRef.current = new Set(); setLoading(false); return; }
    setLoading(true);
    Promise.all([
      supabase.from('recipes').select('*').eq('id', recipeId).single(),
      supabase.from('recipe_ingredients').select('*').eq('recipe_id', recipeId).order('sort_order'),
      supabase.from('recipe_goal_tags').select('*').eq('recipe_id', recipeId),
      supabase.from('recipe_meal_type_tags').select('meal_type_id').eq('recipe_id', recipeId),
    ]).then(([{ data: r }, { data: ings }, { data: goals }, { data: mealTags }]) => {
      if (!r) { setLoading(false); return; }
      setCurrentImageUrl(r.image_url ?? null);
      setImageRemoved(false);
      setCropDetail((r as Record<string, unknown>).cover_crop_detail as CropData | null ?? null);
      setCropGrid((r as Record<string, unknown>).cover_crop_grid as CropData | null ?? null);
      pendingDeleteRef.current = null;
      setForm({
        title:        { de: r.title?.de ?? '',        en: r.title?.en ?? '' },
        slug: r.slug ?? '',
        description:  { de: r.description?.de ?? '',  en: r.description?.en ?? '' },
        instructions: { de: r.instructions?.de ?? '', en: r.instructions?.en ?? '' },
        prep_time_min: r.prep_time_min != null ? String(r.prep_time_min) : '',
        cook_time_min: r.cook_time_min != null ? String(r.cook_time_min) : '',
        servings:      r.servings     != null ? String(r.servings)      : '',
        difficulty:    r.difficulty   ?? 'easy',
        course_type_id: r.course_type_id ?? '',
        meal_type_ids: (mealTags ?? []).map((t) => t.meal_type_id),
        nutrition: {
          calories:  r.nutrition_info?.calories  != null ? String(r.nutrition_info.calories)  : '',
          protein_g: r.nutrition_info?.protein_g != null ? String(r.nutrition_info.protein_g) : '',
          fat_g:     r.nutrition_info?.fat_g     != null ? String(r.nutrition_info.fat_g)     : '',
          carbs_g:   r.nutrition_info?.carbs_g   != null ? String(r.nutrition_info.carbs_g)   : '',
          fiber_g:   r.nutrition_info?.fiber_g   != null ? String(r.nutrition_info.fiber_g)   : '',
        },
        is_published: r.is_published ?? false,
        is_featured:  r.is_featured  ?? false,
        ingredients: (ings ?? []).map((i) => {
          // Parse notes jsonb
          const rawNotes = i.notes as { de?: string; en?: string } | string | null;
          let notesObj: { de: string; en: string } | null = null;
          if (rawNotes && typeof rawNotes === 'object' && !Array.isArray(rawNotes)) {
            notesObj = { de: (rawNotes as { de?: string }).de ?? '', en: (rawNotes as { en?: string }).en ?? '' };
          }
          return {
            _key:            newKey(),
            ingredient_id:   i.ingredient_id ?? null,
            ingredient_name: {
              de: (i.ingredient_name as { de?: string; en?: string } | null)?.de ?? '',
              en: (i.ingredient_name as { de?: string; en?: string } | null)?.en ?? '',
            },
            amount:     i.amount != null ? String(i.amount) : '',
            unit_id:    i.unit_id ?? null,
            unit:       (typeof i.unit === 'string' ? i.unit : '') ?? '',
            note_id:    i.note_id ?? null,
            note_display: notesObj ? [notesObj.de, notesObj.en].filter(Boolean).join(' / ') : '',
            notes:      notesObj,
            is_optional: i.is_optional ?? false,
            section_header: i.section_header ?? null,
          };
        }),
        goals: (goals ?? []).map((g) => g.goal),
      });
      // Load gallery
      const raw = r.image_gallery as { url: string; order: number }[] | null;
      const galleryEntries = (raw ?? []).map((p, i) => ({
        _key: `_g${i}`,
        url: p.url,
        order: p.order ?? i,
      }));
      setGalleryItems(galleryEntries);
      originalGalleryUrlsRef.current = new Set(galleryEntries.map(g => g.url).filter((u): u is string => !!u));
      setLoading(false);
    });
  }, [recipeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Form helpers ─────────────────────────────────────────────────────────────

  const setLangField = (field: 'title' | 'description' | 'instructions', l: Lang, v: string) => {
    if (validationErrors.length > 0) setValidationErrors([]);
    setForm((f) => ({ ...f, [field]: { ...f[field], [l]: v } }));
  };

  const setNutrition = (key: keyof NutritionForm, v: string) =>
    setForm((f) => ({ ...f, nutrition: { ...f.nutrition, [key]: v } }));

  // Gram-based unit conversion map (unit code → grams per 1 unit)
  const GRAM_UNITS: Record<string, number> = { g: 1, kg: 1000, mg: 0.001 };

  const autoCalcNutrition = (): NutritionForm | null => {
    const servings = Number(form.servings);
    if (!servings || servings <= 0) return null;

    let kcal = 0, protein = 0, fat = 0, carbs = 0, fiber = 0;
    let anyIngredientWithData = false;

    for (const row of form.ingredients) {
      if (row.section_header !== null) continue;
      if (!row.ingredient_id) continue;
      const ing = ingredientOptions.find((o) => o.id === row.ingredient_id);
      if (!ing) continue;
      if (ing.kcal_per_100g == null && ing.protein_per_100g == null) continue;

      const unitOpt = unitOptions.find((u) => u.id === row.unit_id);
      const unitCode = unitOpt?.code ?? '';
      const gramsPerUnit = GRAM_UNITS[unitCode];
      if (!gramsPerUnit) continue; // non-gram unit — skip

      const qty = Number(row.amount) || 0;
      const totalGrams = qty * gramsPerUnit;
      const factor = totalGrams / 100;

      kcal    += (ing.kcal_per_100g    ?? 0) * factor;
      protein += (ing.protein_per_100g ?? 0) * factor;
      fat     += (ing.fat_per_100g     ?? 0) * factor;
      carbs   += (ing.carbs_per_100g   ?? 0) * factor;
      fiber   += (ing.fiber_per_100g   ?? 0) * factor;
      anyIngredientWithData = true;
    }

    if (!anyIngredientWithData) return null;

    const round1 = (v: number) => Math.round(v / servings * 10) / 10;
    return {
      calories:  String(Math.round(kcal / servings)),
      protein_g: String(round1(protein)),
      fat_g:     String(round1(fat)),
      carbs_g:   String(round1(carbs)),
      fiber_g:   String(round1(fiber)),
    };
  };

  const autoCalc = nutritionAutoMode ? autoCalcNutrition() : null;

  // ── Ingredients ──────────────────────────────────────────────────────────────

  const addIngredient = () =>
    setForm((f) => ({ ...f, ingredients: [...f.ingredients, { _key: newKey(), ...EMPTY_INGREDIENT }] }));

  const addSection = () =>
    setForm((f) => ({
      ...f,
      ingredients: [...f.ingredients, { _key: newKey(), ...EMPTY_INGREDIENT, section_header: '' }],
    }));

  const removeIngredient = (key: string) =>
    setForm((f) => ({ ...f, ingredients: f.ingredients.filter((i) => i._key !== key) }));

  const updateIngredient = (key: string, patch: Partial<Omit<IngredientRow, '_key'>>) =>
    setForm((f) => ({ ...f, ingredients: f.ingredients.map((i) => i._key === key ? { ...i, ...patch } : i) }));

  const selectIngredient = (key: string, ing: IngredientOption) =>
    updateIngredient(key, {
      ingredient_id: ing.id,
      ingredient_name: { de: ing.name?.de ?? '', en: ing.name?.en ?? '' },
      unit_id: ing.default_unit_id ?? null,
    });

  const selectNote = (key: string, note: PrepNoteOption) =>
    updateIngredient(key, {
      note_id: note.id,
      note_display: [note.name?.de, note.name?.en].filter(Boolean).join(' / '),
      notes: { de: note.name?.de ?? '', en: note.name?.en ?? '' },
    });

  const clearNote = (key: string) =>
    updateIngredient(key, { note_id: null, note_display: '', notes: null });

  const moveIngredient = (key: string, dir: -1 | 1) =>
    setForm((f) => {
      const arr = [...f.ingredients];
      const idx = arr.findIndex((i) => i._key === key);
      const next = idx + dir;
      if (next < 0 || next >= arr.length) return f;
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return { ...f, ingredients: arr };
    });

  const getIngredientDisplay = (row: IngredientRow): string => {
    const { de, en } = row.ingredient_name;
    if (de && en) return `${de} / ${en}`;
    return de || en || '';
  };

  // ── Goal tags ────────────────────────────────────────────────────────────────

  const toggleGoal = (goal: string) => {
    setForm((f) => {
      if (f.goals.includes(goal)) {
        setGoalLimitWarning(false);
        return { ...f, goals: f.goals.filter((g) => g !== goal) };
      }
      if (f.goals.length >= 5) {
        setGoalLimitWarning(true);
        return f;
      }
      setGoalLimitWarning(false);
      return { ...f, goals: [...f.goals, goal] };
    });
  };

  // ── Storage helpers ───────────────────────────────────────────────────────────

  const deleteStorageUrl = async (url: string | null) => {
    if (!url) return;
    const res = await fetch('/api/delete-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, bucket: 'recipe-images' }),
    });
    if (!res.ok) console.error('Delete failed:', await res.text());
  };

  // ── Image ────────────────────────────────────────────────────────────────────

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Client-side compression
    const { blob, sizeKb } = await compressImage(file);
    const compressed = new File([blob], file.name, { type: blob.type });
    setImageFile(compressed);
    setImageCompressedKb(sizeKb);
    const previewUrl = URL.createObjectURL(compressed);
    setImagePreview(previewUrl);
    setCropDetail(null);
    setCropGrid(null);
    setCropModalOpen(true);
    // Reset file input
    e.target.value = '';
  };

  const handleRemoveCoverImage = () => {
    pendingDeleteRef.current = currentImageUrl;
    setCurrentImageUrl(null);
    setImageFile(null);
    setImagePreview(null);
    setImageRemoved(true);
    setImageCompressedKb(null);
    setCropDetail(null);
    setCropGrid(null);
  };

  const uploadImage = async (_id: string): Promise<string | null> => {
    if (!imageFile) return currentImageUrl;
    // Track old URL for deletion after save succeeds
    if (currentImageUrl) pendingDeleteRef.current = currentImageUrl;
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(imageFile);
    });
    const res = await fetch('/api/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64, filename: imageFile.name, bucket: 'recipe-images', contentType: imageFile.type }),
    });
    const json = await res.json();
    if (!res.ok || !json.url) { console.error('[uploadImage]', json.error); return currentImageUrl; }
    return json.url as string;
  };

  // ── Save ─────────────────────────────────────────────────────────────────────

  const validate = (): string[] => {
    const errs: string[] = [];
    if (!form.title.de.trim())          errs.push('Title (DE) is required.');
    if (!form.title.en.trim())          errs.push('Title (EN) is required.');
    if (!form.description.de.trim())    errs.push('Description (DE) is required.');
    if (!form.description.en.trim())    errs.push('Description (EN) is required.');
    if (!form.instructions.de.trim())   errs.push('Instructions (DE) are required.');
    if (!form.instructions.en.trim())   errs.push('Instructions (EN) are required.');
    if (!form.prep_time_min.trim())     errs.push('Prep time is required.');
    if (!form.cook_time_min.trim())     errs.push('Cook time is required.');
    if (!form.servings.trim())          errs.push('Servings is required.');
    if (!form.difficulty)               errs.push('Difficulty is required.');
    const hasIngredient = form.ingredients.some(
      (i) => i.section_header === null && (i.ingredient_id || i.ingredient_name.de.trim() || i.ingredient_name.en.trim())
    );
    if (!hasIngredient) errs.push('At least 1 ingredient is required.');
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (errs.length > 0) {
      setValidationErrors(errs);
      return;
    }
    setValidationErrors([]);
    setSaving(true);
    setError(null);

    try {
      const payload = {
        title:        { de: form.title.de,        en: form.title.en },
        slug: form.slug.trim() || slugify(form.title.de || form.title.en),
        description:  { de: form.description.de,  en: form.description.en },
        instructions: { de: form.instructions.de, en: form.instructions.en },
        prep_time_min: form.prep_time_min ? Number(form.prep_time_min) : null,
        cook_time_min: form.cook_time_min ? Number(form.cook_time_min) : null,
        servings:      form.servings      ? Number(form.servings)      : null,
        difficulty:    form.difficulty || null,
        course_type_id: form.course_type_id || null,
        nutrition_info: (() => {
          const n = autoCalc ?? form.nutrition;
          return {
            calories:  n.calories  ? Number(n.calories)  : null,
            protein_g: n.protein_g ? Number(n.protein_g) : null,
            fat_g:     n.fat_g     ? Number(n.fat_g)     : null,
            carbs_g:   n.carbs_g   ? Number(n.carbs_g)   : null,
            fiber_g:   n.fiber_g   ? Number(n.fiber_g)   : null,
          };
        })(),
        is_published: form.is_published,
        is_featured:  form.is_featured,
        cover_crop_detail: cropDetail ?? null,
        cover_crop_grid:   cropGrid ?? null,
      };

      // 1. Upsert recipe row
      let id = recipeId;
      if (id) {
        const { error } = await supabase.from('recipes').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('recipes').insert(payload).select('id').single();
        if (error) throw error;
        id = data.id;
      }

      // 2. Upload image
      const imageUrl = await uploadImage(id!);
      if (imageUrl !== currentImageUrl || imageRemoved) {
        await supabase.from('recipes').update({ image_url: imageUrl }).eq('id', id!);
      }

      // 3. Replace ingredients
      await supabase.from('recipe_ingredients').delete().eq('recipe_id', id!);
      if (form.ingredients.length > 0) {
        const rows = form.ingredients
          .map((ing, idx) => {
            // Section header row
            if (ing.section_header !== null) {
              return {
                recipe_id:       id!,
                ingredient_id:   null,
                ingredient_name: { de: '', en: '' },
                amount:          null,
                unit_id:         null,
                unit:            null,
                notes:           null,
                note_id:         null,
                sort_order:      idx,
                is_optional:     false,
                section_header:  ing.section_header,
              };
            }
            // Normal ingredient row
            const hasName = ing.ingredient_name.de.trim() || ing.ingredient_name.en.trim();
            if (!hasName && !ing.ingredient_id) return null;
            const unitOpt = unitOptions.find((u) => u.id === ing.unit_id);
            const unitStr = unitOpt
              ? (unitOpt.abbreviation?.de ?? unitOpt.abbreviation?.en ?? unitOpt.code)
              : ing.unit.trim() || null;
            return {
              recipe_id:        id!,
              ingredient_id:    ing.ingredient_id ?? null,
              ingredient_name:  { de: ing.ingredient_name.de, en: ing.ingredient_name.en },
              amount:           ing.amount ? Number(ing.amount) : null,
              unit_id:          ing.unit_id ?? null,
              unit:             unitStr,
              notes:            ing.notes ?? null,
              note_id:          ing.note_id ?? null,
              sort_order:       idx,
              is_optional:      ing.is_optional,
              section_header:   null,
            };
          })
          .filter(Boolean);
        if (rows.length > 0) {
          const { error } = await supabase.from('recipe_ingredients').insert(rows);
          if (error) throw error;
        }
      }

      // 4. Replace goal tags
      await supabase.from('recipe_goal_tags').delete().eq('recipe_id', id!);
      if (form.goals.length > 0) {
        const rows = form.goals.map((goal) => ({ recipe_id: id!, goal }));
        const { error } = await supabase.from('recipe_goal_tags').insert(rows);
        if (error) throw error;
      }

      // 5. Replace meal type tags
      await supabase.from('recipe_meal_type_tags').delete().eq('recipe_id', id!);
      if (form.meal_type_ids.length > 0) {
        const rows = form.meal_type_ids.map((meal_type_id) => ({ recipe_id: id!, meal_type_id }));
        const { error } = await supabase.from('recipe_meal_type_tags').insert(rows);
        if (error) throw error;
      }

      // 6. Upload pending gallery photos and save image_gallery
      const galleryPayload: { url: string; order: number }[] = [];
      for (const item of galleryItems) {
        if (item._file) {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(item._file!);
          });
          const res = await fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64, filename: item._file.name, bucket: 'recipe-images', contentType: item._file.type }),
          });
          const json = await res.json();
          if (!res.ok || !json.url) throw new Error(`Gallery upload failed: ${json.error ?? 'unknown error'}`);
          galleryPayload.push({ url: json.url as string, order: item.order });
        } else if (item.url) {
          galleryPayload.push({ url: item.url, order: item.order });
        }
      }
      const { error: galErr } = await supabase.from('recipes').update({ image_gallery: galleryPayload }).eq('id', id!);
      if (galErr) throw galErr;

      // DB is committed — now safe to delete removed storage files
      await deleteStorageUrl(pendingDeleteRef.current);
      pendingDeleteRef.current = null;
      const savedGalleryUrls = new Set(galleryPayload.map(g => g.url));
      for (const url of originalGalleryUrlsRef.current) {
        if (!savedGalleryUrls.has(url)) await deleteStorageUrl(url);
      }
      originalGalleryUrlsRef.current = new Set(galleryPayload.map(g => g.url));

      onSaved();
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setError(typeof e === 'object' && e && 'message' in e ? (e as any).message : String(e));
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!recipeId) return;
    const title = form.title.de || form.title.en || 'this recipe';
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeleting(true);
    // Delete all storage files: pending removes + current cover + all gallery URLs
    const storageUrlsToDelete = new Set<string>();
    if (pendingDeleteRef.current) storageUrlsToDelete.add(pendingDeleteRef.current);
    if (currentImageUrl) storageUrlsToDelete.add(currentImageUrl);
    for (const url of originalGalleryUrlsRef.current) storageUrlsToDelete.add(url);
    for (const item of galleryItems) { if (item.url) storageUrlsToDelete.add(item.url); }
    for (const url of storageUrlsToDelete) await deleteStorageUrl(url);
    const { error: err } = await supabase.from('recipes').delete().eq('id', recipeId);
    setDeleting(false);
    if (err) { setError(err.message); return; }
    (onDeleted ?? onSaved)();
  };

  // ── Quick-add callbacks ───────────────────────────────────────────────────────

  const handleQuickAddSaved = (newIng: IngredientOption) => {
    setIngredientOptions((prev) => [...prev, newIng]);
    if (quickAddTargetKey) selectIngredient(quickAddTargetKey, newIng);
    setQuickAddOpen(false);
    setQuickAddTargetKey(null);
  };

  const handleQuickAddNoteSaved = (newNote: PrepNoteOption) => {
    setPrepNoteOptions((prev) => [...prev, newNote]);
    if (quickAddNoteTargetKey) selectNote(quickAddNoteTargetKey, newNote);
    setQuickAddNoteOpen(false);
    setQuickAddNoteTargetKey(null);
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-3xl flex-col bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#0e393d]/10 px-6 py-4 shrink-0">
          <h2 className="font-serif text-lg text-[#0e393d]">
            {recipeId ? 'Edit Recipe' : 'New Recipe'}
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-[#0e393d]/15 overflow-hidden text-xs">
              {(['en', 'de'] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-3 py-1.5 font-medium transition ${lang === l ? 'bg-[#0e393d] text-white' : 'text-[#1c2a2b]/60 hover:bg-[#0e393d]/5'}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="text-[#1c2a2b]/40 hover:text-[#1c2a2b] transition">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-[#1c2a2b]/40">Loading…</div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-5">

            {/* ── Content ───────────────────────────────────────────────── */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => toggleSection('content')}
                className="flex w-full items-center justify-between group"
              >
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#ceab84]">Content — {lang.toUpperCase()}</span>
                <svg
                  width="14" height="14" viewBox="0 0 14 14" fill="none"
                  className={`text-[#0e393d]/30 group-hover:text-[#0e393d]/60 transition-transform ${openSections.content ? 'rotate-180' : ''}`}
                >
                  <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {openSections.content && (
                <div className="space-y-4">
                  <Field label={`Title (${lang.toUpperCase()}) *`}>
                    <input
                      className={inputCls}
                      value={form.title[lang]}
                      onChange={(e) => setLangField('title', lang, e.target.value)}
                      placeholder={lang === 'de' ? 'z.B. Grüner Smoothie mit Spinat' : 'e.g. Green Smoothie with Spinach'}
                    />
                  </Field>

                  <Field label={`Description (${lang.toUpperCase()})`}>
                    <textarea
                      className={inputCls + ' resize-none'}
                      rows={2}
                      value={form.description[lang]}
                      onChange={(e) => setLangField('description', lang, e.target.value)}
                      placeholder={lang === 'de' ? 'Kurze Beschreibung…' : 'Short description…'}
                    />
                  </Field>

                  <Field label={`Instructions (${lang.toUpperCase()})`} hint="Markdown supported">
                    <MarkdownToolbar
                      taRef={instructionRef}
                      value={form.instructions[lang]}
                      onChange={(v) => setLangField('instructions', lang, v)}
                    />
                    <textarea
                      ref={instructionRef}
                      className={inputCls + ' resize-y'}
                      rows={6}
                      value={form.instructions[lang]}
                      onChange={(e) => setLangField('instructions', lang, e.target.value)}
                      placeholder={lang === 'de' ? '1. Spinat waschen…\n2. Alle Zutaten…' : '1. Wash spinach…\n2. Blend all…'}
                    />
                  </Field>
                </div>
              )}
            </div>

            {/* ── Basics ──────────────────────────────────────────────────── */}
            <SectionBlock title="Basics" open={openSections.basics} onToggle={() => toggleSection('basics')}>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Prep (min)">
                    <input type="number" min={0} className={inputCls} value={form.prep_time_min}
                      onChange={(e) => setForm((f) => ({ ...f, prep_time_min: e.target.value }))} placeholder="10" />
                  </Field>
                  <Field label="Cook (min)">
                    <input type="number" min={0} className={inputCls} value={form.cook_time_min}
                      onChange={(e) => setForm((f) => ({ ...f, cook_time_min: e.target.value }))} placeholder="20" />
                  </Field>
                  <Field label="Servings">
                    <input type="number" min={1} className={inputCls} value={form.servings}
                      onChange={(e) => setForm((f) => ({ ...f, servings: e.target.value }))} placeholder="2" />
                  </Field>
                </div>

                {/* Difficulty pills */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-[#0e393d]/60 w-[70px] shrink-0">Difficulty</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(['easy', 'medium', 'hard'] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, difficulty: d }))}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition capitalize ${
                          form.difficulty === d
                            ? 'bg-[#0e393d] text-white'
                            : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30'
                        }`}
                      >
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Course Type pills */}
                <div className="flex items-start gap-3">
                  <span className="text-xs font-medium text-[#0e393d]/60 w-[70px] shrink-0 pt-1">Course</span>
                  <div className="flex flex-wrap gap-1.5">
                    {courseTypeOptions.map((ct) => (
                      <button
                        key={ct.id}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, course_type_id: f.course_type_id === ct.id ? '' : ct.id }))}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                          form.course_type_id === ct.id
                            ? 'bg-[#0e393d] text-white'
                            : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30'
                        }`}
                      >
                        {ct.name?.en || ct.name?.de || ct.slug}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Meal Type pills */}
                <div className="flex items-start gap-3">
                  <span className="text-xs font-medium text-[#0e393d]/60 w-[70px] shrink-0 pt-1">Meal</span>
                  <div className="flex flex-wrap gap-1.5">
                    {mealTypeOptions.map((mt) => {
                      const active = form.meal_type_ids.includes(mt.id);
                      return (
                        <button
                          key={mt.id}
                          type="button"
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              meal_type_ids: active
                                ? f.meal_type_ids.filter((id) => id !== mt.id)
                                : [...f.meal_type_ids, mt.id],
                            }))
                          }
                          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                            active
                              ? 'bg-[#0e393d] text-white'
                              : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30'
                          }`}
                        >
                          {mt.name?.en || mt.name?.de || mt.slug}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </SectionBlock>

            {/* ── Nutrition ───────────────────────────────────────────────── */}
            <SectionBlock
              title="Nutrition"
              open={openSections.nutrition}
              onToggle={() => toggleSection('nutrition')}
              badge={
                <span className="flex items-center gap-1">
                  <SectionBadge>per serving</SectionBadge>
                  {autoCalc && <SectionBadge>auto</SectionBadge>}
                </span>
              }
            >
              <div className="space-y-3">
                {autoCalc && (
                  <div className="flex items-center justify-between rounded-lg bg-violet-50 border border-violet-200/60 px-3 py-2">
                    <p className="text-[11px] text-violet-700">
                      Auto-calculated from ingredient database (÷ {form.servings || '?'} servings)
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setNutritionAutoMode(false);
                        setForm((f) => ({ ...f, nutrition: autoCalc }));
                      }}
                      className="text-[11px] font-medium text-violet-600 hover:text-violet-800 transition whitespace-nowrap ml-2"
                    >
                      Edit manually
                    </button>
                  </div>
                )}
                {!nutritionAutoMode && (
                  <button
                    type="button"
                    onClick={() => setNutritionAutoMode(true)}
                    className="text-[11px] font-medium text-violet-600 hover:text-violet-800 transition"
                  >
                    ↩ Switch back to auto-calculate
                  </button>
                )}
                <div className="grid grid-cols-5 gap-3">
                  {([
                    ['calories',  'Calories', 'kcal'],
                    ['protein_g', 'Protein',  'g'],
                    ['fat_g',     'Fat',      'g'],
                    ['carbs_g',   'Carbs',    'g'],
                    ['fiber_g',   'Fiber',    'g'],
                  ] as [keyof NutritionForm, string, string][]).map(([key, label, unit]) => {
                    const displayVal = autoCalc ? autoCalc[key] : form.nutrition[key];
                    return (
                      <div key={key}>
                        <label className="block text-xs font-medium text-[#0e393d]/70 mb-1">{label}</label>
                        <div className="relative">
                          <input
                            type="number" min={0} step={0.1}
                            readOnly={!!autoCalc}
                            className={`w-full rounded-lg border border-[#0e393d]/15 pl-2 pr-7 py-2 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition ${autoCalc ? 'bg-violet-50/60 cursor-default' : 'bg-white'}`}
                            value={displayVal}
                            onChange={(e) => { if (!autoCalc) setNutrition(key, e.target.value); }}
                            placeholder="0"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#1c2a2b]/40 pointer-events-none">{unit}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </SectionBlock>

            {/* ── Ingredients ─────────────────────────────────────────────── */}
            <div className="border-t border-[#0e393d]/8 pt-5">
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() => toggleSection('ingredients')}
                  className="flex items-center gap-2 group"
                >
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-[#ceab84]">Ingredients</span>
                  {form.ingredients.filter((i) => i.section_header === null).length > 0 && (
                    <SectionBadge>{form.ingredients.filter((i) => i.section_header === null).length}</SectionBadge>
                  )}
                  <svg
                    width="14" height="14" viewBox="0 0 14 14" fill="none"
                    className={`text-[#0e393d]/30 group-hover:text-[#0e393d]/60 transition-transform ${openSections.ingredients ? 'rotate-180' : ''}`}
                  >
                    <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={addSection}
                    className="text-xs font-medium text-[#ceab84] hover:text-[#8a6a3e] transition"
                  >
                    + Section
                  </button>
                  <button
                    type="button"
                    onClick={addIngredient}
                    className="text-xs font-medium text-[#0e393d] hover:text-[#0e393d]/70 transition"
                  >
                    + Add
                  </button>
                </div>
              </div>
            {openSections.ingredients && (<div className="space-y-3">

              {/* Column headers */}
              {form.ingredients.some((i) => i.section_header === null) && (
                <div className="flex items-center gap-2 px-3 text-[10px] font-medium uppercase tracking-wider text-[#1c2a2b]/30">
                  <span className="w-14 shrink-0" />
                  <span className="flex-1">Ingredient</span>
                  <span className="w-36 shrink-0">Notes</span>
                  <span className="w-20 shrink-0">Qty</span>
                  <span className="w-28 shrink-0">Unit</span>
                  <span className="w-16 shrink-0">Opt.</span>
                  <span className="w-7 shrink-0" />
                </div>
              )}

              {form.ingredients.length === 0 && (
                <p className="text-xs text-[#1c2a2b]/30 italic">No ingredients yet.</p>
              )}

              <div className="space-y-1.5">
                {form.ingredients.map((ing, idx) => {

                  // ── Section header row ────────────────────────────────────
                  if (ing.section_header !== null) {
                    return (
                      <div key={ing._key} className="flex items-center gap-2 rounded-lg border border-[#ceab84]/40 bg-[#ceab84]/6 px-3 py-2">
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <IconBtn onClick={() => moveIngredient(ing._key, -1)} title="Move up">
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 7l3-4 3 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </IconBtn>
                          <IconBtn onClick={() => moveIngredient(ing._key, 1)} title="Move down">
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3l3 4 3-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </IconBtn>
                        </div>
                        <span className="text-[10px] font-bold text-[#ceab84]/70 shrink-0 w-5 text-center">§</span>
                        <input
                          type="text"
                          value={ing.section_header}
                          onChange={(e) => updateIngredient(ing._key, { section_header: e.target.value })}
                          placeholder="Section title…"
                          className="flex-1 text-sm font-semibold text-[#0e393d] bg-transparent border-none focus:outline-none placeholder:font-normal placeholder:text-[#ceab84]/40 placeholder:text-xs"
                        />
                        <IconBtn onClick={() => removeIngredient(ing._key)} title="Remove">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
                        </IconBtn>
                      </div>
                    );
                  }

                  // ── Normal ingredient row ─────────────────────────────────
                  return (
                    <div key={ing._key} className="flex items-center gap-2 rounded-lg border border-[#0e393d]/10 bg-[#fafaf8] px-3 py-2">
                      {/* Reorder */}
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <IconBtn onClick={() => moveIngredient(ing._key, -1)} title="Move up">
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 7l3-4 3 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </IconBtn>
                        <IconBtn onClick={() => moveIngredient(ing._key, 1)} title="Move down">
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3l3 4 3-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </IconBtn>
                      </div>
                      {/* Index */}
                      <span className="w-5 text-center text-[11px] text-[#1c2a2b]/30 shrink-0">{idx + 1}</span>
                      {/* Ingredient combobox */}
                      <IngredientCombobox
                        value={ing.ingredient_id}
                        displayValue={getIngredientDisplay(ing)}
                        ingredientOptions={ingredientOptions}
                        onSelect={(opt) => selectIngredient(ing._key, opt)}
                        onOpenQuickAdd={() => { setQuickAddTargetKey(ing._key); setQuickAddOpen(true); }}
                      />
                      {/* Notes combobox */}
                      <PrepNotesCombobox
                        value={ing.note_id}
                        displayValue={ing.note_display}
                        noteOptions={prepNoteOptions}
                        onSelect={(note) => selectNote(ing._key, note)}
                        onClear={() => clearNote(ing._key)}
                        onOpenQuickAdd={() => { setQuickAddNoteTargetKey(ing._key); setQuickAddNoteOpen(true); }}
                      />
                      {/* Amount */}
                      <input
                        type="number" min={0} step={0.1}
                        placeholder="Qty"
                        value={ing.amount}
                        onChange={(e) => updateIngredient(ing._key, { amount: e.target.value })}
                        className="w-20 shrink-0 rounded-md border border-[#0e393d]/12 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#0e393d]/20"
                      />
                      {/* Unit picker */}
                      <select
                        value={ing.unit_id ?? ''}
                        onChange={(e) => updateIngredient(ing._key, { unit_id: e.target.value || null })}
                        className="w-28 shrink-0 rounded-md border border-[#0e393d]/12 bg-white px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#0e393d]/20 cursor-pointer"
                      >
                        <option value="">Unit</option>
                        {unitOptions.map((u) => (
                          <option key={u.id} value={u.id}>{u.abbreviation?.de ?? u.code}</option>
                        ))}
                      </select>
                      {/* Optional toggle */}
                      <button
                        type="button"
                        title="Mark as optional ingredient"
                        onClick={() => updateIngredient(ing._key, { is_optional: !ing.is_optional })}
                        className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded border transition ${
                          ing.is_optional
                            ? 'border-[#ceab84]/50 text-[#8a6a3e] bg-[#ceab84]/10'
                            : 'border-[#0e393d]/10 text-[#1c2a2b]/30 hover:border-[#0e393d]/20'
                        }`}
                      >
                        Optional
                      </button>
                      {/* Remove */}
                      <IconBtn onClick={() => removeIngredient(ing._key)} title="Remove">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
                      </IconBtn>
                    </div>
                  );
                })}
              </div>
            </div>)}
            </div>

            {/* ── Goal tags ────────────────────────────────────────────────── */}
            <SectionBlock
              title="Health Goals"
              open={openSections.goals}
              onToggle={() => toggleSection('goals')}
              badge={form.goals.length > 0 ? <SectionBadge>{form.goals.length} / 5</SectionBadge> : undefined}
            >
              <div className="space-y-3">
                {goalLimitWarning && (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-inset ring-amber-600/20">
                    Maximum 5 health goals allowed.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {GOAL_TAGS.map(({ key, label }) => {
                    const active = form.goals.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleGoal(key)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                          active
                            ? 'bg-[#0e393d] text-white'
                            : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </SectionBlock>

            {/* ── Image ───────────────────────────────────────────────────── */}
            {/* ── Cover Image ──────────────────────────────────────────────── */}
            <SectionBlock
              title="Cover Image"
              open={openSections.cover}
              onToggle={() => toggleSection('cover')}
              badge={(imagePreview || currentImageUrl) ? <SectionBadge>uploaded</SectionBadge> : undefined}
            >
              <div className="space-y-3">
                {(imagePreview || currentImageUrl) && (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview ?? currentImageUrl!}
                      alt="Preview"
                      className="w-full h-44 object-cover rounded-xl border border-[#0e393d]/10"
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                      {imagePreview && (
                        <button
                          type="button"
                          onClick={() => setCropModalOpen(true)}
                          className="flex items-center gap-1 rounded-md bg-black/50 px-2 py-1 text-[11px] font-medium text-white hover:bg-[#0e393d]/80 transition"
                        >
                          ✂ Crop
                        </button>
                      )}
                      <button
                        type="button"
                        title="Remove photo"
                        onClick={handleRemoveCoverImage}
                        className="flex items-center gap-1 rounded-md bg-black/50 px-2 py-1 text-[11px] font-medium text-white hover:bg-red-600/80 transition"
                      >
                        <svg width="8" height="8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 10 10"><path d="M2 2l6 6M8 2l-6 6" strokeLinecap="round"/></svg>
                        Remove
                      </button>
                    </div>
                  </div>
                )}
                {imageCompressedKb && (
                  <p className="text-[11px] text-[#1c2a2b]/40">Auto-compressed · {imageCompressedKb} KB</p>
                )}
                {(cropDetail || cropGrid) && (
                  <p className="text-[11px] text-emerald-600">✓ Crops set: {[cropDetail && '16:9', cropGrid && '4:3'].filter(Boolean).join(', ')}</p>
                )}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full rounded-lg border border-dashed border-[#0e393d]/20 py-4 text-sm text-[#0e393d]/50 hover:border-[#0e393d]/40 hover:text-[#0e393d]/70 hover:bg-[#0e393d]/3 transition"
                >
                  {imagePreview || currentImageUrl ? 'Replace image' : 'Upload image'}
                  <span className="block text-xs mt-0.5 text-[#1c2a2b]/30">PNG, JPG, WebP · auto-compressed</span>
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </div>
            </SectionBlock>

            {/* ── Gallery Photos ───────────────────────────────────────────── */}
            <SectionBlock
              title="Gallery Photos"
              open={openSections.gallery}
              onToggle={() => toggleSection('gallery')}
              badge={<SectionBadge>{galleryItems.length} / 10</SectionBadge>}
            >
              <div className="space-y-3">
                <p className="text-[11px] text-[#1c2a2b]/40">
                  Use <code className="bg-[#0e393d]/6 px-1 rounded text-[10px]">![photo:N]</code> in instructions to embed photo N inline.
                </p>
                <GalleryUpload items={galleryItems} onChange={setGalleryItems} />
              </div>
            </SectionBlock>

            {/* ── Settings ─────────────────────────────────────────────────── */}
            <SectionBlock title="Settings" open={openSections.settings} onToggle={() => toggleSection('settings')}>
              <div className="space-y-3">
                <Toggle
                  checked={form.is_published}
                  onChange={(v) => setForm((f) => ({ ...f, is_published: v }))}
                  label="Published"
                  hint="Visible to users in the recipe database"
                />
                <Toggle
                  checked={form.is_featured}
                  onChange={(v) => setForm((f) => ({ ...f, is_featured: v }))}
                  label="Featured"
                  hint="Highlighted on the homepage and recipe list"
                />
              </div>
            </SectionBlock>

          </div>
        )}

        {/* Footer */}
        <div className="border-t border-[#0e393d]/10 px-6 py-4 shrink-0">
          {validationErrors.length > 0 && (
            <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 ring-1 ring-inset ring-amber-600/20">
              <p className="text-xs font-medium text-amber-800 mb-1">Please fix the following before saving:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {validationErrors.map((e, i) => (
                  <li key={i} className="text-xs text-amber-700">{e}</li>
                ))}
              </ul>
            </div>
          )}
          {error && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
          )}
          <div className="flex gap-3">
            {recipeId && (
              <button
                onClick={handleDelete}
                disabled={deleting || saving}
                className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
              >
                {deleting ? '…' : 'Delete'}
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-[#0e393d]/15 py-2.5 text-sm font-medium text-[#1c2a2b] hover:bg-[#fafaf8] transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="flex-1 rounded-lg bg-[#0e393d] py-2.5 text-sm font-medium text-white hover:bg-[#0e393d]/90 disabled:opacity-50 transition"
            >
              {saving ? 'Saving…' : recipeId ? 'Save Changes' : 'Create Recipe'}
            </button>
          </div>
        </div>

      </div>

      {/* Quick-Add Ingredient Modal */}
      {quickAddOpen && (
        <QuickAddIngredientModal
          units={unitOptions}
          categories={categoryOptions}
          onSaved={handleQuickAddSaved}
          onClose={() => { setQuickAddOpen(false); setQuickAddTargetKey(null); }}
        />
      )}

      {/* Quick-Add Note Modal */}
      {quickAddNoteOpen && (
        <QuickAddNoteModal
          onSaved={handleQuickAddNoteSaved}
          onClose={() => { setQuickAddNoteOpen(false); setQuickAddNoteTargetKey(null); }}
        />
      )}

      {/* Cover Crop Modal */}
      {cropModalOpen && imagePreview && (
        <CoverCropModal
          imageUrl={imagePreview}
          initialDetail={cropDetail}
          initialGrid={cropGrid}
          onConfirm={(detail, grid) => {
            setCropDetail(detail);
            setCropGrid(grid);
            setCropModalOpen(false);
          }}
          onClose={() => setCropModalOpen(false)}
        />
      )}
    </>
  );
}
