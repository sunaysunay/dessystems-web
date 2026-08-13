'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { BopSelect } from '@/components/BopSelect';

export default function IT006Page() {
  const [systems, setSystems] = useState<any[]>([]);
  const [selectedSystem, setSelectedSystem] = useState('');
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [values, setValues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const [addingTable, setAddingTable] = useState(false);
  const [nTableKey, setNTableKey] = useState('');
  const [nTableDesc, setNTableDesc] = useState('');

  const [addingValue, setAddingValue] = useState(false);
  const [nSrc, setNSrc] = useState('');
  const [nTgt, setNTgt] = useState('');
  const [nLabel, setNLabel] = useState('');

  const [editId, setEditId] = useState<string|null>(null);
  const [editFields, setEditFields] = useState<Record<string,any>>({});

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  useEffect(() => {
    void fetch('/api/bop/int/connectors').then(r => r.json()).then(j => setSystems(j.systems ?? []));
  }, []);

  useEffect(() => {
    if (!selectedSystem) { setTables([]); setSelectedTable(''); setValues([]); return; }
    void fetch(`/api/bop/int/lookup-tables?system_id=${selectedSystem}`)
      .then(r => r.json()).then(j => setTables(j.tables ?? []));
    setSelectedTable(''); setValues([]);
  }, [selectedSystem]);

  useEffect(() => {
    if (!selectedTable) { setValues([]); return; }
    setLoading(true);
    void fetch(`/api/bop/int/lookup-values?table_id=${selectedTable}`)
      .then(r => r.json()).then(j => { setValues(j.values ?? []); setLoading(false); });
  }, [selectedTable]);

  async function addTable() {
    if (!selectedSystem || !nTableKey) return;
    const j = await fetch('/api/bop/int/lookup-tables', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system_id: selectedSystem, table_key: nTableKey, description: nTableDesc || null }),
    }).then(r => r.json());
    if (j.id) {
      setTables(ts => [...ts, j]);
      setAddingTable(false); setNTableKey(''); setNTableDesc('');
      setSelectedTable(j.id); showToast('Table created');
    } else showToast(j.error || 'Failed');
  }

  async function addValue() {
    if (!selectedTable || !nSrc || !nTgt) return;
    const j = await fetch('/api/bop/int/lookup-values', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lookup_table_id: selectedTable, source_code: nSrc, target_code: nTgt, label: nLabel || null }),
    }).then(r => r.json());
    if (j.id) {
      setValues(vs => [...vs, j]);
      setAddingValue(false); setNSrc(''); setNTgt(''); setNLabel('');
      showToast('Value added');
    } else showToast(j.error || 'Failed');
  }

  async function toggleActive(v: any) {
    const j = await fetch('/api/bop/int/lookup-values', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: v.id, active: !v.active }),
    }).then(r => r.json());
    if (j.id) setValues(vs => vs.map(x => x.id === v.id ? j : x));
    else showToast(j.error || 'Failed');
  }

  async function saveEdit(id: string) {
    const j = await fetch('/api/bop/int/lookup-values', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...editFields }),
    }).then(r => r.json());
    if (j.id) { setValues(vs => vs.map(x => x.id === id ? j : x)); setEditId(null); showToast('Saved'); }
    else showToast(j.error || 'Failed');
  }

  async function deleteValue(id: string) {
    if (!confirm('Delete this translation?')) return;
    const j = await fetch('/api/bop/int/lookup-values', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).then(r => r.json());
    if (j.ok) { setValues(vs => vs.filter(x => x.id !== id)); showToast('Deleted'); }
    else showToast(j.error || 'Failed');
  }

  const activeTable = tables.find(t => t.id === selectedTable);

  return (
    <div className="p-6 max-w-[1100px]">
      <ScreenHeader title="Lookup Code Translation" description="IT006 — Translate external codes to DES canonical values" />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold text-slate-600">System:</label>
        <div className="w-56">
          <BopSelect size="md" value={selectedSystem} onChange={setSelectedSystem}
            options={[{ value: '', label: '— select —' }, ...systems.map(s => ({ value: s.id, label: `${s.system_key} · ${s.name}` }))]} />
        </div>
        {selectedSystem && (<>
          <label className="text-sm font-semibold text-slate-600">Table:</label>
          <div className="w-64">
            <BopSelect size="md" value={selectedTable} onChange={setSelectedTable}
              options={[{ value: '', label: '— select table —' }, ...tables.map(t => ({ value: t.id, label: `${t.table_key}${t.description ? ' · ' + t.description : ''}` }))]} />
          </div>
          <button onClick={() => setAddingTable(a => !a)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            + New table
          </button>
        </>)}
      </div>

      {addingTable && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-bold text-slate-800">New lookup table</h3>
          <div className="flex gap-3">
            <input value={nTableKey} onChange={e => setNTableKey(e.target.value)} placeholder="table_key e.g. rdw.fuel"
              className="w-48 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
            <input value={nTableDesc} onChange={e => setNTableDesc(e.target.value)} placeholder="description (optional)"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
            <button onClick={() => setAddingTable(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50">Cancel</button>
            <button onClick={() => { void addTable(); }} disabled={!nTableKey}
              className="rounded-lg bg-cyan-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-40">Create</button>
          </div>
        </div>
      )}

      {selectedTable && activeTable && (
        <>
          <div className="mb-3 flex items-center gap-3">
            <div>
              <span className="font-mono text-sm font-bold text-slate-800">{activeTable.table_key}</span>
              {activeTable.description && <span className="ml-2 text-sm text-slate-500">{activeTable.description}</span>}
              <span className="ml-3 text-xs text-slate-400">{values.length} translation{values.length !== 1 ? 's' : ''}</span>
            </div>
            <button onClick={() => setAddingValue(a => !a)}
              className="ml-auto rounded-lg bg-cyan-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-cyan-700">
              + Add translation
            </button>
          </div>

          {addingValue && (
            <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 p-4">
              <div className="flex flex-wrap gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Source code (external)</label>
                  <input value={nSrc} onChange={e => setNSrc(e.target.value)} placeholder="e.g. Benzine"
                    className="w-40 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                </div>
                <div className="self-end pb-1.5 text-slate-400">→</div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Target code (DES)</label>
                  <input value={nTgt} onChange={e => setNTgt(e.target.value)} placeholder="e.g. petrol"
                    className="w-40 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Label (display)</label>
                  <input value={nLabel} onChange={e => setNLabel(e.target.value)} placeholder="optional"
                    className="w-40 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                </div>
                <div className="flex items-end gap-2 pb-0.5">
                  <button onClick={() => setAddingValue(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50">Cancel</button>
                  <button onClick={() => { void addValue(); }} disabled={!nSrc || !nTgt}
                    className="rounded-lg bg-cyan-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-40">Add</button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white px-6 py-8 text-center text-slate-400">Loading…</div>
          ) : values.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-6 py-8 text-center text-slate-400">No translations yet. Add the first one above.</div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Source (external)</th>
                    <th className="px-4 py-2"></th>
                    <th className="px-4 py-2">Target (DES)</th>
                    <th className="px-4 py-2">Label</th>
                    <th className="px-4 py-2">Active</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {values.map(v => editId === v.id ? (
                    <tr key={v.id} className="bg-cyan-50">
                      <td className="px-4 py-2"><input defaultValue={v.source_code} onChange={e => setEditFields(f => ({ ...f, source_code: e.target.value }))}
                        className="w-full rounded border border-slate-200 px-2 py-1 font-mono text-sm" /></td>
                      <td className="px-4 py-2 text-slate-400">→</td>
                      <td className="px-4 py-2"><input defaultValue={v.target_code} onChange={e => setEditFields(f => ({ ...f, target_code: e.target.value }))}
                        className="w-full rounded border border-slate-200 px-2 py-1 font-mono text-sm" /></td>
                      <td className="px-4 py-2"><input defaultValue={v.label ?? ''} onChange={e => setEditFields(f => ({ ...f, label: e.target.value || null }))}
                        className="w-full rounded border border-slate-200 px-2 py-1 text-sm" /></td>
                      <td className="px-4 py-2"><input type="checkbox" defaultChecked={v.active} onChange={e => setEditFields(f => ({ ...f, active: e.target.checked }))}
                        className="h-4 w-4 accent-cyan-600" /></td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <button onClick={() => { void saveEdit(v.id); }} className="mr-2 rounded bg-cyan-600 px-2 py-0.5 text-xs text-white hover:bg-cyan-700">Save</button>
                        <button onClick={() => setEditId(null)} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={v.id} className={`hover:bg-slate-50 ${!v.active ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-2 font-mono text-xs text-slate-700">{v.source_code}</td>
                      <td className="px-4 py-2 text-slate-400">→</td>
                      <td className="px-4 py-2 font-mono text-xs font-medium text-cyan-700">{v.target_code}</td>
                      <td className="px-4 py-2 text-xs text-slate-500">{v.label ?? '—'}</td>
                      <td className="px-4 py-2">
                        <button onClick={() => { void toggleActive(v); }}
                          className={`rounded px-2 py-0.5 text-xs font-semibold ${v.active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                          {v.active ? 'Active' : 'Off'}
                        </button>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <button onClick={() => { setEditId(v.id); setEditFields({}); }} className="mr-2 text-xs text-slate-400 hover:text-slate-700">Edit</button>
                        <button onClick={() => { void deleteValue(v.id); }} className="text-xs text-red-400 hover:text-red-600">Del</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {!selectedSystem && (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center text-slate-400">Select a system to manage its lookup tables.</div>
      )}
      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
