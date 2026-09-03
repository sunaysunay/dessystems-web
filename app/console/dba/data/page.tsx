'use client';
import { useState, useEffect, useRef } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

interface SchemaInfo { schema_name: string; table_count: number; is_system: boolean }
interface TableInfo { table_name: string; table_type: string; row_estimate: number; total_size: string; has_rls: boolean }
interface RowData { [key: string]: any }
interface TableDoc { table_name: string; description: string; tags: string[]; module: string | null }
interface ColIndex { table_name: string; columns: string[] }
interface ColMeta { ordinal: number; column_name: string; data_type: string; is_nullable: string; column_default: string; is_primary_key: string; is_unique: string; fk_target: string; description: string }
interface Protection { level: number; label: string }

const PROTECTION_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  0: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  1: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  2: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  3: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  4: { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200' },
};

function getInputType(dataType: string): 'text' | 'number' | 'boolean' | 'json' | 'date' | 'datetime' {
  const t = dataType.toLowerCase();
  if (t === 'boolean') return 'boolean';
  if (['integer', 'bigint', 'smallint', 'numeric', 'real', 'double precision', 'int4', 'int8', 'int2', 'float4', 'float8'].includes(t)) return 'number';
  if (t === 'jsonb' || t === 'json') return 'json';
  if (t === 'date') return 'date';
  if (t.startsWith('timestamp')) return 'datetime';
  return 'text';
}

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

export default function TableDataPage() {
  const [schemas, setSchemas] = useState<SchemaInfo[]>([]);
  const [selectedSchema, setSelectedSchema] = useState('public');
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableFilter, setTableFilter] = useState('');
  const [tableDocs, setTableDocs] = useState<Map<string, TableDoc>>(new Map());
  const [colIndex, setColIndex] = useState<Map<string, string[]>>(new Map());

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
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [colMeta, setColMeta] = useState<Map<string, ColMeta>>(new Map());
  const [protection, setProtection] = useState<Protection>({ level: 3, label: 'Operational' });
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [batchConfirm, setBatchConfirm] = useState(false);

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
    setSelectedRows(new Set());
    const params = new URLSearchParams({ action: 'rows', schema: s, table: t, page: String(p), limit: String(limit) });
    if (sc) { params.set('sort', sc); params.set('dir', sd); }
    if (f) params.set('filter', f);

    Promise.all([
      fetch(`/api/bop/dba/data?${params}`).then(r => r.json()),
      fetch(`/api/bop/dba/data?action=pk&schema=${s}&table=${t}`).then(r => r.json()),
      fetch(`/api/bop/dba/data?action=columns_meta&schema=${s}&table=${t}`).then(r => r.json()),
      fetch(`/api/bop/dba/data?action=protection&schema=${s}&table=${t}`).then(r => r.json()),
    ]).then(([data, pk, meta, prot]) => {
      setColumns(data.columns ?? []);
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 0);
      setPage(data.page ?? 1);
      setPkCols(pk.pk_columns ?? []);
      const cm = new Map<string, ColMeta>();
      for (const c of (meta.columns_meta ?? [])) cm.set(c.column_name, c);
      setColMeta(cm);
      if (prot.protection) setProtection(prot.protection);
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
    setSelectedRows(new Set());
    setBatchConfirm(false);
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
    if (protection.level === 0) {
      showToast('L0 System Critical — read-only table', 'err');
      return;
    }
    if (protection.level === 1) {
      showToast('L1 Configuration — admin edits only. Proceed with caution.', 'err');
    }
    setEditingCell({ row: rowIdx, col });
    const val = rows[rowIdx][col];
    const meta = colMeta.get(col);
    const inputType = meta ? getInputType(meta.data_type) : 'text';
    if (inputType === 'json' && val !== null && val !== undefined) {
      setEditValue(typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val));
    } else if (inputType === 'boolean') {
      setEditValue(val === true || val === 'true' ? 'true' : 'false');
    } else {
      setEditValue(val === null || val === undefined ? '' : String(val));
    }
  }

  async function saveEdit() {
    if (!editingCell || !selectedTable) return;
    const { row: rowIdx, col } = editingCell;
    const oldRow = rows[rowIdx];
    const pkValues: RowData = {};
    for (const pk of pkCols) pkValues[pk] = oldRow[pk];

    const meta = colMeta.get(col);
    const inputType = meta ? getInputType(meta.data_type) : 'text';
    let parsedValue: any = editValue === '' ? null : editValue;

    if (parsedValue !== null) {
      if (inputType === 'boolean') parsedValue = parsedValue === 'true';
      else if (inputType === 'number') {
        const n = Number(parsedValue);
        if (isNaN(n)) { showToast('Invalid number', 'err'); return; }
        parsedValue = n;
      } else if (inputType === 'json') {
        try { parsedValue = JSON.parse(parsedValue); } catch { showToast('Invalid JSON', 'err'); return; }
      }
    }

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
          updates: { [col]: parsedValue },
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

  async function handleExport(format: 'csv' | 'json' | 'sql' | 'tsv') {
    if (!selectedTable) return;
    setExporting(true);
    setExportOpen(false);
    try {
      const params = new URLSearchParams({
        action: 'export',
        schema: selectedSchema,
        table: selectedTable,
        format,
      });
      if (sortCol) { params.set('sort', sortCol); params.set('dir', sortDir); }
      if (filter) params.set('filter', filter);

      const res = await fetch(`/api/bop/dba/data?${params}`);
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedTable}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Exported as ${format.toUpperCase()}`);
    } catch (e: any) {
      showToast(e.message, 'err');
    }
    setExporting(false);
  }

  function toggleRow(idx: number) {
    const next = new Set(selectedRows);
    if (next.has(idx)) next.delete(idx); else next.add(idx);
    setSelectedRows(next);
  }

  function toggleAllRows() {
    if (selectedRows.size === rows.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(rows.map((_, i) => i)));
  }

  async function handleBatchDelete() {
    if (!selectedTable || pkCols.length === 0 || selectedRows.size === 0) return;
    setBatchDeleting(true);
    const rowsToDelete = Array.from(selectedRows).map(idx => {
      const row = rows[idx];
      const pkValues: RowData = {};
      for (const pk of pkCols) pkValues[pk] = row[pk];
      return pkValues;
    });
    try {
      const res = await fetch('/api/bop/dba/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batch_delete',
          schema: selectedSchema,
          table: selectedTable,
          rows: rowsToDelete,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      showToast(`${data.deleted} row${data.deleted !== 1 ? 's' : ''} deleted`);
      if (data.errors?.length) showToast(`${data.errors.length} failed`, 'err');
      setSelectedRows(new Set());
      setBatchConfirm(false);
      loadData(selectedSchema, selectedTable, page, sortCol, sortDir, filter);
    } catch (e: any) {
      showToast(e.message, 'err');
    }
    setBatchDeleting(false);
  }

  const canEdit = pkCols.length > 0 && protection.level > 0;
  const canDelete = pkCols.length > 0 && protection.level >= 2;

  const filteredTables = tableFilter
    ? tables.filter(t => matchesSmartFilter(t.table_name, tableFilter, colIndex))
    : tables;

  const canWrite = canEdit;

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
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs truncate flex-1">{t.table_name}</span>
                      {tableDocs.get(t.table_name)?.module && (
                        <span className="text-[9px] font-medium px-1 rounded bg-blue-50 text-blue-600 shrink-0">{tableDocs.get(t.table_name)!.module}</span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      ~{t.row_estimate.toLocaleString()} rows · {t.total_size}
                    </div>
                    {tableDocs.get(t.table_name)?.description && (
                      <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{tableDocs.get(t.table_name)!.description}</div>
                    )}
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
                <span className={`text-[10px] px-2 py-0.5 rounded font-medium border ${PROTECTION_COLORS[protection.level]?.bg ?? ''} ${PROTECTION_COLORS[protection.level]?.text ?? ''} ${PROTECTION_COLORS[protection.level]?.border ?? ''}`}>
                  L{protection.level} {protection.label}
                </span>
                {pkCols.length === 0 && <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-600 rounded font-medium">No PK — read only</span>}
                {protection.level === 0 && <span className="text-[10px] px-2 py-0.5 bg-red-50 text-red-600 rounded font-medium">Read-only</span>}

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

                <div className="relative">
                  <button
                    onClick={() => setExportOpen(!exportOpen)}
                    disabled={exporting || rows.length === 0}
                    className="border rounded px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1"
                  >
                    {exporting ? 'Exporting...' : 'Export'}
                    <span className="text-[10px] text-gray-400">▼</span>
                  </button>
                  {exportOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-20 py-1 w-44">
                      {([
                        { fmt: 'csv' as const, label: 'CSV', desc: 'Comma-separated' },
                        { fmt: 'tsv' as const, label: 'TSV', desc: 'Tab-separated (Excel paste)' },
                        { fmt: 'json' as const, label: 'JSON', desc: 'Array of objects' },
                        { fmt: 'sql' as const, label: 'SQL', desc: 'INSERT statements' },
                      ]).map(({ fmt, label, desc }) => (
                        <button
                          key={fmt}
                          onClick={() => handleExport(fmt)}
                          className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <span className="text-sm font-medium w-10">{label}</span>
                          <span className="text-[10px] text-gray-400">{desc}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {canDelete && selectedRows.size > 0 && (
                  batchConfirm ? (
                    <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded px-2 py-1">
                      <span className="text-xs text-red-700">Delete {selectedRows.size} row{selectedRows.size > 1 ? 's' : ''}?</span>
                      <button onClick={handleBatchDelete} disabled={batchDeleting} className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded hover:bg-red-700 disabled:opacity-50">
                        {batchDeleting ? 'Deleting...' : 'Confirm'}
                      </button>
                      <button onClick={() => setBatchConfirm(false)} className="text-[10px] border border-red-200 px-2 py-0.5 rounded hover:bg-red-100">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setBatchConfirm(true)} className="border border-red-200 text-red-600 px-3 py-1 rounded text-sm hover:bg-red-50">
                      Delete ({selectedRows.size})
                    </button>
                  )
                )}
                {canWrite && (
                  <button
                    onClick={() => { setShowInsert(!showInsert); setInsertRow({}); }}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    + Insert
                  </button>
                )}
              </div>
              {protection.level <= 1 && (
                <div className={`text-sm rounded-lg px-3 py-2 border ${PROTECTION_COLORS[protection.level].bg} ${PROTECTION_COLORS[protection.level].text} ${PROTECTION_COLORS[protection.level].border}`}>
                  {protection.level === 0
                    ? 'This is a system-critical table. All write operations are blocked.'
                    : 'This is a configuration table. Edits may affect system behavior. Proceed with caution.'}
                </div>
              )}
              {tableDocs.get(selectedTable)?.description && (
                <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 flex items-start gap-2">
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

              {/* Insert form */}
              {showInsert && (
                <div className="border rounded-lg p-4 bg-blue-50 space-y-3">
                  <div className="text-sm font-medium">Insert new row</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {columns.map(col => {
                      const cm = colMeta.get(col);
                      const inputType = cm ? getInputType(cm.data_type) : 'text';
                      const hasDefault = cm?.column_default && cm.column_default !== '';
                      return (
                        <div key={col}>
                          <label className="text-[10px] text-gray-500 font-mono block mb-0.5">
                            {col}
                            <span className="text-[8px] text-gray-400 ml-1">{cm?.data_type ?? ''}</span>
                            {cm?.is_nullable === 'f' && <span className="text-red-400 ml-0.5">*</span>}
                          </label>
                          {inputType === 'boolean' ? (
                            <select
                              value={insertRow[col] ?? ''}
                              onChange={e => setInsertRow({ ...insertRow, [col]: e.target.value })}
                              className="w-full border rounded px-2 py-1 text-xs font-mono"
                            >
                              <option value="">{hasDefault ? '(default)' : 'NULL'}</option>
                              <option value="true">true</option>
                              <option value="false">false</option>
                            </select>
                          ) : inputType === 'json' ? (
                            <textarea
                              value={insertRow[col] ?? ''}
                              onChange={e => setInsertRow({ ...insertRow, [col]: e.target.value })}
                              className="w-full border rounded px-2 py-1 text-xs font-mono"
                              rows={2}
                              placeholder={hasDefault ? '(default)' : 'NULL'}
                            />
                          ) : (
                            <input
                              type={inputType === 'number' ? 'number' : inputType === 'date' ? 'date' : inputType === 'datetime' ? 'datetime-local' : 'text'}
                              value={insertRow[col] ?? ''}
                              onChange={e => setInsertRow({ ...insertRow, [col]: e.target.value })}
                              className="w-full border rounded px-2 py-1 text-xs font-mono"
                              step={inputType === 'number' ? 'any' : undefined}
                              placeholder={hasDefault ? `(default: ${cm.column_default.substring(0, 30)})` : 'NULL'}
                            />
                          )}
                        </div>
                      );
                    })}
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
                          {canDelete && (
                            <th className="p-2 w-10 text-center">
                              <input type="checkbox" checked={rows.length > 0 && selectedRows.size === rows.length} onChange={toggleAllRows} className="rounded" />
                            </th>
                          )}
                          {canWrite && <th className="p-2 w-16 text-center text-xs font-medium text-gray-400">Actions</th>}
                          {columns.map(col => {
                            const cm = colMeta.get(col);
                            return (
                              <th
                                key={col}
                                onClick={() => handleSort(col)}
                                className="text-left p-2 font-medium text-xs cursor-pointer hover:bg-gray-100 select-none"
                              >
                                <div className="flex items-center gap-1">
                                  <span className="font-mono">{col}</span>
                                  {pkCols.includes(col) && <span className="text-amber-500 text-[9px] font-bold">PK</span>}
                                  {cm?.is_unique === 't' && !pkCols.includes(col) && <span className="text-violet-400 text-[9px]">UQ</span>}
                                  {sortCol === col && <span>{sortDir === 'asc' ? '▲' : '▼'}</span>}
                                </div>
                                {cm && <span className="text-[9px] text-gray-400 font-normal">{cm.data_type}{cm.is_nullable === 't' ? '?' : ''}</span>}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length === 0 ? (
                          <tr><td colSpan={columns.length + (canWrite ? 1 : 0) + (canDelete ? 1 : 0)} className="p-6 text-center text-gray-400">No rows</td></tr>
                        ) : rows.map((row, ri) => (
                          <tr key={ri} className={`border-b hover:bg-gray-50 ${selectedRows.has(ri) ? 'bg-blue-50/50' : ''}`}>
                            {canDelete && (
                              <td className="p-1 text-center">
                                <input type="checkbox" checked={selectedRows.has(ri)} onChange={() => toggleRow(ri)} className="rounded" />
                              </td>
                            )}
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
                              const cm = colMeta.get(col);
                              const inputType = cm ? getInputType(cm.data_type) : 'text';
                              return (
                                <td
                                  key={col}
                                  className={`p-2 font-mono text-xs max-w-[300px] ${isPk ? 'bg-amber-50/50' : ''}`}
                                  onDoubleClick={() => !isPk && canWrite && startEdit(ri, col)}
                                >
                                  {isEditing ? (
                                    <div className="flex gap-1 items-start">
                                      {inputType === 'boolean' ? (
                                        <select
                                          value={editValue}
                                          onChange={e => setEditValue(e.target.value)}
                                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingCell(null); }}
                                          autoFocus
                                          className="border rounded px-1 py-0.5 text-xs"
                                        >
                                          <option value="true">true</option>
                                          <option value="false">false</option>
                                        </select>
                                      ) : inputType === 'json' ? (
                                        <textarea
                                          value={editValue}
                                          onChange={e => setEditValue(e.target.value)}
                                          onKeyDown={e => { if (e.key === 'Escape') setEditingCell(null); }}
                                          autoFocus
                                          rows={4}
                                          className="border rounded px-1 py-0.5 text-xs w-full min-w-[200px] font-mono"
                                        />
                                      ) : (
                                        <input
                                          type={inputType === 'number' ? 'number' : inputType === 'date' ? 'date' : inputType === 'datetime' ? 'datetime-local' : 'text'}
                                          value={editValue}
                                          onChange={e => setEditValue(e.target.value)}
                                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingCell(null); }}
                                          autoFocus
                                          step={inputType === 'number' ? 'any' : undefined}
                                          className="border rounded px-1 py-0.5 text-xs w-full min-w-[80px]"
                                        />
                                      )}
                                      <button onClick={saveEdit} disabled={saving} className="text-green-600 text-xs px-1 shrink-0">
                                        {saving ? '...' : '✓'}
                                      </button>
                                      <button onClick={() => setEditingCell(null)} className="text-gray-400 text-xs px-1 shrink-0">✕</button>
                                    </div>
                                  ) : (
                                    <span className={`truncate block ${row[col] === null ? 'text-gray-300 italic' : inputType === 'boolean' ? (row[col] ? 'text-green-600' : 'text-red-400') : 'text-gray-700'}`} title={formatCell(row[col])}>
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
