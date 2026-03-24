'use client';

import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  ColumnDef,
  ColumnResizeMode,
  flexRender,
  getCoreRowModel,
  useReactTable,
  VisibilityState,
  SortingState,
} from '@tanstack/react-table';

// ── Constants ──────────────────────────────────────────────────────────────────

const TABLES = [
  { name: 'profiles',                 label: 'User Profiles' },
  { name: 'products',                 label: 'Products' },
  { name: 'product_item_definitions', label: 'Biomarker Definitions' },
  { name: 'product_items',            label: 'Product ↔ Biomarker Links' },
  { name: 'orders',                   label: 'Orders' },
  { name: 'order_vouchers',           label: 'Vouchers' },
  { name: 'order_test_items',         label: 'Order Test Items' },
  { name: 'order_status_log',         label: 'Status Log' },
  { name: 'order_notes',              label: 'Order Notes' },
  { name: 'order_refunds',            label: 'Refunds' },
  { name: 'lab_results',              label: 'Lab Results' },
  { name: 'lab_result_reviews',       label: 'Result Reviews' },
  { name: 'lab_pdf_uploads',          label: 'PDF Uploads' },
  { name: 'email_log',                label: 'Email Log' },
  { name: 'discount_codes',           label: 'Discount Codes' },
];

const PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;

// ── Types ──────────────────────────────────────────────────────────────────────

type Stats = {
  users: number;
  products: number;
  biomarkers: number;
  orders: number;
  lab_results: number;
};

type Row = Record<string, unknown>;

type FetchResult = {
  data: Row[];
  count: number;
  columns: string[];
};

// ── Cell type detection ────────────────────────────────────────────────────────

const UUID_RE    = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_RE     = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const EMAIL_RE   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE     = /^https?:\/\//;

function colInitialWidth(col: string): number {
  if (col === 'id' || col.endsWith('_id')) return 110;
  if (col.includes('url') || col.includes('avatar')) return 140;
  if (col === 'created_at' || col === 'updated_at' || col.includes('_at')) return 160;
  if (col === 'email') return 180;
  if (col.includes('name') || col.includes('slug')) return 160;
  if (col.includes('description') || col.includes('body') || col.includes('notes')) return 200;
  return 130;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60)   return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function fmtTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── JSON Expand Modal ──────────────────────────────────────────────────────────

function JsonModal({ value, onClose }: { value: unknown; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col pointer-events-auto">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#0e393d]/10 shrink-0">
            <span className="text-sm font-medium text-[#0e393d]">JSON</span>
            <button onClick={onClose} className="text-[#1c2a2b]/40 hover:text-[#1c2a2b] transition text-lg leading-none">✕</button>
          </div>
          <div className="flex-1 overflow-auto p-5">
            <pre className="text-xs text-[#1c2a2b]/80 font-mono whitespace-pre-wrap break-words leading-relaxed">
              {JSON.stringify(value, null, 2)}
            </pre>
          </div>
          <div className="px-5 py-3 border-t border-[#0e393d]/10 shrink-0">
            <button
              onClick={() => navigator.clipboard.writeText(JSON.stringify(value, null, 2))}
              className="text-xs text-[#0e393d]/60 hover:text-[#0e393d] transition"
            >
              Copy JSON
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Cell renderer ──────────────────────────────────────────────────────────────

function CellRenderer({ value, onJsonClick }: { value: unknown; onJsonClick: (v: unknown) => void }) {
  const [expanded, setExpanded] = useState(false);

  if (value === null || value === undefined) {
    return <span className="text-[#1c2a2b]/25 select-none">—</span>;
  }
  if (typeof value === 'boolean') {
    return value
      ? <span className="text-emerald-600 font-semibold">✓</span>
      : <span className="text-red-400 font-semibold">✗</span>;
  }
  if (typeof value === 'number') {
    return <span className="font-mono text-[#1c2a2b]/80 tabular-nums">{value.toLocaleString()}</span>;
  }
  if (typeof value === 'object') {
    return (
      <button
        onClick={() => onJsonClick(value)}
        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-[#ceab84]/15 text-[#8a6a3e] text-[10px] font-medium hover:bg-[#ceab84]/30 transition whitespace-nowrap"
      >
        <span className="opacity-60">{'{}'}</span> JSON
      </button>
    );
  }
  if (typeof value !== 'string') {
    return <span className="text-[#1c2a2b]/70">{String(value)}</span>;
  }

  // String handling
  if (UUID_RE.test(value)) {
    return (
      <span title={value} className="font-mono text-[11px] text-[#1c2a2b]/60 cursor-default">
        {value.slice(0, 8)}…
      </span>
    );
  }
  if (ISO_RE.test(value)) {
    return (
      <span title={relativeTime(value)} className="text-[#1c2a2b]/65 whitespace-nowrap cursor-default text-[11px]">
        {fmtTimestamp(value)}
      </span>
    );
  }
  if (EMAIL_RE.test(value)) {
    return (
      <a href={`mailto:${value}`} className="text-[#0e393d]/70 hover:text-[#0e393d] underline underline-offset-2 text-[11px]">
        {value}
      </a>
    );
  }
  if (URL_RE.test(value)) {
    return (
      <a href={value} target="_blank" rel="noreferrer"
        className="inline-flex items-center gap-1 text-[#0e393d]/60 hover:text-[#0e393d] transition text-[11px]"
        title={value}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
        link
      </a>
    );
  }
  // Long text
  if (value.length > 100) {
    return expanded ? (
      <span className="text-[11px] text-[#1c2a2b]/75 leading-relaxed">
        {value}
        <button onClick={() => setExpanded(false)} className="ml-1 text-[#ceab84] hover:underline">less</button>
      </span>
    ) : (
      <span className="text-[11px] text-[#1c2a2b]/75">
        {value.slice(0, 100)}…
        <button onClick={() => setExpanded(true)} className="ml-1 text-[#ceab84] hover:underline">more</button>
      </span>
    );
  }
  return <span className="text-[11px] text-[#1c2a2b]/80">{value}</span>;
}

// ── Row Detail Panel ───────────────────────────────────────────────────────────

function RowDetail({ row, columns, onJsonClick }: {
  row: Row; columns: string[]; onJsonClick: (v: unknown) => void;
}) {
  const copyJson = () => navigator.clipboard.writeText(JSON.stringify(row, null, 2));
  return (
    <tr>
      <td colSpan={columns.length} className="px-0 py-0 bg-[#f7f5f0] border-b border-[#0e393d]/8">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84]">Row Detail</span>
            <button onClick={copyJson} className="text-[11px] text-[#0e393d]/50 hover:text-[#0e393d] transition flex items-center gap-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy JSON
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2">
            {columns.map((col) => (
              <div key={col} className="min-w-0">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-[#0e393d]/40 mb-0.5">{col}</p>
                <div className="text-[11px] text-[#1c2a2b]/80 break-words">
                  <CellRenderer value={row[col]} onJsonClick={onJsonClick} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </td>
    </tr>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#0e393d]/10 px-5 py-4 flex items-center gap-4">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-[10px] font-semibold text-[#1c2a2b]/40 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-serif text-[#0e393d] leading-tight tabular-nums">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}

// ── Column Visibility Dropdown ─────────────────────────────────────────────────

function ColumnVisibility({
  columns, visibility, onChange,
}: {
  columns: string[];
  visibility: VisibilityState;
  onChange: (col: string, visible: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const hidden = columns.filter((c) => visibility[c] === false).length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#0e393d]/15 bg-white text-xs font-medium text-[#1c2a2b]/70 hover:text-[#1c2a2b] hover:bg-[#fafaf8] transition whitespace-nowrap"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
        Columns
        {hidden > 0 && <span className="rounded-full bg-[#ceab84] text-white text-[9px] px-1.5 py-px">{hidden}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 bg-white rounded-xl shadow-xl border border-[#0e393d]/10 w-52 max-h-72 overflow-y-auto">
          <div className="px-3 py-2 border-b border-[#0e393d]/8 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#0e393d]/50">Columns</span>
            <button onClick={() => columns.forEach((c) => onChange(c, true))} className="text-[10px] text-[#ceab84] hover:underline">Show all</button>
          </div>
          {columns.map((col) => (
            <label key={col} className="flex items-center gap-2.5 px-3 py-2 hover:bg-[#fafaf8] cursor-pointer">
              <input
                type="checkbox"
                checked={visibility[col] !== false}
                onChange={(e) => onChange(col, e.target.checked)}
                className="rounded border-[#0e393d]/20 text-[#0e393d] focus:ring-[#0e393d]/20 w-3.5 h-3.5"
              />
              <span className="text-xs text-[#1c2a2b]/70 truncate">{col}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function DataExplorerManager({ initialStats }: { initialStats: Stats }) {
  const [stats] = useState<Stats>(initialStats);

  // Table selection
  const [selectedTable, setSelectedTable] = useState(TABLES[0].name);
  const [tableCounts, setTableCounts]     = useState<Record<string, number>>({});

  // Data
  const [fetchResult, setFetchResult] = useState<FetchResult | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // Pagination
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Sort (server-side)
  const [sorting, setSorting]   = useState<SortingState>([{ id: 'created_at', desc: true }]);

  // Search (debounced)
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]           = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Column visibility
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  // Expanded row & JSON modal
  const [expandedRow, setExpandedRow]   = useState<number | null>(null);
  const [jsonModal, setJsonModal]       = useState<unknown>(null);

  // ── Fetch data ───────────────────────────────────────────────────────────────

  const fetchData = useCallback(async (
    table: string, pg: number, sz: number, srch: string,
    sort: SortingState,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const col = sort[0]?.id ?? 'created_at';
      const asc = sort[0] ? !sort[0].desc : false;
      const params = new URLSearchParams({
        table, page: String(pg), pageSize: String(sz),
        sort: col, order: asc ? 'asc' : 'desc',
        ...(srch ? { search: srch } : {}),
      });
      const res = await fetch(`/api/admin/data-explorer?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Request failed');
      setFetchResult(json);
      setTableCounts((prev) => ({ ...prev, [table]: json.count }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(selectedTable, page, pageSize, search, sorting);
  }, [selectedTable, page, pageSize, search, sorting, fetchData]);

  // Debounce search
  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 300);
  };

  const handleTableChange = (table: string) => {
    setSelectedTable(table);
    setPage(1);
    setSearchInput('');
    setSearch('');
    setSorting([{ id: 'created_at', desc: true }]);
    setExpandedRow(null);
    setColumnVisibility({});
    setFetchResult(null);
  };

  // ── Build TanStack columns ───────────────────────────────────────────────────

  const columns = useMemo<ColumnDef<Row>[]>(() => {
    const cols = fetchResult?.columns ?? [];
    return cols.map((col): ColumnDef<Row> => ({
      id: col,
      accessorKey: col,
      header: col,
      size: colInitialWidth(col),
      minSize: 80,
      cell: ({ getValue }) => (
        <CellRenderer value={getValue()} onJsonClick={setJsonModal} />
      ),
    }));
  }, [fetchResult?.columns]);

  // ── TanStack table instance ──────────────────────────────────────────────────

  const table = useReactTable({
    data: fetchResult?.data ?? [],
    columns,
    state: {
      sorting,
      columnVisibility,
    },
    columnResizeMode: 'onChange' as ColumnResizeMode,
    enableColumnResizing: true,
    manualSorting: true,
    onSortingChange: (updater) => {
      setSorting(updater);
      setPage(1);
    },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  // ── Pagination helpers ───────────────────────────────────────────────────────

  const totalCount = fetchResult?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const rowFrom    = (page - 1) * pageSize + 1;
  const rowTo      = Math.min(page * pageSize, totalCount);

  const visibleColumns = table.getVisibleLeafColumns().map((c) => c.id);

  // Page number pills: show up to 5 around current page
  const pagePills = useMemo(() => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    const end   = Math.min(totalPages, start + 4);
    const pills: number[] = [];
    for (let p = start; p <= end; p++) pills.push(p);
    return pills;
  }, [page, totalPages]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 space-y-6 min-h-screen">

      {/* ── Header ── */}
      <div>
        <h1 className="font-serif text-2xl text-[#0e393d]">Data Explorer</h1>
        <p className="text-sm text-[#1c2a2b]/40 mt-0.5">Browse and inspect platform tables</p>
      </div>

      {/* ── Quick Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Users"       value={stats.users}       icon="👤" />
        <StatCard label="Products"    value={stats.products}    icon="📦" />
        <StatCard label="Biomarkers"  value={stats.biomarkers}  icon="🩸" />
        <StatCard label="Orders"      value={stats.orders}      icon="🛒" />
        <StatCard label="Lab Results" value={stats.lab_results} icon="🧪" />
      </div>

      {/* ── Table Browser ── */}
      <div className="bg-white rounded-xl border border-[#0e393d]/10 overflow-hidden flex flex-col">

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-3.5 border-b border-[#0e393d]/8 shrink-0">

          {/* Table selector */}
          <div className="flex items-center gap-2">
            <select
              value={selectedTable}
              onChange={(e) => handleTableChange(e.target.value)}
              className="rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm text-[#1c2a2b] focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 cursor-pointer"
            >
              {TABLES.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.label}{tableCounts[t.name] != null ? ` (${tableCounts[t.name].toLocaleString()})` : ''}
                </option>
              ))}
            </select>
            {loading && (
              <svg className="w-4 h-4 animate-spin text-[#0e393d]/40" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
              </svg>
            )}
          </div>

          {/* Column visibility */}
          <ColumnVisibility
            columns={fetchResult?.columns ?? []}
            visibility={columnVisibility}
            onChange={(col, visible) =>
              setColumnVisibility((prev) => ({ ...prev, [col]: visible }))
            }
          />

          {/* Search */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#1c2a2b]/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search…"
                className="pl-8 pr-8 py-2 w-52 rounded-lg border border-[#0e393d]/15 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
              />
              {searchInput && (
                <button
                  onClick={() => { handleSearchChange(''); setSearch(''); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#1c2a2b]/30 hover:text-[#1c2a2b] transition text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Page size */}
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="rounded-lg border border-[#0e393d]/15 bg-white px-2 py-2 text-sm text-[#1c2a2b]/70 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 cursor-pointer"
            >
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} / page</option>)}
            </select>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-5 py-3 text-sm text-red-700 bg-red-50 border-b border-red-100">{error}</div>
        )}

        {/* Table */}
        <div className="overflow-auto flex-1">
          <table
            style={{ width: table.getTotalSize(), tableLayout: 'fixed' }}
            className="text-xs"
          >
            <thead className="sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-[#0e393d]/8 bg-[#f5f4f0]">
                  {headerGroup.headers.map((header) => {
                    const sorted = header.column.getIsSorted();
                    const canSort = header.column.getCanSort();
                    return (
                      <th
                        key={header.id}
                        style={{ width: header.getSize(), position: 'relative' }}
                        className="px-3 py-2.5 text-left select-none group"
                      >
                        <div
                          className={`flex items-center gap-1 ${canSort ? 'cursor-pointer hover:text-[#0e393d]' : ''}`}
                          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                        >
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#0e393d]/50 truncate">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </span>
                          {canSort && (
                            <span className={`shrink-0 text-[10px] ${sorted ? 'text-[#ceab84]' : 'text-[#0e393d]/20 group-hover:text-[#0e393d]/40'}`}>
                              {sorted === 'asc' ? '↑' : sorted === 'desc' ? '↓' : '↕'}
                            </span>
                          )}
                        </div>
                        {/* Resize handle */}
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className={`absolute right-0 top-0 h-full w-1.5 cursor-col-resize touch-none select-none
                            ${header.column.getIsResizing()
                              ? 'bg-[#ceab84]'
                              : 'bg-transparent hover:bg-[#0e393d]/20'
                            }`}
                        />
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {/* Empty states */}
              {!loading && fetchResult?.data.length === 0 && (
                <tr>
                  <td colSpan={visibleColumns.length} className="px-4 py-16 text-center">
                    {search ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-[#1c2a2b]/50">No matching rows</p>
                        <button
                          onClick={() => { handleSearchChange(''); }}
                          className="text-xs text-[#ceab84] hover:underline"
                        >
                          Clear search
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-[#1c2a2b]/30">No data in this table</p>
                    )}
                  </td>
                </tr>
              )}

              {/* Loading skeleton */}
              {loading && !fetchResult && (
                Array.from({ length: 5 }).map((_, ri) => (
                  <tr key={ri} className="border-b border-[#0e393d]/5">
                    {(fetchResult ? visibleColumns : Array.from({ length: 5 })).map((_, ci) => (
                      <td key={ci} className="px-3 py-2.5">
                        <div className="h-3 rounded bg-[#0e393d]/6 animate-pulse" style={{ width: `${40 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              )}

              {/* Data rows */}
              {table.getRowModel().rows.map((row, ri) => (
                <>
                  <tr
                    key={row.id}
                    onClick={() => setExpandedRow(expandedRow === ri ? null : ri)}
                    className={`border-b border-[#0e393d]/5 cursor-pointer transition-colors
                      ${expandedRow === ri ? 'bg-[#0e393d]/[0.03]' : 'hover:bg-[#0e393d]/[0.015]'}
                      ${loading ? 'opacity-60' : ''}`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        style={{ width: cell.column.getSize(), maxWidth: cell.column.getSize() }}
                        className="px-3 py-2 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="overflow-hidden">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      </td>
                    ))}
                  </tr>
                  {expandedRow === ri && (
                    <RowDetail
                      key={`${row.id}-detail`}
                      row={row.original}
                      columns={fetchResult?.columns ?? []}
                      onJsonClick={setJsonModal}
                    />
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {totalCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-[#0e393d]/8 shrink-0 bg-[#fafaf8]">
            <span className="text-xs text-[#1c2a2b]/50">
              Showing {rowFrom.toLocaleString()}–{rowTo.toLocaleString()} of {totalCount.toLocaleString()} rows
            </span>
            <div className="flex items-center gap-1">
              <PaginationBtn onClick={() => setPage(1)} disabled={page === 1} label="«" />
              <PaginationBtn onClick={() => setPage((p) => p - 1)} disabled={page === 1} label="‹" />
              {pagePills.map((p) => (
                <PaginationBtn key={p} onClick={() => setPage(p)} active={p === page} label={String(p)} />
              ))}
              <PaginationBtn onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages} label="›" />
              <PaginationBtn onClick={() => setPage(totalPages)} disabled={page >= totalPages} label="»" />
            </div>
          </div>
        )}
      </div>

      {/* JSON Modal */}
      {jsonModal !== null && (
        <JsonModal value={jsonModal} onClose={() => setJsonModal(null)} />
      )}
    </div>
  );
}

function PaginationBtn({
  onClick, disabled, active, label,
}: {
  onClick: () => void; disabled?: boolean; active?: boolean; label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition
        ${active
          ? 'bg-[#ceab84] text-white border-[#ceab84]'
          : 'border-[#0e393d]/15 text-[#1c2a2b]/60 hover:bg-[#fafaf8] hover:text-[#1c2a2b] disabled:opacity-30 disabled:cursor-not-allowed'
        }`}
    >
      {label}
    </button>
  );
}
