'use client';

import { useState, useMemo } from 'react';
import PageShell from '@/components/admin/PageShell';

interface Plan {
  id: string;
  slug: string;
  name: string;
  price_monthly_eur: number;
  monthly_credits: number;
  voice_minutes_per_month: number;
  audio_briefings: boolean;
  pdf_exports_per_month: number;
  research_queries_per_day: number;
  live_voice_enabled: boolean;
  text_messages_per_day: number;
}

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface Subscription {
  user_id: string;
  plan_id: string;
  status: string;
  subscription_plans: { slug: string; name: string } | null;
}

interface UserCredit {
  user_id: string;
  total_credits: number;
  used_credits: number;
  bonus_credits: number;
  voice_minutes_total: number;
  voice_minutes_used: number;
  reset_date: string;
}

interface UsageEntry {
  user_id: string | null;
  estimated_cost_usd: number;
  endpoint: string;
  provider: string;
}

export default function AICreditsManager({
  plans,
  users,
  subscriptions,
  credits,
  monthlyUsage,
}: {
  plans: Plan[];
  users: UserProfile[];
  subscriptions: Subscription[];
  credits: UserCredit[];
  monthlyUsage: UsageEntry[];
}) {
  const [search, setSearch] = useState('');
  const [addingCreditsFor, setAddingCreditsFor] = useState<string | null>(null);
  const [bonusAmount, setBonusAmount] = useState(10);
  const [bonusReason, setBonusReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Build lookup maps
  const subMap = useMemo(() => {
    const m: Record<string, Subscription> = {};
    subscriptions.forEach(s => { m[s.user_id] = s; });
    return m;
  }, [subscriptions]);

  const creditMap = useMemo(() => {
    const m: Record<string, UserCredit> = {};
    credits.forEach(c => { m[c.user_id] = c; });
    return m;
  }, [credits]);

  const costMap = useMemo(() => {
    const m: Record<string, number> = {};
    monthlyUsage.forEach(u => {
      if (u.user_id) {
        m[u.user_id] = (m[u.user_id] || 0) + (u.estimated_cost_usd || 0);
      }
    });
    return m;
  }, [monthlyUsage]);

  // Stats
  const totalCost = monthlyUsage.reduce((sum, u) => sum + (u.estimated_cost_usd || 0), 0);
  const totalCreditsUsed = credits.reduce((sum, c) => sum + c.used_credits, 0);
  const activeSubCount = subscriptions.filter(s => s.status === 'active').length;

  // Filter users
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(u =>
      (u.first_name?.toLowerCase().includes(q)) ||
      (u.last_name?.toLowerCase().includes(q)) ||
      (u.email?.toLowerCase().includes(q))
    );
  }, [users, search]);

  const addBonus = async (userId: string) => {
    setActionLoading(true);
    try {
      await fetch('/api/admin/ai-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_bonus', user_id: userId, amount: bonusAmount, reason: bonusReason || 'Admin bonus' }),
      });
      // Refresh would happen on page reload
      setAddingCreditsFor(null);
      setBonusAmount(10);
      setBonusReason('');
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
    setActionLoading(false);
  };

  const resetCredits = async (userId: string) => {
    if (!confirm('Reset this user\'s credits to their plan allocation?')) return;
    setActionLoading(true);
    try {
      await fetch('/api/admin/ai-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', user_id: userId }),
      });
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
    setActionLoading(false);
  };

  const planBadgeColor = (slug: string) => {
    if (slug === 'premium') return 'bg-[#ceab84]/15 text-[#8B7355]';
    if (slug === 'standard') return 'bg-[#0C9C6C]/10 text-[#0C9C6C]';
    return 'bg-[#0e393d]/[.06] text-[#0e393d]/50';
  };

  return (
    <PageShell
      title="AI Credits & Subscriptions"
      description="Manage user credit balances, subscription plans, and voice minutes."
    >
      <div className="space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: users.length, color: 'text-[#0e393d]' },
            { label: 'Active Subscriptions', value: activeSubCount, color: 'text-[#0C9C6C]' },
            { label: 'Credits Used (this month)', value: totalCreditsUsed.toLocaleString(), color: 'text-[#0e393d]' },
            { label: 'Est. Cost (this month)', value: `$${totalCost.toFixed(2)}`, color: 'text-[#ceab84]' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-[#0e393d]/[.07] p-4">
              <div className="text-[11px] text-[#1c2a2b]/40 mb-1">{stat.label}</div>
              <div className={`text-[22px] font-bold ${stat.color}`}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Plans */}
        <div className="bg-white rounded-xl border border-[#0e393d]/[.07] p-6">
          <h2 className="text-[13px] font-semibold text-[#0e393d] mb-4">Subscription Plans</h2>
          <div className="grid grid-cols-3 gap-4">
            {plans.map(plan => (
              <div key={plan.id} className={`rounded-xl border-2 p-5 ${
                plan.slug === 'premium' ? 'border-[#ceab84]/40 bg-[#ceab84]/[.03]' :
                plan.slug === 'standard' ? 'border-[#0C9C6C]/20 bg-[#0C9C6C]/[.02]' :
                'border-[#0e393d]/[.08] bg-white'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[14px] font-bold text-[#0e393d]">{plan.name}</h3>
                  <span className="text-[12px] font-semibold text-[#0e393d]">
                    {plan.price_monthly_eur > 0 ? `€${plan.price_monthly_eur}/mo` : 'Free'}
                  </span>
                </div>
                <div className="space-y-1.5 text-[11px] text-[#1c2a2b]/50">
                  <div className="flex justify-between">
                    <span>Monthly credits</span>
                    <span className="font-semibold text-[#0e393d]">{plan.monthly_credits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Voice minutes</span>
                    <span className="font-semibold text-[#0e393d]">{plan.voice_minutes_per_month || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Text messages/day</span>
                    <span className="font-semibold text-[#0e393d]">{plan.text_messages_per_day === 0 ? '∞' : plan.text_messages_per_day}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Audio briefings</span>
                    <span className="font-semibold text-[#0e393d]">{plan.audio_briefings ? '✓' : '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PDF exports/mo</span>
                    <span className="font-semibold text-[#0e393d]">{plan.pdf_exports_per_month === 0 ? '∞' : (plan.pdf_exports_per_month || '—')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Research queries/day</span>
                    <span className="font-semibold text-[#0e393d]">{plan.research_queries_per_day === 0 ? '∞' : plan.research_queries_per_day}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Live voice</span>
                    <span className="font-semibold text-[#0e393d]">{plan.live_voice_enabled ? '✓' : '—'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Credits Table */}
        <div className="bg-white rounded-xl border border-[#0e393d]/[.07] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-semibold text-[#0e393d]">User Credits</h2>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#0e393d]/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-[12px] rounded-lg border border-[#0e393d]/[.12] bg-[#fafaf8] outline-none focus:border-[#0e393d]/30 transition-colors w-60"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[#0e393d]/[.06]">
                  <th className="text-left py-2 px-2 text-[11px] font-medium text-[#1c2a2b]/40">User</th>
                  <th className="text-left py-2 px-2 text-[11px] font-medium text-[#1c2a2b]/40">Plan</th>
                  <th className="text-left py-2 px-2 text-[11px] font-medium text-[#1c2a2b]/40">Credits</th>
                  <th className="text-left py-2 px-2 text-[11px] font-medium text-[#1c2a2b]/40">Voice Min</th>
                  <th className="text-left py-2 px-2 text-[11px] font-medium text-[#1c2a2b]/40">Cost/mo</th>
                  <th className="text-left py-2 px-2 text-[11px] font-medium text-[#1c2a2b]/40">Resets</th>
                  <th className="text-right py-2 px-2 text-[11px] font-medium text-[#1c2a2b]/40">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => {
                  const sub = subMap[user.id];
                  const cred = creditMap[user.id];
                  const cost = costMap[user.id] || 0;
                  const planSlug = (sub?.subscription_plans as any)?.slug ?? 'free';
                  const planName = (sub?.subscription_plans as any)?.name ?? 'Free';

                  return (
                    <tr key={user.id} className="border-b border-[#0e393d]/[.04] hover:bg-[#0e393d]/[.01] transition-colors">
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-[#0e393d]/10 flex items-center justify-center text-[9px] font-bold text-[#0e393d]/40">
                              {(user.first_name?.[0] || '?').toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-[#0e393d]">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-[10px] text-[#1c2a2b]/30">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${planBadgeColor(planSlug)}`}>
                          {planName}
                        </span>
                      </td>
                      <td className="py-2.5 px-2">
                        {cred ? (
                          <div>
                            <span className="font-semibold text-[#0e393d]">{cred.used_credits}</span>
                            <span className="text-[#1c2a2b]/30">/{cred.total_credits + cred.bonus_credits}</span>
                            {cred.bonus_credits > 0 && (
                              <span className="ml-1 text-[9px] text-[#ceab84]">+{cred.bonus_credits} bonus</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#1c2a2b]/20">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2">
                        {cred && cred.voice_minutes_total > 0 ? (
                          <span>
                            <span className="font-semibold text-[#0e393d]">{parseFloat(String(cred.voice_minutes_used)).toFixed(1)}</span>
                            <span className="text-[#1c2a2b]/30">/{cred.voice_minutes_total}</span>
                          </span>
                        ) : (
                          <span className="text-[#1c2a2b]/20">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2">
                        <span className={cost > 1 ? 'font-semibold text-[#ceab84]' : 'text-[#1c2a2b]/40'}>
                          ${cost.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-[10px] text-[#1c2a2b]/30">
                        {cred ? new Date(cred.reset_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setAddingCreditsFor(addingCreditsFor === user.id ? null : user.id)}
                            className="text-[10px] font-medium px-2 py-1 rounded-md border border-[#0C9C6C]/20 text-[#0C9C6C] hover:bg-[#0C9C6C]/[.05] transition-colors"
                          >
                            + Credits
                          </button>
                          <button
                            onClick={() => resetCredits(user.id)}
                            disabled={actionLoading}
                            className="text-[10px] font-medium px-2 py-1 rounded-md border border-[#0e393d]/10 text-[#0e393d]/40 hover:text-[#0e393d]/60 hover:bg-[#0e393d]/[.03] transition-colors disabled:opacity-40"
                          >
                            Reset
                          </button>
                        </div>
                        {/* Add Credits inline form */}
                        {addingCreditsFor === user.id && (
                          <div className="mt-2 p-3 bg-[#0C9C6C]/[.03] border border-[#0C9C6C]/10 rounded-lg text-left">
                            <div className="flex items-center gap-2 mb-2">
                              <input
                                type="number"
                                min={1}
                                value={bonusAmount}
                                onChange={e => setBonusAmount(parseInt(e.target.value) || 0)}
                                className="w-16 px-2 py-1 text-[11px] rounded border border-[#0e393d]/[.12] bg-white outline-none"
                                placeholder="10"
                              />
                              <span className="text-[10px] text-[#1c2a2b]/40">credits</span>
                            </div>
                            <input
                              type="text"
                              value={bonusReason}
                              onChange={e => setBonusReason(e.target.value)}
                              placeholder="Reason (optional)"
                              className="w-full px-2 py-1 text-[11px] rounded border border-[#0e393d]/[.12] bg-white outline-none mb-2"
                            />
                            <button
                              onClick={() => addBonus(user.id)}
                              disabled={actionLoading || bonusAmount <= 0}
                              className="text-[10px] font-medium px-3 py-1 rounded-md bg-[#0C9C6C] text-white hover:bg-[#0C9C6C]/90 disabled:opacity-40 transition-colors"
                            >
                              {actionLoading ? 'Adding...' : 'Add Bonus Credits'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-[12px] text-[#1c2a2b]/30">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </PageShell>
  );
}
