'use client';
import { useState, useEffect, useCallback } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { BopSelect } from '@/components/BopSelect';

const TABS = ['Overview','Configuration','Status','Features','Domains & DNS','Email Brand','Email Log','Mail Identities','Template Map','Base Layouts','Infrastructure','Env Variables','Hero Images','Site Features','Source Prefixes'] as const;
type Tab = typeof TABS[number];
const LANGS = ['nl','en','de','fr','tr'], CURR = ['EUR','USD','GBP','TRY'], TZ = ['Europe/Amsterdam','Europe/Berlin','Europe/Istanbul','UTC'];
const STATUSES = ['operational','degraded','partial_outage','major_outage','maintenance'], SEV = ['info','warning','critical','emergency'];
const lbl = 'mb-1 block text-xs font-semibold text-slate-500';
const inp = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

// Defined at module scope — stable references prevent React from unmounting/remounting
// inputs on every render (which caused focus loss after every keystroke).
const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">{children}</div>
);

function F({ k, label, type = 'text', cfg, set }: { k: string; label: string; type?: string; cfg: any; set: (k: string, v: any) => void }) {
  return <div><label className={lbl}>{label}</label><input className={inp} type={type} value={cfg?.[k] ?? ''} onChange={e => set(k, e.target.value)} /></div>;
}

function BF({ k, label, type = 'text', brand, setBrand }: { k: string; label: string; type?: string; brand: any; setBrand: (fn: (prev: any) => any) => void }) {
  return <div><label className={lbl}>{label}</label><input className={inp} type={type} value={brand?.[k] ?? ''} onChange={e => setBrand((p: any) => ({ ...p, [k]: e.target.value }))} /></div>;
}

function Toggle({ k, label, cfg, set }: { k: string; label: string; cfg: any; set: (k: string, v: any) => void }) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
      <span className="text-slate-600">{label}</span>
      <input type="checkbox" checked={!!cfg?.[k]} onChange={e => set(k, e.target.checked)} className="h-4 w-4 accent-blue-600" />
    </label>
  );
}

function SaveBar({ onSave, saving }: { onSave: () => void; saving: boolean }) {
  return (
    <div className="mt-5 flex justify-end">
      <button onClick={onSave} disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}

export default function SY003Page() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [tid, setTid] = useState<number | null>(null);
  const [cfg, setCfg] = useState<any>(null);
  const [status, setStatus] = useState<any[]>([]);
  const [brand, setBrand] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('Overview');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [ext, setExt] = useState<any>({});
  const [newStatus, setNewStatus] = useState<any>({ status: 'operational', severity: 'info', title: '', message: '' });
  const [newMap, setNewMap] = useState<any>({ email_type: '', label: '', category: 'system', base_layout_key: 'default', active: true, sort: 100 });
  const [mailIds, setMailIds] = useState<any[]>([]);
  const [newMailId, setNewMailId] = useState<any>({ code: '', from_name: '', from_email: '', reply_to: '', cc_email: '', bcc_email: '', is_active: true });

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }
  const set = useCallback((k: string, v: any) => setCfg((p: any) => ({ ...p, [k]: v })), []);

  useEffect(() => {
    void fetch('/api/bop/sys/tenant-config').then(r => r.json()).then(j => {
      const list = j.tenants ?? [];
      setTenants(list);
      if (!list.length) return;

      // Priority: 1) ?tenant= URL param  2) bop_unit_id cookie  3) first in list
      const urlId = typeof window !== 'undefined'
        ? Number(new URLSearchParams(window.location.search).get('tenant') ?? '') || null
        : null;
      const cookieId = typeof document !== 'undefined'
        ? Number(document.cookie.match(/(?:^|; )bop_unit_id=([^;]*)/)?.[1] ?? '') || null
        : null;

      const preferred = urlId ?? cookieId ?? null;
      const match = preferred ? list.find((t: any) => t.tenant_id === preferred) : null;
      setTid(match ? match.tenant_id : list[0].tenant_id);
    });
  }, []);

  const loadTenant = useCallback(() => {
    if (tid === null) return;
    void fetch(`/api/bop/sys/tenant-config/${tid}`).then(r => r.json()).then(j => { setCfg(j.tenant ?? { tenant_id: tid }); setStatus(j.status ?? []); });
  }, [tid]);

  useEffect(() => { loadTenant(); }, [loadTenant]);

  function loadExt(resource: string) { void fetch(`/api/bop/sys/email-admin?resource=${resource}&tenant=${tid}`).then(r => r.json()).then(j => setExt((e: any) => ({ ...e, [resource]: j.rows ?? [] }))); }
  useEffect(() => {
    if (tid === null) return;
    if (tab === 'Email Log') loadExt('log');
    if (tab === 'Template Map') loadExt('map');
    if (tab === 'Base Layouts') loadExt('layouts');
    if (tab === 'Email Brand') void fetch(`/api/bop/sys/email-admin?resource=brand&tenant=${tid}`).then(r => r.json()).then(j => setBrand(j.row ?? { tenant_id: tid }));
    if (tab === 'Mail Identities') void loadMailIds();
    /* eslint-disable-next-line */
  }, [tab, tid]);

  async function saveCfg() { setSaving(true); const j = await fetch(`/api/bop/sys/tenant-config/${tid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg) }).then(r => r.json()); setSaving(false); showToast(j.error ? '✗ ' + j.error : '✓ Saved'); }
  async function saveExt(resource: string, row: any) { const j = await fetch(`/api/bop/sys/email-admin?resource=${resource}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row) }).then(r => r.json()); showToast(j.error ? '✗ ' + j.error : '✓ Saved'); }
  async function saveBrand() { const j = await fetch('/api/bop/sys/email-admin?resource=brand', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...brand, tenant_id: tid }) }).then(r => r.json()); showToast(j.error ? '✗ ' + j.error : '✓ Brand saved'); }
  async function addStatus() { const j = await fetch('/api/bop/sys/tenant-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newStatus, tenant_id: tid }) }).then(r => r.json()); if (j.error) { showToast('✗ ' + j.error); return; } setNewStatus({ status: 'operational', severity: 'info', title: '', message: '' }); loadTenant(); showToast('✓ Status added'); }
  async function resolveStatus(id: number, val: boolean) { await fetch('/api/bop/sys/tenant-status', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_resolved: val }) }); loadTenant(); }
  async function addMap() { if (!newMap.email_type) { showToast('email_type required'); return; } await saveExt('map', newMap); setNewMap({ email_type: '', label: '', category: 'system', base_layout_key: 'default', active: true, sort: 100 }); loadExt('map'); }

  function loadMailIds() { void fetch(`/api/bop/comm/mail-identities?tenant_id=${tid}`).then(r => r.json()).then(j => setMailIds(j.identities ?? j.rows ?? j.data ?? [])); }
  async function saveMailId(row: any) { const j = await fetch('/api/bop/comm/mail-identities', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row) }).then(r => r.json()); showToast(j.error ? '✗ ' + j.error : '✓ Saved'); loadMailIds(); }
  async function addMailId() { if (!newMailId.code) { showToast('Code is required'); return; } const j = await fetch('/api/bop/comm/mail-identities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newMailId, tenant_id: tid }) }).then(r => r.json()); if (j.error) { showToast('✗ ' + j.error); return; } setNewMailId({ code: '', from_name: '', from_email: '', reply_to: '', cc_email: '', bcc_email: '', is_active: true }); loadMailIds(); showToast('✓ Identity added'); }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <ScreenHeader title="Tenant Management" description="Per-tenant configuration, status, email & infrastructure — SY003" />
        <div className="w-56"><BopSelect value={tid !== null ? String(tid) : ''} onChange={v => setTid(Number(v))} options={tenants.map(t => ({ value: String(t.tenant_id), label: `${t.name ?? t.tenant_id} (${t.tenant_id})` }))} /></div>
      </div>

      <div className="flex gap-4">
        <div className="w-52 flex-shrink-0 space-y-0.5 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
          {TABS.map(t => <button key={t} onClick={() => setTab(t)} className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${tab === t ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>{t}</button>)}
        </div>

        <div className="flex-1">
          {tenants.length === 0 ? <Card><p className="text-sm text-slate-400">No tenant config rows. Run <code>sql/bop_v2/15_bop_tenants.sql</code>.</p></Card> : !cfg ? <Card>Loading…</Card> : <>
            {tab === 'Overview' && <Card>
              <div className="grid grid-cols-3 gap-4">{[['Tenants', tenants.length], ['Active', tenants.filter(t => t.active).length], ['Initialized', tenants.filter(t => t.initialized_at).length]].map(([k, v]) => (<div key={k} className="rounded-xl bg-slate-50 p-4"><div className="text-2xl font-bold text-slate-800">{v}</div><div className="text-xs text-slate-400">{k}</div></div>))}</div>
              <div className="mt-4 text-sm text-slate-500">Selected: <b>{cfg.name}</b> · {cfg.domain ?? 'no domain'} · {cfg.active ? 'active' : 'inactive'}</div>
            </Card>}

            {tab === 'Configuration' && <Card><div className="grid grid-cols-2 gap-4">
              <F k="name" label="Name" cfg={cfg} set={set} /><F k="domain" label="Domain" cfg={cfg} set={set} /><F k="brand_color" label="Brand color" cfg={cfg} set={set} /><F k="brand_color2" label="Brand color 2" cfg={cfg} set={set} /><F k="logo_url" label="Logo URL" cfg={cfg} set={set} /><F k="business_type" label="Business type" cfg={cfg} set={set} />
              <div><label className={lbl}>Language</label><BopSelect size="md" value={cfg.default_language ?? 'nl'} onChange={(v) => { void set('default_language', v); }} options={LANGS.map(l => ({ value: l, label: l }))} /></div>
              <div><label className={lbl}>Timezone</label><BopSelect size="md" value={cfg.timezone ?? 'Europe/Amsterdam'} onChange={(v) => { void set('timezone', v); }} options={TZ.map(l => ({ value: l, label: l }))} /></div>
              <div><label className={lbl}>Currency</label><BopSelect size="md" value={cfg.currency ?? 'EUR'} onChange={(v) => { void set('currency', v); }} options={CURR.map(l => ({ value: l, label: l }))} /></div>
              <F k="country" label="Country" cfg={cfg} set={set} /><Toggle k="active" label="Active" cfg={cfg} set={set} />
            </div><SaveBar onSave={() => { void saveCfg(); }} saving={saving} /></Card>}

            {tab === 'Status' && <Card>
              <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="mb-2 text-xs font-bold uppercase text-slate-400">New status entry</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={lbl}>Status</label><BopSelect size="md" value={newStatus.status} onChange={v => setNewStatus((s: any) => ({ ...s, status: v }))} options={STATUSES.map(x => ({ value: x, label: x }))} /></div>
                  <div><label className={lbl}>Severity</label><BopSelect size="md" value={newStatus.severity} onChange={v => setNewStatus((s: any) => ({ ...s, severity: v }))} options={SEV.map(x => ({ value: x, label: x }))} /></div>
                  <div className="col-span-2"><label className={lbl}>Title</label><input className={inp} value={newStatus.title} onChange={e => setNewStatus((s: any) => ({ ...s, title: e.target.value }))} /></div>
                  <div className="col-span-2"><label className={lbl}>Message</label><input className={inp} value={newStatus.message} onChange={e => setNewStatus((s: any) => ({ ...s, message: e.target.value }))} /></div>
                </div>
                <div className="mt-3 flex justify-end"><button onClick={() => { void addStatus(); }} className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">Add status</button></div>
              </div>
              {status.length === 0 ? <p className="text-sm text-slate-400">No status entries.</p> :
                <table className="w-full text-sm"><thead className="text-left text-xs text-slate-400"><tr><th className="py-2">Status</th><th>Severity</th><th>Title</th><th>Resolved</th><th></th></tr></thead>
                  <tbody className="divide-y divide-slate-100">{status.map(s => <tr key={s.id}><td className="py-2 capitalize">{s.status}</td><td className="capitalize">{s.severity}</td><td>{s.title ?? '—'}</td><td>{s.is_resolved ? 'yes' : 'no'}</td>
                    <td className="text-right"><button onClick={() => { void resolveStatus(s.id, !s.is_resolved); }} className="text-xs text-blue-600 hover:underline">{s.is_resolved ? 'Reopen' : 'Resolve'}</button></td></tr>)}</tbody></table>}
            </Card>}

            {tab === 'Features' && <Card><div className="grid grid-cols-2 gap-3"><Toggle k="analytics_enabled" label="Analytics enabled" cfg={cfg} set={set} /><Toggle k="ai_enabled" label="AI enabled" cfg={cfg} set={set} /></div>
              <div className="mt-4"><label className={lbl}>Feature flags (JSON)</label><textarea className={`${inp} h-28 font-mono text-xs`} value={JSON.stringify(cfg.feature_flags ?? {}, null, 2)} onChange={e => { try { set('feature_flags', JSON.parse(e.target.value)); } catch {} }} /></div><SaveBar onSave={() => { void saveCfg(); }} saving={saving} /></Card>}

            {tab === 'Domains & DNS' && <Card><div className="grid grid-cols-2 gap-4"><F k="domain" label="Domain (prod)" cfg={cfg} set={set} /><F k="dev_domain" label="Dev domain (blank = no public dev site)" cfg={cfg} set={set} /><F k="dns_provider" label="DNS provider" cfg={cfg} set={set} /><F k="dns_provider_user" label="DNS user" cfg={cfg} set={set} /><F k="dns_provider_password" label="DNS password" type="password" cfg={cfg} set={set} /></div><p className="mt-2 text-xs text-slate-400">Drives MP001's "Preview"/"Copy public link" — resolved per environment (NEXT_PUBLIC_BOP_ENV) automatically.</p><SaveBar onSave={() => { void saveCfg(); }} saving={saving} /></Card>}

            {tab === 'Infrastructure' && <Card><div className="grid grid-cols-2 gap-4"><F k="google_account_email" label="Google account" cfg={cfg} set={set} /><F k="gtm_container_id" label="GTM container" cfg={cfg} set={set} /><F k="ga4_property_id" label="GA4 property" cfg={cfg} set={set} /><F k="google_maps_api_key" label="Maps API key" type="password" cfg={cfg} set={set} /><F k="google_oauth_client_id" label="OAuth client ID" cfg={cfg} set={set} /><F k="google_oauth_client_secret" label="OAuth secret" type="password" cfg={cfg} set={set} /></div><SaveBar onSave={() => { void saveCfg(); }} saving={saving} /></Card>}

            {tab === 'Env Variables' && <Card><div className="grid grid-cols-2 gap-4"><F k="lead_email" label="Lead email" cfg={cfg} set={set} /><F k="email_from_name" label="Email from name" cfg={cfg} set={set} /><F k="email_from_address" label="Email from address" cfg={cfg} set={set} /><F k="smtp_provider" label="SMTP provider" cfg={cfg} set={set} /><F k="smtp_username" label="SMTP username" cfg={cfg} set={set} /><F k="smtp_api_key" label="SMTP API key" type="password" cfg={cfg} set={set} /></div><SaveBar onSave={() => { void saveCfg(); }} saving={saving} /></Card>}

            {tab === 'Hero Images' && tid !== null && <Card><HeroImagesPanel tid={tid} /></Card>}

            {tab === 'Site Features' && tid !== null && <SiteFeaturesSummary tid={tid} />}

            {tab === 'Email Brand' && <Card>{!brand ? 'Loading…' : <><div className="grid grid-cols-2 gap-4">
              <BF k="company_name" label="Company name" brand={brand} setBrand={setBrand} /><BF k="company_tagline" label="Tagline" brand={brand} setBrand={setBrand} />
              <BF k="primary_color" label="Primary color" brand={brand} setBrand={setBrand} /><BF k="logo_url" label="Logo URL" brand={brand} setBrand={setBrand} />
              <BF k="header_bg_from" label="Header gradient from" brand={brand} setBrand={setBrand} /><BF k="header_bg_to" label="Header gradient to" brand={brand} setBrand={setBrand} />
              <BF k="website_url" label="Website URL" brand={brand} setBrand={setBrand} /><BF k="phone" label="Phone" brand={brand} setBrand={setBrand} />
              <BF k="email_support" label="Support email" brand={brand} setBrand={setBrand} /><BF k="business_hours" label="Business hours" brand={brand} setBrand={setBrand} />
              <BF k="address_line1" label="Address line 1" brand={brand} setBrand={setBrand} /><BF k="address_country" label="Country" brand={brand} setBrand={setBrand} />
              <BF k="instagram_url" label="Instagram" brand={brand} setBrand={setBrand} /><BF k="facebook_url" label="Facebook" brand={brand} setBrand={setBrand} />
            </div>
              <div className="mt-5 flex justify-end gap-2">
                <a href={`/api/bop/sys/email/preview?type=password_reset&tenant=${tid}&locale=${cfg.default_language ?? 'en'}`} target="_blank" className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Preview</a>
                <button onClick={() => { void saveBrand(); }} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700">Save brand</button>
              </div></>}</Card>}

            {tab === 'Email Log' && <Card>{(ext.log ?? []).length === 0 ? <p className="text-sm text-slate-400">No emails logged.</p> :
              <table className="w-full text-sm"><thead className="text-left text-xs text-slate-400"><tr><th className="py-2">Type</th><th>To</th><th>Subject</th><th>Status</th><th>When</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{(ext.log ?? []).map((r: any) => <tr key={r.id}><td className="py-2">{r.email_type}</td><td>{r.to_email}</td><td className="max-w-xs truncate">{r.subject}</td><td><span className={`rounded px-1.5 py-0.5 text-xs ${r.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : r.status === 'failed' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>{r.status}</span></td><td className="text-xs text-slate-400">{new Date(r.sent_at).toLocaleString()}</td></tr>)}</tbody></table>}</Card>}

            {tab === 'Mail Identities' && <Card>
              <div className="mb-4 flex items-center justify-between">
                <div><h3 className="font-semibold text-slate-800">Mail Identities</h3><p className="text-xs text-slate-400 mt-0.5">Per-code sender identities for tenant {tid}</p></div>
              </div>
              {mailIds.length === 0 ? <p className="mb-4 text-sm text-slate-400">No mail identities configured.</p> :
                <table className="w-full text-sm"><thead className="text-left text-xs text-slate-400"><tr><th className="py-2">Code</th><th>From Name</th><th>From Email</th><th>Reply-To</th><th>CC</th><th>BCC</th><th>Active</th><th></th></tr></thead>
                  <tbody className="divide-y divide-slate-100">{mailIds.map((r: any, i: number) => {
                    const upd = (k: string, v: any) => { const rows = [...mailIds]; rows[i] = { ...r, [k]: v }; setMailIds(rows); };
                    return <tr key={r.id}>
                      <td className="py-1.5 font-mono text-xs">{r.code}</td>
                      <td><input className="w-full rounded border border-slate-200 px-2 py-1 text-xs" value={r.from_name ?? ''} onChange={e => upd('from_name', e.target.value)} /></td>
                      <td><input className="w-full rounded border border-slate-200 px-2 py-1 text-xs" value={r.from_email ?? ''} onChange={e => upd('from_email', e.target.value)} /></td>
                      <td><input className="w-full rounded border border-slate-200 px-2 py-1 text-xs" value={r.reply_to ?? ''} onChange={e => upd('reply_to', e.target.value)} /></td>
                      <td><input className="w-24 rounded border border-slate-200 px-2 py-1 text-xs" value={r.cc_email ?? ''} onChange={e => upd('cc_email', e.target.value)} /></td>
                      <td><input className="w-24 rounded border border-slate-200 px-2 py-1 text-xs" value={r.bcc_email ?? ''} onChange={e => upd('bcc_email', e.target.value)} /></td>
                      <td><input type="checkbox" checked={!!r.is_active} onChange={e => upd('is_active', e.target.checked)} className="h-4 w-4 accent-blue-600" /></td>
                      <td className="text-right"><button onClick={() => { void saveMailId(r); }} className="text-xs font-medium text-blue-600 hover:underline">Save</button></td>
                    </tr>;
                  })}</tbody></table>}
              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="mb-2 text-xs font-bold uppercase text-slate-400">Add identity</p>
                <div className="flex flex-wrap items-end gap-2">
                  <div><label className="block text-[10px] text-slate-400 mb-0.5">Code</label><BopSelect size="md" value={newMailId.code} onChange={v => setNewMailId((m: any) => ({ ...m, code: v }))} options={['LEADS','ORDERS','INVOICES','QUOTES','INFO','APPOINTMENTS'].map(c => ({ value: c, label: c }))} /></div>
                  <div><label className="block text-[10px] text-slate-400 mb-0.5">From Name</label><input className="w-36 rounded border border-slate-200 px-2 py-1 text-xs" placeholder="From name" value={newMailId.from_name} onChange={e => setNewMailId((m: any) => ({ ...m, from_name: e.target.value }))} /></div>
                  <div><label className="block text-[10px] text-slate-400 mb-0.5">From Email</label><input className="w-44 rounded border border-slate-200 px-2 py-1 text-xs" placeholder="from@example.com" value={newMailId.from_email} onChange={e => setNewMailId((m: any) => ({ ...m, from_email: e.target.value }))} /></div>
                  <div><label className="block text-[10px] text-slate-400 mb-0.5">Reply-To</label><input className="w-44 rounded border border-slate-200 px-2 py-1 text-xs" placeholder="reply@example.com" value={newMailId.reply_to} onChange={e => setNewMailId((m: any) => ({ ...m, reply_to: e.target.value }))} /></div>
                  <button onClick={() => { void addMailId(); }} className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700">Add</button>
                </div>
              </div>
            </Card>}

            {tab === 'Template Map' && <Card>
              <table className="w-full text-sm"><thead className="text-left text-xs text-slate-400"><tr><th className="py-2">Type</th><th>Label</th><th>Category</th><th>Layout</th><th>Active</th><th></th></tr></thead>
                <tbody className="divide-y divide-slate-100">{(ext.map ?? []).map((r: any, i: number) => {
                  const upd = (k: string, v: any) => { const rows = [...(ext.map ?? [])]; rows[i] = { ...r, [k]: v }; setExt((x: any) => ({ ...x, map: rows })); };
                  return <tr key={r.email_type}>
                    <td className="py-1.5 font-mono text-xs">{r.email_type}</td>
                    <td><input className="w-full rounded border border-slate-200 px-2 py-1 text-xs" value={r.label ?? ''} onChange={e => upd('label', e.target.value)} /></td>
                    <td><input className="w-24 rounded border border-slate-200 px-2 py-1 text-xs" value={r.category ?? ''} onChange={e => upd('category', e.target.value)} /></td>
                    <td><input className="w-24 rounded border border-slate-200 px-2 py-1 text-xs font-mono" value={r.base_layout_key ?? ''} onChange={e => upd('base_layout_key', e.target.value)} /></td>
                    <td><input type="checkbox" checked={!!r.active} onChange={e => upd('active', e.target.checked)} className="h-4 w-4 accent-blue-600" /></td>
                    <td className="text-right"><button onClick={() => { void saveExt('map', r); }} className="text-xs font-medium text-blue-600 hover:underline">Save</button>
                      <a href={`/api/bop/sys/email/preview?type=${r.email_type}&tenant=${tid}&locale=${cfg.default_language ?? 'en'}`} target="_blank" className="ml-2 text-xs text-slate-400 hover:underline">Preview</a></td></tr>;
                })}</tbody></table>
              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="mb-2 text-xs font-bold uppercase text-slate-400">Add type</p>
                <div className="flex flex-wrap items-end gap-2">
                  <input className="w-40 rounded border border-slate-200 px-2 py-1 text-xs font-mono" placeholder="email_type" value={newMap.email_type} onChange={e => setNewMap((m: any) => ({ ...m, email_type: e.target.value }))} />
                  <input className="w-40 rounded border border-slate-200 px-2 py-1 text-xs" placeholder="Label" value={newMap.label} onChange={e => setNewMap((m: any) => ({ ...m, label: e.target.value }))} />
                  <input className="w-28 rounded border border-slate-200 px-2 py-1 text-xs" placeholder="category" value={newMap.category} onChange={e => setNewMap((m: any) => ({ ...m, category: e.target.value }))} />
                  <button onClick={() => { void addMap(); }} className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700">Add</button>
                </div>
              </div>
            </Card>}

            {tab === 'Base Layouts' && <Card>{(ext.layouts ?? []).map((r: any, i: number) => (
              <div key={r.key} className="mb-4"><div className="mb-1 flex items-center justify-between"><span className="text-sm font-semibold text-slate-700">{r.name} <span className="font-mono text-xs text-slate-400">({r.key})</span></span>
                <button onClick={() => { void saveExt('layouts', r); }} className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700">Save</button></div>
                <textarea className={`${inp} h-40 font-mono text-[11px]`} value={r.html} onChange={e => { const rows = [...(ext.layouts ?? [])]; rows[i] = { ...r, html: e.target.value }; setExt((x: any) => ({ ...x, layouts: rows })); }} /></div>))}</Card>}

            {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
            {/* @ts-ignore – SourcePrefixesPanel defined below */}
            {tab === 'Source Prefixes' && tid !== null && <SourcePrefixesPanel tid={tid} />}
          </>}
        </div>
      </div>
      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}

// ── Hero Images Panel ────────────────────────────────────────────────────────
function HeroImagesPanel({ tid }: { tid: number | null }) {
  if (tid === null) return null

  const VEHICLE_TYPES = ['Camper','Van','Caravan','4x4','SUV','Truck','Motorhome','Trailer']
  const TRANSITION_EFFECTS = ['none','ken-burns','fade','zoom-in','zoom-out','pan-left','dessite-snap']
  const FOCAL_POINTS = ['none','center','top','bottom','center left','center right','top left','top right','bottom center']

  type HeroImg = {
    id: string; tenant_id: number; pic_name: string; vehicle_type: string
    waiting_duration_ms: number; transition_effect: string; transition_duration_ms: number
    is_active: boolean; overlay_opacity: number; focal_point: string; alt_text: string
  }

  const [images, setImages] = useState<HeroImg[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadSize, setUploadSize] = useState<number | null>(null)
  const [currentFileSize, setCurrentFileSize] = useState<number | null>(null)
  const [uploadQuality, setUploadQuality] = useState<'high' | 'balanced' | 'low'>('balanced')

  const empty = { pic_name: '', vehicle_type: 'Camper', waiting_duration_ms: 5000,
    transition_effect: 'ken-burns', transition_duration_ms: 2500,
    is_active: true, overlay_opacity: 0.6, focal_point: 'center', alt_text: '' }
  const [form, setForm] = useState(empty)

  useEffect(() => {
    if (!form.pic_name || !form.pic_name.startsWith('/hero/')) {
      setCurrentFileSize(null)
      return
    }
    fetch(`/api/bop/hero-images/size?file=${form.pic_name}`)
      .then(r => r.json())
      .then(j => {
        if (j.size) setCurrentFileSize(j.size)
        else setCurrentFileSize(null)
      })
      .catch(() => setCurrentFileSize(null))
  }, [form.pic_name])

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/bop/hero-images?tenant_id=${tid}`)
    const json = await res.json()
    setImages(json.data || [])
    setLoading(false)
  }, [tid])

  useEffect(() => { void load() }, [load])

  const save = async () => {
    setSaving(true)
    if (editId) {
      await fetch(`/api/bop/hero-images/${editId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    } else {
      await fetch('/api/bop/hero-images', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, tenant_id: tid }) })
    }
    setSaving(false); setShowForm(false); setEditId(null); setForm(empty); setUploadSize(null); void load()
  }

  const toggle = async (img: HeroImg) => {
    await fetch(`/api/bop/hero-images/${img.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !img.is_active }) })
    void load()
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this hero image?')) return
    await fetch(`/api/bop/hero-images/${id}`, { method: 'DELETE' })
    void load()
  }

  const openEdit = (img: HeroImg) => {
    setForm({ pic_name: img.pic_name, vehicle_type: img.vehicle_type,
      waiting_duration_ms: img.waiting_duration_ms, transition_effect: img.transition_effect,
      transition_duration_ms: img.transition_duration_ms, is_active: img.is_active,
      overlay_opacity: img.overlay_opacity, focal_point: img.focal_point, alt_text: img.alt_text })
    setEditId(img.id); setShowForm(true); setUploadSize(null)
  }

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('quality', uploadQuality)
    try {
      const res = await fetch('/api/bop/hero-images/upload', { method: 'POST', body: formData })
      const json = await res.json()
      if (json.path) {
        setForm(f => ({ ...f, pic_name: json.path }))
        if (json.size) setUploadSize(json.size)
      }
    } catch (e) {
      console.error(e)
    }
    setUploading(false)
  }

  const onDragOver = (e: any) => { e.preventDefault(); setIsDragging(true); }
  const onDragLeave = (e: any) => { e.preventDefault(); setIsDragging(false); }
  const onDrop = (e: any) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void handleFileUpload(e.dataTransfer.files[0])
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">Hero Images</h3>
          <p className="text-xs text-slate-400 mt-0.5">Dynamic slideshow images for tenant {tid}</p>
        </div>
        <button onClick={() => { setForm(empty); setEditId(null); setShowForm(true); setUploadSize(null) }}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
          + Add Image
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 relative">
          <h4 className="font-medium text-sm text-slate-700">{editId ? 'Edit' : 'New'} Hero Image</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <div className="flex justify-between items-end">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Image Path / URL</label>
                {currentFileSize && (
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    File Size: {(currentFileSize / 1024).toFixed(1)} KB
                  </span>
                )}
              </div>
              <input value={form.pic_name} onChange={e => setForm(f => ({ ...f, pic_name: e.target.value }))}
                placeholder="/hero/hero1.jpg or https://..."
                className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="col-span-2">
               <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Upload Quality (Affects File Size)</label>
               <div className="mt-1.5 flex gap-4 mb-3">
                 <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
                   <input type="radio" name="quality" checked={uploadQuality === 'high'} onChange={() => setUploadQuality('high')} className="text-blue-600 focus:ring-blue-500" />
                   High Quality
                 </label>
                 <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
                   <input type="radio" name="quality" checked={uploadQuality === 'balanced'} onChange={() => setUploadQuality('balanced')} className="text-blue-600 focus:ring-blue-500" />
                   Balanced
                 </label>
                 <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
                   <input type="radio" name="quality" checked={uploadQuality === 'low'} onChange={() => setUploadQuality('low')} className="text-blue-600 focus:ring-blue-500" />
                   Max Compression
                 </label>
               </div>
            </div>
            <div className="col-span-2 grid grid-cols-2 gap-4">
               <div
                  onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                  className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white hover:bg-slate-50'} ${uploading ? 'opacity-50' : ''}`}
                  onClick={() => document.getElementById('hero-file-upload')?.click()}
               >
                  <input type="file" id="hero-file-upload" className="hidden" accept="image/*,video/mp4,video/webm" onChange={(e) => { if (e.target.files?.[0]) void handleFileUpload(e.target.files[0]) }} />
                  {uploading ? (
                     <span className="text-sm font-medium text-blue-600">Uploading...</span>
                  ) : (
                     <>
                        <div className="mb-2 p-2 bg-blue-100 text-blue-600 rounded-full">
                           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                        </div>
                        <span className="text-sm font-medium text-slate-600">Click or drag image to upload</span>
                        <span className="text-xs text-slate-400 mt-1">Saves directly to public/hero</span>
                        {uploadSize && (
                           <span className="text-xs text-emerald-600 font-medium mt-1 text-center bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                             Converted to {(uploadSize / 1024).toFixed(1)} KB
                           </span>
                        )}
                     </>
                  )}
               </div>

               <div className="border border-slate-200 rounded-lg bg-slate-800 overflow-hidden relative flex items-center justify-center min-h-[120px]">
                 {form.pic_name ? (
                    <>
                       {form.pic_name.match(/\.(mp4|webm)$/i) ? (
                          <video src={form.pic_name.startsWith("/hero/") ? `/api/bop/hero-images/preview?file=${form.pic_name.replace("/hero/", "")}` : form.pic_name} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000" style={{ objectPosition: form.focal_point === 'none' ? 'unset' : form.focal_point }} />
                       ) : (
                          <img src={form.pic_name.startsWith("/hero/") ? `/api/bop/hero-images/preview?file=${form.pic_name.replace("/hero/", "")}` : form.pic_name} alt="Preview" className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000" style={{ objectPosition: form.focal_point === 'none' ? 'unset' : form.focal_point }} />
                       )}
                       <div className="absolute inset-0 bg-black pointer-events-none" style={{ opacity: form.overlay_opacity }}></div>
                       <div className="relative z-10 text-white font-bold text-lg tracking-widest uppercase opacity-80 pointer-events-none drop-shadow-md">Live Preview</div>
                    </>
                 ) : (
                    <span className="text-slate-500 text-sm font-medium tracking-widest uppercase">No Image</span>
                 )}
               </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Vehicle Type</label>
              <BopSelect value={form.vehicle_type} onChange={v => setForm(f => ({ ...f, vehicle_type: v }))} options={VEHICLE_TYPES.map(v => ({ value: v, label: v }))} className="min-w-[130px]" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Transition Effect</label>
              <BopSelect value={form.transition_effect} onChange={v => setForm(f => ({ ...f, transition_effect: v }))} options={TRANSITION_EFFECTS.map(v => ({ value: v, label: v }))} className="min-w-[130px]" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Waiting Duration (seconds)</label>
              <input type="number" step="0.1" value={form.waiting_duration_ms / 1000} onChange={e => setForm(f => ({ ...f, waiting_duration_ms: +e.target.value * 1000 }))}
                className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Transition Duration (seconds)</label>
              <input type="number" step="0.1" value={form.transition_duration_ms / 1000} onChange={e => setForm(f => ({ ...f, transition_duration_ms: +e.target.value * 1000 }))}
                className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Focal Point</label>
              <BopSelect value={form.focal_point} onChange={v => setForm(f => ({ ...f, focal_point: v }))} options={FOCAL_POINTS.map(v => ({ value: v, label: v }))} className="min-w-[130px]" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Overlay Opacity (0-1)</label>
              <input type="number" step="0.05" min="0" max="1" value={form.overlay_opacity} onChange={e => setForm(f => ({ ...f, overlay_opacity: +e.target.value }))}
                className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Alt Text (SEO)</label>
              <input value={form.alt_text} onChange={e => setForm(f => ({ ...f, alt_text: e.target.value }))}
                placeholder="Describe the image..."
                className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="hero_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
              <label htmlFor="hero_active" className="text-sm text-slate-600">Active (show in slideshow)</label>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => { void save(); }} disabled={saving || !form.pic_name}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving...' : editId ? 'Save Changes' : 'Add Image'}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null) }}
              className="rounded-lg border border-slate-200 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-400">Loading...</p>
      ) : images.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
          No hero images yet. Click &ldquo;+ Add Image&rdquo; to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {images.map(img => (
            <div key={img.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${img.is_active ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
              <div className="h-9 w-12 flex-shrink-0 overflow-hidden rounded-md bg-slate-100 relative">
                {img.pic_name && (
                    <>
                        {img.pic_name.match(/\.(mp4|webm)$/i) ? (
                          <video src={img.pic_name.startsWith("/hero/") ? `/api/bop/hero-images/preview?file=${img.pic_name.replace("/hero/", "")}` : img.pic_name} autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: img.focal_point === 'none' ? 'unset' : img.focal_point }} />
                        ) : (
                          <img src={img.pic_name.startsWith("/hero/") ? `/api/bop/hero-images/preview?file=${img.pic_name.replace("/hero/", "")}` : img.pic_name} alt={img.alt_text} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: img.focal_point === 'none' ? 'unset' : img.focal_point }} />
                        )}
                        <div className="absolute inset-0 bg-black" style={{ opacity: img.overlay_opacity }}></div>
                    </>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-medium text-slate-700 truncate max-w-xs">{img.pic_name}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{img.vehicle_type}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{img.transition_effect}</span>
                  {img.is_active
                    ? <span className="rounded border border-green-200 bg-green-50 px-1.5 py-0.5 text-xs text-green-600">Active</span>
                    : <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-400">Inactive</span>}
                </div>
                <p className="mt-0.5 text-xs text-slate-400">
                  Wait: {img.waiting_duration_ms / 1000}s · Fade: {img.transition_duration_ms / 1000}s · Focal: {img.focal_point} · Opacity: {img.overlay_opacity}
                </p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => openEdit(img)}
                  className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">Edit</button>
                <button onClick={() => { void toggle(img); }}
                  className={`rounded border px-2 py-1 text-xs ${img.is_active ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                  {img.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => { void remove(img.id); }}
                  className="rounded border border-red-100 px-2 py-1 text-xs text-red-500 hover:bg-red-50">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Site Features Panel ──────────────────────────────────────────────────────




interface SFSummaryRow {
  feature_key: string;
  enabled: boolean;
  group_key?: string;
  audience?: string;
  user_context?: string;
  importance_level?: string;
}
const SF_GROUP_LABELS: Record<string, string> = {
  seo: 'SEO & Discovery', ux: 'Storefront UX', b2b: 'B2B & Commercial',
  pricing: 'Pricing & Finance', conversion: 'Conversion & Leads',
  accounts: 'User Accounts', content: 'Content & Media', system: 'System',
};
const SF_GROUP_BAR: Record<string, string> = {
  seo: 'bg-blue-500', ux: 'bg-emerald-500', b2b: 'bg-amber-500',
  pricing: 'bg-orange-500', conversion: 'bg-violet-500',
  accounts: 'bg-indigo-500', content: 'bg-pink-500', system: 'bg-slate-400',
};
const SF_GROUP_ORDER = ['seo','ux','b2b','pricing','conversion','accounts','content','system'];

function SiteFeaturesSummary({ tid }: { tid: number }) {
  const [features, setFeatures] = useState<SFSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    void fetch(`/api/bop/sys/site-features?tenant_id=${tid}`)
      .then(r => r.json())
      .then(j => { setFeatures(j.data ?? []); setLoading(false); });
  }, [tid]);
  if (loading) return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-400">Loading site features...</p>
    </div>
  );
  const totalEnabled = features.filter(f => f.enabled).length;
  const total = features.length;
  const groupStats: Record<string, { enabled: number; total: number }> = {};
  for (const f of features) {
    const g = f.group_key ?? 'system';
    if (!groupStats[g]) groupStats[g] = { enabled: 0, total: 0 };
    groupStats[g].total++;
    if (f.enabled) groupStats[g].enabled++;
  }
  const audCounts: Record<string, number> = { b2b: 0, b2c: 0, both: 0 };
  const ctxCounts: Record<string, number> = { any: 0, logged_in: 0, b2b: 0 };
  for (const f of features) {
    const aud = f.audience ?? 'both';
    const ctx = f.user_context ?? 'any';
    audCounts[aud] = (audCounts[aud] ?? 0) + 1;
    ctxCounts[ctx] = (ctxCounts[ctx] ?? 0) + 1;
  }
  const p0Features = features.filter(f => (f.importance_level ?? 'P2') === 'P0');
  const p0Enabled = p0Features.filter(f => f.enabled).length;
  const p0Total = p0Features.length;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold text-slate-800">Site Features</h3>
          <p className="text-xs text-slate-400 mt-0.5">{totalEnabled} of {total} features enabled</p>
        </div>
        <a href={`/console/sys/sy050?tenant_id=${tid}`}
          className="inline-flex items-center gap-1 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors">
          Open Feature Matrix
        </a>
      </div>
      <div className="space-y-2.5 mb-5">
        {SF_GROUP_ORDER.map(g => {
          const stats = groupStats[g];
          if (!stats) return null;
          const pct = stats.total > 0 ? (stats.enabled / stats.total) * 100 : 0;
          return (
            <div key={g} className="flex items-center gap-3">
              <span className="w-28 text-xs text-slate-500 shrink-0">{SF_GROUP_LABELS[g]}</span>
              <div className="flex-1 rounded-full bg-slate-100 h-1.5 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${SF_GROUP_BAR[g] }`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-slate-400 w-10 text-right shrink-0">{stats.enabled}/{stats.total}</span>
            </div>
          );
        })}
      </div>
      <div className="border-t border-slate-100 pt-4 space-y-1.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-28 text-slate-400 shrink-0">Audience:</span>
          <span className="text-amber-600 font-medium">B2B: {audCounts.b2b}</span>
          <span className="text-slate-300 mx-1">|</span>
          <span className="text-indigo-600 font-medium">B2C: {audCounts.b2c}</span>
          <span className="text-slate-300 mx-1">|</span>
          <span className="text-slate-500">Both: {audCounts.both}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-28 text-slate-400 shrink-0">User context:</span>
          <span className="text-slate-500">Any: {ctxCounts.any}</span>
          <span className="text-slate-300 mx-1">|</span>
          <span className="text-emerald-600 font-medium">Login: {ctxCounts.logged_in}</span>
          <span className="text-slate-300 mx-1">|</span>
          <span className="text-amber-600 font-medium">B2B: {ctxCounts.b2b ?? 0}</span>
        </div>
        {p0Total > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="w-28 text-slate-400 shrink-0">P0 Core:</span>
            <span className={`font-semibold ${p0Enabled < p0Total ? 'text-rose-600' : 'text-emerald-600'}`}>
              {p0Enabled} of {p0Total} enabled
            </span>
            {p0Enabled < p0Total && (
              <span className="text-rose-500 text-[10px] font-medium">({p0Total - p0Enabled} off)</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Source Prefixes Panel ────────────────────────────────────────────────────
const CHANNEL_OPTIONS = ['marketplace','social','chat','email','print','paid_search','local','referral','organic','ai_agent'];
const CHANNEL_COLORS: Record<string, string> = {
  marketplace: 'bg-amber-100 text-amber-700', social: 'bg-blue-100 text-blue-700',
  chat: 'bg-emerald-100 text-emerald-700', email: 'bg-violet-100 text-violet-700',
  print: 'bg-slate-200 text-slate-600', paid_search: 'bg-orange-100 text-orange-700',
  local: 'bg-teal-100 text-teal-700', referral: 'bg-pink-100 text-pink-700',
  organic: 'bg-lime-100 text-lime-700',
  ai_agent: 'bg-purple-100 text-purple-700',
};

type Prefix = {
  tenant_id: number; prefix: string; utm_source: string; utm_medium: string;
  label: string; channel: string; active: boolean; created_at: string; sort_order?: number;
};

function SourcePrefixesPanel({ tid }: { tid: number }) {
  const [rows, setRows] = useState<Prefix[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [editPrefix, setEditPrefix] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ label: string; channel: string; utm_source: string; utm_medium: string; sort_order: number }>({ label: '', channel: '', utm_source: '', utm_medium: '', sort_order: 50 });
  const empty = { prefix: '', utm_source: '', utm_medium: '', label: '', channel: 'social', active: true, sort_order: 50 };
  const [form, setForm] = useState(empty);

  function showMsg(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  const load = useCallback(async () => {
    setLoading(true);
    const j = await fetch(`/api/bop/shortlink?view=prefixes&tenant_id=${tid}`).then(r => r.json());
    setRows((j.prefixes ?? []).sort((a: Prefix, b: Prefix) => (a.sort_order ?? 50) - (b.sort_order ?? 50)));
    setLoading(false);
  }, [tid]);

  useEffect(() => { void load(); }, [load]);

  async function addPrefix() {
    if (!form.prefix || form.prefix.length !== 1 || !/^[a-z]$/.test(form.prefix)) { showMsg('Prefix must be a single lowercase letter'); return; }
    if (!form.label) { showMsg('Label is required'); return; }
    if (rows.some(r => r.prefix === form.prefix)) { showMsg(`Prefix "${form.prefix}" already exists`); return; }
    setSaving(true);
    const j = await fetch('/api/bop/shortlink', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, tenant_id: tid }),
    }).then(r => r.json());
    setSaving(false);
    if (j.error) { showMsg('Error: ' + j.error); return; }
    setForm(empty); setShowForm(false); void load(); showMsg('Prefix added');
  }

  async function toggleActive(row: Prefix) {
    await fetch('/api/bop/shortlink', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tid, prefix: row.prefix, active: !row.active }),
    });
    void load();
  }

  function startEdit(row: Prefix) {
    setEditPrefix(row.prefix);
    setEditForm({ label: row.label, channel: row.channel, utm_source: row.utm_source, utm_medium: row.utm_medium, sort_order: row.sort_order ?? 50 });
  }

  async function saveEdit() {
    if (!editPrefix) return;
    setSaving(true);
    const j = await fetch('/api/bop/shortlink', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tid, prefix: editPrefix, ...editForm }),
    }).then(r => r.json());
    setSaving(false);
    if (j.error) { showMsg('Error: ' + j.error); return; }
    setEditPrefix(null); void load(); showMsg('Prefix updated');
  }

  async function deletePrefix(row: Prefix) {
    if (!confirm(`Delete prefix "${row.prefix}" (${row.label})?`)) return;
    await fetch(`/api/bop/shortlink?tenant_id=${tid}&prefix=${row.prefix}`, { method: 'DELETE' });
    void load();
  }

  const eInp = 'w-full rounded border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500';
  const domain = 'desmobil.com';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">Source Prefixes</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Short-link attribution prefixes — URL pattern: <span className="font-mono text-slate-500">{domain}/</span><span className="font-mono font-bold text-blue-600">[prefix]</span><span className="font-mono text-slate-500">[refNo]</span>
          </p>
        </div>
        <button onClick={() => { setForm(empty); setShowForm(true); }}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
          + Add Prefix
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <h4 className="font-medium text-sm text-slate-700">New Source Prefix</h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Prefix letter</label>
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-center uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={1} value={form.prefix} onChange={e => setForm(f => ({ ...f, prefix: e.target.value.toLowerCase() }))}
                placeholder="e.g. m" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Label</label>
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="e.g. Marktplaats" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Channel</label>
              <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}>
                {CHANNEL_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">UTM Source</label>
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.utm_source} onChange={e => setForm(f => ({ ...f, utm_source: e.target.value }))}
                placeholder="e.g. marktplaats" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">UTM Medium</label>
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.utm_medium} onChange={e => setForm(f => ({ ...f, utm_medium: e.target.value }))}
                placeholder="e.g. marketplace" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Sort Order</label>
              <input type="number" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                placeholder="50" />
            </div>
          </div>
          {form.prefix && (
            <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700">
              Preview: <span className="font-mono font-bold">{domain}/{form.prefix}262608</span>
              {form.utm_source && <span className="ml-2 text-blue-500">→ ?utm_source={form.utm_source}&utm_medium={form.utm_medium}</span>}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={() => { void addPrefix(); }} disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Add Prefix'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-200 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-400">Loading...</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
          No source prefixes configured. Click &ldquo;+ Add Prefix&rdquo; to get started.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-slate-400 border-b border-slate-100">
            <tr>
              <th className="py-2 w-10 text-center">#</th>
              <th className="w-16">Prefix</th>
              <th>Label</th>
              <th>Channel</th>
              <th className="font-mono">utm_source</th>
              <th className="font-mono">utm_medium</th>
              <th>URL Example</th>
              <th className="w-16 text-center">Active</th>
              <th className="w-32"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map(r => {
              const isEditing = editPrefix === r.prefix;
              return (
              <tr key={r.prefix} className={`${r.active ? '' : 'opacity-50'} ${isEditing ? 'bg-blue-50/50' : ''}`}>
                <td className="py-2.5 text-center">
                  {isEditing
                    ? <input type="number" className="w-12 rounded border border-slate-300 px-1 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-500" value={editForm.sort_order} onChange={e => setEditForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
                    : <span className="text-xs text-slate-400">{r.sort_order ?? 50}</span>}
                </td>
                <td className="py-2.5">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white">
                    {r.prefix}
                  </span>
                </td>
                <td>{isEditing
                  ? <input className={eInp} value={editForm.label} onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))} />
                  : <span className="font-medium text-slate-700">{r.label}</span>}
                </td>
                <td>{isEditing
                  ? <select className={eInp} value={editForm.channel} onChange={e => setEditForm(f => ({ ...f, channel: e.target.value }))}>
                      {CHANNEL_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  : <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CHANNEL_COLORS[r.channel] ?? 'bg-slate-100 text-slate-500'}`}>{r.channel}</span>}
                </td>
                <td>{isEditing
                  ? <input className={`${eInp} font-mono`} value={editForm.utm_source} onChange={e => setEditForm(f => ({ ...f, utm_source: e.target.value }))} />
                  : <span className="font-mono text-xs text-slate-500">{r.utm_source}</span>}
                </td>
                <td>{isEditing
                  ? <input className={`${eInp} font-mono`} value={editForm.utm_medium} onChange={e => setEditForm(f => ({ ...f, utm_medium: e.target.value }))} />
                  : <span className="font-mono text-xs text-slate-500">{r.utm_medium}</span>}
                </td>
                <td className="font-mono text-xs text-slate-400">{domain}/{r.prefix}262608</td>
                <td className="text-center">
                  <button onClick={() => { void toggleActive(r); }}
                    className={`h-5 w-9 rounded-full transition-colors ${r.active ? 'bg-blue-600' : 'bg-slate-300'} relative`}>
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${r.active ? 'left-[18px]' : 'left-0.5'}`} />
                  </button>
                </td>
                <td className="text-right space-x-1">
                  {isEditing ? (<>
                    <button onClick={() => { void saveEdit(); }} disabled={saving}
                      className="rounded border border-blue-200 bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">{saving ? '...' : 'Save'}</button>
                    <button onClick={() => setEditPrefix(null)}
                      className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50">Cancel</button>
                  </>) : (<>
                    <button onClick={() => startEdit(r)}
                      className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">Edit</button>
                    <button onClick={() => { void deletePrefix(r); }}
                      className="rounded border border-red-100 px-2 py-1 text-xs text-red-500 hover:bg-red-50">Delete</button>
                  </>)}
                </td>
              </tr>);
            })}
          </tbody>
        </table>
      )}

      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
