'use client';
import { useState, useMemo, useCallback, type ReactNode } from 'react';

// ── Column definition ────────────────────────────────────────────────────────

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;                          // e.g. '120px', '20%'
  align?: 'left' | 'center' | 'right';
  pin?: 'left';                            // sticky first column(s)
  render?: (row: T, index: number) => ReactNode;
  value?: (row: T) => string | number | null;  // sortable/filterable raw value
}

// ── Status badge helper ──────────────────────────────────────────────────────

const STATUS_PALETTE: Record<string, string> = {
  active:     'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  open:       'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
  draft:      'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  planned:    'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
  in_progress:'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  blocked:    'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
  done:       'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  cancelled:  'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
  error:      'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
  warning:    'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  pending:    'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400',
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const cls = STATUS_PALETTE[status] ?? STATUS_PALETTE.draft;
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>
      {label ?? status.replace(/_/g, ' ')}
    </span>
  );
}

// ── Props ────────────────────────────────────────────────────────────────────

export interface DataGridProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;

  // Sorting
  defaultSort?: { key: string; dir: 'asc' | 'desc' };

  // Selection
  selectable?: boolean;
  selected?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;

  // Pagination
  pageSize?: number;

  // Row interaction
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string;

  // Toolbar extras rendered before the search box
  toolbar?: ReactNode;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function DataGrid<T>({
  columns, rows, rowKey, loading, emptyMessage,
  defaultSort, selectable, selected: controlledSelected, onSelectionChange,
  pageSize = 25, onRowClick, rowClassName, toolbar,
}: DataGridProps<T>) {

  // Sort state
  const [sortKey, setSortKey] = useState(defaultSort?.key ?? '');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSort?.dir ?? 'asc');

  // Search
  const [search, setSearch] = useState('');

  // Pagination
  const [page, setPage] = useState(0);

  // Selection (uncontrolled fallback)
  const [internalSelected, setInternalSelected] = useState<Set<string>>(new Set());
  const sel = controlledSelected ?? internalSelected;
  const setSel = onSelectionChange ?? setInternalSelected;

  const handleSort = useCallback((key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(0);
  }, [sortKey]);

  // Filter + sort + paginate
  const processed = useMemo(() => {
    let list = [...rows];

    // Text search across all value()s and rendered strings
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(row =>
        columns.some(col => {
          const v = col.value ? col.value(row) : (row as Record<string, unknown>)[col.key];
          return v != null && String(v).toLowerCase().includes(q);
        })
      );
    }

    // Sort
    if (sortKey) {
      const col = columns.find(c => c.key === sortKey);
      if (col) {
        list.sort((a, b) => {
          const va = col.value ? col.value(a) : (a as Record<string, unknown>)[col.key];
          const vb = col.value ? col.value(b) : (b as Record<string, unknown>)[col.key];
          if (va == null && vb == null) return 0;
          if (va == null) return 1;
          if (vb == null) return -1;
          const cmp = typeof va === 'number' && typeof vb === 'number'
            ? va - vb
            : String(va).localeCompare(String(vb));
          return sortDir === 'asc' ? cmp : -cmp;
        });
      }
    }

    return list;
  }, [rows, search, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(processed.length / pageSize));
  const pageRows = processed.slice(page * pageSize, (page + 1) * pageSize);

  // Selection helpers
  const allPageKeys = pageRows.map(rowKey);
  const allPageSelected = allPageKeys.length > 0 && allPageKeys.every(k => sel.has(k));

  const toggleAll = useCallback(() => {
    const next = new Set(sel);
    if (allPageSelected) {
      allPageKeys.forEach(k => next.delete(k));
    } else {
      allPageKeys.forEach(k => next.add(k));
    }
    setSel(next);
  }, [sel, setSel, allPageSelected, allPageKeys]);

  const toggleOne = useCallback((key: string) => {
    const next = new Set(sel);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSel(next);
  }, [sel, setSel]);

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {toolbar}
        {selectable && sel.size > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {sel.size} selected
          </span>
        )}
        <div className="ml-auto relative">
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="w-52 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60">
              {selectable && (
                <th className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleAll}
                    className="rounded border-slate-300 dark:border-slate-600"
                  />
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`px-4 py-2.5 text-left ${col.pin === 'left' ? 'sticky left-0 bg-slate-50 dark:bg-slate-800/60 z-10' : ''}`}
                  style={{ width: col.width }}
                >
                  {col.sortable ? (
                    <button
                      onClick={() => handleSort(col.key)}
                      className={`flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-widest transition hover:text-slate-700 dark:hover:text-slate-200 ${
                        sortKey === col.key ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {col.header}
                      {sortKey === col.key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      {col.header}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-12 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-12 text-center text-slate-400">
                  {emptyMessage ?? 'No data'}
                </td>
              </tr>
            ) : pageRows.map((row, i) => {
              const key = rowKey(row);
              return (
                <tr
                  key={key}
                  onClick={() => onRowClick?.(row)}
                  className={`transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40' : ''
                  } ${selectable && sel.has(key) ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''} ${rowClassName?.(row) ?? ''}`}
                >
                  {selectable && (
                    <td className="w-10 px-3 py-2.5" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={sel.has(key)}
                        onChange={() => toggleOne(key)}
                        className="rounded border-slate-300 dark:border-slate-600"
                      />
                    </td>
                  )}
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={`px-4 py-2.5 ${
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''
                      } ${col.pin === 'left' ? 'sticky left-0 bg-white dark:bg-slate-900 z-10' : ''}`}
                    >
                      {col.render
                        ? col.render(row, page * pageSize + i)
                        : String((row as Record<string, unknown>)[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {processed.length > pageSize && (
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, processed.length)} of {processed.length}
            {processed.length !== rows.length && ` (filtered from ${rows.length})`}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
            >
              ← Prev
            </button>
            <span className="px-2 py-1">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
