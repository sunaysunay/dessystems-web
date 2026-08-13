'use client';
// AN003 — Session Intelligence: dessiteAG_V4-style sessions dashboard
// (KPIs, top-lists, full column table) + BOP cohorts & journey trace.
import { useState, useEffect, useCallback, useMemo } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';
import { BopSelect } from '@/components/BopSelect';

const COHORTS: { key: string; label: string; test: (s: any) => boolean }[] = [
  { key: 'converted', label: 'Converted', test: s => s.converted },
  { key: 'engaged', label: 'Viewed ≥3 listings', test: s => s.listing_views >= 3 },
  { key: 'utm', label: 'From campaign (UTM)', test: s => s.has_utm },
  { key: 'bounce', label: 'Bounced', test: s => s.is_bounce },
  { key: 'long', label: '>5 min', test: s => (s.duration_sec ?? 0) > 300 },
];

function refHost(r: string | null): string {
  if (!r) return 'Direct';
  try { return new URL(r).hostname.replace(/^www\./, ''); } catch { return r; }
}
function topN(rows: any[], pick: (s: any) => string | null, n = 8): [string, number][] {
  const m: Record<string, number> = {};
  for (const s of rows) { const k = pick(s) || '—'; m[k] = (m[k] || 0) + 1; }
  return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n);
}

function TopPanel({ title, icon, rows }: { title: string; icon: string; rows: [string, number][] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        <span>{icon}</span>{title}
      </div>
      {rows.length === 0 ? <p className="py-3 text-center text-[11px] text-slate-300">No data</p> : (
        <div className="space-y-1">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="truncate text-slate-600" title={k}>{k}</span>
              <span className="flex-none font-semibold text-slate-700">{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SessionIntelligence() {
  const { unit } = useScope();
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [device, setDevice] = useState('');
  const [browser, setBrowser] = useState('');
  const [country, setCountry] = useState('');
  const [cohort, setCohort] = useState('');
  const [q, setQ] = useState('');
  const [trace, setTrace] = useState<any>(null);
  const [traceFor, setTraceFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const j = await fetch(`/api/bop/an/cockpits?view=sessions&tenant_id=${unit.id}&range=${days}`).then(r => r.json());
    setD(j); setLoading(false);
  }, [unit.id, days]);
  useEffect(() => { void load(); }, [load]);

  async function openTrace(sid: string) {
    setTraceFor(sid); setTrace(null);
    const j = await fetch(`/api/bop/an/cockpits?view=trace&tenant_id=${unit.id}&session=${encodeURIComponent(sid)}`).then(r => r.json());
    setTrace(j);
  }

  const sessions = useMemo(() => (d?.sessions ?? []).filter((s: any) => {
    if (device && s.device_type !== device) return false;
    if (browser && s.browser !== browser) return false;
    if (country && s.country_code !== country) return false;
    if (cohort && !COHORTS.find(c => c.key === cohort)?.test(s)) return false;
    if (q && !(s.session_id?.includes(q) || s.entry_page?.includes(q) || s.exit_page?.includes(q) || s.utm_campaign?.includes(q))) return false;
    return true;
  }), [d, device, browser, country, cohort, q]);

  const devices = [...new Set((d?.sessions ?? []).map((s: any) => s.device_type).filter(Boolean))] as string[];
  const browsers = [...new Set((d?.sessions ?? []).map((s: any) => s.browser).filter(Boolean))].sort() as string[];
  const countries = [...new Set((d?.sessions ?? []).map((s: any) => s.country_code).filter(Boolean))].sort() as string[];
  const selected = traceFor ? (d?.sessions ?? []).find((s: any) => s.session_id === traceFor) : null;

  // KPIs (dessiteAG_V4 parity) — computed over the filtered set
  const total = sessions.length;
  const bounceRate = total ? Math.round((sessions.filter((s: any) => s.is_bounce).length / total) * 100) : 0;
  const avgPages = total ? (sessions.reduce((a: number, s: any) => a + (s.page_count ?? 0), 0) / total) : 0;
  const avgDur = total ? Math.round(sessions.reduce((a: number, s: any) => a + (s.duration_sec ?? 0), 0) / total) : 0;

  const kpi = (label: string, value: string, icon: string) => (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{icon} {label}</div>
      <div className="mt-1 text-[24px] font-bold text-slate-800">{value}</div>
    </div>
  );

  return (
    <div className="p-6">
      <ScreenHeader title="Session Intelligence" description="Sessions dashboard — KPIs, top entry/exit/countries/devices, full column table, cohorts and per-session journey reconstruction" />

      {/* filters */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Session / page / campaign…"
          className="w-52 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] focus:outline-none focus:border-indigo-400" />
        <BopSelect value={String(days)} onChange={v => setDays(Number(v))}
          options={[1, 3, 7, 14, 30, 90].map(n => ({ value: String(n), label: `last ${n}d` }))} className="min-w-[90px]" />
        <BopSelect value={device} onChange={setDevice}
          options={[{ value: '', label: 'All devices' }, ...devices.map(x => ({ value: x, label: x }))]} className="min-w-[110px]" />
        <BopSelect value={browser} onChange={setBrowser}
          options={[{ value: '', label: 'All browsers' }, ...browsers.map(x => ({ value: x, label: x }))]} className="min-w-[110px]" />
        <BopSelect value={country} onChange={setCountry}
          options={[{ value: '', label: 'All countries' }, ...countries.map(x => ({ value: x, label: x }))]} className="min-w-[110px]" />
        <button onClick={() => { void load(); }} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-500 hover:border-indigo-300">↻ Refresh</button>
        <span className="ml-auto text-[11px] text-slate-400">{total} sessions</span>
      </div>

      {/* KPI cards */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpi('Total Sessions', String(total), '👥')}
        {kpi('Bounce Rate', `${bounceRate}%`, '％')}
        {kpi('Avg Pages/Session', avgPages.toFixed(1), '📊')}
        {kpi('Avg Duration', `${avgDur}s`, '⏱')}
      </div>

      {/* cohort chips */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {COHORTS.map(c => {
          const n = (d?.sessions ?? []).filter(c.test).length;
          return (
            <button key={c.key} onClick={() => setCohort(cohort === c.key ? '' : c.key)}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${cohort === c.key ? 'bg-indigo-500 text-white' : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300'}`}>
              {c.label} ({n})
            </button>
          );
        })}
      </div>

      {/* top-lists */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TopPanel title="Top Entry Pages" icon="↓" rows={topN(sessions, s => s.entry_page)} />
        <TopPanel title="Top Exit Pages" icon="↑" rows={topN(sessions, s => s.exit_page)} />
        <TopPanel title="Top Countries" icon="◎" rows={topN(sessions, s => s.country_code)} />
        <TopPanel title="Top Devices" icon="🖥" rows={topN(sessions, s => s.device_type)} />
      </div>

      {/* table + journey */}
      <div className="mt-4 grid grid-cols-1 gap-4 2xl:grid-cols-[1fr_440px]">
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          {loading ? <div className="flex h-40 items-center justify-center text-slate-400 text-sm">Loading…</div> : (
            <table className="w-full text-left text-[12px]">
              <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-3 py-2.5">Started</th>
                  <th className="px-3 py-2.5">Session</th>
                  <th className="px-3 py-2.5 text-right">Duration</th>
                  <th className="px-3 py-2.5 text-right">Pages</th>
                  <th className="px-3 py-2.5">Entry Page</th>
                  <th className="px-3 py-2.5">Exit Page</th>
                  <th className="px-3 py-2.5">Location</th>
                  <th className="px-3 py-2.5">Device</th>
                  <th className="px-3 py-2.5">Browser</th>
                  <th className="px-3 py-2.5">Referrer</th>
                  <th className="px-3 py-2.5">UTM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sessions.length === 0 ? (
                  <tr><td colSpan={11} className="px-3 py-10 text-center text-slate-400">No sessions match.</td></tr>
                ) : sessions.map((s: any) => {
                  const cc = s.country_code;
                  const locDetail = [s.city, s.region].filter(Boolean).join(', ');
                  const utmParts = [s.utm_source, s.utm_medium, s.utm_campaign].filter(Boolean);
                  return (
                    <tr key={s.session_id} onClick={() => { void openTrace(s.session_id); }}
                      className={`cursor-pointer transition-colors ${traceFor === s.session_id ? 'bg-indigo-50/60' : 'hover:bg-slate-50'}`}
                      title="Click to reconstruct this session's journey">
                      <td className="px-3 py-2 whitespace-nowrap text-slate-500">{new Date(s.started_at).toLocaleString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-mono text-[11px] text-slate-500">
                        <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle ${s.is_bounce ? 'bg-red-400' : 'bg-emerald-400'}`} title={s.is_bounce ? 'bounced' : 'engaged'} />
                        {s.session_id?.slice(0, 8)}
                        <span className={`ml-1.5 rounded px-1 py-0.5 text-[9px] font-bold ${s.engagement >= 7 ? 'bg-emerald-100 text-emerald-700' : s.engagement >= 4 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`} title={`engagement ${s.engagement}/10`}>{s.engagement}</span>
                        {s.converted && <span className="ml-1 rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-bold text-emerald-700">CONV</span>}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-500">{s.duration_sec ? `${s.duration_sec}s` : '—'}</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-800">{s.page_count ?? '—'}</td>
                      <td className="px-3 py-2 max-w-[160px] truncate font-mono text-[11px] text-slate-500" title={s.entry_page || ''}>{s.entry_page || '—'}</td>
                      <td className="px-3 py-2 max-w-[160px] truncate font-mono text-[11px] text-slate-500" title={s.exit_page || ''}>{s.exit_page || '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {cc ? (<><span className="font-semibold text-slate-700">{cc}</span>{locDetail && <span className="ml-1 text-slate-400">({locDetail})</span>}</>) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-3 py-2 capitalize text-slate-400">{s.device_type || '—'}</td>
                      <td className="px-3 py-2 text-slate-500">{s.browser || '—'}</td>
                      <td className="px-3 py-2 max-w-[140px] truncate text-slate-400" title={s.referrer || ''}>{refHost(s.referrer)}</td>
                      <td className="px-3 py-2 max-w-[120px] truncate text-slate-400" title={utmParts.join(' / ')}>{utmParts.length ? utmParts.join(' / ') : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* journey trace */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 2xl:sticky 2xl:top-4 2xl:self-start 2xl:max-h-[80vh] 2xl:overflow-y-auto">
          {!traceFor ? (
            <p className="py-14 text-center text-[12px] text-slate-400">Select a session row to reconstruct its journey.</p>
          ) : !trace ? (
            <p className="py-14 text-center text-[12px] text-slate-400">Loading trace…</p>
          ) : (
            <>
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Journey — {traceFor.slice(0, 12)}</h3>
              {selected && (
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                  {selected.device_type && <span className="rounded bg-slate-100 px-1.5 py-0.5 capitalize text-slate-600">{selected.device_type}</span>}
                  {selected.browser && <span className="rounded bg-blue-50 px-1.5 py-0.5 font-medium text-blue-600">{selected.browser}</span>}
                  {(selected.city || selected.country_code) && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">{[selected.city, selected.country_code].filter(Boolean).join(', ')}</span>}
                  {selected.duration_sec !== null && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">{Math.round(selected.duration_sec / 60)}m {selected.duration_sec % 60}s</span>}
                  {selected.has_utm && <span className="rounded bg-violet-50 px-1.5 py-0.5 text-violet-700">{[selected.utm_source, selected.utm_medium, selected.utm_campaign].filter(Boolean).join(' / ')}</span>}
                </div>
              )}
              {trace.shopper && (
                <div className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-[11px]">
                  <b className="text-indigo-700">Identified shopper:</b> {trace.shopper.display_name ?? trace.shopper.uid}
                  {trace.shopper.account_type === 'business' && <span className="ml-1.5 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-bold text-amber-700">{trace.shopper.dealer_verified ? 'VERIFIED DEALER' : 'BUSINESS'}</span>}
                </div>
              )}
              <ol className="mt-3 space-y-0">
                {trace.timeline.map((e: any, i: number) => (
                  <li key={i} className="relative border-l-2 border-slate-100 pb-3 pl-4">
                    <span className={`absolute -left-[5px] top-1 h-2 w-2 rounded-full ${['form_submit', 'lead_submitted', 'share', 'sell_lead_submitted'].includes(e.event_type) ? 'bg-emerald-500' : e.event_type === 'listing_view' ? 'bg-blue-400' : 'bg-slate-300'}`} />
                    <div className="flex items-baseline gap-2 text-[11px]">
                      <span className="font-semibold text-slate-700">{e.event_type}</span>
                      <span className="text-slate-400">{new Date(e.created_at).toLocaleTimeString('nl-NL')}</span>
                      {e.dwell_sec !== null && e.dwell_sec > 0 && <span className="text-[9px] text-slate-300">+{e.dwell_sec}s</span>}
                    </div>
                    <div className="truncate text-[10px] text-slate-500">{e.listing_title ?? e.page}</div>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
