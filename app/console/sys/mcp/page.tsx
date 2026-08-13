'use client';
import { useState } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

const MCP_SERVERS = [
  {
    id: 'supabase',
    name: 'Supabase MCP',
    transport: 'stdio',
    command: 'npx @supabase/mcp-server-supabase',
    tools: ['execute_sql', 'list_tables', 'apply_migration', 'list_projects'],
    status: 'active',
    description: 'Direct Supabase project access for schema and data operations',
  },
  {
    id: 'filesystem',
    name: 'Filesystem MCP',
    transport: 'stdio',
    command: 'npx @modelcontextprotocol/server-filesystem',
    tools: ['read_file', 'write_file', 'list_directory', 'search_files'],
    status: 'active',
    description: 'Local file system read/write access for code edits',
  },
  {
    id: 'github',
    name: 'GitHub MCP',
    transport: 'stdio',
    command: 'npx @modelcontextprotocol/server-github',
    tools: ['search_code', 'get_file_contents', 'create_issue', 'list_prs'],
    status: 'configured',
    description: 'GitHub repository access for code review and issue tracking',
  },
  {
    id: 'google-drive',
    name: 'Google Drive MCP',
    transport: 'stdio',
    command: 'npx @modelcontextprotocol/server-gdrive',
    tools: ['list_files', 'read_file', 'search_files'],
    status: 'configured',
    description: 'Google Drive integration for document and asset access',
  },
  {
    id: 'memory',
    name: 'Memory MCP',
    transport: 'stdio',
    command: 'npx @modelcontextprotocol/server-memory',
    tools: ['create_entities', 'search_nodes', 'open_nodes'],
    status: 'active',
    description: 'Persistent knowledge graph for cross-session context retention',
  },
];

const STATUS_STYLE: Record<string, string> = {
  active:     'bg-emerald-100 text-emerald-700',
  configured: 'bg-amber-100 text-amber-700',
  inactive:   'bg-slate-100 text-slate-400',
};

export default function SY009Page() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const servers = MCP_SERVERS.filter(s => {
    const q = search.toLowerCase();
    const matchQ = !q || s.name.toLowerCase().includes(q) || s.id.includes(q);
    const matchS = !statusFilter || s.status === statusFilter;
    return matchQ && matchS;
  });

  const countByStatus = (st: string) => MCP_SERVERS.filter(s => s.status === st).length;
  const totalTools = MCP_SERVERS.reduce((a, s) => a + s.tools.length, 0);

  return (
    <div>
      <ScreenHeader title="MCP Servers" description="SY009 — Model Context Protocol server registry and tool inventory" />

      <div className="mb-5 grid grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Servers</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{MCP_SERVERS.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Active</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{countByStatus('active')}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Configured</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{countByStatus('configured')}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Tools</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{totalTools}</p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search servers..."
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm w-64 focus:outline-none focus:border-blue-400" />
        <div className="flex gap-1">
          {['', 'active', 'configured', 'inactive'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={'rounded-lg px-3 py-1.5 text-xs font-medium capitalize ' + (statusFilter === s ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-500')}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {servers.map(s => (
          <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-800">{s.name}</h3>
                  <span className={'rounded-full px-2 py-0.5 text-[10px] font-semibold ' + STATUS_STYLE[s.status]}>{s.status}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">{s.description}</p>
              </div>
              <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-500">{s.transport}</span>
            </div>
            <div className="mt-3 font-mono text-[11px] text-slate-400 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">{s.command}</div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {s.tools.map(t => (
                <span key={t} className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-[10px] text-slate-600">{t}</span>
              ))}
            </div>
          </div>
        ))}
        {servers.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-400">No servers match your filter</div>
        )}
      </div>
    </div>
  );
}
