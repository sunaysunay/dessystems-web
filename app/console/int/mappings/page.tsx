'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { BopSelect } from '@/components/BopSelect';

const TRANSFORMS = ['direct','lookup','concat','slice','regex','js_expr'] as const;
type Transform = typeof TRANSFORMS[number];

const TRANSFORM_LABEL: Record<Transform, string> = {
  direct: 'Direct copy', lookup: 'Code lookup', concat: 'Concat',
  slice: 'Slice', regex: 'Regex extract', js_expr: 'JS expression',
};

const transBadge = (t: string) => {
  const colors: Record<string, string> = {
    direct: 'bg-slate-100 text-slate-600', lookup: 'bg-cyan-100 text-cyan-700',
    concat: 'bg-indigo-100 text-indigo-700', slice: 'bg-amber-100 text-amber-700',
    regex: 'bg-orange-100 text-orange-700', js_expr: 'bg-purple-100 text-purple-700',
  };
  return colors[t] ?? 'bg-slate-100 text-slate-600';
};

export default function IT005Page() {
  const [flows, setFlows] = useState<any[]>([]);
  const [selectedFlow, setSelectedFlow] = useState('');
  const [mappings, setMappings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const [adding, setAdding] = useState(false);
  const [nSrc, setNSrc] = useState('');
  const [nTgt, setNTgt] = useState('');
  const [nTrans, setNTrans] = useState<Transform>('direct');
  const [nExpr, setNExpr] = useState('');
  const [nDef, setNDef] = useState('');
  const [nReq, setNReq] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editId, setEditId] = useState<string|null>(null);
  const [editFields, setEditFields] = useState<Record<string,any>>({});

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  useEffect(() => {
    void fetch('/api/bop/int/flows').then(r => r.json()).then(j => setFlows(j.flows ?? []));
  }, []);

  useEffect(() => {
    if (!selectedFlow) { setMappings([]); return; }
    setLoading(true);
    void fetch(`/api/bop/int/mappings?flow_id=${selectedFlow}`)
      .then(r => r.json())
      .then(j => { setMappings(j.mappings ?? []); setLoading(false); });
  }, [selectedFlow]);

  async function addMapping() {
    if (!selectedFlow || !nSrc || !nTgt) return;
    setSaving(true);
    const j = await fetch('/api/bop/int/mappings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        flow_id: selectedFlow,
        source_field: nSrc, target_field: nTgt,
        transform: nTrans, transform_expr: nExpr || null,
        default_val: nDef || null, required: nReq,
        sort_order: mappings.length,
      }),
    }).then(r => r.json());
    setSaving(false);
    if (j.id) {
      setMappings(m => [...m, j]);
      setAdding(false); setNSrc(''); setNTgt(''); setNTrans('direct'); setNExpr(''); setNDef(''); setNReq(false);
      showToast('Mapping added');
    } else { showToast(j.error || 'Failed'); }
  }

  async function saveEdit(id: string) {
    const j = await fetch('/api/bop/int/mappings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...editFields }),
    }).then(r => r.json());
    if (j.id) {
      setMappings(ms => ms.map(m => m.id === id ? j : m));
      setEditId(null); showToast('Saved');
    } else { showToast(j.error || 'Failed'); }
  }

  async function deleteMapping(id: string) {
    if (!confirm('Delete this mapping?')) return;
    const j = await fetch('/api/bop/int/mappings', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).then(r => r.json());
    if (j.ok) { setMappings(ms => ms.filter(m => m.id !== id)); showToast('Deleted'); }
    else showToast(j.error || 'Failed');
  }

  return (
    <div className="p-6 max-w-[1100px]">
      <ScreenHeader title="Field Mapping Studio" description="IT005 — Define source→target field transform rules per integration flow" />

      <div className="mb-6 flex items-center gap-3">
        <label className="text-sm font-semibold text-slate-600">Flow:</label>
        <div className="w-72">
          <BopSelect size="md" value={selectedFlow} onChange={setSelectedFlow}
            options={[{ value: '', label: '— select a flow —' }, ...flows.map(f => ({ value: f.id, label: `${f.flow_key} · ${f.name}` }))]} />
        </div>
        {selectedFlow && (
          <button onClick={() => setAdding(a => !a)}
            className="ml-auto rounded-lg bg-cyan-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-cyan-700">
            + Add mapping
          </button>
        )}
      </div>

      {adding && (
        <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 p-4">
          <h3 className="mb-3 text-sm font-bold text-cyan-800">New field mapping</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Source field</label>
              <input value={nSrc} onChange={e => setNSrc(e.target.value)} placeholder="e.g. merk"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Target field</label>
              <input value={nTgt} onChange={e => setNTgt(e.target.value)} placeholder="e.g. make"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Transform</label>
              <BopSelect size="md" value={nTrans} onChange={v => setNTrans(v as Transform)}
                options={TRANSFORMS.map(t => ({ value: t, label: TRANSFORM_LABEL[t] }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Expression / pattern</label>
              <input value={nExpr} onChange={e => setNExpr(e.target.value)} placeholder="optional"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Default value</label>
              <input value={nDef} onChange={e => setNDef(e.target.value)} placeholder="optional"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="nReq" checked={nReq} onChange={e => setNReq(e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-cyan-600" />
              <label htmlFor="nReq" className="text-sm text-slate-600">Required</label>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => setAdding(false)} className="rounded-lg border border-slate-200 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={() => { void addMapping(); }} disabled={saving || !nSrc || !nTgt}
              className="rounded-lg bg-cyan-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-40">
              {saving ? 'Saving…' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {!selectedFlow ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center text-slate-400">Select a flow above to view its field mappings.</div>
      ) : loading ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center text-slate-400">Loading…</div>
      ) : mappings.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center text-slate-400">No field mappings defined for this flow yet.</div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Source field</th>
                <th className="px-4 py-2">Target field</th>
                <th className="px-4 py-2">Transform</th>
                <th className="px-4 py-2">Expression</th>
                <th className="px-4 py-2">Default</th>
                <th className="px-4 py-2">Req</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mappings.map((m, i) => editId === m.id ? (
                <tr key={m.id} className="bg-cyan-50">
                  <td className="px-4 py-2 text-slate-400">{i + 1}</td>
                  <td className="px-4 py-2"><input defaultValue={m.source_field} onChange={e => setEditFields(f => ({ ...f, source_field: e.target.value }))}
                    className="w-full rounded border border-slate-200 px-2 py-1 text-sm" /></td>
                  <td className="px-4 py-2"><input defaultValue={m.target_field} onChange={e => setEditFields(f => ({ ...f, target_field: e.target.value }))}
                    className="w-full rounded border border-slate-200 px-2 py-1 text-sm" /></td>
                  <td className="px-4 py-2">
                    <BopSelect size="sm" value={editFields.transform ?? m.transform} onChange={v => setEditFields(f => ({ ...f, transform: v }))}
                      options={TRANSFORMS.map(t => ({ value: t, label: TRANSFORM_LABEL[t] }))} />
                  </td>
                  <td className="px-4 py-2"><input defaultValue={m.transform_expr ?? ''} onChange={e => setEditFields(f => ({ ...f, transform_expr: e.target.value || null }))}
                    className="w-full rounded border border-slate-200 px-2 py-1 text-sm" /></td>
                  <td className="px-4 py-2"><input defaultValue={m.default_val ?? ''} onChange={e => setEditFields(f => ({ ...f, default_val: e.target.value || null }))}
                    className="w-full rounded border border-slate-200 px-2 py-1 text-sm" /></td>
                  <td className="px-4 py-2"><input type="checkbox" defaultChecked={m.required} onChange={e => setEditFields(f => ({ ...f, required: e.target.checked }))}
                    className="h-4 w-4 accent-cyan-600" /></td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <button onClick={() => { void saveEdit(m.id); }} className="mr-2 rounded bg-cyan-600 px-2 py-0.5 text-xs text-white hover:bg-cyan-700">Save</button>
                    <button onClick={() => setEditId(null)} className="text-slate-400 hover:text-slate-600 text-xs">Cancel</button>
                  </td>
                </tr>
              ) : (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-400 text-xs">{m.sort_order ?? i}</td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-700">{m.source_field}</td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-700">{m.target_field}</td>
                  <td className="px-4 py-2"><span className={`rounded px-2 py-0.5 text-xs font-medium ${transBadge(m.transform)}`}>{TRANSFORM_LABEL[m.transform as Transform] ?? m.transform}</span></td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-500">{m.transform_expr ?? '—'}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">{m.default_val ?? '—'}</td>
                  <td className="px-4 py-2">{m.required ? <span className="text-cyan-600 text-xs font-bold">Yes</span> : <span className="text-slate-300 text-xs">No</span>}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <button onClick={() => { setEditId(m.id); setEditFields({}); }} className="mr-2 text-xs text-slate-400 hover:text-slate-700">Edit</button>
                    <button onClick={() => { void deleteMapping(m.id); }} className="text-xs text-red-400 hover:text-red-600">Del</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
