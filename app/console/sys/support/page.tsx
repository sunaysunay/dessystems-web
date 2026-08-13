'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';

// SY040 — Support Center (admin view). All inbound support requests across tenants.

interface SupRequest {
  id: number; request_no: string; tenant_id: number; created_by: string;
  category: string; priority: string; status: string; subject: string;
  resolution: string | null; ctx_route: string | null; ctx_env: string | null;
  created_at: string; updated_at: string;
}
interface SupMessage {
  id: number; sender_role: 'user' | 'admin'; body: string; created_at: string;
}

const STATUS_CHIP: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700', waiting_admin: 'bg-amber-100 text-amber-700',
  waiting_user: 'bg-teal-100 text-teal-700', closed: 'bg-slate-100 text-slate-500',
};
const PRI_CHIP: Record<string, string> = {
  low: 'bg-slate-100 text-slate-500', normal: 'bg-blue-50 text-blue-600',
  high: 'bg-amber-100 text-amber-700', critical: 'bg-red-100 text-red-700',
};
const CAT_LABELS: Record<string, string> = {
  access_problem: 'Access problem', bug: 'Bug / not working',
  question: 'Question', feature_request: 'Feature request', other: 'Other',
};

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}d ago`;
  if (h >= 1)  return `${h}h ago`;
  return `${Math.max(1, m)}m ago`;
}

export default function SY040Page() {
  useScope();
  const [requests, setRequests]   = useState<SupRequest[]>([]);
  const [selected, setSelected]   = useState<SupRequest | null>(null);
  const [messages, setMessages]   = useState<SupMessage[]>([]);
  const [loading, setLoading]     = useState(true);
  const [sending, setSending]     = useState(false);
  const [replyText, setReply]     = useState('');
  const [resolution, setRes]      = useState('');
  const [toast, setToast]         = useState('');
  const [filterStatus, setFStatus] = useState('');
  const [filterPri, setFPri]      = useState('');
  const [filterCat] = useState('');

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 3000); }

  function loadRequests() {
    setLoading(true);
    fetch('/api/bop/support/requests')
      .then(r => r.json())
      .then(j => { setRequests(j.requests ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { loadRequests(); }, []);

  function openRequest(r: SupRequest) {
    setSelected(r); setReply(''); setRes(r.resolution ?? '');
    void fetch(`/api/bop/support/requests/${r.id}`)
      .then(res => res.json())
      .then(j => setMessages(j.messages ?? []));
  }

  async function sendReply() {
    if (!replyText.trim() || !selected) return;
    setSending(true);
    const res = await fetch(`/api/bop/support/requests/${selected.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: replyText }),
    });
    setSending(false);
    if (res.ok) {
      const j = await res.json();
      setMessages(prev => [...prev, j.message]);
      setReply('');
      loadRequests();
    } else showToast('Failed to send');
  }

  async function patchRequest(patch: Partial<SupRequest>) {
    if (!selected) return;
    const res = await fetch(`/api/bop/support/requests/${selected.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    });
    if (res.ok) {
      const j = await res.json();
      setSelected(j.request);
      setRequests(prev => prev.map(r => r.id === selected.id ? j.request : r));
      showToast('Updated');
    }
  }

  const filtered = requests.filter(r =>
    (!filterStatus || r.status === filterStatus) &&
    (!filterPri    || r.priority === filterPri) &&
    (!filterCat    || r.category === filterCat)
  );


  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title="Support Center" description={`SY040 — Inbound support requests`} />

      {/* Stats bar */}
      <div className="flex gap-3 px-5 py-3 border-b border-slate-100 dark:border-slate-800">
        {[
          { label: 'Total', value: requests.length, color: 'text-slate-700' },
          { label: 'Open', value: requests.filter(r => r.status !== 'closed').length, color: 'text-amber-600' },
          { label: 'Waiting admin', value: requests.filter(r => r.status === 'waiting_admin').length, color: 'text-red-600' },
          { label: 'Closed', value: requests.filter(r => r.status === 'closed').length, color: 'text-slate-400' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-slate-100 bg-white dark:bg-slate-800 dark:border-slate-700 px-4 py-2 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: request list */}
        <div className="flex w-96 flex-shrink-0 flex-col border-r border-slate-100 dark:border-slate-800 overflow-hidden">
          {/* Filters */}
          <div className="flex gap-1.5 px-3 py-2 border-b border-slate-100 dark:border-slate-800">
            <select value={filterStatus} onChange={e => setFStatus(e.target.value)}
              className="flex-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-600">
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="waiting_admin">Waiting admin</option>
              <option value="waiting_user">Replied</option>
              <option value="closed">Closed</option>
            </select>
            <select value={filterPri} onChange={e => setFPri(e.target.value)}
              className="flex-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-600">
              <option value="">All priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="p-6 text-center text-sm text-slate-400">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-400">No requests</p>
            ) : filtered.map(r => (
              <div key={r.id} onClick={() => openRequest(r)}
                className={`cursor-pointer border-b border-slate-50 dark:border-slate-800 px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${selected?.id === r.id ? 'bg-amber-50 dark:bg-amber-900/10 border-l-2 border-l-amber-400' : ''}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="font-mono text-[10px] text-slate-400">{r.request_no}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${STATUS_CHIP[r.status] ?? 'bg-slate-100 text-slate-500'}`}>
                    {r.status.replace('_', ' ')}
                  </span>
                  {r.priority !== 'normal' && (
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium capitalize ${PRI_CHIP[r.priority]}`}>{r.priority}</span>
                  )}
                </div>
                <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{r.subject}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">{CAT_LABELS[r.category]} · T{r.tenant_id} · {timeAgo(r.updated_at)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: thread panel */}
        {selected ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Thread header */}
            <div className="border-b border-slate-100 dark:border-slate-800 px-5 py-3 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-slate-400">{selected.request_no}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_CHIP[selected.status]}`}>
                      {selected.status.replace('_', ' ')}
                    </span>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-medium capitalize ${PRI_CHIP[selected.priority]}`}>
                      {selected.priority}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{selected.subject}</p>
                </div>
                {/* Admin controls */}
                <div className="flex gap-1.5 ml-4 flex-shrink-0">
                  <select value={selected.status}
                    onChange={(e) => { void patchRequest({ status: e.target.value }); }}
                    className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs">
                    <option value="open">Open</option>
                    <option value="waiting_admin">Waiting admin</option>
                    <option value="waiting_user">Replied</option>
                    <option value="closed">Closed</option>
                  </select>
                  <select value={selected.priority}
                    onChange={(e) => { void patchRequest({ priority: e.target.value }); }}
                    className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs capitalize">
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              {/* Context block */}
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-400">
                <span>Tenant: <span className="font-mono text-slate-500">{selected.tenant_id}</span></span>
                {selected.ctx_route && <span>Route: <span className="font-mono text-slate-500">{selected.ctx_route}</span></span>}
                {selected.ctx_env   && <span>Env: <span className="font-mono text-slate-500">{selected.ctx_env}</span></span>}
                <span>Opened: {timeAgo(selected.created_at)}</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.sender_role === 'admin' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.sender_role === 'admin'
                      ? 'bg-amber-50 dark:bg-amber-900/20 text-slate-800 dark:text-slate-100 rounded-tl-sm border border-amber-100'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tr-sm'}`}>
                    <p className="font-semibold text-[10px] mb-1 uppercase tracking-wide opacity-60">
                      {m.sender_role === 'admin' ? 'DES Admin (you)' : 'User'}
                    </p>
                    <p className="leading-relaxed whitespace-pre-wrap">{m.body}</p>
                    <p className="mt-1 text-[10px] opacity-50">{timeAgo(m.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply + resolution */}
            <div className="border-t border-slate-100 dark:border-slate-800 p-4 space-y-3">
              {selected.status !== 'closed' && (
                <>
                  <textarea value={replyText} onChange={e => setReply(e.target.value)} rows={3}
                    placeholder="Reply to user…"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"/>
                  <button onClick={() => { void sendReply(); }} disabled={sending || !replyText.trim()}
                    className="w-full rounded-lg bg-amber-500 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-40">
                    {sending ? 'Sending…' : 'Send Reply'}
                  </button>
                </>
              )}
              <div>
                <label className="mb-1 block text-[10px] font-semibold text-slate-400 uppercase">Resolution note</label>
                <div className="flex gap-2">
                  <input value={resolution} onChange={e => setRes(e.target.value)} placeholder="Optional resolution summary…"
                    className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"/>
                  <button onClick={() => { void patchRequest({ resolution, status: 'closed' }); }}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800">
                    Save &amp; Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-slate-400">
            <div className="text-center">
              <span className="text-4xl block mb-2">💬</span>
              <p className="text-sm">Select a request to view the thread</p>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>
      )}
    </div>
  );
}
