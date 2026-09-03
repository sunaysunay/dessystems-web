'use client';
import React, { useState, useEffect, useRef } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

interface Classification {
  statement_class: string;
  read_only: boolean;
  destructive: boolean;
  requires_confirmation: boolean;
  warning?: string;
}

interface ExecResult {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  execution_ms: number;
  message?: string;
}

interface HistoryEntry {
  id: string | number;
  sql: string;
  statement_class: string;
  created_at: string;
  execution_ms?: number;
}

const CLASS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  SELECT: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  INSERT: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  UPDATE: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  DELETE: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  DDL: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  UNKNOWN: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
};

function classColor(cls: string) {
  return CLASS_COLORS[cls?.toUpperCase()] ?? CLASS_COLORS.UNKNOWN;
}

function formatCell(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function lineNumbers(sql: string): string {
  const n = sql.split('\n').length || 1;
  return Array.from({ length: n }, (_, i) => String(i + 1)).join('\n');
}

export default function DB004Page() {
  const [sql, setSql] = useState('');
  const [classification, setClassification] = useState<Classification | null>(null);
  const [classifying, setClassifying] = useState(false);
  const [results, setResults] = useState<ExecResult | null>(null);
  const [dryRunResult, setDryRunResult] = useState<any>(null);
  const [executing, setExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState<'results' | 'plan' | 'messages'>('results');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDryRun, setPendingDryRun] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const classifyTimer = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (classifyTimer.current) clearTimeout(classifyTimer.current);
    if (!sql.trim()) {
      setClassification(null);
      return;
    }
    classifyTimer.current = setTimeout(() => {
      classify(sql);
    }, 500);
    return () => { if (classifyTimer.current) clearTimeout(classifyTimer.current); };
  }, [sql]);

  function classify(text: string) {
    setClassifying(true);
    fetch(`/api/bop/dba/sql?action=classify&sql=${encodeURIComponent(text)}`)
      .then(r => r.json())
      .then(d => {
        setClassification(d.classification ?? d ?? null);
        setClassifying(false);
      })
      .catch(() => setClassifying(false));
  }

  function loadHistory() {
    fetch('/api/bop/dba/sql?action=history')
      .then(r => r.json())
      .then(d => setHistory(d.history ?? []))
      .catch(() => {});
  }

  function runExecute(dryRun: boolean) {
    if (!sql.trim()) return;
    setError(null);
    setMessage(null);
    setExecuting(true);
    fetch('/api/bop/dba/sql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'execute', sql, dry_run: dryRun }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          setError(d.error);
          setActiveTab('messages');
        } else if (dryRun) {
          setDryRunResult(d.plan ?? d);
          setActiveTab('plan');
          setMessage(d.message ?? 'Dry run completed — no changes made.');
        } else {
          setResults({
            columns: d.columns ?? [],
            rows: d.rows ?? [],
            rowCount: d.rowCount ?? (d.rows ? d.rows.length : 0),
            execution_ms: d.execution_ms ?? 0,
            message: d.message,
          });
          setSortCol(null);
          setActiveTab(d.columns && d.columns.length > 0 ? 'results' : 'messages');
          if (d.message) setMessage(d.message);
          loadHistory();
        }
        setExecuting(false);
      })
      .catch(e => {
        setError(e.message);
        setActiveTab('messages');
        setExecuting(false);
      });
  }

  function handleRunClick(dryRun: boolean) {
    if (classification?.requires_confirmation) {
      setPendingDryRun(dryRun);
      setConfirmOpen(true);
      return;
    }
    runExecute(dryRun);
  }

  function confirmExecute() {
    setConfirmOpen(false);
    runExecute(pendingDryRun);
  }

  function handleClassifyClick() {
    if (!sql.trim()) return;
    classify(sql);
    setActiveTab('messages');
  }

  function handleClear() {
    setSql('');
    setClassification(null);
    setResults(null);
    setDryRunResult(null);
    setError(null);
    setMessage(null);
    setActiveTab('results');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRunClick(false);
    }
    syncScroll();
  }

  function syncScroll() {
    if (textareaRef.current && lineNumRef.current) {
      lineNumRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }

  function loadFromHistory(entry: HistoryEntry) {
    setSql(entry.sql_text);
  }

  function handleSort(col: string) {
    if (!results) return;
    const newDir = sortCol === col && sortDir === 'asc' ? 'desc' : 'asc';
    setSortCol(col);
    setSortDir(newDir);
    const sorted = [...results.rows].sort((a, b) => {
      const av = a[col], bv = b[col];
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      return (av > bv ? 1 : -1) * (newDir === 'asc' ? 1 : -1);
    });
    setResults({ ...results, rows: sorted });
  }

  const cls = classification?.statement_class ?? '';
  const clsColor = classColor(cls);
  const displayRows = results?.rows.slice(0, 1000) ?? [];

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      <ScreenHeader />

      <div className="flex gap-4" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {/* Main column */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* SQL Editor */}
          <div className="border rounded-lg overflow-hidden">
            <div className="flex bg-gray-900">
              <div
                ref={lineNumRef}
                className="select-none text-right text-gray-600 font-mono text-sm py-3 px-2 overflow-hidden whitespace-pre"
                style={{ minWidth: '2.5rem', lineHeight: '1.5rem' }}
              >
                {lineNumbers(sql)}
              </div>
              <textarea
                ref={textareaRef}
                value={sql}
                onChange={e => setSql(e.target.value)}
                onKeyDown={handleKeyDown}
                onScroll={syncScroll}
                placeholder="SELECT * FROM bop_screens LIMIT 10;"
                rows={12}
                spellCheck={false}
                className="flex-1 bg-gray-900 text-green-400 font-mono text-sm py-3 px-2 outline-none resize-y"
                style={{ lineHeight: '1.5rem' }}
              />
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleRunClick(false)}
              disabled={executing || !sql.trim()}
              className="bg-green-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-40"
            >
              {executing ? 'Running...' : 'Run'}
            </button>
            <button
              onClick={() => handleRunClick(true)}
              disabled={executing || !sql.trim()}
              className="bg-amber-500 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-amber-600 disabled:opacity-40"
            >
              Dry Run
            </button>
            <button
              onClick={handleClassifyClick}
              disabled={classifying || !sql.trim()}
              className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-50 disabled:opacity-40"
            >
              {classifying ? 'Classifying...' : 'Classify'}
            </button>
            <button
              onClick={handleClear}
              className="border border-gray-300 text-gray-500 px-3 py-1.5 rounded text-sm hover:bg-gray-50"
            >
              Clear
            </button>

            <div className="w-px h-5 bg-gray-200 mx-1" />

            {classification && (
              <span className={`text-xs px-2 py-1 rounded font-medium border ${clsColor.bg} ${clsColor.text} ${clsColor.border}`}>
                {cls || 'UNKNOWN'}
                {classification.read_only ? ' · read-only' : ''}
                {classification.destructive ? ' · destructive' : ''}
              </span>
            )}

            <div className="flex-1" />

            {results && (
              <span className="text-xs text-gray-500">
                Executed in {results.execution_ms}ms
              </span>
            )}
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded text-sm hover:bg-gray-50"
            >
              History {historyOpen ? '▶' : '◀'}
            </button>
          </div>

          {classification?.destructive && classification?.warning && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              {classification.warning}
            </div>
          )}

          {confirmOpen && classification && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 space-y-2">
              <div className="text-sm font-medium text-amber-800">
                This will execute a {cls} statement. Are you sure?
              </div>
              {classification.warning && (
                <div className="text-xs text-amber-700">{classification.warning}</div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={confirmExecute}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="border rounded px-3 py-1 text-sm hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Results panel */}
          <div className="border rounded-lg overflow-hidden">
            <div className="flex border-b bg-gray-50">
              {(['results', 'plan', 'messages'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium capitalize border-b-2 ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-700 bg-white'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab}
                  {tab === 'results' && results && (
                    <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600">
                      {results.rowCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="max-h-[calc(100vh-520px)] min-h-[200px] overflow-auto">
              {activeTab === 'results' && (
                results && results.columns.length > 0 ? (
                  <table className="w-full text-sm border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="bg-gray-50 border-b sticky top-0">
                        {results.columns.map(col => (
                          <th
                            key={col}
                            onClick={() => handleSort(col)}
                            className="text-left p-2 font-medium text-xs cursor-pointer hover:bg-gray-100 select-none font-mono"
                          >
                            <div className="flex items-center gap-1">
                              {col}
                              {sortCol === col && <span>{sortDir === 'asc' ? '▲' : '▼'}</span>}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayRows.map((row, ri) => (
                        <tr key={ri} className="border-b hover:bg-gray-50">
                          {results.columns.map(col => (
                            <td key={col} className="p-2 font-mono text-xs max-w-[300px] truncate">
                              <span className={row[col] === null ? 'text-gray-300 italic' : 'text-gray-700'} title={formatCell(row[col])}>
                                {formatCell(row[col])}
                              </span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center text-gray-400 text-sm">
                    {executing ? 'Running query...' : 'No results yet. Write a query and click Run.'}
                  </div>
                )
              )}

              {activeTab === 'plan' && (
                dryRunResult ? (
                  <pre className="p-3 text-xs font-mono whitespace-pre-wrap bg-gray-50">
                    {typeof dryRunResult === 'string' ? dryRunResult : JSON.stringify(dryRunResult, null, 2)}
                  </pre>
                ) : (
                  <div className="p-8 text-center text-gray-400 text-sm">No plan available. Run a Dry Run to see the EXPLAIN output.</div>
                )
              )}

              {activeTab === 'messages' && (
                <div className="p-4 space-y-2">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm font-mono whitespace-pre-wrap">
                      {error}
                    </div>
                  )}
                  {message && !error && (
                    <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">
                      {message}
                    </div>
                  )}
                  {results && (
                    <div className="text-sm text-gray-600">
                      {results.rowCount} row{results.rowCount !== 1 ? 's' : ''} affected · {results.execution_ms}ms
                    </div>
                  )}
                  {classification && (
                    <div className="text-xs text-gray-500 font-mono">
                      class={classification.statement_class} read_only={String(classification.read_only)} destructive={String(classification.destructive)}
                    </div>
                  )}
                  {!error && !message && !results && (
                    <div className="text-sm text-gray-400">No messages yet.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* History sidebar */}
        {historyOpen && (
          <div className="w-72 shrink-0 space-y-2">
            <div className="text-xs font-medium text-gray-500 px-1">Recent Queries</div>
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[calc(100vh-260px)] overflow-y-auto">
                {history.length === 0 ? (
                  <div className="p-3 text-sm text-gray-400">No history yet</div>
                ) : (
                  history.slice(0, 20).map(entry => {
                    const c = classColor(entry.statement_class);
                    return (
                      <button
                        key={entry.id}
                        onClick={() => loadFromHistory(entry)}
                        className="w-full text-left px-3 py-2 text-sm border-b last:border-b-0 hover:bg-gray-50"
                      >
                        <div className="font-mono text-xs truncate text-gray-700">
                          {entry.sql_text.slice(0, 60)}{entry.sql_text.length > 60 ? '...' : ''}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium border ${c.bg} ${c.text} ${c.border}`}>
                            {entry.statement_class}
                          </span>
                          <span className="text-[10px] text-gray-400">{new Date(entry.executed_at).toLocaleTimeString()}</span>
                          {entry.execution_ms !== undefined && (
                            <span className="text-[10px] text-gray-400">{entry.execution_ms}ms</span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
