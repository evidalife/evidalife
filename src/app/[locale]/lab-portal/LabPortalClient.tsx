'use client';

import { useState, useEffect, useCallback } from 'react';
import type { LabSession } from '@/lib/lab-auth';

interface Voucher {
  id: string;
  voucher_code: string;
  status: string;
  product_type: string | null;
  issued_at: string;
  redeemed_at: string | null;
  expires_at: string | null;
  orders?: {
    order_number: string;
    profiles?: { first_name: string | null; last_name: string | null; email: string | null };
  };
}

interface RedeemResult {
  valid: boolean;
  voucher?: { code: string; status: string; product_type?: string };
  customer?: { name: string; email: string };
  order_number?: string;
  error?: string;
}

export default function LabPortalClient({
  locale,
  initialSession,
}: {
  locale: string;
  initialSession: LabSession | null;
}) {
  const [session, setSession] = useState<LabSession | null>(initialSession);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);

  const [scanCode, setScanCode] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [redeemResult, setRedeemResult] = useState<RedeemResult | null>(null);

  const [tab, setTab] = useState<'scan' | 'history' | 'earnings'>('scan');

  // Earnings state
  type EarningsSummary = { pending_payout: number; total_paid: number; total_earned: number; pending_count: number; total_count: number; currency: string };
  type EarningsItem = { id: string; product_name: string; lab_payout_amount: number; currency: string; status: string; created_at: string };
  type EarningsBatch = { id: string; batch_number: string; period_from: string; period_to: string; total_lab_payout: number; item_count: number; currency: string; paid_at: string | null };
  const [earnings, setEarnings] = useState<{ summary: EarningsSummary; recent_items: EarningsItem[]; batches: EarningsBatch[] } | null>(null);
  const [loadingEarnings, setLoadingEarnings] = useState(false);

  const loadEarnings = useCallback(async () => {
    setLoadingEarnings(true);
    try {
      const res = await fetch('/api/lab-portal/settlements');
      if (res.ok) setEarnings(await res.json());
    } catch { /* ignore */ }
    setLoadingEarnings(false);
  }, []);

  useEffect(() => {
    if (session && tab === 'earnings') loadEarnings();
  }, [session, tab, loadEarnings]);

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/lab-portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Login failed');
        return;
      }
      setSession(data.lab);
    } catch {
      setLoginError('Network error');
    } finally {
      setLoginLoading(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    await fetch('/api/lab-portal/logout', { method: 'POST' });
    setSession(null);
    setVouchers([]);
  };

  // Load voucher history
  const loadVouchers = useCallback(async () => {
    setLoadingVouchers(true);
    try {
      const res = await fetch('/api/lab-portal/vouchers');
      const data = await res.json();
      setVouchers(data.vouchers ?? []);
    } catch { /* ignore */ }
    setLoadingVouchers(false);
  }, []);

  useEffect(() => {
    if (session && tab === 'history') loadVouchers();
  }, [session, tab, loadVouchers]);

  // Redeem voucher
  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanCode.trim()) return;
    setScanLoading(true);
    setRedeemResult(null);
    try {
      const res = await fetch('/api/lab-portal/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: scanCode.trim() }),
      });
      const data = await res.json();
      setRedeemResult(data);
      if (data.valid) setScanCode('');
    } catch {
      setRedeemResult({ valid: false, error: 'Network error' });
    }
    setScanLoading(false);
  };

  const fmtDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(locale === 'de' ? 'de-CH' : 'en-US', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  };

  // ── Login screen ──────────────────────────────────────────────
  if (!session) {
    return (
      <div className="min-h-screen bg-[#0e393d] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl text-white mb-2">Lab Portal</h1>
            <p className="text-white/40 text-sm">Evida Life Partner Access</p>
          </div>
          <form onSubmit={handleLogin} className="bg-white rounded-2xl p-8 shadow-xl space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#0e393d]/60 uppercase tracking-wide mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-[#0e393d]/15 text-sm focus:outline-none focus:ring-2 focus:ring-[#ceab84]/40"
                placeholder="lab-username"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0e393d]/60 uppercase tracking-wide mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-[#0e393d]/15 text-sm focus:outline-none focus:ring-2 focus:ring-[#ceab84]/40"
                placeholder="••••••••"
              />
            </div>
            {loginError && (
              <p className="text-sm text-red-600">{loginError}</p>
            )}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 rounded-lg bg-[#0e393d] text-white font-medium hover:bg-[#0e393d]/90 transition-colors disabled:opacity-50"
            >
              {loginLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#fafaf8]">
      {/* Top bar */}
      <header className="bg-[#0e393d] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-serif text-lg text-white">Lab Portal</span>
          <span className="text-xs text-[#ceab84] bg-[#ceab84]/15 px-2 py-1 rounded-full">{session.labName}</span>
        </div>
        <button onClick={handleLogout} className="text-xs text-white/50 hover:text-white transition-colors">
          Sign out
        </button>
      </header>

      <div className="max-w-[900px] mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-[#0e393d]/5 p-1 rounded-lg w-fit">
          <button
            onClick={() => setTab('scan')}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === 'scan' ? 'bg-white text-[#0e393d] shadow-sm' : 'text-[#0e393d]/50 hover:text-[#0e393d]'
            }`}
          >
            Scan Voucher
          </button>
          <button
            onClick={() => setTab('history')}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === 'history' ? 'bg-white text-[#0e393d] shadow-sm' : 'text-[#0e393d]/50 hover:text-[#0e393d]'
            }`}
          >
            Voucher History
          </button>
          <button
            onClick={() => setTab('earnings')}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === 'earnings' ? 'bg-white text-[#0e393d] shadow-sm' : 'text-[#0e393d]/50 hover:text-[#0e393d]'
            }`}
          >
            Earnings
          </button>
        </div>

        {/* ── Scan tab ──────────────────────────────────────────── */}
        {tab === 'scan' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-[#0e393d]/10 p-8">
              <h2 className="font-serif text-xl text-[#0e393d] mb-1">Validate & Redeem Voucher</h2>
              <p className="text-sm text-[#1c2a2b]/50 mb-6">Enter the customer&apos;s voucher code to validate and redeem it.</p>

              <form onSubmit={handleRedeem} className="flex gap-3">
                <input
                  type="text"
                  value={scanCode}
                  onChange={e => setScanCode(e.target.value.toUpperCase())}
                  placeholder="EV-XXXX-XXXX"
                  className="flex-1 px-4 py-3 rounded-lg border border-[#0e393d]/15 text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-[#ceab84]/40"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={scanLoading || !scanCode.trim()}
                  className="px-8 py-3 rounded-lg bg-[#0e393d] text-white font-medium hover:bg-[#0e393d]/90 transition-colors disabled:opacity-50"
                >
                  {scanLoading ? 'Checking…' : 'Redeem'}
                </button>
              </form>
            </div>

            {/* Result */}
            {redeemResult && (
              <div className={`rounded-2xl border p-6 ${
                redeemResult.valid
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                {redeemResult.valid ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                      </div>
                      <div>
                        <p className="font-semibold text-emerald-800">Voucher Redeemed Successfully</p>
                        <p className="text-xs text-emerald-600 font-mono">{redeemResult.voucher?.code}</p>
                      </div>
                    </div>
                    {redeemResult.customer && (
                      <div className="text-sm text-emerald-700 space-y-1 pl-[52px]">
                        <p>Customer: <span className="font-medium">{redeemResult.customer.name}</span></p>
                        <p>Email: {redeemResult.customer.email}</p>
                        <p>Order: {redeemResult.order_number}</p>
                        {redeemResult.voucher?.product_type && (
                          <p>Test: <span className="font-medium capitalize">{redeemResult.voucher.product_type.replace(/_/g, ' ')}</span></p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-red-800">{redeemResult.error || 'Invalid voucher'}</p>
                      {redeemResult.voucher && (
                        <p className="text-xs text-red-600">Status: {redeemResult.voucher.status}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Earnings tab ──────────────────────────────────────── */}
        {tab === 'earnings' && (
          <div className="space-y-6">
            {loadingEarnings ? (
              <div className="bg-white rounded-2xl border border-[#0e393d]/10 p-8 text-center text-sm text-[#0e393d]/40">Loading…</div>
            ) : !earnings ? (
              <div className="bg-white rounded-2xl border border-[#0e393d]/10 p-8 text-center text-sm text-[#0e393d]/40">Unable to load earnings data</div>
            ) : (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-2xl border border-[#0e393d]/10 p-6 text-center">
                    <p className="text-xs uppercase tracking-wider text-amber-600/70 mb-1">Pending Payout</p>
                    <p className="text-2xl font-serif text-amber-700">{earnings.summary.pending_payout.toFixed(2)}</p>
                    <p className="text-xs text-[#0e393d]/40 mt-1">{earnings.summary.currency} · {earnings.summary.pending_count} items</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-[#0e393d]/10 p-6 text-center">
                    <p className="text-xs uppercase tracking-wider text-emerald-600/70 mb-1">Already Paid</p>
                    <p className="text-2xl font-serif text-emerald-700">{earnings.summary.total_paid.toFixed(2)}</p>
                    <p className="text-xs text-[#0e393d]/40 mt-1">{earnings.summary.currency}</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-[#0e393d]/10 p-6 text-center">
                    <p className="text-xs uppercase tracking-wider text-[#0e393d]/50 mb-1">Total Earned</p>
                    <p className="text-2xl font-serif text-[#0e393d]">{earnings.summary.total_earned.toFixed(2)}</p>
                    <p className="text-xs text-[#0e393d]/40 mt-1">{earnings.summary.currency} · {earnings.summary.total_count} samples</p>
                  </div>
                </div>

                {/* Recent items */}
                {earnings.recent_items.length > 0 && (
                  <div className="bg-white rounded-2xl border border-[#0e393d]/10 overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#0e393d]/8">
                      <h2 className="font-serif text-lg text-[#0e393d]">Recent Earnings</h2>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs uppercase tracking-wide text-[#0e393d]/40 border-b border-[#0e393d]/5">
                          <th className="text-left px-6 py-3 font-medium">Date</th>
                          <th className="text-left px-4 py-3 font-medium">Product</th>
                          <th className="text-right px-4 py-3 font-medium">Your Share</th>
                          <th className="text-left px-4 py-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {earnings.recent_items.map(item => (
                          <tr key={item.id} className="border-b border-[#0e393d]/5 last:border-0">
                            <td className="px-6 py-3 text-[#0e393d]/60">{fmtDate(item.created_at)}</td>
                            <td className="px-4 py-3 text-[#0e393d]">{item.product_name}</td>
                            <td className="px-4 py-3 text-right font-medium">{Number(item.lab_payout_amount).toFixed(2)} {item.currency}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                item.status === 'paid' ? 'bg-emerald-50 text-emerald-700' :
                                item.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                                'bg-gray-100 text-gray-500'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Past settlement batches */}
                {earnings.batches.length > 0 && (
                  <div className="bg-white rounded-2xl border border-[#0e393d]/10 overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#0e393d]/8">
                      <h2 className="font-serif text-lg text-[#0e393d]">Payout History</h2>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs uppercase tracking-wide text-[#0e393d]/40 border-b border-[#0e393d]/5">
                          <th className="text-left px-6 py-3 font-medium">Batch</th>
                          <th className="text-left px-4 py-3 font-medium">Period</th>
                          <th className="text-right px-4 py-3 font-medium">Amount</th>
                          <th className="text-left px-4 py-3 font-medium">Paid On</th>
                        </tr>
                      </thead>
                      <tbody>
                        {earnings.batches.map(b => (
                          <tr key={b.id} className="border-b border-[#0e393d]/5 last:border-0">
                            <td className="px-6 py-3 font-mono text-xs">{b.batch_number}</td>
                            <td className="px-4 py-3 text-[#0e393d]/60">{b.period_from} — {b.period_to}</td>
                            <td className="px-4 py-3 text-right font-medium text-emerald-700">
                              {Number(b.total_lab_payout).toFixed(2)} {b.currency}
                            </td>
                            <td className="px-4 py-3 text-[#0e393d]/60">{fmtDate(b.paid_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {earnings.summary.total_count === 0 && (
                  <div className="bg-white rounded-2xl border border-[#0e393d]/10 p-8 text-center text-sm text-[#0e393d]/40">
                    No earnings yet. Earnings appear here when you redeem vouchers.
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── History tab ───────────────────────────────────────── */}
        {tab === 'history' && (
          <div className="bg-white rounded-2xl border border-[#0e393d]/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-[#0e393d]/8 flex items-center justify-between">
              <h2 className="font-serif text-lg text-[#0e393d]">Voucher History</h2>
              <button onClick={loadVouchers} className="text-xs text-[#0e393d]/50 hover:text-[#0e393d]">
                Refresh
              </button>
            </div>
            {loadingVouchers ? (
              <div className="p-8 text-center text-sm text-[#0e393d]/40">Loading…</div>
            ) : vouchers.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#0e393d]/40">No vouchers found</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-[#0e393d]/40 border-b border-[#0e393d]/5">
                    <th className="text-left px-6 py-3 font-medium">Code</th>
                    <th className="text-left px-4 py-3 font-medium">Customer</th>
                    <th className="text-left px-4 py-3 font-medium">Order</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Issued</th>
                    <th className="text-left px-4 py-3 font-medium">Redeemed</th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map(v => {
                    const profile = (v.orders as any)?.profiles;
                    const customerName = profile
                      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                      : '—';

                    return (
                      <tr key={v.id} className="border-b border-[#0e393d]/5 hover:bg-[#fafaf8]/50">
                        <td className="px-6 py-3 font-mono text-xs tracking-wide">{v.voucher_code}</td>
                        <td className="px-4 py-3 text-[#0e393d]">{customerName}</td>
                        <td className="px-4 py-3 text-[#0e393d]/60">{(v.orders as any)?.order_number ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            v.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                            v.status === 'redeemed' ? 'bg-blue-50 text-blue-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {v.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#0e393d]/50">{fmtDate(v.issued_at)}</td>
                        <td className="px-4 py-3 text-[#0e393d]/50">{fmtDate(v.redeemed_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
