'use client';

import { useCallback, useEffect, useState } from 'react';

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

const PAGE_SIZE = 25;

// ── Types ──────────────────────────────────────────────────────────────────────

type Stats = {
  users: number;
  products: number;
  biomarkers: number;
  orders: number;
  lab_results: number;
};

type TableResult = {
  data: Record<string, unknown>[];
  count: number;
  columns: string[];
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtTimestamp(val: string): string {
  try {
    return new Date(val).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return val;
  }
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function CellValue({ value }: { value: unknown }) {
  const [expanded, setExpanded] = useState(false);

  if (value === null || value === undefined) {
    return <span className="text-[#1c2a2b]/25">—</span>;
  }
  if (typeof value === 'boolean') {
    return value
      ? <span className="text-emerald-600 font-medium">✓</span>
      : <span className="text-red-500 font-medium">✗</span>;
  }
  if (typeof value === 'string' && ISO_RE.test(value)) {
    return <span className="text-[#1c2a2b]/70 whitespace-nowrap">{fmtTimestamp(value)}</span>;
  }
  if (typeof value === 'object') {
    const str = JSON.stringify(value, null, 2);
    if (!expanded) {
      return (
        <button
          onClick={() => setExpanded(true)}
          className="text-[10px] text-[#ceab84] underline underline-offset-2 hover:no-underline"
        >
          {'{…}'}
        </button>
      );
    }
    return (
      <div className="relative">
        <button
          onClick={() => setExpanded(false)}
          className="absolute top-0 right-0 text-[10px] text-[#1c2a2b]/40 hover:text-[#1c2a2b] px-1"
        >
          ✕
        </button>
        <pre className="text-[10px] text-[#1c2a2b]/70 bg-[#f5f4f0] rounded p-2 max-w-xs overflow-auto max-h-40 whitespace-pre-wrap">
          {str}
        </pre>
      </div>
    );
  }
  return <span className="text-[#1c2a2b]/80">{String(value)}</span>;
}

// ── Stat Card ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon }: { label: string; value: number | null; icon: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#0e393d]/10 px-5 py-4 flex items-center gap-4">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-xs text-[#1c2a2b]/50 uppercase tracking-wider font-medium">{label}</p>
        <p className="text-2xl font-serif text-[#0e393d] leading-tight">
          {value === null ? <span className="text-sm text-[#1c2a2b]/30">…</span> : value.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function DataExplorerManager({ initialStats }: { initialStats: Stats }) {
  const [stats] = useState<Stats>(initialStats);
  const [selectedTable, setSelectedTable] = useState(TABLES[0].name);
  const [result, setResult] = useState<TableResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortCol, setSortCol] = useState('created_at');
  const [sortAsc, setSortAsc] = useState(false);

  const fetchData = useCallback(async (
    table: string, pg: number, srch: string, col: string, asc: boolean
  ) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        table, page: String(pg), pageSize: String(PAGE_SIZE),
        sort: col, order: asc ? 'asc' : 'desc',
        ...(srch ? { search: srch } : {}),
      });
      const res = await fetch(`/api/admin/data-explorer?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Request failed');
      setResult(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(selectedTable, page, search, sortCol, sortAsc);
  }, [selectedTable, page, search, sortCol, sortAsc, fetchData]);

  const handleTableChange = (table: string) => {
    setSelectedTable(table);
    setPage(1);
    setSearch('');
    setSearchInput('');
    setSortCol('created_at');
    setSortAsc(false);
  };

  const handleSort = (col: string) => {
    if (col === sortCol) {
      setSortAsc((v) => !v);
    } else {
      setSortCol(col);
      setSortAsc(false);
    }
    setPage(1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const totalPages = result ? Math.ceil(result.count / PAGE_SIZE) : 0;

  return (
    <div className="p-8 space-y-6">

      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl text-[#0e393d]">Data Explorer</h1>
        <p className="text-sm text-[#1c2a2b]/40 mt-0.5">Browse platform tables</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Users"       value={stats.users}       icon="👤" />
        <StatCard label="Products"    value={stats.products}    icon="📦" />
        <StatCard label="Biomarkers"  value={stats.biomarkers}  icon="🩸" />
        <StatCard label="Orders"      value={stats.orders}      icon="🛒" />
        <StatCard label="Lab Results" value={stats.lab_results} icon="🧪" />
      </div>

      {/* Table Browser */}
      <div className="bg-white rounded-xl border border-[#0e393d]/10 overflow-hidden">

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-[#0e393d]/8">
          <select
            value={selectedTable}
            onChange={(e) => handleTableChange(e.target.value)}
            className="rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm text-[#1c2a2b] focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 cursor-pointer"
          >
            {TABLES.map((t) => (
              <option key={t.name} value={t.name}>{t.label}</option>
            ))}
          </select>

          {result && (
            <span className="inline-flex items-center rounded-full bg-[#0e393d]/8 px-2.5 py-0.5 text-xs font-medium text-[#0e393d]/70">
              {result.count.toLocaleString()} rows
            </span>
          )}

          <form onSubmit={handleSearch} className="ml-auto flex items-center gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search…"
              className="w-52 rounded-lg border border-[#0e393d]/15 px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
                className="text-xs text-[#1c2a2b]/40 hover:text-[#1c2a2b] transition"
              >
                ✕ clear
              </button>
            )}
          </form>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {error && (
            <div className="px-5 py-4 text-sm text-red-700 bg-red-50">{error}</div>
          )}
          {loading && !result && (
            <div className="px-5 py-12 text-center text-sm text-[#1c2a2b]/40">Loading…</div>
          )}
          {result && (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/3">
                  {result.columns.map((col) => (
                    <th
                      key={col}
                      onClick={() => handleSort(col)}
                      className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#0e393d]/60 whitespace-nowrap cursor-pointer hover:text-[#0e393d] select-none"
                    >
                      {col}
                      {sortCol === col && (
                        <span className="ml-1 text-[#ceab84]">{sortAsc ? '↑' : '↓'}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y divide-[#0e393d]/6 ${loading ? 'opacity-50' : ''}`}>
                {result.data.length === 0 && (
                  <tr>
                    <td colSpan={result.columns.length} className="px-4 py-8 text-center text-[#1c2a2b]/40">
                      No rows found.
                    </td>
                  </tr>
                )}
                {result.data.map((row, ri) => (
                  <tr key={ri} className="hover:bg-[#fafaf8] transition-colors">
                    {result.columns.map((col) => (
                      <td key={col} className="px-4 py-2.5 max-w-[260px] align-top">
                        <CellValue value={row[col]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {result && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#0e393d]/8">
            <span className="text-xs text-[#1c2a2b]/50">
              Page {page} of {totalPages} · {result.count.toLocaleString()} total rows
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-2.5 py-1.5 rounded-md text-xs font-medium border border-[#0e393d]/15 disabled:opacity-40 hover:bg-[#fafaf8] transition"
              >
                «
              </button>
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="px-2.5 py-1.5 rounded-md text-xs font-medium border border-[#0e393d]/15 disabled:opacity-40 hover:bg-[#fafaf8] transition"
              >
                ‹
              </button>
              {/* Page number pills */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const p = start + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition ${
                      p === page
                        ? 'bg-[#0e393d] text-white border-[#0e393d]'
                        : 'border-[#0e393d]/15 hover:bg-[#fafaf8]'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                className="px-2.5 py-1.5 rounded-md text-xs font-medium border border-[#0e393d]/15 disabled:opacity-40 hover:bg-[#fafaf8] transition"
              >
                ›
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
                className="px-2.5 py-1.5 rounded-md text-xs font-medium border border-[#0e393d]/15 disabled:opacity-40 hover:bg-[#fafaf8] transition"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
