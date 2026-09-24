'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

interface Playbook {
  id: string;
  name: string;
  trigger: string;
  channels: string[];
  languages: string[];
  objective: string;
  active: boolean;
  last_run?: string;
  run_count: number;
}

const TRIGGERS = [
  { value: 'new_listing', label: 'New listing published' },
  { value: 'price_drop', label: 'Price drop on listing' },
  { value: 'weekly_digest', label: 'Weekly digest schedule' },
  { value: 'seasonal', label: 'Seasonal campaign' },
  { value: 'manual', label: 'Manual trigger' },
];

const CHANNELS = ['linkedin', 'facebook', 'instagram', 'x', 'email', 'telegram', 'blog', 'google_business'];
const OBJECTIVES = ['brand_awareness', 'lead_gen', 'promotion', 'seasonal', 'service_highlight', 'new_arrival', 'price_drop', 'event'];

export default function PlaybooksPage() {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', trigger: 'new_listing', channels: ['email'] as string[], languages: ['nl', 'en'], objective: 'promotion' });

  function loadPlaybooks() {
    setLoading(true);
    fetch('/api/bop/grw/playbooks')
      .then(r => r.json())
      .then(d => { setPlaybooks(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { loadPlaybooks(); }, []);

  function handleSave() {
    if (!form.name.trim()) return;
    fetch('/api/bop/grw/playbooks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form),
    })
      .then(r => r.json())
      .then(() => { setShowForm(false); setForm({ name: '', trigger: 'new_listing', channels: ['email'], languages: ['nl', 'en'], objective: 'promotion' }); loadPlaybooks(); });
  }

  function toggleActive(id: string, active: boolean) {
    fetch('/api/bop/grw/playbooks', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, active: !active }),
    }).then(() => loadPlaybooks());
  }

  function deletePlaybook(id: string) {
    if (!confirm('Delete this playbook?')) return;
    fetch(`/api/bop/grw/playbooks?id=${id}`, { method: 'DELETE' }).then(() => loadPlaybooks());
  }

  function toggleChannel(ch: string) {
    setForm(f => ({ ...f, channels: f.channels.includes(ch) ? f.channels.filter(c => c !== ch) : [...f.channels, ch] }));
  }

  return (
    <div className="space-y-6">
      <ScreenHeader />

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">Automation rules that trigger content generation and publishing when conditions are met.</p>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 text-xs font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
          {showForm ? 'Cancel' : '+ New Playbook'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-indigo-500/30 bg-card p-5 space-y-4">
          <div>
            <label className="text-xs text-muted block mb-1">Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="e.g. New Vehicle Auto-Post" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs text-muted block mb-1">Trigger</label>
              <select value={form.trigger} onChange={e => setForm(f => ({ ...f, trigger: e.target.value }))} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                {TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Objective</label>
              <select value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                {OBJECTIVES.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">Channels</label>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map(ch => (
                <button key={ch} onClick={() => toggleChannel(ch)} className={`px-3 py-1 text-xs rounded-md border transition-colors ${form.channels.includes(ch) ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'border-border text-muted hover:bg-muted/10'}`}>
                  {ch}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleSave} disabled={!form.name.trim()} className="px-4 py-2 text-xs font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 transition-colors">
            Save Playbook
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center text-muted text-sm py-12">Loading playbooks...</div>
      ) : playbooks.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <div className="text-sm text-muted">No playbooks created yet. Click &quot;+ New Playbook&quot; to set up an automation rule.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {playbooks.map(pb => (
            <div key={pb.id} className="rounded-lg border border-border bg-card p-4 flex items-center gap-4">
              <button onClick={() => toggleActive(pb.id, pb.active)} className={`w-10 h-5 rounded-full relative transition-colors ${pb.active ? 'bg-green-500' : 'bg-zinc-600'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${pb.active ? 'left-5' : 'left-0.5'}`} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{pb.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/10 text-muted">{pb.trigger.replace(/_/g, ' ')}</span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted">
                  <span>{pb.channels.join(', ')}</span>
                  <span>·</span>
                  <span>{pb.objective.replace(/_/g, ' ')}</span>
                  {pb.run_count > 0 && <><span>·</span><span>{pb.run_count} runs</span></>}
                </div>
              </div>
              <button onClick={() => deletePlaybook(pb.id)} className="text-xs text-red-400 hover:text-red-300 px-2">Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
