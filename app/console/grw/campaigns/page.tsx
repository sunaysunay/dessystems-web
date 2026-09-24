'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import Link from 'next/link';

interface Campaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  source_type: string;
  listing_id: string | null;
  channels: string[];
  languages: string[];
  tenant_id: number;
  created_at: string;
  created_by: string | null;
  error_message: string | null;
}

const STATUS_BADGE: Record<string, string> = {
  generating: 'bg-blue-100 text-blue-700',
  review: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  published: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  draft: 'bg-slate-100 text-slate-600',
};

const TENANTS: Record<number, string> = {
  199: 'DES Holding', 200: 'DES Campers', 300: 'DES Mobil', 400: 'DESShop', 500: 'DES Systems',
};

export default function CampaignManagerPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [tenantFilter, setTenantFilter] = useState(0);

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (tenantFilter) params.set('tenant_id', String(tenantFilter));
    if (filter !== 'all') params.set('status', filter);
    fetch(`/api/bop/mkt/campaigns?${params}`)
      .then(r => r.json())
      .then(d => { setCampaigns(d.campaigns || []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, [filter, tenantFilter]);

  async function deleteCampaign(id: string) {
    if (!confirm('Delete this campaign?')) return;
    const r = await fetch(`/api/bop/mkt/campaigns?id=${id}`, { method: 'DELETE' });
    if (r.ok) setCampaigns(cs => cs.filter(c => c.id !== id));
  }

  const counts = campaigns.reduce((a, c) => {
    a[c.status] = (a[c.status] || 0) + 1;
    return a;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <ScreenHeader />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {['all', 'draft', 'review', 'approved', 'published'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-lg border p-3 text-left transition-colors ${
              filter === s ? 'border-indigo-500 bg-indigo-500/10' : 'border-border bg-card hover:border-border'
            }`}
          >
            <div className="text-xs text-muted uppercase tracking-wider">{s === 'all' ? 'Total' : s}</div>
            <div className="mt-1 text-xl font-bold">
              {s === 'all' ? campaigns.length : counts[s] || 0}
            </div>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <select
            value={tenantFilter}
            onChange={e => setTenantFilter(Number(e.target.value))}
            className="rounded border border-border bg-card px-3 py-1.5 text-sm"
          >
            <option value={0}>All tenants</option>
            {Object.entries(TENANTS).map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>
        <Link
          href="/console/mkt/campaigns"
          className="rounded bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          + New Campaign
        </Link>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-sm text-muted py-8 text-center">Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <div className="text-sm text-muted">No campaigns found</div>
          <Link href="/console/mkt/campaigns" className="mt-2 inline-block text-sm text-indigo-500 hover:underline">
            Create your first campaign
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted uppercase tracking-wider">Campaign</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted uppercase tracking-wider">Tenant</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted uppercase tracking-wider">Objective</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted uppercase tracking-wider">Channels</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted uppercase tracking-wider">Status</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted uppercase tracking-wider">Created</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {campaigns.map(c => (
                <tr key={c.id} className="hover:bg-card/50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted">{c.source_type === 'listing' ? `Listing: ${c.listing_id?.slice(0, 8)}…` : 'Manual'}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">{TENANTS[c.tenant_id] || c.tenant_id}</td>
                  <td className="px-4 py-3 text-xs capitalize">{(c.objective || '—').replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(c.channels || []).map(ch => (
                        <span key={ch} className="rounded bg-card px-1.5 py-0.5 text-[10px] border border-border">{ch}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[c.status] || 'bg-slate-100 text-slate-600'}`}>
                      {c.status}
                    </span>
                    {c.error_message && (
                      <div className="mt-1 text-[10px] text-red-500 truncate max-w-[160px]" title={c.error_message}>{c.error_message}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                    {new Date(c.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => deleteCampaign(c.id)}
                        className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
