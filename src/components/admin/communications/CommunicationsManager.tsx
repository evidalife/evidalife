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

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'en' | 'de' | 'fr' | 'es' | 'it';
type Tab = 'preview' | 'log';
type TemplateName = 'welcome' | 'order_confirmation' | 'voucher' | 'processing' | 'results_ready';

type EmailLogEntry = {
  id: string;
  email_address: string;
  template: string;
  subject: string | null;
  status: 'sent' | 'failed' | 'bounced';
  error_message: string | null;
  sent_at: string;
};

// ─── Sample data builders ─────────────────────────────────────────────────────

function buildPreview(template: TemplateName, lang: Lang): { subject: string; html: string } {
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

const TEMPLATE_OPTIONS: { value: TemplateName; label: string }[] = [
  { value: 'welcome',           label: 'Welcome' },
  { value: 'order_confirmation', label: 'Order Confirmation' },
  { value: 'voucher',           label: 'Voucher' },
  { value: 'processing',        label: 'Sample Processing' },
  { value: 'results_ready',     label: 'Results Ready' },
];

const LANG_OPTIONS: { value: Lang; label: string }[] = [
  { value: 'de', label: 'DE' },
  { value: 'en', label: 'EN' },
  { value: 'fr', label: 'FR' },
  { value: 'es', label: 'ES' },
  { value: 'it', label: 'IT' },
];

const LOG_STATUS_COLORS = {
  sent:    'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  failed:  'bg-red-50 text-red-700 ring-red-600/20',
  bounced: 'bg-orange-50 text-orange-700 ring-orange-600/20',
};

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

// ─── Main component ───────────────────────────────────────────────────────────

export default function CommunicationsManager() {
  const supabase = createClient();

  const [tab, setTab] = useState<Tab>('preview');

  // Preview tab state
  const [template, setTemplate] = useState<TemplateName>('welcome');
  const [lang, setLang] = useState<Lang>('de');
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [sending, setSending] = useState(false);

  // Log tab state
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

  // ── Build preview whenever template/lang changes ───────────────────────────

  useEffect(() => {
    try {
      setPreview(buildPreview(template, lang));
    } catch (e) {
      console.error('Preview error', e);
    }
  }, [template, lang]);

  // ── Load email log ─────────────────────────────────────────────────────────

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

  // ── Send test email ────────────────────────────────────────────────────────

  const handleSendTest = async () => {
    if (!testEmail) { addToast('Enter a recipient email', 'error'); return; }
    setSending(true);
    const res = await fetch('/api/admin/send-test-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template, lang, recipientEmail: testEmail }),
    });
    const data = await res.json();
    setSending(false);
    if (data.success) {
      addToast(`Test email sent to ${testEmail}`, 'success');
    } else {
      addToast(data.error ?? 'Send failed', 'error');
    }
  };

  // ── Filtered log ──────────────────────────────────────────────────────────

  const filteredLog = logEntries.filter((e) => {
    if (logStatusFilter !== 'all' && e.status !== logStatusFilter) return false;
    if (logSearch) {
      const q = logSearch.toLowerCase();
      return e.email_address.toLowerCase().includes(q) || e.template.toLowerCase().includes(q);
    }
    return true;
  });

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">
      <ToastContainer toasts={toasts} dismiss={dismissToast} />

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-[#0e393d]">Communications</h1>
        <p className="mt-0.5 text-sm text-[#1c2a2b]/50">Email templates, preview, and delivery log</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#0e393d]/10 mb-6">
        {([['preview', 'Email Preview'], ['log', 'Email Log']] as const).map(([t, label]) => (
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

      {/* ── PREVIEW TAB ── */}
      {tab === 'preview' && (
        <div className="flex gap-6 h-[calc(100vh-220px)] min-h-[500px]">

          {/* Left controls */}
          <div className="w-72 shrink-0 flex flex-col gap-5">

            {/* Template selector */}
            <div>
              <label className="block text-xs font-medium text-[#1c2a2b]/60 mb-2">Template</label>
              <div className="space-y-1">
                {TEMPLATE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTemplate(opt.value)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                      template === opt.value
                        ? 'bg-[#0e393d] text-white font-medium'
                        : 'text-[#1c2a2b]/70 hover:bg-[#0e393d]/6'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Language selector */}
            <div>
              <label className="block text-xs font-medium text-[#1c2a2b]/60 mb-2">Language</label>
              <div className="flex gap-1.5">
                {LANG_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setLang(opt.value)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${
                      lang === opt.value
                        ? 'bg-[#0e393d] text-white'
                        : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject preview */}
            {preview && (
              <div className="rounded-lg border border-[#0e393d]/10 bg-[#fafaf8] px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84] mb-1">Subject</p>
                <p className="text-xs text-[#1c2a2b]">{preview.subject}</p>
              </div>
            )}

            {/* Send test */}
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

          {/* Right: iframe preview */}
          <div className="flex-1 rounded-xl border border-[#0e393d]/10 overflow-hidden bg-white">
            {preview ? (
              <iframe
                key={`${template}-${lang}`}
                srcDoc={preview.html}
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

      {/* ── LOG TAB ── */}
      {tab === 'log' && (
        <div>

          {/* Filters */}
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

          {/* Table */}
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
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${LOG_STATUS_COLORS[entry.status]}`}>
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
