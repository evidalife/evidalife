'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Profile = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_admin: boolean | null;
  onboarding_completed: boolean | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  date_of_birth: string | null;
  sex: string | null;
  height_cm: number | null;
  street_address: string | null;
  postal_code: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDisplayName(p: Profile): string {
  if (p.display_name) return p.display_name;
  const parts = [p.first_name, p.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : '';
}

function getInitials(p: Profile): string {
  const name = getDisplayName(p);
  if (name) return name.charAt(0).toUpperCase();
  if (p.email) return p.email.charAt(0).toUpperCase();
  return '?';
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('de-CH', { year: 'numeric', month: 'short', day: 'numeric' });
}

async function adminPost(path: string, body: object): Promise<boolean> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.ok;
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
        checked ? 'bg-[#0e393d]' : 'bg-gray-200'
      }`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
    </button>
  );
}

type BadgeColor = 'green' | 'gray' | 'teal' | 'red' | 'amber';
function Badge({ color, children }: { color: BadgeColor; children: React.ReactNode }) {
  const cls: Record<BadgeColor, string> = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    gray:  'bg-gray-50 text-gray-600 ring-gray-500/20',
    teal:  'bg-[#0e393d]/8 text-[#0e393d] ring-[#0e393d]/20',
    red:   'bg-red-50 text-red-700 ring-red-600/20',
    amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${cls[color]}`}>
      {children}
    </span>
  );
}

function UserAvatar({ profile, muted }: { profile: Profile; muted?: boolean }) {
  if (profile.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatar_url.includes('/storage/v1/object/public/')
          ? profile.avatar_url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + '?width=96&height=96&resize=cover'
          : profile.avatar_url}
        alt=""
        className={`w-8 h-8 rounded-full object-cover border border-[#0e393d]/10 shrink-0 ${muted ? 'opacity-40' : ''}`}
      />
    );
  }
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 bg-[#0e393d] ${muted ? 'opacity-40' : ''}`}>
      {getInitials(profile)}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5 text-[#0e393d]/50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-wider text-[#1c2a2b]/40 mb-0.5">{label}</dt>
      <dd className="text-sm text-[#1c2a2b]">{value || <span className="text-[#1c2a2b]/30">—</span>}</dd>
    </div>
  );
}

type UserStats = { orderCount: number; resultCount: number; lastOrderDate: string | null; heScore: number | null };

function UserDetail({ profile }: { profile: Profile }) {
  const supabase = createClient();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('orders').select('id, created_at', { count: 'exact' }).eq('user_id', profile.id).order('created_at', { ascending: false }).limit(1),
      supabase.from('lab_results').select('id', { count: 'exact', head: true }).eq('user_id', profile.id).is('deleted_at', null),
      supabase.from('health_engine_scores').select('overall_score').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]).then(([ordersRes, resultsRes, scoreRes]) => {
      setStats({
        orderCount: ordersRes.count ?? 0,
        resultCount: resultsRes.count ?? 0,
        lastOrderDate: (ordersRes.data?.[0] as any)?.created_at ?? null,
        heScore: (scoreRes.data as any)?.overall_score ?? null,
      });
      setLoadingStats(false);
    });
  }, [profile.id]);

  return (
    <tr className="bg-[#f5f4f0]/60 border-b border-[#0e393d]/8">
      <td colSpan={7} className="px-6 py-5 space-y-5">
        {/* Stats strip */}
        <div className="flex flex-wrap gap-4 pb-4 border-b border-[#0e393d]/8">
          {loadingStats ? (
            <div className="flex items-center gap-1.5 text-xs text-[#1c2a2b]/40"><Spinner /> Loading stats…</div>
          ) : (
            <>
              {[
                { label: 'Orders', value: String(stats?.orderCount ?? 0) },
                { label: 'Lab Results', value: String(stats?.resultCount ?? 0) },
                { label: 'Last Order', value: formatDate(stats?.lastOrderDate) },
                ...(stats?.heScore != null ? [{ label: 'HE Score', value: `${Math.round(stats.heScore)}` }] : []),
              ].map(({ label, value }) => (
                <div key={label} className="text-center min-w-[64px]">
                  <p className="text-base font-semibold text-[#0e393d] tabular-nums">{value}</p>
                  <p className="text-[10px] text-[#1c2a2b]/40 mt-0.5">{label}</p>
                </div>
              ))}
              <a
                href={`/admin/orders?search=${encodeURIComponent(profile.email ?? '')}`}
                className="self-center ml-2 text-xs text-[#0e393d] hover:underline"
              >
                View orders →
              </a>
            </>
          )}
        </div>

        {/* Profile data */}
        <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-4">
          <DetailRow label="Display name"  value={profile.display_name} />
          <DetailRow label="First name"    value={profile.first_name} />
          <DetailRow label="Last name"     value={profile.last_name} />
          <DetailRow label="Email"         value={profile.email} />
          <DetailRow label="Phone"         value={profile.phone} />
          <DetailRow label="Date of birth" value={profile.date_of_birth ? formatDate(profile.date_of_birth) : null} />
          <DetailRow label="Sex"           value={profile.sex} />
          <DetailRow label="Height (cm)"   value={profile.height_cm != null ? String(profile.height_cm) : null} />
          <DetailRow label="Country"       value={profile.country} />
          <DetailRow label="City"          value={profile.city} />
          <DetailRow label="Postal code"   value={profile.postal_code} />
          <DetailRow label="Street"        value={profile.street_address} />
          <DetailRow label="Joined"        value={formatDate(profile.created_at)} />
          <DetailRow label="Last updated"  value={formatDate(profile.updated_at)} />
          {profile.deleted_at && <DetailRow label="Deactivated" value={formatDate(profile.deleted_at)} />}
        </dl>
      </td>
    </tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type FilterType = 'all' | 'admins' | 'members' | 'deactivated';

export default function UsersManager({ initialProfiles }: { initialProfiles: Profile[] }) {
  const supabase = createClient();

  const [profiles, setProfiles]   = useState<Profile[]>(initialProfiles);
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState<FilterType>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Per-row action state
  const [updatingId, setUpdatingId]             = useState<string | null>(null);
  const [toggleError, setToggleError]           = useState<string | null>(null);
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId]     = useState<string | null>(null);
  const [reactivatingId, setReactivatingId]     = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId]   = useState<string | null>(null);
  const [deletingId, setDeletingId]             = useState<string | null>(null);

  // ── Refresh ────────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, display_name, avatar_url, is_admin, onboarding_completed, created_at, updated_at, deleted_at, phone, country, city, date_of_birth, sex, height_cm, street_address, postal_code')
      .order('created_at', { ascending: false })
      .limit(500);
    if (data) setProfiles(data);
  }, [supabase]);

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filtered = profiles.filter((p) => {
    const active = !p.deleted_at;
    if (filter === 'all'         && !active) return false;
    if (filter === 'admins'      && (!active || !p.is_admin)) return false;
    if (filter === 'members'     && (!active || p.is_admin)) return false;
    if (filter === 'deactivated' && active) return false;

    if (search) {
      const q = search.toLowerCase();
      const matches =
        p.email?.toLowerCase().includes(q) ||
        p.first_name?.toLowerCase().includes(q) ||
        p.last_name?.toLowerCase().includes(q) ||
        p.display_name?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });

  // ── Stats (active users only) ──────────────────────────────────────────────

  const active      = profiles.filter((p) => !p.deleted_at);
  const totalUsers  = active.length;
  const adminCount  = active.filter((p) => p.is_admin).length;
  const memberCount = active.filter((p) => !p.is_admin).length;

  // ── Actions ────────────────────────────────────────────────────────────────

  const toggleAdmin = async (p: Profile) => {
    setUpdatingId(p.id);
    setToggleError(null);
    const newValue = !p.is_admin;
    const res = await fetch('/api/admin/toggle-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: p.id, isAdmin: newValue }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setToggleError(body.error ?? 'Failed to update admin status');
    } else {
      await refresh();
    }
    setUpdatingId(null);
  };

  const deactivate = async (userId: string) => {
    setDeactivatingId(userId);
    if (await adminPost('/api/admin/deactivate-user', { userId })) {
      await refresh();
      if (expandedId === userId) setExpandedId(null);
    }
    setDeactivatingId(null);
    setConfirmDeactivateId(null);
  };

  const reactivate = async (userId: string) => {
    setReactivatingId(userId);
    if (await adminPost('/api/admin/reactivate-user', { userId })) await refresh();
    setReactivatingId(null);
  };

  const deleteUser = async (userId: string) => {
    setDeletingId(userId);
    if (await adminPost('/api/admin/delete-user', { userId })) {
      setProfiles((prev) => prev.filter((p) => p.id !== userId));
      if (expandedId === userId) setExpandedId(null);
    }
    setDeletingId(null);
    setConfirmDeleteId(null);
  };

  // ─────────────────────────────────────────────────────────────────────────────

  const isDeactivatedView = filter === 'deactivated';

  return (
    <div className="p-8">

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-[#0e393d]">Users</h1>
        <p className="mt-0.5 text-sm text-[#1c2a2b]/50">View registered users and manage account details.</p>
      </div>

      {/* Stats strip — active users only */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total users', value: totalUsers },
          { label: 'Admins',      value: adminCount  },
          { label: 'Members',     value: memberCount },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-[#0e393d]/10 bg-white px-5 py-4">
            <p className="text-2xl font-semibold text-[#0e393d] tabular-nums">{stat.value}</p>
            <p className="mt-0.5 text-xs text-[#1c2a2b]/50">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search + filter pills */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
        />
        <div className="flex gap-1.5">
          {([
            { key: 'all',         label: 'All'         },
            { key: 'admins',      label: 'Admins'      },
            { key: 'members',     label: 'Members'     },
            { key: 'deactivated', label: 'Deactivated' },
          ] as { key: FilterType; label: string }[]).map((pill) => (
            <button
              key={pill.key}
              onClick={() => setFilter(pill.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                filter === pill.key
                  ? pill.key === 'deactivated'
                    ? 'bg-red-600 text-white'
                    : 'bg-[#0e393d] text-white'
                  : 'bg-[#0e393d]/8 text-[#0e393d]/70 hover:bg-[#0e393d]/15'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {toggleError && (
        <div className="mb-3 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          Admin toggle failed: {toggleError}
        </div>
      )}
      <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/3">
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Display name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">
                {isDeactivatedView ? 'Status' : 'Role'}
              </th>
              {!isDeactivatedView && (
                <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Admin</th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Joined</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">
                {isDeactivatedView ? 'Deactivated on' : 'Last updated'}
              </th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0e393d]/6">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-[#1c2a2b]/40">
                  No users found.
                </td>
              </tr>
            )}
            {filtered.map((profile) => {
              const isExpanded        = expandedId === profile.id;
              const isDeactivated     = !!profile.deleted_at;
              const isConfirmDeact    = confirmDeactivateId === profile.id;
              const isDeactivating    = deactivatingId === profile.id;
              const isReactivating    = reactivatingId === profile.id;
              const isConfirmDel      = confirmDeleteId === profile.id;
              const isDeleting        = deletingId === profile.id;

              return (
                <Fragment key={profile.id}>
                  <tr
                    onClick={() => setExpandedId(isExpanded ? null : profile.id)}
                    className={`transition-colors cursor-pointer ${isDeactivated ? 'bg-gray-50/50 hover:bg-gray-50' : 'hover:bg-[#fafaf8]'}`}
                  >
                    {/* User: avatar + real name + email */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar profile={profile} muted={isDeactivated} />
                        <div className={isDeactivated ? 'opacity-50' : ''}>
                          {(profile.first_name || profile.last_name) ? (
                            <>
                              <div className="font-medium text-[#0e393d]">
                                {[profile.first_name, profile.last_name].filter(Boolean).join(' ')}
                              </div>
                              <div className="text-xs text-[#1c2a2b]/50 mt-0.5">{profile.email ?? '—'}</div>
                            </>
                          ) : (
                            <div className="font-medium text-[#0e393d]">{profile.email ?? '—'}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Display name */}
                    <td className={`px-4 py-3 text-sm ${isDeactivated ? 'text-[#1c2a2b]/30' : 'text-[#1c2a2b]/70'}`}>
                      {profile.display_name ?? <span className="text-[#1c2a2b]/25">—</span>}
                    </td>

                    {/* Role / Status badge */}
                    <td className="px-4 py-3">
                      {isDeactivated
                        ? <Badge color="red">Deactivated</Badge>
                        : profile.is_admin
                          ? <Badge color="teal">Admin</Badge>
                          : <Badge color="gray">Member</Badge>
                      }
                    </td>

                    {/* Admin toggle (active users only) */}
                    {!isDeactivatedView && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Toggle
                            checked={profile.is_admin ?? false}
                            onChange={() => toggleAdmin(profile)}
                          />
                          {updatingId === profile.id && <Spinner />}
                        </div>
                      </td>
                    )}

                    {/* Joined */}
                    <td className={`px-4 py-3 text-xs tabular-nums ${isDeactivated ? 'text-[#1c2a2b]/30' : 'text-[#1c2a2b]/50'}`}>
                      {formatDate(profile.created_at)}
                    </td>

                    {/* Last updated / Deactivated on */}
                    <td className={`px-4 py-3 text-xs tabular-nums ${isDeactivated ? 'text-[#1c2a2b]/30' : 'text-[#1c2a2b]/50'}`}>
                      {isDeactivated ? formatDate(profile.deleted_at) : formatDate(profile.updated_at)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {isDeactivated ? (
                        /* Deactivated row actions: Reactivate + Delete forever */
                        isConfirmDel ? (
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => deleteUser(profile.id)}
                              disabled={isDeleting}
                              className="text-[11px] font-medium text-red-600 hover:text-red-800 transition disabled:opacity-50 flex items-center gap-1"
                            >
                              {isDeleting ? <Spinner /> : 'Delete forever'}
                            </button>
                            <span className="text-[#1c2a2b]/20">|</span>
                            <button onClick={() => setConfirmDeleteId(null)} className="text-[11px] text-[#1c2a2b]/50 hover:text-[#1c2a2b] transition">
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => reactivate(profile.id)}
                              disabled={isReactivating}
                              className="text-[11px] font-medium text-emerald-600 hover:text-emerald-800 transition disabled:opacity-50 flex items-center gap-1"
                            >
                              {isReactivating ? <Spinner /> : 'Reactivate'}
                            </button>
                            <span className="text-[#1c2a2b]/20">|</span>
                            <button
                              onClick={() => setConfirmDeleteId(profile.id)}
                              className="text-[11px] text-red-400 hover:text-red-600 transition"
                            >
                              Delete
                            </button>
                          </div>
                        )
                      ) : (
                        /* Active row action: Deactivate */
                        isConfirmDeact ? (
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => deactivate(profile.id)}
                              disabled={isDeactivating}
                              className="text-[11px] font-medium text-amber-700 hover:text-amber-900 transition disabled:opacity-50 flex items-center gap-1"
                            >
                              {isDeactivating ? <Spinner /> : 'Deactivate'}
                            </button>
                            <span className="text-[#1c2a2b]/20">|</span>
                            <button onClick={() => setConfirmDeactivateId(null)} className="text-[11px] text-[#1c2a2b]/50 hover:text-[#1c2a2b] transition">
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeactivateId(profile.id)}
                            className="text-[#1c2a2b]/25 hover:text-amber-600 transition-colors p-1 rounded"
                            title="Deactivate user"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/>
                              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                            </svg>
                          </button>
                        )
                      )}
                    </td>
                  </tr>

                  {isExpanded && <UserDetail profile={profile} />}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
