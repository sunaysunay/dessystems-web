'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

export default function IT008Page() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandId, setExpandId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const j = await fetch('/api/bop/int/queue?type=webhook').then(r => r.json());
    const rows = (j.messages ?? []).filter((m: any) => m.message_type === 'webhook_event');
    setEvents(rows);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const webhookUrls = ['marktplaats', 'autoscout24'].map(sys => ({
    sys,
    url: `${typeof window !== 'undefined' ? window.location.origin : ''}/api/bop/int/webhook/${sys}`,
  }));

  return (
    <div className="p-6 max-w-[1100px]">
      <ScreenHeader title="Webhook Events" description="IT008 — Inbound webhook receiver log per external system" />

      {/* Webhook URL reference panel */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Webhook receiver URLs</div>
        <div className="space-y-2">
          {webhookUrls.map(({ sys, url }) => (
            <div key={sys} className="flex items-center gap-3">
              <span className="w-28 rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{sys}</span>
              <code className="flex-1 rounded bg-slate-50 px-3 py-1.5 text-xs text-slate-700 border border-slate-200">{url}</code>
              <button
                onClick={() => { void navigator.clipboard.writeText(url); }}
                className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50"
              >
                Copy
              </button>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Register these URLs in the external platform's webhook settings. HMAC signature verification is active if
          <code className="mx-1 rounded bg-slate-100 px-1 text-[11px]">secret_ref</code>
          is set on the int_systems row and the corresponding env var is present in <code className="rounded bg-slate-100 px-1 text-[11px]">.env.local</code>.
        </p>
      </div>

      <div className="mb-3 flex items-center gap-3">
        <button onClick={() => { void load(); }} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          Refresh
        </button>
        <span className="ml-auto text-xs text-slate-400">{events.length} events</span>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-slate-400">Loading…</div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-slate-400">
          No webhook events received yet. Point an external system to one of the URLs above.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">System</th>
                <th className="px-4 py-2">Entity</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Received</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.map(e => {
                const isExpanded = expandId === e.id;
                return [
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                        {e.int_systems?.system_key ?? e.int_flows?.int_systems?.system_key ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-600">
                      {e.entity_type && <span className="mr-1 text-slate-400">{e.entity_type}</span>}
                      <span className="font-mono">{e.entity_id ?? '—'}</span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
                        e.status === 'done' ? 'bg-emerald-100 text-emerald-700' :
                        e.status === 'failed' || e.status === 'dead' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-400">
                      {e.created_at ? new Date(e.created_at).toLocaleString('nl-NL', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </td>
                    <td className="px-4 py-2">
                      <button onClick={() => setExpandId(isExpanded ? null : e.id)}
                        className="text-xs text-slate-400 hover:text-slate-700">
                        {isExpanded ? 'Hide' : 'Payload'}
                      </button>
                    </td>
                  </tr>,
                  isExpanded && (
                    <tr key={`${e.id}-expand`} className="bg-slate-50">
                      <td colSpan={5} className="px-4 py-3">
                        <pre className="max-h-64 overflow-auto rounded bg-slate-100 p-3 text-[11px] text-slate-700 whitespace-pre-wrap">
                          {JSON.stringify(e.payload, null, 2)}
                        </pre>
                        {e.result && (
                          <pre className="mt-2 max-h-32 overflow-auto rounded bg-emerald-50 p-3 text-[11px] text-emerald-800 whitespace-pre-wrap">
                            {JSON.stringify(e.result, null, 2)}
                          </pre>
                        )}
                      </td>
                    </tr>
                  ),
                ];
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
