'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { BopSelect } from '@/components/BopSelect';
import { ScreenHeader } from '@/components/ScreenBadge';

// ── Types ─────────────────────────────────────────────────────────────────────
interface TableMeta {
  object_id: string; table_name: string; name: string; description: string | null;
  module: string; protection_lvl: number; criticality: number; change_policy: string;
}
interface ColDef { key: string; type: string; }
interface SchemaInfo { columns: ColDef[]; row_count: number; meta: TableMeta | null; }
interface TechColumn {
  column_name: string; data_type: string; udt_name: string; is_nullable: string;
  column_default: string | null; character_maximum_length: number | null;
  numeric_precision: number | null; description: string | null;
}
interface TechIndex { indexname: string; indexdef: string; is_unique: boolean; is_primary: boolean; }
interface TechFK { column_name: string; foreign_table: string; foreign_column: string; constraint_name: string; }
interface TechInfo { columns: TechColumn[]; indexes: TechIndex[]; foreign_keys: TechFK[]; }
interface WUScreen { screen_id: string; title: string; description: string | null; route: string; func_type: string; sequence: number; icon: string | null; }
interface WUObject { object_id: string; type: string; name: string; route: string | null; status: string; protection_lvl: number; description: string | null; }
interface WURevFK { referencing_table: string; referencing_column: string; referenced_column: string; constraint_name: string; }
interface WhereUsedData {
  table_obj: any; module: string | null;
  screens: WUScreen[]; objects: WUObject[]; referenced_by: WURevFK[];
}
interface RowData { [key: string]: any; }

const PROTECTION_LABEL: Record<number, string> = {
  0: 'SYSTEM LOCKED', 1: 'DELETE RESTRICTED', 2: 'UPDATE RESTRICTED', 3: 'READ ONLY', 4: 'NONE',
};
const PROTECTION_COLOR: Record<number, string> = {
  0: 'text-red-600 bg-red-50 border-red-200', 1: 'text-orange-600 bg-orange-50 border-orange-200',
  2: 'text-amber-600 bg-amber-50 border-amber-200', 3: 'text-slate-500 bg-slate-50 border-slate-200',
  4: 'text-emerald-600 bg-emerald-50 border-emerald-200',
};
const TYPE_BADGE: Record<string, string> = {
  screen: 'bg-blue-100 text-blue-700', api: 'bg-green-100 text-green-700',
  dashboard: 'bg-violet-100 text-violet-700', report: 'bg-amber-100 text-amber-700',
  workflow: 'bg-pink-100 text-pink-700', component: 'bg-teal-100 text-teal-700',
  permission: 'bg-slate-100 text-slate-600', module: 'bg-slate-200 text-slate-700',
};

function formatCell(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'object') return JSON.stringify(val);
  const s = String(val);
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 16).replace('T', ' ');
  return s;
}

// ── Edit panel ────────────────────────────────────────────────────────────────
function EditPanel({ row, schema, tableMeta, onSave, onClose, saving }: {
  row: RowData; schema: SchemaInfo; tableMeta: TableMeta;
  onSave: (u: RowData) => void; onClose: () => void; saving: boolean;
}) {
  const [draft, setDraft] = useState<RowData>({ ...row });
  const readOnly = tableMeta.protection_lvl === 0 || tableMeta.protection_lvl === 3;
  const cannotDelete = tableMeta.protection_lvl <= 1;
  const pk = row.id !== undefined ? 'id' : schema.columns[0]?.key ?? 'id';
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <p className="text-sm font-bold text-slate-800">Record</p>
          <code className="text-[10px] font-mono text-slate-400">{tableMeta.table_name} · {String(row[pk]).slice(0, 24)}</code>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">✕</button>
      </div>
      {tableMeta.protection_lvl < 4 && (
        <div className={`mx-4 mt-3 rounded-lg border px-3 py-2 text-xs font-semibold ${PROTECTION_COLOR[tableMeta.protection_lvl]}`}>
          {PROTECTION_LABEL[tableMeta.protection_lvl]} — {readOnly ? 'Read-only.' : 'Deletion restricted.'}
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {schema.columns.map(col => {
          const isKey = col.key === pk || col.key === 'created_at' || col.key === 'registered_at';
          const val = draft[col.key];
          return (
            <div key={col.key}>
              <label className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">
                {col.key}
                <span className="font-normal normal-case tracking-normal text-slate-300">{col.type}</span>
                {isKey && <span className="text-slate-300">· read-only</span>}
              </label>
              {(readOnly || isKey) ? (
                <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-xs text-slate-500 font-mono min-h-[32px]">{formatCell(val)}</div>
              ) : typeof val === 'boolean' ? (
                <BopSelect value={String(val)} onChange={v => setDraft(d => ({ ...d, [col.key]: v === 'true' }))} options={[{ value: String('true'), label: `true` }, { value: String('false'), label: `false` }]} className="min-w-[130px]" />
              ) : (
                <textarea rows={String(val ?? '').length > 60 ? 3 : 1} value={val ?? ''}
                  onChange={e => setDraft(d => ({ ...d, [col.key]: e.target.value }))}
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-mono focus:border-blue-400 focus:outline-none" />
              )}
            </div>
          );
        })}
      </div>
      {!readOnly && (
        <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-4">
          <button onClick={() => onSave(draft)} disabled={saving}
            className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          {!cannotDelete && (
            <button className="ml-auto rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50">Delete row</button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Where Used panel ──────────────────────────────────────────────────────────
function WhereUsedPanel({ activeTable, data, loading, onClose }: {
  activeTable: string; data: WhereUsedData | null; loading: boolean; onClose: () => void;
}) {
  const [tab, setTab] = useState<'screens' | 'objects' | 'referenced_by'>('screens');

  // Group objects by type
  const byType = (data?.objects ?? []).reduce<Record<string, WUObject[]>>((acc, o) => {
    (acc[o.type] ??= []).push(o); return acc;
  }, {});

  const screenCount = data?.screens.length ?? 0;
  const objectCount = data?.objects.length ?? 0;
  const refCount = data?.referenced_by.length ?? 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <p className="text-sm font-bold text-slate-800">Where Used</p>
          <code className="text-[10px] font-mono text-slate-400">{activeTable}</code>
          {data?.module && (
            <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{data.module}</span>
          )}
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">✕</button>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-slate-400">Loading…</div>
      ) : !data ? (
        <div className="flex flex-1 items-center justify-center text-sm text-slate-400">No data</div>
      ) : (
        <>
          {/* Summary counts */}
          <div className="grid grid-cols-3 gap-px border-b border-slate-100 bg-slate-100">
            {[
              { key: 'screens', label: 'Screens', count: screenCount, color: 'text-blue-600' },
              { key: 'objects', label: 'Objects', count: objectCount, color: 'text-violet-600' },
              { key: 'referenced_by', label: 'FK Refs', count: refCount, color: 'text-amber-600' },
            ].map(({ key, label, count, color }) => (
              <button key={key} onClick={() => setTab(key as any)}
                className={`bg-white px-3 py-3 text-center transition-colors ${tab === key ? 'bg-slate-50' : 'hover:bg-slate-50'}`}>
                <p className={`text-base font-bold ${color}`}>{count}</p>
                <p className="text-[10px] text-slate-400">{label}</p>
                {tab === key && <div className="mt-1 h-0.5 rounded bg-slate-400" />}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">

            {/* Screens tab */}
            {tab === 'screens' && (
              <div className="p-3 space-y-1">
                {screenCount === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-400">No screens in module {data.module}</p>
                ) : data.screens.map(s => (
                  <div key={s.screen_id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 hover:border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-blue-700">{s.screen_id}</span>
                      <span className="text-xs font-semibold text-slate-700">{s.title}</span>
                      <span className="ml-auto rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-medium text-slate-500 uppercase">{s.func_type}</span>
                    </div>
                    {s.description && <p className="mt-1 text-[11px] text-slate-400 truncate">{s.description}</p>}
                    <p className="mt-0.5 font-mono text-[10px] text-slate-400">{s.route}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Objects tab */}
            {tab === 'objects' && (
              <div className="p-3 space-y-3">
                {objectCount === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-400">No related objects</p>
                ) : Object.entries(byType).map(([type, items]) => (
                  <div key={type}>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{type} ({items.length})</p>
                    <div className="space-y-1">
                      {items.map(o => (
                        <div key={o.object_id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 hover:border-slate-200">
                          <div className="flex items-center gap-2">
                            <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${TYPE_BADGE[o.type] ?? 'bg-slate-100 text-slate-500'}`}>{o.type}</span>
                            <span className="text-xs font-medium text-slate-700 truncate">{o.name}</span>
                            {o.protection_lvl < 4 && (
                              <span className="ml-auto text-[9px] font-semibold text-red-400">🔒</span>
                            )}
                          </div>
                          {o.route && <p className="mt-0.5 font-mono text-[10px] text-slate-400 truncate">{o.route}</p>}
                          {o.description && <p className="mt-0.5 text-[10px] text-slate-400 truncate">{o.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Referenced By tab */}
            {tab === 'referenced_by' && (
              <div className="p-3 space-y-1">
                {refCount === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-400">No other tables reference this table via FK</p>
                ) : data.referenced_by.map(fk => (
                  <div key={fk.constraint_name} className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5 hover:border-amber-200">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-amber-200 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-800">{fk.referencing_table}</span>
                      <span className="text-[11px] text-slate-500">references via</span>
                      <span className="font-mono text-[11px] font-semibold text-amber-700">{fk.referencing_column}</span>
                    </div>
                    <p className="mt-1 font-mono text-[10px] text-slate-400">
                      {fk.referencing_table}.{fk.referencing_column} → {activeTable}.{fk.referenced_column}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-300">{fk.constraint_name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Dev Mode panel ────────────────────────────────────────────────────────────
function DevPanel({ activeTable, schema, activeMeta, techInfo, techLoading, techTab, setTechTab }: {
  activeTable: string; schema: SchemaInfo; activeMeta: TableMeta;
  techInfo: TechInfo | null; techLoading: boolean; techTab: string; setTechTab: (t: string) => void;
}) {
  const tabs = ['Summary', 'Columns', 'Indexes', 'Foreign Keys'];
  return (
    <div className="border-b border-violet-100 bg-violet-50">
      <div className="flex items-center gap-0 border-b border-violet-100 px-4 pt-2">
        {tabs.map(t => (
          <button key={t} onClick={() => setTechTab(t)}
            className={`px-3 py-1.5 text-[11px] font-medium border-b-2 transition-colors ${techTab === t ? 'border-violet-500 text-violet-700' : 'border-transparent text-violet-400 hover:text-violet-600'}`}>
            {t}
          </button>
        ))}
        {techLoading && <span className="ml-3 text-[10px] text-violet-400">Loading…</span>}
      </div>
      <div className="px-4 py-3">
        {techTab === 'Summary' && (
          <>
            <div className="flex flex-wrap gap-5 text-xs mb-3">
              <div><span className="text-violet-400">Table:</span> <code className="font-mono text-violet-700">{activeTable}</code></div>
              <div><span className="text-violet-400">Rows:</span> <span className="font-mono text-violet-700">{schema.row_count.toLocaleString()}</span></div>
              <div><span className="text-violet-400">Columns:</span> <span className="font-mono text-violet-700">{schema.columns.length}</span></div>
              <div><span className="text-violet-400">Module:</span> <span className="font-mono text-violet-700">{activeMeta.module}</span></div>
              <div><span className="text-violet-400">Protection:</span> <span className="font-mono text-violet-700">{PROTECTION_LABEL[activeMeta.protection_lvl]}</span></div>
              <div><span className="text-violet-400">Criticality:</span> <span className="font-mono text-violet-700">{activeMeta.criticality}</span></div>
              <div><span className="text-violet-400">Policy:</span> <span className="font-mono text-violet-700">{activeMeta.change_policy}</span></div>
              {techInfo && (
                <>
                  <div><span className="text-violet-400">Indexes:</span> <span className="font-mono text-violet-700">{techInfo.indexes.length}</span></div>
                  <div><span className="text-violet-400">FK refs:</span> <span className="font-mono text-violet-700">{techInfo.foreign_keys.length}</span></div>
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {schema.columns.map(c => (
                <span key={c.key} className="rounded bg-violet-100 px-2 py-0.5 font-mono text-[10px] text-violet-600">
                  {c.key} <span className="text-violet-400">{c.type}</span>
                </span>
              ))}
            </div>
          </>
        )}
        {techTab === 'Columns' && (
          <div className="overflow-x-auto">
            {!techInfo ? (
              <p className="text-xs text-violet-400">{techLoading ? 'Loading…' : 'No data'}</p>
            ) : (
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="text-left">
                    {['Column', 'Type', 'Nullable', 'Default', 'Description'].map(h => (
                      <th key={h} className="border-b border-violet-200 py-1.5 pr-4 font-semibold text-violet-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {techInfo.columns.map(c => (
                    <tr key={c.column_name} className="border-b border-violet-50">
                      <td className="py-1.5 pr-4 font-mono font-semibold text-violet-800 whitespace-nowrap">{c.column_name}</td>
                      <td className="py-1.5 pr-4 font-mono text-violet-600 whitespace-nowrap">
                        {c.udt_name !== c.data_type ? c.udt_name : c.data_type}{c.character_maximum_length ? `(${c.character_maximum_length})` : ''}
                      </td>
                      <td className="py-1.5 pr-4 text-violet-500">{c.is_nullable === 'YES' ? 'NULL' : <span className="font-semibold text-violet-700">NOT NULL</span>}</td>
                      <td className="py-1.5 pr-4 font-mono text-violet-400 max-w-[140px] truncate" title={c.column_default ?? ''}>
                        {c.column_default ?? <span className="text-violet-200">—</span>}
                      </td>
                      <td className="py-1.5 text-violet-500 max-w-[200px] truncate" title={c.description ?? ''}>
                        {c.description ?? <span className="text-violet-200">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {techTab === 'Indexes' && (
          <div className="overflow-x-auto">
            {!techInfo ? (
              <p className="text-xs text-violet-400">{techLoading ? 'Loading…' : 'No data'}</p>
            ) : techInfo.indexes.length === 0 ? (
              <p className="text-xs text-violet-400">No indexes found</p>
            ) : (
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="text-left">
                    {['Index Name', 'Flags', 'Definition'].map(h => (
                      <th key={h} className="border-b border-violet-200 py-1.5 pr-4 font-semibold text-violet-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {techInfo.indexes.map(idx => (
                    <tr key={idx.indexname} className="border-b border-violet-50">
                      <td className="py-1.5 pr-4 font-mono text-violet-800 whitespace-nowrap">{idx.indexname}</td>
                      <td className="py-1.5 pr-4 whitespace-nowrap">
                        <div className="flex gap-1">
                          {idx.is_primary && <span className="rounded bg-violet-600 px-1.5 py-0.5 text-[9px] font-bold text-white">PK</span>}
                          {idx.is_unique && !idx.is_primary && <span className="rounded bg-violet-200 px-1.5 py-0.5 text-[9px] font-bold text-violet-700">UNIQUE</span>}
                          {!idx.is_primary && !idx.is_unique && <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-500">IDX</span>}
                        </div>
                      </td>
                      <td className="py-1.5 font-mono text-violet-500 text-[10px] max-w-[420px] truncate" title={idx.indexdef}>{idx.indexdef}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {techTab === 'Foreign Keys' && (
          <div className="overflow-x-auto">
            {!techInfo ? (
              <p className="text-xs text-violet-400">{techLoading ? 'Loading…' : 'No data'}</p>
            ) : techInfo.foreign_keys.length === 0 ? (
              <p className="text-xs text-violet-400">No foreign keys on this table</p>
            ) : (
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="text-left">
                    {['Column', '→ References', 'Constraint'].map(h => (
                      <th key={h} className="border-b border-violet-200 py-1.5 pr-4 font-semibold text-violet-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {techInfo.foreign_keys.map(fk => (
                    <tr key={fk.constraint_name} className="border-b border-violet-50">
                      <td className="py-1.5 pr-4 font-mono font-semibold text-violet-800">{fk.column_name}</td>
                      <td className="py-1.5 pr-4">
                        <span className="rounded bg-violet-100 px-2 py-0.5 font-mono text-violet-700">
                          {fk.foreign_table}.<span className="text-violet-500">{fk.foreign_column}</span>
                        </span>
                      </td>
                      <td className="py-1.5 font-mono text-[10px] text-violet-400">{fk.constraint_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SY029Page() {
  const [tables, setTables]           = useState<TableMeta[]>([]);
  const [activeTable, setActiveTable] = useState<string>('');
  const [schema, setSchema]           = useState<SchemaInfo | null>(null);
  const [rows, setRows]               = useState<RowData[]>([]);
  const [total, setTotal]             = useState(0);
  const [pages, setPages]             = useState(1);
  const [page, setPage]               = useState(0);
  const [limit, setLimit]             = useState(50);
  const [q, setQ]                     = useState('');
  const [sort, setSort]               = useState('');
  const [dir, setDir]                 = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading]         = useState(false);
  const [selectedRow, setSelectedRow] = useState<RowData | null>(null);
  const [saving, setSaving]           = useState(false);
  const [toast, setToast]             = useState('');
  const [devMode, setDevMode]         = useState(false);
  const [moduleFilter, setModuleFilter] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [hiddenCols, setHiddenCols]   = useState<Set<string>>(new Set());
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const [techInfo, setTechInfo]       = useState<TechInfo | null>(null);
  const [techLoading, setTechLoading] = useState(false);
  const [techTab, setTechTab]         = useState('Summary');
  const [whereUsed, setWhereUsed]     = useState<WhereUsedData | null>(null);
  const [wuLoading, setWuLoading]     = useState(false);
  const [wuOpen, setWuOpen]           = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 3500); }

  useEffect(() => {
    void fetch('/api/bop/sys/explorer?action=tables')
      .then(r => r.json())
      .then(d => setTables(d.tables ?? []));
  }, []);

  useEffect(() => {
    if (!activeTable) return;
    setSchema(null); setRows([]); setPage(0); setSelectedRow(null);
    setHiddenCols(new Set()); setSort(''); setTechInfo(null);
    setWhereUsed(null); setWuOpen(false);
    void fetch(`/api/bop/sys/explorer?action=schema&table=${activeTable}`)
      .then(r => r.json())
      .then(d => {
        setSchema(d);
        const firstCol = d.columns?.[0]?.key ?? 'id';
        setSort(d.columns?.find((c: ColDef) => c.key === 'id') ? 'id' : firstCol);
      });
  }, [activeTable]);

  useEffect(() => {
    if (!devMode || !activeTable || techInfo) return;
    setTechLoading(true);
    fetch(`/api/bop/sys/explorer?action=tech&table=${activeTable}`)
      .then(r => r.json())
      .then(d => { setTechInfo(d); setTechLoading(false); })
      .catch(() => setTechLoading(false));
  }, [devMode, activeTable, techInfo]);

  async function openWhereUsed() {
    if (!activeTable) return;
    setWuOpen(true);
    setSelectedRow(null);
    if (whereUsed) return; // already loaded
    setWuLoading(true);
    const d = await fetch(`/api/bop/sys/explorer?action=whereused&table=${activeTable}`).then(r => r.json()).catch(() => null);
    setWhereUsed(d);
    setWuLoading(false);
  }

  const loadRows = useCallback(async () => {
    if (!activeTable) return;
    setLoading(true);
    const params = new URLSearchParams({
      action: 'rows', table: activeTable,
      page: String(page), limit: String(limit),
      sort: sort || 'id', dir,
    });
    if (q) params.set('q', q);
    const d = await fetch('/api/bop/sys/explorer?' + params).then(r => r.json()).catch(() => ({}));
    setRows(d.rows ?? []); setTotal(d.total ?? 0); setPages(d.pages ?? 1);
    setLoading(false);
  }, [activeTable, page, limit, q, sort, dir]);

  useEffect(() => { if (schema) void loadRows(); }, [schema, loadRows]);

  function handleSearch(val: string) {
    setQ(val); setPage(0);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { void loadRows(); }, 400);
  }

  function handleSort(col: string) {
    if (sort === col) setDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSort(col); setDir('asc'); }
    setPage(0);
  }

  async function handleSave(updates: RowData) {
    if (!schema || !activeTable) return;
    const pk = updates.id !== undefined ? 'id' : schema.columns[0]?.key ?? 'id';
    setSaving(true);
    const r = await fetch(
      `/api/bop/sys/explorer?table=${activeTable}&pk=${pk}&pk_value=${encodeURIComponent(updates[pk])}`,
      { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) }
    );
    const d = await r.json();
    if (r.ok) { showToast('Row updated'); setSelectedRow(null); void loadRows(); }
    else showToast('Error: ' + d.error);
    setSaving(false);
  }

  function exportCSV() {
    if (!rows.length || !schema) return;
    const cols = schema.columns.filter(c => !hiddenCols.has(c.key)).map(c => c.key);
    const lines = [cols.join(','), ...rows.map(r => cols.map(c => `"${formatCell(r[c]).replace(/"/g, '""')}"`).join(','))];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `${activeTable}_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  }

  function selectTable(tableName: string) {
    setActiveTable(tableName);
    setTechInfo(null);
    setWhereUsed(null);
    setWuOpen(false);
  }

  const modules = [...new Set(tables.map(t => t.module))].sort();
  const filteredTables = tables.filter(t =>
    (!moduleFilter || t.module === moduleFilter) &&
    (!tableSearch || t.table_name.toLowerCase().includes(tableSearch.toLowerCase()))
  );
  const visibleCols = schema?.columns.filter(c => !hiddenCols.has(c.key)) ?? [];
  const activeMeta = tables.find(t => t.table_name === activeTable) ?? null;
  // Right panel: Where Used takes priority over Edit (both can't show simultaneously)
  const showWu = wuOpen;
  const showEdit = !wuOpen && !!selectedRow;

  return (
    <div className="flex h-[calc(100vh-80px)] flex-col">
      {toast && (
        <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>
      )}
      <ScreenHeader title="Data Explorer" description="SY029 — Direct table access with inline editing. Admin only." />

      <div className="flex flex-1 gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white">

        {/* ── Sidebar ───────────────────────────────────────────────────── */}
        <div className="w-56 flex-shrink-0 border-r border-slate-100 flex flex-col">
          <div className="border-b border-slate-100 p-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Module</p>
            <div className="flex flex-wrap gap-1">
              <button onClick={() => setModuleFilter('')}
                className={`rounded px-2 py-0.5 text-[10px] font-medium ${!moduleFilter ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                All
              </button>
              {modules.map(m => (
                <button key={m} onClick={() => setModuleFilter(m === moduleFilter ? '' : m)}
                  className={`rounded px-2 py-0.5 text-[10px] font-medium ${moduleFilter === m ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                  {m}
                </button>
              ))}
            </div>
            <input value={tableSearch} onChange={e => setTableSearch(e.target.value)}
              placeholder="Filter tables…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-700 placeholder-slate-300 focus:border-blue-400 focus:bg-white focus:outline-none" />
            {tableSearch && (
              <p className="text-[10px] text-slate-400">{filteredTables.length} match{filteredTables.length !== 1 ? 'es' : ''}</p>
            )}
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {filteredTables.map(t => (
              <button key={t.table_name} onClick={() => selectTable(t.table_name)}
                className={`w-full px-3 py-2 text-left transition-colors ${activeTable === t.table_name ? 'bg-slate-800 text-white' : 'hover:bg-slate-50 text-slate-700'}`}>
                <div className="flex items-center gap-1.5">
                  {t.protection_lvl < 4 && (
                    <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${t.protection_lvl === 0 ? 'bg-red-500' : t.protection_lvl <= 2 ? 'bg-orange-400' : 'bg-slate-300'}`} />
                  )}
                  <span className="text-xs font-medium truncate">{t.table_name}</span>
                </div>
                <span className={`mt-0.5 block text-[10px] ${activeTable === t.table_name ? 'text-slate-300' : 'text-slate-400'}`}>{t.module}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Main area ────────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col min-w-0">
          {!activeTable ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <p className="text-slate-400">Select a table</p>
                <p className="mt-1 text-xs text-slate-300">{tables.length} tables registered</p>
              </div>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">{activeTable}</span>
                  {schema && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                      {total.toLocaleString()} rows
                    </span>
                  )}
                  {activeMeta && activeMeta.protection_lvl < 4 && (
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${PROTECTION_COLOR[activeMeta.protection_lvl]}`}>
                      {PROTECTION_LABEL[activeMeta.protection_lvl]}
                    </span>
                  )}
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <input value={q} onChange={e => handleSearch(e.target.value)} placeholder="Search…"
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs w-48 focus:border-blue-400 focus:outline-none" />
                  <div className="relative">
                    <button onClick={() => setColPickerOpen(o => !o)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-400">
                      Columns
                    </button>
                    {colPickerOpen && schema && (
                      <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-slate-200 bg-white shadow-xl p-2">
                        {schema.columns.map(c => (
                          <label key={c.key} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer">
                            <input type="checkbox" checked={!hiddenCols.has(c.key)}
                              onChange={() => setHiddenCols(s => { const n = new Set(s); n.has(c.key) ? n.delete(c.key) : n.add(c.key); return n; })}
                              className="rounded" />
                            <span className="text-xs text-slate-700 truncate">{c.key}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={exportCSV}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-400">
                    Export CSV
                  </button>
                  <button onClick={() => { void loadRows(); }}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-400">
                    Refresh
                  </button>
                  {/* Where Used button */}
                  <button onClick={() => { if (wuOpen) { setWuOpen(false); } else { void openWhereUsed(); } }}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${wuOpen ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}>
                    Where Used
                  </button>
                  <button onClick={() => { setDevMode(d => !d); setTechTab('Summary'); }}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${devMode ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}>
                    Dev Mode
                  </button>
                </div>
              </div>

              {/* Developer mode panel */}
              {devMode && schema && activeMeta && (
                <DevPanel activeTable={activeTable} schema={schema} activeMeta={activeMeta}
                  techInfo={techInfo} techLoading={techLoading} techTab={techTab} setTechTab={setTechTab} />
              )}

              <div className="flex flex-1 overflow-hidden">
                {/* Grid */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-auto">
                    {loading ? (
                      <div className="flex h-40 items-center justify-center text-sm text-slate-400">Loading…</div>
                    ) : rows.length === 0 ? (
                      <div className="flex h-40 items-center justify-center text-sm text-slate-400">No rows found</div>
                    ) : (
                      <table className="w-full text-xs border-collapse">
                        <thead className="sticky top-0 z-10 bg-slate-50">
                          <tr>
                            <th className="w-8 border-b border-slate-200 px-2 py-2.5 text-center text-[10px] font-semibold text-slate-400">#</th>
                            {visibleCols.map(col => (
                              <th key={col.key} onClick={() => handleSort(col.key)}
                                className="border-b border-slate-200 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500 cursor-pointer hover:bg-slate-100 whitespace-nowrap">
                                <span className="flex items-center gap-1">
                                  {col.key}
                                  {sort === col.key && <span className="text-slate-400">{dir === 'asc' ? '↑' : '↓'}</span>}
                                </span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {rows.map((row, i) => (
                            <tr key={i}
                              onClick={() => { setWuOpen(false); setSelectedRow(selectedRow && JSON.stringify(selectedRow) === JSON.stringify(row) ? null : row); }}
                              className={`cursor-pointer transition-colors ${selectedRow && JSON.stringify(selectedRow) === JSON.stringify(row) ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                              <td className="px-2 py-2 text-center text-[10px] text-slate-300 font-mono">{page * limit + i + 1}</td>
                              {visibleCols.map(col => (
                                <td key={col.key} className="px-3 py-2 text-slate-700 font-mono max-w-[200px] truncate">
                                  {formatCell(row[col.key])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center gap-3 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
                    <span>{total.toLocaleString()} total rows</span>
                    <span>·</span>
                    <span>Page {page + 1} of {pages}</span>
                    <div className="flex gap-1">
                      <button onClick={() => setPage(0)} disabled={page === 0} className="rounded border border-slate-200 px-2 py-1 disabled:opacity-30 hover:bg-slate-50">«</button>
                      <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="rounded border border-slate-200 px-2 py-1 disabled:opacity-30 hover:bg-slate-50">‹</button>
                      <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1} className="rounded border border-slate-200 px-2 py-1 disabled:opacity-30 hover:bg-slate-50">›</button>
                      <button onClick={() => setPage(pages - 1)} disabled={page >= pages - 1} className="rounded border border-slate-200 px-2 py-1 disabled:opacity-30 hover:bg-slate-50">»</button>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <span>Rows per page:</span>
                      {[25, 50, 100, 250].map(n => (
                        <button key={n} onClick={() => { setLimit(n); setPage(0); }}
                          className={`rounded px-2 py-1 ${limit === n ? 'bg-slate-800 text-white' : 'border border-slate-200 hover:bg-slate-50'}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right panel: Where Used */}
                {showWu && (
                  <div className="w-80 flex-shrink-0 border-l border-slate-100 flex flex-col overflow-hidden">
                    <WhereUsedPanel
                      activeTable={activeTable}
                      data={whereUsed}
                      loading={wuLoading}
                      onClose={() => setWuOpen(false)}
                    />
                  </div>
                )}

                {/* Right panel: Edit record */}
                {showEdit && schema && activeMeta && (
                  <div className="w-80 flex-shrink-0 border-l border-slate-100 flex flex-col overflow-hidden">
                    <EditPanel
                      row={selectedRow!}
                      schema={schema}
                      tableMeta={activeMeta}
                      onSave={(u) => { void handleSave(u); }}
                      onClose={() => setSelectedRow(null)}
                      saving={saving}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
