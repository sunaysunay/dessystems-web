'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';
import { useParams, useRouter } from 'next/navigation';
import type { Tenant, Contact, ApiClient } from '@/lib/support/types';

const STATUS_CHIP: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-amber-100 text-amber-700',
  offboarded: 'bg-slate-100 text-slate-400',
};

export default function SU004Page() {
  useScope();
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [apiClients, setApiClients] = useState<ApiClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'contacts' | 'api_keys'>('overview');
  const [toast, setToast] = useState('');

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 3000); }

  useEffect(() => {
    setLoading(true);
    fetch(`/api/bop/support/tenants/${slug}`)
      .then(r => r.json())
      .then(j => {
        setTenant(j.tenant ?? null);
        setContacts(j.contacts ?? []);
        setApiClients(j.api_clients ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  async function toggleTenantStatus() {
    if (!tenant) return;
    const newStatus = tenant.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch(`/api/bop/support/tenants/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) { const j = await res.json(); setTenant(j.tenant); showToast(`Tenant ${newStatus}`); }
      else showToast('Failed to update status');
    } catch { showToast('Network error'); }
  }

  if (loading) return <div className="p-6"><ScreenHeader title="Tenant Detail" description="SU004 — Tenant configuration" /><div className="text-center py-12 text-slate-400">Loading tenant...</div></div>;
  if (!tenant) return <div className="p-6"><ScreenHeader title="Tenant Detail" description="SU004 — Tenant configuration" /><div className="text-center py-12 text-red-400">Tenant not found</div></div>;

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <ScreenHeader title="Tenant Detail" description="SU004 — Tenant configuration" />

      {toast && <div className="fixed top-4 right-4 bg-slate-800 text-white px-4 py-2 rounded shadow-lg text-sm z-50">{toast}</div>}

      <button onClick={() => router.push('/console/sup/tenants')} className="text-sm text-teal-600 hover:underline mb-4 inline-block">&larr; Back to tenants</button>

      {/* Tenant header */}
      <div className="bg-white border rounded-lg p-5 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold">{tenant.name}</h2>
              <span className={`text-xs px-2 py-0.5 rounded ${STATUS_CHIP[tenant.status] || ''}`}>{tenant.status}</span>
              <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">{tenant.kind}</span>
            </div>
            <div className="flex gap-4 text-xs text-slate-500">
              <span>Slug: <strong>{tenant.slug}</strong></span>
              <span>Prefix: <strong>{tenant.case_prefix}</strong></span>
              <span>Locale: {tenant.locale}</span>
              <span>TZ: {tenant.timezone}</span>
            </div>
          </div>
          <button onClick={toggleTenantStatus} className={`px-3 py-1.5 rounded text-xs text-white ${tenant.status === 'active' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'}`}>
            {tenant.status === 'active' ? 'Suspend' : 'Activate'}
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          <span className="text-xs text-slate-500">Channels:</span>
          {tenant.channels_enabled.map(ch => (
            <span key={ch} className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded">{ch}</span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-4 border-b">
        {(['overview', 'contacts', 'api_keys'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`pb-2 text-sm font-medium border-b-2 ${tab === t ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-400'}`}>
            {t === 'api_keys' ? `API Keys (${apiClients.length})` : t === 'contacts' ? `Contacts (${contacts.length})` : 'Overview'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="bg-white border rounded-lg p-5">
          <h3 className="font-medium mb-3">Notify Config</h3>
          <pre className="text-xs bg-slate-50 p-3 rounded overflow-x-auto">{JSON.stringify(tenant.notify_config, null, 2)}</pre>
          {tenant.branding && (
            <>
              <h3 className="font-medium mt-4 mb-3">Branding</h3>
              <pre className="text-xs bg-slate-50 p-3 rounded overflow-x-auto">{JSON.stringify(tenant.branding, null, 2)}</pre>
            </>
          )}
        </div>
      )}

      {tab === 'contacts' && (
        <div className="space-y-2">
          {contacts.length === 0 ? (
            <div className="text-center py-8 text-slate-400">No contacts yet</div>
          ) : contacts.map(c => (
            <div key={c.id} className="border rounded-lg p-3 bg-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{c.name || c.email}</span>
                  <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{c.role}</span>
                  {!c.is_active && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">inactive</span>}
                </div>
                <span className="text-xs text-slate-500">{c.email}</span>
                {c.external_id && <span className="text-xs text-slate-400 ml-2">ext: {c.external_id}</span>}
              </div>
              <span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'api_keys' && (
        <div className="space-y-2">
          {apiClients.length === 0 ? (
            <div className="text-center py-8 text-slate-400">No API keys configured</div>
          ) : apiClients.map(a => (
            <div key={a.id} className="border rounded-lg p-3 bg-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{a.name}</span>
                  <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{a.key_prefix}...</span>
                  {!a.is_active && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">disabled</span>}
                </div>
                <div className="flex gap-2 mt-1">
                  {a.scopes.map(s => <span key={s} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{s}</span>)}
                </div>
              </div>
              <div className="text-right text-xs text-slate-400">
                <div>Rate: {a.rate_limit}/min</div>
                {a.last_used_at && <div>Last: {new Date(a.last_used_at).toLocaleDateString()}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
