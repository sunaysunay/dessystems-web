'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import {
  GripVertical, ChevronDown, ChevronRight,
  Eye, EyeOff, Save, RotateCcw, Plus,
} from 'lucide-react';

interface LayoutField { key: string; visible: boolean; sort: number }
interface LayoutSection { id: string; visible: boolean; sort: number; fields: LayoutField[] }
interface LayoutTab { id: string; visible: boolean; sort: number; sections: LayoutSection[] }
interface LayoutConfig { tabs: LayoutTab[] }
interface LayoutRow {
  id: number; tenant_id: number; category: string;
  body_type_code: number | null; name: string;
  layout: LayoutConfig; is_active: boolean;
}

const CATEGORIES = ['van','truck','trailer','bus','camper','caravan','car','machinery','construction'];

const FIELD_LABELS: Record<string, string> = {
  category:'Category', body_type:'Body Type', brand:'Brand', model:'Model',
  year:'Year', mileage:'Mileage', fuel:'Fuel', transmission:'Transmission',
  price:'Price', vat_info:'VAT', condition:'Condition',
  reference:'Reference', country:'Country',
  power_hp:'Power', engine_cc:'Engine CC', cylinders:'Cylinders',
  fuel_consumption:'Consumption', fuel_tank:'Tank', drive_type:'Drive Type',
  emission_class:'Emission Class', color:'Color', doors:'Doors', seats:'Seats',
  length_mm:'Length', width_mm:'Width', height_mm:'Height',
  wheelbase:'Wheelbase', roof_height:'Roof Height',
  gross_vehicle_weight:'GVW', payload:'Payload', load_capacity:'Load Capacity',
  max_tow_weight:'Tow Weight', axles:'Axles',
  cargo_vol_m3:'Cargo Volume',
  apk_date:'APK Date', rdw_ok:'RDW', first_registration:'First Reg.',
  upholstery:'Upholstery',
  delivery_available:'Delivery Available', delivery_included:'Delivery Included',
  delivery_price:'Delivery Price', delivery_radius:'Delivery Radius',
  delivery_time:'Delivery Time', pickup_available:'Pickup Available',
  pickup_location:'Pickup Location', export_ready:'Export Ready',
  transport_options:'Transport Options',
};

const TAB_LABELS: Record<string, string> = {
  overview:'Overview', specs:'Specifications', cargo:'Cargo',
  condition:'Condition', delivery:'Delivery',
};

const SECTION_LABELS: Record<string, string> = {
  vehicle:'Vehicle', price:'Price', reference:'Reference', country:'Country',
  engine:'Engine', body:'Body', dimensions:'Dimensions', weight:'Weight',
  cargo:'Cargo', condition:'Condition & History', delivery:'Delivery & Transport',
};

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const result = [...arr];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result.map((item: any, i: number) => ({ ...item, sort: i + 1 }));
}

export default function LayoutManagerPage() {
  const [layouts, setLayouts] = useState<LayoutRow[]>([]);
  const [selected, setSelected] = useState<LayoutRow | null>(null);
  const [draft, setDraft] = useState<LayoutConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [category, setCategory] = useState('van');
  const [expandedTabs, setExpandedTabs] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  async function loadLayouts(cat: string) {
    setLoading(true);
    const res = await fetch(`/api/bop/mkp/listing-layouts?tenant_id=300&category=${cat}`);
    const j = await res.json();
    const list: LayoutRow[] = j.layouts ?? [];
    setLayouts(list);
    const def = list.find(l => l.body_type_code === null) ?? list[0] ?? null;
    setSelected(def);
    setDraft(def ? structuredClone(def.layout) : null);
    setExpandedTabs(new Set());
    setExpandedSections(new Set());
    setLoading(false);
  }

  useEffect(() => { void loadLayouts(category); }, [category]);

  function selectLayout(l: LayoutRow) {
    setSelected(l);
    setDraft(structuredClone(l.layout));
    setExpandedTabs(new Set());
    setExpandedSections(new Set());
  }

  function toggleTab(tabId: string) {
    setExpandedTabs(prev => {
      const next = new Set(prev);
      next.has(tabId) ? next.delete(tabId) : next.add(tabId);
      return next;
    });
  }

  function toggleSection(key: string) {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function setTabVisible(tabId: string, visible: boolean) {
    if (!draft) return;
    setDraft({
      tabs: draft.tabs.map(t => t.id === tabId ? { ...t, visible } : t),
    });
  }

  function setSectionVisible(tabId: string, sectionId: string, visible: boolean) {
    if (!draft) return;
    setDraft({
      tabs: draft.tabs.map(t => t.id === tabId ? {
        ...t,
        sections: t.sections.map(s => s.id === sectionId ? { ...s, visible } : s),
      } : t),
    });
  }

  function setFieldVisible(tabId: string, sectionId: string, fieldKey: string, visible: boolean) {
    if (!draft) return;
    setDraft({
      tabs: draft.tabs.map(t => t.id === tabId ? {
        ...t,
        sections: t.sections.map(s => s.id === sectionId ? {
          ...s,
          fields: s.fields.map(f => f.key === fieldKey ? { ...f, visible } : f),
        } : s),
      } : t),
    });
  }

  function moveTab(from: number, to: number) {
    if (!draft) return;
    setDraft({ tabs: moveItem(draft.tabs, from, to) });
  }

  function moveSection(tabId: string, from: number, to: number) {
    if (!draft) return;
    setDraft({
      tabs: draft.tabs.map(t => t.id === tabId ? {
        ...t,
        sections: moveItem(t.sections, from, to),
      } : t),
    });
  }

  function moveField(tabId: string, sectionId: string, from: number, to: number) {
    if (!draft) return;
    setDraft({
      tabs: draft.tabs.map(t => t.id === tabId ? {
        ...t,
        sections: t.sections.map(s => s.id === sectionId ? {
          ...s,
          fields: moveItem(s.fields, from, to),
        } : s),
      } : t),
    });
  }

  async function save() {
    if (!selected || !draft) return;
    setSaving(true);
    const res = await fetch('/api/bop/mkp/listing-layouts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selected.id, layout: draft }),
    });
    const j = await res.json();
    if (j.error) { showToast('Error: ' + j.error); setSaving(false); return; }
    showToast('Layout saved');
    setSaving(false);
    void loadLayouts(category);
  }

  function reset() {
    if (!selected) return;
    setDraft(structuredClone(selected.layout));
    showToast('Reset to saved');
  }

  const sortedTabs = draft ? [...draft.tabs].sort((a, b) => a.sort - b.sort) : [];

  return (
    <div>
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}
      <ScreenHeader title="Layout Manager" description="MP005 — Configure listing detail tab layouts per category and body type" />

      {/* Category selector */}
      <div className="mb-6 flex items-center gap-3">
        <label className="text-sm font-medium text-slate-600">Category</label>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm"
        >
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400">Loading layouts…</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          {/* Left: layout list */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Layouts</h3>
            {layouts.length === 0 ? (
              <p className="text-sm text-slate-400">No layouts for this category</p>
            ) : (
              <div className="space-y-1">
                {layouts.map(l => (
                  <button
                    key={l.id}
                    onClick={() => selectLayout(l)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selected?.id === l.id
                        ? 'bg-blue-50 font-semibold text-blue-700'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-medium">{l.name}</div>
                    <div className="text-xs text-slate-400">
                      {l.body_type_code ? `Body type: ${l.body_type_code}` : 'Category default'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: tree editor */}
          <div className="rounded-xl border border-slate-200 bg-white">
            {!selected ? (
              <div className="p-8 text-center text-sm text-slate-400">Select a layout to edit</div>
            ) : (
              <>
                {/* Header bar */}
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-800">{selected.name}</h2>
                    <p className="text-xs text-slate-400">{selected.category} · {selected.body_type_code ? `body type ${selected.body_type_code}` : 'category default'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={reset} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                      <RotateCcw size={14} /> Reset
                    </button>
                    <button onClick={save} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                      <Save size={14} /> {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>

                {/* Tree */}
                <div className="p-4 space-y-1">
                  {sortedTabs.map((tab, ti) => {
                    const tabExpanded = expandedTabs.has(tab.id);
                    const sortedSections = [...tab.sections].sort((a, b) => a.sort - b.sort);
                    return (
                      <div key={tab.id} className="rounded-lg border border-slate-100">
                        {/* Tab row */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-t-lg">
                          <div className="flex items-center gap-1 text-slate-300">
                            <button onClick={() => ti > 0 && moveTab(ti, ti - 1)} disabled={ti === 0} className="hover:text-slate-500 disabled:opacity-30">▲</button>
                            <button onClick={() => ti < sortedTabs.length - 1 && moveTab(ti, ti + 1)} disabled={ti === sortedTabs.length - 1} className="hover:text-slate-500 disabled:opacity-30">▼</button>
                          </div>
                          <button onClick={() => toggleTab(tab.id)} className="text-slate-400">
                            {tabExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                          <button
                            onClick={() => setTabVisible(tab.id, !tab.visible)}
                            className={tab.visible ? 'text-blue-500' : 'text-slate-300'}
                          >
                            {tab.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                          </button>
                          <span className={`text-sm font-semibold ${tab.visible ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                            {TAB_LABELS[tab.id] ?? tab.id}
                          </span>
                          <span className="ml-auto text-[10px] font-mono text-slate-300">{tab.id}</span>
                        </div>

                        {/* Sections */}
                        {tabExpanded && (
                          <div className="pl-8 pr-3 py-2 space-y-1">
                            {sortedSections.map((sec, si) => {
                              const secKey = `${tab.id}:${sec.id}`;
                              const secExpanded = expandedSections.has(secKey);
                              const sortedFields = [...sec.fields].sort((a, b) => a.sort - b.sort);
                              return (
                                <div key={sec.id} className="rounded-md border border-slate-100">
                                  <div className="flex items-center gap-2 px-2 py-1.5">
                                    <div className="flex items-center gap-1 text-slate-300 text-xs">
                                      <button onClick={() => si > 0 && moveSection(tab.id, si, si - 1)} disabled={si === 0} className="hover:text-slate-500 disabled:opacity-30">▲</button>
                                      <button onClick={() => si < sortedSections.length - 1 && moveSection(tab.id, si, si + 1)} disabled={si === sortedSections.length - 1} className="hover:text-slate-500 disabled:opacity-30">▼</button>
                                    </div>
                                    <button onClick={() => toggleSection(secKey)} className="text-slate-400">
                                      {secExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                    </button>
                                    <button
                                      onClick={() => setSectionVisible(tab.id, sec.id, !sec.visible)}
                                      className={sec.visible ? 'text-green-500' : 'text-slate-300'}
                                    >
                                      {sec.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                                    </button>
                                    <span className={`text-xs font-medium ${sec.visible ? 'text-slate-700' : 'text-slate-400 line-through'}`}>
                                      {SECTION_LABELS[sec.id] ?? sec.id}
                                    </span>
                                    <span className="ml-auto text-[10px] font-mono text-slate-300">{sec.id}</span>
                                  </div>

                                  {/* Fields */}
                                  {secExpanded && (
                                    <div className="pl-10 pr-2 pb-2 space-y-0.5">
                                      {sortedFields.map((field, fi) => (
                                        <div key={field.key} className="flex items-center gap-2 py-0.5">
                                          <div className="flex items-center gap-1 text-slate-300 text-[10px]">
                                            <button onClick={() => fi > 0 && moveField(tab.id, sec.id, fi, fi - 1)} disabled={fi === 0} className="hover:text-slate-500 disabled:opacity-30">▲</button>
                                            <button onClick={() => fi < sortedFields.length - 1 && moveField(tab.id, sec.id, fi, fi + 1)} disabled={fi === sortedFields.length - 1} className="hover:text-slate-500 disabled:opacity-30">▼</button>
                                          </div>
                                          <button
                                            onClick={() => setFieldVisible(tab.id, sec.id, field.key, !field.visible)}
                                            className={field.visible ? 'text-emerald-500' : 'text-slate-300'}
                                          >
                                            {field.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                                          </button>
                                          <span className={`text-xs ${field.visible ? 'text-slate-600' : 'text-slate-400 line-through'}`}>
                                            {FIELD_LABELS[field.key] ?? field.key}
                                          </span>
                                          <span className="ml-auto text-[10px] font-mono text-slate-300">{field.key}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
