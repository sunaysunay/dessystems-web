'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import Link from 'next/link';

const MODULES = [
  { icon: 'M3 11v2a1 1 0 001 1h2l4 4V6L6 10H4a1 1 0 00-1 1zM14 8a4 4 0 010 8M18 5a8 8 0 010 14', title: 'Campaign Manager', desc: 'Plan, launch and manage marketing campaigns across channels', href: '/console/grw/campaigns', id: 'GR001' },
  { icon: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z', title: 'Content Studio', desc: 'AI-powered content generation for listings, social, email and ads', href: '/console/grw/content', id: 'GR002' },
  { icon: 'M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM18 22a3 3 0 100-6 3 3 0 000 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4', title: 'Channel Manager', desc: 'Configure publication channels — social, marketplace, email, blog', href: '/console/grw/channels', id: 'GR003' },
  { icon: 'M5 15c-1 2-1 4-1 4s2 0 4-1M9 15l-4-4c3-6 8-8 13-8 0 5-2 10-8 13l-4-4M14 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z', title: 'Playbooks', desc: 'Automation rules: triggers, conditions, steps and KPI targets', href: '/console/grw/playbooks', id: 'GR004' },
  { icon: 'M4 20V10M10 20V4M16 20v-8M3 20h18', title: 'Performance', desc: 'Campaign analytics, channel ROI and growth KPIs', href: '/console/grw/performance', id: 'GR005' },
];

function Icon({ d }: { d: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

interface Totals {
  campaigns: number;
  outputs: number;
  channels_active: number;
  clients: number;
}

export default function GrowthDashboardPage() {
  const [totals, setTotals] = useState<Totals | null>(null);
  const [mcpStatus, setMcpStatus] = useState<string>('checking');

  useEffect(() => {
    fetch('/api/bop/grw/stats?range=30')
      .then(r => r.json())
      .then(d => setTotals(d.totals))
      .catch(() => {});
    fetch('/api/bop/grw/mcp')
      .then(r => r.json())
      .then(d => setMcpStatus(d.status))
      .catch(() => setMcpStatus('error'));
  }, []);

  const stats = [
    { label: 'Active Campaigns', value: totals?.campaigns ?? '—' },
    { label: 'Content Outputs', value: totals?.outputs ?? '—' },
    { label: 'Channels Active', value: totals?.channels_active ?? '—' },
    { label: 'Clients', value: totals?.clients ?? '—' },
  ];

  return (
    <div className="space-y-8">
      <ScreenHeader />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map(s => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs text-muted uppercase tracking-wider">{s.label}</div>
            <div className="mt-1 text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4 flex items-center gap-2">
          <Icon d="M5 15c-1 2-1 4-1 4s2 0 4-1M9 15l-4-4c3-6 8-8 13-8 0 5-2 10-8 13l-4-4M14 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
          Growth Engine Modules
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map(m => (
            <Link
              key={m.id}
              href={m.href}
              className="group rounded-lg border border-border bg-card p-5 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-indigo-500/10 p-2 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                  <Icon d={m.icon} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{m.title}</span>
                    <span className="text-[10px] font-mono text-muted">{m.id}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted leading-relaxed">{m.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          MCP Agent Runtime
          <span className={`inline-block w-2 h-2 rounded-full ${mcpStatus === 'connected' ? 'bg-green-500' : mcpStatus === 'checking' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-xs text-muted font-normal">{mcpStatus}</span>
        </h3>
        <div className="text-xs text-muted space-y-1">
          <p>The Growth Engine MCP server runs on desworkstation (mini PC) and provides 7 AI tools for content generation, campaign management, and channel publishing.</p>
          <p>All tools are available in Claude Desktop on the mini PC for direct AI-driven marketing operations.</p>
        </div>
      </div>
    </div>
  );
}
