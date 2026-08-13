'use client';
import { useState, useEffect } from 'react';
import { BopSelect } from '@/components/BopSelect';
import { ScreenHeader } from '@/components/ScreenBadge';

const STATUS_COLOR: Record<string,string> = {
  pending:'bg-amber-100 text-amber-700',
  approved:'bg-emerald-100 text-emerald-700',
  rejected:'bg-red-100 text-red-600',
  escalated:'bg-violet-100 text-violet-700',
};
const PRIORITIES = ['low','medium','high','critical'] as const;
const PRIORITY_COLOR: Record<string,string> = {
  low:'bg-slate-100 text-slate-500', medium:'bg-blue-100 text-blue-600',
  high:'bg-amber-100 text-amber-700', critical:'bg-red-100 text-red-600',
};

export default function SY005Page() {
  const [requests, setRequests] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({ role_id:'', justification:'', priority:'medium', valid_to:'' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [actingOn, setActingOn] = useState<string|null>(null);
  const [rejectNote, setRejectNote] = useState('');

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  async function load() {
    setLoading(true);
    const [r, rl] = await Promise.all([
      fetch('/api/bop/sys/access-requests').then(res => res.json()),
      fetch('/api/bop/sys/roles').then(res => res.json()),
    ]);
    setRequests(r.requests ?? []);
    setRoles(rl.roles ?? []);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function submit() {
    if (!form.role_id || !form.justification.trim()) { showToast('Role and justification required'); return; }
    setSaving(true);
    const r = await fetch('/api/bop/sys/access-requests', {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(form),
    });
    setSaving(false);
    if (r.ok) { showToast('Request submitted'); setDrawerOpen(false); setForm({ role_id:'', justification:'', priority:'medium', valid_to:'' }); void load(); }
    else { const e = await r.json(); showToast(e.error || 'Error'); }
  }

  async function decide(id: string, status: 'approved'|'rejected', note?: string) {
    const r = await fetch('/api/bop/sys/access-requests/' + id, {
      method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ status, note }),
    });
    if (r.ok) { showToast(status === 'approved' ? 'Request approved' : 'Request rejected'); setActingOn(null); setRejectNote(''); void load(); }
    else { const e = await r.json(); showToast(e.error || 'Error'); }
  }

  const filtered = requests.filter(r => filter === 'all' || r.status === filter);
  const pending = requests.filter(r => r.status === 'pending').length;
  const approved = requests.filter(r => r.status === 'approved').length;

  return (
    <div>
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}
      <ScreenHeader title="Access Request Workflow" description="SY005 — Self-service role request and approval queue"/>

      <div className="mb-5 grid grid-cols-4 gap-4">
        {[
          ['Pending Approval', pending, 'text-amber-600'],
          ['Approved', approved, 'text-emerald-600'],
          ['Rejected', requests.filter(r=>r.status==='rejected').length, 'text-red-500'],
          ['Total', requests.length, 'text-slate-800'],
        ].map(([l,v,c]) => (
          <div key={String(l)} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{l}</p>
            <p className={'mt-1 text-2xl font-bold ' + c}>{v}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="flex gap-1">
          {['pending','approved','rejected','all'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={'rounded-lg px-3 py-1.5 text-xs font-medium capitalize ' + (filter===s?'bg-slate-800 text-white':'border border-slate-200 text-slate-500')}>
              {s}
            </button>
          ))}
        </div>
        <button onClick={() => setDrawerOpen(true)} className="ml-auto rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
          + Request Access
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left">Requestor</th>
                <th className="px-5 py-3 text-left">Role Requested</th>
                <th className="px-5 py-3 text-left">Priority</th>
                <th className="px-5 py-3 text-left">Justification</th>
                <th className="px-5 py-3 text-left">Submitted</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                  {filter === 'pending' ? 'No pending requests' : 'No requests found'}
                </td></tr>
              ) : filtered.map((req: any) => (
                <tr key={req.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-800">{req.requestor_email||req.actor_email||'—'}</td>
                  <td className="px-5 py-3 text-slate-600">{req.role_name||req.object_id||'—'}</td>
                  <td className="px-5 py-3">
                    <span className={'rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ' + (PRIORITY_COLOR[req.priority]??'bg-slate-100 text-slate-500')}>
                      {req.priority||'medium'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500 max-w-xs truncate">{req.justification||req.new_value?.justification||'—'}</td>
                  <td className="px-5 py-3 text-xs text-slate-400">{req.created_at ? new Date(req.created_at).toLocaleDateString() : '—'}</td>
                  <td className="px-5 py-3">
                    <span className={'rounded-full px-2 py-0.5 text-[10px] font-semibold ' + (STATUS_COLOR[req.status]??'bg-slate-100 text-slate-500')}>
                      {req.status||'pending'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {(req.status === 'pending' || !req.status) && (
                      <div>
                        {actingOn === req.id ? (
                          <div className="flex items-center gap-2">
                            <input value={rejectNote} onChange={e => setRejectNote(e.target.value)}
                              placeholder="Rejection reason..." className="rounded border border-slate-200 px-2 py-1 text-xs w-40 focus:outline-none"/>
                            <button onClick={() => { void decide(req.id, 'rejected', rejectNote); }}
                              className="rounded bg-red-500 px-2 py-1 text-[10px] font-medium text-white">Confirm</button>
                            <button onClick={() => setActingOn(null)} className="text-xs text-slate-400">Cancel</button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button onClick={() => { void decide(req.id, 'approved'); }}
                              className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700">Approve</button>
                            <button onClick={() => setActingOn(req.id)}
                              className="rounded-lg bg-red-50 border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100">Reject</button>
                          </div>
                        )}
                      </div>
                    )}
                    {req.status === 'approved' && req.reviewed_by && (
                      <span className="text-[10px] text-slate-400">by {req.reviewed_by}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex" onClick={() => setDrawerOpen(false)}>
          <div className="flex-1 bg-black/20"/>
          <div className="w-96 bg-white shadow-2xl p-6 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Request Role Access</h3>
              <button onClick={() => setDrawerOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl">x</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Role *</label>
                <BopSelect value={form.role_id} onChange={v => setForm(p => ({...p, role_id: v}))} options={[{ value: String(''), label: `Select role...` }, ...roles.map((r: any) => ({ value: String(r.id), label: `${r.name}${r.description ? ' — ' + r.description : ''}` }))]} className="min-w-[130px]" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Priority</label>
                <BopSelect value={form.priority} onChange={v => setForm(p => ({...p, priority: v}))} options={PRIORITIES.map((p) => ({ value: String(p), label: `${p}` }))} className="min-w-[130px]" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Business Justification *</label>
                <textarea value={form.justification} onChange={e => setForm(p => ({...p, justification: e.target.value}))}
                  rows={3} placeholder="Why do you need this role?" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400"/>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Valid Until (optional)</label>
                <input type="date" value={form.valid_to} onChange={e => setForm(p => ({...p, valid_to: e.target.value}))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400"/>
              </div>
            </div>
            <button onClick={() => { void submit(); }} disabled={saving}
              className="rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
