'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { BopSelect } from '@/components/BopSelect';

const PROVIDERS = ['anthropic', 'openai', 'google', 'azure', 'mistral', 'groq', 'deepseek', 'xai', 'openrouter', 'together', 'cohere', 'custom'];
const PROVIDER_DEFAULTS: Record<string, { base_url: string; model: string }> = {
  anthropic:  { base_url: 'https://api.anthropic.com', model: 'claude-sonnet-5' },
  openai:     { base_url: 'https://api.openai.com', model: 'gpt-4o' },
  google:     { base_url: 'https://generativelanguage.googleapis.com', model: 'gemini-2.5-flash' },
  azure:      { base_url: '', model: '' },
  mistral:    { base_url: 'https://api.mistral.ai', model: 'mistral-large-latest' },
  groq:       { base_url: 'https://api.groq.com/openai', model: 'llama-3.3-70b-versatile' },
  deepseek:   { base_url: 'https://api.deepseek.com', model: 'deepseek-chat' },
  xai:        { base_url: 'https://api.x.ai', model: 'grok-2-latest' },
  openrouter: { base_url: 'https://openrouter.ai/api', model: 'openai/gpt-4o' },
  together:   { base_url: 'https://api.together.xyz', model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo' },
  cohere:     { base_url: 'https://api.cohere.ai/compatibility', model: 'command-r-plus' },
  custom:     { base_url: '', model: '' },
};
const lbl = 'mb-1 block text-xs font-semibold text-slate-500';
const inp = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500';
const EMPTY = { name: '', provider: 'anthropic', model: 'claude-sonnet-5', base_url: '', system_prompt: '', temperature: 0.3, max_tokens: 1024, is_active: false, api_key: '' };

export default function AI005Page() {
  const [agents, setAgents] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);       // selected agent (from list) or null
  const [form, setForm] = useState<any>(EMPTY);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState('');
  const [toast, setToast] = useState('');

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 3000); }
  function f(k: string, v: any) { setForm((p: any) => ({ ...p, [k]: v })); }
  function applyProvider(v: string) {
    const d = PROVIDER_DEFAULTS[v] || { base_url: '', model: '' };
    setForm((p: any) => ({ ...p, provider: v, base_url: d.base_url, model: d.model || p.model }));
  }

  async function load() {
    const j = await fetch('/api/bop/ai/agents').then(r => r.json());
    setAgents(j.agents ?? []);
  }
  useEffect(() => { void load(); }, []);

  function pick(a: any) {
    setSel(a); setIsNew(false);
    setForm({ name: a.name, provider: a.provider, model: a.model, base_url: a.base_url ?? '', system_prompt: a.system_prompt ?? '', temperature: a.temperature ?? 0.3, max_tokens: a.max_tokens ?? 1024, is_active: a.is_active, api_key: '' });
  }
  function newAgent() { setSel(null); setIsNew(true); setForm(EMPTY); }

  async function save() {
    setSaving(true);
    const body = { ...form };
    const j = isNew
      ? await fetch('/api/bop/ai/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json())
      : await fetch(`/api/bop/ai/agents/${sel.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
    setSaving(false);
    if (j.error) { showToast('✗ ' + j.error); return; }
    showToast('✓ Saved'); await load();
    if (isNew && j.id) { setIsNew(false); setSel({ id: j.id }); }
  }
  async function activate(a: any) {
    await fetch(`/api/bop/ai/agents/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: true }) });
    void load();
  }
  async function del(a: any) {
    if (!confirm(`Delete agent "${a.name}"?`)) return;
    await fetch(`/api/bop/ai/agents/${a.id}`, { method: 'DELETE' });
    setSel(null); void load();
  }
  async function test() {
    if (!sel?.id) { showToast('Save the agent first'); return; }
    setTesting('…');
    const j = await fetch('/api/bop/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agent_id: sel.id, messages: [{ role: 'user', content: 'Reply with just: OK' }] }) }).then(r => r.json());
    setTesting(j.error || j.configured === false ? '✗ ' + (j.reply || 'error') : '✓ ' + (j.reply || '').slice(0, 60));
  }

  return (
    <div className="p-6">
      <ScreenHeader title="Model Configuration" description="Define AI copilot agents — provider, model, credentials, prompt" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* List */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Agents ({agents.length})</span>
            <button onClick={newAgent} className="rounded-lg bg-purple-600 px-3 py-1 text-xs font-semibold text-white hover:bg-purple-700">+ New</button>
          </div>
          <div className="space-y-1">
            {agents.map(a => (
              <button key={a.id} onClick={() => pick(a)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left ${sel?.id === a.id ? 'bg-purple-50 ring-1 ring-purple-200' : 'hover:bg-slate-50'}`}>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-800">{a.name}</div>
                  <div className="truncate text-[11px] text-slate-400">{a.provider} · {a.model}</div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  {a.is_active && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">ACTIVE</span>}
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${a.configured ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{a.configured ? 'KEY' : 'NO KEY'}</span>
                </div>
              </button>
            ))}
            {agents.length === 0 && <p className="px-2 py-4 text-center text-xs text-slate-400">No agents. Click “+ New”.</p>}
          </div>
        </div>

        {/* Editor */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {!sel && !isNew ? (
            <p className="text-sm text-slate-400">Select an agent or create a new one.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>Name</label><input className={inp} value={form.name} onChange={e => f('name', e.target.value)} placeholder="BOP Copilot (Claude)" /></div>
                <div><label className={lbl}>Provider</label><BopSelect size="md" value={form.provider} onChange={applyProvider} options={PROVIDERS.map(p => ({ value: p, label: p }))} /></div>
                <div><label className={lbl}>Model</label><input className={inp} value={form.model} onChange={e => f('model', e.target.value)} placeholder="claude-sonnet-5" /></div>
                <div><label className={lbl}>Base URL (optional)</label><input className={inp} value={form.base_url} onChange={e => f('base_url', e.target.value)} placeholder="https://api.anthropic.com" /></div>
                <div><label className={lbl}>Temperature</label><input type="number" step="0.1" className={inp} value={form.temperature} onChange={e => f('temperature', Number(e.target.value))} /></div>
                <div><label className={lbl}>Max tokens</label><input type="number" className={inp} value={form.max_tokens} onChange={e => f('max_tokens', Number(e.target.value))} /></div>
              </div>
              <div>
                <label className={lbl}>API key {sel?.has_key && <span className="text-emerald-600">· stored ••••{sel.key_last4} (leave blank to keep)</span>}</label>
                <input type="password" className={inp} value={form.api_key} onChange={e => f('api_key', e.target.value)} placeholder={sel?.has_key ? 'Leave blank to keep existing' : 'Paste API key'} autoComplete="new-password" />
              </div>
              <div><label className={lbl}>System prompt</label><textarea className={`${inp} h-28`} value={form.system_prompt} onChange={e => f('system_prompt', e.target.value)} /></div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={!!form.is_active} onChange={e => f('is_active', e.target.checked)} className="h-4 w-4 accent-emerald-600" />
                Set as active agent (default copilot)
              </label>

              <div className="flex items-center gap-2 border-t border-slate-100 pt-4">
                <button onClick={() => { void save(); }} disabled={saving} className="rounded-lg bg-purple-600 px-5 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50">{saving ? 'Saving…' : isNew ? 'Create' : 'Save'}</button>
                {!isNew && sel && <>
                  <button onClick={() => { void activate(sel); }} className="rounded-lg border border-emerald-300 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50">Set active</button>
                  <button onClick={() => { void test(); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">Test</button>
                  {testing && <span className="text-xs text-slate-500">{testing}</span>}
                  <button onClick={() => { void del(sel); }} className="ml-auto rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50">Delete</button>
                </>}
              </div>
            </div>
          )}
        </div>
      </div>
      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
