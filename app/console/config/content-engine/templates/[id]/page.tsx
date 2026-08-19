'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';

interface TabSection {
  title: string;
  fields: string[];
}

interface Tab {
  id: string;
  label: string;
  sections: TabSection[];
}

interface Template {
  id: string;
  name: string;
  slug: string;
  locked: boolean;
  tab_order: Tab[];
  updated_at: string;
}

export default function CE003Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [saving, setSaving] = useState(false);
  const [force, setForce] = useState(false);
  const [error, setError] = useState('');
  const [previewTab, setPreviewTab] = useState(0);
  const [addingTab, setAddingTab] = useState(false);
  const [newTabLabel, setNewTabLabel] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/bop/content-engine/templates/${id}`)
      .then(r => r.json())
      .then(d => {
        setTemplate(d.template);
        const t = Array.isArray(d.template?.tab_order) ? d.template.tab_order : [];
        setTabs(t);
        setJsonText(JSON.stringify(t, null, 2));
      })
      .finally(() => setLoading(false));
  }, [id]);

  const moveTab = (i: number, dir: -1 | 1) => {
    const next = [...tabs];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setTabs(next);
    setJsonText(JSON.stringify(next, null, 2));
  };

  const removeTab = (i: number) => {
    const next = tabs.filter((_, idx) => idx !== i);
    setTabs(next);
    setJsonText(JSON.stringify(next, null, 2));
  };

  const addTab = () => {
    if (!newTabLabel) return;
    const tabId = newTabLabel.toLowerCase().replace(/\s+/g, '_');
    const next = [...tabs, { id: tabId, label: newTabLabel, sections: [] }];
    setTabs(next);
    setJsonText(JSON.stringify(next, null, 2));
    setNewTabLabel('');
    setAddingTab(false);
  };

  const addSection = (tabIdx: number) => {
    const next = [...tabs];
    next[tabIdx] = { ...next[tabIdx], sections: [...next[tabIdx].sections, { title: 'New Section', fields: [] }] };
    setTabs(next);
    setJsonText(JSON.stringify(next, null, 2));
  };

  const updateSectionTitle = (tabIdx: number, secIdx: number, title: string) => {
    const next = [...tabs];
    next[tabIdx] = { ...next[tabIdx], sections: next[tabIdx].sections.map((s, i) => i === secIdx ? { ...s, title } : s) };
    setTabs(next);
    setJsonText(JSON.stringify(next, null, 2));
  };

  const updateSectionFields = (tabIdx: number, secIdx: number, fieldsStr: string) => {
    const next = [...tabs];
    next[tabIdx] = { ...next[tabIdx], sections: next[tabIdx].sections.map((s, i) => i === secIdx ? { ...s, fields: fieldsStr.split(',').map(f => f.trim()).filter(Boolean) } : s) };
    setTabs(next);
    setJsonText(JSON.stringify(next, null, 2));
  };

  const removeSection = (tabIdx: number, secIdx: number) => {
    const next = [...tabs];
    next[tabIdx] = { ...next[tabIdx], sections: next[tabIdx].sections.filter((_, i) => i !== secIdx) };
    setTabs(next);
    setJsonText(JSON.stringify(next, null, 2));
  };

  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) { setJsonError('Must be a JSON array'); return; }
      setTabs(parsed);
      setJsonError('');
    } catch (e: unknown) {
      setJsonError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/bop/content-engine/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tab_order: tabs, force }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? 'Save failed'); return; }
      setTemplate(d.template);
    } finally { setSaving(false); }
  };

  if (loading) return <div className="p-6 text-slate-400">Loading…</div>;
  if (!template) return <div className="p-6 text-red-500">Template not found</div>;

  return (
    <div className="p-6 space-y-4">
      <ScreenHeader title={`Template: ${template.name}`} description={template.slug} />

      <div className="flex items-center gap-3 text-sm">
        <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${template.locked ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'}`}>
          {template.locked ? 'Locked' : 'Open'}
        </span>
        <button onClick={() => router.push('/console/config/content-engine/templates')} className="text-xs text-slate-500 hover:text-slate-700">← Back to Templates</button>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={() => setJsonMode(!jsonMode)} className="text-xs text-indigo-600 hover:underline">{jsonMode ? 'Visual Editor' : 'JSON Editor'}</button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Editor side */}
        <div className="space-y-4">
          {jsonMode ? (
            <div className="space-y-2">
              <textarea value={jsonText} onChange={e => { setJsonText(e.target.value); setJsonError(''); }}
                className="w-full h-96 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono" />
              {jsonError && <p className="text-xs text-red-500">{jsonError}</p>}
              <button onClick={applyJson} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition">Apply JSON</button>
            </div>
          ) : (
            <div className="space-y-3">
              {tabs.map((tab, ti) => (
                <div key={tab.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm flex-1">{tab.label}</span>
                    <button onClick={() => moveTab(ti, -1)} disabled={ti === 0} className="text-xs px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30">↑</button>
                    <button onClick={() => moveTab(ti, 1)} disabled={ti === tabs.length - 1} className="text-xs px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30">↓</button>
                    <button onClick={() => removeTab(ti)} className="text-xs px-1.5 py-0.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20">Remove</button>
                  </div>
                  {tab.sections.map((sec, si) => (
                    <div key={si} className="ml-4 rounded border border-slate-100 dark:border-slate-800 p-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <input value={sec.title} onChange={e => updateSectionTitle(ti, si, e.target.value)}
                          className="flex-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs" />
                        <button onClick={() => removeSection(ti, si)} className="text-xs text-red-500">×</button>
                      </div>
                      <input value={sec.fields.join(', ')} onChange={e => updateSectionFields(ti, si, e.target.value)}
                        placeholder="field_key1, field_key2"
                        className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-mono" />
                    </div>
                  ))}
                  <button onClick={() => addSection(ti)} className="text-xs text-indigo-600 hover:underline ml-4">+ Add Section</button>
                </div>
              ))}
              {addingTab ? (
                <div className="flex items-center gap-2">
                  <input value={newTabLabel} onChange={e => setNewTabLabel(e.target.value)} placeholder="Tab label"
                    className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm" />
                  <button onClick={addTab} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">Add</button>
                  <button onClick={() => setAddingTab(false)} className="text-xs text-slate-500">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setAddingTab(true)} className="text-sm text-indigo-600 hover:underline">+ Add Tab</button>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex items-center gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
            {template.locked && (
              <label className="flex items-center gap-1.5 text-xs text-amber-600">
                <input type="checkbox" checked={force} onChange={e => setForce(e.target.checked)} /> Force save (override lock)
              </label>
            )}
            <button onClick={save} disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition">{saving ? 'Saving…' : 'Save Template'}</button>
          </div>
        </div>

        {/* Preview pane */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Live Preview</div>
          {tabs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No tabs configured</div>
          ) : (
            <>
              <div className="flex border-b border-slate-200 dark:border-slate-700">
                {tabs.map((tab, i) => (
                  <button key={tab.id} onClick={() => setPreviewTab(i)}
                    className={`px-4 py-2 text-sm font-medium transition ${i === previewTab ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="p-4 space-y-4">
                {(tabs[previewTab]?.sections ?? []).map((sec, si) => (
                  <div key={si}>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{sec.title}</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {sec.fields.map(f => (
                        <div key={f} className="rounded border border-slate-200 dark:border-slate-700 px-3 py-2">
                          <div className="text-[10px] text-slate-400 uppercase">{f.replace(/_/g, ' ')}</div>
                          <div className="text-sm text-slate-300 italic">—</div>
                        </div>
                      ))}
                    </div>
                    {sec.fields.length === 0 && <p className="text-xs text-slate-400 italic">No fields in this section</p>}
                  </div>
                ))}
                {(tabs[previewTab]?.sections ?? []).length === 0 && <p className="text-xs text-slate-400 italic">No sections in this tab</p>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
