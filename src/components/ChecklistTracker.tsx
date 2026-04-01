'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import DDGauge        from './DDGauge';
import DDMiniCalendar from './DDMiniCalendar';

const DDProgressChart = dynamic(() => import('./DDProgressChart'), {
  ssr: false,
  loading: () => (
    <div className="h-48 flex items-center justify-center">
      <span className="text-[#1c2a2b]/20 text-sm">Loading chart...</span>
    </div>
  ),
});

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
}> = {
  de: { done: 'Erledigt!', of: 'von', completed: 'abgeschlossen' },
  en: { done: 'Done!', of: 'of', completed: 'completed' },
  fr: { done: 'Terminé !', of: 'de', completed: 'terminé' },
  es: { done: '¡Hecho!', of: 'de', completed: 'completado' },
  it: { done: 'Fatto!', of: 'di', completed: 'completato' },
};

// ─── Ring helper ──────────────────────────────────────────────────────────────

const RING_R = 20, CX = 26, CIRC = 2 * Math.PI * RING_R;

function CheckRing({ progress, done, icon, framework }: { progress: number; done: boolean; icon: string | null; framework: '21_tweaks' | 'anti_aging' }) {
  const partial = progress > 0 && !done;
  const accentColor = framework === '21_tweaks' ? '#7C3AED' : '#ceab84';
  const stroke = done ? '#1D9E75' : partial ? accentColor : null;
  const track = done ? '#E1F5EE' : partial ? (framework === '21_tweaks' ? '#EDE9FE' : '#FAEEDA') : '#F1EFE8';

  return (
    <svg width="52" height="52" viewBox="0 0 52 52" className="shrink-0">
      <circle cx={CX} cy={CX} r={RING_R} fill="none" stroke={track} strokeWidth="5" />
      {stroke && (
        <circle
          cx={CX} cy={CX} r={RING_R} fill="none" stroke={stroke} strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - Math.min(progress, 1))}
          transform={`rotate(-90 ${CX} ${CX})`}
          className="transition-all duration-300"
        />
      )}
      <text x={CX} y={CX + 1} textAnchor="middle" dominantBaseline="central" fontSize="20" className="select-none">
        {icon ?? '✓'}
      </text>
    </svg>
  );
}

// ─── Data source for chart & calendar ─────────────────────────────────────────

const CHECKLIST_SOURCE = { table: 'daily_checklist_entries', idField: 'checklist_item_id' };

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

  // ── State ──────────────────────────────────────────────────────────────────

  const frameworkItems = useMemo(
    () => items.filter(i => i.framework === framework).sort((a, b) => a.sort_order - b.sort_order),
    [items, framework]
  );

  const [servingsMap, setServingsMap] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const item of frameworkItems) map[item.id] = 0;
    for (const e of initialEntries) {
      if (map[e.checklist_item_id] !== undefined) map[e.checklist_item_id] = e.servings_completed;
    }
    return map;
  });

  const [pending, setPending]       = useState<Record<string, boolean>>({});
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [loadingDate, setLoadingDate]   = useState(false);
  const [refreshKey, setRefreshKey]     = useState(0);
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const isInitialMount = useRef(true);

  // ── Fetch entries on date change ───────────────────────────────────────────

  const fetchEntriesForDate = useCallback(async (date: string) => {
    setLoadingDate(true);
    const { data } = await supabase
      .from('daily_checklist_entries')
      .select('checklist_item_id, servings_completed, is_done')
      .eq('user_id', userId)
      .eq('entry_date', date);

    const newMap: Record<string, number> = {};
    for (const item of frameworkItems) newMap[item.id] = 0;
    for (const e of (data ?? [])) {
      if (newMap[e.checklist_item_id] !== undefined) newMap[e.checklist_item_id] = e.servings_completed;
    }
    setServingsMap(newMap);
    setLoadingDate(false);
  }, [supabase, userId, frameworkItems]);

  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    fetchEntriesForDate(selectedDate);
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Gauge totals ──────────────────────────────────────────────────────────

  const totalServings = frameworkItems.reduce((sum, item) => sum + (servingsMap[item.id] ?? 0), 0);
  const totalTarget   = frameworkItems.reduce((sum, item) => sum + item.target_servings, 0);
  const completedItems = frameworkItems.filter(item => (servingsMap[item.id] ?? 0) >= item.target_servings).length;

  // ── Upsert entry ──────────────────────────────────────────────────────────

  const upsertEntry = useCallback(async (itemId: string, newServings: number, isDone: boolean, date: string) => {
    setPending(p => ({ ...p, [itemId]: true }));
    await supabase.from('daily_checklist_entries').upsert(
      {
        user_id: userId,
        checklist_item_id: itemId,
        entry_date: date,
        servings_completed: newServings,
        is_done: isDone,
      },
      { onConflict: 'user_id,checklist_item_id,entry_date' }
    );
    setPending(p => ({ ...p, [itemId]: false }));
  }, [supabase, userId]);

  // ── Change handler (debounced) ─────────────────────────────────────────────

  const changeServings = useCallback((itemId: string, delta: number) => {
    const date = selectedDate;
    const item = frameworkItems.find(i => i.id === itemId);
    const max = item?.target_servings ?? Infinity;

    setServingsMap(prev => {
      const next = Math.min(max, Math.max(0, (prev[itemId] ?? 0) + delta));
      const newMap = { ...prev, [itemId]: next };

      clearTimeout(debounceRef.current[itemId]);
      debounceRef.current[itemId] = setTimeout(async () => {
        await upsertEntry(itemId, next, next >= max, date);
        setRefreshKey(k => k + 1);
      }, 400);

      return newMap;
    });
  }, [upsertEntry, selectedDate, frameworkItems]);

  const toggleDone = useCallback((item: ChecklistItem) => {
    const current = servingsMap[item.id] ?? 0;
    const isDone = current >= item.target_servings;
    if (isDone) {
      // Un-complete
      setServingsMap(prev => ({ ...prev, [item.id]: 0 }));
      clearTimeout(debounceRef.current[item.id]);
      debounceRef.current[item.id] = setTimeout(async () => {
        await upsertEntry(item.id, 0, false, selectedDate);
        setRefreshKey(k => k + 1);
      }, 400);
    } else {
      // Complete
      setServingsMap(prev => ({ ...prev, [item.id]: item.target_servings }));
      clearTimeout(debounceRef.current[item.id]);
      debounceRef.current[item.id] = setTimeout(async () => {
        await upsertEntry(item.id, item.target_servings, true, selectedDate);
        setRefreshKey(k => k + 1);
      }, 400);
    }
  }, [servingsMap, upsertEntry, selectedDate]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getName = (item: ChecklistItem) => {
    const map: Record<Lang, string | null> = { de: item.name_de, en: item.name_en, fr: item.name_fr, es: item.name_es, it: item.name_it };
    return map[lang] || item.name_en;
  };

  const getDesc = (item: ChecklistItem) => {
    const map: Record<Lang, string | null> = { de: item.description_de, en: item.description_en, fr: item.description_fr, es: item.description_es, it: item.description_it };
    return map[lang] || item.description_en;
  };

  // Categories-shaped array for chart & calendar (they expect { id, target_servings })
  const catSlim = useMemo(
    () => frameworkItems.map(item => ({ id: item.id, target_servings: item.target_servings })),
    [frameworkItems]
  );

  const scoreLabel = framework === '21_tweaks' ? '21 Tweaks Score' : 'Anti-Aging 8 Score';

  // ── Color tokens ──────────────────────────────────────────────────────────

  // Done state: unified green across all frameworks
  const accentDone = 'border-[#9FE1CB] bg-[#f0faf5]';
  const badgeDone = 'bg-[#E1F5EE] text-[#1D9E75]';
  const minusDone = 'border-[#5DCAA5] bg-[#E1F5EE] text-[#1D9E75] hover:bg-[#c8f0e1]';
  // Partial state: accent per framework
  const plusPartial = framework === '21_tweaks'
    ? 'border-purple-400/40 bg-purple-50 text-purple-600 hover:bg-purple-100'
    : 'border-[#ceab84]/40 bg-[#FAEEDA] text-[#BA7517] hover:bg-[#f5e1c0]';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Dashboard header: Row 1 (Gauge + Chart) + Row 2 (Calendar strip) ── */}
      <div className="space-y-2">

        {/* Row 1 — Gauge | Chart */}
        <div className="rounded-2xl border border-[#0e393d]/10 bg-white overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 sm:items-stretch">

            {/* Gauge */}
            <div className="flex flex-col px-6 py-5 border-b sm:border-b-0 sm:border-r border-[#0e393d]/8">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84] mb-1">
                {scoreLabel}
              </p>
              <div className="flex-1">
                <DDGauge
                  current={totalServings}
                  total={totalTarget}
                  lang={lang}
                  streak={null}
                  selectedDate={selectedDate}
                  today={today}
                  completedCategories={completedItems}
                  totalCategories={frameworkItems.length}
                />
              </div>
            </div>

            {/* Chart */}
            <div className="flex flex-col px-5 py-5">
              <DDProgressChart
                userId={userId}
                categories={catSlim}
                today={today}
                lang={lang}
                compact
                refreshKey={refreshKey}
                source={CHECKLIST_SOURCE}
              />
            </div>

          </div>
        </div>

        {/* Row 2 — Calendar strip */}
        <div className="rounded-2xl border border-[#0e393d]/10 bg-white px-5 py-4">
          <DDMiniCalendar
            userId={userId}
            categories={catSlim}
            today={today}
            lang={lang}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            refreshKey={refreshKey}
            source={CHECKLIST_SOURCE}
          />
        </div>

      </div>

      {/* ── Items grid ─────────────────────────────────────────────────────── */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 transition-opacity duration-200 ${
        loadingDate ? 'opacity-40 pointer-events-none' : ''
      }`}>
        {frameworkItems.map(item => {
          const servings = servingsMap[item.id] ?? 0;
          const isDone = servings >= item.target_servings;
          const partial = servings > 0 && !isDone;
          const progress = item.target_servings > 0 ? servings / item.target_servings : 0;
          const isPending = !!pending[item.id];

          const cardCls = isDone
            ? accentDone
            : 'border-[#0e393d]/10 bg-white hover:border-[#0e393d]/20';

          const counterCls = isDone ? 'text-[#1D9E75]'
            : partial ? (framework === '21_tweaks' ? 'text-purple-600' : 'text-[#BA7517]')
            : 'text-[#1c2a2b]/40';

          const minusCls = isDone
            ? minusDone
            : 'border-[#0e393d]/15 bg-white text-[#0e393d]/50 hover:border-[#0e393d]/40 hover:text-[#0e393d]';

          const plusCls = isDone
            ? minusDone
            : partial
              ? plusPartial
              : 'border-[#0e393d]/20 bg-[#0e393d] text-white hover:bg-[#0e393d]/85';

          return (
            <div
              key={item.id}
              className={`relative flex items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-all duration-200 min-h-[52px] ${cardCls} ${isPending ? 'opacity-60' : ''}`}
            >
              {/* Ring */}
              <button onClick={() => toggleDone(item)} className="shrink-0">
                <CheckRing progress={progress} done={isDone} icon={item.icon} framework={framework} />
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[13px] font-medium leading-tight ${isDone ? 'text-[#0e393d]/50 line-through' : 'text-[#0e393d]'}`}>
                    {getName(item)}
                  </span>
                  {isDone && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badgeDone}`}>{t.done}</span>
                  )}
                </div>
                {getDesc(item) && (
                  <p className="text-[11px] text-[#1c2a2b]/40 mt-0.5 line-clamp-1">{getDesc(item)}</p>
                )}
              </div>

              {/* Counter */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => changeServings(item.id, -1)}
                  disabled={servings === 0 || isPending}
                  style={{ touchAction: 'manipulation' }}
                  className={`w-[30px] h-[30px] rounded-full border flex items-center justify-center transition disabled:opacity-30 disabled:cursor-default ${minusCls}`}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>

                <span className={`text-[13px] font-semibold tabular-nums text-center w-9 ${counterCls}`}>
                  {servings}&thinsp;/&thinsp;{item.target_servings}
                </span>

                <button
                  type="button"
                  onClick={() => changeServings(item.id, +1)}
                  disabled={isPending}
                  style={{ touchAction: 'manipulation' }}
                  className={`w-[30px] h-[30px] rounded-full border flex items-center justify-center transition disabled:opacity-50 disabled:cursor-default ${plusCls}`}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>
              </div>

              {/* Pending overlay */}
              {isPending && (
                <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-white/50">
                  <svg className="w-4 h-4 text-[#0e393d]/40 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
