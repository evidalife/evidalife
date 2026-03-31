'use client';

import { useState } from 'react';
import DailyDozenTracker, { type DDCategory, type DDEntry, type DDStreak, type HistoricalEntry } from './DailyDozenTracker';
import ChecklistTracker, { type ChecklistItem, type ChecklistEntry } from './ChecklistTracker';

type Lang = 'de' | 'en' | 'fr' | 'es' | 'it';
type TabId = 'daily_dozen' | '21_tweaks' | 'anti_aging';

const TAB_LABELS: Record<Lang, Record<TabId, string>> = {
  de: { daily_dozen: 'Daily Dozen', '21_tweaks': '21 Tweaks', anti_aging: 'Anti-Aging 8' },
  en: { daily_dozen: 'Daily Dozen', '21_tweaks': '21 Tweaks', anti_aging: 'Anti-Aging 8' },
  fr: { daily_dozen: 'Daily Dozen', '21_tweaks': '21 Tweaks', anti_aging: 'Anti-Aging 8' },
  es: { daily_dozen: 'Daily Dozen', '21_tweaks': '21 Tweaks', anti_aging: 'Anti-Aging 8' },
  it: { daily_dozen: 'Daily Dozen', '21_tweaks': '21 Tweaks', anti_aging: 'Anti-Aging 8' },
};

const TAB_DESCRIPTIONS: Record<Lang, Record<TabId, string>> = {
  de: {
    daily_dozen: 'Dr. Gregers 12 tägliche Lebensmittelgruppen',
    '21_tweaks': '21 Tricks aus How Not to Diet',
    anti_aging: '8 Schlüssel zum Anti-Aging aus How Not to Age',
  },
  en: {
    daily_dozen: "Dr. Greger's 12 daily food groups",
    '21_tweaks': '21 tweaks from How Not to Diet',
    anti_aging: '8 anti-aging keys from How Not to Age',
  },
  fr: {
    daily_dozen: 'Les 12 groupes alimentaires quotidiens du Dr Greger',
    '21_tweaks': '21 astuces de How Not to Diet',
    anti_aging: '8 clés anti-âge de How Not to Age',
  },
  es: {
    daily_dozen: 'Los 12 grupos alimentarios diarios del Dr. Greger',
    '21_tweaks': '21 trucos de How Not to Diet',
    anti_aging: '8 claves anti-envejecimiento de How Not to Age',
  },
  it: {
    daily_dozen: 'I 12 gruppi alimentari giornalieri del Dr. Greger',
    '21_tweaks': '21 trucchi da How Not to Diet',
    anti_aging: '8 chiavi anti-invecchiamento da How Not to Age',
  },
};

const LOCKED_MSG: Record<Lang, { title: string; sub: string; hint: string }> = {
  de: {
    title: 'Noch nicht freigeschaltet',
    sub: 'Dieses Level wird aktiviert, wenn du bereit bist — vom AI Coach oder in deinen Profil-Einstellungen.',
    hint: 'Tipp: Meistere zuerst das Daily Dozen, dann schalte die nächsten Level frei.',
  },
  en: {
    title: 'Not yet unlocked',
    sub: 'This level activates when you are ready — via AI Coach or in your profile settings.',
    hint: 'Tip: Master the Daily Dozen first, then unlock the next levels.',
  },
  fr: {
    title: 'Pas encore débloqué',
    sub: "Ce niveau s'active quand vous êtes prêt — via le coach IA ou dans vos paramètres de profil.",
    hint: 'Conseil : Maîtrisez d\'abord le Daily Dozen, puis débloquez les niveaux suivants.',
  },
  es: {
    title: 'Aún no desbloqueado',
    sub: 'Este nivel se activa cuando estés listo — vía AI Coach o en la configuración de tu perfil.',
    hint: 'Consejo: Domina primero el Daily Dozen, luego desbloquea los siguientes niveles.',
  },
  it: {
    title: 'Non ancora sbloccato',
    sub: 'Questo livello si attiva quando sei pronto — tramite AI Coach o nelle impostazioni del profilo.',
    hint: 'Suggerimento: Padroneggia prima il Daily Dozen, poi sblocca i livelli successivi.',
  },
};

export default function DailyChecklistTabs({
  userId,
  lang,
  today,
  tweaksEnabled,
  antiAgingEnabled,
  checklistItems,
  checklistEntries,
  ddTrackerProps,
}: {
  userId: string;
  lang: Lang;
  today: string;
  tweaksEnabled: boolean;
  antiAgingEnabled: boolean;
  checklistItems: ChecklistItem[];
  checklistEntries: ChecklistEntry[];
  ddTrackerProps: {
    categories: DDCategory[];
    entries: DDEntry[];
    streak: DDStreak | null;
    historicalEntries: HistoricalEntry[];
  };
}) {
  const [activeTab, setActiveTab] = useState<TabId>('daily_dozen');
  const labels = TAB_LABELS[lang] ?? TAB_LABELS.en;
  const descriptions = TAB_DESCRIPTIONS[lang] ?? TAB_DESCRIPTIONS.en;
  const locked = LOCKED_MSG[lang] ?? LOCKED_MSG.en;

  const tabs: { id: TabId; enabled: boolean; color: string; activeColor: string; icon: string }[] = [
    { id: 'daily_dozen', enabled: true, color: 'emerald', activeColor: '#1D9E75', icon: '🥗' },
    { id: '21_tweaks', enabled: tweaksEnabled, color: 'purple', activeColor: '#7C3AED', icon: '⚡' },
    { id: 'anti_aging', enabled: antiAgingEnabled, color: 'amber', activeColor: '#ceab84', icon: '🧬' },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const isLocked = !tab.enabled;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shrink-0 ${
                isActive
                  ? 'bg-white shadow-sm border border-[#0e393d]/10 text-[#0e393d]'
                  : isLocked
                    ? 'bg-[#0e393d]/[0.02] text-[#1c2a2b]/25 border border-transparent'
                    : 'bg-[#0e393d]/[0.03] text-[#1c2a2b]/50 hover:bg-[#0e393d]/[0.06] border border-transparent'
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              <span>{labels[tab.id]}</span>
              {isLocked && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#1c2a2b]/20">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              )}
              {isActive && (
                <span
                  className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
                  style={{ backgroundColor: tab.activeColor }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab description */}
      <p className="text-xs text-[#1c2a2b]/40 mb-4 px-1">{descriptions[activeTab]}</p>

      {/* Tab content */}
      {activeTab === 'daily_dozen' && (
        <DailyDozenTracker
          userId={userId}
          categories={ddTrackerProps.categories}
          entries={ddTrackerProps.entries}
          streak={ddTrackerProps.streak}
          lang={lang}
          today={today}
          historicalEntries={ddTrackerProps.historicalEntries}
        />
      )}

      {activeTab === '21_tweaks' && (
        tweaksEnabled ? (
          <ChecklistTracker
            userId={userId}
            items={checklistItems}
            entries={checklistEntries}
            lang={lang}
            today={today}
            framework="21_tweaks"
          />
        ) : (
          <LockedState title={locked.title} sub={locked.sub} hint={locked.hint} color="purple" />
        )
      )}

      {activeTab === 'anti_aging' && (
        antiAgingEnabled ? (
          <ChecklistTracker
            userId={userId}
            items={checklistItems}
            entries={checklistEntries}
            lang={lang}
            today={today}
            framework="anti_aging"
          />
        ) : (
          <LockedState title={locked.title} sub={locked.sub} hint={locked.hint} color="gold" />
        )
      )}
    </div>
  );
}

// ─── Locked state placeholder ────────────────────────────────────────────────

function LockedState({ title, sub, hint, color }: { title: string; sub: string; hint: string; color: 'purple' | 'gold' }) {
  const borderColor = color === 'purple' ? 'border-purple-200/50' : 'border-[#ceab84]/30';
  const bgColor = color === 'purple' ? 'bg-purple-50/30' : 'bg-[#ceab84]/5';
  const iconBg = color === 'purple' ? 'bg-purple-100' : 'bg-[#ceab84]/20';
  const iconText = color === 'purple' ? 'text-purple-400' : 'text-[#ceab84]';
  const titleColor = color === 'purple' ? 'text-purple-800' : 'text-[#8a6a3e]';

  return (
    <div className={`rounded-2xl border ${borderColor} ${bgColor} px-8 py-12 text-center`}>
      <div className={`w-14 h-14 ${iconBg} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={iconText}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <h3 className={`text-lg font-serif ${titleColor} mb-2`}>{title}</h3>
      <p className="text-sm text-[#1c2a2b]/50 max-w-md mx-auto mb-3">{sub}</p>
      <p className="text-xs text-[#1c2a2b]/30">{hint}</p>
    </div>
  );
}
