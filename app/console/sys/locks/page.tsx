'use client';
import { useState, useEffect, useCallback } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { supabase } from '@/lib/supabase';

// SY032 — Lock Monitor: BOP's SM12. All live OLS locks with owner, reason,
// age, and heartbeat freshness; force-release per lock (audited).

function fmtAge(iso: string) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

const REASON_BADGE: Record<string, string> = {
  edit: 'bg-blue-50 text-blue-600',
  import: 'bg-amber-50 text-amber-600',
  ai_agent: 'bg-violet-50 text-violet-600',
  bulk: 'bg-orange-50 text-orange-600',
};

export default function SY032LockMonitor() {
  const [locks, setLocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    const j = await fetch('/api/bop/sys/locks?all=1').then(r => r.json()).catch(() => ({ locks: [] }));
    setLocks(j.locks ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => { void load(); }, 15_000);
    return () => clearInterval(t);
  }, [load]);

  async function forceRelease(l: any) {
    if (!window.confirm(`Force-release the lock on ${l.object_type} ${l.object_id} held by ${l.locked_by}? Their unsaved changes cannot be saved afterwards.`)) return;
    setBusy(`${l.object_type}:${l.object_id}`);
    const { data } = (await supabase?.auth.getUser()) ?? { data: null };
    await fetch('/api/bop/sys/locks', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: l.object_type, id: l.object_id, force: true, user: data?.user?.email ?? 'admin' }),
    });
    setBusy('');
    setToast(`Lock ${l.object_type}:${l.object_id} released`);
    setTimeout(() => setToast(''), 2500);
    void load();
  }

  const stale = (l: any) => Date.now() - new Date(l.last_heartbeat).getTime() > 90_000;

  return (
    <div className="p-6">
      <ScreenHeader title="Lock Monitor" description="Active object locks (OLS) — view and force-release editing locks held by users and AI agents. SAP SM12 equivalent." />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <span className="text-xs text-slate-400">{locks.length} active lock{locks.length === 1 ? '' : 's'} · refreshes every 15s</span>
          <button onClick={() => { void load(); }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Refresh</button>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400">Loading…</div>
        ) : locks.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400">No active locks — all objects are free.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-5 py-2.5">Object</th>
                <th className="px-5 py-2.5">Locked by</th>
                <th className="px-5 py-2.5">Reason</th>
                <th className="px-5 py-2.5">Held for</th>
                <th className="px-5 py-2.5">Heartbeat</th>
                <th className="px-5 py-2.5">Expires in</th>
                <th className="px-5 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {locks.map(l => (
                <tr key={`${l.object_type}:${l.object_id}`} className="text-slate-600">
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs font-semibold text-slate-500">{l.object_type}</span>
                    <span className="ml-2 font-mono text-xs">{l.object_id.slice(0, 8)}…</span>
                    {l.object_type === 'listing' && (
                      <a href={`/console/mkp/listings/${l.object_id}`} className="ml-2 text-xs text-blue-600 hover:underline">open</a>
                    )}
                  </td>
                  <td className="px-5 py-3 font-medium text-slate-800">{l.locked_by}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${REASON_BADGE[l.reason] ?? 'bg-slate-100 text-slate-500'}`}>{l.reason}</span>
                  </td>
                  <td className="px-5 py-3 text-xs">{fmtAge(l.acquired_at)}</td>
                  <td className="px-5 py-3 text-xs">
                    <span className={stale(l) ? 'font-semibold text-amber-600' : 'text-emerald-600'}>
                      {fmtAge(l.last_heartbeat)} ago{stale(l) && ' ⚠ stale'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs">{Math.max(0, Math.floor((new Date(l.expires_at).getTime() - Date.now()) / 1000))}s</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => { void forceRelease(l); }} disabled={busy === `${l.object_type}:${l.object_id}`}
                      className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
                      Force release
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {toast && <div className="fixed bottom-6 right-6 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
