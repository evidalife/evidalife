'use client';

import { useState, useMemo } from 'react';
import type { Ingredient, MeasurementUnit } from './IngredientsManager';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReviewChanges = {
  name_de?: string;
  name_fr?: string;
  name_es?: string;
  name_it?: string;
  kcal_per_100g?: number;
  protein_per_100g?: number;
  fat_per_100g?: number;
  carbs_per_100g?: number;
  fiber_per_100g?: number;
  grams_per_unit?: number;
};

export type ReviewSuggestion = {
  id: string;
  changes: ReviewChanges;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const LANG_KEYS = ['name_fr', 'name_es', 'name_it', 'name_de'] as const;
const LANG_LABELS: Record<string, string> = { name_fr: 'FR', name_es: 'ES', name_it: 'IT', name_de: 'DE' };
const NUTRITION_KEYS: (keyof ReviewChanges)[] = [
  'kcal_per_100g', 'protein_per_100g', 'fat_per_100g', 'carbs_per_100g', 'fiber_per_100g',
];
const NUTRITION_LABELS: Record<string, string> = {
  kcal_per_100g: 'kcal', protein_per_100g: 'protein', fat_per_100g: 'fat',
  carbs_per_100g: 'carbs', fiber_per_100g: 'fiber',
};
const NUTRITION_UNITS_MAP: Record<string, string> = {
  kcal_per_100g: 'kcal', protein_per_100g: 'g', fat_per_100g: 'g',
  carbs_per_100g: 'g', fiber_per_100g: 'g',
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  suggestions: ReviewSuggestion[];
  totalScanned: number;
  ingredients: Ingredient[];
  units: MeasurementUnit[];
  onApply: (
    accepted: ReviewSuggestion[],
    onProgress: (done: number, total: number) => void
  ) => Promise<void>;
  onClose: () => void;
}

export default function ReviewModal({
  suggestions, totalScanned, ingredients, units, onApply, onClose,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(suggestions.map((s) => s.id))
  );
  const [edits, setEdits] = useState<Record<string, Record<string, string>>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState({ done: 0, total: 0 });

  const completedCount = totalScanned - suggestions.length;

  const summaryCounts = useMemo(() => {
    const counts = { translations: 0, nutrition: 0, grams: 0 };
    for (const s of suggestions) {
      if (LANG_KEYS.some((k) => k in s.changes)) counts.translations++;
      if (NUTRITION_KEYS.some((k) => k in s.changes)) counts.nutrition++;
      if ('grams_per_unit' in s.changes) counts.grams++;
    }
    return counts;
  }, [suggestions]);

  const getIngredient = (id: string) => ingredients.find((i) => i.id === id);
  const getUnit = (ing?: Ingredient) => ing ? units.find((u) => u.id === ing.default_unit_id) : null;

  // Merge original suggestion with user edits, converting string inputs to numbers where needed
  const effectiveChanges = (s: ReviewSuggestion): ReviewChanges => {
    const result: ReviewChanges = { ...s.changes };
    const userEdits = edits[s.id] ?? {};
    for (const [k, v] of Object.entries(userEdits)) {
      const key = k as keyof ReviewChanges;
      if (NUTRITION_KEYS.includes(key) || key === 'grams_per_unit') {
        if (v !== '') (result as Record<string, unknown>)[key] = Number(v);
        else delete (result as Record<string, unknown>)[key];
      } else {
        (result as Record<string, unknown>)[key] = v;
      }
    }
    return result;
  };

  const getEditValue = (id: string, field: string, original: unknown): string => {
    const userVal = edits[id]?.[field];
    if (userVal !== undefined) return userVal;
    return original != null ? String(original) : '';
  };

  const editField = (id: string, field: string, value: string) => {
    setEdits((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), [field]: value } }));
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allSelected = selected.size === suggestions.length;
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(suggestions.map((s) => s.id)));
  };

  const handleApply = async () => {
    const accepted = suggestions
      .filter((s) => selected.has(s.id))
      .map((s) => ({ ...s, changes: effectiveChanges(s) }));

    setApplying(true);
    setApplyProgress({ done: 0, total: accepted.length });
    await onApply(accepted, (done, total) => setApplyProgress({ done, total }));
    setApplying(false);
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-[2px]"
        onClick={!applying ? onClose : undefined}
      />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-[#0e393d]/10 shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">

          {/* Header */}
          <div className="border-b border-[#0e393d]/10 px-6 py-5 flex-shrink-0">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-serif text-xl text-[#0e393d]">AI Review &amp; Complete</h2>
                <p className="mt-0.5 text-sm text-[#1c2a2b]/50">
                  {totalScanned} scanned ·{' '}
                  <span className="text-amber-600 font-medium">{suggestions.length} need updates</span>
                  {' '}· {completedCount} complete
                </p>
              </div>
              {!applying && (
                <button onClick={onClose} className="text-[#1c2a2b]/40 hover:text-[#1c2a2b] transition">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-violet-50 px-4 py-3 text-center">
                <p className="text-xl font-semibold text-violet-700">{summaryCounts.translations}</p>
                <p className="text-[11px] text-violet-600/70 mt-0.5">Translations missing</p>
              </div>
              <div className="rounded-lg bg-emerald-50 px-4 py-3 text-center">
                <p className="text-xl font-semibold text-emerald-700">{summaryCounts.nutrition}</p>
                <p className="text-[11px] text-emerald-600/70 mt-0.5">Nutrition missing</p>
              </div>
              <div className="rounded-lg bg-amber-50 px-4 py-3 text-center">
                <p className="text-xl font-semibold text-amber-700">{summaryCounts.grams}</p>
                <p className="text-[11px] text-amber-600/70 mt-0.5">Grams/unit missing</p>
              </div>
            </div>
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-4 px-6 py-2.5 border-b border-[#0e393d]/8 bg-[#fafaf8] flex-shrink-0">
            <label className="flex items-center gap-2 text-xs text-[#1c2a2b]/60 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="rounded border-[#0e393d]/20 accent-[#0e393d]"
              />
              {allSelected ? 'Deselect all' : 'Select all'}
            </label>
            <span className="text-xs text-[#1c2a2b]/35">{selected.size} of {suggestions.length} selected</span>
          </div>

          {/* Suggestions list */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {suggestions.length === 0 ? (
              <p className="py-12 text-center text-sm text-[#1c2a2b]/40">All ingredients are complete!</p>
            ) : (
              <div className="divide-y divide-[#0e393d]/6">
                {suggestions.map((s) => {
                  const ing = getIngredient(s.id);
                  const unit = getUnit(ing);
                  const nameEn = ing?.name?.en ?? '';
                  const nameDe = ing?.name?.de ?? '';
                  const displayName = nameEn || nameDe || s.id;
                  const subName = nameEn && nameDe ? nameDe : '';
                  const changes = effectiveChanges(s);
                  const changeCount = Object.keys(s.changes).length;
                  const isExpanded = expanded.has(s.id);
                  const isSelected = selected.has(s.id);

                  const langFields = LANG_KEYS.filter((k) => k in s.changes);
                  const nutritionFields = NUTRITION_KEYS.filter((k) => k in s.changes);
                  const hasGrams = 'grams_per_unit' in s.changes;

                  return (
                    <div key={s.id} className={`px-6 py-3 transition-opacity ${!isSelected ? 'opacity-40' : ''}`}>
                      {/* Row header */}
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(s.id)}
                          className="rounded border-[#0e393d]/20 accent-[#0e393d] flex-shrink-0"
                        />
                        <button
                          type="button"
                          onClick={() => toggleExpand(s.id)}
                          className="flex items-center gap-2 flex-1 text-left min-w-0"
                        >
                          <svg
                            width="12" height="12" viewBox="0 0 12 12" fill="none"
                            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                            className={`flex-shrink-0 text-[#0e393d]/35 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          >
                            <path d="M4 2l4 4-4 4" />
                          </svg>
                          <span className="font-medium text-sm text-[#0e393d] truncate">{displayName}</span>
                          {subName && <span className="text-xs text-[#1c2a2b]/35 truncate">{subName}</span>}
                          <span className="ml-auto flex-shrink-0 text-xs text-[#1c2a2b]/35">
                            {changeCount} field{changeCount !== 1 ? 's' : ''}
                          </span>
                        </button>
                      </div>

                      {/* Collapsed: chip summary */}
                      {!isExpanded && (
                        <div className="mt-1.5 pl-9 flex flex-wrap gap-1.5">
                          {langFields.map((k) => (
                            <span key={k} className="inline-flex items-center gap-1 rounded-full bg-violet-50 text-violet-700 px-2 py-0.5 text-[11px]">
                              <span className="font-semibold">{LANG_LABELS[k]}</span>
                              <span className="truncate max-w-[120px]">{String(changes[k] ?? '')}</span>
                            </span>
                          ))}
                          {nutritionFields.length > 0 && (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[11px] gap-1">
                              {changes.kcal_per_100g != null && <span>{changes.kcal_per_100g} kcal</span>}
                              {changes.protein_per_100g != null && <span>· {changes.protein_per_100g}g prot</span>}
                              {changes.fat_per_100g != null && <span>· {changes.fat_per_100g}g fat</span>}
                              {changes.carbs_per_100g != null && <span>· {changes.carbs_per_100g}g carbs</span>}
                              {changes.fiber_per_100g != null && <span>· {changes.fiber_per_100g}g fiber</span>}
                            </span>
                          )}
                          {hasGrams && (
                            <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-[11px]">
                              {changes.grams_per_unit}g/{unit?.code ?? 'unit'}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Expanded: edit inputs */}
                      {isExpanded && (
                        <div className="mt-3 pl-9 space-y-4">
                          {/* Translation fields */}
                          {langFields.length > 0 && (
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84] mb-2">Translations</p>
                              <div className="grid grid-cols-2 gap-2">
                                {langFields.map((k) => (
                                  <div key={k} className="flex items-center gap-2">
                                    <span className="w-7 text-[11px] font-semibold text-violet-600 flex-shrink-0">{LANG_LABELS[k]}</span>
                                    <input
                                      value={getEditValue(s.id, k, changes[k])}
                                      onChange={(e) => editField(s.id, k, e.target.value)}
                                      className="flex-1 min-w-0 rounded-md border border-[#0e393d]/15 bg-white px-2 py-1 text-xs text-[#1c2a2b] focus:outline-none focus:ring-1 focus:ring-[#0e393d]/30 transition"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Nutrition fields */}
                          {nutritionFields.length > 0 && (
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84] mb-2">Nutrition (per 100g)</p>
                              <div className="flex flex-wrap gap-2">
                                {nutritionFields.map((k) => (
                                  <div key={k} className="flex items-center gap-1">
                                    <span className="text-[11px] text-[#1c2a2b]/50">{NUTRITION_LABELS[k]}</span>
                                    <div className="relative">
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={getEditValue(s.id, k, changes[k])}
                                        onChange={(e) => editField(s.id, k, e.target.value)}
                                        className="w-16 rounded-md border border-[#0e393d]/15 bg-white pl-1.5 pr-5 py-1 text-xs text-[#1c2a2b] focus:outline-none focus:ring-1 focus:ring-[#0e393d]/30 transition"
                                      />
                                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-[#1c2a2b]/35 pointer-events-none">
                                        {NUTRITION_UNITS_MAP[k]}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Grams per unit */}
                          {hasGrams && (
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84] mb-2">Grams per unit</p>
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={getEditValue(s.id, 'grams_per_unit', changes.grams_per_unit)}
                                    onChange={(e) => editField(s.id, 'grams_per_unit', e.target.value)}
                                    className="w-20 rounded-md border border-[#0e393d]/15 bg-white pl-2 pr-5 py-1 text-xs text-[#1c2a2b] focus:outline-none focus:ring-1 focus:ring-[#0e393d]/30 transition"
                                  />
                                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-[#1c2a2b]/35 pointer-events-none">g</span>
                                </div>
                                <span className="text-[11px] text-[#1c2a2b]/40">
                                  per {unit?.name?.en ?? unit?.code ?? 'unit'}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[#0e393d]/10 px-6 py-4 flex-shrink-0">
            {applying ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-[#1c2a2b]/60">
                  <span>Applying updates…</span>
                  <span>{applyProgress.done}/{applyProgress.total}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#0e393d]/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#0e393d] transition-all duration-300"
                    style={{ width: applyProgress.total > 0 ? `${(applyProgress.done / applyProgress.total) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-[#0e393d]/15 py-2.5 text-sm font-medium text-[#1c2a2b] hover:bg-[#fafaf8] transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApply}
                  disabled={selected.size === 0}
                  className="flex-1 rounded-lg bg-[#0e393d] py-2.5 text-sm font-medium text-white hover:bg-[#0e393d]/90 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Apply {selected.size} update{selected.size !== 1 ? 's' : ''}
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
