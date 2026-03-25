'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  buildWelcomeEmail,
  buildOrderConfirmationEmail,
  buildVoucherEmail,
  buildProcessingEmail,
  buildResultsReadyEmail,
} from '@/emails/templates';
import {
  buildAuthPreview,
  buildAuthForSupabase,
  getAuthTemplateDefaults,
  AUTH_TEMPLATE_LIST,
  type AuthEmailContent,
  type Lang,
} from '@/emails/supabase-templates';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'transactional' | 'auth' | 'log';
type TemplateName = 'welcome' | 'order_confirmation' | 'voucher' | 'processing' | 'results_ready';
type AiAction = 'translate' | 'proofread' | 'rewrite';
type AiTone = 'professional' | 'friendly' | 'concise';

type AiResult =
  | { action: 'translate'; translations: Record<string, AuthEmailContent> }
  | { action: 'proofread'; corrected: Partial<AuthEmailContent>; changes: string[] }
  | { action: 'rewrite'; rewritten: Partial<AuthEmailContent> };

type EmailLogEntry = {
  id: string;
  email_address: string;
  template: string;
  subject: string | null;
  status: 'sent' | 'failed' | 'bounced';
  error_message: string | null;
  sent_at: string;
};

// ─── Transactional sample data builders ───────────────────────────────────────

function buildTransPreview(template: TemplateName, lang: Lang): { subject: string; html: string } {
  switch (template) {
    case 'welcome':
      return buildWelcomeEmail({ lang, firstName: 'Michael' });
    case 'order_confirmation':
      return buildOrderConfirmationEmail({
        lang,
        firstName: 'Michael',
        orderNumber: 'EV-00042',
        items: [{ name: 'Longevity Complete', quantity: 1, price: 449 }],
        subtotal: 415.36,
        vat: 33.64,
        total: 449,
        currency: 'CHF',
      });
    case 'voucher':
      return buildVoucherEmail({
        lang,
        firstName: 'Michael',
        orderNumber: 'EV-00042',
        voucherCode: 'EV-AB3K-7X9P',
        packageName: 'Longevity Complete',
        labPartnerName: 'Medisyn Lab Zürich',
        labAddress: 'Bahnhofstrasse 42, 8001 Zürich',
        expiresAt: '30. Juni 2026',
      });
    case 'processing':
      return buildProcessingEmail({
        lang,
        firstName: 'Michael',
        orderNumber: 'EV-00042',
        packageName: 'Longevity Complete',
        collectedDate: '24. März 2026',
        estimatedResultsDate: '31. März 2026',
      });
    case 'results_ready':
      return buildResultsReadyEmail({
        lang,
        firstName: 'Michael',
        longevityScore: 78,
        bioAge: 34,
        chronoAge: 38,
        biomarkersCount: 36,
      });
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TRANS_TEMPLATE_OPTIONS: { value: TemplateName; label: string }[] = [
  { value: 'welcome',            label: 'Welcome' },
  { value: 'order_confirmation', label: 'Order Confirmation' },
  { value: 'voucher',            label: 'Lab Voucher' },
  { value: 'processing',        label: 'Sample Processing' },
  { value: 'results_ready',     label: 'Results Ready' },
];

const LANG_OPTIONS: { value: Lang; label: string }[] = [
  { value: 'de', label: 'DE' },
  { value: 'en', label: 'EN' },
  { value: 'es', label: 'ES' },
  { value: 'fr', label: 'FR' },
  { value: 'it', label: 'IT' },
];

const LANG_LABELS: Record<Lang, string> = {
  de: 'Deutsch', en: 'English', fr: 'Français', es: 'Español', it: 'Italiano',
};

const LOG_STATUS_COLORS: Record<string, string> = {
  sent:    'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  failed:  'bg-red-50 text-red-700 ring-red-600/20',
  bounced: 'bg-orange-50 text-orange-700 ring-orange-600/20',
};

const AI_TONE_OPTIONS: { value: AiTone; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly',     label: 'Friendly' },
  { value: 'concise',      label: 'Concise' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('de-CH', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Toast ────────────────────────────────────────────────────────────────────

type Toast = { id: number; message: string; type: 'success' | 'error' };
let toastId = 0;

function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg text-sm font-medium ${
            t.type === 'success' ? 'bg-[#0e393d] text-white' : 'bg-red-600 text-white'
          }`}
        >
          <span>{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="ml-2 opacity-60 hover:opacity-100 text-xs">✕</button>
        </div>
      ))}
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function LangPills({
  value,
  onChange,
}: {
  value: Lang;
  onChange: (l: Lang) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {LANG_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${
            value === opt.value
              ? 'bg-[#0e393d] text-white'
              : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function FieldLabel({ text }: { text: string }) {
  return <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#1c2a2b]/40 mb-1">{text}</label>;
}

const inputCls = 'w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition resize-none';

// ─── AI Modal ────────────────────────────────────────────────────────────────

function AiModal({
  result,
  currentContent,
  onApply,
  onClose,
}: {
  result: AiResult;
  currentContent: AuthEmailContent;
  onApply: (patch: Partial<AuthEmailContent>) => void;
  onClose: () => void;
}) {
  const [selectedLang, setSelectedLang] = useState<Lang>('en');

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#0e393d]/8">
          <h2 className="text-base font-semibold text-[#0e393d]">
            {result.action === 'translate' && '✦ AI Translation Results'}
            {result.action === 'proofread' && '✦ AI Proofread Results'}
            {result.action === 'rewrite' && '✦ AI Rewrite Results'}
          </h2>
          <button onClick={onClose} className="text-[#1c2a2b]/40 hover:text-[#1c2a2b] text-lg leading-none">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">

          {/* TRANSLATE */}
          {result.action === 'translate' && (
            <div>
              <div className="flex gap-1.5 mb-4">
                {Object.keys(result.translations).map((l) => (
                  <button
                    key={l}
                    onClick={() => setSelectedLang(l as Lang)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                      selectedLang === l
                        ? 'bg-[#0e393d] text-white'
                        : 'bg-[#f7f5f0] text-[#1c2a2b]/60 hover:bg-[#0e393d]/8'
                    }`}
                  >
                    {l.toUpperCase()} — {LANG_LABELS[l as Lang]}
                  </button>
                ))}
              </div>
              {result.translations[selectedLang] && (
                <div className="space-y-3">
                  {(Object.entries(result.translations[selectedLang]) as [keyof AuthEmailContent, string][]).map(([field, val]) => (
                    <div key={field}>
                      <FieldLabel text={field} />
                      <div className="rounded-lg border border-[#0e393d]/10 bg-[#f7f5f0] px-3 py-2 text-sm text-[#1c2a2b] whitespace-pre-wrap">{val}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PROOFREAD */}
          {result.action === 'proofread' && (
            <div className="space-y-4">
              {result.changes.length === 0 ? (
                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 rounded-lg px-4 py-3 text-sm">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  No changes needed — your copy looks great!
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#ceab84] mb-2">
                      {result.changes.length} suggestion{result.changes.length !== 1 ? 's' : ''}
                    </p>
                    <ul className="space-y-1.5">
                      {result.changes.map((c, i) => (
                        <li key={i} className="flex gap-2 text-sm text-[#1c2a2b]">
                          <span className="text-[#ceab84] shrink-0 font-medium">{i + 1}.</span>
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#1c2a2b]/40">Corrected content</p>
                    {(Object.entries(result.corrected) as [keyof AuthEmailContent, string][]).map(([field, val]) => (
                      <div key={field}>
                        <FieldLabel text={field} />
                        <div className="rounded-lg border border-[#0e393d]/10 bg-[#f7f5f0] px-3 py-2 text-sm text-[#1c2a2b] whitespace-pre-wrap">{val}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* REWRITE */}
          {result.action === 'rewrite' && (
            <div className="space-y-4">
              {((['subject', 'heading', 'body', 'buttonText', 'footerNote'] as (keyof AuthEmailContent)[])).map((field) => {
                const before = currentContent[field];
                const after = result.rewritten[field] ?? before;
                const changed = before !== after;
                return (
                  <div key={field}>
                    <FieldLabel text={field} />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] text-[#1c2a2b]/40 mb-1">Before</p>
                        <div className={`rounded-lg border px-3 py-2 text-sm whitespace-pre-wrap ${changed ? 'border-red-200 bg-red-50 text-[#1c2a2b]' : 'border-[#0e393d]/10 bg-[#f7f5f0] text-[#1c2a2b]/60'}`}>{before}</div>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#1c2a2b]/40 mb-1">After</p>
                        <div className={`rounded-lg border px-3 py-2 text-sm whitespace-pre-wrap ${changed ? 'border-emerald-200 bg-emerald-50 text-[#1c2a2b]' : 'border-[#0e393d]/10 bg-[#f7f5f0] text-[#1c2a2b]/60'}`}>{after}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#0e393d]/8 bg-[#fafaf8]">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#1c2a2b]/60 hover:text-[#1c2a2b] transition">Cancel</button>
          <button
            onClick={() => {
              if (result.action === 'translate' && result.translations[selectedLang]) {
                onApply(result.translations[selectedLang]);
              } else if (result.action === 'proofread' && result.corrected) {
                onApply(result.corrected);
              } else if (result.action === 'rewrite' && result.rewritten) {
                onApply(result.rewritten);
              }
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-[#ceab84] text-white text-sm font-medium hover:bg-[#ceab84]/85 transition"
          >
            {result.action === 'translate' ? `Apply ${selectedLang.toUpperCase()}` : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CommunicationsManager() {
  const supabase = createClient();

  const [tab, setTab] = useState<Tab>('transactional');

  // ── Transactional tab state ──────────────────────────────────────────────────
  const [transTemplate, setTransTemplate] = useState<TemplateName>('welcome');
  const [transLang, setTransLang] = useState<Lang>('de');
  const [transPreview, setTransPreview] = useState<{ subject: string; html: string } | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [sending, setSending] = useState(false);

  // ── Auth tab state ───────────────────────────────────────────────────────────
  const [authTemplateId, setAuthTemplateId] = useState('confirm_signup');
  const [authLang, setAuthLang] = useState<Lang>('en');
  const [authOverrides, setAuthOverrides] = useState<AuthEmailContent>({
    subject: '', heading: '', body: '', buttonText: '', footerNote: '',
  });
  const [authPreviewData, setAuthPreviewData] = useState<{ subject: string; html: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // AI Tools state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState<AiAction | null>(null);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [aiTone, setAiTone] = useState<AiTone>('professional');

  // ── Log tab state ────────────────────────────────────────────────────────────
  const [logEntries, setLogEntries] = useState<EmailLogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const [logStatusFilter, setLogStatusFilter] = useState<'all' | 'sent' | 'failed' | 'bounced'>('all');

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);
  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Transactional preview ────────────────────────────────────────────────────

  useEffect(() => {
    try { setTransPreview(buildTransPreview(transTemplate, transLang)); }
    catch (e) { console.error('Preview error', e); }
  }, [transTemplate, transLang]);

  // ── Auth preview helpers ─────────────────────────────────────────────────────

  const rebuildAuthPreview = useCallback((id: string, lang: Lang, overrides: AuthEmailContent) => {
    setAuthPreviewData(buildAuthPreview(id, lang, overrides));
  }, []);

  // Init auth preview on mount
  const initDoneRef = useRef(false);
  useEffect(() => {
    if (initDoneRef.current) return;
    initDoneRef.current = true;
    const defaults = getAuthTemplateDefaults('confirm_signup', 'en');
    setAuthOverrides(defaults);
    setAuthPreviewData(buildAuthPreview('confirm_signup', 'en', defaults));
  }, []);

  function handleAuthTemplateChange(id: string) {
    setAuthTemplateId(id);
    const defaults = getAuthTemplateDefaults(id, authLang);
    setAuthOverrides(defaults);
    rebuildAuthPreview(id, authLang, defaults);
  }

  function handleAuthLangChange(lang: Lang) {
    setAuthLang(lang);
    const defaults = getAuthTemplateDefaults(authTemplateId, lang);
    setAuthOverrides(defaults);
    rebuildAuthPreview(authTemplateId, lang, defaults);
  }

  function updateAuthField(field: keyof AuthEmailContent, value: string) {
    const newOverrides = { ...authOverrides, [field]: value };
    setAuthOverrides(newOverrides);
    rebuildAuthPreview(authTemplateId, authLang, newOverrides);
  }

  // ── AI Tools ─────────────────────────────────────────────────────────────────

  async function handleAiAction(action: AiAction) {
    setAiLoading(action);
    try {
      const res = await fetch('/api/admin/ai-email-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, content: authOverrides, sourceLang: authLang, tone: aiTone }),
      });
      const data = await res.json();
      if (!res.ok) { addToast(data.error ?? 'AI request failed', 'error'); return; }

      if (action === 'translate') {
        setAiResult({ action: 'translate', translations: data });
      } else if (action === 'proofread') {
        setAiResult({ action: 'proofread', corrected: data.corrected ?? {}, changes: data.changes ?? [] });
      } else if (action === 'rewrite') {
        setAiResult({ action: 'rewrite', rewritten: data.rewritten ?? {} });
      }
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'AI request failed', 'error');
    } finally {
      setAiLoading(null);
    }
  }

  function applyAiResult(patch: Partial<AuthEmailContent>) {
    const newOverrides = { ...authOverrides, ...patch };
    setAuthOverrides(newOverrides);
    rebuildAuthPreview(authTemplateId, authLang, newOverrides);
    addToast('AI suggestions applied', 'success');
  }

  // ── Log ──────────────────────────────────────────────────────────────────────

  const loadLog = useCallback(async () => {
    setLogLoading(true);
    const { data } = await supabase
      .from('email_log')
      .select('id, email_address, template, subject, status, error_message, sent_at')
      .order('sent_at', { ascending: false })
      .limit(500);
    setLogEntries((data as EmailLogEntry[]) ?? []);
    setLogLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (tab === 'log') loadLog();
  }, [tab, loadLog]);

  const filteredLog = logEntries.filter((e) => {
    if (logStatusFilter !== 'all' && e.status !== logStatusFilter) return false;
    if (logSearch) {
      const q = logSearch.toLowerCase();
      return e.email_address.toLowerCase().includes(q) || e.template.toLowerCase().includes(q);
    }
    return true;
  });

  // ── Send test ────────────────────────────────────────────────────────────────

  const handleSendTest = async () => {
    if (!testEmail) { addToast('Enter a recipient email', 'error'); return; }
    setSending(true);
    const res = await fetch('/api/admin/send-test-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template: transTemplate, lang: transLang, recipientEmail: testEmail }),
    });
    const data = await res.json();
    setSending(false);
    if (data.success) {
      addToast(`Test email sent to ${testEmail}`, 'success');
    } else {
      addToast(data.error ?? 'Send failed', 'error');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">
      <ToastContainer toasts={toasts} dismiss={dismissToast} />
      {aiResult && (
        <AiModal
          result={aiResult}
          currentContent={authOverrides}
          onApply={applyAiResult}
          onClose={() => setAiResult(null)}
        />
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-[#0e393d]">Communications</h1>
        <p className="mt-0.5 text-sm text-[#1c2a2b]/50">Email templates, preview, and delivery log</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#0e393d]/10 mb-6">
        {([
          ['transactional', 'Transactional Emails'],
          ['auth', 'Auth Emails'],
          ['log', 'Email Log'],
        ] as const).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-1 py-3 mr-8 text-sm font-medium border-b-2 transition ${
              tab === t
                ? 'border-[#0e393d] text-[#0e393d]'
                : 'border-transparent text-[#1c2a2b]/40 hover:text-[#1c2a2b]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── TRANSACTIONAL TAB ── */}
      {tab === 'transactional' && (
        <div className="flex gap-6 h-[calc(100vh-220px)] min-h-[500px]">

          {/* Left controls */}
          <div className="w-72 shrink-0 flex flex-col gap-5">

            <div>
              <label className="block text-xs font-medium text-[#1c2a2b]/60 mb-2">Template</label>
              <div className="space-y-1">
                {TRANS_TEMPLATE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTransTemplate(opt.value)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                      transTemplate === opt.value
                        ? 'bg-[#0e393d] text-white font-medium'
                        : 'text-[#1c2a2b]/70 hover:bg-[#0e393d]/6'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#1c2a2b]/60 mb-2">Language</label>
              <LangPills value={transLang} onChange={setTransLang} />
            </div>

            {transPreview && (
              <div className="rounded-lg border border-[#0e393d]/10 bg-[#fafaf8] px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84] mb-1">Subject</p>
                <p className="text-xs text-[#1c2a2b]">{transPreview.subject}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#1c2a2b]/60 mb-2">Send Test Email</label>
              <input
                type="email"
                placeholder="admin@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition mb-2"
              />
              <button
                disabled={sending || !testEmail}
                onClick={handleSendTest}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#0e393d] text-white text-sm font-medium hover:bg-[#0e393d]/85 transition disabled:opacity-50"
              >
                {sending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border border-white/30 border-t-white" />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                )}
                {sending ? 'Sending…' : 'Send Test'}
              </button>
            </div>
          </div>

          {/* Right: preview */}
          <div className="flex-1 rounded-xl border border-[#0e393d]/10 overflow-hidden bg-white">
            {transPreview ? (
              <iframe
                key={`${transTemplate}-${transLang}`}
                srcDoc={transPreview.html}
                className="w-full h-full"
                title="Email preview"
                sandbox="allow-same-origin"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-[#1c2a2b]/30 text-sm">
                Select a template to preview
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── AUTH EMAILS TAB ── */}
      {tab === 'auth' && (
        <div className="flex gap-6">

          {/* Left panel — controls + editable fields */}
          <div className="w-80 shrink-0 flex flex-col gap-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">

            {/* Template selector */}
            <div>
              <label className="block text-xs font-medium text-[#1c2a2b]/60 mb-2">Template</label>
              <div className="space-y-1">
                {AUTH_TEMPLATE_LIST.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => handleAuthTemplateChange(tpl.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                      authTemplateId === tpl.id
                        ? 'bg-[#0e393d] text-white font-medium'
                        : 'text-[#1c2a2b]/70 hover:bg-[#0e393d]/6'
                    }`}
                  >
                    {tpl.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Language selector */}
            <div>
              <label className="block text-xs font-medium text-[#1c2a2b]/60 mb-2">Language</label>
              <LangPills value={authLang} onChange={handleAuthLangChange} />
            </div>

            {/* Copy buttons */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const { html } = buildAuthForSupabase(authTemplateId, authLang, authOverrides);
                    navigator.clipboard.writeText(html);
                    setCopiedField('supabase');
                    setTimeout(() => setCopiedField(null), 2000);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                    copiedField === 'supabase'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#0e393d] text-white hover:bg-[#0e393d]/85'
                  }`}
                >
                  {copiedField === 'supabase' ? '✓ Copied!' : 'Copy for Supabase'}
                </button>
                <button
                  onClick={() => {
                    if (authPreviewData) {
                      navigator.clipboard.writeText(authPreviewData.subject);
                      setCopiedField('subject');
                      setTimeout(() => setCopiedField(null), 2000);
                    }
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium ring-1 ring-inset transition ${
                    copiedField === 'subject'
                      ? 'bg-emerald-600 text-white ring-transparent'
                      : 'bg-white text-[#1c2a2b]/70 ring-[#0e393d]/15 hover:ring-[#0e393d]/30'
                  }`}
                >
                  {copiedField === 'subject' ? '✓ Copied!' : 'Copy Subject'}
                </button>
              </div>
              <button
                onClick={() => {
                  if (authPreviewData) {
                    navigator.clipboard.writeText(authPreviewData.html);
                    setCopiedField('html');
                    setTimeout(() => setCopiedField(null), 2000);
                  }
                }}
                className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ring-1 ring-inset transition ${
                  copiedField === 'html'
                    ? 'bg-emerald-600 text-white ring-transparent'
                    : 'bg-white text-[#1c2a2b]/50 ring-[#0e393d]/10 hover:ring-[#0e393d]/25'
                }`}
              >
                {copiedField === 'html' ? '✓ Copied!' : 'Copy Preview HTML'}
              </button>
              <p className="text-[10px] text-[#1c2a2b]/40 leading-relaxed">
                <span className="font-semibold text-[#0e393d]/60">Copy for Supabase</span> replaces preview URLs with{' '}
                {authTemplateId === 'reauthentication' ? '{{ .Token }}' : '{{ .ConfirmationURL }}'}.
                Paste into Supabase Dashboard → Authentication → Emails.
              </p>
            </div>

            {/* Template ID info */}
            <div className="rounded-lg border border-[#0e393d]/10 bg-[#fafaf8] px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84] mb-0.5">Template ID (Supabase)</p>
              <p className="text-xs font-mono text-[#0e393d]">{authTemplateId}</p>
            </div>

            {/* ── Editable Fields ── */}
            <div className="border-t border-[#0e393d]/8 pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#1c2a2b]/40 mb-3">Edit Content</p>
              <div className="space-y-3">
                <div>
                  <FieldLabel text="Subject line" />
                  <input
                    type="text"
                    value={authOverrides.subject}
                    onChange={(e) => updateAuthField('subject', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <FieldLabel text="Heading" />
                  <input
                    type="text"
                    value={authOverrides.heading}
                    onChange={(e) => updateAuthField('heading', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <FieldLabel text="Body text" />
                  <textarea
                    rows={4}
                    value={authOverrides.body}
                    onChange={(e) => updateAuthField('body', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <FieldLabel text="Button text" />
                  <input
                    type="text"
                    value={authOverrides.buttonText}
                    onChange={(e) => updateAuthField('buttonText', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <FieldLabel text="Footer note" />
                  <textarea
                    rows={2}
                    value={authOverrides.footerNote}
                    onChange={(e) => updateAuthField('footerNote', e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right panel — preview + AI Tools */}
          <div className="flex-1 flex flex-col gap-4 min-h-[calc(100vh-200px)]">

            {/* Preview iframe */}
            <div className="flex-1 rounded-xl border border-[#0e393d]/10 overflow-hidden bg-white min-h-[400px]">
              {authPreviewData ? (
                <iframe
                  key={`${authTemplateId}-${authLang}-${authOverrides.heading}`}
                  srcDoc={authPreviewData.html}
                  className="w-full h-full"
                  title="Auth email preview"
                  sandbox="allow-same-origin"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-[#1c2a2b]/30 text-sm">
                  Loading preview…
                </div>
              )}
            </div>

            {/* AI Tools section */}
            <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden">
              <button
                onClick={() => setAiOpen((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-[#1c2a2b] hover:bg-[#fafaf8] transition"
              >
                <span className="flex items-center gap-2">
                  <span className="text-[#ceab84] text-base">✦</span>
                  AI Tools
                </span>
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  className={`text-[#1c2a2b]/40 transition-transform ${aiOpen ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {aiOpen && (
                <div className="px-5 pb-4 border-t border-[#0e393d]/8">
                  <p className="text-xs text-[#1c2a2b]/50 mt-3 mb-3">
                    AI actions apply to the current template in <strong className="text-[#1c2a2b]/70">{LANG_LABELS[authLang]}</strong>. Results open in a review modal before applying.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={!!aiLoading}
                      onClick={() => handleAiAction('translate')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#0e393d]/6 text-[#0e393d] hover:bg-[#0e393d]/12 disabled:opacity-50 transition"
                    >
                      {aiLoading === 'translate' ? <div className="h-3 w-3 animate-spin rounded-full border border-[#0e393d]/30 border-t-[#0e393d]" /> : <span>✦</span>}
                      Translate to all 5 languages
                    </button>

                    <button
                      disabled={!!aiLoading}
                      onClick={() => handleAiAction('proofread')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#0e393d]/6 text-[#0e393d] hover:bg-[#0e393d]/12 disabled:opacity-50 transition"
                    >
                      {aiLoading === 'proofread' ? <div className="h-3 w-3 animate-spin rounded-full border border-[#0e393d]/30 border-t-[#0e393d]" /> : <span>✦</span>}
                      Proofread & correct
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        disabled={!!aiLoading}
                        onClick={() => handleAiAction('rewrite')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#0e393d]/6 text-[#0e393d] hover:bg-[#0e393d]/12 disabled:opacity-50 transition"
                      >
                        {aiLoading === 'rewrite' ? <div className="h-3 w-3 animate-spin rounded-full border border-[#0e393d]/30 border-t-[#0e393d]" /> : <span>✦</span>}
                        Rewrite
                      </button>
                      <select
                        value={aiTone}
                        onChange={(e) => setAiTone(e.target.value as AiTone)}
                        className="rounded-lg border border-[#0e393d]/15 bg-white px-2 py-2 text-xs text-[#1c2a2b] focus:outline-none cursor-pointer appearance-none"
                      >
                        {AI_TONE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── LOG TAB ── */}
      {tab === 'log' && (
        <div>
          <div className="flex flex-wrap gap-3 mb-4">
            <input
              type="text"
              placeholder="Search email or template…"
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              className="rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition w-64"
            />
            <div className="flex gap-1.5">
              {(['all', 'sent', 'failed', 'bounced'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setLogStatusFilter(s)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition capitalize ${
                    logStatusFilter === s
                      ? 'bg-[#0e393d] text-white'
                      : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30'
                  }`}
                >
                  {s === 'all' ? `All (${logEntries.length})` : s}
                </button>
              ))}
            </div>
            <button
              onClick={loadLog}
              className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium text-[#0e393d] bg-[#0e393d]/8 hover:bg-[#0e393d]/15 transition flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Refresh
            </button>
          </div>

          <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/3">
                  {['Recipient', 'Template', 'Subject', 'Status', 'Sent at'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0e393d]/6">
                {logLoading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center">
                      <div className="inline-block h-5 w-5 animate-spin rounded-full border border-[#0e393d]/30 border-t-[#0e393d]" />
                    </td>
                  </tr>
                )}
                {!logLoading && filteredLog.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-[#1c2a2b]/40">
                      {logEntries.length === 0 ? 'No emails sent yet.' : 'No results match the current filters.'}
                    </td>
                  </tr>
                )}
                {!logLoading && filteredLog.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#fafaf8] transition-colors">
                    <td className="px-4 py-3 text-xs text-[#1c2a2b] font-mono">{entry.email_address}</td>
                    <td className="px-4 py-3 text-xs text-[#1c2a2b]/70 capitalize">{entry.template.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-xs text-[#1c2a2b]/70 max-w-[200px] truncate" title={entry.subject ?? ''}>
                      {entry.subject ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${LOG_STATUS_COLORS[entry.status] ?? ''}`}>
                        {entry.status}
                      </span>
                      {entry.error_message && (
                        <p className="text-[10px] text-red-500 mt-0.5 max-w-[180px] truncate" title={entry.error_message}>
                          {entry.error_message}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#1c2a2b]/50 whitespace-nowrap">{fmtDate(entry.sent_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLog.length !== logEntries.length && (
            <p className="mt-2 text-xs text-[#1c2a2b]/40">
              Showing {filteredLog.length} of {logEntries.length} emails
            </p>
          )}
        </div>
      )}
    </div>
  );
}
