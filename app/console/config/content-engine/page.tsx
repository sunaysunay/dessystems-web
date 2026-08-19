'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import DataGrid, { type Column } from '@/components/DataGrid';

interface FieldDef {
  id: string;
  key: string;
  label: Record<string, string>;
  field_type: string;
  section: string;
  searchable: boolean;
  sort_order: number;
  options: string[] | null;
  unit: string | null;
  show_if: Record<string, unknown> | null;
}

const LOCALES = ['en', 'nl', 'de', 'fr', 'es'];
const FIELD_TYPES = ['text', 'number', 'boolean', 'select', 'multiselect', 'date', 'rich_text', 'json'];

const columns: Column<FieldDef>[] = [
  { key: 'key', header: 'Key', sortable: true, width: '180px', pin: 'left',
    render: (r) => <span className="font-mono text-xs">{r.key}</span> },
  { key: 'label', header: 'Label', sortable: true, width: '200px',
    render: (r) => <span>{r.label?.en ?? r.label?.nl ?? '—'}</span>,
    value: (r) => r.label?.en ?? '' },
  { key: 'field_type', header: 'Type', sortable: true, width: '120px' },
  { key: 'section', header: 'Section', sortable: true, width: '140px' },
  { key: 'searchable', header: 'Searchable', width: '100px', sortable: true,
    render: (r) => <span className={`text-xs font-semibold ${r.searchable ? 'text-emerald-600' : 'text-slate-400'}`}>{r.searchable ? 'Yes' : 'No'}</span>,
    value: (r) => r.searchable ? 1 : 0 },
  { key: 'sort_order', header: 'Sort', sortable: true, width: '80px', align: 'right' },
];

export default function CE001Page() {
  const [defs, setDefs] = useState<FieldDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<FieldDef | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Partial<FieldDef>>({});

  const load = () => {
    setLoading(true);
    fetch('/api/bop/content-engine/definitions')
      .then(r => r.json())
      .then(d => setDefs(d.definitions ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openEditor = (def: FieldDef) => {
    setEditing(def);
    setCreating(false);
    setDraft({ ...def });
  };

  const openCreate = () => {
    setEditing(null);
    setCreating(true);
    setDraft({ key: '', label: { en: '', nl: '', de: '', fr: '', es: '' }, field_type: 'text', section: '', searchable: false, sort_order: 0, options: null, unit: null, show_if: null });
  };

  const save = async () => {
    setSaving(true);
    try {
      if (creating) {
        await fetch('/api/bop/content-engine/definitions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
      } else if (editing) {
        await fetch('/api/bop/content-engine/definitions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...draft }) });
      }
      setEditing(null);
      setCreating(false);
      load();
    } finally { setSaving(false); }
  };

  const panelOpen = editing !== null || creating;

  return (
    <div className="p-6 space-y-4">
      <ScreenHeader title="Content Engine — Field Catalog" description="Manage field definitions used by listing tab templates" />

      <DataGrid
        columns={columns}
        rows={defs}
        rowKey={(r) => r.id}
        loading={loading}
        emptyMessage="No field definitions found"
        onRowClick={openEditor}
        toolbar={
          <button onClick={openCreate} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition">+ Add Field</button>
        }
      />

      {/* Slide-over editor */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => { setEditing(null); setCreating(false); }} />
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 shadow-xl overflow-y-auto p-6 space-y-4">
            <h2 className="text-lg font-bold">{creating ? 'New Field Definition' : `Edit: ${editing?.key}`}</h2>

            <label className="block text-xs font-semibold text-slate-500 uppercase">Key</label>
            <input value={draft.key ?? ''} onChange={e => setDraft(d => ({ ...d, key: e.target.value }))} disabled={!creating}
              className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm font-mono disabled:opacity-50" />

            <label className="block text-xs font-semibold text-slate-500 uppercase mt-3">Labels</label>
            {LOCALES.map(loc => (
              <div key={loc} className="flex items-center gap-2">
                <span className="w-8 text-xs font-mono text-slate-400 uppercase">{loc}</span>
                <input value={(draft.label as Record<string, string>)?.[loc] ?? ''} onChange={e => setDraft(d => ({ ...d, label: { ...(d.label as Record<string, string> ?? {}), [loc]: e.target.value } }))}
                  className="flex-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm" />
              </div>
            ))}

            <label className="block text-xs font-semibold text-slate-500 uppercase mt-3">Field Type</label>
            <select value={draft.field_type ?? 'text'} onChange={e => setDraft(d => ({ ...d, field_type: e.target.value }))}
              className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm">
              {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <label className="block text-xs font-semibold text-slate-500 uppercase mt-3">Section</label>
            <input value={draft.section ?? ''} onChange={e => setDraft(d => ({ ...d, section: e.target.value }))}
              className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm" />

            <label className="block text-xs font-semibold text-slate-500 uppercase mt-3">Unit</label>
            <input value={draft.unit ?? ''} onChange={e => setDraft(d => ({ ...d, unit: e.target.value || null }))}
              className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm" placeholder="e.g. kg, cm, kW" />

            <label className="block text-xs font-semibold text-slate-500 uppercase mt-3">Options (comma-separated)</label>
            <input value={(draft.options ?? []).join(', ')} onChange={e => setDraft(d => ({ ...d, options: e.target.value ? e.target.value.split(',').map(s => s.trim()) : null }))}
              className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm" placeholder="option1, option2" />

            <label className="block text-xs font-semibold text-slate-500 uppercase mt-3">show_if (JSON)</label>
            <textarea value={draft.show_if ? JSON.stringify(draft.show_if, null, 2) : ''} onChange={e => { try { setDraft(d => ({ ...d, show_if: e.target.value ? JSON.parse(e.target.value) : null })); } catch {} }}
              className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm font-mono h-20" />

            <div className="flex items-center gap-2 mt-3">
              <input type="checkbox" checked={draft.searchable ?? false} onChange={e => setDraft(d => ({ ...d, searchable: e.target.checked }))} />
              <label className="text-sm">Searchable</label>
            </div>

            <label className="block text-xs font-semibold text-slate-500 uppercase mt-3">Sort Order</label>
            <input type="number" value={draft.sort_order ?? 0} onChange={e => setDraft(d => ({ ...d, sort_order: Number(e.target.value) }))}
              className="w-24 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm" />

            <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button onClick={save} disabled={saving}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition">{saving ? 'Saving…' : 'Save'}</button>
              <button onClick={() => { setEditing(null); setCreating(false); }}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
