'use client';
// DESPANEL-V2 Phase 4 — cross-unit overview dashboard.
import { useEffect, useState } from 'react';
import { useScope, BUSINESS_UNITS } from '@/lib/scope-context';
import { getStats } from '@/lib/queries';
import { USING_MOCK } from '@/lib/supabase';
import type { Stats } from '@/data/mock';

function Kpi({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ?? 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const { unit } = useScope();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let live = true;
    void getStats(unit.id).then(s => { if (live) setStats(s); });
    return () => { live = false; };
  }, [unit.id]);

  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Overview</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {unit.label} · tenant_id {unit.id}
          {USING_MOCK && <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">demo data</span>}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Listings" value={stats ? String(stats.listings) : '…'} />
        <Kpi label="Leads" value={stats ? String(stats.leads) : '…'} accent="text-des-blue" />
        <Kpi label="Open tasks" value={stats ? String(stats.tasks) : '…'} />
        <Kpi label="Channel errors" value={stats ? String(stats.errors) : '…'} accent={stats?.errors ? 'text-rose-600' : 'text-emerald-600'} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-medium text-slate-700">Business units</p>
        <div className="grid gap-2 md:grid-cols-5">
          {BUSINESS_UNITS.map(u => (
            <div key={u.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-800">{u.label}</p>
              <p className="text-xs text-slate-500">{u.type} · id {u.id}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
