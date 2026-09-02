'use client';
import { useState, useEffect, useRef } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

interface SchemaInfo { schema_name: string; table_count: number; is_system: boolean }
interface TableInfo { table_name: string; table_type: string; row_estimate: number; total_size: string; has_rls: boolean }
interface RowData { [key: string]: any }

export default function TableDataPage() {
  const [schemas, setSchemas] = useState<SchemaInfo[]>([]);
  const [selectedSchema, setSelectedSchema] = useState('public');
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableFilter, setTableFilter] = useState('');

  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<RowData[]>([]);
  const [pkCols, setPkCols] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [pages, setPages] = useState(0);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState('');
  const [filterInput, setFilterInput] = useState('');

  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const [showInsert, setShowInsert] = useState(false);
  const [insertRow, setInsertRow] = useState<RowData>({});
  const [inserting, setInserting] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const toastTimer = useRef<any>(null);

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  const [initialTable, setInitialTable] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('schema');
    const t = params.get('table');
    if (s) setSelectedSchema(s);
    if (t) setInitialTable(t);
  }, []);

  useEffect(() => {
    fetch('/api/bop/dba/schema?action=schemas')
      .then(r => r.json())
      .then(d => { setSchemas((d.schemas ?? []).filter((s: SchemaInfo) => !s.is_system)); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => {
    setTables([]);
    setSelectedTable(null);
    setTableFilter('');
    fetch(`/api/bop/dba/schema?action=tables&schema=${selectedSchema}`)
      .then(r => r.json())
      .then(d => setTables((d.tables ?? []).filter((t: TableInfo) => t.table_type === 'table')))
      .catch(() => {});
  }, [selectedSchema]);

  useEffect(() => {
    if (initialTable && tables.length > 0 && !selectedTable) {
      const match = tables.find(t => t.table_name === initialTable);
      if (match) selectTable(match.table_name);
      setInitialTable(null);
    }
  }, [tables, initialTable]);

  function loadData(s: string, t: string, p: number, sc: string | null, sd: string, f: string) {
    setDataLoading(true);
    setError(null);
    const params = new URLSearchParams({ action: 'rows', schema: s, table: t, page: String(p), limit: String(limit) });
    if (sc) { params.set('sort', sc); params.set('dir', sd); }
    if (f) params.set('filter', f);

    Promise.all([
      fetch(`/api/bop/dba/data?${params}`).then(r => r.json()),
      fetch(`/api/bop/dba/data?action=pk&schema=${s}&table=${t}`).then(r => r.json()),
    ]).then(([data, pk]) => {
      setColumns(data.columns ?? []);
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 0);
      setPage(data.page ?? 1);
      setPkCols(pk.pk_columns ?? []);
      setDataLoading(false);
    }).catch(e => {
      setError(e.message);
      setDataLoading(false);
    });
  }

  function selectTable(t: string) {
    setSelectedTable(t);
    setSortCol(null);
    setSortDir('asc');
    setFilter('');
    setFilterInput('');
    setEditingCell(null);
    setShowInsert(false);
    setDeleteConfirm(null);
    loadData(selectedSchema, t, 1, null, 'asc', '');
  }

  function handleSort(col: string) {
    const newDir = sortCol === col && sortDir === 'asc' ? 'desc' : 'asc';
    setSortCol(col);
    setSortDir(newDir);
    loadData(selectedSchema, selectedTable!, 1, col, newDir, filter);
  }

  function handleFilter() {
    setFilter(filterInput);
    loadData(selectedSchema, selectedTable!, 1, sortCol, sortDir, filterInput);
  }

  function handlePage(p: number) {
    setPage(p);
    loadData(selectedSchema, selectedTable!, p, sortCol, sortDir, filter);
  }

  function startEdit(rowIdx: number, col: string) {
    if (pkCols.length === 0) {
      showToast('Cannot edit: table has no primary key', 'err');
      return;
    }
    setEditingCell({ row: rowIdx, col });
    const val = rows[rowIdx][col];
    setEditValue(val === null || val === undefined ? '' : String(val));
  }

  async function saveEdit() {
    if (!editingCell || !selectedTable) return;
    const { row: rowIdx, col } = editingCell;
    const oldRow = rows[rowIdx];
    const pkValues: RowData = {};
    for (const pk of pkCols) pkValues[pk] = oldRow[pk];

    setSaving(true);
    try {
      const res = await fetch('/api/bop/dba/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          schema: selectedSchema,
          table: selectedTable,
          pk_values: pkValues,
          updates: { [col]: editValue === '' ? null : editValue },
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.updated) {
        const newRows = [...rows];
        newRows[rowIdx] = data.updated;
        setRows(newRows);
      }
      setEditingCell(null);
      showToast('Cell updated');
    } catch (e: any) {
      showToast(e.message, 'err');
    }
    setSaving(false);
  }

  async function handleInsert() {
    if (!selectedTable) return;
    setInserting(true);
    try {
      const res = await fetch('/api/bop/dba/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'insert',
          schema: selectedSchema,
          table: selectedTable,
          row: insertRow,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setShowInsert(false);
      setInsertRow({});
      showToast('Row inserted');
      loadData(selectedSchema, selectedTable, page, sortCol, sortDir, filter);
    } catch (e: any) {
      showToast(e.message, 'err');
    }
    setInserting(false);
  }

  async function handleDelete(rowIdx: number) {
    if (!selectedTable || pkCols.length === 0) return;
    setDeleting(true);
    const row = rows[rowIdx];
    const pkValues: RowData = {};
    for (const pk of pkCols) pkValues[pk] = row[pk];
    try {
      const res = await fetch('/api/bop/dba/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          schema: selectedSchema,
          table: selectedTable,
          pk_values: pkValues,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDeleteConfirm(null);
      showToast(`${data.deleted} row deleted`);
      loadData(selectedSchema, selectedTable, page, sortCol, sortDir, filter);
    } catch (e: any) {
      showToast(e.message, 'err');
    }
    setDeleting(false);
  }

  const filteredTables = tableFilter
    ? tables.filter(t => t.table_name.toLowerCase().includes(tableFilter.toLowerCase()))
    : tables;

  const canWrite = pkCols.length > 0;

  function formatCell(val: any): string {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      <ScreenHeader />
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}

      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg ${
          toast.type === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="flex gap-6" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {/* Left panel — table list */}
        <div className="w-64 shrink-0 space-y-3">
          <select
            value={selectedSchema}
            onChange={e => setSelectedSchema(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-sm bg-white"
          >
            {schemas.map(s => (
              <option key={s.schema_name} value={s.schema_name}>{s.schema_name} ({s.table_count})</option>
            ))}
          </select>

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
                <div className="p-3 text-sm text-gray-400">No tables</div>
              ) : (
                filteredTables.map(t => (
                  <button
                    key={t.table_name}
                    onClick={() => selectTable(t.table_name)}
                    className={`w-full text-left px-3 py-2 text-sm border-b last:border-b-0 hover:bg-gray-50 ${
                      selectedTable === t.table_name ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="font-mono text-xs truncate">{t.table_name}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      ~{t.row_estimate.toLocaleString()} rows · {t.total_size}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right panel — data grid */}
        <div className="flex-1 min-w-0">
          {!selectedTable ? (
            <div className="border rounded-lg p-12 text-center text-gray-400">
              <div className="text-lg">Select a table to browse data</div>
              <div className="text-sm mt-1">{tables.length} tables in <span className="font-mono">{selectedSchema}</span></div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Toolbar */}
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-lg font-semibold font-mono">{selectedSchema}.{selectedTable}</h2>
                <span className="text-xs text-gray-500">{total.toLocaleString()} rows</span>
                {!canWrite && <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-600 rounded font-medium">No PK — read only</span>}

                <div className="flex-1" />

                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="Search text columns..."
                    value={filterInput}
                    onChange={e => setFilterInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleFilter()}
                    className="border rounded px-2 py-1 text-sm w-48"
                  />
                  <button onClick={handleFilter} className="border rounded px-2 py-1 text-sm hover:bg-gray-50">Search</button>
                </div>

                {canWrite && (
                  <button
                    onClick={() => { setShowInsert(!showInsert); setInsertRow({}); }}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    + Insert
                  </button>
                )}
              </div>

              {/* Insert form */}
              {showInsert && (
                <div className="border rounded-lg p-4 bg-blue-50 space-y-3">
                  <div className="text-sm font-medium">Insert new row</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {columns.map(col => (
                      <div key={col}>
                        <label className="text-[10px] text-gray-500 font-mono block mb-0.5">{col}</label>
                        <input
                          type="text"
                          value={insertRow[col] ?? ''}
                          onChange={e => setInsertRow({ ...insertRow, [col]: e.target.value })}
                          className="w-full border rounded px-2 py-1 text-xs font-mono"
                          placeholder="NULL"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleInsert}
                      disabled={inserting}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      {inserting ? 'Inserting...' : 'Insert'}
                    </button>
                    <button onClick={() => setShowInsert(false)} className="border rounded px-3 py-1 text-sm hover:bg-gray-50">Cancel</button>
                  </div>
                </div>
              )}

              {/* Data table */}
              {dataLoading ? (
                <div className="p-4 text-sm text-gray-500">Loading data...</div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse whitespace-nowrap">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          {canWrite && <th className="p-2 w-16 text-center text-xs font-medium text-gray-400">Actions</th>}
                          {columns.map(col => (
                            <th
                              key={col}
                              onClick={() => handleSort(col)}
                              className="text-left p-2 font-medium text-xs cursor-pointer hover:bg-gray-100 select-none"
                            >
                              <span className="font-mono">{col}</span>
                              {pkCols.includes(col) && <span className="ml-1 text-amber-500 text-[10px]">PK</span>}
                              {sortCol === col && <span className="ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length === 0 ? (
                          <tr><td colSpan={columns.length + (canWrite ? 1 : 0)} className="p-6 text-center text-gray-400">No rows</td></tr>
                        ) : rows.map((row, ri) => (
                          <tr key={ri} className="border-b hover:bg-gray-50">
                            {canWrite && (
                              <td className="p-1 text-center">
                                {deleteConfirm === ri ? (
                                  <div className="flex gap-1 justify-center">
                                    <button
                                      onClick={() => handleDelete(ri)}
                                      disabled={deleting}
                                      className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded hover:bg-red-700"
                                    >
                                      {deleting ? '...' : 'Yes'}
                                    </button>
                                    <button
                                      onClick={() => setDeleteConfirm(null)}
                                      className="text-[10px] border px-1.5 py-0.5 rounded hover:bg-gray-100"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setDeleteConfirm(ri)}
                                    className="text-[10px] text-red-400 hover:text-red-600 px-1"
                                    title="Delete row"
                                  >
                                    ✕
                                  </button>
                                )}
                              </td>
                            )}
                            {columns.map(col => {
                              const isEditing = editingCell?.row === ri && editingCell?.col === col;
                              const isPk = pkCols.includes(col);
                              return (
                                <td
                                  key={col}
                                  className={`p-2 font-mono text-xs max-w-[300px] ${isPk ? 'bg-amber-50/50' : ''}`}
                                  onDoubleClick={() => !isPk && canWrite && startEdit(ri, col)}
                                >
                                  {isEditing ? (
                                    <div className="flex gap-1">
                                      <input
                                        type="text"
                                        value={editValue}
                                        onChange={e => setEditValue(e.target.value)}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') saveEdit();
                                          if (e.key === 'Escape') setEditingCell(null);
                                        }}
                                        autoFocus
                                        className="border rounded px-1 py-0.5 text-xs w-full min-w-[80px]"
                                      />
                                      <button onClick={saveEdit} disabled={saving} className="text-green-600 text-xs px-1">
                                        {saving ? '...' : '✓'}
                                      </button>
                                      <button onClick={() => setEditingCell(null)} className="text-gray-400 text-xs px-1">✕</button>
                                    </div>
                                  ) : (
                                    <span className={`truncate block ${row[col] === null ? 'text-gray-300 italic' : 'text-gray-700'}`} title={formatCell(row[col])}>
                                      {formatCell(row[col])}
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Pagination */}
              {pages > 1 && (
                <div className="flex items-center gap-2 justify-between text-sm">
                  <span className="text-gray-500">
                    Page {page} of {pages} ({total.toLocaleString()} rows)
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => handlePage(1)} disabled={page === 1} className="border rounded px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-30">First</button>
                    <button onClick={() => handlePage(page - 1)} disabled={page === 1} className="border rounded px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-30">Prev</button>
                    <button onClick={() => handlePage(page + 1)} disabled={page === pages} className="border rounded px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-30">Next</button>
                    <button onClick={() => handlePage(pages)} disabled={page === pages} className="border rounded px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-30">Last</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
