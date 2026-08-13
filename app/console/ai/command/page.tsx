'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

const AGENT_REGISTRY = [
  { id: 'des-monitor',   name: 'DES Monitor',        type: 'system',  status: 'active',  description: 'VPS health watchdog — restarts crashed PM2 processes, alerts on OOM', schedule: 'continuous' },
  { id: 'des-agent',     name: 'DES Agent',           type: 'system',  status: 'disabled',description: 'Post-commit handoff note generator (disabled — OOM risk)', schedule: 'on-commit'  },
  { id: 'bon-scanner',   name: 'Bon Scanner AI',      type: 'finance', status: 'beta',    description: 'Receipt OCR and VAT extraction via Claude vision', schedule: 'on-demand'  },
  { id: 'btw-assistant', name: 'BTW Assistent AI',    type: 'finance', status: 'beta',    description: 'NL VAT advisor for margin scheme and EU export rules', schedule: 'on-demand'  },
  { id: 'listing-ai',    name: 'Listing Intelligence',type: 'market',  status: 'active',  description: 'Market price tracking and competitor listing analysis', schedule: 'daily'       },
  { id: 'campaign-ai',   name: 'AI Campaigns',        type: 'market',  status: 'beta',    description: 'Automated social + listing campaign generation', schedule: 'on-demand'  },
];

const STATUS_STYLE: Record<string, string> = {
  active:   'bg-emerald-100 text-emerald-700',
  disabled: 'bg-slate-100 text-slate-400',
  beta:     'bg-amber-100 text-amber-700',
  error:    'bg-red-100 text-red-600',
};
const TYPE_STYLE: Record<string, string> = {
  system:  'bg-violet-100 text-violet-700',
  finance: 'bg-blue-100 text-blue-700',
  market:  'bg-teal-100 text-teal-700',
};

export default function AI001Page() {
  const [lastActivity, setLastActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bop/access-audit?view=iam&range=7')
      .then(r => r.json())
      .then(d => { setLastActivity((d.rows ?? []).slice(0, 5)); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const active   = AGENT_REGISTRY.filter(a => a.status === 'active').length;
  const beta     = AGENT_REGISTRY.filter(a => a.status === 'beta').length;
  const disabled = AGENT_REGISTRY.filter(a => a.status === 'disabled').length;

  return (
    <div>
      <ScreenHeader title="AI Command Center" description="AI001 — Agent registry, tool orchestration and AI operation overview" />

      <div className="mb-5 grid grid-cols-4 gap-4">
        {[
          ['Agents Total', AGENT_REGISTRY.length, 'text-slate-800'],
          ['Active',       active,    'text-emerald-600'],
          ['Beta',         beta,      'text-amber-600'],
          ['Disabled',     disabled,  'text-slate-400'],
        ].map(([l, v, c]) => (
          <div key={l as string} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{l}</p>
            <p className={'mt-1 text-2xl font-bold ' + c}>{v}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3 mb-6">
        {AGENT_REGISTRY.map(agent => (
          <div key={agent.id} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-slate-800">{agent.name}</h3>
                  <span className={'rounded-full px-2 py-0.5 text-[10px] font-semibold ' + STATUS_STYLE[agent.status]}>{agent.status}</span>
                  <span className={'rounded-full px-2 py-0.5 text-[10px] font-semibold ' + TYPE_STYLE[agent.type]}>{agent.type}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{agent.description}</p>
              </div>
              <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-500 flex-shrink-0 ml-4">{agent.schedule}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Recent System Activity (7d)</div>
        {loading ? (
          <div className="flex h-20 items-center justify-center text-sm text-slate-400">Loading...</div>
        ) : lastActivity.length === 0 ? (
          <div className="flex h-20 items-center justify-center text-sm text-slate-400">No recent activity</div>
        ) : (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-50">
              {lastActivity.map((r: any) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-xs text-slate-400">{new Date(r.created_at).toLocaleString('nl-NL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-600">{r.action}</td>
                  <td className="px-5 py-3 text-xs text-slate-400">{r.actor_email ?? 'system'}</td>
                  <td className="px-5 py-3 text-xs text-slate-400 max-w-[300px] truncate">{r.object_id ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
