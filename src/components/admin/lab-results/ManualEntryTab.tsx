'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  FlagBadge, SectionHeading, Spinner, Toast, ToastContainer,
  SOURCE_ICON, SOURCE_LABEL,
  fmtDate, locName, nextToastId,
} from './shared';
import { computeStatusFlag } from '@/lib/lab-results/flagging';

// ─── Types ────────────────────────────────────────────────────────────────────

type UserOption = { id: string; email: string | null; first_name: string | null; last_name: string | null };
type AllBiomarker = { id: string; name: any; unit: string | null; source: string | null; ref_range_low: number | null; ref_range_high: number | null; optimal_range_low: number | null; optimal_range_high: number | null; range_type: 'range' | 'lower_is_better' | 'higher_is_better' | null };
type LabOption = { id: string; name: string; lab_type: string | null; lab_code: string | null; address: string | null; phone: string | null; email: string | null };

type ManualRow = {
  id: string; // local key
  bm: AllBiomarker | null;
  value: string;
  unit: string;
  notes: string;
  dropdownOpen: boolean;
  search: string;
};

type LabSource = 'evida_life' | 'partner_lab' | 'external_upload';

const LAB_SOURCE_OPTIONS: { value: LabSource; label: string }[] = [
  { value: 'evida_life',      label: '🌿 Evida Life' },
  { value: 'partner_lab',     label: '🔬 Partner Lab' },
  { value: 'external_upload', label: '📁 External' },
];

function newRow(): ManualRow {
  return { id: Math.random().toString(36).slice(2), bm: null, value: '', unit: '', notes: '', dropdownOpen: false, search: '' };
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ManualEntryTab() {
  const supabase = createClient();

  const [allBiomarkers, setAllBiomarkers] = useState<AllBiomarker[]>([]);
  const [labs, setLabs] = useState<LabOption[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [saving, setSaving] = useState(false);

  // Form state
  const [labSource, setLabSource] = useState<LabSource>('external_upload');
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [testDate, setTestDate] = useState('');
  const [labAddress, setLabAddress] = useState('');
  const [labEmail, setLabEmail] = useState('');
  const [labPhone, setLabPhone] = useState('');

  // User
  const [userSearch, setUserSearch] = useState('');
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const userSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rows
  const [rows, setRows] = useState<ManualRow[]>([newRow()]);

  const addToast = useCallback((msg: string, type: Toast['type'] = 'success') => {
    const id = nextToastId();
    setToasts((p) => [...p, { id, message: msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 5000);
  }, []);

  useEffect(() => {
    supabase.from('biomarkers')
      .select('id, name, unit, source, ref_range_low, ref_range_high, optimal_range_low, optimal_range_high, range_type')
      .eq('is_active', true)
      .then(({ data }) => setAllBiomarkers((data as AllBiomarker[]) ?? []));
    supabase.from('lab_partners')
      .select('id, name, lab_type, lab_code, address, phone, email')
      .eq('is_active', true).order('name')
      .then(({ data }) => setLabs((data as LabOption[]) ?? []));
  }, []);

  // ── User search ────────────────────────────────────────────────────────────

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

  // ── Row helpers ────────────────────────────────────────────────────────────

  const updateRow = (id: string, patch: Partial<ManualRow>) =>
    setRows((rs) => rs.map((r) => r.id === id ? { ...r, ...patch } : r));

  const removeRow = (id: string) =>
    setRows((rs) => rs.filter((r) => r.id !== id));

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!selectedUser) { addToast('Please assign to a user first', 'error'); return; }
    if (!title.trim()) { addToast('Report title is required', 'error'); return; }
    if (!testDate) { addToast('Test date is required', 'error'); return; }

    const validRows = rows.filter((r) => r.bm && r.value !== '' && !isNaN(parseFloat(r.value)));
    if (!validRows.length) { addToast('Add at least one marker with a value', 'error'); return; }

    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();

    const results = validRows.map((r) => {
      const def = r.bm!;
      return {
        biomarkerDefinitionId: def.id,
        userId: selectedUser.id,
        value: r.value,
        unit: r.unit || def.unit || '',
        testDate,
        biomarkerName: locName(def.name),
        refRangeLow: def.ref_range_low,
        refRangeHigh: def.ref_range_high,
        optimalRangeLow: def.optimal_range_low,
        optimalRangeHigh: def.optimal_range_high,
        rangeType: def.range_type,
        notes: r.notes || null,
        originalValue: null,
        originalUnit: null,
      };
    });

    const labReport = {
      user_id:       selectedUser.id,
      title:         title.trim(),
      test_date:     testDate,
      report_source: labSource,
      lab_id:        selectedLabId || null,
      lab_address:   labAddress || null,
      lab_email:     labEmail   || null,
      lab_phone:     labPhone   || null,
    };

    const res = await fetch('/api/admin/lab-results/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results, labReport, adminId: user?.id }),
    });
    const data = await res.json();
    setSaving(false);

    if (!data.success) { addToast(data.error ?? 'Save failed', 'error'); return; }

    addToast(`${data.created} result${data.created !== 1 ? 's' : ''} saved`, 'success');
    // Reset form
    setTitle('');
    setTestDate('');
    setLabAddress('');
    setLabEmail('');
    setLabPhone('');
    setSelectedUser(null);
    setSelectedLabId(null);
    setRows([newRow()]);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-3xl">
      <ToastContainer toasts={toasts} dismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />

      {/* ── Assign to User ───────────────────────────────────────────────── */}
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

      {/* ── Lab Source ───────────────────────────────────────────────────── */}
      <div>
        <SectionHeading>Lab Source</SectionHeading>
        <div className="flex gap-2">
          {LAB_SOURCE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => { setLabSource(value); setSelectedLabId(null); }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                labSource === value
                  ? 'bg-[#0e393d] text-white'
                  : 'bg-white ring-1 ring-[#0e393d]/15 text-[#1c2a2b]/60 hover:ring-[#0e393d]/30'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Report Details ───────────────────────────────────────────────── */}
      <div className="rounded-xl border border-[#0e393d]/10 bg-white p-4">
        <p className="text-xs font-medium text-[#0e393d]/70 uppercase tracking-wider mb-3">Report Details</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs text-[#1c2a2b]/50 mb-1">Report Title <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Clinical Assessment Jan 2025"
              className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10"
            />
          </div>
          <div>
            <label className="block text-xs text-[#1c2a2b]/50 mb-1">Test Date <span className="text-red-400">*</span></label>
            <input
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
              className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10"
            />
          </div>
          {labSource !== 'external_upload' && (
            <div className="col-span-2">
              <label className="block text-xs text-[#1c2a2b]/50 mb-1">Select Lab</label>
              <select
                value={selectedLabId ?? ''}
                onChange={(e) => {
                  const id = e.target.value || null;
                  setSelectedLabId(id);
                  if (id) {
                    const lab = labs.find((l) => l.id === id);
                    if (lab) {
                      setLabAddress(lab.address || '');
                      setLabPhone(lab.phone || '');
                      setLabEmail(lab.email || '');
                    }
                  }
                }}
                className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10"
              >
                <option value="">Choose a lab…</option>
                {labs
                  .filter((l) => l.lab_type === (labSource === 'evida_life' ? 'evida_life' : 'partner'))
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}{l.lab_code ? ` (${l.lab_code})` : ''}
                    </option>
                  ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-[#1c2a2b]/50 mb-1">Lab Address</label>
            <input
              type="text"
              value={labAddress}
              onChange={(e) => setLabAddress(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10"
            />
          </div>
          <div>
            <label className="block text-xs text-[#1c2a2b]/50 mb-1">Lab Email</label>
            <input
              type="email"
              value={labEmail}
              onChange={(e) => setLabEmail(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10"
            />
          </div>
          <div>
            <label className="block text-xs text-[#1c2a2b]/50 mb-1">Lab Phone</label>
            <input
              type="tel"
              value={labPhone}
              onChange={(e) => setLabPhone(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10"
            />
          </div>
        </div>
      </div>

      {/* ── Markers ──────────────────────────────────────────────────────── */}
      <div>
        <SectionHeading>Markers</SectionHeading>
        <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/3">
                <th className="px-3 py-2.5 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Biomarker</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider w-24">Value</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider w-24">Unit</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Notes</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider w-16">Flag</th>
                <th className="px-3 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0e393d]/6">
              {rows.map((row) => {
                const numVal = parseFloat(row.value);
                const flag = !isNaN(numVal) && row.bm
                  ? computeStatusFlag(numVal, {
                      ref_range_low: row.bm.ref_range_low,
                      ref_range_high: row.bm.ref_range_high,
                      optimal_range_low: row.bm.optimal_range_low,
                      optimal_range_high: row.bm.optimal_range_high,
                      range_type: row.bm.range_type,
                    })
                  : null;
                return (
                  <tr key={row.id} className="hover:bg-[#fafaf8]">
                    {/* Biomarker selector */}
                    <td className="px-3 py-2 relative">
                      <input
                        type="text"
                        placeholder="Search biomarker…"
                        value={row.bm ? locName(row.bm.name) : row.search}
                        onChange={(e) => updateRow(row.id, { bm: null, search: e.target.value, dropdownOpen: true })}
                        onFocus={() => updateRow(row.id, { dropdownOpen: true })}
                        onBlur={() => setTimeout(() => updateRow(row.id, { dropdownOpen: false }), 150)}
                        className="w-full rounded border border-[#0e393d]/15 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#0e393d]/20 min-w-[200px]"
                      />
                      {row.dropdownOpen && !row.bm && (
                        <div className="absolute top-full left-3 mt-0.5 w-72 bg-white border border-[#0e393d]/15 rounded-lg shadow-lg z-30 max-h-52 overflow-y-auto">
                          {allBiomarkers
                            .filter((b) => !row.search.trim() || locName(b.name).toLowerCase().includes(row.search.toLowerCase()))
                            .slice(0, 30)
                            .map((b) => (
                              <button
                                key={b.id}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => updateRow(row.id, { bm: b, unit: b.unit || '', dropdownOpen: false, search: '' })}
                                className="w-full text-left px-3 py-1.5 text-xs text-[#1c2a2b] hover:bg-[#0e393d]/5 flex items-center gap-2"
                              >
                                <span>{SOURCE_ICON[b.source ?? ''] ?? '❓'}</span>
                                <span>{locName(b.name)}</span>
                                {b.unit && <span className="text-[#1c2a2b]/40 ml-auto">{b.unit}</span>}
                              </button>
                            ))}
                        </div>
                      )}
                    </td>
                    {/* Value */}
                    <td className="px-3 py-2">
                      <input
                        type="number" step="0.01"
                        placeholder="0.00"
                        value={row.value}
                        onChange={(e) => updateRow(row.id, { value: e.target.value })}
                        className="w-full rounded border border-[#0e393d]/15 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#0e393d]/20"
                      />
                    </td>
                    {/* Unit */}
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        placeholder={row.bm?.unit || '—'}
                        value={row.unit}
                        onChange={(e) => updateRow(row.id, { unit: e.target.value })}
                        className="w-full rounded border border-[#0e393d]/15 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#0e393d]/20"
                      />
                    </td>
                    {/* Notes */}
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        placeholder="Optional note"
                        value={row.notes}
                        onChange={(e) => updateRow(row.id, { notes: e.target.value })}
                        className="w-full rounded border border-[#0e393d]/15 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#0e393d]/20"
                      />
                    </td>
                    {/* Flag */}
                    <td className="px-3 py-2">
                      <FlagBadge flag={flag} />
                    </td>
                    {/* Remove */}
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => rows.length > 1 ? removeRow(row.id) : updateRow(row.id, { bm: null, value: '', unit: '', notes: '', search: '' })}
                        className="text-[#1c2a2b]/25 hover:text-red-400 transition text-sm"
                        title="Remove row"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-3 py-2 border-t border-[#0e393d]/6">
            <button
              onClick={() => setRows((rs) => [...rs, newRow()])}
              className="text-xs text-[#0e393d] hover:text-[#0e393d]/70 font-medium transition"
            >
              + Add row
            </button>
          </div>
        </div>
      </div>

      {/* ── Save ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-[#0e393d] text-white px-6 py-2.5 font-medium text-sm hover:bg-[#0e393d]/85 transition disabled:opacity-50"
        >
          {saving && <Spinner size={3} />}
          {saving ? 'Saving…' : `Save ${rows.filter((r) => r.bm && r.value !== '' && !isNaN(parseFloat(r.value))).length} Results`}
        </button>
        <button
          onClick={() => {
            setTitle(''); setTestDate(''); setLabAddress(''); setLabEmail(''); setLabPhone('');
            setSelectedUser(null); setSelectedLabId(null); setRows([newRow()]);
          }}
          className="rounded-xl border border-[#0e393d]/15 text-[#1c2a2b]/60 px-6 py-2.5 font-medium text-sm hover:text-[#1c2a2b] hover:border-[#0e393d]/30 transition"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
