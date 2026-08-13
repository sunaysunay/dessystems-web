'use client';
// AN006 — Quality & Security Monitor: threshold checks + editable alert rules.
import { useState, useEffect, useCallback } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';
import { Section, Dot } from '@/components/CockpitKit';

export default function MonitorCockpit() {
  const { unit } = useScope();
  const [d, setD] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const j = await fetch(`/api/bop/an/cockpits?view=monitor&tenant_id=${unit.id}`).then(r => r.json());
    setD(j);
  }, [unit.id]);
  useEffect(() => { void load(); const iv = setInterval(() => { void load(); }, 60000); return () => clearInterval(iv); }, [load]);

  async function patchRule(id: string, body: any) {
    setBusy(true);
    await fetch('/api/bop/an/cockpits', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...body }),
    });
    setBusy(false); void load();
  }

  return (
    <div className="p-6">
      <ScreenHeader title="Quality Monitor" description="Tracking health, traffic baseline, 404s and alert rules — auto-refreshes every 60s" />

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(d?.checks ?? []).map((c: any) => (
          <div key={c.name} className={`rounded-xl border p-4 ${c.status === 'red' ? 'border-red-200 bg-red-50/50' : c.status === 'amber' ? 'border-amber-200 bg-amber-50/40' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-center gap-2">
              <Dot status={c.status} />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{c.name}</span>
            </div>
            <div className="mt-1 text-[22px] font-bold text-slate-800">{String(c.value)}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="Alert rules">
          <div className="space-y-2">
            {(d?.rules ?? []).map((r: any) => (
              <div key={r.id} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-[11px]">
                <button disabled={busy} onClick={() => { void patchRule(r.id, { enabled: !r.enabled }); }}
                  className={`h-4 w-8 rounded-full transition-colors ${r.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <span className={`block h-3 w-3 rounded-full bg-white transition-transform ${r.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                <span className="w-32 font-semibold text-slate-700">{r.rule.replace(/_/g, ' ')}</span>
                <span className="text-slate-400">threshold</span>
                <input defaultValue={r.threshold} onBlur={(e) => { if (Number(e.target.value) !== r.threshold) void patchRule(r.id, { threshold: e.target.value }); }}
                  className="w-16 rounded border border-slate-200 px-1.5 py-0.5 text-[11px] focus:outline-none focus:border-indigo-400" />
                <span className="text-slate-400">window {r.window_minutes}m</span>
                {r.last_fired_at && <span className="ml-auto text-[9px] text-red-400">fired {new Date(r.last_fired_at).toLocaleString('nl-NL')}</span>}
              </div>
            ))}
            {(d?.rules ?? []).length === 0 && <p className="text-[11px] text-slate-300">No rules for this tenant (migration 46 seeds defaults).</p>}
          </div>
        </Section>
        <Section title="Top 404 pages (24h)">
          {(d?.top_404 ?? []).length === 0 ? <p className="text-[11px] text-slate-300">No 404 events recorded.</p> : (
            <div className="space-y-1">
              {d.top_404.map((x: any) => (
                <div key={x.page} className="flex justify-between text-[11px]">
                  <span className="truncate pr-2 font-mono text-slate-600">{x.page}</span>
                  <span className="font-bold text-slate-700">{x.n}</span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
