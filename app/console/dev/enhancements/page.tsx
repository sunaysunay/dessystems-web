'use client';
import { useState, useEffect , useCallback} from 'react';
import { BopSelect } from '@/components/BopSelect';
import { ScreenHeader } from '@/components/ScreenBadge';

const STATUS_STEPS = ['draft','dev','review','qa','approved','queued','deployed','archived'];

const STATUS_COLOR: Record<string, string> = {
  draft:    'bg-slate-100 text-slate-600',
  dev:      'bg-blue-100 text-blue-700',
  review:   'bg-amber-100 text-amber-700',
  qa:       'bg-violet-100 text-violet-700',
  approved: 'bg-emerald-100 text-emerald-700',
  queued:   'bg-orange-100 text-orange-700',
  deployed: 'bg-green-100 text-green-700',
  archived: 'bg-slate-100 text-slate-400',
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high:     'bg-orange-100 text-orange-700',
  medium:   'bg-amber-100 text-amber-700',
  low:      'bg-slate-100 text-slate-500',
};

const RISK_COLOR = (score: number) => {
  if (score >= 5) return 'text-red-600';
  if (score >= 4) return 'text-orange-600';
  if (score >= 3) return 'text-amber-600';
  return 'text-slate-500';
};

export default function EnhancementsPage() {
  const [enhancements, setEnhancements] = useState<any[]>([]);
  const [releases, setReleases]         = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm]         = useState(false);
  const [form, setForm]                 = useState({ code: '', title: '', priority: 'medium', business_owner: '', release_id: '' });
  const [saving, setSaving]             = useState(false);

  const load = useCallback(() => {
    const url = filterStatus ? `/api/bop/dev/enhancements?status=${filterStatus}` : '/api/bop/dev/enhancements';
    void Promise.all([
      fetch(url).then(r => r.json()),
      fetch('/api/bop/dev/releases').then(r => r.json()),
    ]).then(([e, r]) => {
      setEnhancements(e.enhancements ?? []);
      setReleases(r.releases ?? []);
      setLoading(false);
    });
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.code || !form.title) return;
    setSaving(true);
    await fetch('/api/bop/dev/enhancements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, release_id: form.release_id || undefined }),
    });
    setSaving(false);
    setShowForm(false);
    setForm({ code: '', title: '', priority: 'medium', business_owner: '', release_id: '' });
    load();
  };

  const advance = async (id: string, currentStatus: string) => {
    const next = STATUS_STEPS[STATUS_STEPS.indexOf(currentStatus) + 1];
    if (!next) return;
    await fetch(`/api/bop/dev/enhancements/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    load();
  };

  return (
    <div className="p-6 space-y-6">
      <ScreenHeader title="Enhancements" description="DEV002" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {['', ...STATUS_STEPS].map(s => (
            <button key={s}
              onClick={() => setFilterStatus(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                filterStatus === s
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
              }`}>
              {s === '' ? 'All' : s}
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(true)}
          className="rounded-lg bg-des-blue px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          + New Enhancement
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-slate-700">New Enhancement</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Code *</label>
              <input value={form.code} onChange={e => setForm(f => ({...f, code: e.target.value}))}
                placeholder="ENH-001"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-des-blue" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Priority *</label>
              <BopSelect value={form.priority} onChange={v => setForm(f => ({...f, priority: v}))} options={[...['critical','high','medium','low'].map((p) => ({ value: String(p), label: `${p}` }))]} className="min-w-[130px]" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
                placeholder="Improve listing search performance"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-des-blue" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Business Owner</label>
              <input value={form.business_owner} onChange={e => setForm(f => ({...f, business_owner: e.target.value}))}
                placeholder="Sales / Finance / Ops"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-des-blue" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Target Release</label>
              <BopSelect value={form.release_id} onChange={v => setForm(f => ({...f, release_id: v}))} options={[{ value: String(''), label: `— none —` }, ...releases.map((r: any) => ({ value: String(r.id), label: `${r.version}` }))]} className="min-w-[130px]" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button onClick={() => { void save(); }} disabled={saving}
              className="rounded-lg bg-des-blue px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-sm text-slate-400">Loading...</div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                {['Code','Title','Priority','Risk','Status','Business Owner','Release','Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enhancements.map((e: any) => {
                const nextStatus = STATUS_STEPS[STATUS_STEPS.indexOf(e.status) + 1];
                return (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">{e.code}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 max-w-xs truncate">{e.title}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLOR[e.priority] ?? ''}`}>
                        {e.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {e.risk_score ? (
                        <span className={`font-bold text-sm ${RISK_COLOR(e.risk_score)}`}>{e.risk_score}/5</span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[e.status] ?? ''}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{e.business_owner ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{e.dev_releases?.version ?? '—'}</td>
                    <td className="px-4 py-3">
                      {nextStatus && nextStatus !== 'archived' && (
                        <button onClick={() => { void advance(e.id, e.status); }}
                          className="rounded px-2 py-1 text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 whitespace-nowrap">
                          → {nextStatus}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {enhancements.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">
                    No enhancements found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
