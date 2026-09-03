'use client';
import { useState, useEffect, Fragment } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

interface DdlEntry {
  id?: string | number;
  executed_at: string;
  sql_text: string;
  pg_role_used?: string;
  user_email?: string;
  was_committed: boolean;
  execution_ms?: number | null;
  error?: string | null;
}

interface MigrationEntry {
  id?: string | number;
  filename: string;
  applied_at: string | null;
  status?: string;
  applied_by?: string;
  sql_text?: string | null;
}

interface SchemaInfo {
  schema_name: string;
  table_count: number;
  is_system: boolean;
}

type Tab = 'ddl' | 'files' | 'drift';

function StatusBadge({ ok, label }: { ok: boolean | null; label: string }) {
  const color = ok === null
    ? 'bg-slate-50 text-slate-500 border-slate-200'
    : ok
      ? 'bg-green-50 text-green-700 border-green-200'
      : 'bg-red-50 text-red-700 border-red-200';
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium border rounded-full ${color}`}>
      {label}
    </span>
  );
}

function fmtDate(s?: string | null): string {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
}

function truncate(s: string, n: number): string {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function TabButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
        active ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
      {typeof count === 'number' && (
        <span className={`ml-2 inline-block px-1.5 py-0.5 text-xs rounded-full ${
          active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

export default function DB008Page() {
  const [tab, setTab] = useState<Tab>('ddl');

  // DDL history tab
  const [ddl, setDdl] = useState<DdlEntry[]>([]);
  const [ddlTotal, setDdlTotal] = useState(0);
  const [ddlPage, setDdlPage] = useState(1);
  const [ddlPages, setDdlPages] = useState(0);
  const [ddlLoading, setDdlLoading] = useState(true);
  const [ddlError, setDdlError] = useState<string | null>(null);
  const [expandedDdl, setExpandedDdl] = useState<Set<number>>(new Set());
  const ddlLimit = 50;

  // Migration files tab
  const [migrations, setMigrations] = useState<MigrationEntry[]>([]);
  const [migrationsTableExists, setMigrationsTableExists] = useState<boolean | null>(null);
  const [migrationsMessage, setMigrationsMessage] = useState<string | null>(null);
  const [recentDdl, setRecentDdl] = useState<DdlEntry[]>([]);
  const [migLoading, setMigLoading] = useState(true);
  const [migError, setMigError] = useState<string | null>(null);
  const [expandedMig, setExpandedMig] = useState<Set<number>>(new Set());

  // Schema drift tab
  const [schemas, setSchemas] = useState<SchemaInfo[]>([]);
  const [tableCount, setTableCount] = useState<number | null>(null);
  const [driftLoading, setDriftLoading] = useState(true);
  const [driftError, setDriftError] = useState<string | null>(null);

  function loadDdl(page: number) {
    setDdlLoading(true);
    setDdlError(null);
    fetch(`/api/bop/dba/sql?action=history&class=ddl&page=${page}&limit=${ddlLimit}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setDdlError(d.error); setDdl([]); }
        else {
          setDdl(d.history ?? []);
          setDdlTotal(d.total ?? 0);
          setDdlPages(d.pages ?? 0);
        }
        setDdlLoading(false);
      })
      .catch(e => { setDdlError(e.message); setDdlLoading(false); });
  }

  function loadMigrations() {
    setMigLoading(true);
    setMigError(null);
    fetch('/api/bop/dba/sql?action=migrations')
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          setMigError(d.error);
          setMigrations([]);
          setMigrationsTableExists(false);
        } else {
          setMigrations(d.migrations ?? []);
          setMigrationsTableExists(!!d.table_exists);
          setMigrationsMessage(d.message ?? null);
          setRecentDdl(d.recent_ddl ?? []);
        }
        setMigLoading(false);
      })
      .catch(e => { setMigError(e.message); setMigLoading(false); });
  }

  function loadDrift() {
    setDriftLoading(true);
    setDriftError(null);
    fetch('/api/bop/dba/schema?action=schemas')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setDriftError(d.error); }
        else {
          const list: SchemaInfo[] = (d.schemas ?? []).filter((s: SchemaInfo) => !s.is_system);
          setSchemas(list);
          setTableCount(list.reduce((sum, s) => sum + (s.table_count ?? 0), 0));
        }
        setDriftLoading(false);
      })
      .catch(e => { setDriftError(e.message); setDriftLoading(false); });
  }

  useEffect(() => { loadDdl(ddlPage); }, [ddlPage]);
  useEffect(() => { loadMigrations(); }, []);
  useEffect(() => { loadDrift(); }, []);

  function toggleDdlRow(i: number) {
    setExpandedDdl(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  function toggleMigRow(i: number) {
    setExpandedMig(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  const ddlCount = ddlTotal;
  const migCount = migrations.length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <ScreenHeader />

      <div>
        <h1 className="text-xl font-semibold">Migrations</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track DDL changes executed against the database and known migration files.
        </p>
      </div>

      <div className="border-b flex gap-1">
        <TabButton active={tab === 'ddl'} onClick={() => setTab('ddl')} label="DDL History" count={ddlCount} />
        <TabButton active={tab === 'files'} onClick={() => setTab('files')} label="Migration Files" count={migCount} />
        <TabButton active={tab === 'drift'} onClick={() => setTab('drift')} label="Schema Drift" />
      </div>

      {tab === 'ddl' && (
        <div className="border rounded-lg overflow-hidden">
          {ddlLoading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading DDL history…</div>
          ) : ddlError ? (
            <div className="p-8 text-center text-red-600 text-sm">{ddlError}</div>
          ) : ddl.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No DDL statements found in the query log.</div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-left text-gray-500">
                    <th className="px-4 py-2 font-medium w-40">Time</th>
                    <th className="px-4 py-2 font-medium">SQL</th>
                    <th className="px-4 py-2 font-medium w-36">Role</th>
                    <th className="px-4 py-2 font-medium w-24">Committed</th>
                    <th className="px-4 py-2 font-medium w-48">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {ddl.map((row, i) => {
                    const expanded = expandedDdl.has(i);
                    return (
                      <Fragment key={`ddl-${i}`}>
                        <tr
                          onClick={() => toggleDdlRow(i)}
                          className="border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"
                        >
                          <td className="px-4 py-2 align-top whitespace-nowrap text-gray-600">{fmtDate(row.executed_at)}</td>
                          <td className="px-4 py-2 align-top font-mono text-xs">{truncate(row.sql_text ?? '', 90)}</td>
                          <td className="px-4 py-2 align-top text-gray-600">{row.pg_role_used ?? '—'}</td>
                          <td className="px-4 py-2 align-top">
                            <StatusBadge ok={!!row.was_committed} label={row.was_committed ? 'Yes' : 'No'} />
                          </td>
                          <td className="px-4 py-2 align-top text-red-600 text-xs">{row.error ? truncate(row.error, 60) : '—'}</td>
                        </tr>
                        {expanded && (
                          <tr className="border-b last:border-b-0 bg-gray-50">
                            <td colSpan={5} className="px-4 py-3">
                              <pre className="font-mono text-xs whitespace-pre-wrap bg-white border rounded p-3 overflow-x-auto">
                                {row.sql_text}
                              </pre>
                              {row.error && (
                                <div className="mt-2 text-xs text-red-600 font-mono">{row.error}</div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
              {ddlPages > 1 && (
                <div className="flex items-center justify-between px-4 py-2 border-t bg-gray-50 text-sm">
                  <span className="text-gray-500">
                    Page {ddlPage} of {ddlPages} · {ddlTotal} DDL statements
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={ddlPage <= 1}
                      onClick={() => setDdlPage(p => Math.max(1, p - 1))}
                      className="px-3 py-1 border rounded disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <button
                      disabled={ddlPage >= ddlPages}
                      onClick={() => setDdlPage(p => Math.min(ddlPages, p + 1))}
                      className="px-3 py-1 border rounded disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'files' && (
        <div className="space-y-4">
          {migLoading ? (
            <div className="border rounded-lg p-8 text-center text-gray-400 text-sm">Loading migration files…</div>
          ) : migError ? (
            <div className="border rounded-lg p-8 text-center text-red-600 text-sm">{migError}</div>
          ) : migrationsTableExists && migrations.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-left text-gray-500">
                    <th className="px-4 py-2 font-medium">Filename</th>
                    <th className="px-4 py-2 font-medium w-40">Applied at</th>
                    <th className="px-4 py-2 font-medium w-28">Status</th>
                    <th className="px-4 py-2 font-medium w-40">Applied by</th>
                  </tr>
                </thead>
                <tbody>
                  {migrations.map((m, i) => {
                    const expanded = expandedMig.has(i);
                    const applied = (m.status ?? (m.applied_at ? 'applied' : 'pending')).toLowerCase();
                    const color = applied === 'applied'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : applied === 'pending'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-red-50 text-red-700 border-red-200';
                    return (
                      <Fragment key={`mig-${i}`}>
                        <tr
                          onClick={() => m.sql_text && toggleMigRow(i)}
                          className={`border-b last:border-b-0 hover:bg-gray-50 ${m.sql_text ? 'cursor-pointer' : ''}`}
                        >
                          <td className="px-4 py-2 align-top font-mono text-xs">{m.filename}</td>
                          <td className="px-4 py-2 align-top text-gray-600 whitespace-nowrap">{fmtDate(m.applied_at)}</td>
                          <td className="px-4 py-2 align-top">
                            <span className={`inline-block px-2 py-0.5 text-xs font-medium border rounded-full ${color}`}>
                              {applied}
                            </span>
                          </td>
                          <td className="px-4 py-2 align-top text-gray-600">{m.applied_by ?? '—'}</td>
                        </tr>
                        {expanded && m.sql_text && (
                          <tr className="border-b last:border-b-0 bg-gray-50">
                            <td colSpan={4} className="px-4 py-3">
                              <pre className="font-mono text-xs whitespace-pre-wrap bg-white border rounded p-3 overflow-x-auto">
                                {m.sql_text}
                              </pre>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border rounded-lg p-6 space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  {migrationsMessage ?? 'No migration tracking table found.'}
                </p>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>To enable migration tracking:</p>
                  <ol className="list-decimal list-inside space-y-0.5 ml-2">
                    <li>Create the <code className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">bop_migrations</code> table</li>
                    <li>Use the SQL Runner (DB004) to execute DDL</li>
                    <li>DDL executions are automatically logged in Query History (DB007)</li>
                  </ol>
                </div>
              </div>

              <div className="pt-2 border-t">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Recent DDL from query log</h3>
                {recentDdl.length === 0 ? (
                  <p className="text-sm text-gray-400">No recent DDL entries found.</p>
                ) : (
                  <div className="border rounded overflow-hidden">
                    {recentDdl.map((row, i) => (
                      <div key={i} className="px-3 py-2 border-b last:border-b-0 flex items-start justify-between gap-4 text-sm">
                        <div className="min-w-0">
                          <div className="font-mono text-xs truncate">{truncate(row.sql_text ?? '', 100)}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{fmtDate(row.executed_at)} · {row.pg_role_used ?? '—'}</div>
                        </div>
                        <StatusBadge ok={!!row.was_committed} label={row.was_committed ? 'Committed' : 'Rolled back'} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'drift' && (
        <div className="border rounded-lg p-6 space-y-4">
          {driftLoading ? (
            <div className="text-center text-gray-400 text-sm py-4">Loading schema summary…</div>
          ) : driftError ? (
            <div className="text-center text-red-600 text-sm py-4">{driftError}</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="text-xs text-gray-500">Schemas</div>
                  <div className="text-2xl font-semibold mt-1">{schemas.length}</div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-xs text-gray-500">Total tables</div>
                  <div className="text-2xl font-semibold mt-1">{tableCount ?? '—'}</div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-xs text-gray-500">Tables added since last check</div>
                  <div className="text-sm text-amber-700 mt-1">Drift detection not yet configured</div>
                </div>
              </div>

              <div className="pt-2 border-t flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  For a full breakdown of tables, columns and relationships, use the Schema Explorer.
                </p>
                <a
                  href="/console/dba/schema"
                  className="px-3 py-1.5 text-sm font-medium border rounded bg-white hover:bg-gray-50"
                >
                  Open DB002 Schema Explorer →
                </a>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
