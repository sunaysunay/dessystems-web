'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

const EMPTY_PROMPT = { name: '', category: 'crm', description: '', template: '', variables: '' };
const CATEGORIES = ['crm','finance','listings','support','system','marketing'];
const CAT_COLOR: Record<string, string> = {
  crm:       'bg-blue-100 text-blue-700',
  finance:   'bg-emerald-100 text-emerald-700',
  listings:  'bg-orange-100 text-orange-700',
  support:   'bg-violet-100 text-violet-700',
  system:    'bg-slate-100 text-slate-600',
  marketing: 'bg-pink-100 text-pink-700',
};

export default function AI003Page() {
  const [prompts, setPrompts]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [editing, setEditing]   = useState(false);
  const [form, setForm]         = useState<any>(EMPTY_PROMPT);
  const [saving, setSaving]     = useState(false);
  const [catFilter, setCatFilter] = useState('');
  const [toast, setToast]       = useState('');

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }
  function f(k: string, v: any) { setForm((p: any) => ({ ...p, [k]: v })); }

  async function load() {
    setLoading(true);
    const d = await fetch('/api/bop/sys/settings').then(r => r.json()).catch(() => ({ settings: [] }));
    const raw = (d.settings ?? []).filter((s: any) => s.key?.startsWith('ai_prompt_'));
    const parsed = raw.map((s: any) => {
      try { return { ...JSON.parse(s.value), _key: s.key }; } catch { return null; }
    }).filter(Boolean);
    setPrompts(parsed);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function save() {
    if (!form.name?.trim() || !form.template?.trim()) return;
    setSaving(true);
    const key = 'ai_prompt_' + form.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    await fetch('/api/bop/sys/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: JSON.stringify({ ...form, updated_at: new Date().toISOString() }) }),
    });
    setSaving(false); setEditing(false);
    showToast(form._key ? 'Updated' : 'Saved');
    void load();
  }

  async function del(p: any) {
    if (!p._key || !confirm('Delete "' + p.name + '"?')) return;
    await fetch('/api/bop/sys/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: p._key, value: '' }) });
    showToast('Deleted'); setSelected(null); void load();
  }

  const filtered = catFilter ? prompts.filter(p => p.category === catFilter) : prompts;

  return (
    <div>
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}
      <ScreenHeader title="Prompt & Template Manager" description="AI003 — Reusable prompt templates for Claude agents, stored in bop_settings" />

      <div className="flex gap-4">
        {/* Prompt list */}
        <div className="flex-1">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex gap-1">
              <button onClick={() => setCatFilter('')}
                className={'rounded-lg px-3 py-1.5 text-xs font-medium ' + (!catFilter ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-500')}>
                All
              </button>
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setCatFilter(c === catFilter ? '' : c)}
                  className={'rounded-lg px-3 py-1.5 text-xs font-medium capitalize ' + (catFilter === c ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-500')}>
                  {c}
                </button>
              ))}
            </div>
            <button onClick={() => { setForm(EMPTY_PROMPT); setEditing(true); setSelected(null); }}
              className="ml-auto rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
              + New Template
            </button>
          </div>

          {loading ? (
            <div className="flex h-40 items-center justify-center text-sm text-slate-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-slate-400">No templates yet</p>
              <p className="text-xs text-slate-300 mt-1">Templates are stored as JSON in bop_settings with key prefix ai_prompt_</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((p: any) => (
                <div key={p._key}
                  onClick={() => { setSelected(p); setEditing(false); }}
                  className={'rounded-xl border bg-white p-4 cursor-pointer hover:border-blue-200 transition-colors ' + (selected?._key === p._key ? 'border-blue-300 bg-blue-50' : 'border-slate-200')}>
                  <div className="flex items-center gap-2">
                    <span className={'rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ' + (CAT_COLOR[p.category] ?? 'bg-slate-100 text-slate-500')}>{p.category}</span>
                    <span className="font-semibold text-slate-800 text-sm">{p.name}</span>
                  </div>
                  {p.description && <p className="mt-1 text-xs text-slate-400 truncate">{p.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail / edit panel */}
        {(selected || editing) && (
          <div className="w-96 rounded-xl border border-slate-200 bg-white p-5 flex-shrink-0">
            {editing ? (
              <>
                <p className="mb-4 text-sm font-semibold text-slate-700">
                  {form._key ? 'Edit Template' : 'New Template'}
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
                    <input value={form.name} onChange={e => f('name', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                    <select value={form.category} onChange={e => f('category', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                    <input value={form.description} onChange={e => f('description', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Variables (comma-separated)</label>
                    <input value={form.variables} onChange={e => f('variables', e.target.value)}
                      placeholder="customer_name, product, date"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Template *</label>
                    <textarea value={form.template} onChange={e => f('template', e.target.value)} rows={8}
                      placeholder="You are a helpful assistant for DES..."
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:border-blue-400 focus:outline-none" />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => setEditing(false)} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm text-slate-600">Cancel</button>
                  <button onClick={() => { void save(); }} disabled={saving || !form.name?.trim() || !form.template?.trim()}
                    className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </>
            ) : selected && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <span className={'rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ' + (CAT_COLOR[selected.category] ?? 'bg-slate-100 text-slate-500')}>{selected.category}</span>
                  <div className="flex gap-2">
                    <button onClick={() => { setForm(selected); setEditing(true); }} className="text-xs text-blue-500 hover:underline">Edit</button>
                    <button onClick={() => { void del(selected); }} className="text-xs text-red-400 hover:underline">Delete</button>
                  </div>
                </div>
                <h3 className="font-semibold text-slate-800 mb-1">{selected.name}</h3>
                {selected.description && <p className="text-xs text-slate-400 mb-3">{selected.description}</p>}
                {selected.variables && (
                  <div className="mb-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Variables</p>
                    <div className="flex flex-wrap gap-1">
                      {selected.variables.split(',').map((v: string) => (
                        <span key={v} className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600">{v.trim()}</span>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Template</p>
                <pre className="rounded-lg bg-slate-50 border border-slate-100 p-3 font-mono text-xs text-slate-600 whitespace-pre-wrap max-h-60 overflow-y-auto">{selected.template}</pre>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
