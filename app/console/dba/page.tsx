'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

interface DbOverview {
  db_name: string;
  db_size: string;
  total_tables: number;
  total_views: number;
  total_functions: number;
  total_indexes: number;
  active_connections: number;
  max_connections: number;
  uptime: string;
  pg_version: string;
}

interface SchemaInfo {
  schema_name: string;
  table_count: number;
  view_count: number;
  function_count: number;
  is_system: boolean;
}

const SCREENS = [
  { id: 'DB002', title: 'Schema Explorer', href: '/console/dba/schema', desc: 'Browse schemas, tables, columns, indexes, and RLS policies' },
  { id: 'DB003', title: 'Table Data', href: '/console/dba/data', desc: 'View and edit table data with inline CRUD' },
  { id: 'DB004', title: 'SQL Runner', href: '/console/dba/sql', desc: 'Execute SQL with AST classification and dry-run safety' },
  { id: 'DB005', title: 'Functions & RPC', href: '/console/dba/functions', desc: 'Browse and test Postgres functions and procedures' },
  { id: 'DB006', title: 'Database Actions', href: '/console/dba/actions', desc: 'Vacuum, reindex, and maintenance operations' },
  { id: 'DB007', title: 'Query History', href: '/console/dba/history', desc: 'Audit trail of all executed queries' },
  { id: 'DB008', title: 'Migrations', href: '/console/dba/migrations', desc: 'Track and apply schema migrations' },
];

export default function DatabaseOverviewPage() {
  const [overview, setOverview] = useState<DbOverview | null>(null);
  const [schemas, setSchemas] = useState<SchemaInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/bop/dba/overview');
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();
        setOverview(data.overview);
        setSchemas(data.schemas ?? []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const userSchemas = schemas.filter(s => !s.is_system);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <ScreenHeader />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-gray-500">Loading database overview...</div>
      ) : overview ? (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Database Size" value={overview.db_size} />
            <StatCard label="Tables" value={String(overview.total_tables)} />
            <StatCard label="Views" value={String(overview.total_views)} />
            <StatCard label="Functions" value={String(overview.total_functions)} />
            <StatCard label="Indexes" value={String(overview.total_indexes)} />
            <StatCard label="Connections" value={`${overview.active_connections} / ${overview.max_connections}`} />
            <StatCard label="Uptime" value={formatUptime(overview.uptime)} />
            <StatCard label="PostgreSQL" value={extractPgVersion(overview.pg_version)} />
          </div>

          {/* Schemas overview */}
          {userSchemas.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Schemas</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left p-2 font-medium">Schema</th>
                      <th className="text-right p-2 font-medium">Tables</th>
                      <th className="text-right p-2 font-medium">Views</th>
                      <th className="text-right p-2 font-medium">Functions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userSchemas.map(s => (
                      <tr key={s.schema_name} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-mono text-sm">{s.schema_name}</td>
                        <td className="p-2 text-right">{s.table_count}</td>
                        <td className="p-2 text-right">{s.view_count}</td>
                        <td className="p-2 text-right">{s.function_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* Module screens */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Database Console Screens</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SCREENS.map(s => (
            <a
              key={s.id}
              href={s.href}
              className="block p-4 border rounded-lg hover:border-stone-400 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">{s.id}</span>
                <span className="font-medium">{s.title}</span>
              </div>
              <p className="text-sm text-gray-500">{s.desc}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function formatUptime(uptime: string): string {
  const match = uptime.match(/(\d+)\s*days?\s+(\d+):(\d+)/);
  if (match) return `${match[1]}d ${match[2]}h`;
  const hoursMatch = uptime.match(/(\d+):(\d+)/);
  if (hoursMatch) return `${hoursMatch[1]}h ${hoursMatch[2]}m`;
  return uptime;
}

function extractPgVersion(full: string): string {
  const match = full.match(/PostgreSQL\s+([\d.]+)/);
  return match ? match[1] : full.slice(0, 20);
}
