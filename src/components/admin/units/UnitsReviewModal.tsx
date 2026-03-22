'use client';

import { useState } from 'react';
import type { MeasurementUnit } from './UnitsManager';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UnitReviewSuggestion = {
  id: string;
  name_de?: string;
  name_fr?: string;
  name_es?: string;
  name_it?: string;
  abbrev_en?: string;
  abbrev_de?: string;
  abbrev_fr?: string;
  abbrev_es?: string;
  abbrev_it?: string;
  category?: string;
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  suggestions: UnitReviewSuggestion[];
  totalScanned: number;
  units: MeasurementUnit[];
  onApply: (
    accepted: UnitReviewSuggestion[],
    onProgress: (done: number, total: number) => void
  ) => Promise<void>;
  onClose: () => void;
}

const LANG_COLS = [
  { key: 'de' as const, label: 'DE' },
  { key: 'fr' as const, label: 'FR' },
  { key: 'es' as const, label: 'ES' },
  { key: 'it' as const, label: 'IT' },
];

export default function UnitsReviewModal({
  suggestions, totalScanned, units, onApply, onClose,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(suggestions.map((s) => s.id))
  );
  const [edits, setEdits] = useState<Record<string, Record<string, string>>>({});
  const [applying, setApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState({ done: 0, total: 0 });

  const completedCount = totalScanned - suggestions.length;

  const getUnit = (id: string) => units.find((u) => u.id === id);

  const getVal = (s: UnitReviewSuggestion, field: keyof UnitReviewSuggestion): string => {
    if (field === 'id') return s.id;
    const userEdit = edits[s.id]?.[field];
    if (userEdit !== undefined) return userEdit;
    return (s[field] as string | undefined) ?? '';
  };

  const setEdit = (id: string, field: string, value: string) => {
    setEdits((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), [field]: value } }));
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

  const effectiveSuggestion = (s: UnitReviewSuggestion): UnitReviewSuggestion => {
    const e = edits[s.id] ?? {};
    return {
      id: s.id,
      name_de: (e.name_de ?? s.name_de) || undefined,
      name_fr: (e.name_fr ?? s.name_fr) || undefined,
      name_es: (e.name_es ?? s.name_es) || undefined,
      name_it: (e.name_it ?? s.name_it) || undefined,
      abbrev_en: (e.abbrev_en ?? s.abbrev_en) || undefined,
      abbrev_de: (e.abbrev_de ?? s.abbrev_de) || undefined,
      abbrev_fr: (e.abbrev_fr ?? s.abbrev_fr) || undefined,
      abbrev_es: (e.abbrev_es ?? s.abbrev_es) || undefined,
      abbrev_it: (e.abbrev_it ?? s.abbrev_it) || undefined,
      category: (e.category ?? s.category) || undefined,
    };
  };

  const handleApply = async () => {
    const accepted = suggestions
      .filter((s) => selected.has(s.id))
      .map((s) => effectiveSuggestion(s));

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
        <div className="bg-white rounded-2xl border border-[#0e393d]/10 shadow-2xl w-full max-w-4xl flex flex-col max-h-[85vh]">

          {/* Header */}
          <div className="border-b border-[#0e393d]/10 px-6 py-5 flex-shrink-0">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-serif text-xl text-[#0e393d]">AI Review — Units</h2>
                <p className="mt-0.5 text-sm text-[#1c2a2b]/50">
                  {totalScanned} scanned ·{' '}
                  <span className="text-amber-600 font-medium">{suggestions.length} need translations</span>
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
          </div>

          {/* Controls */}
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

          {/* Table */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {suggestions.length === 0 ? (
              <p className="py-12 text-center text-sm text-[#1c2a2b]/40">All units are fully translated!</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b border-[#0e393d]/8">
                    <th className="w-8 px-4 py-2.5" />
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Unit</th>
                    {LANG_COLS.map((col) => (
                      <th key={col.key} className="px-3 py-2.5 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider w-36">
                        {col.label}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider w-28">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0e393d]/6">
                  {suggestions.map((s) => {
                    const unit = getUnit(s.id);
                    const displayName = unit?.name.en || unit?.name.de || unit?.code || s.id;
                    const isSelected = selected.has(s.id);
                    const hasAbbrev = !!(
                      unit?.abbreviation.en || unit?.abbreviation.de ||
                      unit?.abbreviation.fr || unit?.abbreviation.es || unit?.abbreviation.it ||
                      'abbrev_en' in s
                    );
                    const needsAbbrevEn = 'abbrev_en' in s;
                    const needsCategory = 'category' in s;

                    return (
                      <tr key={s.id} className={`transition-opacity ${!isSelected ? 'opacity-40' : ''}`}>
                        <td className="px-4 py-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(s.id)}
                            className="rounded border-[#0e393d]/20 accent-[#0e393d]"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="font-medium text-[#0e393d]">{displayName}</span>
                          {unit?.code && (
                            <span className="text-[10px] text-[#1c2a2b]/30 ml-1.5 font-mono">{unit.code}</span>
                          )}
                          {hasAbbrev && !needsAbbrevEn && (
                            <div className="text-[10px] text-[#1c2a2b]/40 mt-0.5">
                              abbrev: {unit?.abbreviation.en || unit?.abbreviation.de}
                            </div>
                          )}
                          {needsAbbrevEn && (
                            <div className="mt-1">
                              <span className="text-[10px] text-[#1c2a2b]/40">abbrev EN: </span>
                              <input
                                value={getVal(s, 'abbrev_en')}
                                onChange={(e) => setEdit(s.id, 'abbrev_en', e.target.value)}
                                placeholder="abbrev…"
                                className="inline-block w-20 rounded border border-[#0e393d]/15 bg-white px-1.5 py-0.5 text-[11px] text-[#1c2a2b] focus:outline-none focus:ring-1 focus:ring-[#0e393d]/30 transition font-mono"
                              />
                            </div>
                          )}
                        </td>
                        {LANG_COLS.map((col) => {
                          const nameField = `name_${col.key}` as keyof UnitReviewSuggestion;
                          const abbrevField = `abbrev_${col.key}` as keyof UnitReviewSuggestion;
                          const needsName = nameField in s;
                          const needsAbbrev = abbrevField in s;

                          return (
                            <td key={col.key} className="px-3 py-2">
                              <div className="space-y-1">
                                {needsName ? (
                                  <input
                                    value={getVal(s, nameField)}
                                    onChange={(e) => setEdit(s.id, nameField as string, e.target.value)}
                                    placeholder="name…"
                                    className="w-full rounded border border-[#0e393d]/15 bg-white px-2 py-1 text-xs text-[#1c2a2b] focus:outline-none focus:ring-1 focus:ring-[#0e393d]/30 transition"
                                  />
                                ) : (
                                  <span className="block text-xs text-[#1c2a2b]/25 px-2 py-1">—</span>
                                )}
                                {hasAbbrev && (
                                  needsAbbrev ? (
                                    <input
                                      value={getVal(s, abbrevField)}
                                      onChange={(e) => setEdit(s.id, abbrevField as string, e.target.value)}
                                      placeholder="abbrev…"
                                      className="w-full rounded border border-[#0e393d]/10 bg-[#fafaf8] px-2 py-0.5 text-[11px] text-[#1c2a2b]/70 focus:outline-none focus:ring-1 focus:ring-[#0e393d]/20 transition font-mono"
                                    />
                                  ) : (
                                    <span className="block text-[11px] text-[#1c2a2b]/20 px-2 font-mono">—</span>
                                  )
                                )}
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-3 py-2">
                          {needsCategory ? (
                            <input
                              value={getVal(s, 'category')}
                              onChange={(e) => setEdit(s.id, 'category', e.target.value)}
                              placeholder="e.g. volume"
                              className="w-full rounded border border-[#0e393d]/15 bg-white px-2 py-1 text-xs text-[#1c2a2b] focus:outline-none focus:ring-1 focus:ring-[#0e393d]/30 transition"
                            />
                          ) : (
                            <span className="block text-xs text-[#1c2a2b]/25 px-2 py-1">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[#0e393d]/10 px-6 py-4 flex-shrink-0">
            {applying ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-[#1c2a2b]/60">
                  <span>Applying translations…</span>
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
                  Apply {selected.size} translation{selected.size !== 1 ? 's' : ''}
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
