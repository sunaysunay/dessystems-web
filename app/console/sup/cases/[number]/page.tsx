'use client';
import { useState, useEffect, useRef } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';
import { useParams, useRouter } from 'next/navigation';
import { VALID_TRANSITIONS } from '@/lib/support/types';
import type { Case, CaseMessage, CaseEvent, CaseStatus } from '@/lib/support/types';

const STATUS_CHIP: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700', triage: 'bg-indigo-100 text-indigo-700',
  assigned: 'bg-purple-100 text-purple-700', in_progress: 'bg-amber-100 text-amber-700',
  waiting_customer: 'bg-teal-100 text-teal-700', waiting_provider: 'bg-orange-100 text-orange-700',
  resolved: 'bg-green-100 text-green-700', closed: 'bg-slate-100 text-slate-500',
  reopened: 'bg-red-100 text-red-600', cancelled: 'bg-slate-200 text-slate-400',
};
const PRI_CHIP: Record<string, string> = {
  low: 'bg-slate-100 text-slate-500', normal: 'bg-blue-50 text-blue-600',
  high: 'bg-amber-100 text-amber-700', critical: 'bg-red-100 text-red-700',
};
const ROLE_CHIP: Record<string, string> = {
  contact: 'bg-blue-50 text-blue-700', agent: 'bg-teal-50 text-teal-700',
  system: 'bg-slate-50 text-slate-500', api: 'bg-purple-50 text-purple-700',
};

function fmtTime(ts: string) {
  return new Date(ts).toLocaleString('nl-NL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function SU002Page() {
  useScope();
  const router = useRouter();
  const params = useParams();
  const caseNumber = params.number as string;
  const bottomRef = useRef<HTMLDivElement>(null);

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [messages, setMessages] = useState<CaseMessage[]>([]);
  const [events, setEvents] = useState<CaseEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'messages' | 'timeline'>('messages');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 3000); }

  function loadCase() {
    setLoading(true);
    fetch(`/api/bop/support/cases/${caseNumber}`)
      .then(r => r.json())
      .then(j => {
        setCaseData(j.case ?? null);
        setMessages(j.messages ?? []);
        setEvents(j.events ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => { loadCase(); }, [caseNumber]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function sendReply() {
    if (!replyText.trim() || !caseData) return;
    setSending(true);
    try {
      const res = await fetch(`/api/bop/support/cases/${caseNumber}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: replyText, visibility: 'public' }),
      });
      if (res.ok) { setReplyText(''); loadCase(); showToast('Reply sent'); }
      else showToast('Failed to send reply');
    } catch { showToast('Network error'); }
    setSending(false);
  }

  async function transition(toStatus: CaseStatus) {
    if (!caseData) return;
    try {
      const res = await fetch(`/api/bop/support/cases/${caseNumber}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_status: toStatus }),
      });
      if (res.ok) { loadCase(); showToast(`Status → ${toStatus}`); }
      else { const j = await res.json().catch(() => ({})); showToast(j.error || 'Transition failed'); }
    } catch { showToast('Network error'); }
  }

  async function assignToMe() {
    if (!caseData) return;
    try {
      const res = await fetch(`/api/bop/support/cases/${caseNumber}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assign_to_me: true }),
      });
      if (res.ok) { loadCase(); showToast('Assigned to you'); }
      else showToast('Assignment failed');
    } catch { showToast('Network error'); }
  }

  if (loading) return <div className="p-6"><ScreenHeader title="Case Workspace" description="SU002 — Case detail and messaging" /><div className="text-center py-12 text-slate-400">Loading case...</div></div>;
  if (!caseData) return <div className="p-6"><ScreenHeader title="Case Workspace" description="SU002 — Case detail and messaging" /><div className="text-center py-12 text-red-400">Case not found</div></div>;

  const validNext = VALID_TRANSITIONS[caseData.status] || [];

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <ScreenHeader title="Case Workspace" description="SU002 — Case detail and messaging" />

      {toast && <div className="fixed top-4 right-4 bg-slate-800 text-white px-4 py-2 rounded shadow-lg text-sm z-50">{toast}</div>}

      <button onClick={() => router.push('/console/sup/queue')} className="text-sm text-teal-600 hover:underline mb-4 inline-block">&larr; Back to queue</button>

      {/* Case header */}
      <div className="bg-white border rounded-lg p-5 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-lg font-bold">{caseData.case_number || caseData.request_no}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${STATUS_CHIP[caseData.status] || ''}`}>{caseData.status.replace(/_/g, ' ')}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${PRI_CHIP[caseData.priority] || ''}`}>{caseData.priority}</span>
            </div>
            <h2 className="text-xl font-semibold mb-2">{caseData.subject}</h2>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span>Channel: <strong>{caseData.channel_kind}</strong></span>
              <span>Category: <strong>{caseData.category}</strong></span>
              <span>By: <strong>{caseData.created_by}</strong></span>
              <span>Created: {fmtTime(caseData.created_at)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={assignToMe} className="bg-purple-600 text-white px-3 py-1.5 rounded text-xs hover:bg-purple-700">Assign to me</button>
          </div>
        </div>

        {/* Status transitions */}
        {validNext.length > 0 && (
          <div className="mt-4 pt-3 border-t flex items-center gap-2">
            <span className="text-xs text-slate-500">Transition to:</span>
            {validNext.map(s => (
              <button key={s} onClick={() => transition(s)} className={`text-xs px-2.5 py-1 rounded border hover:shadow ${STATUS_CHIP[s] || 'bg-slate-100'}`}>
                {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        )}

        {caseData.resolution && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded text-sm">
            <span className="font-medium text-green-700">Resolution:</span> {caseData.resolution}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-4 border-b">
        <button onClick={() => setTab('messages')} className={`pb-2 text-sm font-medium border-b-2 ${tab === 'messages' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-400'}`}>
          Messages ({messages.length})
        </button>
        <button onClick={() => setTab('timeline')} className={`pb-2 text-sm font-medium border-b-2 ${tab === 'timeline' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-400'}`}>
          Timeline ({events.length})
        </button>
      </div>

      {tab === 'messages' ? (
        <div>
          <div className="space-y-3 mb-4 max-h-[500px] overflow-y-auto">
            {messages.map(m => (
              <div key={m.id} className={`p-3 rounded-lg border ${m.sender_role === 'agent' ? 'bg-teal-50 border-teal-200 ml-8' : 'bg-white mr-8'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${ROLE_CHIP[m.sender_role] || ''}`}>{m.sender_role}</span>
                  {m.visibility !== 'public' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">{m.visibility}</span>}
                  <span className="text-[10px] text-slate-400">{fmtTime(m.created_at)}</span>
                </div>
                <div className="text-sm whitespace-pre-wrap">{m.body}</div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Reply box */}
          <div className="border rounded-lg p-3 bg-white">
            <textarea
              className="w-full border rounded p-2 text-sm resize-none"
              rows={3}
              placeholder="Type your reply..."
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
            />
            <div className="flex justify-end mt-2">
              <button onClick={sendReply} disabled={sending || !replyText.trim()} className="bg-teal-600 text-white px-4 py-1.5 rounded text-sm hover:bg-teal-700 disabled:opacity-50">
                {sending ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {events.map(e => (
            <div key={e.id} className="flex items-start gap-3 p-2 text-xs border-b">
              <span className="text-slate-400 w-28 flex-shrink-0">{fmtTime(e.created_at)}</span>
              <span className="bg-slate-100 px-1.5 py-0.5 rounded">{e.event_type}</span>
              <span className="text-slate-500">{e.actor_type}{e.actor_id ? ` (${e.actor_id})` : ''}</span>
              {e.after_val && <span className="text-slate-400 truncate max-w-[300px]">{JSON.stringify(e.after_val)}</span>}
            </div>
          ))}
          {events.length === 0 && <div className="text-center py-8 text-slate-400">No events yet</div>}
        </div>
      )}
    </div>
  );
}
