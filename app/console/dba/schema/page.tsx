'use client';
import { useState, useEffect, useRef, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';

interface SchemaInfo { schema_name: string; table_count: number; view_count: number; function_count: number; is_system: boolean }
interface TableInfo { table_name: string; table_type: string; row_estimate: number; total_size: string; index_count: number; has_rls: boolean; rls_forced: boolean; description: string | null }
interface ColumnInfo { ordinal: number; column_name: string; data_type: string; is_nullable: boolean; column_default: string | null; is_primary_key: boolean; is_unique: boolean; fk_target: string | null; description: string | null }
interface IndexInfo { index_name: string; is_unique: boolean; is_primary: boolean; columns: string[]; index_size: string; definition: string }
interface FkInfo { constraint_name: string; direction: string; source_table: string; source_columns: string[]; target_table: string; target_columns: string[]; on_delete: string; on_update: string }
interface PolicyInfo { policy_name: string; command: string; permissive: string; roles: string[]; qual: string | null; with_check: string | null }
interface TriggerInfo { trigger_name: string; event: string; timing: string; orientation: string; definition: string }
interface EnumInfo { enum_name: string; enum_values: string[] }

type Tab = 'columns' | 'indexes' | 'fkeys' | 'policies' | 'triggers' | 'screens' | 'relations' | 'health';

interface TableHealth {
  live_tuples: number; dead_tuples: number; dead_pct: number;
  last_vacuum: string | null; last_autovacuum: string | null;
  last_analyze: string | null; last_autoanalyze: string | null;
  vacuum_count: number; autovacuum_count: number;
  analyze_count: number; autoanalyze_count: number;
  inserts: number; updates: number; deletes: number; hot_updates: number;
  seq_scan: number; seq_tup_read: number; idx_scan: number; idx_tup_fetch: number;
  total_bytes: number; table_bytes: number; index_bytes: number; toast_bytes: number;
  xid_age: number; relpages: number; pg_estimate: number;
  assessments: { key: string; label: string; value: string; status: 'in_range' | 'monitor' | 'urgent'; detail: string }[];
}

interface FkEdge { constraint_name: string; source_table: string; target_table: string; source_columns: string[]; target_columns: string[] }
interface TableDoc { table_name: string; description: string; tags: string[]; module: string | null }
interface ColIndex { table_name: string; columns: string[] }
interface ScreenRef { screen_id: string; title: string; module: string; route: string }

function matchesSmartFilter(tableName: string, filter: string, colIndex: Map<string, string[]>): boolean {
  const tokens = filter.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const name = tableName.toLowerCase();
  return tokens.every(tok => {
    if (tok.startsWith('@')) {
      const colTok = tok.slice(1);
      if (!colTok) return true;
      const cols = colIndex.get(tableName) ?? [];
      return cols.some(c => c.toLowerCase().includes(colTok));
    }
    return name.includes(tok);
  });
}

export default function SchemaExplorerPage() {
  const router = useRouter();
  const [schemas, setSchemas] = useState<SchemaInfo[]>([]);
  const [selectedSchema, setSelectedSchema] = useState('public');
  const [showSystem, setShowSystem] = useState(false);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('columns');
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [indexes, setIndexes] = useState<IndexInfo[]>([]);
  const [fkeys, setFkeys] = useState<FkInfo[]>([]);
  const [policies, setPolicies] = useState<PolicyInfo[]>([]);
  const [triggers, setTriggers] = useState<TriggerInfo[]>([]);
  const [enums, setEnums] = useState<EnumInfo[]>([]);
  const [allFkeys, setAllFkeys] = useState<FkEdge[]>([]);
  const [tableDocs, setTableDocs] = useState<Map<string, TableDoc>>(new Map());
  const [colIndex, setColIndex] = useState<Map<string, string[]>>(new Map());
  const [tableScreens, setTableScreens] = useState<Record<string, ScreenRef[]>>({});
  const [tableHealthMap, setTableHealthMap] = useState<Map<string, 'in_range' | 'monitor' | 'urgent'>>(new Map());
  const [tableHealth, setTableHealth] = useState<TableHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableFilter, setTableFilter] = useState('');
  const pendingTable = useRef<string | null>(null);
  const pendingTab = useRef<Tab | null>(null);

  // Read URL params on mount for deep-linking
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('schema');
    const t = params.get('table');
    const tab = params.get('tab') as Tab | null;
    if (s) setSelectedSchema(s);
    if (t) pendingTable.current = t;
    if (tab) pendingTab.current = tab;
  }, []);

  useEffect(() => {
    fetch('/api/bop/dba/schema?action=schemas')
      .then(r => r.json())
      .then(d => { setSchemas(d.schemas ?? []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => {
    setTables([]);
    setSelectedTable(null);
    setTableFilter('');
    fetch(`/api/bop/dba/schema?action=tables&schema=${selectedSchema}`)
      .then(r => r.json())
      .then(d => {
        setTables(d.tables ?? []);
        if (pendingTable.current) {
          const match = (d.tables ?? []).find((t: TableInfo) => t.table_name === pendingTable.current);
          if (match) {
            setSelectedTable(match.table_name);
            if (pendingTab.current) setActiveTab(pendingTab.current);
          }
          pendingTable.current = null;
          pendingTab.current = null;
        }
      })
      .catch(() => {});
    fetch(`/api/bop/dba/schema?action=enums&schema=${selectedSchema}`)
      .then(r => r.json())
      .then(d => setEnums(d.enums ?? []))
      .catch(() => {});
    fetch(`/api/bop/dba/schema?action=all_fkeys&schema=${selectedSchema}`)
      .then(r => r.json())
      .then(d => setAllFkeys(d.foreign_keys ?? []))
      .catch(() => {});
    fetch(`/api/bop/dba/docs?action=list&schema=${selectedSchema}`)
      .then(r => r.json())
      .then(d => {
        const m = new Map<string, TableDoc>();
        for (const doc of (d.docs ?? [])) m.set(doc.table_name, doc);
        setTableDocs(m);
      })
      .catch(() => {});
    fetch(`/api/bop/dba/docs?action=columns_index&schema=${selectedSchema}`)
      .then(r => r.json())
      .then(d => {
        const m = new Map<string, string[]>();
        for (const t of (d.tables ?? [])) m.set(t.table_name, t.columns);
        setColIndex(m);
      })
      .catch(() => {});
    fetch(`/api/bop/dba/schema?action=table_screens`)
      .then(r => r.json())
      .then(d => setTableScreens(d.table_screens ?? {}))
      .catch(() => {});
    fetch(`/api/bop/dba/schema?action=tables_health&schema=${selectedSchema}`)
      .then(r => r.json())
      .then(d => {
        const m = new Map<string, 'in_range' | 'monitor' | 'urgent'>();
        for (const h of (d.health ?? [])) m.set(h.table_name, h.status);
        setTableHealthMap(m);
      })
      .catch(() => {});
  }, [selectedSchema]);

  useEffect(() => {
    if (!selectedTable) return;
    setDetailLoading(true);
    setTableHealth(null);
    fetch(`/api/bop/dba/schema?action=table_detail&schema=${selectedSchema}&table=${selectedTable}`)
      .then(r => r.json())
      .then(d => {
        setColumns(d.columns ?? []);
        setIndexes(d.indexes ?? []);
        setFkeys(d.foreign_keys ?? []);
        setPolicies(d.policies ?? []);
        setTriggers(d.triggers ?? []);
        setDetailLoading(false);
      })
      .catch(() => setDetailLoading(false));
    setHealthLoading(true);
    fetch(`/api/bop/dba/schema?action=table_health&schema=${selectedSchema}&table=${selectedTable}`)
      .then(r => r.json())
      .then(d => { setTableHealth(d.health ?? null); setHealthLoading(false); })
      .catch(() => setHealthLoading(false));
  }, [selectedTable, selectedSchema]);

  function navigateToTable(tableName: string, tab?: Tab) {
    setSelectedTable(tableName);
    if (tab) setActiveTab(tab);
    else setActiveTab('columns');
    setTableFilter('');
  }

  const visibleSchemas = showSystem ? schemas : schemas.filter(s => !s.is_system);
  const filteredTables = tableFilter
    ? tables.filter(t => matchesSmartFilter(t.table_name, tableFilter, colIndex))
    : tables;

  const healthIssues = tableHealth?.assessments?.filter(a => a.status !== 'in_range').length ?? 0;

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'columns', label: 'Columns', count: columns.length },
    { key: 'indexes', label: 'Indexes', count: indexes.length },
    { key: 'fkeys', label: 'Foreign Keys', count: fkeys.length },
    { key: 'policies', label: 'RLS Policies', count: policies.length },
    { key: 'triggers', label: 'Triggers', count: triggers.length },
    { key: 'screens', label: 'Screens', count: selectedTable ? (tableScreens[selectedTable] ?? []).length : 0 },
    { key: 'relations', label: 'Relations', count: -1 },
    { key: 'health', label: 'Health', count: -1 },
  ];

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-4">
      <ScreenHeader />
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}

      <div className="flex gap-6" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {/* Left panel */}
        <div className="w-72 shrink-0 space-y-3">
          <div className="flex items-center gap-2">
            <select
              value={selectedSchema}
              onChange={e => setSelectedSchema(e.target.value)}
              className="flex-1 border rounded px-2 py-1.5 text-sm bg-white"
            >
              {visibleSchemas.map(s => (
                <option key={s.schema_name} value={s.schema_name}>
                  {s.schema_name} ({s.table_count}t / {s.view_count}v)
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
              <input type="checkbox" checked={showSystem} onChange={e => setShowSystem(e.target.checked)} className="rounded" />
              sys
            </label>
          </div>

          <input
            type="text"
            placeholder="Filter: wrk order  or  @tenant_id"
            value={tableFilter}
            onChange={e => setTableFilter(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-sm"
            title="Space-separated tokens (AND). Prefix @ to search column names."
          />

          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-[calc(100vh-340px)] overflow-y-auto">
              {loading ? (
                <div className="p-3 text-sm text-gray-500">Loading...</div>
              ) : filteredTables.length === 0 ? (
                <div className="p-3 text-sm text-gray-400">No tables found</div>
              ) : (
                filteredTables.map(t => (
                  <button
                    key={t.table_name}
                    onClick={() => navigateToTable(t.table_name)}
                    className={`w-full text-left px-3 py-2 text-sm border-b last:border-b-0 hover:bg-gray-50 flex items-center gap-2 ${
                      selectedTable === t.table_name ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                    }`}
                  >
                    <span className={`text-[10px] font-mono px-1 rounded ${
                      t.table_type === 'view' ? 'bg-purple-100 text-purple-700' :
                      t.table_type === 'materialized_view' ? 'bg-indigo-100 text-indigo-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {t.table_type === 'table' ? 'T' : t.table_type === 'view' ? 'V' : 'M'}
                    </span>
                    <span className="truncate flex-1 font-mono">{t.table_name}</span>
                    {tableDocs.get(t.table_name)?.module && (
                      <span className="text-[9px] font-medium px-1 rounded bg-blue-50 text-blue-600">{tableDocs.get(t.table_name)!.module}</span>
                    )}
                    {t.has_rls && <span className="text-[10px] text-green-600" title="RLS enabled">RLS</span>}
                    {tableHealthMap.get(t.table_name) === 'urgent' && (
                      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="Urgent — needs maintenance" />
                    )}
                    {tableHealthMap.get(t.table_name) === 'monitor' && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Monitor — check health tab" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {enums.length > 0 && (
            <div className="border rounded-lg p-3 space-y-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Enums ({enums.length})</div>
              {enums.map(e => (
                <div key={e.enum_name} className="text-sm">
                  <div className="font-mono text-xs font-medium">{e.enum_name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{e.enum_values.join(', ')}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="flex-1 min-w-0">
          {!selectedTable ? (
            <div className="border rounded-lg p-12 text-center text-gray-400">
              <div className="text-lg">Select a table to explore</div>
              <div className="text-sm mt-1">{tables.length} objects in <span className="font-mono">{selectedSchema}</span></div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold font-mono">{selectedSchema}.{selectedTable}</h2>
                {(() => {
                  const t = tables.find(x => x.table_name === selectedTable);
                  if (!t) return null;
                  return (
                    <div className="flex gap-2 text-xs text-gray-500">
                      <span>~{t.row_estimate.toLocaleString()} rows</span>
                      <span>{t.total_size}</span>
                      {t.has_rls && <span className="text-green-600 font-medium">RLS{t.rls_forced ? ' (forced)' : ''}</span>}
                    </div>
                  );
                })()}
                <button
                  onClick={() => router.push(`/console/dba/data?schema=${selectedSchema}&table=${selectedTable}`)}
                  className="ml-auto text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 font-medium"
                >
                  Browse Data
                </button>
              </div>
              {tableDocs.get(selectedTable) && (
                <div className="flex items-start gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                  <span className="flex-1">{tableDocs.get(selectedTable)!.description}</span>
                  {(tableDocs.get(selectedTable)!.tags ?? []).length > 0 && (
                    <div className="flex gap-1 shrink-0">
                      {tableDocs.get(selectedTable)!.tags.map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-1 border-b">
                {TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.key
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                    {tab.count > 0 && <span className="ml-1 text-xs text-gray-400">({tab.count})</span>}
                    {tab.key === 'screens' && <span className="ml-1 text-[10px] text-emerald-400">TC</span>}
                    {tab.key === 'relations' && <span className="ml-1 text-[10px] text-indigo-400">graph</span>}
                    {tab.key === 'health' && healthIssues > 0 && (
                      <span className={`ml-1 inline-block w-2 h-2 rounded-full ${
                        tableHealth?.assessments?.some(a => a.status === 'urgent') ? 'bg-red-500' : 'bg-amber-500'
                      }`} />
                    )}
                    {tab.key === 'health' && tableHealth && healthIssues === 0 && (
                      <span className="ml-1 inline-block w-2 h-2 rounded-full bg-green-500" />
                    )}
                  </button>
                ))}
              </div>

              {detailLoading ? (
                <div className="p-4 text-sm text-gray-500">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  {activeTab === 'columns' && <ColumnsTable columns={columns} onNavigate={navigateToTable} />}
                  {activeTab === 'indexes' && <IndexesTable indexes={indexes} />}
                  {activeTab === 'fkeys' && <FKeysTable fkeys={fkeys} onNavigate={navigateToTable} />}
                  {activeTab === 'policies' && <PoliciesTable policies={policies} />}
                  {activeTab === 'triggers' && <TriggersTable triggers={triggers} />}
                  {activeTab === 'screens' && selectedTable && (
                    <ScreensTab
                      focusTable={selectedTable}
                      allFkeys={allFkeys}
                      tableScreens={tableScreens}
                      onNavigate={navigateToTable}
                    />
                  )}
                  {activeTab === 'relations' && selectedTable && (
                    <RelationsGraph
                      focusTable={selectedTable}
                      allFkeys={allFkeys}
                      tables={tables}
                      onNavigate={navigateToTable}
                      tableScreens={tableScreens}
                    />
                  )}
                  {activeTab === 'health' && (
                    healthLoading ? <div className="p-4 text-sm text-gray-500">Loading health data...</div> :
                    !tableHealth ? <div className="p-6 text-center text-gray-400 text-sm">No health data available (views and system tables are excluded)</div> :
                    <HealthTab health={tableHealth} />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ColumnsTable({ columns, onNavigate }: { columns: ColumnInfo[]; onNavigate: (table: string, tab?: Tab) => void }) {
  if (columns.length === 0) return <Empty label="No columns" />;
  return (
    <table className="w-full text-sm border-collapse">
      <thead><tr className="bg-gray-50 border-b">
        <th className="text-left p-2 font-medium w-8">#</th>
        <th className="text-left p-2 font-medium">Column</th>
        <th className="text-left p-2 font-medium">Type</th>
        <th className="text-center p-2 font-medium">Null</th>
        <th className="text-left p-2 font-medium">Default</th>
        <th className="text-left p-2 font-medium">Key</th>
        <th className="text-left p-2 font-medium">FK Target</th>
      </tr></thead>
      <tbody>
        {columns.map(c => (
          <tr key={c.ordinal} className="border-b hover:bg-gray-50">
            <td className="p-2 text-gray-400 text-xs">{c.ordinal}</td>
            <td className="p-2 font-mono text-xs font-medium">{c.column_name}</td>
            <td className="p-2 font-mono text-xs text-gray-600">{c.data_type}</td>
            <td className="p-2 text-center">{c.is_nullable ? <span className="text-gray-400 text-xs">yes</span> : <span className="text-red-500 text-xs font-medium">NOT NULL</span>}</td>
            <td className="p-2 font-mono text-xs text-gray-500 max-w-[200px] truncate" title={c.column_default ?? ''}>{c.column_default ?? ''}</td>
            <td className="p-2">
              {c.is_primary_key && <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1 rounded">PK</span>}
              {c.is_unique && !c.is_primary_key && <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1 rounded">UQ</span>}
            </td>
            <td className="p-2 font-mono text-xs">
              {c.fk_target ? (
                <button
                  onClick={() => {
                    const target = c.fk_target!;
                    const tbl = target.includes('.') ? target.split('.').pop()! : target;
                    onNavigate(tbl, 'columns');
                  }}
                  className="text-purple-600 hover:text-purple-800 hover:underline cursor-pointer"
                  title={`Jump to ${c.fk_target}`}
                >
                  {c.fk_target}
                </button>
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function IndexesTable({ indexes }: { indexes: IndexInfo[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (indexes.length === 0) return <Empty label="No indexes" />;
  return (
    <table className="w-full text-sm border-collapse">
      <thead><tr className="bg-gray-50 border-b">
        <th className="text-left p-2 font-medium">Index</th>
        <th className="text-left p-2 font-medium">Columns</th>
        <th className="text-center p-2 font-medium">Unique</th>
        <th className="text-left p-2 font-medium">Size</th>
      </tr></thead>
      <tbody>
        {indexes.map(i => (
          <Fragment key={i.index_name}>
            <tr
              onClick={() => setExpanded(expanded === i.index_name ? null : i.index_name)}
              className="border-b hover:bg-gray-50 cursor-pointer"
            >
              <td className="p-2 font-mono text-xs">
                <span className="mr-1 text-gray-300 text-[10px]">{expanded === i.index_name ? '▼' : '▶'}</span>
                {i.is_primary && <span className="text-amber-600 mr-1">PK</span>}
                {i.index_name}
              </td>
              <td className="p-2 font-mono text-xs text-gray-600">{i.columns.join(', ')}</td>
              <td className="p-2 text-center text-xs">{i.is_unique ? 'yes' : ''}</td>
              <td className="p-2 text-xs text-gray-500">{i.index_size}</td>
            </tr>
            {expanded === i.index_name && (
              <tr className="border-b">
                <td colSpan={4} className="p-0">
                  <pre className="px-4 py-3 text-xs font-mono bg-gray-900 text-gray-100 leading-relaxed whitespace-pre-wrap">{i.definition}</pre>
                </td>
              </tr>
            )}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}

function FKeysTable({ fkeys, onNavigate }: { fkeys: FkInfo[]; onNavigate: (table: string, tab?: Tab) => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (fkeys.length === 0) return <Empty label="No foreign keys" />;
  return (
    <table className="w-full text-sm border-collapse">
      <thead><tr className="bg-gray-50 border-b">
        <th className="text-left p-2 font-medium">Constraint</th>
        <th className="text-center p-2 font-medium">Dir</th>
        <th className="text-left p-2 font-medium">From</th>
        <th className="text-left p-2 font-medium">To</th>
        <th className="text-left p-2 font-medium">On Delete</th>
      </tr></thead>
      <tbody>
        {fkeys.map(f => {
          const key = f.constraint_name + f.direction;
          return (
            <Fragment key={key}>
              <tr
                onClick={() => setExpanded(expanded === key ? null : key)}
                className="border-b hover:bg-gray-50 cursor-pointer"
              >
                <td className="p-2 font-mono text-xs">
                  <span className="mr-1 text-gray-300 text-[10px]">{expanded === key ? '▼' : '▶'}</span>
                  {f.constraint_name}
                </td>
                <td className="p-2 text-center">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${f.direction === 'outbound' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                    {f.direction === 'outbound' ? 'OUT' : 'IN'}
                  </span>
                </td>
                <td className="p-2 font-mono text-xs">
                  <button onClick={e => { e.stopPropagation(); onNavigate(f.source_table, 'columns'); }} className="text-purple-600 hover:underline">{f.source_table}</button>
                  <span className="text-gray-400"> ({f.source_columns.join(', ')})</span>
                </td>
                <td className="p-2 font-mono text-xs">
                  <button onClick={e => { e.stopPropagation(); onNavigate(f.target_table, 'columns'); }} className="text-purple-600 hover:underline">{f.target_table}</button>
                  <span className="text-gray-400"> ({f.target_columns.join(', ')})</span>
                </td>
                <td className="p-2 text-xs text-gray-500">{f.on_delete}</td>
              </tr>
              {expanded === key && (
                <tr className="border-b">
                  <td colSpan={5} className="px-4 py-3 bg-gray-50">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                      <div><span className="text-gray-400">Constraint:</span> <span className="font-mono">{f.constraint_name}</span></div>
                      <div><span className="text-gray-400">Direction:</span> {f.direction}</div>
                      <div><span className="text-gray-400">Source:</span> <span className="font-mono">{f.source_table} ({f.source_columns.join(', ')})</span></div>
                      <div><span className="text-gray-400">Target:</span> <span className="font-mono">{f.target_table} ({f.target_columns.join(', ')})</span></div>
                      <div><span className="text-gray-400">ON DELETE:</span> {f.on_delete}</div>
                      <div><span className="text-gray-400">ON UPDATE:</span> {f.on_update}</div>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

function PoliciesTable({ policies }: { policies: PolicyInfo[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (policies.length === 0) return <Empty label="No RLS policies" />;
  return (
    <table className="w-full text-sm border-collapse">
      <thead><tr className="bg-gray-50 border-b">
        <th className="text-left p-2 font-medium">Policy</th>
        <th className="text-left p-2 font-medium">Command</th>
        <th className="text-left p-2 font-medium">Type</th>
        <th className="text-left p-2 font-medium">Roles</th>
      </tr></thead>
      <tbody>
        {policies.map(p => (
          <Fragment key={p.policy_name}>
            <tr
              onClick={() => setExpanded(expanded === p.policy_name ? null : p.policy_name)}
              className="border-b hover:bg-gray-50 cursor-pointer"
            >
              <td className="p-2 font-mono text-xs font-medium">
                <span className="mr-1 text-gray-300 text-[10px]">{expanded === p.policy_name ? '▼' : '▶'}</span>
                {p.policy_name}
              </td>
              <td className="p-2 text-xs">{p.command}</td>
              <td className="p-2 text-xs">{p.permissive}</td>
              <td className="p-2 text-xs text-gray-600">{p.roles.join(', ')}</td>
            </tr>
            {expanded === p.policy_name && (
              <tr className="border-b">
                <td colSpan={4} className="p-0">
                  <div className="space-y-2 px-4 py-3 bg-gray-50">
                    {p.qual && (
                      <div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">USING</div>
                        <pre className="text-xs font-mono bg-gray-900 text-gray-100 rounded p-3 whitespace-pre-wrap leading-relaxed">{p.qual}</pre>
                      </div>
                    )}
                    {p.with_check && (
                      <div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">WITH CHECK</div>
                        <pre className="text-xs font-mono bg-gray-900 text-gray-100 rounded p-3 whitespace-pre-wrap leading-relaxed">{p.with_check}</pre>
                      </div>
                    )}
                    {!p.qual && !p.with_check && <div className="text-xs text-gray-400">No USING or WITH CHECK expressions</div>}
                  </div>
                </td>
              </tr>
            )}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}

function TriggersTable({ triggers }: { triggers: TriggerInfo[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (triggers.length === 0) return <Empty label="No triggers" />;
  return (
    <table className="w-full text-sm border-collapse">
      <thead><tr className="bg-gray-50 border-b">
        <th className="text-left p-2 font-medium">Trigger</th>
        <th className="text-left p-2 font-medium">Timing</th>
        <th className="text-left p-2 font-medium">Event</th>
        <th className="text-left p-2 font-medium">Level</th>
      </tr></thead>
      <tbody>
        {triggers.map(t => (
          <Fragment key={t.trigger_name}>
            <tr
              onClick={() => setExpanded(expanded === t.trigger_name ? null : t.trigger_name)}
              className="border-b hover:bg-gray-50 cursor-pointer"
            >
              <td className="p-2 font-mono text-xs font-medium">
                <span className="mr-1 text-gray-300 text-[10px]">{expanded === t.trigger_name ? '▼' : '▶'}</span>
                {t.trigger_name}
              </td>
              <td className="p-2 text-xs">{t.timing}</td>
              <td className="p-2 text-xs">{t.event}</td>
              <td className="p-2 text-xs text-gray-500">{t.orientation}</td>
            </tr>
            {expanded === t.trigger_name && (
              <tr className="border-b">
                <td colSpan={4} className="p-0">
                  <pre className="px-4 py-3 text-xs font-mono bg-gray-900 text-gray-100 leading-relaxed whitespace-pre-wrap">{t.definition}</pre>
                </td>
              </tr>
            )}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}

function ScreensTab({
  focusTable, allFkeys, tableScreens, onNavigate,
}: {
  focusTable: string;
  allFkeys: FkEdge[];
  tableScreens: Record<string, ScreenRef[]>;
  onNavigate: (table: string, tab?: Tab) => void;
}) {
  const directScreens = tableScreens[focusTable] ?? [];

  const relatedTables = new Set<string>();
  for (const fk of allFkeys) {
    if (fk.source_table === focusTable) relatedTables.add(fk.target_table);
    if (fk.target_table === focusTable) relatedTables.add(fk.source_table);
  }

  const hop2: { table: string; screens: ScreenRef[] }[] = [];
  for (const tbl of relatedTables) {
    const screens = tableScreens[tbl] ?? [];
    if (screens.length > 0) hop2.push({ table: tbl, screens });
  }

  if (directScreens.length === 0 && hop2.length === 0) {
    return (
      <div className="p-8 text-center space-y-2">
        <div className="text-gray-400 text-sm">No screens reference this table or its FK neighbors</div>
        <div className="text-xs text-gray-300">Screen mappings come from bop_screen_meta.db_tables</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-2">
      {directScreens.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">1-hop — Direct</span>
            <span className="text-[10px] text-gray-400">Screens that directly use <span className="font-mono">{focusTable}</span></span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {directScreens.map(s => (
              <a key={s.screen_id} href={s.route} target="_blank"
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg border bg-white hover:bg-emerald-50 hover:border-emerald-200 transition-colors group">
                <span className="text-sm font-mono font-bold text-emerald-700 group-hover:text-emerald-800">{s.screen_id}</span>
                <span className="text-sm text-gray-700 truncate flex-1">{s.title}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 shrink-0">{s.module}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {hop2.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">2-hop — Related via FK</span>
            <span className="text-[10px] text-gray-400">Screens using FK-linked tables</span>
          </div>
          {hop2.map(({ table, screens }) => (
            <div key={table} className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-3 py-1.5 flex items-center gap-2 border-b">
                <button onClick={() => onNavigate(table, 'screens')} className="font-mono text-xs font-medium text-purple-600 hover:underline">{table}</button>
                <span className="text-[10px] text-gray-400">({screens.length} screen{screens.length !== 1 ? 's' : ''})</span>
              </div>
              <div className="flex flex-wrap gap-2 p-2">
                {screens.map(s => (
                  <a key={s.screen_id} href={s.route} target="_blank"
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded border bg-white hover:bg-indigo-50 hover:border-indigo-200 transition-colors group text-xs">
                    <span className="font-mono font-bold text-indigo-700 group-hover:text-indigo-800">{s.screen_id}</span>
                    <span className="text-gray-600">{s.title}</span>
                    <span className="text-[9px] px-1 rounded bg-gray-100 text-gray-400">{s.module}</span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RelationsGraph({
  focusTable, allFkeys, tables, onNavigate, tableScreens,
}: {
  focusTable: string;
  allFkeys: FkEdge[];
  tables: TableInfo[];
  onNavigate: (table: string, tab?: Tab) => void;
  tableScreens: Record<string, ScreenRef[]>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [depth, setDepth] = useState(1);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const nodesRef = useRef<{ id: string; x: number; y: number; vx: number; vy: number; depth: number }[]>([]);
  const animRef = useRef<number>(0);
  const dragRef = useRef<{ id: string } | null>(null);
  const prevFocus = useRef<string>('');

  const graph = (() => {
    const connected = new Set<string>();
    connected.add(focusTable);
    for (let d = 0; d < depth; d++) {
      const current = Array.from(connected);
      for (const tbl of current) {
        for (const fk of allFkeys) {
          if (fk.source_table === tbl) connected.add(fk.target_table);
          if (fk.target_table === tbl) connected.add(fk.source_table);
        }
      }
    }
    const edges = allFkeys.filter(fk => connected.has(fk.source_table) && connected.has(fk.target_table));
    const nodeDepths = new Map<string, number>();
    nodeDepths.set(focusTable, 0);
    for (let d = 0; d < depth; d++) {
      for (const fk of allFkeys) {
        if (nodeDepths.has(fk.source_table) && nodeDepths.get(fk.source_table)! <= d && !nodeDepths.has(fk.target_table))
          nodeDepths.set(fk.target_table, d + 1);
        if (nodeDepths.has(fk.target_table) && nodeDepths.get(fk.target_table)! <= d && !nodeDepths.has(fk.source_table))
          nodeDepths.set(fk.source_table, d + 1);
      }
    }
    return { nodeIds: Array.from(connected), edges, nodeDepths };
  })();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W * 2;
    canvas.height = H * 2;
    ctx.scale(2, 2);

    if (prevFocus.current !== focusTable) {
      nodesRef.current = [];
      prevFocus.current = focusTable;
    }

    const nodeCount = graph.nodeIds.length;
    const spreadRadius = Math.min(W, H) * 0.35 + nodeCount * 4;
    const nodes = graph.nodeIds.map((id, i) => {
      const existing = nodesRef.current.find(n => n.id === id);
      if (existing) return { ...existing, depth: graph.nodeDepths.get(id) ?? 1 };
      if (id === focusTable) return { id, x: W / 2, y: H / 2, vx: 0, vy: 0, depth: 0 };
      const angle = (i / nodeCount) * Math.PI * 2;
      const d = graph.nodeDepths.get(id) ?? 1;
      const radius = spreadRadius * 0.4 + d * spreadRadius * 0.3;
      return { id, x: W / 2 + Math.cos(angle) * radius, y: H / 2 + Math.sin(angle) * radius, vx: 0, vy: 0, depth: d };
    });
    nodesRef.current = nodes;
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    let hoveredId = hovered;

    const repulsion = Math.max(5000, 2000 + nodeCount * 300);
    const idealDist = Math.max(120, 80 + nodeCount * 3);
    const centerPull = nodeCount > 15 ? 0.005 : 0.01;

    function simulate() {
      for (const n of nodes) {
        if (dragRef.current?.id === n.id) continue;
        let fx = 0, fy = 0;
        for (const m of nodes) {
          if (m.id === n.id) continue;
          const dx = n.x - m.x, dy = n.y - m.y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 10);
          const force = repulsion / (dist * dist);
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        }
        for (const e of graph.edges) {
          let other: string | null = null;
          if (e.source_table === n.id) other = e.target_table;
          else if (e.target_table === n.id) other = e.source_table;
          if (!other) continue;
          const m = nodeMap.get(other);
          if (!m) continue;
          const dx = m.x - n.x, dy = m.y - n.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          fx += dx * 0.004 * (dist - idealDist);
          fy += dy * 0.004 * (dist - idealDist);
        }
        fx += (W / 2 - n.x) * centerPull;
        fy += (H / 2 - n.y) * centerPull;
        n.vx = (n.vx + fx * 0.3) * 0.85;
        n.vy = (n.vy + fy * 0.3) * 0.85;
        n.x = Math.max(70, Math.min(W - 70, n.x + n.vx));
        n.y = Math.max(25, Math.min(H - 25, n.y + n.vy));
      }
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);

      for (const e of graph.edges) {
        const src = nodeMap.get(e.source_table), tgt = nodeMap.get(e.target_table);
        if (!src || !tgt) continue;
        const hi = hoveredId === e.source_table || hoveredId === e.target_table;
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = hi ? '#6366f1' : '#cbd5e1';
        ctx.lineWidth = hi ? 2 : 1;
        ctx.stroke();
        const angle = Math.atan2(tgt.y - src.y, tgt.x - src.x);
        const mx = (src.x + tgt.x) / 2, my = (src.y + tgt.y) / 2;
        ctx.beginPath();
        ctx.moveTo(mx + Math.cos(angle) * 8, my + Math.sin(angle) * 8);
        ctx.lineTo(mx + Math.cos(angle + 2.5) * 6, my + Math.sin(angle + 2.5) * 6);
        ctx.lineTo(mx + Math.cos(angle - 2.5) * 6, my + Math.sin(angle - 2.5) * 6);
        ctx.closePath();
        ctx.fillStyle = hi ? '#6366f1' : '#94a3b8';
        ctx.fill();
        if (hi) {
          ctx.font = '9px monospace';
          ctx.fillStyle = '#6366f1';
          ctx.textAlign = 'center';
          ctx.fillText(`${e.source_columns.join(',')} → ${e.target_columns.join(',')}`, mx, my - 8);
        }
      }

      for (const n of nodes) {
        const isFocus = n.id === focusTable;
        const isHov = n.id === hoveredId;
        const linked = hoveredId && graph.edges.some(e =>
          (e.source_table === hoveredId && e.target_table === n.id) ||
          (e.target_table === hoveredId && e.source_table === n.id));
        const r = isFocus ? 8 : 6;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = isFocus ? '#3b82f6' : isHov ? '#6366f1' : linked ? '#818cf8' : '#64748b';
        ctx.fill();
        if (isFocus || isHov) { ctx.strokeStyle = isFocus ? '#1e40af' : '#4f46e5'; ctx.lineWidth = 2; ctx.stroke(); }
        ctx.font = `${isFocus || isHov ? 'bold ' : ''}11px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = isFocus ? '#1e40af' : isHov ? '#4f46e5' : '#334155';
        ctx.fillText(n.id, n.x, n.y + r + 13);

        const screens = tableScreens[n.id];
        if (screens && screens.length > 0) {
          const badge = screens.length.toString();
          ctx.font = 'bold 8px system-ui, sans-serif';
          const bw = ctx.measureText(badge).width + 6;
          ctx.fillStyle = '#059669';
          ctx.beginPath();
          ctx.roundRect(n.x + r - 2, n.y - r - 4, bw, 12, 3);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'center';
          ctx.fillText(badge, n.x + r - 2 + bw / 2, n.y - r + 5);
        }
      }
    }

    let frame = 0;
    function tick() {
      simulate();
      draw();
      frame++;
      const maxFrames = nodeCount > 15 ? 350 : 200;
      if (frame < maxFrames) animRef.current = requestAnimationFrame(tick);
    }
    tick();

    function getNode(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      for (const n of nodesRef.current) {
        if ((n.x - x) ** 2 + (n.y - y) ** 2 < 200) return n;
      }
      return null;
    }

    function onMove(e: MouseEvent) {
      if (dragRef.current) {
        const rect = canvas!.getBoundingClientRect();
        const node = nodesRef.current.find(n => n.id === dragRef.current!.id);
        if (node) { node.x = e.clientX - rect.left; node.y = e.clientY - rect.top; node.vx = 0; node.vy = 0; }
        frame = 0; tick();
        return;
      }
      const node = getNode(e);
      hoveredId = node?.id ?? null;
      canvas!.style.cursor = node ? 'pointer' : 'default';
      draw();
    }

    let downPos = { x: 0, y: 0 };
    function onDown(e: MouseEvent) {
      downPos = { x: e.clientX, y: e.clientY };
      const node = getNode(e);
      if (node) dragRef.current = { id: node.id };
    }

    function onUp(e: MouseEvent) {
      const dx = e.clientX - downPos.x, dy = e.clientY - downPos.y;
      if (dx * dx + dy * dy < 25) {
        const node = getNode(e);
        setSelectedNode(node ? node.id : null);
      }
      dragRef.current = null;
    }

    function onDbl(e: MouseEvent) {
      const node = getNode(e);
      if (node && node.id !== focusTable) onNavigate(node.id, 'relations');
    }

    function onLeave() { hoveredId = null; dragRef.current = null; draw(); }

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('dblclick', onDbl);
    canvas.addEventListener('mouseleave', onLeave);

    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('dblclick', onDbl);
      canvas.removeEventListener('mouseleave', onLeave);
    };
  }, [focusTable, allFkeys, depth]);

  if (graph.nodeIds.length <= 1 && graph.edges.length === 0) {
    return <div className="p-6 text-center text-gray-400 text-sm">No foreign key relationships found for this table</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Depth:</span>
          {[1, 2, 3].map(d => (
            <button key={d} onClick={() => { nodesRef.current = []; setDepth(d); }}
              className={`px-2.5 py-1 rounded text-xs font-medium ${depth === d ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {d} hop{d > 1 ? 's' : ''}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400">{graph.nodeIds.length} tables, {graph.edges.length} relationships</span>
        <span className="text-[10px] text-gray-400 ml-auto">Click: show TCs. Double-click: navigate. Drag to rearrange.</span>
      </div>
      <div className="border rounded-lg overflow-hidden bg-white" style={{ height: `${Math.min(700, Math.max(450, 300 + graph.nodeIds.length * 12))}px` }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      </div>
      {selectedNode && (tableScreens[selectedNode] ?? []).length > 0 && (
        <div className="border rounded-lg bg-white p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Transaction Codes</span>
            <span className="font-mono text-sm font-medium text-indigo-700">{selectedNode}</span>
            <button onClick={() => setSelectedNode(null)} className="ml-auto text-gray-400 hover:text-gray-600 text-xs">Close</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(tableScreens[selectedNode] ?? []).map(s => (
              <a
                key={s.screen_id}
                href={s.route}
                target="_blank"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-gray-50 hover:bg-indigo-50 hover:border-indigo-200 transition-colors group"
              >
                <span className="text-xs font-mono font-bold text-emerald-700 group-hover:text-indigo-700">{s.screen_id}</span>
                <span className="text-xs text-gray-600">{s.title}</span>
                <span className="text-[9px] px-1 rounded bg-gray-200 text-gray-500">{s.module}</span>
              </a>
            ))}
          </div>
        </div>
      )}
      {selectedNode && (tableScreens[selectedNode] ?? []).length === 0 && (
        <div className="border rounded-lg bg-gray-50 p-3 flex items-center gap-2">
          <span className="font-mono text-sm font-medium text-gray-600">{selectedNode}</span>
          <span className="text-xs text-gray-400">No transaction codes mapped to this table</span>
          <button onClick={() => setSelectedNode(null)} className="ml-auto text-gray-400 hover:text-gray-600 text-xs">Close</button>
        </div>
      )}
      <div className="flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full bg-blue-500" /> Focus table</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full bg-gray-500" /> Related table</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t-2 border-gray-300" /> FK relationship</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded bg-emerald-600 text-[8px] text-white flex items-center justify-center font-bold">n</span> Has TC screens</span>
      </div>
    </div>
  );
}

const STATUS_CFG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  in_range: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', label: 'In Range' },
  monitor:  { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Monitor' },
  urgent:   { bg: 'bg-red-50',   text: 'text-red-700',   dot: 'bg-red-500',   label: 'Urgent' },
};

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1073741824) return `${(b / 1048576).toFixed(1)} MB`;
  return `${(b / 1073741824).toFixed(2)} GB`;
}

function fmtTs(ts: string | null): string {
  if (!ts) return '—';
  return new Date(ts).toISOString().slice(0, 16).replace('T', ' ');
}

function HealthTab({ health }: { health: TableHealth }) {
  return (
    <div className="space-y-6 py-2">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {health.assessments.map(a => {
          const cfg = STATUS_CFG[a.status] ?? STATUS_CFG.in_range;
          return (
            <div key={a.key} className={`rounded-lg border p-3 ${cfg.bg}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                <span className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</span>
              </div>
              <div className={`text-lg font-bold ${cfg.text}`}>{a.value}</div>
              <div className="text-xs text-gray-600 mt-0.5">{a.label}</div>
              <div className="text-[11px] text-gray-500 mt-1">{a.detail}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 border-b text-xs font-semibold text-gray-500 uppercase tracking-wide">Storage Breakdown</div>
          <div className="p-3 space-y-2">
            {[
              { label: 'Total Size', value: fmtBytes(Number(health.total_bytes)) },
              { label: 'Table Data', value: fmtBytes(Number(health.table_bytes)) },
              { label: 'Indexes', value: fmtBytes(Number(health.index_bytes)) },
              { label: 'TOAST', value: fmtBytes(Number(health.toast_bytes)) },
              { label: 'Pages', value: Number(health.relpages).toLocaleString() },
            ].map(r => (
              <div key={r.label} className="flex justify-between text-sm">
                <span className="text-gray-500">{r.label}</span>
                <span className="font-mono font-medium">{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 border-b text-xs font-semibold text-gray-500 uppercase tracking-wide">Tuple Activity</div>
          <div className="p-3 space-y-2">
            {[
              { label: 'Live Tuples', value: Number(health.live_tuples).toLocaleString() },
              { label: 'Dead Tuples', value: Number(health.dead_tuples).toLocaleString() },
              { label: 'Inserts', value: Number(health.inserts).toLocaleString() },
              { label: 'Updates', value: Number(health.updates).toLocaleString() },
              { label: 'HOT Updates', value: Number(health.hot_updates).toLocaleString() },
              { label: 'Deletes', value: Number(health.deletes).toLocaleString() },
            ].map(r => (
              <div key={r.label} className="flex justify-between text-sm">
                <span className="text-gray-500">{r.label}</span>
                <span className="font-mono font-medium">{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 border-b text-xs font-semibold text-gray-500 uppercase tracking-wide">Scan Statistics</div>
          <div className="p-3 space-y-2">
            {[
              { label: 'Sequential Scans', value: Number(health.seq_scan).toLocaleString() },
              { label: 'Seq Tuples Read', value: Number(health.seq_tup_read).toLocaleString() },
              { label: 'Index Scans', value: Number(health.idx_scan).toLocaleString() },
              { label: 'Index Tuples Fetched', value: Number(health.idx_tup_fetch).toLocaleString() },
            ].map(r => (
              <div key={r.label} className="flex justify-between text-sm">
                <span className="text-gray-500">{r.label}</span>
                <span className="font-mono font-medium">{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 border-b text-xs font-semibold text-gray-500 uppercase tracking-wide">Maintenance History</div>
          <div className="p-3 space-y-2">
            {[
              { label: 'Last Manual Vacuum', value: fmtTs(health.last_vacuum) },
              { label: 'Last Auto Vacuum', value: fmtTs(health.last_autovacuum) },
              { label: 'Last Manual Analyze', value: fmtTs(health.last_analyze) },
              { label: 'Last Auto Analyze', value: fmtTs(health.last_autoanalyze) },
              { label: 'Vacuum Count', value: `${health.vacuum_count} manual / ${health.autovacuum_count} auto` },
              { label: 'Analyze Count', value: `${health.analyze_count} manual / ${health.autoanalyze_count} auto` },
            ].map(r => (
              <div key={r.label} className="flex justify-between text-sm">
                <span className="text-gray-500">{r.label}</span>
                <span className="font-mono font-medium text-right">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="p-6 text-center text-gray-400 text-sm">{label}</div>;
}
