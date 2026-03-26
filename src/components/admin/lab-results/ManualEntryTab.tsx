'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  FlagBadge, SectionHeading, Spinner, Toast, ToastContainer,
  SOURCE_ICON, SOURCE_LABEL, TEST_CATEGORIES,
  locName, nextToastId, todayISO,
} from './shared';
import { computeStatusFlag, checkPlausibility } from '@/lib/lab-results/flagging';
import { convertToCanonical, UnitConversion } from '@/lib/biomarker-conversions';

// ─── Types ────────────────────────────────────────────────────────────────────

type LabSource = 'evida_life' | 'partner_lab' | 'external_upload';

type AllBiomarker = {
  id: string;
  name: Record<string, string> | string;
  unit: string | null;
  item_type: string | null;
  ref_range_low: number | null;
  ref_range_high: number | null;
  optimal_range_low: number | null;
  optimal_range_high: number | null;
  range_type: 'range' | 'lower_is_better' | 'higher_is_better' | null;
};

type LabOption = {
  id: string;
  name: string;
  lab_type: string | null;
  lab_code: string | null;
  parent_lab_id: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  test_categories: string[] | null;
};

type OrderOption = {
  id: string;
  order_number: string | null;
  user_id: string;
  created_at: string;
  profile: { id: string; first_name: string | null; last_name: string | null; email: string | null } | null;
};

type UserOption = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
};

type ManualRow = {
  id: string;
  bm: AllBiomarker | null;
  rawValue: string;
  unit: string;
  search: string;
  dropdownOpen: boolean;
};

type RowComputed = {
  convertedValue: number | null;
  canonicalUnit: string;
  wasConverted: boolean;
  flagValue: number | null;
};

type PlausWarning = { rowId: string; name: string; message: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const LAB_SOURCE_OPTIONS: { value: LabSource; label: string }[] = [
  { value: 'evida_life',      label: '🌿 Evida Life' },
  { value: 'partner_lab',     label: '🔬 Partner Lab' },
  { value: 'external_upload', label: '📁 External' },
];

function newRow(): ManualRow {
  return {
    id: Math.random().toString(36).slice(2),
    bm: null, rawValue: '', unit: '', search: '', dropdownOpen: false,
  };
}

function labLabel(lab: LabOption): string {
  return `${lab.name}${lab.lab_code ? ` (${lab.lab_code})` : ''}`;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ManualEntryTab() {
  const supabase = createClient();

  // ── Data ──────────────────────────────────────────────────────────────────

  const [allBiomarkers, setAllBiomarkers] = useState<AllBiomarker[]>([]);
  const [labs, setLabs] = useState<LabOption[]>([]);
  const [conversionsMap, setConversionsMap] = useState<Record<string, UnitConversion[]>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [saving, setSaving] = useState(false);

  // ── Section 1: Source ─────────────────────────────────────────────────────

  const [labSource, setLabSource] = useState<LabSource>('external_upload');
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);

  // External free-text fields
  const [extLabAddress, setExtLabAddress] = useState('');
  const [extLabEmail, setExtLabEmail]     = useState('');
  const [extLabPhone, setExtLabPhone]     = useState('');

  // External user search
  const [userSearch, setUserSearch]       = useState('');
  const [userOptions, setUserOptions]     = useState<UserOption[]>([]);
  const [selectedUser, setSelectedUser]   = useState<UserOption | null>(null);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const userSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Evida/Partner order search
  const [orderSearch, setOrderSearch]     = useState('');
  const [orderOptions, setOrderOptions]   = useState<OrderOption[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderOption | null>(null);
  const [searchingOrders, setSearchingOrders] = useState(false);
  const orderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Section 2: Report details ─────────────────────────────────────────────

  const [title, setTitle]       = useState('');
  const [testDate, setTestDate] = useState(todayISO());

  // ── Section 3: Category filter ────────────────────────────────────────────

  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // ── Section 4: Rows ───────────────────────────────────────────────────────

  const [rows, setRows] = useState<ManualRow[]>([newRow()]);

  // ── Section 5: Plausibility ───────────────────────────────────────────────

  const [plausWarnings, setPlausWarnings]           = useState<PlausWarning[]>([]);
  const [plausConfirmed, setPlausConfirmed]         = useState(false);
  const warningBannerRef = useRef<HTMLDivElement>(null);

  // ── Load data ─────────────────────────────────────────────────────────────

  const addToast = useCallback((msg: string, type: Toast['type'] = 'success') => {
    const id = nextToastId();
    setToasts((p) => [...p, { id, message: msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 5000);
  }, []);

  useEffect(() => {
    supabase.from('biomarkers')
      .select('id, name, unit, item_type, ref_range_low, ref_range_high, optimal_range_low, optimal_range_high, range_type')
      .eq('is_active', true)
      .then(({ data, error }) => {
        if (error) { console.error('[ManualEntryTab] biomarkers load error:', error); return; }
        setAllBiomarkers((data as AllBiomarker[]) ?? []);
      });

    supabase.from('lab_partners')
      .select('id, name, lab_type, lab_code, parent_lab_id, address, phone, email, test_categories')
      .eq('is_active', true).order('name')
      .then(({ data }) => setLabs((data as LabOption[]) ?? []));

    supabase.from('biomarker_unit_conversions')
      .select('biomarker_id, alt_unit, canonical_unit, multiplier, offset_value')
      .then(({ data }) => {
        const map: Record<string, UnitConversion[]> = {};
        for (const row of (data ?? []) as UnitConversion[]) {
          if (!map[row.biomarker_id]) map[row.biomarker_id] = [];
          map[row.biomarker_id].push(row);
        }
        setConversionsMap(map);
      });
  }, []);

  // ── User search (external) ────────────────────────────────────────────────

  const searchUsers = (q: string) => {
    setUserSearch(q);
    if (userSearchTimer.current) clearTimeout(userSearchTimer.current);
    if (!q.trim()) { setUserOptions([]); return; }
    userSearchTimer.current = setTimeout(async () => {
      setSearchingUsers(true);
      const { data } = await supabase.from('profiles')
        .select('id, email, first_name, last_name')
        .or(`email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
        .limit(8);
      setUserOptions((data as UserOption[]) ?? []);
      setSearchingUsers(false);
    }, 300);
  };

  // ── Order search (evida/partner) ──────────────────────────────────────────

  const searchOrders = (q: string) => {
    setOrderSearch(q);
    if (orderTimer.current) clearTimeout(orderTimer.current);
    if (!q.trim()) { setOrderOptions([]); return; }
    orderTimer.current = setTimeout(async () => {
      setSearchingOrders(true);
      const orderMap = new Map<string, { id: string; order_number: string | null; user_id: string; created_at: string }>();

      const { data: byNum } = await supabase.from('orders')
        .select('id, order_number, user_id, created_at')
        .ilike('order_number', `%${q}%`).limit(8);
      (byNum ?? []).forEach((o) => orderMap.set(o.id, o));

      const { data: profileMatches } = await supabase.from('profiles')
        .select('id')
        .or(`email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
        .limit(5);
      if (profileMatches?.length) {
        const { data: byUser } = await supabase.from('orders')
          .select('id, order_number, user_id, created_at')
          .in('user_id', profileMatches.map((p) => p.id)).limit(5);
        (byUser ?? []).forEach((o) => orderMap.set(o.id, o));
      }

      if (!orderMap.size) { setOrderOptions([]); setSearchingOrders(false); return; }

      const userIds = [...new Set([...orderMap.values()].map((o) => o.user_id))];
      const { data: profiles } = await supabase.from('profiles')
        .select('id, first_name, last_name, email').in('id', userIds);
      const profById = new Map((profiles ?? []).map((p) => [p.id, p]));

      setOrderOptions(
        [...orderMap.values()].map((o) => ({
          id: o.id,
          order_number: o.order_number,
          user_id: o.user_id,
          created_at: o.created_at,
          profile: profById.get(o.user_id) ?? null,
        })),
      );
      setSearchingOrders(false);
    }, 300);
  };

  // ── Filtered biomarkers by category ──────────────────────────────────────

  const filteredBiomarkers = useMemo(() => {
    if (!categoryFilter) return allBiomarkers;
    return allBiomarkers.filter((b) => b.item_type === categoryFilter);
  }, [allBiomarkers, categoryFilter]);

  // ── Per-row computed values ───────────────────────────────────────────────

  const computedRows = useMemo<Record<string, RowComputed>>(() => {
    const result: Record<string, RowComputed> = {};
    for (const row of rows) {
      const canonicalUnit = row.bm?.unit ?? '';
      const raw = parseFloat(row.rawValue);
      if (!row.bm || isNaN(raw)) {
        result[row.id] = { convertedValue: null, canonicalUnit, wasConverted: false, flagValue: null };
        continue;
      }
      const conversions = conversionsMap[row.bm.id] ?? [];
      const inputUnit = row.unit || canonicalUnit;
      const { convertedValue, wasConverted } = convertToCanonical(raw, inputUnit, canonicalUnit, conversions);
      result[row.id] = {
        convertedValue: wasConverted ? convertedValue : null,
        canonicalUnit,
        wasConverted,
        flagValue: wasConverted ? convertedValue : raw,
      };
    }
    return result;
  }, [rows, conversionsMap]);

  // ── Row helpers ───────────────────────────────────────────────────────────

  const updateRow = (id: string, patch: Partial<ManualRow>) =>
    setRows((rs) => rs.map((r) => r.id === id ? { ...r, ...patch } : r));

  const removeRow = (id: string) =>
    setRows((rs) => rs.length > 1 ? rs.filter((r) => r.id !== id) : [newRow()]);

  // ── Lab dropdown renderer (shared between evida/partner) ──────────────────

  function renderLabDropdown() {
    const typeFilter = labSource === 'evida_life' ? 'evida_life' : 'partner';
    const filtered = labs.filter((l) => l.lab_type === typeFilter);
    const childrenByParent = new Map<string, LabOption[]>();
    filtered.filter((l) => l.parent_lab_id).forEach((c) => {
      if (!childrenByParent.has(c.parent_lab_id!)) childrenByParent.set(c.parent_lab_id!, []);
      childrenByParent.get(c.parent_lab_id!)!.push(c);
    });
    return (
      <select
        value={selectedLabId ?? ''}
        onChange={(e) => {
          const id = e.target.value || null;
          setSelectedLabId(id);
          if (id) {
            const lab = labs.find((l) => l.id === id);
            if (lab) {
              setExtLabAddress(lab.address || '');
              setExtLabPhone(lab.phone || '');
              setExtLabEmail(lab.email || '');
            }
          }
        }}
        className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
      >
        <option value="">Choose a lab…</option>
        {filtered.filter((l) => !l.parent_lab_id).flatMap((org) => {
          const orgChildren = childrenByParent.get(org.id) ?? [];
          const selectable = orgChildren.length === 0 || (org.test_categories?.length ?? 0) > 0;
          const items = [];
          if (selectable) {
            items.push(<option key={org.id} value={org.id}>{labLabel(org)}</option>);
          } else {
            items.push(
              <option key={`h-${org.id}`} value="" disabled style={{ color: '#888' }}>
                — {org.name}{org.lab_code ? ` (${org.lab_code})` : ''}
              </option>
            );
          }
          orgChildren.forEach((child) => {
            items.push(<option key={child.id} value={child.id}>{'  ↳ '}{labLabel(child)}</option>);
          });
          return items;
        })}
      </select>
    );
  }

  // ── Effective user ID ─────────────────────────────────────────────────────

  const effectiveUserId: string | null =
    labSource === 'external_upload' ? (selectedUser?.id ?? null) : (selectedOrder?.user_id ?? null);

  // ── Valid rows for save ───────────────────────────────────────────────────

  const validRows = useMemo(
    () => rows.filter((r) => r.bm && r.rawValue !== '' && !isNaN(parseFloat(r.rawValue))),
    [rows],
  );

  const saveReady =
    (labSource === 'external_upload' ? !!selectedUser : !!selectedOrder) &&
    !!title.trim() && !!testDate && validRows.length > 0;

  // ── Clear form ────────────────────────────────────────────────────────────

  const clearForm = () => {
    setTitle('');
    setTestDate(todayISO());
    setExtLabAddress(''); setExtLabEmail(''); setExtLabPhone('');
    setSelectedUser(null); setUserSearch('');
    setSelectedOrder(null); setOrderSearch('');
    setSelectedLabId(null);
    setRows([newRow()]);
    setPlausWarnings([]);
    setPlausConfirmed(false);
    setCategoryFilter(null);
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!effectiveUserId) {
      addToast(labSource === 'external_upload' ? 'Assign to a user first' : 'Link to an order first', 'error');
      return;
    }
    if (!title.trim()) { addToast('Report title is required', 'error'); return; }
    if (!testDate)     { addToast('Test date is required', 'error'); return; }
    if (!validRows.length) { addToast('Add at least one marker with a value', 'error'); return; }

    // Plausibility check
    const warnings: PlausWarning[] = [];
    for (const row of validRows) {
      const comp = computedRows[row.id];
      const checkValue = comp.flagValue ?? parseFloat(row.rawValue);
      const plaus = checkPlausibility(checkValue, locName(row.bm!.name), {
        ref_range_low:      row.bm!.ref_range_low,
        ref_range_high:     row.bm!.ref_range_high,
        optimal_range_low:  row.bm!.optimal_range_low,
        optimal_range_high: row.bm!.optimal_range_high,
        range_type:         row.bm!.range_type,
      });
      if (!plaus.plausible) {
        warnings.push({ rowId: row.id, name: locName(row.bm!.name), message: plaus.message ?? 'Implausible value' });
      }
    }

    if (warnings.length > 0 && !plausConfirmed) {
      setPlausWarnings(warnings);
      setTimeout(() => warningBannerRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const results = validRows.map((row) => {
      const comp = computedRows[row.id];
      const def  = row.bm!;
      return {
        biomarkerDefinitionId: def.id,
        biomarkerName:         locName(def.name),
        userId:                effectiveUserId,
        value:                 String(comp.flagValue ?? parseFloat(row.rawValue)),
        unit:                  comp.canonicalUnit || def.unit || '',
        testDate,
        refRangeLow:           def.ref_range_low,
        refRangeHigh:          def.ref_range_high,
        optimalRangeLow:       def.optimal_range_low,
        optimalRangeHigh:      def.optimal_range_high,
        rangeType:             def.range_type,
        originalValue:         comp.wasConverted ? row.rawValue : null,
        originalUnit:          comp.wasConverted ? (row.unit || null) : null,
        orderId:               selectedOrder?.id ?? null,
      };
    });

    const labReport = {
      user_id:       effectiveUserId,
      title:         title.trim(),
      test_date:     testDate,
      report_source: labSource,
      lab_id:        selectedLabId || null,
      lab_address:   extLabAddress || null,
      lab_email:     extLabEmail   || null,
      lab_phone:     extLabPhone   || null,
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
    clearForm();
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl">
      <ToastContainer toasts={toasts} dismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />

      {/* ── Section 1: Source ────────────────────────────────────────────── */}
      <div>
        <SectionHeading>Source</SectionHeading>
        <div className="flex gap-2">
          {LAB_SOURCE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => {
                setLabSource(value);
                setSelectedLabId(null);
                setSelectedOrder(null); setOrderSearch('');
                setSelectedUser(null); setUserSearch('');
              }}
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

      {/* ── 1a. Evida/Partner: Link to Order ─────────────────────────────── */}
      {(labSource === 'evida_life' || labSource === 'partner_lab') && (
        <div>
          <SectionHeading>Link to Order <span className="text-red-400">*</span></SectionHeading>
          {selectedOrder ? (
            <div className="rounded-lg border border-[#0C9C6C]/30 bg-[#0C9C6C]/5 px-4 py-3 flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-[#0e393d]">
                  Order #{selectedOrder.order_number ?? selectedOrder.id.slice(0, 8)}
                </p>
                {selectedOrder.profile && (
                  <p className="text-xs text-[#1c2a2b]/50 mt-0.5">
                    {[selectedOrder.profile.first_name, selectedOrder.profile.last_name].filter(Boolean).join(' ') || selectedOrder.profile.email}
                    {' · '}{selectedOrder.profile.email}
                  </p>
                )}
              </div>
              <button
                onClick={() => { setSelectedOrder(null); setOrderSearch(''); }}
                className="text-xs text-[#1c2a2b]/40 hover:text-[#1c2a2b] shrink-0"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                placeholder="Search by order number or patient name / email…"
                value={orderSearch}
                onChange={(e) => searchOrders(e.target.value)}
                className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10"
              />
              {searchingOrders && <div className="absolute right-3 top-2.5"><Spinner /></div>}
              {orderOptions.length > 0 && (
                <div className="absolute top-full mt-1 w-full rounded-lg border border-[#0e393d]/15 bg-white shadow-lg z-10 overflow-hidden">
                  {orderOptions.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => { setSelectedOrder(o); setOrderOptions([]); setOrderSearch(''); }}
                      className="w-full flex items-start justify-between px-4 py-2.5 text-left hover:bg-[#0e393d]/5 transition gap-4"
                    >
                      <div>
                        <p className="text-sm font-medium text-[#1c2a2b]">
                          Order #{o.order_number ?? o.id.slice(0, 8)}
                        </p>
                        {o.profile && (
                          <p className="text-xs text-[#1c2a2b]/50">
                            {[o.profile.first_name, o.profile.last_name].filter(Boolean).join(' ') || o.profile.email}
                            {' · '}{o.profile.email}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {!searchingOrders && orderSearch.length > 1 && orderOptions.length === 0 && (
                <p className="mt-1.5 text-xs text-[#1c2a2b]/40">No orders found.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 1b. Evida/Partner: Lab selector (after order selected) ───────── */}
      {(labSource === 'evida_life' || labSource === 'partner_lab') && selectedOrder && (
        <div>
          <SectionHeading>Select Lab</SectionHeading>
          {renderLabDropdown()}
        </div>
      )}

      {/* ── 1c. External: Assign to User ─────────────────────────────────── */}
      {labSource === 'external_upload' && (
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
      )}

      {/* ── Test Category ────────────────────────────────────────────────── */}
      <div>
        <SectionHeading>Test Category</SectionHeading>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setCategoryFilter(null); setRows([newRow()]); }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              categoryFilter === null
                ? 'bg-[#0e393d] text-white'
                : 'bg-white ring-1 ring-[#0e393d]/15 text-[#1c2a2b]/60 hover:ring-[#0e393d]/30'
            }`}
          >
            All
          </button>
          {TEST_CATEGORIES.map(({ value, label, icon }) => (
            <button
              key={value}
              onClick={() => { setCategoryFilter(categoryFilter === value ? null : value); setRows([newRow()]); }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                categoryFilter === value
                  ? 'bg-[#0e393d] text-white'
                  : 'bg-white ring-1 ring-[#0e393d]/15 text-[#1c2a2b]/60 hover:ring-[#0e393d]/30'
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>
        {categoryFilter && (
          <p className="mt-1.5 text-xs text-[#1c2a2b]/50">
            Showing only {SOURCE_LABEL[categoryFilter] ?? categoryFilter} markers
            {allBiomarkers.length === 0 && <span className="ml-2 text-amber-600">(loading…)</span>}
          </p>
        )}
      </div>

      {/* ── 1d. External: Lab contact fields ─────────────────────────────── */}
      {labSource === 'external_upload' && (
        <div className="rounded-xl border border-[#0e393d]/10 bg-white p-4">
          <p className="text-xs font-medium text-[#0e393d]/70 uppercase tracking-wider mb-3">Lab Details (Optional)</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-[#1c2a2b]/50 mb-1">Lab Address</label>
              <input
                type="text" value={extLabAddress} onChange={(e) => setExtLabAddress(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10"
              />
            </div>
            <div>
              <label className="block text-xs text-[#1c2a2b]/50 mb-1">Lab Email</label>
              <input
                type="email" value={extLabEmail} onChange={(e) => setExtLabEmail(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10"
              />
            </div>
            <div>
              <label className="block text-xs text-[#1c2a2b]/50 mb-1">Lab Phone</label>
              <input
                type="tel" value={extLabPhone} onChange={(e) => setExtLabPhone(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Section 2: Report Details ─────────────────────────────────────── */}
      <div className="rounded-xl border border-[#0e393d]/10 bg-white p-4">
        <p className="text-xs font-medium text-[#0e393d]/70 uppercase tracking-wider mb-3">Report Details</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs text-[#1c2a2b]/50 mb-1">Report Title <span className="text-red-400">*</span></label>
            <input
              type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Blood Panel — Synlab Jan 2025"
              className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10"
            />
          </div>
          <div>
            <label className="block text-xs text-[#1c2a2b]/50 mb-1">Test Date <span className="text-red-400">*</span></label>
            <input
              type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)}
              className="w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10"
            />
          </div>
        </div>
      </div>

      {/* ── Section 4: Marker Rows Table ─────────────────────────────────── */}
      <div>
        <SectionHeading>Markers</SectionHeading>
        <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-visible">
          <table className="w-full text-xs min-w-[900px]">
            <thead>
              <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/3">
                <th className="px-3 py-2.5 text-left font-medium text-[#0e393d]/60 uppercase tracking-wider">Biomarker</th>
                <th className="px-3 py-2.5 text-left font-medium text-[#0e393d]/60 uppercase tracking-wider w-28">Value</th>
                <th className="px-3 py-2.5 text-left font-medium text-[#0e393d]/60 uppercase tracking-wider w-28">Unit</th>
                <th className="px-3 py-2.5 text-left font-medium text-[#0e393d]/60 uppercase tracking-wider w-36">Converted</th>
                <th className="px-3 py-2.5 text-left font-medium text-[#0e393d]/60 uppercase tracking-wider">Ref Range</th>
                <th className="px-3 py-2.5 text-left font-medium text-[#0e393d]/60 uppercase tracking-wider w-24">Flag</th>
                <th className="px-3 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0e393d]/6">
              {rows.map((row) => {
                const comp = computedRows[row.id];
                const flagValue = comp?.flagValue;
                const flag = flagValue != null && row.bm
                  ? computeStatusFlag(flagValue, {
                      ref_range_low:      row.bm.ref_range_low,
                      ref_range_high:     row.bm.ref_range_high,
                      optimal_range_low:  row.bm.optimal_range_low,
                      optimal_range_high: row.bm.optimal_range_high,
                      range_type:         row.bm.range_type,
                    })
                  : null;
                return (
                  <tr key={row.id} className="hover:bg-[#fafaf8] transition-colors">
                    {/* Biomarker */}
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
                        <div className="absolute top-full left-0 mt-0.5 w-80 bg-white border border-[#0e393d]/15 rounded-lg shadow-lg z-30 max-h-52 overflow-y-auto">
                          {filteredBiomarkers
                            .filter((b) => !row.search.trim() || locName(b.name).toLowerCase().includes(row.search.toLowerCase()))
                            .slice(0, 40)
                            .map((b) => (
                              <button
                                key={b.id}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => updateRow(row.id, {
                                  bm: b,
                                  unit: b.unit || '',
                                  dropdownOpen: false,
                                  search: '',
                                })}
                                className="w-full text-left px-3 py-1.5 text-xs text-[#1c2a2b] hover:bg-[#0e393d]/5 flex items-center gap-2"
                              >
                                <span className="shrink-0">{SOURCE_ICON[b.item_type ?? ''] ?? '❓'}</span>
                                <span className="flex-1">{locName(b.name)}</span>
                                {b.unit && <span className="text-[#1c2a2b]/35 shrink-0">{b.unit}</span>}
                              </button>
                            ))}
                          {allBiomarkers.length === 0 && (
                            <p className="px-3 py-2 text-xs text-[#1c2a2b]/40">Loading markers…</p>
                          )}
                          {allBiomarkers.length > 0 && filteredBiomarkers.filter((b) => !row.search.trim() || locName(b.name).toLowerCase().includes(row.search.toLowerCase())).length === 0 && (
                            <p className="px-3 py-2 text-xs text-[#1c2a2b]/40">No markers found</p>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Value */}
                    <td className="px-3 py-2">
                      <input
                        type="number" step="any"
                        placeholder="0.00"
                        value={row.rawValue}
                        onChange={(e) => updateRow(row.id, { rawValue: e.target.value })}
                        className="w-full rounded border border-[#0e393d]/15 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#0e393d]/20"
                      />
                    </td>

                    {/* Unit — select from canonical + alt units, or plain text if no biomarker */}
                    <td className="px-3 py-2">
                      {row.bm ? (() => {
                        const canonical = row.bm.unit ?? '';
                        const alts = (conversionsMap[row.bm.id] ?? []).map((c) => c.alt_unit);
                        const options = [canonical, ...alts].filter(Boolean);
                        return options.length > 1 ? (
                          <select
                            value={row.unit}
                            onChange={(e) => updateRow(row.id, { unit: e.target.value })}
                            className="w-full rounded border border-[#0e393d]/15 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#0e393d]/20"
                          >
                            {options.map((u) => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-[#1c2a2b]/60 px-1">{canonical || '—'}</span>
                        );
                      })() : (
                        <span className="text-xs text-[#1c2a2b]/25 px-1">—</span>
                      )}
                    </td>

                    {/* Converted */}
                    <td className="px-3 py-2">
                      {comp?.wasConverted && comp.convertedValue != null ? (
                        <span className="text-emerald-700 font-medium">
                          {comp.convertedValue} <span className="text-[#1c2a2b]/40">{comp.canonicalUnit}</span>
                        </span>
                      ) : (
                        <span className="text-[#1c2a2b]/25">—</span>
                      )}
                    </td>

                    {/* Ref Range */}
                    <td className="px-3 py-2 text-[#1c2a2b]/50">
                      {row.bm ? (
                        <>
                          {(row.bm.ref_range_low != null || row.bm.ref_range_high != null) && (
                            <p>
                              Ref: {row.bm.ref_range_low ?? '—'}–{row.bm.ref_range_high ?? '—'}
                              {row.bm.unit ? ` ${row.bm.unit}` : ''}
                            </p>
                          )}
                          {(row.bm.optimal_range_low != null || row.bm.optimal_range_high != null) && (
                            <p className="text-emerald-600 text-[10px]">
                              Opt: {row.bm.optimal_range_low ?? '—'}–{row.bm.optimal_range_high ?? '—'}
                            </p>
                          )}
                          {row.bm.ref_range_low == null && row.bm.ref_range_high == null && (
                            <span className="text-[#1c2a2b]/25">—</span>
                          )}
                        </>
                      ) : (
                        <span className="text-[#1c2a2b]/25">—</span>
                      )}
                    </td>

                    {/* Flag */}
                    <td className="px-3 py-2">
                      <FlagBadge flag={flag} />
                    </td>

                    {/* Remove */}
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => removeRow(row.id)}
                        className="text-[#1c2a2b]/25 hover:text-red-400 transition"
                        title="Remove"
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
              + Add marker
            </button>
          </div>
        </div>
      </div>

      {/* ── Section 5: Plausibility warnings ────────────────────────────── */}
      {plausWarnings.length > 0 && (
        <div ref={warningBannerRef} className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-3">
          <p className="text-sm font-medium text-amber-800">
            ⚠ {plausWarnings.length} plausibility warning{plausWarnings.length !== 1 ? 's' : ''}
          </p>
          <ul className="space-y-1">
            {plausWarnings.map((w) => (
              <li key={w.rowId} className="text-xs text-amber-700">
                <span className="font-medium">{w.name}:</span> {w.message}
              </li>
            ))}
          </ul>
          <label className="flex items-center gap-2 text-xs text-amber-800 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={plausConfirmed}
              onChange={(e) => setPlausConfirmed(e.target.checked)}
              className="rounded border-amber-400 accent-amber-600"
            />
            I confirm these values are correct despite the warnings
          </label>
        </div>
      )}

      {/* ── Save / Clear ─────────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !saveReady || (plausWarnings.length > 0 && !plausConfirmed)}
          className="flex items-center gap-2 rounded-xl bg-[#0e393d] text-white px-6 py-2.5 font-medium text-sm hover:bg-[#0e393d]/85 transition disabled:opacity-40"
        >
          {saving && <Spinner size={3} />}
          {saving ? 'Saving…' : `Save Report (${validRows.length} marker${validRows.length !== 1 ? 's' : ''})`}
        </button>
        <button
          onClick={clearForm}
          className="rounded-xl border border-[#0e393d]/15 text-[#1c2a2b]/60 px-6 py-2.5 font-medium text-sm hover:text-[#1c2a2b] hover:border-[#0e393d]/30 transition"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
