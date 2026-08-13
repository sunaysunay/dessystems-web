'use client';
import { useState, useEffect , useCallback} from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

const ACT_TYPES = ['call','email','whatsapp','visit','note','task'];
const ACT_ICON: Record<string,string> = { call:'📞', email:'✉️', whatsapp:'💬', visit:'🏢', note:'📝', task:'✅' };
const ACT_COLOR: Record<string,string> = {
  call:'bg-blue-100 text-blue-700', email:'bg-indigo-100 text-indigo-700',
  whatsapp:'bg-emerald-100 text-emerald-700', visit:'bg-orange-100 text-orange-700',
  note:'bg-slate-100 text-slate-600', task:'bg-violet-100 text-violet-700',
};

export default function CR004Page() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<any>({ type:'note', body:'', subject:'', lead_id:'' });
  const [leads, setLeads] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }
  function f(k: string, v: any) { setForm((p: any) => ({ ...p, [k]: v })); }

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter) params.set('type', typeFilter);
    const [aj, lj] = await Promise.all([
      fetch(`/api/bop/crm/activities?${params}`).then(r => r.json()),
      fetch('/api/bop/crm/leads').then(r => r.json()),
    ]);
    setActivities(aj.activities ?? []);
    setLeads(lj.leads ?? []);
    setLoading(false);
  }, [typeFilter]);
  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!form.body.trim()) return;
    setSaving(true);
    await fetch('/api/bop/crm/activities', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ type: form.type, body: form.body, subject: form.subject || null, lead_id: form.lead_id || null }),
    });
    showToast('Activity logged'); setSaving(false); setDrawerOpen(false);
    setForm({ type:'note', body:'', subject:'', lead_id:'' }); void load();
  }

  const grouped = activities.reduce((acc: any, a: any) => {
    const date = new Date(a.created_at).toLocaleDateString('en-GB', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    if (!acc[date]) acc[date] = [];
    acc[date].push(a);
    return acc;
  }, {} as Record<string,any[]>);

  return (
    <div>
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}
      <ScreenHeader title="Activity Log" description="CR004 — All calls, emails, visits and notes across leads"/>

      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <div className="flex gap-1">
          <button onClick={() => setTypeFilter('')} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${!typeFilter?'bg-slate-800 text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>All</button>
          {ACT_TYPES.map(t => (
            <button key={t} onClick={() => setTypeFilter(typeFilter===t?'':t)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${typeFilter===t?ACT_COLOR[t]:'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {ACT_ICON[t]} {t}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-slate-400">{activities.length} activities</span>
        <button onClick={() => setDrawerOpen(true)} className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">+ Log Activity</button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading...</div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([date, acts]: [string, any]) => (
            <div key={date}>
              <h3 className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">{date}</h3>
              <div className="space-y-2">
                {(acts as any[]).map((a: any) => (
                  <div key={a.id} className="flex gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <div className="mt-0.5 text-lg">{ACT_ICON[a.type]??'📌'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ACT_COLOR[a.type]}`}>{a.type}</span>
                        {a.crm_leads && <span className="text-xs text-slate-400 truncate">re: {a.crm_leads.title}</span>}
                        <span className="ml-auto text-xs text-slate-400 flex-shrink-0">{new Date(a.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                      </div>
                      {a.subject && <p className="mt-1 text-sm font-medium text-slate-700">{a.subject}</p>}
                      {a.body && <p className="mt-0.5 text-sm text-slate-600 whitespace-pre-line">{a.body}</p>}
                      {a.actor_email && <p className="mt-0.5 text-xs text-slate-400">{a.actor_email}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {activities.length===0 && <div className="py-12 text-center text-sm text-slate-400">No activities found</div>}
        </div>
      )}

      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)}/>
          <div className="relative z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">Log Activity</h2>
              <button onClick={() => setDrawerOpen(false)} className="rounded-lg p-2 hover:bg-slate-100">x</button>
            </div>
            <div className="flex-1 px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Type</label>
                <div className="flex flex-wrap gap-2">
                  {ACT_TYPES.map(t => (
                    <button key={t} onClick={() => f('type', t)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${form.type===t?ACT_COLOR[t]:'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                      {ACT_ICON[t]} {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Related Lead</label>
                <select value={form.lead_id} onChange={e => f('lead_id', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none">
                  <option value="">No specific lead</option>
                  {leads.map((l: any) => <option key={l.id} value={l.id}>{l.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Subject</label>
                <input value={form.subject} onChange={e => f('subject', e.target.value)} placeholder="Brief summary"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Note *</label>
                <textarea value={form.body} onChange={e => f('body', e.target.value)} rows={5} placeholder="What happened?"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"/>
              </div>
            </div>
            <div className="border-t border-slate-100 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setDrawerOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancel</button>
              <button onClick={() => { void save(); }} disabled={saving||!form.body.trim()} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{saving?'Saving...':'Log'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
