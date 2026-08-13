'use client';
import { useState, useEffect, useCallback } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { BopSelect } from '@/components/BopSelect';

// ─── Types ───────────────────────────────────────────────────────────────────
type Tab = 'dashboard' | 'user_reports' | 'access_explorer' | 'activity' | 'audit';

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin', platform_admin: 'Platform Admin',
  tenant_manager: 'Tenant Mgr', editor: 'Editor', viewer: 'Viewer',
};
const ROLE_COLOR: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-700', platform_admin: 'bg-orange-100 text-orange-700',
  tenant_manager: 'bg-purple-100 text-purple-700', editor: 'bg-blue-100 text-blue-700',
  viewer: 'bg-slate-100 text-slate-600',
};
const ACTION_COLOR: Record<string, string> = {
  USER_CREATED: 'bg-emerald-100 text-emerald-700', ROLE_CHANGED: 'bg-blue-100 text-blue-700',
  USER_LOCKED: 'bg-red-100 text-red-700', USER_UNLOCKED: 'bg-emerald-100 text-emerald-700',
  STATUS_CHANGED: 'bg-amber-100 text-amber-700', PW_RESET: 'bg-purple-100 text-purple-700',
};

function timeAgo(iso: string | null) {
  if (!iso) return 'Never';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return 'Today'; if (d === 1) return 'Yesterday';
  if (d < 30) return `${d}d ago`; if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color ?? 'text-slate-900'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

// ─── User Row ────────────────────────────────────────────────────────────────
function UserRow({ u }: { u: any }) {
  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-2.5">
        <p className="text-sm font-medium text-slate-800">{u.email}</p>
        {(u.first_name || u.last_name) && (
          <p className="text-xs text-slate-400">{`${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()}</p>
        )}
      </td>
      <td className="px-4 py-2.5">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_COLOR[u.role] ?? 'bg-slate-100 text-slate-500'}`}>
          {ROLE_LABEL[u.role] ?? u.role ?? '—'}
        </span>
      </td>
      <td className="px-4 py-2.5 text-xs text-slate-500">{timeAgo(u.last_sign_in_at)}</td>
      <td className="px-4 py-2.5 text-xs capitalize text-slate-500">{u.status ?? 'active'}</td>
      <td className="px-4 py-2.5 text-xs text-slate-400">{u.department || '—'}</td>
    </tr>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function SuimPage() {
  const [tab, setTab] = useState<Tab>('dashboard');

  // Dashboard
  const [kpi, setKpi] = useState<any>(null);
  const [kpiLoading, setKpiLoading] = useState(true);

  // User Reports
  const [report, setReport] = useState('dormant');
  const [reportRole, setReportRole] = useState('viewer');
  const [reportUsers, setReportUsers] = useState<any[]>([]);
  const [reportLoading, setReportLoading] = useState(false);

  // Access Explorer
  const [explorerMode, setExplorerMode] = useState<'tc' | 'user'>('tc');
  const [explorerInput, setExplorerInput] = useState('');
  const [explorerResult, setExplorerResult] = useState<any>(null);
  const [explorerLoading, setExplorerLoading] = useState(false);

  // Activity
  const [activityRange, setActivityRange] = useState('7d');
  const [activity, setActivity] = useState<any>(null);
  const [activityLoading, setActivityLoading] = useState(false);

  // Audit
  const [auditRows, setAuditRows] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Load dashboard on mount
  useEffect(() => {
    fetch('/api/bop/suim?view=dashboard')
      .then(r => r.json()).then(j => { setKpi(j); setKpiLoading(false); })
      .catch(() => setKpiLoading(false));
  }, []);

  const loadReport = useCallback(async (r: string, role?: string) => {
    setReportLoading(true);
    const params = new URLSearchParams({ view: 'user_reports', report: r });
    if (r === 'by_role' && role) params.set('role', role);
    const j = await fetch(`/api/bop/suim?${params}`).then(x => x.json()).catch(() => ({ users: [] }));
    setReportUsers(j.users ?? []);
    setReportLoading(false);
  }, []);

  const loadActivity = useCallback(async (range = activityRange) => {
    setActivityLoading(true);
    const j = await fetch(`/api/bop/suim?view=activity&range=${range}`).then(x => x.json()).catch(() => ({}));
    setActivity(j);
    setActivityLoading(false);
  }, [activityRange]);

  const loadAudit = useCallback(async () => {
    setAuditLoading(true);
    const j = await fetch('/api/bop/suim?view=audit').then(x => x.json()).catch(() => ({ rows: [] }));
    setAuditRows(j.rows ?? []);
    setAuditLoading(false);
  }, []);

  // Load tab data on switch
  useEffect(() => {
    if (tab === 'user_reports') void loadReport(report);
    if (tab === 'activity') void loadActivity();
    if (tab === 'audit') void loadAudit();
  }, [tab, loadActivity, loadAudit, loadReport, report]);

  const runExplorer = async () => {
    if (!explorerInput.trim()) return;
    setExplorerLoading(true);
    const param = explorerMode === 'tc'
      ? `screen_id=${encodeURIComponent(explorerInput.trim().toUpperCase())}`
      : `user_email=${encodeURIComponent(explorerInput.trim())}`;
    const j = await fetch(`/api/bop/suim?view=access_explorer&${param}`).then(x => x.json()).catch(() => ({}));
    setExplorerResult(j);
    setExplorerLoading(false);
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'user_reports', label: 'User Reports' },
    { id: 'access_explorer', label: 'Access Explorer' },
    { id: 'activity', label: 'Activity Intelligence' },
    { id: 'audit', label: 'Audit Center' },
  ];

  return (
    <div>
      <ScreenHeader title="Security Intelligence" description="Security & Access Cockpit" />

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 border-b border-slate-200">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: DASHBOARD ─────────────────────────────────────── */}
      {tab === 'dashboard' && (
        <div>
          {kpiLoading ? (
            <div className="flex h-40 items-center justify-center text-sm text-slate-400">Loading…</div>
          ) : (
            <>
              <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <KpiCard label="Total Users" value={kpi?.total ?? 0} />
                <KpiCard label="Active Today" value={kpi?.activeToday ?? 0} color="text-emerald-600" />
                <KpiCard label="Locked / Suspended" value={kpi?.locked ?? 0} color={kpi?.locked > 0 ? 'text-red-600' : 'text-slate-900'} />
                <KpiCard label="Admins" value={kpi?.admins ?? 0} color="text-orange-600" />
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <KpiCard label="Dormant > 90 days" value={kpi?.dormant ?? 0}
                  sub="Security risk" color={kpi?.dormant > 0 ? 'text-amber-600' : 'text-slate-900'} />
                <KpiCard label="Never Logged In" value={kpi?.neverLoggedIn ?? 0}
                  sub="Provisioned, unused" color="text-slate-500" />
                <KpiCard label="Expiring ≤ 30 days" value={kpi?.expiringSoon ?? 0}
                  sub="Review validity dates" color={kpi?.expiringSoon > 0 ? 'text-amber-600' : 'text-slate-900'} />
                <KpiCard label="Failed Logins Today" value={kpi?.failedLoginsToday ?? 0}
                  sub="Potential intrusion" color={kpi?.failedLoginsToday > 0 ? 'text-red-600' : 'text-slate-900'} />
              </div>

              {/* Alert list */}
              {(kpi?.dormant > 0 || kpi?.locked > 0 || kpi?.expiringSoon > 0) && (
                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
                  <p className="mb-2 text-sm font-semibold text-amber-800">Attention Required</p>
                  <ul className="space-y-1 text-sm text-amber-700">
                    {kpi?.dormant > 0 && <li>· {kpi.dormant} dormant account{kpi.dormant > 1 ? 's' : ''} (no login in 90+ days) — consider deactivating</li>}
                    {kpi?.locked > 0 && <li>· {kpi.locked} locked/suspended account{kpi.locked > 1 ? 's' : ''} — review if intentional</li>}
                    {kpi?.expiringSoon > 0 && <li>· {kpi.expiringSoon} account{kpi.expiringSoon > 1 ? 's' : ''} expiring within 30 days — extend or deactivate</li>}
                    {kpi?.neverLoggedIn > 0 && <li>· {kpi.neverLoggedIn} account{kpi.neverLoggedIn > 1 ? 's' : ''} created but never logged in — review provisioning</li>}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── TAB: USER REPORTS ──────────────────────────────────── */}
      {tab === 'user_reports' && (
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {[
              { id: 'dormant', label: 'Dormant >90d' },
              { id: 'never', label: 'Never Logged In' },
              { id: 'locked', label: 'Locked' },
              { id: 'expiring', label: 'Expiring Soon' },
              { id: 'admins', label: 'Admins Only' },
              { id: 'by_role', label: 'By Role' },
            ].map(r => (
              <button key={r.id} onClick={() => { setReport(r.id); void loadReport(r.id, reportRole); }}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  report === r.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>{r.label}</button>
            ))}
            {report === 'by_role' && (
              <BopSelect value={reportRole} onChange={v => { setReportRole(v); void loadReport('by_role', v); }}
                options={['super_admin','platform_admin','tenant_manager','editor','viewer'].map(r => ({value:r, label:ROLE_LABEL[r]}))}
                placeholder="Select role…" className="w-48" />
            )}
            <span className="ml-auto text-xs text-slate-400">{reportUsers.length} results</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
            {reportLoading ? (
              <div className="flex h-40 items-center justify-center text-sm text-slate-400">Loading…</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left">User / Email</th>
                    <th className="px-4 py-3 text-left">Role</th>
                    <th className="px-4 py-3 text-left">Last Login</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Department</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {reportUsers.length === 0
                    ? <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No users in this report</td></tr>
                    : reportUsers.map(u => <UserRow key={u.id} u={u} />)}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: ACCESS EXPLORER ───────────────────────────────── */}
      {tab === 'access_explorer' && (
        <div>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              <button onClick={() => { setExplorerMode('tc'); setExplorerResult(null); setExplorerInput(''); }}
                className={`px-3 py-1.5 text-sm font-medium ${explorerMode === 'tc' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}>
                TC → Users
              </button>
              <button onClick={() => { setExplorerMode('user'); setExplorerResult(null); setExplorerInput(''); }}
                className={`px-3 py-1.5 text-sm font-medium ${explorerMode === 'user' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}>
                User → TCs
              </button>
            </div>
            <input value={explorerInput} onChange={e => setExplorerInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void runExplorer(); }}
              placeholder={explorerMode === 'tc' ? 'Enter TC code e.g. BO002' : 'Enter email address'}
              className="w-64 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-mono focus:border-blue-400 focus:outline-none" />
            <button onClick={() => { void runExplorer(); }} disabled={explorerLoading || !explorerInput.trim()}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40 hover:bg-blue-700">
              {explorerLoading ? 'Searching…' : 'Search'}
            </button>
          </div>

          {explorerResult && explorerMode === 'tc' && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-center">
                  <p className="text-2xl font-bold text-slate-900">{explorerResult.total_opens ?? 0}</p>
                  <p className="text-xs text-slate-400">Total Opens</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-center">
                  <p className="text-2xl font-bold text-slate-900">{explorerResult.users?.length ?? 0}</p>
                  <p className="text-xs text-slate-400">Unique Users</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-center">
                  <p className="text-2xl font-bold text-slate-900">{explorerResult.roles?.length ?? 0}</p>
                  <p className="text-xs text-slate-400">Roles with Access</p>
                </div>
              </div>
              {explorerResult.roles?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-semibold text-slate-400 self-center">Roles:</span>
                  {explorerResult.roles.map((r: string) => (
                    <span key={r} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLOR[r] ?? 'bg-slate-100 text-slate-600'}`}>{ROLE_LABEL[r] ?? r}</span>
                  ))}
                </div>
              )}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="border-b border-slate-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Users who accessed this screen
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
                    <tr>
                      <th className="px-4 py-2 text-left">Email</th>
                      <th className="px-4 py-2 text-left">Tenant</th>
                      <th className="px-4 py-2 text-left">Last Access</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {explorerResult.users?.length === 0
                      ? <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">No access records found</td></tr>
                      : explorerResult.users.map((u: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-2 text-slate-700">{u.user_email}</td>
                          <td className="px-4 py-2 text-xs text-slate-400">{u.tenant_id ?? '—'}</td>
                          <td className="px-4 py-2 text-xs text-slate-400">{timeAgo(u.accessed_at)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {explorerResult && explorerMode === 'user' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">Role:</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLOR[explorerResult.role] ?? 'bg-slate-100 text-slate-500'}`}>
                  {ROLE_LABEL[explorerResult.role] ?? explorerResult.role ?? '—'}
                </span>
                <span className="text-xs text-slate-400">{explorerResult.screens?.length ?? 0} screens accessed</span>
                <span className="text-xs text-slate-400">· {explorerResult.role_screens?.length ?? 0} screens via role</span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="border-b border-slate-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Screens accessed by this user
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
                    <tr>
                      <th className="px-4 py-2 text-left">TC</th>
                      <th className="px-4 py-2 text-left">Title</th>
                      <th className="px-4 py-2 text-left">Route</th>
                      <th className="px-4 py-2 text-left">Last Access</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {explorerResult.screens?.length === 0
                      ? <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No activity found for this user</td></tr>
                      : explorerResult.screens.map((s: any) => (
                        <tr key={s.screen_id} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-mono text-xs font-bold text-blue-600">{s.screen_id}</td>
                          <td className="px-4 py-2 text-slate-700">{s.screen_title || '—'}</td>
                          <td className="px-4 py-2 font-mono text-xs text-slate-400">{s.route}</td>
                          <td className="px-4 py-2 text-xs text-slate-400">{timeAgo(s.accessed_at)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!explorerResult && !explorerLoading && (
            <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 text-slate-400">
              <p className="text-sm font-medium">Access Explorer</p>
              <p className="text-xs">
                {explorerMode === 'tc'
                  ? 'Enter a TC code (e.g. BO002) to see who has accessed it'
                  : 'Enter a user email to see which TCs they have accessed'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: ACTIVITY INTELLIGENCE ─────────────────────────── */}
      {tab === 'activity' && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            {['1d','7d','30d'].map(r => (
              <button key={r} onClick={() => { setActivityRange(r); void loadActivity(r); }}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  activityRange === r ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>{r}</button>
            ))}
            <span className="ml-auto text-xs text-slate-400">{activity?.total ?? 0} total opens</span>
          </div>
          {activityLoading ? (
            <div className="flex h-40 items-center justify-center text-sm text-slate-400">Loading…</div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Top Screens */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Most Used Screens</div>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
                    <tr>
                      <th className="px-4 py-2 text-left">TC</th>
                      <th className="px-4 py-2 text-left">Title</th>
                      <th className="px-4 py-2 text-right">Opens</th>
                      <th className="px-4 py-2 text-right">Users</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {!(activity?.topScreens?.length)
                      ? <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No activity data</td></tr>
                      : activity.topScreens.map((s: any) => (
                        <tr key={s.screen_id} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-mono text-xs font-bold text-blue-600">{s.screen_id}</td>
                          <td className="px-4 py-2 text-slate-700 truncate max-w-[140px]">{s.title}</td>
                          <td className="px-4 py-2 text-right font-semibold text-slate-800">{s.opens}</td>
                          <td className="px-4 py-2 text-right text-slate-500">{s.unique_users}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {/* Top Users */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Most Active Users</div>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
                    <tr>
                      <th className="px-4 py-2 text-left">User</th>
                      <th className="px-4 py-2 text-right">Screen Opens</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {!(activity?.topUsers?.length)
                      ? <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-400">No activity data</td></tr>
                      : activity.topUsers.map((u: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-2 text-slate-700">{u.email}</td>
                          <td className="px-4 py-2 text-right font-semibold text-slate-800">{u.opens}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: AUDIT CENTER ──────────────────────────────────── */}
      {tab === 'audit' && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs text-slate-400">Immutable change log — append only. Every access grant, revoke, lock and role change.</p>
            <button onClick={() => { void loadAudit(); }} className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:bg-slate-50">Refresh</button>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
            {auditLoading ? (
              <div className="flex h-40 items-center justify-center text-sm text-slate-400">Loading…</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Time</th>
                    <th className="px-4 py-3 text-left">Action</th>
                    <th className="px-4 py-3 text-left">Actor</th>
                    <th className="px-4 py-3 text-left">Target User</th>
                    <th className="px-4 py-3 text-left">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {auditRows.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                      No audit entries yet — changes made via SY001 will appear here
                    </td></tr>
                  ) : auditRows.map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${ACTION_COLOR[r.action] ?? 'bg-slate-100 text-slate-600'}`}>
                          {r.action?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">{r.actor_email}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">{r.target_user || '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-400">
                        {r.old_value && r.new_value
                          ? `${JSON.stringify(r.old_value)} → ${JSON.stringify(r.new_value)}`
                          : r.reason || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
