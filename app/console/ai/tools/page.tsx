'use client';
import { useState } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

const TOOLS = [
  { id: 'execute_sql',       name: 'execute_sql',       server: 'supabase',    category: 'data',      desc: 'Run arbitrary SQL against the Supabase project database' },
  { id: 'list_tables',       name: 'list_tables',       server: 'supabase',    category: 'data',      desc: 'Enumerate all tables with column metadata' },
  { id: 'apply_migration',   name: 'apply_migration',   server: 'supabase',    category: 'data',      desc: 'Apply a SQL migration file to the database' },
  { id: 'read_file',         name: 'read_file',         server: 'filesystem',  category: 'files',     desc: 'Read file contents from the VPS filesystem' },
  { id: 'write_file',        name: 'write_file',        server: 'filesystem',  category: 'files',     desc: 'Create or overwrite a file on the VPS filesystem' },
  { id: 'list_directory',    name: 'list_directory',    server: 'filesystem',  category: 'files',     desc: 'List directory contents with metadata' },
  { id: 'search_files',      name: 'search_files',      server: 'filesystem',  category: 'files',     desc: 'Recursive file search by name or pattern' },
  { id: 'web_fetch',         name: 'web_fetch',         server: 'browser',     category: 'web',       desc: 'Fetch and parse a URL, returning text content' },
  { id: 'web_search',        name: 'web_search',        server: 'browser',     category: 'web',       desc: 'Search the web for real-time information' },
  { id: 'create_entities',   name: 'create_entities',   server: 'memory',      category: 'memory',    desc: 'Store entities and relations in the knowledge graph' },
  { id: 'search_nodes',      name: 'search_nodes',      server: 'memory',      category: 'memory',    desc: 'Search the persistent knowledge graph for matching nodes' },
  { id: 'open_nodes',        name: 'open_nodes',        server: 'memory',      category: 'memory',    desc: 'Retrieve node details and connected relations by ID' },
  { id: 'bash',              name: 'bash',              server: 'claude-code',  category: 'execution', desc: 'Execute shell commands on the local system' },
  { id: 'computer_use',      name: 'computer_use',      server: 'claude-code',  category: 'execution', desc: 'Control desktop UI via screenshots and clicks' },
];

const CAT_COLOR: Record<string, string> = {
  data:      'bg-blue-100 text-blue-700',
  files:     'bg-amber-100 text-amber-700',
  web:       'bg-teal-100 text-teal-700',
  memory:    'bg-violet-100 text-violet-700',
  execution: 'bg-red-100 text-red-600',
};

const SERVER_COLOR: Record<string, string> = {
  supabase:    'bg-emerald-100 text-emerald-700',
  filesystem:  'bg-slate-100 text-slate-600',
  browser:     'bg-blue-100 text-blue-700',
  memory:      'bg-violet-100 text-violet-700',
  'claude-code': 'bg-orange-100 text-orange-700',
};

export default function AI002Page() {
  const [catFilter, setCatFilter] = useState('');
  const [search, setSearch]       = useState('');

  const categories = [...new Set(TOOLS.map(t => t.category))];
  const filtered = TOOLS.filter(t => {
    const q = search.toLowerCase();
    return (!catFilter || t.category === catFilter) &&
           (!q || t.name.includes(q) || t.desc.toLowerCase().includes(q) || t.server.includes(q));
  });

  return (
    <div>
      <ScreenHeader title="Tool Registry" description="AI002 — All MCP tools available to Claude agents, grouped by server and category" />

      <div className="mb-5 grid grid-cols-5 gap-3">
        {categories.map(cat => (
          <div key={cat} onClick={() => setCatFilter(catFilter === cat ? '' : cat)}
            className="rounded-xl border border-slate-200 bg-white p-3 cursor-pointer hover:border-slate-300">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{cat}</p>
            <p className="mt-0.5 text-xl font-bold text-slate-800">{TOOLS.filter(t => t.category === cat).length}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search tools..."
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm w-56 focus:outline-none focus:border-blue-400" />
        <div className="flex gap-1">
          <button onClick={() => setCatFilter('')}
            className={'rounded-lg px-3 py-1.5 text-xs font-medium ' + (!catFilter ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-500')}>
            All
          </button>
          {categories.map(c => (
            <button key={c} onClick={() => setCatFilter(c === catFilter ? '' : c)}
              className={'rounded-lg px-3 py-1.5 text-xs font-medium capitalize ' + (catFilter === c ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-500')}>
              {c}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-slate-400">{filtered.length} tools</span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[10px] font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3 text-left">Tool</th>
              <th className="px-5 py-3 text-left">Server</th>
              <th className="px-5 py-3 text-left">Category</th>
              <th className="px-5 py-3 text-left">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(t => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-mono text-sm font-semibold text-slate-800">{t.name}</td>
                <td className="px-5 py-3">
                  <span className={'rounded-full px-2 py-0.5 text-[10px] font-semibold ' + (SERVER_COLOR[t.server] ?? 'bg-slate-100 text-slate-500')}>{t.server}</span>
                </td>
                <td className="px-5 py-3">
                  <span className={'rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ' + (CAT_COLOR[t.category] ?? 'bg-slate-100 text-slate-500')}>{t.category}</span>
                </td>
                <td className="px-5 py-3 text-xs text-slate-500">{t.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
