'use client';

import { useState, useEffect } from 'react';
import PageShell from '@/components/admin/PageShell';
import { inputCls, AdminBadge } from '@/components/admin/shared/AdminUI';
import WebsitePhotosTab from './WebsitePhotosTab';
import VoiceBriefingsTab from './VoiceBriefingsTab';
import DevToolsTab from './DevToolsTab';

interface SettingRow {
  key: string;
  value: unknown;
  description: string | null;
  updated_at: string;
}

/* ─── Company field definitions ─────────────────────────────────────────── */

interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  multilingual?: boolean;   // value is { en, de, fr, es, it }
}

const COMPANY_FIELDS: FieldDef[] = [
  { key: 'company_name',        label: 'Company Name',     placeholder: 'Evida Life AG' },
  { key: 'company_street',      label: 'Street',           placeholder: 'Sihleggstrasse 5' },
  { key: 'company_postal_code', label: 'Postal Code',      placeholder: '8832' },
  { key: 'company_city',        label: 'City',             placeholder: 'Wollerau' },
  { key: 'company_canton',      label: 'Canton',           placeholder: 'Schwyz' },
  { key: 'company_country',     label: 'Country',          placeholder: 'Switzerland', multilingual: true },
  { key: 'company_email',       label: 'Contact Email',    placeholder: 'hello@evidalife.com' },
  { key: 'company_uid',         label: 'UID',              placeholder: 'CHE-xxx.xxx.xxx' },
  { key: 'company_registry',    label: 'Commercial Register', placeholder: 'Handelsregister Kanton Schwyz', multilingual: true },
];

const LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
const LANG_LABELS: Record<string, string> = { en: 'English', de: 'Deutsch', fr: 'Français', es: 'Español', it: 'Italiano' };

type Tab = 'company' | 'photos' | 'voice' | 'devtools';

/* ─── Component ─────────────────────────────────────────────────────────── */

export default function SiteSettingsManager() {
  const [activeTab, setActiveTab] = useState<Tab>('company');
  const [rows, setRows] = useState<SettingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Draft values: key → string (plain) or key → { en, de, ... } (multilingual)
  const [draft, setDraft] = useState<Record<string, unknown>>({});

  /* ── Load ────────────────────────────────────────────────────────────── */
  useEffect(() => {
    fetch('/api/admin/site-settings')
      .then(r => r.json())
      .then((data: SettingRow[]) => {
        setRows(data);
        const d: Record<string, unknown> = {};
        for (const r of data) d[r.key] = r.value;
        setDraft(d);
        setLoading(false);
      });
  }, []);

  /* ── Helpers ─────────────────────────────────────────────────────────── */
  const setField = (key: string, value: unknown) => {
    setDraft(prev => ({ ...prev, [key]: value }));
    setDirty(true);
    setSaved(false);
  };

  const setPlain = (key: string, val: string) => setField(key, val);

  const setLangValue = (key: string, lang: string, val: string) => {
    const prev = (draft[key] ?? {}) as Record<string, string>;
    setField(key, { ...prev, [lang]: val });
  };

  const getValue = (key: string): string =>
    typeof draft[key] === 'string' ? (draft[key] as string) : '';

  const getLangValue = (key: string, lang: string): string => {
    const v = draft[key];
    if (v && typeof v === 'object') return (v as Record<string, string>)[lang] ?? '';
    return '';
  };

  /* ── Save ────────────────────────────────────────────────────────────── */
  const handleSave = async () => {
    setSaving(true);
    const entries = COMPANY_FIELDS.map(f => ({ key: f.key, value: draft[f.key] }));
    const res = await fetch('/api/admin/site-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setDirty(false);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  /* ── Tabs ────────────────────────────────────────────────────────────── */
  const tabs: { id: Tab; label: string }[] = [
    { id: 'company',  label: 'Company Info' },
    { id: 'photos',   label: 'Website Photos' },
    { id: 'voice',    label: 'Voice Briefings' },
    { id: 'devtools', label: 'Dev Tools' },
  ];

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <PageShell
      title="Site Settings"
      description="Manage company information and website photos"
      action={
        activeTab === 'company' ? (
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium shadow-sm transition ${
              dirty
                ? 'bg-[#0e393d] text-white hover:bg-[#0e393d]/90 shadow-[#0e393d]/20'
                : saved
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#0e393d]/10 text-[#0e393d]/40 cursor-not-allowed'
            }`}
          >
            {saving ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : saved ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : null}
            {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
          </button>
        ) : undefined
      }
    >
      {/* Tab bar */}
      <div className="border-b border-[#0e393d]/8 -mx-8 px-8 -mt-2 mb-6">
        <div className="flex gap-1">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors rounded-t-lg ${
                activeTab === id
                  ? 'text-[#0e393d] bg-white'
                  : 'text-[#0e393d]/45 hover:text-[#0e393d]/70 hover:bg-[#0e393d]/[0.03]'
              }`}
            >
              {label}
              {activeTab === id && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#0e393d] rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'company' && (
        <>
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-[#0e393d]/5 rounded-lg" />
              ))}
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-[#0e393d]/10 bg-white p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-[#0e393d]/40">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                  </span>
                  <div>
                    <h2 className="font-serif text-lg text-[#0e393d]">Company Information</h2>
                    <p className="text-xs text-[#1c2a2b]/40 mt-0.5">
                      Used on the contact page, legal pages, and footer. Changes go live immediately.
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  {COMPANY_FIELDS.map(field => (
                    <div key={field.key}>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-[#1c2a2b]/45 mb-1.5">
                        {field.label}
                        {field.multilingual && (
                          <span className="ml-2 inline-flex"><AdminBadge color="gold">Multilingual</AdminBadge></span>
                        )}
                      </label>

                      {field.multilingual ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {LANGS.map(lang => (
                            <div key={lang} className="flex items-center gap-2">
                              <span className="text-[10px] font-medium uppercase tracking-wide text-[#1c2a2b]/30 w-5 shrink-0">
                                {lang}
                              </span>
                              <input
                                className={inputCls}
                                value={getLangValue(field.key, lang)}
                                onChange={e => setLangValue(field.key, lang, e.target.value)}
                                placeholder={`${field.placeholder} (${LANG_LABELS[lang]})`}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <input
                          className={inputCls}
                          value={getValue(field.key)}
                          onChange={e => setPlain(field.key, e.target.value)}
                          placeholder={field.placeholder}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Last updated info */}
              {rows.length > 0 && (
                <p className="text-xs text-[#1c2a2b]/30 mt-4 text-right">
                  Last updated: {new Date(
                    Math.max(...rows.filter(r => r.key.startsWith('company_')).map(r => new Date(r.updated_at).getTime()))
                  ).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              )}
            </>
          )}
        </>
      )}

      {activeTab === 'photos' && <WebsitePhotosTab />}
      {activeTab === 'voice' && <VoiceBriefingsTab />}
      {activeTab === 'devtools' && <DevToolsTab />}
    </PageShell>
  );
}
