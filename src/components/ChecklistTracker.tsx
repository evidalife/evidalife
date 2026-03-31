'use client';

import { useCallback, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'de' | 'en' | 'fr' | 'es' | 'it';

export type ChecklistItem = {
  id: string;
  framework: '21_tweaks' | 'anti_aging';
  category: string;
  name_en: string;
  name_de: string | null;
  name_fr: string | null;
  name_es: string | null;
  name_it: string | null;
  description_en: string | null;
  description_de: string | null;
  description_fr: string | null;
  description_es: string | null;
  description_it: string | null;
  target_servings: number;
  unit: string | null;
  icon: string | null;
  sort_order: number;
};

export type ChecklistEntry = {
  checklist_item_id: string;
  servings_completed: number;
  is_done: boolean;
};

// ─── Translations ─────────────────────────────────────────────────────────────

const T: Record<Lang, {
  done: string;
  of: string;
  completed: string;
  emptyTitle: string;
  emptySub: string;
}> = {
  de: { done: 'Erledigt!', of: 'von', completed: 'abgeschlossen', emptyTitle: 'Noch nicht freigeschaltet', emptySub: 'Dieses Level wird vom AI Coach freigeschaltet, wenn du bereit bist.' },
  en: { done: 'Done!', of: 'of', completed: 'completed', emptyTitle: 'Not yet unlocked', emptySub: 'This level will be unlocked by the AI Coach when you are ready.' },
  fr: { done: 'Terminé !', of: 'de', completed: 'terminé', emptyTitle: 'Pas encore débloqué', emptySub: 'Ce niveau sera débloqué par le coach IA quand vous serez prêt.' },
  es: { done: '¡Hecho!', of: 'de', completed: 'completado', emptyTitle: 'Aún no desbloqueado', emptySub: 'Este nivel será desbloqueado por el coach IA cuando estés listo.' },
  it: { done: 'Fatto!', of: 'di', completed: 'completato', emptyTitle: 'Non ancora sbloccato', emptySub: 'Questo livello verrà sbloccato dal coach IA quando sarai pronto.' },
};

// ─── Ring helper ──────────────────────────────────────────────────────────────

const R = 20, CX = 26, CIRC = 2 * Math.PI * R;

function CheckRing({ progress, done, icon }: { progress: number; done: boolean; icon: string | null }) {
  const partial = progress > 0 && !done;
  const stroke = done ? '#7C3AED' : partial ? '#BA7517' : null;
  const track = done ? '#EDE9FE' : partial ? '#FAEEDA' : '#F1EFE8';

  return (
    <svg width="52" height="52" viewBox="0 0 52 52" className="shrink-0">
      <circle cx={CX} cy={CX} r={R} fill="none" stroke={track} strokeWidth="5" />
      {stroke && (
        <circle
          cx={CX} cy={CX} r={R} fill="none" stroke={stroke} strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - Math.min(progress, 1))}
          transform={`rotate(-90 ${CX} ${CX})`}
          className="transition-all duration-300"
        />
      )}
      <text x={CX} y={CX} textAnchor="middle" dominantBaseline="central" className="text-base select-none">
        {icon ?? '✓'}
      </text>
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChecklistTracker({
  userId,
  items,
  entries: initialEntries,
  lang,
  today,
  framework,
}: {
  userId: string;
  items: ChecklistItem[];
  entries: ChecklistEntry[];
  lang: Lang;
  today: string;
  framework: '21_tweaks' | 'anti_aging';
}) {
  const supabase = createClient();
  const t = T[lang] ?? T.en;
  const [entries, setEntries] = useState<Record<string, { servings: number; done: boolean }>>(
    () => {
      const map: Record<string, { servings: number; done: boolean }> = {};
      initialEntries.forEach(e => { map[e.checklist_item_id] = { servings: e.servings_completed, done: e.is_done }; });
      return map;
    }
  );
  const [loading, setLoading] = useState<string | null>(null);

  const frameworkItems = useMemo(() => items.filter(i => i.framework === framework).sort((a, b) => a.sort_order - b.sort_order), [items, framework]);
  const completedCount = frameworkItems.filter(item => {
    const e = entries[item.id];
    return e && (e.done || e.servings >= item.target_servings);
  }).length;

  // Upsert a checklist entry
  const upsertEntry = useCallback(async (itemId: string, servings: number, isDone: boolean) => {
    setLoading(itemId);
    setEntries(prev => ({ ...prev, [itemId]: { servings, done: isDone } }));

    await supabase.from('daily_checklist_entries').upsert(
      {
        user_id: userId,
        checklist_item_id: itemId,
        entry_date: today,
        servings_completed: servings,
        is_done: isDone,
      },
      { onConflict: 'user_id,checklist_item_id,entry_date' }
    );
    setLoading(null);
  }, [supabase, userId, today]);

  const increment = (item: ChecklistItem) => {
    const current = entries[item.id]?.servings ?? 0;
    const next = Math.min(current + 1, item.target_servings);
    upsertEntry(item.id, next, next >= item.target_servings);
  };

  const decrement = (item: ChecklistItem) => {
    const current = entries[item.id]?.servings ?? 0;
    const next = Math.max(current - 1, 0);
    upsertEntry(item.id, next, false);
  };

  const toggleDone = (item: ChecklistItem) => {
    const e = entries[item.id];
    if (e?.done) {
      upsertEntry(item.id, 0, false);
    } else {
      upsertEntry(item.id, item.target_servings, true);
    }
  };

  const getName = (item: ChecklistItem) => {
    const map: Record<Lang, string | null> = { de: item.name_de, en: item.name_en, fr: item.name_fr, es: item.name_es, it: item.name_it };
    return map[lang] || item.name_en;
  };

  const getDesc = (item: ChecklistItem) => {
    const map: Record<Lang, string | null> = { de: item.description_de, en: item.description_en, fr: item.description_fr, es: item.description_es, it: item.description_it };
    return map[lang] || item.description_en;
  };

  return (
    <div>
      {/* Summary bar */}
      <div className="flex items-center gap-4 mb-6 px-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-semibold text-[#0e393d]">{completedCount}</span>
          <span className="text-sm text-[#1c2a2b]/40">{t.of} {frameworkItems.length} {t.completed}</span>
        </div>
        <div className="flex-1 h-2 rounded-full bg-[#0e393d]/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${frameworkItems.length > 0 ? (completedCount / frameworkItems.length) * 100 : 0}%`,
              backgroundColor: framework === '21_tweaks' ? '#7C3AED' : '#ceab84',
            }}
          />
        </div>
      </div>

      {/* Items grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {frameworkItems.map(item => {
          const e = entries[item.id];
          const servings = e?.servings ?? 0;
          const isDone = e?.done || servings >= item.target_servings;
          const progress = item.target_servings > 0 ? servings / item.target_servings : 0;
          const isLoading = loading === item.id;

          return (
            <div
              key={item.id}
              className={`relative rounded-2xl border px-4 py-3 transition-all duration-200 ${
                isDone
                  ? framework === '21_tweaks'
                    ? 'border-purple-200 bg-purple-50/40'
                    : 'border-[#ceab84]/30 bg-[#ceab84]/5'
                  : 'border-[#0e393d]/8 bg-white hover:border-[#0e393d]/15'
              } ${isLoading ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-3">
                {/* Ring */}
                <button onClick={() => toggleDone(item)} className="mt-0.5">
                  <CheckRing progress={progress} done={isDone} icon={item.icon} />
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${isDone ? 'text-[#0e393d]/50 line-through' : 'text-[#0e393d]'}`}>
                      {getName(item)}
                    </span>
                    {isDone && (
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                        framework === '21_tweaks' ? 'bg-purple-100 text-purple-600' : 'bg-[#ceab84]/20 text-[#8a6a3e]'
                      }`}>{t.done}</span>
                    )}
                  </div>
                  {getDesc(item) && (
                    <p className="text-xs text-[#1c2a2b]/40 mt-0.5 line-clamp-2">{getDesc(item)}</p>
                  )}

                  {/* Counter (for items with target > 1) */}
                  {item.target_servings > 1 && (
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => decrement(item)}
                        disabled={servings === 0}
                        className="w-7 h-7 rounded-full border border-[#0e393d]/10 flex items-center justify-center text-[#0e393d]/60 hover:bg-[#0e393d]/5 disabled:opacity-30 transition text-sm"
                      >−</button>
                      <span className="text-xs font-medium text-[#0e393d] min-w-[3ch] text-center">
                        {servings}/{item.target_servings}
                      </span>
                      <button
                        onClick={() => increment(item)}
                        disabled={servings >= item.target_servings}
                        className="w-7 h-7 rounded-full border border-[#0e393d]/10 flex items-center justify-center text-[#0e393d]/60 hover:bg-[#0e393d]/5 disabled:opacity-30 transition text-sm"
                      >+</button>
                      <span className="text-[10px] text-[#1c2a2b]/30">{item.unit}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
