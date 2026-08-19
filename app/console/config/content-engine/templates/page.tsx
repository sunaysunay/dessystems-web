'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';
import DataGrid, { StatusBadge, type Column } from '@/components/DataGrid';

interface Template {
  id: string;
  name: string;
  slug: string;
  locked: boolean;
  tab_order: unknown[];
  updated_at: string;
}

const columns: Column<Template>[] = [
  { key: 'name', header: 'Name', sortable: true, width: '240px', pin: 'left',
    render: (r) => <span className="font-medium">{r.name}</span> },
  { key: 'slug', header: 'Slug', sortable: true, width: '200px',
    render: (r) => <span className="font-mono text-xs text-slate-500">{r.slug}</span> },
  { key: 'locked', header: 'Locked', width: '100px', sortable: true,
    render: (r) => r.locked ? <StatusBadge status="blocked" label="Locked" /> : <StatusBadge status="active" label="Open" />,
    value: (r) => r.locked ? 1 : 0 },
  { key: 'tabs', header: 'Tabs', width: '80px', align: 'right',
    render: (r) => <span className="text-sm">{Array.isArray(r.tab_order) ? r.tab_order.length : 0}</span>,
    value: (r) => Array.isArray(r.tab_order) ? r.tab_order.length : 0 },
  { key: 'updated_at', header: 'Last Updated', width: '160px', sortable: true,
    render: (r) => <span className="text-xs text-slate-500">{r.updated_at ? new Date(r.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>,
    value: (r) => r.updated_at ?? '' },
];

export default function CE002Page() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    fetch('/api/bop/content-engine/templates')
      .then(r => r.json())
      .then(d => setTemplates(d.templates ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!newName || !newSlug) return;
    setCreating(true);
    try {
      await fetch('/api/bop/content-engine/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, slug: newSlug, tab_order: [], locked: false }),
      });
      setShowCreate(false);
      setNewName('');
      setNewSlug('');
      load();
    } finally { setCreating(false); }
  };

  return (
    <div className="p-6 space-y-4">
      <ScreenHeader title="Content Engine — Templates" description="Manage listing tab templates" />

      <DataGrid
        columns={columns}
        rows={templates}
        rowKey={(r) => r.id}
        loading={loading}
        emptyMessage="No templates found"
        onRowClick={(r) => router.push(`/console/config/content-engine/templates/${r.id}`)}
        toolbar={
          <button onClick={() => setShowCreate(true)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition">+ New Template</button>
        }
      />

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold">New Template</h2>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase">Name</label>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm mt-1" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase">Slug</label>
              <input value={newSlug} onChange={e => setNewSlug(e.target.value)}
                className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm font-mono mt-1" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={create} disabled={creating || !newName || !newSlug}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition">{creating ? 'Creating…' : 'Create'}</button>
              <button onClick={() => setShowCreate(false)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
