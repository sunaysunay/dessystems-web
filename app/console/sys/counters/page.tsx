'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

interface Counter {
  id: string;
  object_name: string;
  short_code: string;
  counter: number;
  updated_at: string;
}

export default function SY013Page() {
  const [items, setItems] = useState<Counter[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newCounter, setNewCounter] = useState(0);
  const [adding, setAdding] = useState(false);

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  function load() {
    void fetch('/api/bop/sys/counters').then(r => r.json()).then(j => {
      setItems(j.counters ?? []);
      setLoading(false);
    });
  }

  useEffect(() => { load(); }, []);

  function startEdit(c: Counter) { setEditId(c.id); setEditValue(c.counter); }
  function cancelEdit() { setEditId(null); }

  async function saveEdit(id: string) {
    setSaving(true);
    const res = await fetch('/api/bop/sys/counters', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, counter: editValue }),
    });
    if (res.ok) {
      const updated = await res.json();
      setItems(prev => prev.map(i => i.id === id ? updated : i));
      showToast('Counter updated');
      setEditId(null);
    } else {
      const err = await res.json();
      showToast('Error: ' + (err.error || 'Unknown'));
    }
    setSaving(false);
  }

  async function confirmDelete() {
    if (!deleteId) return;
    const res = await fetch('/api/bop/sys/counters', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: deleteId }),
    });
    if (res.ok) {
      setItems(prev => prev.filter(i => i.id !== deleteId));
      showToast('Counter deleted');
    } else {
      showToast('Delete failed');
    }
    setDeleteId(null);
  }

  async function saveAdd() {
    if (!newName.trim() || !newCode.trim()) { showToast('Name and code are required'); return; }
    setAdding(true);
    const res = await fetch('/api/bop/sys/counters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ object_name: newName.trim(), short_code: newCode.trim(), counter: newCounter }),
    });
    if (res.ok) {
      const created = await res.json();
      setItems(prev => [...prev, created].sort((a, b) => a.object_name.localeCompare(b.object_name)));
      showToast('Counter created');
      setAddOpen(false);
      setNewName('');
      setNewCode('');
      setNewCounter(0);
    } else {
      const err = await res.json();
      showToast('Error: ' + (err.error || 'Unknown'));
    }
    setAdding(false);
  }

  function cancelAdd() { setAddOpen(false); setNewName(''); setNewCode(''); setNewCounter(0); }

  function fmtDate(ts: string) {
    if (!ts) return '—';
    return new Date(ts).toLocaleString('nl-NL', { dateStyle: 'short', timeStyle: 'short' });
  }

  const accentMap: Record<string, string> = {
    lead: 'border-l-violet-500',
    order: 'border-l-blue-500',
    payment: 'border-l-emerald-500',
    quote: 'border-l-orange-500',
  };

  return (
    <div>
      <ScreenHeader title="Counters" description="Sequential ID counters for CRM objects — SY013" />

      {toast && (
        <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading…</div>
      ) : (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {items.map(c => (
              <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{c.object_name}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums font-mono text-slate-800">
                  {c.short_code}{c.counter + 1}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-400">Next ID</p>
              </div>
            ))}
          </div>

          {/* Counter table */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center px-4 py-2.5 bg-slate-50 border-b text-[11px] font-bold uppercase tracking-widest text-slate-400">
              <span className="w-32">Object</span>
              <span className="w-20">Code</span>
              <span className="w-28 text-right">Counter</span>
              <span className="w-28 text-right">Next ID</span>
              <span className="flex-1 text-right pr-2">Updated</span>
              <span className="w-24" />
            </div>

            <div className="divide-y divide-slate-100">
              {items.map(c => {
                const isEditing = editId === c.id;
                const accent = accentMap[c.object_name] || 'border-l-slate-300';
                return (
                  <div key={c.id} className={`flex items-center px-4 py-2.5 hover:bg-slate-50/60 group border-l-4 ${accent}`}>
                    <span className="w-32 text-sm font-medium text-slate-700">{c.object_name}</span>
                    <span className="w-20">
                      <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono font-bold text-slate-600">{c.short_code}</span>
                    </span>

                    <span className="w-28 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editValue}
                          onChange={e => setEditValue(Number(e.target.value))}
                          className="w-24 rounded border border-slate-300 px-2 py-0.5 text-sm text-right font-mono focus:outline-none focus:ring-1 focus:ring-blue-400"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') void saveEdit(c.id);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                        />
                      ) : (
                        <span className="text-sm tabular-nums font-mono text-slate-700">{c.counter.toLocaleString()}</span>
                      )}
                    </span>

                    <span className="w-28 text-right text-sm font-mono font-bold text-slate-800">
                      {c.short_code}{isEditing ? editValue + 1 : c.counter + 1}
                    </span>

                    <span className="flex-1 text-right pr-2 text-xs text-slate-400">{fmtDate(c.updated_at)}</span>

                    <span className="w-24 flex justify-end gap-1">
                      {isEditing ? (
                        <>
                          <button onClick={() => { void saveEdit(c.id); }} disabled={saving}
                            className="rounded px-2 py-0.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                            Save
                          </button>
                          <button onClick={cancelEdit}
                            className="rounded px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100">
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(c)}
                            className="rounded px-2 py-0.5 text-xs text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-700">
                            Edit
                          </button>
                          <button onClick={() => setDeleteId(c.id)}
                            className="rounded px-2 py-0.5 text-xs text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600">
                            Delete
                          </button>
                        </>
                      )}
                    </span>
                  </div>
                );
              })}

              {items.length === 0 && !addOpen && (
                <div className="px-4 py-8 text-center text-sm text-slate-400 italic">No counters defined</div>
              )}
            </div>
          </div>

          {/* Add row */}
          {addOpen ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-blue-500">New Counter</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Object Name</label>
                  <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. invoice"
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-mono focus:outline-none" autoFocus />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Short Code</label>
                  <input value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())} placeholder="e.g. INV" maxLength={4}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-mono uppercase focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Starting Value</label>
                  <input type="number" value={newCounter} onChange={e => setNewCounter(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-mono focus:outline-none" />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => { void saveAdd(); }} disabled={adding}
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {adding ? 'Creating…' : 'Create Counter'}
                </button>
                <button onClick={cancelAdd}
                  className="rounded-lg px-4 py-1.5 text-sm text-slate-500 hover:bg-slate-100">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddOpen(true)}
              className="rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-500 hover:border-slate-400 hover:text-slate-700">
              + Add Counter
            </button>
          )}
        </div>
      )}

      {/* Delete confirmation overlay */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-96 rounded-xl bg-white p-6 shadow-2xl">
            <p className="text-lg font-semibold text-slate-800">Delete counter?</p>
            <p className="mt-2 text-sm text-slate-500">
              This permanently removes the counter. ID generation for this object will stop until a new counter is created.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setDeleteId(null)}
                className="rounded-lg px-4 py-2 text-sm text-slate-500 hover:bg-slate-100">Cancel</button>
              <button onClick={() => { void confirmDelete(); }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
