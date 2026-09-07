'use client';
import { useEffect, useState } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

/* ── Types ─────────────────────────────────────────────────────────────── */

type Client = {
  id: string; slug: string; name: string; contact_name: string | null; email: string | null;
  locale: string; status: string; expires_at: string | null; created_at: string;
  offer_count: number; open_offers: number; document_count: number;
};
type LineItem = { description: string; quantity: number; unit_price: number; total?: number; optional?: boolean };
type Offer = {
  id: string; client_id: string; offer_no: string | null; title: string; summary: string | null;
  status: string; current_version: number; currency: string; valid_until: string | null;
  decided_at: string | null; updated_at: string;
  portal_clients?: { name: string; slug: string };
  portal_offer_versions: any[];
  portal_offer_responses: any[];
};
type Doc = {
  id: string; client_id: string; title: string; note: string | null; category: string;
  file_url: string | null; storage_path: string | null; version: number; is_primary: boolean;
  sort_order: number; status: string; updated_at: string;
  portal_clients?: { name: string; slug: string };
};
type Ev = { id: string; type: string; detail: string | null; ip: string | null; created_at: string; portal_clients?: { name: string } };

const TABS = ['clients', 'offers', 'documents', 'activity'] as const;
type Tab = (typeof TABS)[number];

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-500',
  sent: 'bg-amber-50 text-amber-700',
  viewed: 'bg-amber-50 text-amber-700',
  changes_requested: 'bg-blue-50 text-blue-700',
  approved: 'bg-emerald-50 text-emerald-600',
  declined: 'bg-red-50 text-red-600',
  withdrawn: 'bg-slate-100 text-slate-400',
  active: 'bg-emerald-50 text-emerald-600',
  suspended: 'bg-amber-50 text-amber-700',
  closed: 'bg-slate-100 text-slate-400',
};

const EVENT_ICON: Record<string, string> = {
  login: '🔓', login_failed: '⛔', view_offer: '👁️', view_document: '📄',
  approved: '✅', declined: '❌', changes_requested: '✏️', comment: '💬',
};

const fmtEur = (n: number, cur = 'EUR') => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: cur }).format(n ?? 0);
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = (d: string) => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const emptyItem = (): LineItem => ({ description: '', quantity: 1, unit_price: 0 });

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function CR030Page() {
  const [tab, setTab] = useState<Tab>('clients');
  const [clients, setClients] = useState<Client[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [events, setEvents] = useState<Ev[]>([]);
  const [clientFilter, setClientFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 3500); }

  // Drawers
  const [clientDrawer, setClientDrawer] = useState(false);
  const [editClientId, setEditClientId] = useState('');
  const [clientForm, setClientForm] = useState<any>({ name: '', contact_name: '', email: '', locale: 'nl', expires_at: '' });
  const [newCode, setNewCode] = useState<{ client: string; code: string; url: string } | null>(null);

  const [offerDrawer, setOfferDrawer] = useState(false);
  const [offerForm, setOfferForm] = useState<any>({ client_id: '', title: '', summary: '', valid_until: '', vat_rate: 21, send: true });
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);

  const [versionFor, setVersionFor] = useState<Offer | null>(null);
  const [versionNote, setVersionNote] = useState('');

  const [docDrawer, setDocDrawer] = useState(false);
  const [docForm, setDocForm] = useState<any>({ client_id: '', title: '', note: '', category: 'proposal', file_url: '', is_primary: false });

  const [expanded, setExpanded] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadAll() {
    setLoading(true);
    const qs = clientFilter ? `?client_id=${clientFilter}` : '';
    const [cj, oj, dj, ej] = await Promise.all([
      fetch('/api/bop/crm/portal/clients').then(r => r.json()),
      fetch(`/api/bop/crm/portal/offers${qs}`).then(r => r.json()),
      fetch(`/api/bop/crm/portal/documents${qs}`).then(r => r.json()),
      fetch(`/api/bop/crm/portal/events${qs}`).then(r => r.json()),
    ]);
    setClients(cj.clients ?? []);
    setOffers(oj.offers ?? []);
    setDocs(dj.documents ?? []);
    setEvents(ej.events ?? []);
    setLoading(false);
  }
  useEffect(() => { void loadAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [clientFilter]);

  /* ── Actions ─────────────────────────────────────────────────────────── */

  async function createClient() {
    if (!clientForm.name.trim()) return;
    setSaving(true);
    const res = await fetch('/api/bop/crm/portal/clients', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...clientForm, expires_at: clientForm.expires_at || null }),
    });
    const d = await res.json();
    setSaving(false);
    if (d.error) { showToast(`Error: ${d.error}`); return; }
    setClientDrawer(false);
    setClientForm({ name: '', contact_name: '', email: '', locale: 'nl', expires_at: '' });
    setNewCode({ client: d.client.name, code: d.code, url: `${location.origin}${d.login_url}` });
    void loadAll();
  }

  function startEditClient(c: Client) {
    setEditClientId(c.id);
    setClientForm({
      name: c.name,
      contact_name: c.contact_name ?? '',
      email: c.email ?? '',
      locale: c.locale,
      status: c.status,
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : '',
    });
    setClientDrawer(true);
  }

  async function saveClientEdit() {
    if (!clientForm.name.trim()) return;
    setSaving(true);
    const res = await fetch('/api/bop/crm/portal/clients', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editClientId, ...clientForm, expires_at: clientForm.expires_at || null }),
    });
    const d = await res.json();
    setSaving(false);
    if (d.error) { showToast(`Error: ${d.error}`); return; }
    setClientDrawer(false); setEditClientId('');
    setClientForm({ name: '', contact_name: '', email: '', locale: 'nl', expires_at: '' });
    showToast('Client updated');
    void loadAll();
  }

  async function regenerateCode(c: Client) {
    if (!confirm(`Generate a new access code for ${c.name}? The old code stops working immediately.`)) return;
    const res = await fetch('/api/bop/crm/portal/clients', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: c.id, action: 'regenerate_code' }),
    });
    const d = await res.json();
    if (d.error) { showToast(`Error: ${d.error}`); return; }
    setNewCode({ client: c.name, code: d.code, url: `${location.origin}/portal/login?c=${c.slug}&tenant=500` });
  }

  async function setClientStatus(c: Client, status: string) {
    await fetch('/api/bop/crm/portal/clients', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: c.id, status }),
    });
    showToast(`${c.name} → ${status}`);
    void loadAll();
  }

  async function createOffer() {
    if (!offerForm.client_id || !offerForm.title.trim()) { showToast('Client and title are required'); return; }
    setSaving(true);
    const res = await fetch('/api/bop/crm/portal/offers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...offerForm, valid_until: offerForm.valid_until || null, line_items: items }),
    });
    const d = await res.json();
    setSaving(false);
    if (d.error) { showToast(`Error: ${d.error}`); return; }
    setOfferDrawer(false);
    setOfferForm({ client_id: '', title: '', summary: '', valid_until: '', vat_rate: 21, send: true });
    setItems([emptyItem()]);
    showToast(offerForm.send ? 'Offer created and sent' : 'Offer saved as draft');
    void loadAll();
  }

  async function offerAction(o: Offer, action: string) {
    const res = await fetch('/api/bop/crm/portal/offers', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: o.id, action }),
    });
    const d = await res.json();
    if (d.error) { showToast(`Error: ${d.error}`); return; }
    showToast(`${o.offer_no ?? o.title} → ${d.status}`);
    void loadAll();
  }

  async function createVersion() {
    if (!versionFor) return;
    setSaving(true);
    const res = await fetch('/api/bop/crm/portal/offers', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: versionFor.id, action: 'new_version', line_items: items, change_note: versionNote || null, vat_rate: offerForm.vat_rate ?? 21 }),
    });
    const d = await res.json();
    setSaving(false);
    if (d.error) { showToast(`Error: ${d.error}`); return; }
    setVersionFor(null); setVersionNote(''); setItems([emptyItem()]);
    showToast(`Version ${d.version_no} sent`);
    void loadAll();
  }

  async function createDoc() {
    if (!docForm.client_id || !docForm.title.trim() || !docForm.file_url.trim()) { showToast('Client, title and file URL are required'); return; }
    setSaving(true);
    const res = await fetch('/api/bop/crm/portal/documents', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(docForm),
    });
    const d = await res.json();
    setSaving(false);
    if (d.error) { showToast(`Error: ${d.error}`); return; }
    setDocDrawer(false);
    setDocForm({ client_id: '', title: '', note: '', category: 'proposal', file_url: '', is_primary: false });
    showToast('Document added');
    void loadAll();
  }

  async function archiveDoc(d: Doc) {
    if (!confirm(`Archive "${d.title}"? It disappears from the client portal.`)) return;
    await fetch(`/api/bop/crm/portal/documents?id=${d.id}`, { method: 'DELETE' });
    showToast('Document archived');
    void loadAll();
  }

  function startNewVersion(o: Offer) {
    const current = (o.portal_offer_versions ?? []).find((v: any) => v.version_no === o.current_version);
    setItems(current?.line_items?.length ? current.line_items.map((li: any) => ({ ...li })) : [emptyItem()]);
    setVersionNote('');
    setVersionFor(o);
  }

  function updateItem(idx: number, k: keyof LineItem, v: any) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [k]: v } : it));
  }

  const itemsSubtotal = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);

  /* ── Render ──────────────────────────────────────────────────────────── */

  const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  const labelCls = 'block text-xs font-semibold text-slate-500 mb-1';

  return (
    <div>
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}
      <ScreenHeader title="Client Portal" description="CR030 — Portal clients, offers with approval flow, shared documents and activity" />

      {/* New-code modal */}
      {newCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setNewCode(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-slate-800">Access code for {newCode.client}</h3>
            <p className="mt-1 text-xs text-slate-500">Shown only once — it is stored hashed. Send the link and the code through different channels.</p>
            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-center font-mono text-2xl font-bold tracking-[0.3em] text-slate-800">{newCode.code}</div>
            <div className="mt-3 rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-500 break-all">{newCode.url}</div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => { navigator.clipboard?.writeText(newCode.code); showToast('Code copied'); }}
                className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium hover:bg-slate-50">Copy code</button>
              <button onClick={() => { navigator.clipboard?.writeText(newCode.url); showToast('Link copied'); }}
                className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium hover:bg-slate-50">Copy link</button>
              <button onClick={() => setNewCode(null)} className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-700">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs + client filter */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {TABS.map(tb => (
            <button key={tb} onClick={() => setTab(tb)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${tab === tb ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {tb}
            </button>
          ))}
        </div>
        <select value={clientFilter} onChange={e => setClientFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
          <option value="">All clients</option>
          {clients.filter(c => c.status === 'active').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="ml-auto flex gap-2">
          {tab === 'clients' && <button onClick={() => { setEditClientId(''); setClientForm({ name: '', contact_name: '', email: '', locale: 'nl', expires_at: '' }); setClientDrawer(true); }} className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">+ New Client</button>}
          {tab === 'offers' && <button onClick={() => { setItems([emptyItem()]); setOfferForm((p: any) => ({ ...p, client_id: clientFilter || p.client_id })); setOfferDrawer(true); }} className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">+ New Offer</button>}
          {tab === 'documents' && <button onClick={() => { setDocForm((p: any) => ({ ...p, client_id: clientFilter || p.client_id })); setDocDrawer(true); }} className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">+ Add Document</button>}
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading...</div>
      ) : (
        <>
          {/* ── Clients tab ── */}
          {tab === 'clients' && (
            <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Portal link</th>
                    <th className="px-4 py-3">Locale</th>
                    <th className="px-4 py-3">Offers</th>
                    <th className="px-4 py-3">Docs</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Expires</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No portal clients yet — create the first one.</td></tr>}
                  {clients.filter(c => !clientFilter || c.id === clientFilter).map(c => (
                    <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{c.name}</div>
                        <div className="text-xs text-slate-400">{c.contact_name}{c.email ? ` · ${c.email}` : ''}</div>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => { navigator.clipboard?.writeText(`${location.origin}/portal/login?c=${c.slug}&tenant=500`); showToast('Login link copied'); }}
                          className="font-mono text-xs text-blue-600 hover:underline">/portal/login?c={c.slug}</button>
                      </td>
                      <td className="px-4 py-3 text-xs uppercase text-slate-500">{c.locale}</td>
                      <td className="px-4 py-3 text-slate-600">{c.offer_count}{c.open_offers > 0 && <span className="ml-1 rounded-full bg-amber-50 px-1.5 text-[10px] font-semibold text-amber-700">{c.open_offers} open</span>}</td>
                      <td className="px-4 py-3 text-slate-600">{c.document_count}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[c.status]}`}>{c.status}</span></td>
                      <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(c.expires_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => startEditClient(c)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50" title="Edit client details">✏️ Edit</button>
                          <button onClick={() => regenerateCode(c)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50" title="Generate new access code">🔑 New code</button>
                          {c.status === 'active'
                            ? <button onClick={() => setClientStatus(c, 'suspended')} className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50">Suspend</button>
                            : c.status === 'suspended' && <button onClick={() => setClientStatus(c, 'active')} className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50">Reactivate</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Offers tab ── */}
          {tab === 'offers' && (
            <div className="space-y-3">
              {offers.length === 0 && <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-400 shadow-sm">No offers yet.</div>}
              {offers.map(o => {
                const current = (o.portal_offer_versions ?? []).find((v: any) => v.version_no === o.current_version);
                const open = expanded === o.id;
                return (
                  <div key={o.id} className="rounded-xl border bg-white shadow-sm">
                    <button onClick={() => setExpanded(open ? '' : o.id)} className="flex w-full items-center gap-3 px-5 py-4 text-left">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-400">{o.offer_no}</span>
                          <span className="truncate text-sm font-semibold text-slate-800">{o.title}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-slate-400">
                          {o.portal_clients?.name} · v{o.current_version} · updated {fmtDate(o.updated_at)}
                        </div>
                      </div>
                      {current && <span className="text-sm font-semibold text-slate-700">{fmtEur(current.total, o.currency)}</span>}
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[o.status]}`}>{o.status.replace(/_/g, ' ')}</span>
                      <span className="text-slate-300">{open ? '▾' : '▸'}</span>
                    </button>

                    {open && (
                      <div className="border-t border-slate-100 px-5 py-4">
                        {/* Actions */}
                        <div className="mb-4 flex flex-wrap gap-2">
                          {o.status === 'draft' && <button onClick={() => offerAction(o, 'send')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">Send to client</button>}
                          {!['approved', 'declined', 'withdrawn'].includes(o.status) && (
                            <>
                              <button onClick={() => startNewVersion(o)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">New version</button>
                              <button onClick={() => offerAction(o, 'withdraw')} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Withdraw</button>
                            </>
                          )}
                        </div>

                        {/* Current version items */}
                        {current && (
                          <div className="mb-4 overflow-x-auto rounded-lg border border-slate-100">
                            <table className="w-full text-xs">
                              <thead><tr className="bg-slate-50 text-left text-slate-400"><th className="px-3 py-2">Description</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Unit</th><th className="px-3 py-2 text-right">Total</th></tr></thead>
                              <tbody>
                                {(current.line_items ?? []).map((li: any, i: number) => (
                                  <tr key={i} className="border-t border-slate-50">
                                    <td className="px-3 py-2 text-slate-700">{li.description}{li.optional && <span className="ml-1 text-[10px] text-slate-400">(optional)</span>}</td>
                                    <td className="px-3 py-2 text-right">{li.quantity}</td>
                                    <td className="px-3 py-2 text-right">{fmtEur(li.unit_price, o.currency)}</td>
                                    <td className="px-3 py-2 text-right font-medium">{fmtEur(li.total, o.currency)}</td>
                                  </tr>
                                ))}
                                <tr className="border-t border-slate-100 font-semibold"><td colSpan={3} className="px-3 py-2 text-right">Total incl. VAT {current.vat_rate}%</td><td className="px-3 py-2 text-right">{fmtEur(current.total, o.currency)}</td></tr>
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Responses */}
                        {(o.portal_offer_responses ?? []).length > 0 && (
                          <div className="mb-4">
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Client responses</h4>
                            <div className="space-y-2">
                              {o.portal_offer_responses.map((r: any) => (
                                <div key={r.id} className="rounded-lg bg-slate-50 p-3 text-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-700">{EVENT_ICON[r.action] ?? ''} {r.action.replace(/_/g, ' ')} (v{r.version_no})</span>
                                    <span className="text-slate-400">{fmtDateTime(r.created_at)}</span>
                                  </div>
                                  {r.comment && <p className="mt-1 text-slate-600">{r.comment}</p>}
                                  {r.signer_name && <p className="mt-1 text-slate-400">Signed: {r.signer_name}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Version history */}
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Versions</h4>
                        <div className="space-y-1">
                          {(o.portal_offer_versions ?? []).map((v: any) => (
                            <div key={v.id} className="flex items-center justify-between text-xs">
                              <span className={v.version_no === o.current_version ? 'font-semibold text-slate-700' : 'text-slate-500'}>
                                v{v.version_no}{v.version_no === o.current_version ? ' (current)' : ''}{v.change_note ? ` — ${v.change_note}` : ''}
                              </span>
                              <span className="text-slate-400">{fmtEur(v.total, o.currency)} · {fmtDate(v.created_at)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Documents tab ── */}
          {tab === 'documents' && (
            <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3">Document</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Version</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No documents yet.</td></tr>}
                  {docs.map(d => (
                    <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{d.is_primary && '⭐ '}{d.title}</div>
                        {d.note && <div className="text-xs text-slate-400">{d.note}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{d.portal_clients?.name}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{d.category}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">v{d.version}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${d.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>{d.status}</span></td>
                      <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(d.updated_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {d.file_url && <a href={d.file_url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50">Open</a>}
                          {d.status === 'active' && <button onClick={() => archiveDoc(d)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-red-500 hover:bg-red-50">Archive</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Activity tab ── */}
          {tab === 'activity' && (
            <div className="rounded-xl border bg-white shadow-sm">
              {events.length === 0 && <div className="p-8 text-center text-sm text-slate-400">No portal activity yet.</div>}
              {events.map(ev => (
                <div key={ev.id} className="flex items-center gap-3 border-b border-slate-50 px-5 py-3 last:border-0">
                  <span className="text-lg">{EVENT_ICON[ev.type] ?? '•'}</span>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm text-slate-700">
                      <span className="font-medium">{ev.portal_clients?.name ?? 'Unknown'}</span>
                      <span className="text-slate-400"> — {ev.type.replace(/_/g, ' ')}</span>
                      {ev.detail && <span className="text-slate-500"> · {ev.detail}</span>}
                    </span>
                  </div>
                  <span className="flex-none text-xs text-slate-400">{fmtDateTime(ev.created_at)}{ev.ip ? ` · ${ev.ip}` : ''}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Client drawer ── */}
      {clientDrawer && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={() => { setClientDrawer(false); setEditClientId(''); }}>
          <div className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="mb-4 text-base font-bold text-slate-800">{editClientId ? 'Edit portal client' : 'New portal client'}</h3>
            <div className="space-y-4">
              <div><label className={labelCls}>Company / client name *</label>
                <input className={inputCls} value={clientForm.name} onChange={e => setClientForm((p: any) => ({ ...p, name: e.target.value }))} placeholder="Carisma Car Center" /></div>
              <div><label className={labelCls}>Contact person</label>
                <input className={inputCls} value={clientForm.contact_name} onChange={e => setClientForm((p: any) => ({ ...p, contact_name: e.target.value }))} /></div>
              <div><label className={labelCls}>E-mail</label>
                <input className={inputCls} type="email" value={clientForm.email} onChange={e => setClientForm((p: any) => ({ ...p, email: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Portal language</label>
                  <select className={inputCls} value={clientForm.locale} onChange={e => setClientForm((p: any) => ({ ...p, locale: e.target.value }))}>
                    {['nl', 'en', 'de', 'fr', 'tr'].map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
                  </select></div>
                <div><label className={labelCls}>Access expires</label>
                  <input className={inputCls} type="date" value={clientForm.expires_at} onChange={e => setClientForm((p: any) => ({ ...p, expires_at: e.target.value }))} /></div>
              </div>
              {editClientId && (
                <div><label className={labelCls}>Status</label>
                  <select className={inputCls} value={clientForm.status ?? 'active'} onChange={e => setClientForm((p: any) => ({ ...p, status: e.target.value }))}>
                    <option value="active">active — client can log in</option>
                    <option value="suspended">suspended — login disabled, data kept</option>
                    <option value="closed">closed — dossier ended</option>
                  </select></div>
              )}
              <button onClick={editClientId ? saveClientEdit : createClient} disabled={saving} className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving…' : editClientId ? 'Save changes' : 'Create client & generate access code'}
              </button>
              {editClientId && (
                <p className="text-xs text-slate-400">The access code is not changed here — use <b>🔑 New code</b> in the client row to rotate it.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Offer drawer (new offer) / new version drawer ── */}
      {(offerDrawer || versionFor) && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={() => { setOfferDrawer(false); setVersionFor(null); }}>
          <div className="h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="mb-4 text-base font-bold text-slate-800">
              {versionFor ? `New version — ${versionFor.title} (v${versionFor.current_version + 1})` : 'New offer'}
            </h3>
            <div className="space-y-4">
              {!versionFor && (
                <>
                  <div><label className={labelCls}>Client *</label>
                    <select className={inputCls} value={offerForm.client_id} onChange={e => setOfferForm((p: any) => ({ ...p, client_id: e.target.value }))}>
                      <option value="">Select client…</option>
                      {clients.filter(c => c.status === 'active').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select></div>
                  <div><label className={labelCls}>Title *</label>
                    <input className={inputCls} value={offerForm.title} onChange={e => setOfferForm((p: any) => ({ ...p, title: e.target.value }))} placeholder="Workshop & trade system — implementation proposal" /></div>
                  <div><label className={labelCls}>Summary</label>
                    <textarea className={`${inputCls} resize-none`} rows={2} value={offerForm.summary} onChange={e => setOfferForm((p: any) => ({ ...p, summary: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>Valid until</label>
                      <input className={inputCls} type="date" value={offerForm.valid_until} onChange={e => setOfferForm((p: any) => ({ ...p, valid_until: e.target.value }))} /></div>
                    <div><label className={labelCls}>VAT %</label>
                      <input className={inputCls} type="number" value={offerForm.vat_rate} onChange={e => setOfferForm((p: any) => ({ ...p, vat_rate: Number(e.target.value) }))} /></div>
                  </div>
                </>
              )}
              {versionFor && (
                <div><label className={labelCls}>What changed in this version *</label>
                  <input className={inputCls} value={versionNote} onChange={e => setVersionNote(e.target.value)} placeholder="Adjusted scope of phase 2 per your feedback" /></div>
              )}

              {/* Line items editor */}
              <div>
                <label className={labelCls}>Line items</label>
                <div className="space-y-2">
                  {items.map((it, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input className={`${inputCls} flex-1`} placeholder="Description" value={it.description} onChange={e => updateItem(i, 'description', e.target.value)} />
                      <input className={`${inputCls} w-16 text-right`} type="number" min={1} value={it.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))} />
                      <input className={`${inputCls} w-28 text-right`} type="number" step="0.01" placeholder="0.00" value={it.unit_price} onChange={e => updateItem(i, 'unit_price', Number(e.target.value))} />
                      <label className="flex items-center gap-1 text-[10px] text-slate-400"><input type="checkbox" checked={!!it.optional} onChange={e => updateItem(i, 'optional', e.target.checked)} />opt</label>
                      <button onClick={() => setItems(prev => prev.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-500">✕</button>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <button onClick={() => setItems(prev => [...prev, emptyItem()])} className="text-xs font-medium text-blue-600 hover:underline">+ Add line</button>
                  <span className="text-xs text-slate-500">Subtotal: <b>{fmtEur(itemsSubtotal)}</b></span>
                </div>
              </div>

              {!versionFor && (
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={offerForm.send} onChange={e => setOfferForm((p: any) => ({ ...p, send: e.target.checked }))} />
                  Send to client immediately (otherwise saved as draft)
                </label>
              )}

              <button onClick={versionFor ? createVersion : createOffer} disabled={saving}
                className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving…' : versionFor ? 'Create & send new version' : offerForm.send ? 'Create & send offer' : 'Save draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Document drawer ── */}
      {docDrawer && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={() => setDocDrawer(false)}>
          <div className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="mb-4 text-base font-bold text-slate-800">Add document</h3>
            <div className="space-y-4">
              <div><label className={labelCls}>Client *</label>
                <select className={inputCls} value={docForm.client_id} onChange={e => setDocForm((p: any) => ({ ...p, client_id: e.target.value }))}>
                  <option value="">Select client…</option>
                  {clients.filter(c => c.status === 'active').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></div>
              <div><label className={labelCls}>Title *</label>
                <input className={inputCls} value={docForm.title} onChange={e => setDocForm((p: any) => ({ ...p, title: e.target.value }))} /></div>
              <div><label className={labelCls}>Note (shown to the client)</label>
                <input className={inputCls} value={docForm.note} onChange={e => setDocForm((p: any) => ({ ...p, note: e.target.value }))} /></div>
              <div><label className={labelCls}>Category</label>
                <select className={inputCls} value={docForm.category} onChange={e => setDocForm((p: any) => ({ ...p, category: e.target.value }))}>
                  {['proposal', 'contract', 'report', 'invoice', 'general'].map(c => <option key={c} value={c}>{c}</option>)}
                </select></div>
              <div><label className={labelCls}>File URL *</label>
                <input className={inputCls} value={docForm.file_url} onChange={e => setDocForm((p: any) => ({ ...p, file_url: e.target.value }))} placeholder="https://… (PDF link, Drive export, CDN)" />
                <p className="mt-1 text-[10px] text-slate-400">Opened via /api/portal/documents with access logging. Use an unguessable link (Drive export, signed URL).</p></div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={docForm.is_primary} onChange={e => setDocForm((p: any) => ({ ...p, is_primary: e.target.checked }))} />
                Primary document (highlighted, “start here”)
              </label>
              <button onClick={createDoc} disabled={saving} className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Add document'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
