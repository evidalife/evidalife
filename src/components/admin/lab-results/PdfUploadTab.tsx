'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Badge, FlagBadge, SectionHeading, Spinner, Toast, ToastContainer,
  fmtDate, locName, nextToastId,
} from './shared';
import { computeStatusFlag } from '@/lib/lab-results/flagging';

// ─── Types ────────────────────────────────────────────────────────────────────

type Confidence = 'exact' | 'alias' | 'fuzzy' | 'unmatched';

type ExtractedRow = {
  extracted_name: string;
  value: number;
  unit: string;
  original_value: number | null;
  original_unit: string | null;
  was_converted: boolean;
  ref_low: number | null;
  ref_high: number | null;
  flagged: boolean;
  test_date: string | null;
  matched_id: string | null;
  matched_name: string | null;
  confidence: Confidence;
  include: boolean;
  db_biomarker: any | null;
};

type UploadRecord = {
  id: string;
  user_id: string | null;
  file_name: string;
  file_url: string;
  extraction_status: string;
  results_created: number;
  created_at: string;
  extracted_data: ExtractedRow[] | null;
  profiles: { first_name: string | null; last_name: string | null } | null;
};

type AllBiomarker = { id: string; name: any; unit: string | null; he_domain: string | null };

// ─── Confidence badge ─────────────────────────────────────────────────────────

function ConfidenceBadge({ c }: { c: Confidence }) {
  const dot = c === 'exact' ? '🟢' : c === 'alias' ? '🟡' : c === 'fuzzy' ? '🟠' : '🔴';
  const label = c === 'exact' ? 'exact' : c === 'alias' ? 'alias' : c === 'fuzzy' ? 'fuzzy' : 'no match';
  const cls = c === 'exact'
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
    : c === 'alias'
    ? 'bg-[#CEAB84]/15 text-[#8a6a30] ring-[#CEAB84]/30'
    : c === 'fuzzy'
    ? 'bg-amber-50 text-amber-700 ring-amber-600/20'
    : 'bg-red-50 text-red-700 ring-red-600/20';
  return <Badge className={cls}>{dot} {label}</Badge>;
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

type UserOption = { id: string; email: string | null; first_name: string | null; last_name: string | null };

export default function PdfUploadTab() {
  const supabase = createClient();

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [extracting, setExtracting] = useState(false);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedRow[]>([]);
  const [allBiomarkers, setAllBiomarkers] = useState<AllBiomarker[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [loadingUploads, setLoadingUploads] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dragging, setDragging] = useState(false);
  // For re-analyze: track the user_id already stored on the upload record
  const [reanalyzingUserId, setReanalyzingUserId] = useState<string | null>(null);

  // User assignment
  const [userSearch, setUserSearch] = useState('');
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const userSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const addToast = useCallback((msg: string, type: Toast['type'] = 'success') => {
    const id = nextToastId();
    setToasts((p) => [...p, { id, message: msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 5000);
  }, []);

  // Load upload history
  const loadUploads = useCallback(async () => {
    setLoadingUploads(true);
    const { data } = await supabase
      .from('lab_pdf_uploads')
      .select('id, user_id, file_name, file_url, extraction_status, results_created, created_at, extracted_data, profiles:uploaded_by(first_name, last_name)')
      .order('created_at', { ascending: false })
      .limit(20);
    setUploads((data as unknown as UploadRecord[]) ?? []);
    setLoadingUploads(false);
  }, [supabase]);

  // Load all biomarker definitions for the mapping dropdown
  useEffect(() => {
    loadUploads();
    supabase.from('biomarkers').select('id, name, unit, he_domain').eq('is_active', true)
      .then(({ data }) => setAllBiomarkers((data as AllBiomarker[]) ?? []));
  }, []);

  // ── User search ──────────────────────────────────────────────────────────────

  const searchUsers = (q: string) => {
    setUserSearch(q);
    if (userSearchTimer.current) clearTimeout(userSearchTimer.current);
    if (!q.trim()) { setUserOptions([]); return; }
    userSearchTimer.current = setTimeout(async () => {
      setSearchingUsers(true);
      const { data } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .or(`email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
        .limit(8);
      setUserOptions((data as UserOption[]) ?? []);
      setSearchingUsers(false);
    }, 300);
  };

  // ── Upload flow ─────────────────────────────────────────────────────────────

  const handleFile = (f: File) => {
    if (f.size > 10 * 1024 * 1024) { addToast('File too large (max 10MB)', 'error'); return; }
    setFile(f);
    setExtracted([]);
    setUploadId(null);
    setReanalyzingUserId(null);
  };

  const handleUploadAndExtract = async () => {
    if (!file) return;
    if (!selectedUser) { addToast('Please assign this PDF to a user first', 'error'); return; }
    setUploading(true);
    setUploadProgress(20);

    // Get current admin user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { addToast('Not authenticated', 'error'); setUploading(false); return; }

    // Upload to storage — store path (not signed URL) so re-analyze always works
    const storagePath = `${user.id}/${Date.now()}-${file.name}`;
    const { error: storageError } = await supabase.storage
      .from('lab-pdfs')
      .upload(storagePath, file, { upsert: false });
    if (storageError) { addToast('Upload failed: ' + storageError.message, 'error'); setUploading(false); return; }

    setUploadProgress(50);

    // Create upload record — store the storage path in file_url
    const { data: uploadRecord } = await supabase.from('lab_pdf_uploads').insert({
      uploaded_by: user.id,
      user_id: selectedUser.id,
      file_name: file.name,
      file_url: storagePath,
      extraction_status: 'pending',
    }).select('id').single();

    if (!uploadRecord) { addToast('Failed to create upload record', 'error'); setUploading(false); return; }

    setUploadProgress(70);
    setUploading(false);
    setExtracting(true);
    setUploadId(uploadRecord.id);

    // Call AI extraction — pass storage path
    const res = await fetch('/api/admin/parse-lab-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storagePath, uploadId: uploadRecord.id }),
    });
    const data = await res.json();
    setExtracting(false);

    if (!data.success) {
      addToast(data.error ?? 'Extraction failed', 'error');
      return;
    }

    setExtracted(data.extracted ?? []);
    loadUploads();
  };

  // ── Re-analyze existing upload ───────────────────────────────────────────────

  const handleReanalyze = async (upload: UploadRecord) => {
    if (!upload.file_url) { addToast('No storage path for this upload', 'error'); return; }
    setExtracting(true);
    setUploadId(upload.id);
    setReanalyzingUserId(upload.user_id);
    setExtracted([]);

    const res = await fetch('/api/admin/parse-lab-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storagePath: upload.file_url, uploadId: upload.id }),
    });
    const data = await res.json();
    setExtracting(false);

    if (!data.success) {
      addToast(data.error ?? 'Re-analysis failed', 'error');
      setUploadId(null);
      setReanalyzingUserId(null);
      return;
    }

    setExtracted(data.extracted ?? []);
    loadUploads();
  };

  // ── Toggle row include ──────────────────────────────────────────────────────

  const toggleRow = (idx: number) =>
    setExtracted((rows) => rows.map((r, i) => i === idx ? { ...r, include: !r.include } : r));

  const updateRow = (idx: number, key: keyof ExtractedRow, val: any) =>
    setExtracted((rows) => rows.map((r, i) => i === idx ? { ...r, [key]: val } : r));

  const toggleAll = (val: boolean) => setExtracted((rows) => rows.map((r) => ({ ...r, include: val })));

  // ── Save extracted results ──────────────────────────────────────────────────

  const handleSaveExtracted = async () => {
    const toSave = extracted.filter((r) => r.include && r.matched_id);
    if (!toSave.length) { addToast('No matched results selected', 'error'); return; }
    setSaving(true);

    const userId = selectedUser?.id ?? reanalyzingUserId ?? null;

    const results = toSave.map((r) => {
      const def = r.db_biomarker;
      return {
        biomarkerDefinitionId: r.matched_id,
        userId,
        value: String(r.value),
        unit: r.unit,
        testDate: r.test_date,
        biomarkerName: r.matched_name || r.extracted_name,
        refRangeLow: def?.ref_range_low ?? r.ref_low,
        refRangeHigh: def?.ref_range_high ?? r.ref_high,
        optimalRangeLow: def?.optimal_range_low ?? null,
        optimalRangeHigh: def?.optimal_range_high ?? null,
        rangeType: def?.range_type ?? null,
        originalValue: r.original_value != null ? String(r.original_value) : null,
        originalUnit: r.original_unit ?? null,
      };
    });

    const res = await fetch('/api/admin/lab-results/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results }),
    });
    const data = await res.json();
    setSaving(false);

    if (!data.success) { addToast(data.error ?? 'Save failed', 'error'); return; }

    // Update upload record result count
    if (uploadId) {
      await supabase.from('lab_pdf_uploads').update({ results_created: data.created }).eq('id', uploadId);
    }

    addToast(`${data.created} results saved from PDF`, 'success');
    setExtracted([]);
    setFile(null);
    setUploadId(null);
    setReanalyzingUserId(null);
    loadUploads();
  };

  const handleBackFromReview = () => {
    setExtracted([]);
    setFile(null);
    setUploadId(null);
    setReanalyzingUserId(null);
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} dismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />

      {extracting && (
        <div className="space-y-2">
          <div className="h-2 rounded-full bg-[#0e393d]/8 overflow-hidden">
            <div className="h-full rounded-full bg-[#0e393d] animate-pulse" style={{ width: '80%' }} />
          </div>
          <p className="text-xs text-[#1c2a2b]/50 text-center">
            Extracting results with AI… (this may take 20–30 seconds)
          </p>
        </div>
      )}

      {extracted.length === 0 && !extracting ? (
        <>
          {/* ── Assign to user ────────────────────────────────────────────── */}
          <div>
            <SectionHeading>Assign to User <span className="text-red-400">*</span></SectionHeading>
            {selectedUser ? (
              <div className="flex items-center justify-between rounded-lg border border-[#0C9C6C]/30 bg-[#0C9C6C]/5 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-[#1c2a2b]">
                    {[selectedUser.first_name, selectedUser.last_name].filter(Boolean).join(' ') || selectedUser.email}
                  </p>
                  <p className="text-xs text-[#1c2a2b]/50">{selectedUser.email}</p>
                </div>
                <button onClick={() => { setSelectedUser(null); setUserSearch(''); }} className="text-xs text-[#1c2a2b]/40 hover:text-[#1c2a2b]">Change</button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by email or name…"
                  value={userSearch}
                  onChange={(e) => searchUsers(e.target.value)}
                  className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10"
                />
                {searchingUsers && <div className="absolute right-3 top-2.5"><Spinner /></div>}
                {userOptions.length > 0 && (
                  <div className="absolute top-full mt-1 w-full rounded-lg border border-[#0e393d]/15 bg-white shadow-lg z-10 overflow-hidden">
                    {userOptions.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => { setSelectedUser(u); setUserOptions([]); setUserSearch(''); }}
                        className="w-full flex items-start px-4 py-2.5 text-left hover:bg-[#0e393d]/5 transition"
                      >
                        <div>
                          <p className="text-sm text-[#1c2a2b]">{u.email}</p>
                          {(u.first_name || u.last_name) && (
                            <p className="text-xs text-[#1c2a2b]/40">{[u.first_name, u.last_name].filter(Boolean).join(' ')}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Drop zone ─────────────────────────────────────────────────── */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition ${
              dragging ? 'border-[#0e393d] bg-[#0e393d]/5' : 'border-[#0e393d]/20 hover:border-[#0e393d]/40 hover:bg-[#0e393d]/3'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <div className="text-4xl mb-3">📄</div>
            {file ? (
              <>
                <p className="font-medium text-[#0e393d]">{file.name}</p>
                <p className="text-xs text-[#1c2a2b]/40 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB · Click to change</p>
              </>
            ) : (
              <>
                <p className="font-medium text-[#0e393d]">Drop a lab PDF or image here</p>
                <p className="text-xs text-[#1c2a2b]/40 mt-1">PDF, JPG, PNG · Max 10MB</p>
              </>
            )}
          </div>

          {file && (
            <>
              {uploading && (
                <div className="space-y-2">
                  <div className="h-2 rounded-full bg-[#0e393d]/8 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#0e393d] transition-all duration-500"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-[#1c2a2b]/50 text-center">Uploading…</p>
                </div>
              )}
              {!uploading && (
                <button
                  onClick={handleUploadAndExtract}
                  className="w-full rounded-xl bg-[#0e393d] text-white py-3 font-medium text-sm hover:bg-[#0e393d]/85 transition"
                >
                  Upload & Extract with AI
                </button>
              )}
            </>
          )}

          {/* ── Upload history ──────────────────────────────────────────────── */}
          <div>
            <SectionHeading>Recent Uploads</SectionHeading>
            <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-x-auto">
              <table className="w-full text-sm min-w-[680px]">
                <thead>
                  <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/3">
                    {['File', 'Uploaded by', 'Date', 'Status', 'Results', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0e393d]/6">
                  {loadingUploads ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center"><div className="inline-flex justify-center"><Spinner /></div></td></tr>
                  ) : uploads.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-[#1c2a2b]/40">No uploads yet.</td></tr>
                  ) : uploads.map((u) => (
                    <tr key={u.id} className="hover:bg-[#fafaf8] transition-colors">
                      <td className="px-4 py-3 text-xs font-mono text-[#1c2a2b]">{u.file_name}</td>
                      <td className="px-4 py-3 text-xs text-[#1c2a2b]/60">
                        {[u.profiles?.first_name, u.profiles?.last_name].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#1c2a2b]/50 whitespace-nowrap">{fmtDate(u.created_at)}</td>
                      <td className="px-4 py-3">
                        <Badge className={
                          u.extraction_status === 'completed' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                          : u.extraction_status === 'failed' ? 'bg-red-50 text-red-700 ring-red-600/20'
                          : u.extraction_status === 'processing' ? 'bg-amber-50 text-amber-700 ring-amber-600/20'
                          : 'bg-gray-50 text-gray-600 ring-gray-500/20'
                        }>{u.extraction_status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#0e393d] font-medium">{u.results_created ?? 0}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleReanalyze(u)}
                          className="text-xs text-[#ceab84] hover:text-[#b8965e] font-medium transition"
                        >
                          Re-analyze
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : extracted.length > 0 ? (
        /* ── Review screen ──────────────────────────────────────────────────── */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <SectionHeading>Review Extracted Results</SectionHeading>
              {reanalyzingUserId && (
                <p className="text-xs text-[#1c2a2b]/50 mt-0.5">Re-analysis — results will be saved to the original user</p>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <button onClick={() => toggleAll(true)} className="text-xs text-[#0e393d] hover:underline">Select all</button>
              <span className="text-[#1c2a2b]/30">·</span>
              <button onClick={() => toggleAll(false)} className="text-xs text-[#0e393d] hover:underline">Deselect all</button>
              <button onClick={handleBackFromReview} className="text-xs text-[#1c2a2b]/50 hover:text-[#1c2a2b]">← Back</button>
            </div>
          </div>

          {/* Stats summary */}
          <div className="flex gap-4 text-xs text-[#1c2a2b]/60">
            <span>{extracted.length} extracted</span>
            <span className="text-emerald-600">{extracted.filter(r => r.confidence === 'exact').length} exact</span>
            <span className="text-[#8a6a30]">{extracted.filter(r => r.confidence === 'alias').length} alias</span>
            <span className="text-amber-600">{extracted.filter(r => r.confidence === 'fuzzy').length} fuzzy</span>
            <span className="text-red-500">{extracted.filter(r => r.confidence === 'unmatched').length} unmatched</span>
            <span className="text-[#0e393d]">{extracted.filter(r => r.was_converted).length} converted</span>
          </div>

          <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-x-auto">
            <table className="w-full text-xs min-w-[960px]">
              <thead>
                <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/3">
                  <th className="px-3 py-2.5 text-left font-medium text-[#0e393d]/60 uppercase tracking-wider">Include</th>
                  <th className="px-3 py-2.5 text-left font-medium text-[#0e393d]/60 uppercase tracking-wider">Lab Name</th>
                  <th className="px-3 py-2.5 text-left font-medium text-[#0e393d]/60 uppercase tracking-wider">Matched Biomarker</th>
                  <th className="px-3 py-2.5 text-left font-medium text-[#0e393d]/60 uppercase tracking-wider">Confidence</th>
                  <th className="px-3 py-2.5 text-left font-medium text-[#0e393d]/60 uppercase tracking-wider">Value</th>
                  <th className="px-3 py-2.5 text-left font-medium text-[#0e393d]/60 uppercase tracking-wider">Unit / Conversion</th>
                  <th className="px-3 py-2.5 text-left font-medium text-[#0e393d]/60 uppercase tracking-wider">Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0e393d]/6">
                {extracted.map((row, idx) => {
                  const flag = row.db_biomarker
                    ? computeStatusFlag(row.value, {
                        ref_range_low: row.db_biomarker.ref_range_low ?? row.ref_low,
                        ref_range_high: row.db_biomarker.ref_range_high ?? row.ref_high,
                        optimal_range_low: row.db_biomarker.optimal_range_low,
                        optimal_range_high: row.db_biomarker.optimal_range_high,
                        range_type: row.db_biomarker.range_type,
                      })
                    : null;

                  return (
                    <tr key={idx} className={`${row.include ? '' : 'opacity-40'} hover:bg-[#fafaf8] transition-colors`}>
                      <td className="px-3 py-2.5 text-center">
                        <input type="checkbox" checked={row.include} onChange={() => toggleRow(idx)}
                          className="rounded border-[#0e393d]/30 accent-[#0e393d]" />
                      </td>
                      <td className="px-3 py-2.5 text-[#1c2a2b] max-w-[180px]">
                        <span title={row.extracted_name} className="block truncate">{row.extracted_name}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          value={row.matched_id ?? ''}
                          onChange={(e) => {
                            const bm = allBiomarkers.find((b) => b.id === e.target.value);
                            updateRow(idx, 'matched_id', e.target.value || null);
                            updateRow(idx, 'matched_name', locName(bm?.name) || null);
                            updateRow(idx, 'db_biomarker', bm ?? null);
                            updateRow(idx, 'confidence', e.target.value ? 'alias' : 'unmatched');
                          }}
                          className="rounded border border-[#0e393d]/15 bg-white px-2 py-1 text-xs text-[#1c2a2b] focus:outline-none focus:ring-1 focus:ring-[#0e393d]/20 w-44"
                        >
                          <option value="">— Not mapped —</option>
                          {allBiomarkers.map((b) => (
                            <option key={b.id} value={b.id}>{locName(b.name)}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2.5"><ConfidenceBadge c={row.confidence} /></td>
                      <td className="px-3 py-2.5">
                        <input
                          type="number" step="0.01"
                          value={row.value}
                          onChange={(e) => updateRow(idx, 'value', parseFloat(e.target.value))}
                          className="w-20 rounded border border-[#0e393d]/15 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#0e393d]/20"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        {row.was_converted ? (
                          <span className="text-[#1c2a2b]/50">
                            <span className="text-[#1c2a2b]/40">{row.original_value} {row.original_unit}</span>
                            {' → '}
                            <span className="text-emerald-700 font-medium">{row.unit}</span>
                          </span>
                        ) : (
                          <input
                            type="text"
                            value={row.unit}
                            onChange={(e) => updateRow(idx, 'unit', e.target.value)}
                            className="w-20 rounded border border-[#0e393d]/15 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#0e393d]/20"
                          />
                        )}
                      </td>
                      <td className="px-3 py-2.5"><FlagBadge flag={flag} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSaveExtracted}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-[#0e393d] text-white px-6 py-2.5 font-medium text-sm hover:bg-[#0e393d]/85 transition disabled:opacity-50"
            >
              {saving && <Spinner size={3} />}
              {saving ? 'Saving…' : `Save ${extracted.filter((r) => r.include && r.matched_id).length} Selected Results`}
            </button>
            <button
              onClick={handleBackFromReview}
              className="rounded-xl border border-[#0e393d]/15 text-[#1c2a2b]/60 px-6 py-2.5 font-medium text-sm hover:text-[#1c2a2b] hover:border-[#0e393d]/30 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
