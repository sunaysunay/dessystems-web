'use client';
import { useState, useEffect, useRef , useCallback} from 'react';
import { usePathname } from 'next/navigation';
import { useScope } from '@/lib/scope-context';

interface SupRequest {
  id: number; request_no: string; category: string; priority: string;
  status: string; subject: string; created_at: string; updated_at: string;
}
interface SupMessage {
  id: number; sender_role: 'user' | 'admin'; body: string; created_at: string;
}

const CAT_LABELS: Record<string, string> = {
  access_problem: 'Access problem', bug: 'Something doesn\'t work',
  question: 'Question', feature_request: 'Feature request', other: 'Other',
};
const STATUS_CHIP: Record<string, string> = {
  open:          'bg-blue-100 text-blue-700',
  waiting_admin: 'bg-amber-100 text-amber-700',
  waiting_user:  'bg-teal-100 text-teal-700',
  closed:        'bg-slate-100 text-slate-500',
};
const STATUS_LABEL: Record<string, string> = {
  open: 'Open', waiting_admin: 'Waiting', waiting_user: 'Replied', closed: 'Closed',
};
const PRI_CHIP: Record<string, string> = {
  low: 'bg-slate-100 text-slate-500', normal: 'bg-blue-50 text-blue-600',
  high: 'bg-amber-100 text-amber-700', critical: 'bg-red-100 text-red-700',
};

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}d ago`;
  if (h >= 1)  return `${h}h ago`;
  return `${Math.max(1, m)}m ago`;
}

function captureSupportContext(pathname: string) {
  return {
    ctx_route:   pathname + (typeof window !== 'undefined' ? window.location.search : ''),
    ctx_browser: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    ctx_env:     process.env.NEXT_PUBLIC_ENV ?? 'DEV',
    ctx_extra: {
      viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '',
    },
  };
}

export function SupportDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { unit } = useScope();
  const pathname  = usePathname();
  const ref       = useRef<HTMLDivElement>(null);

  type View = 'list' | 'new' | 'thread';
  const [view, setView]         = useState<View>('list');
  const [requests, setRequests] = useState<SupRequest[]>([]);
  const [selected, setSelected] = useState<SupRequest | null>(null);
  const [messages, setMessages] = useState<SupMessage[]>([]);
  const [loading, setLoading]   = useState(false);
  const [sending, setSending]   = useState(false);
  const [toast, setToast]       = useState('');

  // Form state
  const [category, setCategory] = useState('question');
  const [priority, setPriority] = useState('normal');
  const [subject, setSubject]   = useState('');
  const [description, setDesc]  = useState('');
  const [replyText, setReply]   = useState('');

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 3000); }

  const loadRequests = useCallback(() => {
    setLoading(true);
    fetch(`/api/bop/support/requests?tenant=${unit.id}`)
      .then(r => r.json())
      .then(j => { setRequests(j.requests ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [unit.id]);

  useEffect(() => { if (open) { loadRequests(); setView('list'); } }, [open, loadRequests]);

  function openThread(r: SupRequest) {
    setSelected(r);
    setView('thread');
    void fetch(`/api/bop/support/requests/${r.id}`)
      .then(res => res.json())
      .then(j => setMessages(j.messages ?? []));
  }

  async function submitRequest() {
    if (!subject.trim() || !description.trim()) { showToast('Fill in subject and description'); return; }
    setSending(true);
    const ctx = captureSupportContext(pathname);
    const res = await fetch('/api/bop/support/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: unit.id, category, priority, subject, description, ...ctx }),
    });
    setSending(false);
    if (res.ok) {
      showToast('Request submitted — we\'ll respond shortly');
      setSubject(''); setDesc(''); setCategory('question'); setPriority('normal');
      loadRequests(); setView('list');
    } else {
      const j = await res.json();
      showToast(j.error ?? 'Failed to submit');
    }
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
      setReply('');
      const j = await res.json();
      setMessages(prev => [...prev, j.message]);
      loadRequests();
    } else showToast('Failed to send reply');
  }

  async function closeRequest() {
    if (!selected) return;
    const res = await fetch(`/api/bop/support/requests/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'closed' }),
    });
    if (res.ok) { showToast('Request closed'); loadRequests(); setView('list'); }
  }

  const ctx = captureSupportContext(pathname);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div ref={ref}
        className="relative z-50 flex h-full w-full max-w-md flex-col bg-white dark:bg-slate-900 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-4 py-3">
          <div className="flex items-center gap-2">
            {view !== 'list' && (
              <button onClick={() => setView('list')} className="mr-1 rounded p-1 text-slate-400 hover:bg-slate-100">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
            )}
            <span className="text-base font-bold text-slate-800 dark:text-slate-100">
              {view === 'new' ? 'New Request' : view === 'thread' ? selected?.request_no : 'Support'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {view === 'list' && (
              <button onClick={() => setView('new')}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600">
                + New Request
              </button>
            )}
            <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="mx-4 mt-3 rounded-lg bg-slate-800 px-3 py-2 text-sm text-white">{toast}</div>
        )}

        {/* ── View: List ── */}
        {view === 'list' && (
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-400">Loading…</div>
            ) : requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                <span className="mb-3 text-4xl">💬</span>
                <p className="mb-1 font-semibold text-slate-600 dark:text-slate-300">No requests yet</p>
                <p className="text-sm">Use the button above to contact DES support.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {requests.map(r => (
                  <li key={r.id}
                    onClick={() => openThread(r)}
                    className="cursor-pointer px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-mono text-[10px] text-slate-400">{r.request_no}</span>
                          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${STATUS_CHIP[r.status] ?? 'bg-slate-100 text-slate-500'}`}>
                            {STATUS_LABEL[r.status] ?? r.status}
                          </span>
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${PRI_CHIP[r.priority] ?? ''}`}>
                            {r.priority}
                          </span>
                        </div>
                        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{r.subject}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">{CAT_LABELS[r.category] ?? r.category} · {timeAgo(r.updated_at)}</p>
                      </div>
                      <svg className="mt-1 h-4 w-4 flex-shrink-0 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                      </svg>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── View: New Request ── */}
        {view === 'new' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Category */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(CAT_LABELS).map(([k, l]) => (
                  <button key={k} onClick={() => setCategory(k)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                      category === k
                        ? 'border-amber-400 bg-amber-50 text-amber-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Subject</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Short summary…"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400"/>
            </div>

            {/* Priority */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Priority</label>
              <div className="flex gap-2">
                {(['low','normal','high','critical'] as const).map(p => (
                  <button key={p} onClick={() => setPriority(p)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors capitalize ${
                      priority === p ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                    {p}
                  </button>
                ))}
              </div>
              {priority === 'critical' && (
                <p className="mt-1.5 text-[11px] text-red-500">Use only for blocking issues that prevent work entirely.</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</label>
              <textarea value={description} onChange={e => setDesc(e.target.value)} rows={5}
                placeholder="Describe the issue in detail…"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"/>
            </div>

            {/* Context chip */}
            <details className="rounded-lg border border-slate-100 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700 px-3 py-2 text-[11px] text-slate-400">
              <summary className="cursor-pointer font-medium text-slate-500 dark:text-slate-400">Context included with request</summary>
              <div className="mt-1.5 space-y-0.5">
                <p>Route: <span className="font-mono">{ctx.ctx_route}</span></p>
                <p>Env: <span className="font-mono">{ctx.ctx_env}</span></p>
                <p>Viewport: <span className="font-mono">{ctx.ctx_extra?.viewport}</span></p>
              </div>
            </details>

            <button onClick={() => { void submitRequest(); }} disabled={sending}
              className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors">
              {sending ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        )}

        {/* ── View: Thread ── */}
        {view === 'thread' && selected && (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Request meta */}
            <div className="border-b border-slate-100 dark:border-slate-800 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className={`rounded-full px-2 py-0.5 font-bold uppercase ${STATUS_CHIP[selected.status]}`}>
                  {STATUS_LABEL[selected.status]}
                </span>
                <span className={`rounded px-2 py-0.5 font-medium capitalize ${PRI_CHIP[selected.priority]}`}>
                  {selected.priority}
                </span>
                <span className="text-slate-400">{CAT_LABELS[selected.category]} · opened {timeAgo(selected.created_at)}</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{selected.subject}</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.sender_role === 'admin' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    m.sender_role === 'admin'
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-sm'
                      : 'bg-amber-500 text-white rounded-tr-sm'}`}>
                    <p className="leading-relaxed whitespace-pre-wrap">{m.body}</p>
                    <p className={`mt-1 text-[10px] ${m.sender_role === 'admin' ? 'text-slate-400' : 'text-amber-100'}`}>
                      {m.sender_role === 'admin' ? 'DES Admin' : 'You'} · {timeAgo(m.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply box */}
            {selected.status !== 'closed' ? (
              <div className="border-t border-slate-100 dark:border-slate-800 p-3 space-y-2">
                <textarea value={replyText} onChange={e => setReply(e.target.value)} rows={3}
                  placeholder="Reply…"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"/>
                <div className="flex gap-2">
                  <button onClick={() => { void sendReply(); }} disabled={sending || !replyText.trim()}
                    className="flex-1 rounded-lg bg-amber-500 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-40 transition-colors">
                    {sending ? 'Sending…' : 'Send Reply'}
                  </button>
                  <button onClick={() => { void closeRequest(); }}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-t border-slate-100 px-4 py-3 text-center text-sm text-slate-400">
                This request is closed.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
