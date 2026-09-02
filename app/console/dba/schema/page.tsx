'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

interface SchemaInfo { schema_name: string; table_count: number; view_count: number; function_count: number; is_system: boolean }
interface TableInfo { table_name: string; table_type: string; row_estimate: number; total_size: string; index_count: number; has_rls: boolean; rls_forced: boolean; description: string | null }
interface ColumnInfo { ordinal: number; column_name: string; data_type: string; is_nullable: boolean; column_default: string | null; is_primary_key: boolean; is_unique: boolean; fk_target: string | null; description: string | null }
interface IndexInfo { index_name: string; is_unique: boolean; is_primary: boolean; columns: string[]; index_size: string; definition: string }
interface FkInfo { constraint_name: string; direction: string; source_table: string; source_columns: string[]; target_table: string; target_columns: string[]; on_delete: string; on_update: string }
interface PolicyInfo { policy_name: string; command: string; permissive: string; roles: string[]; qual: string | null; with_check: string | null }
interface TriggerInfo { trigger_name: string; event: string; timing: string; orientation: string; definition: string }
interface EnumInfo { enum_name: string; enum_values: string[] }

type Tab = 'columns' | 'indexes' | 'fkeys' | 'policies' | 'triggers';

export default function SchemaExplorerPage() {
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
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableFilter, setTableFilter] = useState('');

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
      .then(d => setTables(d.tables ?? []))
      .catch(() => {});
    fetch(`/api/bop/dba/schema?action=enums&schema=${selectedSchema}`)
      .then(r => r.json())
      .then(d => setEnums(d.enums ?? []))
      .catch(() => {});
  }, [selectedSchema]);

  useEffect(() => {
    if (!selectedTable) return;
    setDetailLoading(true);
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
  }, [selectedTable, selectedSchema]);

  const visibleSchemas = showSystem ? schemas : schemas.filter(s => !s.is_system);
  const filteredTables = tableFilter
    ? tables.filter(t => t.table_name.toLowerCase().includes(tableFilter.toLowerCase()))
    : tables;

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'columns', label: 'Columns', count: columns.length },
    { key: 'indexes', label: 'Indexes', count: indexes.length },
    { key: 'fkeys', label: 'Foreign Keys', count: fkeys.length },
    { key: 'policies', label: 'RLS Policies', count: policies.length },
    { key: 'triggers', label: 'Triggers', count: triggers.length },
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
            placeholder="Filter tables..."
            value={tableFilter}
            onChange={e => setTableFilter(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-sm"
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
                    onClick={() => { setSelectedTable(t.table_name); setActiveTab('columns'); }}
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
                    {t.has_rls && <span className="text-[10px] text-green-600" title="RLS enabled">RLS</span>}
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
              </div>

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
                  </button>
                ))}
              </div>

              {detailLoading ? (
                <div className="p-4 text-sm text-gray-500">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  {activeTab === 'columns' && <ColumnsTable columns={columns} />}
                  {activeTab === 'indexes' && <IndexesTable indexes={indexes} />}
                  {activeTab === 'fkeys' && <FKeysTable fkeys={fkeys} />}
                  {activeTab === 'policies' && <PoliciesTable policies={policies} />}
                  {activeTab === 'triggers' && <TriggersTable triggers={triggers} />}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ColumnsTable({ columns }: { columns: ColumnInfo[] }) {
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
            <td className="p-2 font-mono text-xs text-purple-600">{c.fk_target ?? ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function IndexesTable({ indexes }: { indexes: IndexInfo[] }) {
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
          <tr key={i.index_name} className="border-b hover:bg-gray-50">
            <td className="p-2 font-mono text-xs">
              {i.is_primary && <span className="text-amber-600 mr-1">PK</span>}
              {i.index_name}
            </td>
            <td className="p-2 font-mono text-xs text-gray-600">{i.columns.join(', ')}</td>
            <td className="p-2 text-center text-xs">{i.is_unique ? 'yes' : ''}</td>
            <td className="p-2 text-xs text-gray-500">{i.index_size}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FKeysTable({ fkeys }: { fkeys: FkInfo[] }) {
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
        {fkeys.map(f => (
          <tr key={f.constraint_name + f.direction} className="border-b hover:bg-gray-50">
            <td className="p-2 font-mono text-xs">{f.constraint_name}</td>
            <td className="p-2 text-center">
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${f.direction === 'outbound' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                {f.direction === 'outbound' ? 'OUT' : 'IN'}
              </span>
            </td>
            <td className="p-2 font-mono text-xs">{f.source_table} ({f.source_columns.join(', ')})</td>
            <td className="p-2 font-mono text-xs">{f.target_table} ({f.target_columns.join(', ')})</td>
            <td className="p-2 text-xs text-gray-500">{f.on_delete}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PoliciesTable({ policies }: { policies: PolicyInfo[] }) {
  if (policies.length === 0) return <Empty label="No RLS policies" />;
  return (
    <table className="w-full text-sm border-collapse">
      <thead><tr className="bg-gray-50 border-b">
        <th className="text-left p-2 font-medium">Policy</th>
        <th className="text-left p-2 font-medium">Command</th>
        <th className="text-left p-2 font-medium">Type</th>
        <th className="text-left p-2 font-medium">Roles</th>
        <th className="text-left p-2 font-medium">USING</th>
        <th className="text-left p-2 font-medium">WITH CHECK</th>
      </tr></thead>
      <tbody>
        {policies.map(p => (
          <tr key={p.policy_name} className="border-b hover:bg-gray-50">
            <td className="p-2 font-mono text-xs font-medium">{p.policy_name}</td>
            <td className="p-2 text-xs">{p.command}</td>
            <td className="p-2 text-xs">{p.permissive}</td>
            <td className="p-2 text-xs text-gray-600">{p.roles.join(', ')}</td>
            <td className="p-2 font-mono text-[11px] text-gray-600 max-w-[250px] truncate" title={p.qual ?? ''}>{p.qual ?? ''}</td>
            <td className="p-2 font-mono text-[11px] text-gray-600 max-w-[250px] truncate" title={p.with_check ?? ''}>{p.with_check ?? ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TriggersTable({ triggers }: { triggers: TriggerInfo[] }) {
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
          <tr key={t.trigger_name} className="border-b hover:bg-gray-50">
            <td className="p-2 font-mono text-xs font-medium">{t.trigger_name}</td>
            <td className="p-2 text-xs">{t.timing}</td>
            <td className="p-2 text-xs">{t.event}</td>
            <td className="p-2 text-xs text-gray-500">{t.orientation}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="p-6 text-center text-gray-400 text-sm">{label}</div>;
}
