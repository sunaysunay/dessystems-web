'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

const DIR_COLOR: Record<string, string> = {
  inbound:  'bg-blue-100 text-blue-700',
  outbound: 'bg-violet-100 text-violet-700',
  sync:     'bg-teal-100 text-teal-700',
};

export default function FlowManagerPage() {
  const [flows, setFlows]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    fetch('/api/bop/int/flows').then(r => r.json()).then(d => {
      setFlows(d.flows ?? []);
      setLoading(false);
    });

  useEffect(() => { void load(); }, []);

  const toggleFlow = async (id: string, active: boolean) => {
    await fetch('/api/bop/int/flows', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: !active }),
    });
    void load();
  };

  return (
    <div className="p-6 space-y-6">
      <ScreenHeader title="Flow Manager" description="IT003 — DIE pipeline flow definitions and activation" />
      <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs text-blue-700">
        Flows describe how data moves through the integration engine. Enable/disable here.
        Field mappings are configured in code (lib/integration/).
      </div>
      {loading ? (
        <div className="text-sm text-slate-400 py-8 text-center">Loading…</div>
      ) : flows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">
          No flows defined. Run migration 56 in Supabase SQL Editor to seed the RDW lookup flow.
        </div>
      ) : (
        <div className="space-y-2">
          {flows.map((f: any) => (
            <div key={f.id} className="rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-4 shadow-sm">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-slate-800">{f.name}</span>
                  <span className="font-mono text-xs text-slate-400">{f.flow_key}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${DIR_COLOR[f.direction] ?? 'bg-slate-100 text-slate-600'}`}>
                    {f.direction}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  System: <span className="font-mono">{f.int_systems?.system_key ?? '—'}</span>
                  {f.entity_type && <> · Entity: <span className="font-mono">{f.entity_type}</span></>}
                  {f.trigger_event && <> · Trigger: <span className="font-mono">{f.trigger_event}</span></>}
                  {f.schedule_cron && <> · Cron: <span className="font-mono">{f.schedule_cron}</span></>}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${f.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {f.active ? 'Active' : 'Inactive'}
                </span>
                <button onClick={() => { void toggleFlow(f.id, f.active); }}
                  className={`rounded px-3 py-1.5 text-xs font-medium ${f.active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                  {f.active ? 'Pause' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
