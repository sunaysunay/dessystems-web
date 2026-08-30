'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { Kpi } from '@/components/CockpitKit';
import Link from 'next/link';

interface DashboardData {
  status_counts: Record<string, number>;
  in_progress: number;
  today_slots: number;
  today_planned_hours: number;
  overdue_wos: { id: string; wo_number: string; status: string; days_overdue: number }[];
  completed_this_week: number;
  apk_due_30d: number;
  pending_approvals: number;
  avg_efficiency: number | null;
  recent_wos: { id: string; wo_number: string; type: string; status: string; technician_name: string | null; created_at: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-400',
  scheduled: 'bg-sky-400',
  in_progress: 'bg-blue-500',
  waiting_parts: 'bg-amber-400',
  waiting_approval: 'bg-orange-400',
  completed: 'bg-emerald-500',
  invoiced: 'bg-green-600',
  cancelled: 'bg-red-500',
};

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  scheduled: 'bg-sky-100 text-sky-700',
  in_progress: 'bg-blue-100 text-blue-700',
  waiting_parts: 'bg-amber-100 text-amber-700',
  waiting_approval: 'bg-orange-100 text-orange-700',
  completed: 'bg-emerald-100 text-emerald-700',
  invoiced: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
};

const STATUS_ORDER = ['draft', 'scheduled', 'in_progress', 'waiting_parts', 'waiting_approval', 'completed', 'invoiced', 'cancelled'];

export default function WorkshopDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/bop/wrk/dashboard')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); }
        else { setData(d); }
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <ScreenHeader />
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">Laden...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 space-y-6">
        <ScreenHeader />
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-600 text-sm">
          {error ?? 'Onbekende fout bij laden dashboard'}
        </div>
      </div>
    );
  }

  const totalWos = Object.values(data.status_counts).reduce((s, c) => s + c, 0);

  return (
    <div className="p-6 space-y-5">
      <ScreenHeader />

      {/* Row 1: KPI tiles */}
      <div className="grid grid-cols-4 gap-3">
        <Kpi label="Actieve Werkorders" value={data.in_progress} />
        <Kpi label="Geplande Uren Vandaag" value={data.today_planned_hours > 0 ? `${data.today_planned_hours.toFixed(1)}u` : '0'} />
        <Kpi label="Wachtend op Goedkeuring" value={data.pending_approvals} />
        <Kpi label="APK < 30 dagen" value={data.apk_due_30d} />
      </div>

      {/* Row 2: Status distribution + Overdue */}
      <div className="grid grid-cols-3 gap-4">
        {/* Left: Status distribution */}
        <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Werkorder Status Verdeling</p>
          {totalWos === 0 ? (
            <p className="text-sm text-slate-400">Geen werkorders gevonden</p>
          ) : (
            <>
              {/* Stacked bar */}
              <div className="flex h-4 rounded-full overflow-hidden mb-4">
                {STATUS_ORDER.map(s => {
                  const count = data.status_counts[s] ?? 0;
                  if (count === 0) return null;
                  const pct = (count / totalWos) * 100;
                  return (
                    <div key={s} className={`${STATUS_COLORS[s]} h-full`} style={{ width: `${pct}%` }} title={`${s}: ${count}`} />
                  );
                })}
              </div>
              {/* Legend rows */}
              <div className="space-y-1.5">
                {STATUS_ORDER.map(s => {
                  const count = data.status_counts[s] ?? 0;
                  if (count === 0) return null;
                  const pct = totalWos > 0 ? (count / totalWos) * 100 : 0;
                  return (
                    <div key={s} className="flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_COLORS[s]}`} />
                      <span className="text-xs text-slate-500 w-28 capitalize">{s.replace(/_/g, ' ')}</span>
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${STATUS_COLORS[s]}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-slate-600 w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Right: Overdue alerts */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Achterstallige Werkorders</p>
          {data.overdue_wos.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Geen achterstallige werkorders
            </div>
          ) : (
            <div className="space-y-2">
              {data.overdue_wos.slice(0, 8).map(wo => (
                <div key={wo.id} className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-red-700">{wo.wo_number}</span>
                  <span className="text-[10px] font-bold text-red-500">{wo.days_overdue}d te laat</span>
                </div>
              ))}
            </div>
          )}
          {data.avg_efficiency !== null && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Effic. deze maand</p>
              <p className="text-xl font-bold text-slate-800">{data.avg_efficiency}%</p>
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Afgerond deze week</p>
            <p className="text-xl font-bold text-slate-800">{data.completed_this_week}</p>
          </div>
        </div>
      </div>

      {/* Row 3: Recent work orders table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-400">Recente Werkorders</div>
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 text-xs font-semibold uppercase text-slate-400">
            <tr>
              <th className="px-4 py-2 text-left">WO Nummer</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Monteur</th>
              <th className="px-4 py-2 text-left">Aangemaakt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.recent_wos.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Geen werkorders</td></tr>
            ) : (
              data.recent_wos.map(wo => (
                <tr key={wo.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-slate-700">{wo.wo_number}</td>
                  <td className="px-4 py-2.5 text-slate-500 capitalize">{wo.type?.replace(/_/g, ' ') ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[wo.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {wo.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{wo.technician_name ?? '—'}</td>
                  <td className="px-4 py-2.5 text-slate-400">{new Date(wo.created_at).toLocaleDateString('nl-NL')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Row 4: Quick links */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Nieuwe Werkorder', href: '/console/wrk/orders', icon: '＋' },
          { label: 'Planning', href: '/console/wrk/planning', icon: '📅' },
          { label: 'Inspecties', href: '/console/wrk/inspections', icon: '🔍' },
          { label: 'APK Herinneringen', href: '/console/wrk/apk-reminders', icon: '⏰' },
        ].map(link => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            <span>{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
